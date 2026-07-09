import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  NoColorSpace,
  NormalBlending,
  Quaternion,
  ShaderMaterial,
  type Group,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { tuned } from './tuning'
import { buildSourceStreamlineRibbons } from './streamlineGeometry'
import { DOME_R } from './skyMapping'
import { dioramaSourceEdgeFade, uvToDioramaSkyPosition } from './dioramaSkyProjection'
import { MOON_R, MOON_UV, SWIRLS } from './skySwirls'
import { PALETTE } from './palette'
import { DIORAMA_CAPTURE } from './dioramaContract'
import { SkyEdgeBackfill } from './SkyEdgeBackfill'

type PaintingFlowSkyDebug = 'final' | 'flow'

type Props = {
  paused?: boolean
  debug?: PaintingFlowSkyDebug
}

const ribbonVert = /* glsl */ `
  attribute float aLen;
  attribute float aAcross;
  attribute float aPhase;
  attribute float aRate;
  attribute vec3 aColor;
  attribute float aEdgeFade;
  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vEdgeFade;
  void main() {
    vLen = aLen;
    vAcross = aAcross;
    vPhase = aPhase;
    vRate = aRate;
    vColor = aColor;
    vEdgeFade = aEdgeFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ribbonFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uPulseScale;
  uniform float uFreeze;
  uniform float uShimmerMix;
  uniform float uShimmerSpeed;
  uniform float uShimmerScale;
  uniform float uBristleFreq;
  uniform float uBristleAmp;
  uniform int uDebugMode;
  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vEdgeFade;

  void main() {
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
    float taper = smoothstep(0.0, 0.15, vLen) * smoothstep(1.0, 0.85, vLen);
    float flowTime = mix(uTime, 0.0, uFreeze);
    float flow = 0.5 + 0.5 * sin(vLen * uPulseScale - flowTime * uSpeed * vRate + vPhase);
    float shimmer = 0.5 + 0.5 * sin(vLen * (uPulseScale * uShimmerScale) - flowTime * (uSpeed * uShimmerSpeed) * vRate + vPhase * 2.7);
    float combinedFlow = mix(flow, shimmer, uShimmerMix);
    float bristle = (1.0 - uBristleAmp) + uBristleAmp * sin(vAcross * uBristleFreq + sin(vLen * 45.0) * 3.0);

    vec3 col = vColor;
    if (uDebugMode == 1) {
      col = mix(vec3(0.08, 0.22, 0.58), vec3(0.95, 0.78, 0.28), vLen);
    } else {
      float ridge = 0.82 + 0.36 * edge;
      col *= (0.46 + 0.38 * combinedFlow) * ridge * bristle;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = clamp(mix(vec3(lum), col, 1.45), 0.0, 1.05);
    }

    float a = edge * taper * uOpacity * vEdgeFade;
    if (uDebugMode == 1) a = max(a, edge * taper * 0.42 * vEdgeFade);
    if (a < 0.012) discard;
    gl_FragColor = vec4(col, a);
  }
`

const washVert = /* glsl */ `
  attribute float aEdgeFade;
  varying vec2 vUv;
  varying float vEdgeFade;
  void main() {
    vUv = uv;
    vEdgeFade = aEdgeFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const washFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  uniform sampler2D uMask;
  uniform int uDebugMode;
  varying vec2 vUv;
  varying float vEdgeFade;
  void main() {
    float mask = texture2D(uMask, vUv).r;
    // This backdrop is now behind REAL 3D forms, so its old job — cutting the 2D cypress/foreground
    // out of the sky — is obsolete and actively harmful: the cutouts read as dark holes (a "ghost
    // tree"). Within the sky band we fill those holes with a night-sky blue so the sky is unbroken;
    // below the skyline the 3D island covers it, so we can discard there.
    float skyBand = 1.0 - smoothstep(0.58, 0.7, vUv.y);
    float a = max(mask, skyBand) * vEdgeFade;
    if (a < 0.02) discard;
    vec3 skyFill = vec3(0.14, 0.22, 0.42); // night-sky blue for the cut-out holes
    vec3 col = mix(skyFill, texture2D(uPainting, vUv).rgb, mask);
    if (uDebugMode == 1) {
      col = mix(vec3(0.03, 0.08, 0.18), vec3(0.12, 0.38, 0.96), mask);
      gl_FragColor = vec4(col, a * 0.5);
      return;
    }
    col *= vec3(0.6, 0.72, 0.95);
    gl_FragColor = vec4(col, a * 0.62);
  }
`

const gradientVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const gradientFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vDir;
  void main() {
    float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0);
  }
`

function makeSkyWashGeometry() {
  const cols = 112
  const rows = 78
  const positions: number[] = []
  const uvs: number[] = []
  const edge: number[] = []
  const indices: number[] = []
  const p = new Vector3()

  for (let y = 0; y <= rows; y++) {
    const v = y / rows
    for (let x = 0; x <= cols; x++) {
      const u = x / cols
      uvToDioramaSkyPosition(u, v, p, DOME_R - 0.05)
      positions.push(p.x, p.y, p.z)
      uvs.push(u, v)
      edge.push(dioramaSourceEdgeFade(u, v))
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * (cols + 1) + x
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  g.setAttribute('aEdgeFade', new BufferAttribute(new Float32Array(edge), 1))
  g.setIndex(indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

function makeMoonHaloTexture(): CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,242,187,0.98)')
  g.addColorStop(0.24, 'rgba(248,214,112,0.62)')
  g.addColorStop(0.52, 'rgba(229,184,84,0.25)')
  g.addColorStop(0.82, 'rgba(207,165,82,0.06)')
  g.addColorStop(1, 'rgba(207,165,82,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

function makeMoonCrescentTexture(): CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.33
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, 'rgba(253,243,189,1)')
  g.addColorStop(0.62, 'rgba(236,211,95,1)')
  g.addColorStop(1, 'rgba(202,164,62,1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(cx + r * 0.5, cy - r * 0.48, r * 0.95, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

function makeStarHaloTexture(): CanvasTexture {
  const s = 128
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(252,240,170,1)')
  g.addColorStop(0.16, 'rgba(244,221,120,0.7)')
  g.addColorStop(0.34, 'rgba(226,200,110,0.26)')
  g.addColorStop(0.62, 'rgba(205,185,120,0.05)')
  g.addColorStop(1, 'rgba(205,185,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

function SourceOrbs({ debug }: { debug: PaintingFlowSkyDebug }) {
  const moonHalo = useMemo(() => makeMoonHaloTexture(), [])
  const moonCrescent = useMemo(() => makeMoonCrescentTexture(), [])
  const starHalo = useMemo(() => makeStarHaloTexture(), [])
  const moonPosition = useMemo(() => uvToDioramaSkyPosition(MOON_UV[0], MOON_UV[1], new Vector3(), DOME_R - 0.02), [])
  const stars = useMemo(
    () =>
      SWIRLS.filter(([u, v, , r]) => {
        const isMoon = Math.hypot(u - MOON_UV[0], v - MOON_UV[1]) < MOON_R * 1.5
        const isWhorl = r > 0.071
        const onCypress = u < 0.18 && v > 0.34
        return !isMoon && !isWhorl && !onCypress
      }).map(([u, v, sign, r], index) => ({
        position: uvToDioramaSkyPosition(u, v, new Vector3(), DOME_R - 0.01),
        scale: index === 0 ? 0.94 : 0.62 + r * 2.2,
        sign,
      })),
    [],
  )

  useEffect(
    () => () => {
      moonHalo.dispose()
      moonCrescent.dispose()
      starHalo.dispose()
    },
    [moonCrescent, moonHalo, starHalo],
  )

  return (
    <group>
      <group position={moonPosition}>
        <sprite scale={[3.85, 3.85, 1]} renderOrder={3}>
          <spriteMaterial
            map={moonHalo}
            blending={AdditiveBlending}
            transparent
            opacity={debug === 'flow' ? 0.72 : 0.55}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <sprite scale={[1.45, 1.45, 1]} renderOrder={4}>
          <spriteMaterial map={moonCrescent} transparent opacity={1} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      <pointLight position={moonPosition} intensity={debug === 'flow' ? 12 : 18} distance={24} color="#f0d98a" />
      {stars.map((star, index) => (
        <group key={index} position={star.position}>
          <sprite scale={[star.scale * 1.35, star.scale * 1.35, 1]} renderOrder={3}>
            <spriteMaterial
              map={starHalo}
              blending={AdditiveBlending}
              transparent
              opacity={debug === 'flow' ? 0.72 : 0.62}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
          <mesh renderOrder={4}>
            <sphereGeometry args={[star.scale * 0.075, 12, 12]} />
            <meshBasicMaterial color="#f3df7d" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function PaintingFlowSky3D({ paused = false, debug = 'final' }: Props) {
  const skyRoot = useRef<Group>(null)
  const initialCameraInverse = useRef<Quaternion | null>(null)
  const flowData = useImageData('/reference/signed-flow.png')
  const maskData = useImageData('/reference/sky-mask.png')
  const paintingData = useImageData('/reference/painting.jpg')
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])
  const isFlowDebug = debug === 'flow'

  useEffect(() => {
    for (const tex of [painting, mask]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask])

  const gradientMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(0.58) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(0.68) },
        },
        vertexShader: gradientVert,
        fragmentShader: gradientFrag,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const washGeometry = useMemo(() => makeSkyWashGeometry(), [])
  const washMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uDebugMode: { value: isFlowDebug ? 1 : 0 },
        },
        vertexShader: washVert,
        fragmentShader: washFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    [isFlowDebug, mask, painting],
  )

  const geometry = useMemo(() => {
    if (!flowData || !maskData || !paintingData) return null
    const ribbons = buildSourceStreamlineRibbons({
      flowData,
      maskData,
      paintingData,
      count: isFlowDebug ? 2300 : tuned('count', 2000),
      strokeWidth: tuned('strokeWidth', 0.0032) * (isFlowDebug ? 1.55 : 1.18),
      points: tuned('points', 16),
      stepSize: tuned('stepSize', 0.012),
      seed: DIORAMA_CAPTURE.seed,
    })

    const positions: number[] = []
    const colors: number[] = []
    const aLen: number[] = []
    const aAcross: number[] = []
    const aPhase: number[] = []
    const aRate: number[] = []
    const aEdgeFade: number[] = []
    const p = new Vector3()

    for (const vertex of ribbons.vertices) {
      uvToDioramaSkyPosition(vertex.u, vertex.v, p)
      positions.push(p.x, p.y, p.z)
      colors.push(...vertex.color)
      aLen.push(vertex.len)
      aAcross.push(vertex.across)
      aPhase.push(vertex.phase)
      aRate.push(vertex.rate)
      aEdgeFade.push(dioramaSourceEdgeFade(vertex.u, vertex.v))
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3))
    geo.setAttribute('aLen', new BufferAttribute(new Float32Array(aLen), 1))
    geo.setAttribute('aAcross', new BufferAttribute(new Float32Array(aAcross), 1))
    geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(aPhase), 1))
    geo.setAttribute('aRate', new BufferAttribute(new Float32Array(aRate), 1))
    geo.setAttribute('aEdgeFade', new BufferAttribute(new Float32Array(aEdgeFade), 1))
    geo.setIndex(ribbons.indices)
    geo.computeBoundingSphere()
    return geo
  }, [flowData, isFlowDebug, maskData, paintingData])

  const ribbonMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: tuned('speed', 1.6) },
          uOpacity: { value: isFlowDebug ? 0.9 : Math.min(0.74, tuned('opacity', 0.45) * 1.36) },
          uPulseScale: { value: tuned('pulseScale', 7.5) },
          uFreeze: { value: paused ? 1 : 0 },
          uShimmerMix: { value: tuned('shimmerMix', 0.8) },
          uShimmerSpeed: { value: tuned('shimmerSpeed', 3) },
          uShimmerScale: { value: tuned('shimmerScale', 2.8) },
          uBristleFreq: { value: tuned('bristleFreq', 75) },
          uBristleAmp: { value: tuned('bristleAmp', 0.22) },
          uDebugMode: { value: isFlowDebug ? 1 : 0 },
        },
        vertexShader: ribbonVert,
        fragmentShader: ribbonFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [isFlowDebug, paused],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    ribbonMaterial.uniforms.uFreeze.value = paused ? 1 : 0
    ribbonMaterial.uniforms.uDebugMode.value = isFlowDebug ? 1 : 0
    washMaterial.uniforms.uPainting.value = painting
    washMaterial.uniforms.uMask.value = mask
    washMaterial.uniforms.uDebugMode.value = isFlowDebug ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [isFlowDebug, mask, painting, paused, ribbonMaterial, washMaterial])

  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: camera-locked sky rotation + time uniform */
  useFrame(({ camera }, dt) => {
    initialCameraInverse.current ??= camera.quaternion.clone().invert()
    if (skyRoot.current) {
      skyRoot.current.quaternion.copy(camera.quaternion).multiply(initialCameraInverse.current)
    }
    if (paused) return
    ribbonMaterial.uniforms.uTime.value += dt
  })
  /* eslint-enable react-hooks/immutability */

  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => washGeometry.dispose(), [washGeometry])
  useEffect(
    () => () => {
      ribbonMaterial.dispose()
      washMaterial.dispose()
      gradientMaterial.dispose()
    },
    [gradientMaterial, ribbonMaterial, washMaterial],
  )

  return (
    <group ref={skyRoot}>
      <mesh renderOrder={-4}>
        <sphereGeometry args={[DOME_R + 4, 32, 24]} />
        <primitive object={gradientMaterial} attach="material" />
      </mesh>
      {!isFlowDebug && <SkyEdgeBackfill />}
      <mesh geometry={washGeometry} material={washMaterial} frustumCulled={false} renderOrder={-1} />
      {geometry && <mesh geometry={geometry} material={ribbonMaterial} frustumCulled={false} renderOrder={2} />}
      <SourceOrbs debug={debug} />
    </group>
  )
}
