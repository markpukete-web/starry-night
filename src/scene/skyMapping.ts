import { Vector3 } from 'three'
import { mulberry32 } from './brush.ts'

export const DOME_R = 6
export const POINTS = 13
export const STEP = 0.05 // radians per integration step on the sphere
export const HORIZON = -0.22 // strokes live above roughly the horizon

export type Vortex = { dir: Vector3; strength: number; sign: number; radius: number; star: boolean; moon: boolean; scale: number; core: boolean }

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

// The painting's high-density points — the swirl eyes, Venus, and the star halos — where Van Gogh's
// impasto piles thickest. Front dabs densify around these so brush-mark density matches the painting
// (flow bias steers a dab's direction; this steers where dabs LAND).
export const ANCHOR_UVS: [number, number][] = [[0.43, 0.4], [0.58, 0.35], VENUS_UV, ...STAR_UVS]

const CAM_POS = new Vector3(2.2, 1.5, 4.6)
const CAM_TARGET = new Vector3(0, 1.05, 0)
export const FRONT_AZ = Math.atan2(CAM_TARGET.x - CAM_POS.x, CAM_TARGET.z - CAM_POS.z)
const FRONT_EL = 0.2
export const FWD = dirAzEl(FRONT_AZ, FRONT_EL)
export const RIGHT = new Vector3().crossVectors(FWD, new Vector3(0, 1, 0)).normalize()
export const TRUEUP = new Vector3().crossVectors(RIGHT, FWD).normalize()
export const BACK_AZ = FRONT_AZ - Math.PI
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

export function buildVortices(): Vortex[] {
  const rng = mulberry32(0x5747a1)
  const V: Vortex[] = []
  const add = (dir: Vector3, strength: number, sign: number, radius: number, star = false, moon = false, scale = 0.15, core = false) =>
    V.push({ dir, strength, sign, radius, star, moon, scale, core })

  add(uvToFrontDir(0.43, 0.4), 2.05, 1, 0.54, false, false, 0.15, true)
  add(uvToFrontDir(0.58, 0.35), 1.4, -1, 0.4, false, false, 0.15, true)
  add(uvToFrontDir(VENUS_UV[0], VENUS_UV[1]), 1.0, -1, 0.32, true, false, 0.24)
  STAR_UVS.forEach((uv, i) =>
    add(uvToFrontDir(uv[0], uv[1]), 0.6 + 0.2 * rng(), i % 2 === 0 ? 1 : -1, 0.18 + 0.07 * rng(), true, false, 0.13 + 0.04 * rng()),
  )
  add(uvToFrontDir(MOON_UV[0], MOON_UV[1]), 1.1, 1, 0.4, false, true)

  add(dirAzEl(BACK_AZ + 0.5, 0.34), 2.0, -1, 0.55, false, false, 0.15, true)
  add(dirAzEl(BACK_AZ + 0.78, 0.3), 1.5, 1, 0.42)
  add(dirAzEl(BACK_AZ - 0.7, 0.22), 1.7, 1, 0.46, false, false, 0.15, true)
  add(dirAzEl(BACK_AZ - 0.98, 0.18), 1.3, -1, 0.4)
  for (let i = 0; i < 10; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 3.6, -0.05 + rng() * 1.3), 0.6 + 0.3 * rng(), rng() < 0.5 ? -1 : 1, 0.18 + 0.08 * rng(), true, false, 0.12 + 0.04 * rng())
  }
  for (let i = 0; i < 16; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 4.0, -0.1 + rng() * 1.5), 0.5 + 0.4 * rng(), rng() < 0.5 ? -1 : 1, 0.28 + 0.16 * rng())
  }
  return V
}
