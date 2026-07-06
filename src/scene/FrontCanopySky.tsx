import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  NoColorSpace,
  NormalBlending,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { tuned } from './tuning'
import { buildSourceStreamlineRibbons } from './streamlineGeometry'
import { canopyEdgeFade, uvToCanopyPosition } from './frontCanopyMapping'
import { CANOPY_CAPTURE } from './canopyContract'

type DebugMode = 'final' | 'nopost' | 'edges' | 'sky-only'

type Props = {
  paused?: boolean
  debug?: DebugMode
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
    if (uDebugMode == 1) {
      gl_FragColor = vec4(vec3(vEdgeFade), max(0.18, edge * taper));
      return;
    }

    float flowTime = mix(uTime, 0.0, uFreeze);
    float flow = 0.5 + 0.5 * sin(vLen * uPulseScale - flowTime * uSpeed * vRate + vPhase);
    float shimmer = 0.5 + 0.5 * sin(vLen * (uPulseScale * uShimmerScale) - flowTime * (uSpeed * uShimmerSpeed) * vRate + vPhase * 2.7);
    float combinedFlow = mix(flow, shimmer, uShimmerMix);
    float bristle = (1.0 - uBristleAmp) + uBristleAmp * sin(vAcross * uBristleFreq + sin(vLen * 45.0) * 3.0);
    float ridge = 0.82 + 0.36 * edge;
    vec3 col = vColor * (0.60 + 0.42 * combinedFlow) * ridge * bristle;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, 1.2), 0.0, 1.0);
    float a = edge * taper * uOpacity * vEdgeFade;
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
    float a = mask * vEdgeFade;
    if (a < 0.025) discard;
    vec3 col = texture2D(uPainting, vUv).rgb;
    col *= vec3(0.72, 0.84, 1.05);
    if (uDebugMode == 1) {
      gl_FragColor = vec4(vEdgeFade, 0.15, 1.0 - vEdgeFade, max(0.12, a));
      return;
    }
    gl_FragColor = vec4(col, a * 0.72);
  }
`

function buildCanopyWashGeometry() {
  const cols = 96
  const rows = 72
  const positions: number[] = []
  const uvs: number[] = []
  const edge: number[] = []
  const indices: number[] = []
  const p = new Vector3()

  for (let y = 0; y <= rows; y++) {
    const v = y / rows
    for (let x = 0; x <= cols; x++) {
      const u = x / cols
      uvToCanopyPosition(u, v, p)
      positions.push(p.x, p.y, p.z)
      uvs.push(u, v)
      edge.push(canopyEdgeFade(u, v))
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

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setAttribute('aEdgeFade', new BufferAttribute(new Float32Array(edge), 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function FrontCanopySky({ paused = false, debug = 'final' }: Props) {
  const flowData = useImageData('/reference/signed-flow.png')
  const maskData = useImageData('/reference/sky-mask.png')
  const paintingData = useImageData('/reference/painting.jpg')
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])
  const showEdges = debug === 'edges'

  useEffect(() => {
    for (const tex of [painting, mask]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask])

  const geometry = useMemo(() => {
    if (!flowData || !maskData || !paintingData) return null
    const ribbons = buildSourceStreamlineRibbons({
      flowData,
      maskData,
      paintingData,
      count: tuned('count', 2000),
      strokeWidth: tuned('strokeWidth', 0.0032) * 1.18,
      points: tuned('points', 16),
      stepSize: tuned('stepSize', 0.012),
      seed: CANOPY_CAPTURE.seed,
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
      uvToCanopyPosition(vertex.u, vertex.v, p)
      positions.push(p.x, p.y, p.z)
      colors.push(...vertex.color)
      aLen.push(vertex.len)
      aAcross.push(vertex.across)
      aPhase.push(vertex.phase)
      aRate.push(vertex.rate)
      aEdgeFade.push(canopyEdgeFade(vertex.u, vertex.v))
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
  }, [flowData, maskData, paintingData])

  const washGeometry = useMemo(() => buildCanopyWashGeometry(), [])
  const washMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uDebugMode: { value: showEdges ? 1 : 0 },
        },
        vertexShader: washVert,
        fragmentShader: washFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    [painting, mask, showEdges],
  )
  const ribbonMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: tuned('speed', 1.6) },
          uOpacity: { value: Math.min(0.82, tuned('opacity', 0.55) * 1.25) },
          uPulseScale: { value: tuned('pulseScale', 8) },
          uFreeze: { value: 0 },
          uShimmerMix: { value: tuned('shimmerMix', 0.3) },
          uShimmerSpeed: { value: tuned('shimmerSpeed', 2.5) },
          uShimmerScale: { value: tuned('shimmerScale', 2.5) },
          uBristleFreq: { value: tuned('bristleFreq', 75) },
          uBristleAmp: { value: tuned('bristleAmp', 0.22) },
          uDebugMode: { value: showEdges ? 1 : 0 },
        },
        vertexShader: ribbonVert,
        fragmentShader: ribbonFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [showEdges],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    washMaterial.uniforms.uPainting.value = painting
    washMaterial.uniforms.uMask.value = mask
    washMaterial.uniforms.uDebugMode.value = showEdges ? 1 : 0
    ribbonMaterial.uniforms.uDebugMode.value = showEdges ? 1 : 0
    ribbonMaterial.uniforms.uFreeze.value = paused ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [painting, mask, paused, ribbonMaterial, showEdges, washMaterial])

  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => washGeometry.dispose(), [washGeometry])
  useEffect(
    () => () => {
      washMaterial.dispose()
      ribbonMaterial.dispose()
    },
    [ribbonMaterial, washMaterial],
  )

  useFrame((_, dt) => {
    if (paused) return
    // eslint-disable-next-line react-hooks/immutability -- render-loop uniform write
    ribbonMaterial.uniforms.uTime.value += dt
  })

  if (!geometry) return null

  return (
    <group>
      <mesh geometry={washGeometry} material={washMaterial} renderOrder={0} frustumCulled={false} />
      <mesh geometry={geometry} material={ribbonMaterial} renderOrder={1} frustumCulled={false} />
      <pointLight position={[3.2, 3.4, 1.8]} intensity={debug === 'nopost' ? 0 : 4.5} color="#f4d98e" />
      <ambientLight intensity={0.42} color="#8fa8d8" />
      {debug !== 'nopost' && (
        <sprite position={uvToCanopyPosition(0.85, 0.16).toArray()} scale={[0.86, 0.86, 1]} renderOrder={3}>
          <spriteMaterial color="#f7d878" transparent opacity={0.07} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  )
}
