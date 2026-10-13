import { Matrix4, Quaternion, Vector3 } from 'three'
import { DOME_R, FWD, RIGHT, SPAN_H, SPAN_V, TRUEUP } from './skyMapping.ts'

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/**
 * S4 side extension (docs/decisions/0003-inpaint-extend.md): the painting continues past its
 * L/R edges by SIDE_EXTEND_U of canvas width per side (baked strips sky-extend-{left,right}),
 * full paint through SIDE_FADE_START_U, then melting into the night gradient by the strip's
 * outer edge. Margins measured from the orbit envelope (every reachable pose exposes ≤0.14
 * past an edge; scratch/measure-exposure.ts) — the fade, not the strip, owns everything the
 * look-down horizon sweep can reach beyond that.
 */
export const SIDE_EXTEND_U = 0.3
export const SIDE_FADE_START_U = 0.15
/** The scan's raw canvas-weave border (unpainted physical edge, ~20 px at 1600w) is owned by
 *  the strips: each strip texture covers paintU ∈ [−SIDE_EXTEND_U, SIDE_BORDER_U] (mirrored on
 *  the right), regrown from real paint at bake time so no pale weave line splits the sky. */
export const SIDE_BORDER_U = 20 / 1600

export function dioramaSourceEdgeFade(u: number, v: number): number {
  // sides: full paint across the canvas and the inner strip zone, fading out over the outer
  // strip; the old in-canvas side fade is gone — the strips own the melt now
  const x = smooth(-SIDE_EXTEND_U, -SIDE_FADE_START_U, u) * smooth(1 + SIDE_EXTEND_U, 1 + SIDE_FADE_START_U, u)
  const y = smooth(0.0, 0.13, v) * smooth(1.0, 0.76, v)
  return x * y
}

export function uvToDioramaSkyPosition(u: number, v: number, out = new Vector3(), radius = DOME_R): Vector3 {
  const h = (u - 0.5) * SPAN_H * 1.16
  const w = (0.5 - v) * SPAN_V * 1.06
  const cw = Math.cos(w)
  return out
    .copy(FWD)
    .multiplyScalar(cw * Math.cos(h))
    .addScaledVector(RIGHT, cw * Math.sin(h))
    .addScaledVector(TRUEUP, Math.sin(w))
    .normalize()
    .multiplyScalar(radius)
}

/**
 * B (touch): the inverse of `uvToDioramaSkyPosition` for a direction in the sky group's frame (review-checked:
 * |h| < π and |w| < π/2 over the strips and the cap, so no wrap; round trip 4e-16).
 */
export function uvFromSkyDirection(direction: Vector3): [number, number] {
  const d = _dir.copy(direction).normalize()
  const h = Math.atan2(d.dot(RIGHT), d.dot(FWD))
  const w = Math.asin(Math.min(1, Math.max(-1, d.dot(TRUEUP))))
  return [0.5 + h / (SPAN_H * 1.16), 0.5 - w / (SPAN_V * 1.06)]
}
const _dir = new Vector3()

/**
 * Where a ray meets the painted sky: the FAR root of the sphere of `radius` about the origin, whether the camera
 * is inside the dome (the usual case) or outside it at the orbit's extremes looking in through the unpainted cap
 * (review F4). Null when the ray misses the sphere or the far root lies behind the origin of the ray.
 */
export function skyPointFromRay(origin: Vector3, direction: Vector3, out = new Vector3(), radius = DOME_R): Vector3 | null {
  const d = _dir.copy(direction).normalize()
  const b = origin.dot(d)
  const c = origin.dot(origin) - radius * radius
  const discriminant = b * b - c
  if (discriminant < 0) return null
  const t = -b + Math.sqrt(discriminant)
  if (t <= 0) return null
  return out.copy(origin).addScaledVector(d, t)
}

/**
 * The inverse of the home camera's orientation: the sky group's quaternion is `camera.quaternion × this` every
 * frame (PaintingFlowSky3D), so the touch hook can rotate a world direction into the sky's frame with the same
 * numbers the sky uses. Camera-convention lookAt, as the sky builds it.
 */
export function homeInverseQuaternion(home: { position: readonly [number, number, number]; target: readonly [number, number, number] }): Quaternion {
  const eye = new Vector3(...home.position)
  const target = new Vector3(...home.target)
  const matrix = new Matrix4().lookAt(eye, target, new Vector3(0, 1, 0))
  return new Quaternion().setFromRotationMatrix(matrix).invert()
}
