/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MirroredRepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { injectAlive, type AliveInjection } from './aliveMaterial.ts'
import { mulberry32 } from './brush.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { FOG, fogInjection } from './streetFog.ts'
import type { ImageData2D } from './useImageData.ts'
import { pathPoint, pathTangent, STREET, STREET_CHURCH, STREET_HOUSES, STREET_TREES } from './streetLayout.ts'

/**
 * SPIKE (2026-10-23, throwaway; Mark: "flat and dull" against Simon Lee's village with "a bit of breeze with fire
 * flies and 3D feel"): the street's motion, glow and depth at stop 3. The moon's light on the faces is in the build
 * (`streetGeometry.ts`, `SPIKE_LIGHT`). Nothing here is gated.
 */
/** The painting's own hill paint (1600 px coordinates): diagonal blue strokes under the right-hand hill's crest. */
const HILL_PAINT = [990, 858, 1290, 898] as const

export const ALIVE = {
  /** a crown's sway: height² × this, in world units */
  sway: 0.06,
  fireflies: 160,
  glow: '#f2cf55',
  /** the warm pool on the ground below a lit window: its radius and strength */
  pool: [0.16, 0.5],
  halo: [0.09, 0.85],
}

/** One clock for the sway and the fireflies. */
export const aliveTime = { value: 0 }

/** The trees' breeze: the vertex moves by its height squared, two slow sines and a gust. */
export function swayInjection(): Omit<AliveInjection, 'key'> {
  return {
    uniforms: { uAliveTime: aliveTime },
    vertexHead: 'uniform float uAliveTime;',
    vertexBody: '',
    fragmentHead: '',
    fragmentBody: '',
    vertexTransform: `
      float swayH = max(position.y, 0.0);
      float swayW = swayH * swayH * ${ALIVE.sway.toFixed(3)};
      float swayGust = 0.55 + 0.45 * sin(uAliveTime * 0.31 + position.x * 0.8);
      transformed.x += swayW * swayGust * sin(uAliveTime * 1.3 + position.x * 9.0 + position.z * 4.0);
      transformed.z += swayW * swayGust * 0.6 * sin(uAliveTime * 1.05 + position.z * 8.0 + position.y * 3.0);`,
  }
}

function radialTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  return t
}

/** A soft-edged dark rectangle: the ground's shadow under a house (the footprint fills the middle 0.53). */
const FOOT_FILL = 68 / 128
function footprintTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  g.filter = 'blur(12px)'
  g.fillStyle = 'rgba(0,0,0,1)'
  g.fillRect(30, 30, 68, 68)
  return new CanvasTexture(canvas)
}

function insideAHouse(x: number, z: number): boolean {
  return STREET_HOUSES.some((h) => {
    const dx = x - h.x
    const dz = z - h.z
    const c = Math.cos(h.yaw)
    const s = Math.sin(h.yaw)
    const along = dx * c + dz * s
    const across = -dx * s + dz * c
    return Math.abs(along) < h.w / 2 && Math.abs(across) < h.d / 2
  })
}

/** The lit windows (class 2 quads in the build's windows), with the normal that points out of the house. */
function litWindows(windows: BrushArraysWithCls): { centre: Vector3; normal: Vector3; width: number }[] {
  const out: { centre: Vector3; normal: Vector3; width: number }[] = []
  const p = windows.positions
  for (let v = 0; v + 3 < windows.cls.length; v += 4) {
    if (windows.cls[v] !== 2 || windows.cls[v + 3] !== 2) continue
    const q = [0, 1, 2, 3].map((k) => new Vector3(p[(v + k) * 3], p[(v + k) * 3 + 1], p[(v + k) * 3 + 2]))
    const centre = q.reduce((a, b) => a.add(b), new Vector3()).multiplyScalar(0.25)
    const normal = q[1].clone().sub(q[0]).cross(q[3].clone().sub(q[0])).setY(0).normalize()
    const probe = centre.clone().addScaledVector(normal, 0.06)
    if (insideAHouse(probe.x, probe.z)) normal.negate()
    out.push({ centre, normal, width: q[1].distanceTo(q[0]) })
  }
  return out
}

/** The hill paint as a texture, read from the loaded painting. */
function hillTexture(painting: ImageData2D): CanvasTexture {
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const x0 = Math.floor(HILL_PAINT[0] * sx)
  const y0 = Math.floor(HILL_PAINT[1] * sy)
  const w = Math.floor((HILL_PAINT[2] - HILL_PAINT[0]) * sx)
  const h = Math.floor((HILL_PAINT[3] - HILL_PAINT[1]) * sy)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * painting.width + x0 + x) * 4
      img.data.set([painting.data[i], painting.data[i + 1], painting.data[i + 2], 255], (y * w + x) * 4)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.wrapS = MirroredRepeatWrapping
  t.wrapT = MirroredRepeatWrapping
  return t
}

function hillsGeometry(): BufferGeometry {
  // two ranges round the street's far end, rising to the right as the painting's do, the far one paler (the fog's air)
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const fwd = new Vector3(...STREET.forward).normalize()
  const right = new Vector3(-fwd.z, 0, fwd.x)
  const ranges = [
    { radius: 5.2, base: 0.55, amp: 0.38, seed: 0.4, air: 0.45 },
    { radius: 4.3, base: 0.3, amp: 0.26, seed: 2.1, air: 0.2 },
  ]
  for (const r of ranges) {
    const start = positions.length / 3
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const theta = -1.25 + (2.5 * i) / steps
      const dir = fwd.clone().multiplyScalar(Math.cos(theta)).addScaledVector(right, Math.sin(theta))
      const x = dir.x * r.radius
      const z = dir.z * r.radius
      const top = r.base + 0.1 * theta + r.amp * (0.6 * Math.sin(1.7 * theta + r.seed) + 0.3 * Math.sin(4.3 * theta + 2 * r.seed) + 0.1 * Math.sin(11 * theta))
      // the painting's hill paint over the body, a lighter moonlit band at the crest, the ink line along the top
      const u = (i / steps) * 7 * (r.radius / 5)
      positions.push(x, -0.05, z, x, top - 0.05, z, x, top - 0.012, z, x, top, z)
      colors.push(0.8, 0.8, 0.8, 1, 1, 1, 1.3, 1.3, 1.3, 0.25, 0.25, 0.3)
      uvs.push(u, 0, u, 0.8, u, 0.95, u, 1)
    }
    for (let i = 0; i < steps; i++) {
      for (let band = 0; band < 3; band++) {
        const a = start + i * 4 + band
        indices.push(a, a + 4, a + 1, a + 1, a + 4, a + 5)
      }
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  g.setIndex(indices)
  return g
}

const FIREFLY_VERTEX = `
  uniform float uAliveTime;
  uniform float uScale;
  attribute float aPhase;
  varying float vBright;
  void main() {
    vec3 p = position;
    p.x += 0.05 * sin(uAliveTime * 0.29 + aPhase);
    p.y += 0.02 * sin(uAliveTime * 0.53 + aPhase * 1.7);
    p.z += 0.05 * cos(uAliveTime * 0.23 + aPhase * 0.6);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vBright = pow(max(0.0, sin(uAliveTime * 0.8 + aPhase * 2.3)), 4.0);
    gl_PointSize = uScale * (0.010 + 0.010 * vBright) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`
const FIREFLY_FRAGMENT = `
  uniform vec3 uColour;
  varying float vBright;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = exp(-r * r * 7.0) * (0.12 + 0.88 * vBright);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColour * a, a);
  }`

/** The spike's living parts: fireflies over the path, a warm glow at each lit window and on the ground below it, the hills. */
export default function StreetAlive({ windows, painting }: { windows: BrushArraysWithCls; painting: ImageData2D }) {
  useFrame((state) => {
    // the sky's capture seam pins this clock too, so a capture is frame-exact
    const pinned = (window as Window & { __skyTime?: number }).__skyTime
    aliveTime.value = typeof pinned === 'number' && Number.isFinite(pinned) ? pinned : state.clock.elapsedTime
  })

  const parts = useMemo(() => {
    const rand = mulberry32(0xf1f1)
    const n = ALIVE.fireflies
    const pos = new Float32Array(n * 3)
    const phase = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = 0.25 + rand() * 1.15
      const [px, , pz] = pathPoint(t)
      const [tx, , tz] = pathTangent(t)
      const lateral = (rand() * 2 - 1) * 0.75
      pos.set([px - tz * lateral, 0.02 + rand() * rand() * 0.3, pz + tx * lateral], i * 3)
      phase[i] = rand() * 100
    }
    const flyGeometry = new BufferGeometry()
    flyGeometry.setAttribute('position', new BufferAttribute(pos, 3))
    flyGeometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
    const flyMaterial = new ShaderMaterial({
      uniforms: { uAliveTime: aliveTime, uScale: { value: 1400 }, uColour: { value: new Color(ALIVE.glow) } },
      vertexShader: FIREFLY_VERTEX,
      fragmentShader: FIREFLY_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const texture = radialTexture()
    const glowMaterial = (strength: number) =>
      new MeshBasicMaterial({ map: texture, color: new Color(ALIVE.glow).multiplyScalar(strength), transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false })
    const hillPaint = hillTexture(painting)
    const hills = new MeshBasicMaterial({ map: hillPaint, vertexColors: true, side: DoubleSide, toneMapped: false })
    // the air between: the street's fog colour, reached far beyond the street's own fog
    injectAlive(hills, { key: 'street-hills', ...fogInjection(FOG.colour, 1.5, 10) })
    // the ground's contact shadow under each house and tree (Mark: "the house feels like a cardboard")
    const footTexture = footprintTexture()
    const foot = new MeshBasicMaterial({ map: footTexture, color: new Color(0, 0, 0), transparent: true, opacity: 0.65, depthWrite: false, toneMapped: false })
    const blob = new MeshBasicMaterial({ map: texture, color: new Color(0, 0, 0), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false })
    return { flyGeometry, flyMaterial, texture, pool: glowMaterial(ALIVE.pool[1]), halo: glowMaterial(ALIVE.halo[1]), hillsGeometry: hillsGeometry(), hills, hillPaint, footTexture, foot, blob }
  }, [painting])
  useEffect(() => () => {
    parts.flyGeometry.dispose()
    parts.flyMaterial.dispose()
    parts.texture.dispose()
    parts.pool.dispose()
    parts.halo.dispose()
    parts.hillsGeometry.dispose()
    parts.hills.dispose()
    parts.hillPaint.dispose()
    parts.footTexture.dispose()
    parts.foot.dispose()
    parts.blob.dispose()
  }, [parts])

  const lit = useMemo(() => litWindows(windows), [windows])

  return (
    <group name="street-alive">
      <mesh name="street-hills" geometry={parts.hillsGeometry} material={parts.hills} renderOrder={-1} />
      {[...STREET_HOUSES, STREET_CHURCH.nave].map((h, i) => (
        <group key={`foot-${i}`} position={[h.x, 0.006, h.z]} rotation={[0, -h.yaw, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={parts.foot} renderOrder={3}>
            <planeGeometry args={[h.w / FOOT_FILL, h.d / FOOT_FILL]} />
          </mesh>
        </group>
      ))}
      {STREET_TREES.map((t, i) => (
        <mesh key={`blob-${i}`} position={[t.x, 0.006, t.z]} rotation={[-Math.PI / 2, 0, 0]} material={parts.blob} renderOrder={3}>
          <planeGeometry args={[0.5, 0.5]} />
        </mesh>
      ))}
      {lit.map((w, i) => {
        const pool = w.centre.clone().addScaledVector(w.normal, ALIVE.pool[0] * 0.6).setY(0.003)
        const halo = w.centre.clone().addScaledVector(w.normal, 0.008)
        const yaw = Math.atan2(w.normal.x, w.normal.z)
        return (
          <group key={i}>
            <mesh position={pool.toArray()} rotation={[-Math.PI / 2, 0, 0]} material={parts.pool} renderOrder={4}>
              <planeGeometry args={[ALIVE.pool[0] * 2, ALIVE.pool[0] * 2]} />
            </mesh>
            <mesh position={halo.toArray()} rotation={[0, yaw, 0]} material={parts.halo} renderOrder={4}>
              <planeGeometry args={[ALIVE.halo[0] * 2 + w.width, ALIVE.halo[0] * 2 + w.width]} />
            </mesh>
          </group>
        )
      })}
      <points name="street-fireflies" geometry={parts.flyGeometry} material={parts.flyMaterial} renderOrder={5} />
    </group>
  )
}
