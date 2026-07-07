import { Vector3 } from 'three'
import { DOME_R, FWD, RIGHT, SPAN_H, SPAN_V, TRUEUP } from './skyMapping'

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function dioramaSourceEdgeFade(u: number, v: number): number {
  const x = smooth(0.0, 0.22, u) * smooth(1.0, 0.78, u)
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
