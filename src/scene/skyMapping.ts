import { Vector3 } from 'three'

export const DOME_R = 6

export function dirAzEl(az: number, el: number): Vector3 {
  const ce = Math.cos(el)
  return new Vector3(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))
}

export const VENUS_UV: [number, number] = [0.27, 0.33]
export const MOON_UV: [number, number] = [0.8, 0.2]
export const STAR_UVS: [number, number][] = [
  [0.13, 0.13], [0.2, 0.065], [0.31, 0.13], [0.4, 0.1], [0.1, 0.42],
  [0.52, 0.2], [0.59, 0.095], [0.66, 0.27], [0.72, 0.175],
]

// MUST stay equal to App's HOME_POSITION/HOME_TARGET — the swirl basis (FRONT_AZ) is derived from this
// camera bearing so the painting's composition (whorl, moon, Venus, stars) centres on where the camera
// looks. Moved nearly head-on (small azimuth) to match the flat painting's composition (Mark, 2026-06-21).
const CAM_POS = new Vector3(0.6, 1.05, 5.05)
const CAM_TARGET = new Vector3(0, 1.05, 0)
export const FRONT_AZ = Math.atan2(CAM_TARGET.x - CAM_POS.x, CAM_TARGET.z - CAM_POS.z)
const FRONT_EL = 0.2
export const FWD = dirAzEl(FRONT_AZ, FRONT_EL)
export const RIGHT = new Vector3().crossVectors(FWD, new Vector3(0, 1, 0)).normalize()
export const TRUEUP = new Vector3().crossVectors(RIGHT, FWD).normalize()
export const SPAN_H = 2.15
export const SPAN_V = SPAN_H / 1.26

export function uvToFrontDir(u: number, v: number): Vector3 {
  const h = (u - 0.5) * SPAN_H
  const w = (0.5 - v) * SPAN_V
  const cw = Math.cos(w)
  return new Vector3()
    .addScaledVector(FWD, cw * Math.cos(h))
    .addScaledVector(RIGHT, cw * Math.sin(h))
    .addScaledVector(TRUEUP, Math.sin(w))
    .normalize()
}

export function frontUV(p: Vector3): { u: number; v: number; h: number; w: number; onArc: boolean } {
  const w = Math.asin(Math.min(1, Math.max(-1, p.dot(TRUEUP))))
  const fwd = p.dot(FWD)
  const h = Math.atan2(p.dot(RIGHT), fwd)
  const u = 0.5 + h / SPAN_H
  const v = 0.5 - w / SPAN_V
  return { u, v, h, w, onArc: fwd > 0 && u >= 0 && u <= 1 && v >= 0 && v <= 1 }
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
