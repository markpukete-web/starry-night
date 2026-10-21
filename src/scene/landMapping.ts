import { RZ } from './islandShape.ts'

/**
 * The painting's land band on the island's top (E2, tasks/2026-10-21-land-e2-plan.md E2.2): the apron in front of
 * the village's back row carries the fields, the humps behind carry the hills, x across the island is u centred
 * on the church's nave (world x −0.036 under the painting's u 0.56, villageGeometry.ts) at 4.75 world units per
 * unit of u, which puts the painting's right edge on the right coast (x 2.05 ↔ u 0.999; at 4.1, the island's
 * span over the painting's width, the rim beyond x 1.77 had no texel under it) and the left coast at u 0.136,
 * inside the cypress column, whose texels take the ground's fill (landStrokes.ts). The ground is fill, so this map is its own: the rows
 * and the masses keep their authored placements (landMasses.ts), whose own scales differ (Codex, E2 plan review
 * F2). The home camera's rays cannot give this map: through the dome the island's top lands on the hills only.
 */
export const LAND_MAP = {
  u0: 0.56,
  x0: -0.036,
  worldPerU: 4.75,
  /** z from the front rim to the village's back row ↔ v from the painting's bottom to the fields' top */
  apron: { zFront: RZ, zBack: 0.25, vFront: 1.0, vBack: 0.78 },
  /** the humps ↔ the hills; the stretch along z is 8.9 world units per v against the apron's 5.0, the slope's */
  hills: { zBack: -RZ, vBack: 0.6 },
  /** the band the flow asset covers */
  bandV0: 0.58,
} as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Painting uv under an island-top point. */
export function paintingUvAt(x: number, z: number): [number, number] {
  const { u0, x0, worldPerU, apron, hills } = LAND_MAP
  const u = u0 + (x - x0) / worldPerU
  const v =
    z >= apron.zBack
      ? lerp(apron.vBack, apron.vFront, (z - apron.zBack) / (apron.zFront - apron.zBack))
      : lerp(hills.vBack, apron.vBack, (z - hills.zBack) / (apron.zBack - hills.zBack))
  return [u, v]
}

/** The island-top point under a painting uv (the inverse). */
export function worldAt(u: number, v: number): [number, number] {
  const { u0, x0, worldPerU, apron, hills } = LAND_MAP
  const x = x0 + (u - u0) * worldPerU
  const z =
    v >= apron.vBack
      ? lerp(apron.zBack, apron.zFront, (v - apron.vBack) / (apron.vFront - apron.vBack))
      : lerp(hills.zBack, apron.zBack, (v - hills.vBack) / (apron.vBack - hills.vBack))
  return [x, z]
}

/** A land-flow sample (crop-normalised px, py) as painting uv. */
export function flowToPainting(px: number, py: number): [number, number] {
  return [px, LAND_MAP.bandV0 + py * (1 - LAND_MAP.bandV0)]
}
