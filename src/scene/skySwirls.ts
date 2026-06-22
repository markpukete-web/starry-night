// Single source of truth for the painting's swirl centres, shared by the offline flow/mask BAKE
// (scripts/derive-reference.ts) and the runtime dab-orbit (dabEngine.buildDabField2D), so the mask
// discs and the orbit centres are guaranteed to agree — no drift between bake and render (Mark req).
//
// Each entry is [u, v, sign, radius] in the painting's image-UV (x right, y DOWN — matches the derived
// assets and getImageData). Signs are validated by the living-painting capture (flip if a swirl turns the
// wrong way); the moon's −1 is Mark's chosen direction.

export type Swirl = [u: number, v: number, sign: number, radius: number]

export const SWIRLS: Swirl[] = [
  [0.45, 0.41, +1, 0.2], // central whorl (dominant)
  [0.52, 0.37, -1, 0.12], // counter-roll of the double comma
  [0.27, 0.33, -1, 0.07], // Venus / bright left star
  [0.13, 0.13, +1, 0.05],
  [0.31, 0.13, -1, 0.05],
  [0.4, 0.1, +1, 0.05],
  [0.52, 0.2, -1, 0.05],
  [0.59, 0.1, +1, 0.05],
  [0.66, 0.27, -1, 0.05],
  [0.72, 0.18, +1, 0.05],
  [0.1, 0.42, +1, 0.05],
  [0.85, 0.16, -1, 0.11], // moon halo — its bright rings spin around the static crescent; -1 = Mark's direction
]

export const MOON_UV: [number, number] = [0.85, 0.16]
export const MOON_R = 0.07

// Swirls whose HALOS churn AND orbit (stars, the double-comma rolls, the moon halo). Excludes the
// dominant central whorl (r 0.2, already animating from its own size) and any swirl on the cypress column
// (u<0.2 & v>0.3) so we never paint churn onto the tree. Used by the mask discs (bake) AND the dab orbit.
export const HALO_SWIRLS: Swirl[] = SWIRLS.filter(([u, v, , r]) => r <= 0.12 && !(u < 0.2 && v > 0.3))
