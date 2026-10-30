import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from 'three'
import { MOTHS, mothBright, mothPositions, mothSpecs, type MothSpec } from './moths.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { PALETTE } from './palette.ts'
import { FOG } from './streetFog.ts'
import { lifeTime, litWindows } from './streetLife.ts'
import { sourceUnderpaint } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'

type MothWindow = Window & {
  __skyTime?: number
  __moths?: () => {
    count: number
    time: number
    moths: { at: number[]; glass: number[]; anchor: number[]; radius: number; bright: number; window: boolean }[]
  }
}

// the quad billboards in view space; the wing's width beats between 0.3 and 1 of the full width (Codex F7). The glass's
// direction in view space goes to the fragment: its xy across the screen, its z toward the camera
const VERTEX = `
  uniform float uTime;
  uniform vec2 uSize;
  attribute vec3 aAt;
  attribute vec3 aGlass;
  attribute float aBright;
  attribute float aFlap;
  attribute float aFlapPhase;
  varying vec2 vUv;
  varying float vBright;
  varying float vDepth;
  varying vec3 vToGlass;
  varying float vWing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aAt, 1.0);
    vToGlass = normalize((modelViewMatrix * vec4(aGlass, 1.0)).xyz - mv.xyz);
    float wing = 0.3 + 0.7 * abs(cos(6.2832 * uTime / aFlap + aFlapPhase));
    mv.xy += vec2(position.x * uSize.x * wing, position.y * uSize.y);
    vUv = uv;
    vBright = aBright;
    vDepth = -mv.z;
    vWing = wing;
    gl_Position = projectionMatrix * mv;
  }`

// Look pass 5 (Mark: the soft pale ovals read as the fireflies): a moth, not a light. Hard-edged forewings and hindwings
// either side of a dark body. The wings' half toward the glass is lit (the lantern's lit mean mixed toward white,
// `MOTHS.pale`), the far half in the thatch's darkest paint, so with the glass behind it the moth is a silhouette. The
// wings catch the light as they open. Dimmed away from the glass, in the street's linear fog (Codex Q3). Every colour
// is sRGB and written raw, as the project's own shaders do
const FRAGMENT = `
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uBody;
  uniform vec3 uFog;
  varying vec2 vUv;
  varying float vBright;
  varying float vDepth;
  varying vec3 vToGlass;
  varying float vWing;
  void main() {
    if (vBright <= 0.0) discard;
    vec2 q = (vUv - 0.5) * 2.0;
    float ax = abs(q.x);
    float fore = length(vec2((ax - 0.5) / 0.5, (q.y - 0.2 - 0.3 * ax) / 0.55));
    float hind = length(vec2((ax - 0.3) / 0.32, (q.y + 0.38) / 0.42));
    float body = length(vec2(q.x / 0.14, q.y / 0.85));
    if (min(min(fore, hind), body) > 1.0) discard;
    float side = dot(normalize(q + vec2(0.0, 1e-4)), normalize(vToGlass.xy + vec2(1e-4, 0.0))) * length(vToGlass.xy);
    float lit = clamp(0.15 + 0.6 * vToGlass.z + 0.9 * side, 0.0, 1.0) * (0.7 + 0.3 * vWing);
    vec3 c = body <= 1.0 ? uBody : mix(uShade, uLit, lit);
    c = mix(c * vBright, uFog, smoothstep(${FOG.near.toFixed(3)}, ${FOG.far.toFixed(3)}, vDepth));
    gl_FragColor = vec4(c, 1.0);
  }`

type MothParts = { at: InstancedBufferAttribute; bright: InstancedBufferAttribute; uTime: { value: number }; positions: Float32Array }

/** One frame's loop into the instanced attributes (a plain function, so the component does not mutate its memo). */
function writeMoths(specs: readonly MothSpec[], parts: MothParts, time: number, cam: Vector3, offset: readonly [number, number, number]) {
  mothPositions(specs, time, parts.positions)
  const atArr = parts.at.array as Float32Array
  const brightArr = parts.bright.array as Float32Array
  specs.forEach((s, i) => {
    atArr.set(parts.positions.subarray(i * 3, i * 3 + 3), i * 3)
    const near = !s.window || Math.hypot(s.glass[0] + offset[0] - cam.x, s.glass[1] + offset[1] - cam.y, s.glass[2] + offset[2] - cam.z) <= MOTHS.windowReach
    brightArr[i] = near ? mothBright(Math.hypot(atArr[i * 3] - s.glass[0], atArr[i * 3 + 1] - s.glass[1], atArr[i * 3 + 2] - s.glass[2])) : 0
  })
  parts.at.needsUpdate = true
  parts.bright.needsUpdate = true
  parts.uTime.value = time
}

/**
 * The moths (church-owl plan, Task 2): one instanced quad, 29 moths for seven lamps and four lit windows. The loop is
 * computed on the CPU each frame (`mothPositions`), a lamp's moths always drawn and a window's only while its glass is
 * within `MOTHS.windowReach` of the camera. They take the sky's clock as the frogs do, so reduced motion and Pause hold
 * them at their anchors.
 */
export default function StreetMoths({
  painting,
  lamps,
  windows,
  offset,
  reduced,
}: {
  painting: ImageData2D
  lamps: readonly { lantern: Vector3 }[]
  windows: BrushArraysWithCls
  offset: readonly [number, number, number]
  reduced: boolean
}) {
  const specs = useMemo(() => mothSpecs(lamps, litWindows(windows)), [lamps, windows])

  const parts = useMemo(() => {
    const n = specs.length
    const geometry = new InstancedBufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3))
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    geometry.instanceCount = n
    const at = new InstancedBufferAttribute(new Float32Array(n * 3), 3)
    const bright = new InstancedBufferAttribute(new Float32Array(n), 1)
    geometry.setAttribute('aAt', at)
    geometry.setAttribute('aBright', bright)
    geometry.setAttribute('aFlap', new InstancedBufferAttribute(Float32Array.from(specs, (s) => s.flap), 1))
    geometry.setAttribute('aFlapPhase', new InstancedBufferAttribute(Float32Array.from(specs, (s) => s.flapPhase), 1))
    geometry.setAttribute('aGlass', new InstancedBufferAttribute(Float32Array.from(specs.flatMap((s) => s.glass)), 3))
    const fog = new Color(FOG.colour).getRGB(new Color(), SRGBColorSpace)
    const body = new Color(PALETTE.ground).getRGB(new Color(), SRGBColorSpace)
    const uTime = { value: 0 }
    const material = new ShaderMaterial({
      uniforms: {
        uTime,
        // sRGB 0 to 1, unconverted: the shader writes raw. Mixed toward white by `MOTHS.pale` (look pass 1)
        uLit: { value: new Vector3(...sourceUnderpaint(painting, 'windowLit', 1).map((c) => c + (1 - c) * MOTHS.pale)) },
        // the wings' shade: the thatch's darkest 40%, the owl's back's paint (look pass 5)
        uShade: { value: new Vector3(...sourceUnderpaint(painting, 'thatch', 0.4)) },
        uBody: { value: new Vector3(body.r, body.g, body.b) },
        uFog: { value: new Vector3(fog.r, fog.g, fog.b) },
        uSize: { value: new Vector2(...MOTHS.size) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      toneMapped: false,
    })
    return { geometry, material, at, bright, uTime, positions: new Float32Array(n * 3) }
  }, [specs, painting])
  useEffect(() => () => {
    parts.geometry.dispose()
    parts.material.dispose()
  }, [parts])

  const timeRef = useRef(0)
  useFrame((state) => {
    timeRef.current = lifeTime((window as MothWindow).__skyTime, state.clock.elapsedTime, reduced)
    writeMoths(specs, parts, timeRef.current, state.camera.position, offset)
  })

  // the check's seam (`check-street-grass.mjs` case 21)
  useEffect(() => {
    const w = window as MothWindow
    w.__moths = () => ({
      count: specs.length,
      time: timeRef.current,
      moths: specs.map((s, i) => ({
        at: Array.from((parts.at.array as Float32Array).subarray(i * 3, i * 3 + 3)),
        glass: s.glass,
        anchor: s.anchor,
        radius: s.radius,
        bright: (parts.bright.array as Float32Array)[i],
        window: s.window,
      })),
    })
    return () => {
      delete w.__moths
    }
  }, [specs, parts])

  return <mesh name="street-moths" geometry={parts.geometry} material={parts.material} frustumCulled={false} renderOrder={3} />
}
