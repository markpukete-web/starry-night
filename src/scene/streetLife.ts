import {
  BufferAttribute,
  BufferGeometry,
  Vector3,
} from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { STREET, STREET_HOUSES } from './streetLayout.ts'

/** The painting's own hill paint (1600 px coordinates): diagonal blue strokes under the right-hand hill's crest. */
export const HILL_PAINT = [990, 858, 1290, 898] as const

export const LIFE = {
  /** a crown's sway: height² × this, in world units */
  sway: 0.06,
  fireflies: 160,
  fireflyT: [0.05, 1.0] as const,
  glow: '#f2cf55',
  /** the warm pool on the ground below a lit window: its radius and strength */
  pool: [0.16, 0.5] as const,
  halo: [0.09, 0.85] as const,
}

export const ALIVE = LIFE

/** One clock for the sway and the fireflies. */
export const lifeTimeUniform = { value: 0 }
export const aliveTime = lifeTimeUniform

export function lifeTime(pinned: number | undefined, elapsed: number, reduced: boolean): number {
  if (reduced) return 0
  return typeof pinned === 'number' && Number.isFinite(pinned) ? pinned : elapsed
}

/** The trees' breeze: the vertex moves by its height squared, two slow sines and a gust. */
export function swayInjection(): Omit<AliveInjection, 'key'> {
  return {
    uniforms: { uAliveTime: lifeTimeUniform },
    vertexHead: 'uniform float uAliveTime;',
    vertexBody: '',
    fragmentHead: '',
    fragmentBody: '',
    vertexTransform: `
      float swayH = max(position.y, 0.0);
      float swayW = swayH * swayH * ${LIFE.sway.toFixed(3)};
      float swayGust = 0.55 + 0.45 * sin(uAliveTime * 0.31 + position.x * 0.8);
      transformed.x += swayW * swayGust * sin(uAliveTime * 1.3 + position.x * 9.0 + position.z * 4.0);
      transformed.z += swayW * swayGust * 0.6 * sin(uAliveTime * 1.05 + position.z * 8.0 + position.y * 3.0);`,
  }
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
export function litWindows(windows: BrushArraysWithCls): { centre: Vector3; normal: Vector3; width: number }[] {
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

export function hillsGeometry(): BufferGeometry {
  // two ranges round the street's far end, rising to the right as the painting's do, the far one paler (the fog's air)
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const fwd = new Vector3(...STREET.forward).normalize()
  const right = new Vector3(-fwd.z, 0, fwd.x)
  const ranges = [
    // look pass 1: out from 5.2 and 4.3 and down to 0.8 of their height. With the lane now 2.4 long the near range stood
    // 1.7 behind the church and read as a wall at stop 4. The sky follows the camera at radius 6, so 5.8 from a camera is
    // the limit: the far range's front is 5.77 from stop 0's
    { radius: 5.6, base: 0.44, amp: 0.3, seed: 0.4, air: 0.45 },
    { radius: 4.9, base: 0.24, amp: 0.21, seed: 2.1, air: 0.2 },
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
