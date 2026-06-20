import { Vector3 } from 'three'
import type { ImageData2D } from './useImageData.ts'
import { sampleFlow } from './brush.ts'
import { FWD, RIGHT, TRUEUP, frontUV, smoothstep, type Vortex } from './skyMapping.ts'

export type FlowField = (p: Vector3, out: Vector3) => Vector3

const _cross = new Vector3()
const _tin = new Vector3()
const _eU = new Vector3()
const _eV = new Vector3()

/** Native vortex circulation + spiral inflow at p (macro composition + back coverage). Raw, tangent-projected. */
export function vortexTangent(vortices: Vortex[], swirlTightness: number, p: Vector3, out: Vector3): Vector3 {
  out.set(0, 0, 0)
  for (let i = 0; i < vortices.length; i++) {
    const v = vortices[i]
    const cosA = Math.min(1, Math.max(-1, p.dot(v.dir)))
    const ang = Math.acos(cosA)
    const w = v.strength * Math.exp(-(ang * ang) / (v.radius * v.radius))
    if (w < 0.001) continue
    _cross.crossVectors(p, v.dir).multiplyScalar(v.sign * w)
    out.add(_cross)
    _tin.copy(v.dir).addScaledVector(p, -p.dot(v.dir))
    out.addScaledVector(_tin, swirlTightness * w)
  }
  out.addScaledVector(p, -out.dot(p))
  return out
}

/** Derived painting orientation as a sphere tangent at p (front arc only). Returns coherence×edge-fade (0 = unusable). */
export function paintingTangent(flow: ImageData2D, p: Vector3, out: Vector3): number {
  const { u, v, h, w, onArc } = frontUV(p)
  if (!onArc) return 0
  const fade = smoothstep(0, 0.12, u) * smoothstep(1, 0.88, u) * smoothstep(0, 0.14, v) * smoothstep(1, 0.85, v)
  if (fade < 0.01) return 0
  const { theta, coh } = sampleFlow(flow, u, v)
  if (coh < 0.02) return 0
  const sh = Math.sin(h)
  const ch = Math.cos(h)
  _eU.copy(RIGHT).multiplyScalar(ch).addScaledVector(FWD, -sh)
  _eV.copy(FWD).multiplyScalar(ch).addScaledVector(RIGHT, sh).multiplyScalar(Math.sin(w)).addScaledVector(TRUEUP, -Math.cos(w))
  out.copy(_eU).multiplyScalar(Math.cos(theta)).addScaledVector(_eV, Math.sin(theta))
  out.addScaledVector(p, -out.dot(p))
  if (out.lengthSq() < 1e-8) return 0
  out.normalize()
  return coh * fade
}

/** One sampler: vortex field everywhere, blended with the painting orientation on the front arc,
 *  faded to zero at the big swirl eyes (cores) so the tuned hero swirls stand — as the original did. */
export function makeFlowField({
  flow,
  vortices,
  swirlTightness,
  flowBias,
}: {
  flow: ImageData2D
  vortices: Vortex[]
  swirlTightness: number
  flowBias: number
}): FlowField {
  const cores = vortices.filter((v) => v.core)
  const paint = new Vector3()
  const upFallback = new Vector3()

  const nearEye = (p: Vector3): number => {
    let m = 0
    for (let i = 0; i < cores.length; i++) {
      const cv = cores[i]
      const ang = Math.acos(Math.min(1, Math.max(-1, p.dot(cv.dir))))
      const e = Math.exp(-(ang * ang) / (cv.radius * cv.radius))
      if (e > m) m = e
    }
    return m
  }

  return (p: Vector3, out: Vector3): Vector3 => {
    vortexTangent(vortices, swirlTightness, p, out)
    if (out.lengthSq() < 1e-8) {
      // degenerate (no vortex influence): pick any stable tangent at p
      out.copy(p.x === 0 && p.z === 0 ? RIGHT : upFallback.set(0, 1, 0).addScaledVector(p, -p.y)).normalize()
    } else {
      out.normalize()
    }
    if (flowBias > 0) {
      const wgt = paintingTangent(flow, p, paint)
      if (wgt > 0) {
        const b = Math.min(0.85, flowBias * wgt * (1 - nearEye(p)))
        if (b > 0) {
          if (paint.dot(out) < 0) paint.multiplyScalar(-1) // undirected → align to the vortex heading
          out.multiplyScalar(1 - b).addScaledVector(paint, b)
          out.addScaledVector(p, -out.dot(p))
          if (out.lengthSq() > 1e-8) out.normalize()
        }
      }
    }
    return out
  }
}
