import type { ImageData2D } from './useImageData'
import { mulberry32, sampleColour } from './brush.ts'
import { HALO_SWIRLS, MOON_R, MOON_UV, SWIRLS } from './skySwirls.ts'

export type SourceRibbonVertex = {
  u: number
  v: number
  len: number
  across: number
  phase: number
  rate: number
  color: [number, number, number]
}

export type SourceRibbonBuildOptions = {
  flowData: ImageData2D
  maskData: ImageData2D
  paintingData: ImageData2D
  count: number
  strokeWidth: number
  points: number
  stepSize: number
  seed: number
  /**
   * 3D-diorama mode: the sky-mask's cut-outs (the 2D cypress column and foreground) are obsolete
   * there — real 3D forms own those reads — so above this image-space v the holes are open sky
   * and ribbons also SEED inside them (never over the moon). In this mode paintingData/flowData
   * MUST be the offline-filled assets (painting-filled.png / signed-flow-filled.png,
   * docs/decisions/0003-inpaint-extend.md) so hole texels carry real sky paint and flow. Leave
   * unset for the 2D routes, where the painting's own cypress still sits on top.
   */
  openSkyBandV?: number
}

export type SourceRibbonGeometry = {
  vertices: SourceRibbonVertex[]
  indices: number[]
}

function sampleSignedFlow(flow: ImageData2D, u: number, v: number): [number, number] {
  const x = Math.min(flow.width - 1, Math.max(0, Math.floor(u * flow.width)))
  const y = Math.min(flow.height - 1, Math.max(0, Math.floor(v * flow.height)))
  const i = (y * flow.width + x) * 4
  const dx = (flow.data[i] / 255) * 2 - 1
  const dy = (flow.data[i + 1] / 255) * 2 - 1
  const m = Math.hypot(dx, dy) || 1e-9
  return [dx / m, dy / m]
}

function effectiveMask(u: number, v: number, rawMask: number): number {
  const distToMoon = Math.hypot(u - MOON_UV[0], v - MOON_UV[1])
  if (distToMoon < MOON_R) return 0

  let bestMask = rawMask
  for (const [su, sv, , sr] of HALO_SWIRLS) {
    const dist = Math.hypot(u - su, v - sv)
    const isMoonSwirl = Math.abs(su - MOON_UV[0]) < 1e-4 && Math.abs(sv - MOON_UV[1]) < 1e-4
    if (isMoonSwirl) {
      if (dist >= MOON_R && dist < sr * 1.5) {
        let val = 255
        if (dist < MOON_R + 0.02) {
          val = Math.floor(((dist - MOON_R) / 0.02) * 255)
        } else if (dist > sr) {
          const t = (sr * 1.5 - dist) / (sr * 0.5)
          val = Math.floor(rawMask + (255 - rawMask) * Math.max(0, Math.min(1, t)))
        }
        bestMask = Math.max(bestMask, val)
      }
    } else if (dist < sr * 1.5) {
      let val = 255
      if (dist > sr) {
        const t = (sr * 1.5 - dist) / (sr * 0.5)
        val = Math.floor(rawMask + (255 - rawMask) * Math.max(0, Math.min(1, t)))
      }
      bestMask = Math.max(bestMask, val)
    }
  }
  return bestMask
}

function rawMaskAt(maskData: ImageData2D, u: number, v: number): number {
  const mx = Math.min(maskData.width - 1, Math.max(0, Math.floor(u * maskData.width)))
  const my = Math.min(maskData.height - 1, Math.max(0, Math.floor(v * maskData.height)))
  return maskData.data[(my * maskData.width + mx) * 4]
}

function maskAt(maskData: ImageData2D, u: number, v: number): number {
  return effectiveMask(u, v, rawMaskAt(maskData, u, v))
}

// The runtime donor/fill heuristics that used to live here (treeishColour, skyDonorUV, the
// Jacobi hole-flow and hole-fill grids, bold hole ribbons) are DELETED: the cypress cut-out is
// now filled OFFLINE with real painting patches (scripts/extend-reference.ts,
// docs/decisions/0003-inpaint-extend.md), and the 3D route simply samples the baked
// painting-filled.png / signed-flow-filled.png.


export function buildSourceStreamlineRibbons({
  flowData,
  maskData,
  paintingData,
  count,
  strokeWidth,
  points,
  stepSize,
  seed,
  openSkyBandV,
}: SourceRibbonBuildOptions): SourceRibbonGeometry {
  const rng = mulberry32(seed)
  const vertices: SourceRibbonVertex[] = []
  const indices: number[] = []
  let vbase = 0

  const seedOk = (u: number, v: number): boolean => {
    if (maskAt(maskData, u, v) > 16) return true
    if (openSkyBandV === undefined || v >= openSkyBandV) return false
    return Math.hypot(u - MOON_UV[0], v - MOON_UV[1]) >= MOON_R // hole is open sky; moon stays clear
  }
  const addRibbon = (u: number, v: number): void => {
    const phase = rng() * Math.PI * 2
    const rate = 0.65 + rng() * 0.7
    const halfW = strokeWidth * (0.6 + 0.8 * rng())
    const trail: [number, number][] = []
    let hx = 0
    let hy = 0
    let curU = u
    let curV = v

    for (let k = 0; k < points; k++) {
      trail.push([curU, curV])
      // in 3D mode the flow data is the offline-filled field, so integrating straight through a
      // mask hole rides the baked continuation — no runtime special-casing
      let [cx, cy] = sampleSignedFlow(flowData, curU, curV)

      let nearSwirl = false
      for (const [su, sv, , sr] of SWIRLS) {
        if (Math.hypot(curU - su, curV - sv) < sr * 1.5) {
          nearSwirl = true
          break
        }
      }

      if (k === 0) {
        hx = cx
        hy = cy
      } else {
        if (!nearSwirl && cx * hx + cy * hy < 0) {
          cx = -cx
          cy = -cy
        }
        hx = cx
        hy = cy
      }

      curU += cx * stepSize
      curV += cy * stepSize
      if (curU < 0 || curU > 1 || curV < 0 || curV > 1) break
    }

    if (trail.length < 3) return

    const m = trail.length
    for (let k = 0; k < m; k++) {
      const lenN = k / (m - 1)
      const w = halfW * (1.0 - 0.45 * lenN)
      let tx: number
      let ty: number
      if (k === 0) {
        tx = trail[1][0] - trail[0][0]
        ty = trail[1][1] - trail[0][1]
      } else if (k === m - 1) {
        tx = trail[m - 1][0] - trail[m - 2][0]
        ty = trail[m - 1][1] - trail[m - 2][1]
      } else {
        tx = trail[k + 1][0] - trail[k - 1][0]
        ty = trail[k + 1][1] - trail[k - 1][1]
      }
      const tmag = Math.hypot(tx, ty) || 1e-9
      const nx = -ty / tmag
      const ny = tx / tmag
      // straight sample — in 3D mode paintingData is the offline-filled painting, so hole
      // texels are already real sky paint
      const color = sampleColour(paintingData, trail[k][0], trail[k][1])

      vertices.push(
        { u: trail[k][0] + nx * w, v: trail[k][1] + ny * w, len: lenN, across: 0, phase, rate, color },
        { u: trail[k][0] - nx * w, v: trail[k][1] - ny * w, len: lenN, across: 1, phase, rate, color },
      )

      if (k < m - 1) {
        const v0 = vbase + k * 2
        indices.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
      }
    }
    vbase += m * 2
  }

  for (let i = 0; i < count; i++) {
    let u = rng()
    let v = rng()
    let validSeed = false

    for (let attempt = 0; attempt < 80; attempt++) {
      u = 0.005 + rng() * 0.99
      v = 0.005 + rng() * 0.99
      if (seedOk(u, v)) {
        validSeed = true
        break
      }
    }
    if (!validSeed) continue
    addRibbon(u, v)
  }

  return { vertices, indices }
}
