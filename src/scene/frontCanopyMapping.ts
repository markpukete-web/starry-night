import { Vector3 } from 'three'
import { DOME_R, frontUV, smoothstep, uvToFrontDir } from './skyMapping.ts'

export const CANOPY_RADIUS = DOME_R

export function uvToCanopyPosition(u: number, v: number, out = new Vector3()): Vector3 {
  return out.copy(uvToFrontDir(u, v)).multiplyScalar(CANOPY_RADIUS)
}

export function canopyEdgeFade(u: number, v: number): number {
  const x = smoothstep(0.0, 0.16, u) * smoothstep(1.0, 0.84, u)
  const y = smoothstep(0.0, 0.08, v) * smoothstep(1.0, 0.86, v)
  return x * y
}

export function canopyRoundTrip(u: number, v: number) {
  const dir = uvToCanopyPosition(u, v).normalize()
  return frontUV(dir)
}
