import { Vector3 } from 'three'
import { DOME_R, FWD, RIGHT, SPAN_H, SPAN_V, TRUEUP } from './skyMapping.ts'
import { DIORAMA_CAMERAS } from './dioramaContract.ts'
import { uvToDioramaSkyPosition } from './dioramaSkyProjection.ts'

/**
 * Home-view projective texturing: world geometry samples the painting through the SAME projection
 * the camera-locked source sky/matte uses, registered to the design (home) camera. Head-on, a
 * projected surface is pixel-identical with the matte behind it by construction; orbiting reveals
 * only genuine depth, never a second copy of the image.
 */

/** The home (design) eye — all projective registration is exact from this viewpoint. */
export const HOME_EYE = new Vector3(...DIORAMA_CAMERAS.design.position)

/** Radius of the shell the source matte renders at (see DioramaForegroundMatte). */
export const SOURCE_SHELL_R = DOME_R - 0.18

const H_SCALE = SPAN_H * 1.16
const V_SCALE = SPAN_V * 1.06

/** Painting UV seen directly behind world point `p` from the home eye. */
export function worldToSourceUV(p: Vector3, radius = SOURCE_SHELL_R): { u: number; v: number } {
  const dir = new Vector3().subVectors(p, HOME_EYE).normalize()
  const b = HOME_EYE.dot(dir)
  const c = HOME_EYE.lengthSq() - radius * radius
  const t = -b + Math.sqrt(Math.max(0, b * b - c)) // the eye is inside the shell → a forward hit exists
  const hit = new Vector3().copy(HOME_EYE).addScaledVector(dir, t).normalize()
  const w = Math.asin(Math.min(1, Math.max(-1, hit.dot(TRUEUP))))
  const h = Math.atan2(hit.dot(RIGHT), hit.dot(FWD))
  return { u: 0.5 + h / H_SCALE, v: 0.5 - w / V_SCALE }
}

/** World point `dist` from the home eye along the sightline to painting UV (u, v). */
export function sourceUVAtDistance(u: number, v: number, dist: number, out = new Vector3()): Vector3 {
  uvToDioramaSkyPosition(u, v, out, SOURCE_SHELL_R)
  out.sub(HOME_EYE).normalize()
  return out.multiplyScalar(dist).add(HOME_EYE)
}

/** Approximate world metres per unit of painting-u at `dist` from the eye (small-angle arc). */
export function worldPerU(dist: number): number {
  return dist * H_SCALE
}

/** Approximate world metres per unit of painting-v at `dist` from the eye. */
export function worldPerV(dist: number): number {
  return dist * V_SCALE
}
