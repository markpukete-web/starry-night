import { Vector3 } from 'three'
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
