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
   * there — real 3D forms own those reads — so above this image-space v the holes are open sky.
   * Ribbons then also SEED inside the holes (never over the moon) and any trail point in a hole
   * takes its colour from the nearest true-sky pixel, so no ribbon ever wears the cut-out tree's
   * browns. Leave unset for the 2D routes, where the painting's own cypress still sits on top.
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

// ring search, nearest first — the fixed direction order keeps the builder deterministic
const DONOR_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7071, 0.7071],
  [-0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, -0.7071],
]

/**
 * Nearest true-sky UV to (u,v) — the colour/flow donor for trail points inside a mask hole.
 * Judged on the RAW mask: the star-halo boost in effectiveMask deliberately claims hole pixels
 * near star swirls for SEEDING density, but a donor must never be one of the cut-out tree pixels.
 */
function skyDonorUV(maskData: ImageData2D, u: number, v: number): [number, number] {
  for (let r = 0.015; r <= 0.24; r += 0.015) {
    for (const [dx, dy] of DONOR_DIRS) {
      const su = u + dx * r
      const sv = v + dy * r
      if (su < 0 || su > 1 || sv < 0 || sv > 1) continue
      if (rawMaskAt(maskData, su, sv) > 16) return [su, sv]
    }
  }
  return [u, v]
}

type HoleFlowGrid = { gw: number; gh: number; fx: Float32Array; fy: Float32Array; hole: Uint8Array }

/**
 * Smooth flow continuation across the mask holes: a coarse grid where true-sky cells hold the
 * sampled signed flow and hole cells relax (Jacobi) toward their neighbours' average. Integrating
 * against a nearest-donor flow instead produces jagged zigzags — the donor side flips as a trail
 * crosses the hole — so the continuation must be smooth by construction.
 */
function buildHoleFlowGrid(flowData: ImageData2D, maskData: ImageData2D, bandV: number): HoleFlowGrid {
  const gw = 112
  const gh = 80
  const fx = new Float32Array(gw * gh)
  const fy = new Float32Array(gw * gh)
  const hole = new Uint8Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const u = (x + 0.5) / gw
      const v = (y + 0.5) / gh
      const i = y * gw + x
      if (rawMaskAt(maskData, u, v) <= 16 && v < bandV + 0.06) {
        hole[i] = 1
      } else {
        const [dx, dy] = sampleSignedFlow(flowData, u, v)
        fx[i] = dx
        fy[i] = dy
      }
    }
  }
  const nfx = new Float32Array(gw * gh)
  const nfy = new Float32Array(gw * gh)
  for (let it = 0; it < 60; it++) {
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x
        if (!hole[i]) continue
        let sx = 0
        let sy = 0
        if (x > 0) {
          sx += fx[i - 1]
          sy += fy[i - 1]
        }
        if (x < gw - 1) {
          sx += fx[i + 1]
          sy += fy[i + 1]
        }
        if (y > 0) {
          sx += fx[i - gw]
          sy += fy[i - gw]
        }
        if (y < gh - 1) {
          sx += fx[i + gw]
          sy += fy[i + gw]
        }
        const m = Math.hypot(sx, sy)
        if (m > 1e-6) {
          nfx[i] = sx / m
          nfy[i] = sy / m
        }
      }
    }
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x
        if (hole[i]) {
          fx[i] = nfx[i]
          fy[i] = nfy[i]
        }
      }
    }
  }
  return { gw, gh, fx, fy, hole }
}

function sampleHoleFlow(grid: HoleFlowGrid, u: number, v: number): [number, number] {
  const x = Math.min(grid.gw - 1, Math.max(0, Math.floor(u * grid.gw)))
  const y = Math.min(grid.gh - 1, Math.max(0, Math.floor(v * grid.gh)))
  const i = y * grid.gw + x
  const m = Math.hypot(grid.fx[i], grid.fy[i]) || 1e-9
  return [grid.fx[i] / m, grid.fy[i] / m]
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
  const holeFlow = openSkyBandV !== undefined ? buildHoleFlowGrid(flowData, maskData, openSkyBandV) : null

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
      // inside a mask hole the flow field is the cut-out tree's own vertical stroke orientation —
      // integrate the inpainted continuation there so the sky's churn crosses the fill smoothly
      const inHole = holeFlow !== null && rawMaskAt(maskData, curU, curV) <= 16
      const [dx, dy] = inHole ? sampleHoleFlow(holeFlow, curU, curV) : sampleSignedFlow(flowData, curU, curV)
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
      let cu = trail[k][0]
      let cv = trail[k][1]
      if (openSkyBandV !== undefined && rawMaskAt(maskData, cu, cv) <= 16) {
        ;[cu, cv] = skyDonorUV(maskData, cu, cv)
      }
      const [r, g, b] = sampleColour(paintingData, cu, cv)
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
