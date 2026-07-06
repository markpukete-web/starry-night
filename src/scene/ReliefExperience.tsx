import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  NoColorSpace,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from 'three'
import { LivingPainting } from './LivingPainting'
import { StreamlineSky } from './StreamlineSky'
import { IMG_TO_CLIP_GLSL, TEX_ASPECT } from './skyFraming'
import {
  RELIEF_FRAMING,
  RELIEF_LAYERS,
  RELIEF_POINTER,
  type ReliefDebugMode,
} from './reliefContract'

type Props = {
  clean?: boolean
  reduced?: boolean
}

type LayerKind = 'cypress' | 'foreground'
type OffsetRef = MutableRefObject<{ x: number; y: number }>
type ReliefFraming = (typeof RELIEF_FRAMING)[keyof typeof RELIEF_FRAMING]

function queryValue(name: string) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function readDebugMode(): ReliefDebugMode {
  const debug = queryValue('debug')
  return debug === 'sky' || debug === 'layers' ? debug : 'final'
}

function makeImageQuadGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        1, 1, 0,
      ]),
      3,
    ),
  )
  geometry.setIndex([0, 1, 2, 1, 3, 2])
  geometry.computeBoundingSphere()
  return geometry
}

const layerVert = /* glsl */ `
  uniform float uViewA;
  uniform float uTexA;
  uniform float uFrameZoom;
  uniform vec2 uFrameCenter;
  uniform vec2 uOffset;
  varying vec2 vImgUv;

  ${IMG_TO_CLIP_GLSL}

  void main() {
    vImgUv = position.xy;
    vec2 framed = (vImgUv - uFrameCenter) * uFrameZoom + vec2(0.5);
    vec2 clip = imgToClip(framed, uViewA, uTexA) + uOffset;
    gl_Position = vec4(clip, 0.0, 1.0);
  }
`

const layerFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  uniform sampler2D uMask;
  uniform float uOpacity;
  uniform int uLayerKind;
  uniform int uShadow;
  uniform int uDebugMode;
  varying vec2 vImgUv;

  float layerMask(vec2 uv, vec3 col) {
    float foreground = 1.0 - texture2D(uMask, uv).r;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float left = 1.0 - smoothstep(0.24, 0.39, uv.x);
    float dark = 1.0 - smoothstep(0.22, 0.36, lum);
    float vertical = smoothstep(0.02, 0.11, uv.y) * (1.0 - smoothstep(0.98, 1.0, uv.y));
    float cypress = foreground * left * dark * vertical;
    float lowerBand = foreground * smoothstep(0.52, 0.67, uv.y) * smoothstep(0.05, 0.22, uv.x);
    lowerBand *= 1.0 - cypress * 0.72;
    float raw = uLayerKind == 0 ? cypress : lowerBand;
    return smoothstep(0.03, 0.22, raw);
  }

  void main() {
    vec3 paint = texture2D(uPainting, vImgUv).rgb;
    float mask = layerMask(vImgUv, paint);
    if (mask < 0.012) discard;

    vec3 col = paint;
    if (uDebugMode == 1) {
      col = uLayerKind == 0 ? vec3(0.21, 0.52, 0.31) : vec3(0.30, 0.42, 0.72);
    } else if (uShadow == 1) {
      col = vec3(0.008, 0.014, 0.036);
    } else {
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 lifted = mix(col * vec3(0.92, 0.98, 1.06), col + vec3(0.025, 0.02, 0.008), 0.28);
      col = clamp(mix(vec3(lum), lifted, 1.08), 0.0, 1.1);
    }

    float alpha = mask * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

function ReliefMaskedLayer({
  depth,
  debug,
  geometry,
  kind,
  framing,
  offsetRef,
  opacity,
  shadow = false,
}: {
  depth: number
  debug: ReliefDebugMode
  geometry: BufferGeometry
  kind: LayerKind
  framing: ReliefFraming
  offsetRef: OffsetRef
  opacity: number
  shadow?: boolean
}) {
  const size = useThree((s) => s.size)
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])
  const offset = useMemo(() => new Vector2(), [])

  useEffect(() => {
    for (const texture of [painting, mask]) {
      texture.colorSpace = NoColorSpace
      texture.flipY = false
      texture.needsUpdate = true
    }
  }, [painting, mask])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uOpacity: { value: opacity },
          uLayerKind: { value: kind === 'cypress' ? 0 : 1 },
          uShadow: { value: shadow ? 1 : 0 },
          uDebugMode: { value: debug === 'layers' ? 1 : 0 },
          uViewA: { value: 1.6 },
          uTexA: { value: TEX_ASPECT },
          uFrameZoom: { value: framing.zoom },
          uFrameCenter: { value: new Vector2(framing.center[0], framing.center[1]) },
          uOffset: { value: offset },
        },
        vertexShader: layerVert,
        fragmentShader: layerFrag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [debug, framing, kind, mask, offset, opacity, painting, shadow],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uViewA.value = size.width / size.height
    material.uniforms.uPainting.value = painting
    material.uniforms.uMask.value = mask
    material.uniforms.uOpacity.value = opacity
    material.uniforms.uDebugMode.value = debug === 'layers' ? 1 : 0
    material.uniforms.uFrameZoom.value = framing.zoom
    material.uniforms.uFrameCenter.value.set(framing.center[0], framing.center[1])
    /* eslint-enable react-hooks/immutability */
  }, [debug, framing, mask, material, opacity, painting, size])

  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const baseShadowX = shadow ? -0.009 * depth : 0
    const baseShadowY = shadow ? -0.006 * depth : 0
    offset.set(offsetRef.current.x * depth + baseShadowX, offsetRef.current.y * depth + baseShadowY)
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={shadow ? 2 : 3} />
}

function ReliefForeground({ debug, framing, paused }: { debug: ReliefDebugMode; framing: ReliefFraming; paused: boolean }) {
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const geometry = useMemo(() => makeImageQuadGeometry(), [])

  useEffect(() => {
    if (paused || typeof window === 'undefined') {
      target.current = { x: 0, y: 0 }
      return undefined
    }

    const updatePointer = (event: PointerEvent) => {
      const nx = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      const ny = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
      target.current = {
        x: nx * RELIEF_POINTER.maxX,
        y: -ny * RELIEF_POINTER.maxY,
      }
    }
    const resetPointer = () => {
      target.current = { x: 0, y: 0 }
    }

    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('blur', resetPointer)
    return () => {
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('blur', resetPointer)
    }
  }, [paused])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, dt) => {
    if (paused) target.current = { x: 0, y: 0 }
    const k = 1 - Math.exp(-RELIEF_POINTER.response * Math.min(dt, 0.05))
    current.current.x += (target.current.x - current.current.x) * k
    current.current.y += (target.current.y - current.current.y) * k
  })

  return (
    <group>
      <ReliefMaskedLayer
        depth={RELIEF_LAYERS.cypress.shadowDepth}
        debug={debug}
        framing={framing}
        geometry={geometry}
        kind="cypress"
        offsetRef={current}
        opacity={debug === 'layers' ? 0.78 : RELIEF_LAYERS.cypress.shadowOpacity}
        shadow
      />
      <ReliefMaskedLayer
        depth={RELIEF_LAYERS.foreground.shadowDepth}
        debug={debug}
        framing={framing}
        geometry={geometry}
        kind="foreground"
        offsetRef={current}
        opacity={debug === 'layers' ? 0.48 : RELIEF_LAYERS.foreground.shadowOpacity}
        shadow
      />
      <ReliefMaskedLayer
        depth={RELIEF_LAYERS.cypress.depth}
        debug={debug}
        framing={framing}
        geometry={geometry}
        kind="cypress"
        offsetRef={current}
        opacity={debug === 'layers' ? 0.82 : RELIEF_LAYERS.cypress.opacity}
      />
      <ReliefMaskedLayer
        depth={RELIEF_LAYERS.foreground.depth}
        debug={debug}
        framing={framing}
        geometry={geometry}
        kind="foreground"
        offsetRef={current}
        opacity={debug === 'layers' ? 0.52 : RELIEF_LAYERS.foreground.opacity}
      />
    </group>
  )
}

function Scene({ reduced }: { reduced: boolean }) {
  const debug = readDebugMode()
  const size = useThree((s) => s.size)
  const isPortrait = size.height > size.width
  const framing = isPortrait ? RELIEF_FRAMING.mobile : RELIEF_FRAMING.desktop
  return (
    <Suspense fallback={null}>
      {debug !== 'layers' && <LivingPainting paused={reduced} framing={framing} />}
      {debug !== 'layers' && <StreamlineSky paused={reduced} framing={framing} />}
      {debug !== 'sky' && <ReliefForeground debug={debug} framing={framing} paused={reduced} />}
    </Suspense>
  )
}

export function ReliefExperience({ clean = false, reduced = false }: Props) {
  return (
    <main className={`visitor-shell relief-shell${clean ? ' is-clean-capture' : ''}`}>
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Scene reduced={reduced} />
      </Canvas>
    </main>
  )
}
