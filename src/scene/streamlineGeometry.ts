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
 * A painting texel that belongs to the cut-out tree rather than the sky. The luminance-derived
 * sky-mask misses the cypress's fringes (they read as mid-luminance sky), so "mask says sky" is
 * not enough — chroma has to catch the leftovers. Two families, measured from the actual blobs:
 * the warm dark olive of the trunk fringes (both warm channels clearly above blue), and the
 * near-neutral dark grey-green of the wispy tip mass (rgb ~(17..97) greys where blue fails to
 * dominate). The sky's own darks are always blue-DOMINANT navy, star/moon gold is bright, and
 * the teal horizon band keeps b high — all three stay untouched.
 */
function treeishColour(r: number, g: number, b: number): boolean {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  if (b < Math.max(r, g) + 0.04 && lum < 0.43) return true
  return Math.min(r, g) > b + 0.03 && lum < 0.48
}

/**
 * Nearest true-sky UV to (u,v) — the colour/flow donor for trail points inside a mask hole.
 * Judged on the RAW mask: the star-halo boost in effectiveMask deliberately claims hole pixels
 * near star swirls for SEEDING density, but a donor must never be one of the cut-out tree pixels.
 * SOLID sky only (> 140): the feathered cut-out edge (16–140) blends the tree's browns into the
 * painting texels, and donors taken there smudge muddy strokes across the fill. The donor's own
 * colour must also pass the chroma test — mask-missed wisp pixels are no better than the hole.
 */
function skyDonorUV(maskData: ImageData2D, paintingData: ImageData2D, u: number, v: number): [number, number] {
  for (let r = 0.015; r <= 0.42; r += 0.015) {
    for (const [dx, dy] of DONOR_DIRS) {
      const su = u + dx * r
      const sv = v + dy * r
      if (su < 0 || su > 1 || sv < 0 || sv > 1) continue
      if (rawMaskAt(maskData, su, sv) > 140) {
        const [dr, dg, db] = sampleColour(paintingData, su, sv)
        if (!treeishColour(dr, dg, db)) return [su, sv]
      }
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

export type HoleFillGrid = { gw: number; gh: number; rgba: Uint8ClampedArray }

/**
 * Painted-sky colour continuation across the mask holes, for the wash backdrop's fill. Same
 * Jacobi relaxation as the flow grid: cells over SOLID true sky hold the painting's own colour
 * (averaged over the cell; the feathered cut-out edge is excluded — its texels carry the tree's
 * browns) and hole cells relax toward their neighbours' average. A flat constant fill reads as
 * a dark ghost column beside the 3D cypress; this reads as the surrounding sky closing over.
 *
 * The ALPHA channel carries the mask-missed wisp override: cells whose sky-claimed texels are
 * chroma-tree (the cypress fringes the luminance mask never caught) get a high alpha so the wash
 * colour-mixes toward the fill there too. Wisp-dominated cells also relax rather than anchoring
 * their tree-tinted average into the Jacobi boundary.
 *
 * The texture is emitted at 4× the relax grid with real stroke GRAIN mirrored in from the
 * nearest clean sky on the same row: the relaxed colour alone is smooth, and a smooth patch in
 * a stroke-grained sky reads as a tree-shaped blur ghost (Mark's 2026-07-14 live catch). Grain
 * (painting minus its local mean, i.e. the stroke texture) is zero-mean, so the relaxed colour
 * still sets the value — mirroring copies brushwork, never smears colour.
 */
export function buildHoleFillGrid(paintingData: ImageData2D, maskData: ImageData2D): HoleFillGrid {
  const gw = 112
  const gh = 80
  const r = new Float32Array(gw * gh)
  const g = new Float32Array(gw * gh)
  const b = new Float32Array(gw * gh)
  const alpha = new Float32Array(gw * gh)
  const hole = new Uint8Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x
      let n = 0
      let tree = 0
      let sr = 0
      let sg = 0
      let sb = 0
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const u = (x + (sx + 0.5) / 3) / gw
          const v = (y + (sy + 0.5) / 3) / gh
          if (rawMaskAt(maskData, u, v) <= 140) continue
          const [cr, cg, cb] = sampleColour(paintingData, u, v)
          if (treeishColour(cr, cg, cb)) {
            tree++
            continue // never average tree wisps into the fill colour
          }
          sr += cr
          sg += cg
          sb += cb
          n++
        }
      }
      if (n >= 3 && tree / (n + tree) < 0.4) {
        r[i] = sr / n
        g[i] = sg / n
        b[i] = sb / n
        alpha[i] = Math.min(1, (tree / (n + tree)) * 1.8)
      } else {
        hole[i] = 1
        alpha[i] = 1
      }
    }
  }
  // Initialise each hole cell from its NEAREST fixed cell before relaxing: plain Jacobi from a
  // black start needs O(width²) iterations to carry colour across a wide hole (the flow grid
  // only tolerates this because its vectors are re-normalised to unit length every sample —
  // colours have no such rescue). Nearest-donor is discontinuous, but the smoothing pass evens
  // it, and unlike a flow field this fill is never integrated — only looked at.
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x
      if (!hole[i]) continue
      donor: for (let ring = 1; ring < Math.max(gw, gh); ring++) {
        for (let dy = -ring; dy <= ring; dy++) {
          for (let dx = -ring; dx <= ring; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
            const sx = x + dx
            const sy = y + dy
            if (sx < 0 || sx >= gw || sy < 0 || sy >= gh) continue
            const j = sy * gw + sx
            if (hole[j]) continue
            r[i] = r[j]
            g[i] = g[j]
            b[i] = b[j]
            break donor
          }
        }
      }
    }
  }
  const nr = new Float32Array(gw * gh)
  const ng = new Float32Array(gw * gh)
  const nb = new Float32Array(gw * gh)
  for (let it = 0; it < 80; it++) {
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x
        if (!hole[i]) continue
        let sr = 0
        let sg = 0
        let sb = 0
        let n = 0
        if (x > 0) {
          sr += r[i - 1]
          sg += g[i - 1]
          sb += b[i - 1]
          n++
        }
        if (x < gw - 1) {
          sr += r[i + 1]
          sg += g[i + 1]
          sb += b[i + 1]
          n++
        }
        if (y > 0) {
          sr += r[i - gw]
          sg += g[i - gw]
          sb += b[i - gw]
          n++
        }
        if (y < gh - 1) {
          sr += r[i + gw]
          sg += g[i + gw]
          sb += b[i + gw]
          n++
        }
        if (n > 0) {
          nr[i] = sr / n
          ng[i] = sg / n
          nb[i] = sb / n
        }
      }
    }
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x
        if (hole[i]) {
          r[i] = nr[i]
          g[i] = ng[i]
          b[i] = nb[i]
        }
      }
    }
  }
  // --- emit at 4× with mirrored stroke grain ---
  const ow = gw * 4
  const oh = gh * 4
  const bilinear = (arr: Float32Array, u: number, v: number): number => {
    const fx = Math.min(gw - 1.001, Math.max(0, u * gw - 0.5))
    const fy = Math.min(gh - 1.001, Math.max(0, v * gh - 0.5))
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const i00 = y0 * gw + x0
    return (
      arr[i00] * (1 - tx) * (1 - ty) +
      arr[i00 + 1] * tx * (1 - ty) +
      arr[i00 + gw] * (1 - tx) * ty +
      arr[i00 + gw + 1] * tx * ty
    )
  }

  const rgba = new Uint8ClampedArray(ow * oh * 4)
  const clean = new Uint8Array(ow) // per-row: this column is solid sky with non-tree chroma
  const nearL = new Int32Array(ow)
  const nearR = new Int32Array(ow)
  for (let y = 0; y < oh; y++) {
    const v = (y + 0.5) / oh
    for (let x = 0; x < ow; x++) {
      const u = (x + 0.5) / ow
      if (rawMaskAt(maskData, u, v) > 140) {
        const [cr, cg, cb] = sampleColour(paintingData, u, v)
        clean[x] = treeishColour(cr, cg, cb) ? 0 : 1
      } else {
        clean[x] = 0
      }
    }
    for (let x = 0, last = -1; x < ow; x++) {
      if (clean[x]) last = x
      nearL[x] = last
    }
    for (let x = ow - 1, last = -1; x >= 0; x--) {
      if (clean[x]) last = x
      nearR[x] = last
    }
    for (let x = 0; x < ow; x++) {
      const u = (x + 0.5) / ow
      const o = (y * ow + x) * 4
      let cr = bilinear(r, u, v)
      let cg = bilinear(g, u, v)
      let cb = bilinear(b, u, v)
      const ca = bilinear(alpha, u, v)
      // grain only where the fill can actually show: holes, the feathered edge, wisp overrides
      if ((rawMaskAt(maskData, u, v) <= 200 || ca > 0.1) && !clean[x]) {
        // reflect across the nearer clean boundary on this row — copies real neighbouring
        // brushwork; degrade to the boundary texel itself when the reflection lands dirty
        const dl = nearL[x] >= 0 ? x - nearL[x] : Number.MAX_SAFE_INTEGER
        const dr = nearR[x] >= 0 ? nearR[x] - x : Number.MAX_SAFE_INTEGER
        if (dl !== Number.MAX_SAFE_INTEGER || dr !== Number.MAX_SAFE_INTEGER) {
          const bx = dl <= dr ? nearL[x] : nearR[x]
          let dx = bx + (bx - x)
          if (dx < 0 || dx >= ow || !clean[dx]) dx = bx
          const du = (dx + 0.5) / ow
          const [pr, pg, pb] = sampleColour(paintingData, du, v)
          const clampG = (d: number) => Math.max(-0.18, Math.min(0.18, d)) // star-halo golds stay tame
          cr += clampG(pr - bilinear(r, du, v)) * 0.9
          cg += clampG(pg - bilinear(g, du, v)) * 0.9
          cb += clampG(pb - bilinear(b, du, v)) * 0.9
        }
      }
      rgba[o] = cr * 255
      rgba[o + 1] = cg * 255
      rgba[o + 2] = cb * 255
      rgba[o + 3] = ca * 255
    }
  }
  return { gw: ow, gh: oh, rgba }
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

  // bold=1 marks the extra hole-fill ribbons: the inpainted flow they ride is laminar (smoothed
  // by construction) and their donor colours collapse the painting's texel variety, so at the
  // base character they knit in value but read as a column of fine parallel strokes — a
  // statistical seam beside Van Gogh's chunky, curved, varied neighbours. Bold ribbons are
  // wider, longer, carry a per-ribbon curvature wobble, and get a per-ribbon value kick.
  const addRibbon = (u: number, v: number, bold = 0): void => {
    const phase = rng() * Math.PI * 2
    const rate = 0.65 + rng() * 0.7
    const halfW = strokeWidth * (0.6 + 0.8 * rng()) * (1 + bold * 0.7)
    const bend = bold > 0 ? (rng() - 0.5) * bold * 0.17 : 0 // rad per step, cumulative curve
    const kick = bold > 0 ? 0.82 + rng() * 0.42 : 1
    const steps = bold > 0 ? Math.round(points * 1.35) : points
    const trail: [number, number][] = []
    let hx = 0
    let hy = 0
    let curU = u
    let curV = v

    for (let k = 0; k < steps; k++) {
      trail.push([curU, curV])
      // inside a mask hole the flow field is the cut-out tree's own vertical stroke orientation —
      // integrate the inpainted continuation there so the sky's churn crosses the fill smoothly
      const inHole = holeFlow !== null && rawMaskAt(maskData, curU, curV) <= 16
      const [dx, dy] = inHole ? sampleHoleFlow(holeFlow, curU, curV) : sampleSignedFlow(flowData, curU, curV)
      let cx = dx
      let cy = dy
      if (bend !== 0) {
        const cosB = Math.cos(bend * k)
        const sinB = Math.sin(bend * k)
        const rx = cx * cosB - cy * sinB
        cy = cx * sinB + cy * cosB
        cx = rx
      }

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
      let cu = trail[k][0]
      let cv = trail[k][1]
      let [r, g, b] = sampleColour(paintingData, cu, cv)
      // the donor rescue applies wherever the texel would wear the cut-out tree: solid holes,
      // the feathered edge (<= 140, which blends browns into the painting texels), AND the wispy
      // fringes the mask claims as sky but whose chroma is still the tree's
      if (openSkyBandV !== undefined && (rawMaskAt(maskData, cu, cv) <= 140 || treeishColour(r, g, b))) {
        ;[cu, cv] = skyDonorUV(maskData, paintingData, cu, cv)
        ;[r, g, b] = sampleColour(paintingData, cu, cv)
      }
      const color: [number, number, number] = [Math.min(1, r * kick), Math.min(1, g * kick), Math.min(1, b * kick)]

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

  // Targeted churn across the cut-out: everywhere else the ribbons ride the painting's own
  // stroke texture, but over the hole they are the ONLY brushwork on a smooth fill — at the
  // uniform seeding density the fill's blur shows through as a ghost. Boost the density
  // inside the holes with BOLD ribbons (appended after the main loop so the base geometry
  // stays byte-identical for a given seed).
  if (openSkyBandV !== undefined) {
    const extra = Math.round(count * 0.15)
    for (let i = 0; i < extra; i++) {
      let u = 0
      let v = 0
      let found = false
      for (let attempt = 0; attempt < 120; attempt++) {
        u = rng()
        v = rng() * openSkyBandV
        if (rawMaskAt(maskData, u, v) <= 140 && Math.hypot(u - MOON_UV[0], v - MOON_UV[1]) >= MOON_R) {
          found = true
          break
        }
      }
      if (found) addRibbon(u, v, 1)
    }
  }

  return { vertices, indices }
}
