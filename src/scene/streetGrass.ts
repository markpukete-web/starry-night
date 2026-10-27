import { Box3, Sphere, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { vnoise } from './brushForms.ts'
import { bladeReach, type BladeSpec, clump, GRASS_BLADE } from './grassBlade.ts'
import {
  laneParam,
  pathPoint,
  pathTangent,
  STREET,
  streetClearings,
  STREET_CYPRESS,
  STREET_HOUSES,
  STREET_SQUARE,
  type OrientedBox,
  walkPose,
} from './streetLayout.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The street's grass (S3 task 2, tasks/2026-10-24-street-s3-plan.md):
 * the constants, chunk generator, thinning draw count, and footprint.
 */

export const GRASS = {
  t: [-0.06, 0.97] as const,
  lat: [0.052, 0.765] as const,
  /** the chunks' lateral bands and their length along the lane. S3b halved the length: a chunk draws all its blades
   * when any of it is in view, and at the walk's worst point 46% of them were not (splitting the outer band did not help) */
  bands: [0.052, 0.2, 0.4, 0.765] as const,
  dt: 0.025,
  r0: 0.22,
  /**
   * Density starts at 0.22 from Task 1; tuned to 0.21 so the walk's worst point
   * fits inside GRASS.budget (38,515) with the larger bladeReach spheres, then to 0.2 for look pass 2's bigger blade
   * (0.21 and 0.205 overrun the budget, 0.203 fails two tests), then to 0.165 for S3b's fourth segment with the shorter
   * chunks; the budget test prints the worst point.
   */
  density: 0.165,
  full: 82184,
  house: 0.012,
  cypress: 0.07,
  top: 0.065,
  baseY: 0.001,
  footprint: { t: [-0.06, 0.97] as const, lat: [0.06, 0.6] as const },
  budget: 38515,
} as const

export function inFootprint(x: number, z: number): boolean {
  const [t, lat] = laneParam(x, z)
  const a = Math.abs(lat)
  return (
    t >= GRASS.footprint.t[0] &&
    t <= GRASS.footprint.t[1] &&
    a >= GRASS.footprint.lat[0] &&
    a <= GRASS.footprint.lat[1] &&
    Math.hypot(x - STREET_SQUARE.x, z - STREET_SQUARE.z) > STREET_SQUARE.radius
  )
}

export type GrassChunk = {
  blades: BladeSpec[]
  latIn: number
  box: { min: [number, number, number]; max: [number, number, number] }
  reach: number
  sphere: { centre: [number, number, number]; radius: number }
}

export function grassChunks(painting: ImageData2D, customDensity?: number, clearings: readonly OrientedBox[] = streetClearings()): GrassChunk[] {
  const density = customDensity ?? GRASS.density
  const rand = mulberry32(1)
  const DT = GRASS.dt
  const BANDS = GRASS.bands
  const FULL = GRASS.full
  const R0 = GRASS.r0
  const TOP = GRASS.top
  const meanClump = (GRASS_BLADE.clump[0] + GRASS_BLADE.clump[1]) / 2

  const walkCameras: [number, number, number][] = []
  for (let k = 0; k <= 900; k++) {
    const t = k / 1000
    walkCameras.push(walkPose(t, false).position)
    walkCameras.push(walkPose(t, true).position)
  }

  const insideHouse = (x: number, z: number, m: number) =>
    STREET_HOUSES.some((h) => {
      const dx = x - h.x
      const dz = z - h.z
      const c = Math.cos(h.yaw)
      const s = Math.sin(h.yaw)
      return Math.abs(dx * c + dz * s) < h.w / 2 + m && Math.abs(-dx * s + dz * c) < h.d / 2 + m
    })

  const isExcluded = (x: number, z: number) =>
    insideHouse(x, z, GRASS.house) ||
    Math.hypot(x - STREET_CYPRESS.x, z - STREET_CYPRESS.z) < GRASS.cypress ||
    Math.hypot(x - STREET_SQUARE.x, z - STREET_SQUARE.z) < STREET_SQUARE.radius

  const chunks: GrassChunk[] = []

  for (let t0 = GRASS.t[0]; t0 < GRASS.t[1] - 1e-9; t0 += DT) {
    for (const side of [-1, 1]) {
      for (let bi = 0; bi < BANDS.length - 1; bi++) {
        const [l0, l1] = [BANDS[bi], BANDS[bi + 1]]
        const tries = Math.round((FULL * density * DT * STREET.pathLength * (l1 - l0) * 3) / meanClump)
        let chunkBlades: BladeSpec[] = []

        for (let i = 0; i < tries; i++) {
          const t = t0 + rand() * DT
          const lat = l0 + rand() * (l1 - l0)
          if (rand() > (1 / 3) * Math.min(1, (R0 / lat) ** 2)) continue
          const [px, , pz] = pathPoint(t)
          const [tx, , tz] = pathTangent(t)
          const cx = px - tz * lat * side
          const cz = pz + tx * lat * side
          if (isExcluded(cx, cz)) continue

          const verge = 0.35 + 0.65 * Math.max(0, Math.min(1, (lat - 0.052) / 0.1))
          const clumpHeight = GRASS_BLADE.height * (0.45 + 1.1 * vnoise(cx * 9 + 3.7, cz * 9 - 1.3)) * verge
          const blades = clump(rand, painting, cx, cz, clumpHeight)

          for (const b of blades) {
            const [, bLat] = laneParam(b.x, b.z)
            if (Math.abs(bLat) < 0.052 || isExcluded(b.x, b.z)) continue
            chunkBlades.push(b)
          }
        }

        if (chunkBlades.length === 0) continue

        // Fisher-Yates shuffle with rand so prefix is an even sample
        for (let i = chunkBlades.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1))
          const tmp = chunkBlades[i]
          chunkBlades[i] = chunkBlades[j]
          chunkBlades[j] = tmp
        }

        chunkBlades = chunkBlades.filter((b) => {
          for (let s = 0; s < clearings.length; s++) {
            const { ox, oz, ux, uz, nx, nz, u0, u1, k0, k1 } = clearings[s]
            const dx = b.x - ox
            const dz = b.z - oz
            const a = dx * ux + dz * uz
            const k = dx * nx + dz * nz
            const da = Math.max(u0 - a, 0, a - u1)
            const dk = Math.max(k0 - k, 0, k - k1)
            if (Math.hypot(da, dk) < GRASS.house) return false
          }
          return true
        })

        if (chunkBlades.length === 0) continue

        let minX = Infinity
        let minZ = Infinity
        let maxX = -Infinity
        let maxZ = -Infinity
        for (const b of chunkBlades) {
          if (b.x < minX) minX = b.x
          if (b.x > maxX) maxX = b.x
          if (b.z < minZ) minZ = b.z
          if (b.z > maxZ) maxZ = b.z
        }

        const corners: [number, number][] = [
          [minX, minZ],
          [maxX, minZ],
          [minX, maxZ],
          [maxX, maxZ],
        ]
        let maxCamDist = 0
        for (const cam of walkCameras) {
          for (const [cornerX, cornerZ] of corners) {
            const d = Math.hypot(cornerX - cam[0], cam[1], cornerZ - cam[2])
            if (d > maxCamDist) maxCamDist = d
          }
        }

        let chunkReach = 0
        for (const b of chunkBlades) {
          const r = bladeReach(b, maxCamDist)
          if (r > chunkReach) chunkReach = r
        }

        const padded = new Box3(
          new Vector3(minX - chunkReach, 0, minZ - chunkReach),
          new Vector3(maxX + chunkReach, TOP, maxZ + chunkReach),
        )
        const sphere = padded.getBoundingSphere(new Sphere())

        chunks.push({
          blades: chunkBlades,
          latIn: l0,
          box: { min: [minX, 0, minZ], max: [maxX, 0, maxZ] },
          reach: chunkReach,
          sphere: { centre: [sphere.center.x, sphere.center.y, sphere.center.z], radius: sphere.radius },
        })
      }
    }
  }

  return chunks
}

export function grassDrawCount(chunk: GrassChunk, camera: [number, number, number]): number {
  const camGround = new Vector3(camera[0], 0, camera[2])
  const box3 = new Box3(new Vector3(...chunk.box.min), new Vector3(...chunk.box.max))
  const d = Math.max(box3.distanceToPoint(camGround), 1e-6)
  const share = Math.min(1, (Math.max(GRASS.r0, chunk.latIn) / Math.max(GRASS.r0, d)) ** 2)
  return Math.ceil(chunk.blades.length * share)
}

export function grassRect(chunks: GrassChunk[]): [x0: number, z0: number, width: number, depth: number] {
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const ch of chunks) {
    if (ch.box.min[0] < minX) minX = ch.box.min[0]
    if (ch.box.min[2] < minZ) minZ = ch.box.min[2]
    if (ch.box.max[0] > maxX) maxX = ch.box.max[0]
    if (ch.box.max[2] > maxZ) maxZ = ch.box.max[2]
  }
  return [minX, minZ, maxX - minX, maxZ - minZ]
}
