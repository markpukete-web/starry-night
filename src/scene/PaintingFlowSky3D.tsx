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
import { useImageData, type ImageData2D } from './useImageData'
import { tuned } from './tuning'
import { buildSourceStreamlineRibbons } from './streamlineGeometry'
import { DOME_R, smoothstep } from './skyMapping'
import {
  dioramaSourceEdgeFade,
  SIDE_BORDER_U,
  SIDE_EXTEND_U,
  uvToDioramaSkyPosition,
} from './dioramaSkyProjection'
import { MOON_R, MOON_UV, SWIRLS } from './skySwirls'
import { PALETTE } from './palette'
import { DIORAMA_CAPTURE } from './dioramaContract'

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
      col *= (0.52 + 0.40 * combinedFlow) * ridge * bristle;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = clamp(mix(vec3(lum), col, 1.45), 0.0, 1.05);
      // Highlight lift keyed on the SOURCE pixel's paleness: the painting's luminous swirl-band
      // strokes brighten, the cobalt floor is untouched. Post-bloom-removal the sky measured
      // mean 73 / luminous(>150) 4.6% vs the painting's 102 / 11.6% (2026-07-22, Mark's call:
      // lift the stars and swirl band, keep the deep night).
      float srcLum = dot(vColor, vec3(0.299, 0.587, 0.114));
      col *= 1.0 + 0.52 * smoothstep(0.32, 0.68, srcLum);
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
  uniform sampler2D uExtendLeft;
  uniform sampler2D uExtendRight;
  uniform float uExtendU;
  uniform float uBorderU;
  uniform int uDebugMode;
  varying vec2 vUv;
  varying float vEdgeFade;
  void main() {
    // vUv.x is PAINTING-space u and runs past [0,1] by uExtendU onto the S4 side strips
    // (sky-extend-{left,right}.png — the painting continued offline with its own sky patches,
    // docs/decisions/0003-inpaint-extend.md). Each strip also OWNS the scan's raw canvas-weave
    // border columns (uBorderU), regrown from real paint so no pale weave line splits the sky.
    float pu = vUv.x;
    // The mask term draws the painting's below-band horizon rows. Near the canvas edges the
    // skyline dips toward the corners and the mask's feathered skyline-edge texels hang over
    // the bare void (the island only covers the centre) — they rendered as a dotted arc
    // sweeping down-screen once the old side fade stopped multiplying them away (chased across
    // p2–p6: not ribbons, not the border sliver — the mask's own skyline feather). Side-gate
    // ONLY the mask term; the sky band (and the S4 strips) stays full-width.
    float maskSideGate = smoothstep(0.0, 0.1, pu) * smoothstep(1.0, 0.9, pu);
    float mask = (pu >= 0.0 && pu <= 1.0) ? texture2D(uMask, vec2(pu, vUv.y)).r * maskSideGate : 0.0;
    // This backdrop sits behind REAL 3D forms, so the mask's old 2D cypress cut-out is obsolete
    // here. uPainting is the OFFLINE-FILLED painting (painting-filled.png), so within the sky
    // band a plain sample IS the fill. Below the skyline the 3D island covers everything: discard.
    float skyBand = 1.0 - smoothstep(0.58, 0.7, vUv.y);
    float a = max(mask, skyBand) * vEdgeFade;
    if (a < 0.02) discard;
    // Texture hand-off: bilinear cannot blend ACROSS textures, so a hard branch leaves a
    // dashed hairline where the regrown border meets the canvas — feather the switch instead.
    float FEATHER = 0.006;
    float tL = 1.0 - smoothstep(uBorderU - FEATHER, uBorderU, pu);
    float tR = smoothstep(1.0 - uBorderU, 1.0 - uBorderU + FEATHER, pu);
    vec3 col = texture2D(uPainting, vec2(clamp(pu, 0.0, 1.0), vUv.y)).rgb;
    if (tL > 0.0) {
      vec3 left = texture2D(uExtendLeft, vec2((pu + uExtendU) / (uExtendU + uBorderU), vUv.y)).rgb;
      col = mix(col, left, tL);
    }
    if (tR > 0.0) {
      vec3 right = texture2D(uExtendRight, vec2((pu - (1.0 - uBorderU)) / (uExtendU + uBorderU), vUv.y)).rgb;
      col = mix(col, right, tR);
    }
    if (uDebugMode == 1) {
      col = mix(vec3(0.03, 0.08, 0.18), vec3(0.12, 0.38, 0.96), mask);
      gl_FragColor = vec4(col, a * 0.5);
      return;
    }
    // Night grade, softened from (0.67,0.79,1.0): that cool-down sank the whole band ~22%
    // before the highlight lift keyed on it, so the ramp barely engaged (night-lift p2 measured
    // +1.6 for a 37% gain notch). Key the lift on the TRUE source paleness instead.
    float srcLum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= vec3(0.74, 0.84, 1.0);
    col *= 1.0 + 0.52 * smoothstep(0.3, 0.62, srcLum);
    gl_FragColor = vec4(col, a * 0.68);
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
  // spans the S4 side strips too: paintU ∈ [−SIDE_EXTEND_U, 1 + SIDE_EXTEND_U], same mesh
  // density per unit of u as the pre-S4 112-column canvas-only wash
  const cols = 180
  const rows = 78
  const positions: number[] = []
  const uvs: number[] = []
  const edge: number[] = []
  const indices: number[] = []
  const p = new Vector3()

  for (let y = 0; y <= rows; y++) {
    const v = y / rows
    for (let x = 0; x <= cols; x++) {
      const u = -SIDE_EXTEND_U + (x / cols) * (1 + 2 * SIDE_EXTEND_U)
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

/**
 * Stitch [left strip | base | right strip] into one wide CPU buffer for ribbon integration.
 * Each strip covers paintU ∈ [−SIDE_EXTEND_U, SIDE_BORDER_U] (mirrored on the right) and OWNS
 * the base's weave-border columns — the strips overwrite them, exactly as the wash renders.
 */
function compositeSideExtended(base: ImageData2D, left: ImageData2D, right: ImageData2D): ImageData2D {
  const borderPx = Math.round(SIDE_BORDER_U * base.width)
  const padPx = left.width - borderPx
  const width = base.width + 2 * padPx
  const data = new Uint8ClampedArray(width * base.height * 4)
  const blit = (src: ImageData2D, dstX: number): void => {
    for (let y = 0; y < base.height; y++) {
      data.set(src.data.subarray(y * src.width * 4, (y + 1) * src.width * 4), (y * width + dstX) * 4)
    }
  }
  blit(base, padPx)
  blit(left, 0)
  blit(right, padPx + base.width - borderPx)
  return { data, width, height: base.height }
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
  // Broadened falloff (2026-07-22): the painting gives every star a wide luminous orb — some
  // near moon-sized — and the old tight decay read as dim points once full-frame Bloom left.
  g.addColorStop(0, 'rgba(252,240,170,1)')
  g.addColorStop(0.2, 'rgba(244,221,120,0.75)')
  g.addColorStop(0.45, 'rgba(226,200,110,0.35)')
  g.addColorStop(0.7, 'rgba(205,185,120,0.12)')
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
        <sprite scale={[4.25, 4.25, 1]} renderOrder={3}>
          <spriteMaterial
            map={moonHalo}
            blending={AdditiveBlending}
            transparent
            opacity={debug === 'flow' ? 0.72 : 0.68}
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
          <sprite scale={[star.scale * 1.85, star.scale * 1.85, 1]} renderOrder={3}>
            <spriteMaterial
              map={starHalo}
              blending={AdditiveBlending}
              transparent
              opacity={debug === 'flow' ? 0.72 : 0.9}
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
  // The FILLED assets: the cypress cut-out replaced offline with the painting's own sky patches,
  // plus the S4 side strips continuing the painting past its L/R edges
  // (docs/decisions/0003-inpaint-extend.md). The 2D routes keep the unfilled originals.
  const flowData = useImageData('/reference/signed-flow-filled.png')
  const maskData = useImageData('/reference/sky-mask.png')
  // The colour assets ship as lossless WebP (~40% under PNG on continuous-tone paint, pixels
  // byte-identical); the flow fields and mask stay PNG, where WebP is bigger. scripts/slim-
  // reference.ts owns that split — keep its WEBP_ASSETS list and these paths in step.
  const paintingData = useImageData('/reference/painting-filled.webp')
  const extendLeftData = useImageData('/reference/sky-extend-left.webp')
  const extendRightData = useImageData('/reference/sky-extend-right.webp')
  const extendFlowLeftData = useImageData('/reference/sky-extend-flow-left.png')
  const extendFlowRightData = useImageData('/reference/sky-extend-flow-right.png')
  const [painting, mask, extendLeft, extendRight] = useTexture([
    '/reference/painting-filled.webp',
    '/reference/sky-mask.png',
    '/reference/sky-extend-left.webp',
    '/reference/sky-extend-right.webp',
  ])
  const isFlowDebug = debug === 'flow'

  useEffect(() => {
    for (const tex of [painting, mask, extendLeft, extendRight]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask, extendLeft, extendRight])

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
          uExtendLeft: { value: extendLeft },
          uExtendRight: { value: extendRight },
          uExtendU: { value: SIDE_EXTEND_U },
          uBorderU: { value: SIDE_BORDER_U },
          uDebugMode: { value: isFlowDebug ? 1 : 0 },
        },
        vertexShader: washVert,
        fragmentShader: washFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    [extendLeft, extendRight, isFlowDebug, mask, painting],
  )

  const geometry = useMemo(() => {
    if (!flowData || !maskData || !paintingData) return null
    if (!extendLeftData || !extendRightData || !extendFlowLeftData || !extendFlowRightData) return null
    // ribbons integrate across the composite [left strip | canvas | right strip] so the churn
    // carries over the canvas edges; count scales with the wider domain to hold front density
    const compositePainting = compositeSideExtended(paintingData, extendLeftData, extendRightData)
    const compositeFlow = compositeSideExtended(flowData, extendFlowLeftData, extendFlowRightData)
    const uPad = (compositePainting.width - paintingData.width) / 2 / paintingData.width
    const ribbons = buildSourceStreamlineRibbons({
      flowData: compositeFlow,
      maskData,
      paintingData: compositePainting,
      count: Math.round((isFlowDebug ? 2300 : tuned('count', 2000)) * (1 + 2 * uPad)),
      strokeWidth: tuned('strokeWidth', 0.0032) * (isFlowDebug ? 1.55 : 1.18),
      points: tuned('points', 16),
      stepSize: tuned('stepSize', 0.012),
      seed: DIORAMA_CAPTURE.seed,
      // the offline-filled painting owns the obsolete 2D-cypress cut-out within the wash's sky
      // band (0.58–0.7); ribbons must churn across that fill too or it reads as a static patch
      openSkyBandV: 0.62,
      uPad,
      // trails stop where the wash's skyBand discard ends (washFrag smoothstep 0.58–0.7): below
      // it only the island covers them, and near the edges/strips stray trails read as dotted
      // arcs on the bare gradient
      trailMaxV: 0.7,
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
      // Below the sky band the island covers the canvas centre but NOT the edge columns or the
      // strips — ribbon segments there float under the wash's skirt as stray dots over the bare
      // gradient (the pre-S4 side fade hid the edge ones). Outside the old fade margins the
      // ribbons must exit the melt BEFORE the wash does (a ribbon's bell cross-section peaks
      // above the dissolving wash continuum at every v, reading as a dotted arc — p4), so their
      // window ends at 0.62 where the wash's skyBand (washFrag 0.58–0.7) still has body.
      const subBandSkirt = vertex.u < 0.22 || vertex.u > 0.78 ? 1 - smoothstep(0.5, 0.62, vertex.v) : 1
      aEdgeFade.push(dioramaSourceEdgeFade(vertex.u, vertex.v) * subBandSkirt)
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
  }, [
    extendFlowLeftData,
    extendFlowRightData,
    extendLeftData,
    extendRightData,
    flowData,
    isFlowDebug,
    maskData,
    paintingData,
  ])

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
    washMaterial.uniforms.uExtendLeft.value = extendLeft
    washMaterial.uniforms.uExtendRight.value = extendRight
    washMaterial.uniforms.uDebugMode.value = isFlowDebug ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [extendLeft, extendRight, isFlowDebug, mask, painting, paused, ribbonMaterial, washMaterial])

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
      {/* SkyEdgeBackfill (the whisper wash) is deleted: the S4 side strips continue the real
          painting past the canvas edges and melt into the gradient via the side fade */}
      <mesh geometry={washGeometry} material={washMaterial} frustumCulled={false} renderOrder={-1} />
      {geometry && <mesh geometry={geometry} material={ribbonMaterial} frustumCulled={false} renderOrder={2} />}
      <SourceOrbs debug={debug} />
    </group>
  )
}
