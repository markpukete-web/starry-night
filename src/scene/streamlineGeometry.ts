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

function maskAt(maskData: ImageData2D, u: number, v: number): number {
  const mx = Math.min(maskData.width - 1, Math.max(0, Math.floor(u * maskData.width)))
  const my = Math.min(maskData.height - 1, Math.max(0, Math.floor(v * maskData.height)))
  const rawMask = maskData.data[(my * maskData.width + mx) * 4]
  return effectiveMask(u, v, rawMask)
}

export function buildSourceStreamlineRibbons({
  flowData,
  maskData,
  paintingData,
  count,
  strokeWidth,
  points,
  stepSize,
  seed,
}: SourceRibbonBuildOptions): SourceRibbonGeometry {
  const rng = mulberry32(seed)
  const vertices: SourceRibbonVertex[] = []
  const indices: number[] = []
  let vbase = 0

  for (let i = 0; i < count; i++) {
    let u = rng()
    let v = rng()
    let validSeed = false

    for (let attempt = 0; attempt < 80; attempt++) {
      u = 0.005 + rng() * 0.99
      v = 0.005 + rng() * 0.99
      if (maskAt(maskData, u, v) > 16) {
        validSeed = true
        break
      }
    }
    if (!validSeed) continue

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
      const [dx, dy] = sampleSignedFlow(flowData, curU, curV)
      let cx = dx
      let cy = dy

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

    if (trail.length < 3) continue

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
      const [r, g, b] = sampleColour(paintingData, trail[k][0], trail[k][1])
      const color: [number, number, number] = [r, g, b]

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

  return { vertices, indices }
}
