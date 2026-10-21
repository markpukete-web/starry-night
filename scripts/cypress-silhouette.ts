/*
 * The rendered cypress's silhouette against the painting's (E1, G5). Thresholds the capture's tree (treeish colour,
 * a 1 px opening to cut hairline bridges to dark sky strokes, the 4-connected component from the trunk's column),
 * scales it to the painting's crop height, aligns the two masks on the trunk's base centre, and reports the trunk
 * run's width per height, the tip's width, and the IoU. Writes the table and a side-by-side mask image.
 *
 *   node scripts/cypress-silhouette.ts <capture.png> [cropX cropY cropW cropH] [outPrefix]
 *
 * The default crop is the design camera's tree at 1600 × 900 with the crop cut at the tree's base (the island's
 * rock and the bushes pass the treeish rule too). The painting's mask is the treeish component of painting.jpg
 * around the row table's crop, with the same opening, so both sides are measured by one rule.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { treeishColour } from './lib/fill-region.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const capturePath = resolve(ROOT, args[0] ?? 'output/playwright/e1-measure-2026-10-21/desktop-centre.png')
const [CX, CY, CW, CH] = args.length >= 5 ? args.slice(1, 5).map(Number) : [330, 80, 220, 578]
const outPrefix = resolve(ROOT, args[5] ?? 'reference/derived/cypress-silhouette')
mkdirSync(resolve(outPrefix, '..'), { recursive: true })

type Mask = { data: Uint8Array; width: number; height: number }

function morph(src: Mask, r: number, dilate: boolean): Mask {
  const { width: w, height: h } = src
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1
      outer: for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          const yy = y + dy
          const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src.data[yy * w + xx]
          if (dilate && s) { v = 1; break outer }
          if (!dilate && !s) { v = 0; break outer }
        }
      }
      out[y * w + x] = v
    }
  }
  return { data: out, width: w, height: h }
}

/** Treeish pixels of a crop, opened by `open` px, then the component holding the column with the most tree. */
function treeComponent(rgba: Uint8Array, imageWidth: number, x0: number, y0: number, w: number, h: number, open: number): Mask {
  const tree = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y + y0) * imageWidth + x + x0) * 4
      tree[y * w + x] = treeishColour(rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255) ? 1 : 0
    }
  }
  const opened = open > 0 ? morph(morph({ data: tree, width: w, height: h }, open, false), open, true) : { data: tree, width: w, height: h }
  let bestX = 0
  let bestCount = 0
  for (let x = 0; x < w; x++) {
    let count = 0
    for (let y = 0; y < h; y++) count += opened.data[y * w + x]
    if (count > bestCount) { bestCount = count; bestX = x }
  }
  const comp = new Uint8Array(w * h)
  const stack: number[] = []
  for (let y = 0; y < h; y++) if (opened.data[y * w + bestX]) stack.push(y * w + bestX)
  while (stack.length) {
    const i = stack.pop()!
    if (comp[i] || !opened.data[i]) continue
    comp[i] = 1
    const x = i % w
    const y = (i - x) / w
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - w)
    if (y < h - 1) stack.push(i + w)
  }
  return { data: comp, width: w, height: h }
}

/** The runs on a row, and the trunk run: the one nearest `nearX` (the previous row's trunk centre). */
function runsOf(mask: Mask, y: number): [number, number][] {
  const runs: [number, number][] = []
  let start = -1
  for (let x = 0; x <= mask.width; x++) {
    const on = x < mask.width && mask.data[y * mask.width + x] === 1
    if (on && start < 0) start = x
    if (!on && start >= 0) { runs.push([start, x - 1]); start = -1 }
  }
  return runs
}
function trunkRun(runs: [number, number][], nearX: number): [number, number] | null {
  let best: [number, number] | null = null
  let bestDistance = Infinity
  for (const run of runs) {
    const centre = (run[0] + run[1]) / 2
    const distance = nearX < run[0] ? run[0] - nearX : nearX > run[1] ? nearX - run[1] : 0
    if (distance < bestDistance || (distance === bestDistance && best && run[1] - run[0] > best[1] - best[0])) { bestDistance = distance; best = run }
    void centre
  }
  return best
}

/** The vertical extent of a mask, and its trunk's base centre (the mean trunk-run centre over the lowest 10%). */
function extent(mask: Mask) {
  let top = mask.height
  let bottom = -1
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) if (mask.data[y * mask.width + x]) { if (y < top) top = y; if (y > bottom) bottom = y }
  const height = bottom - top + 1
  let sum = 0
  let count = 0
  let nearX = mask.width / 2
  for (let y = bottom; y > bottom - height * 0.1; y--) {
    const run = trunkRun(runsOf(mask, y), nearX)
    if (!run) continue
    nearX = (run[0] + run[1]) / 2
    sum += nearX
    count++
  }
  return { top, bottom, height, baseCentre: count ? sum / count : nearX }
}

// the painting's mask around the row table's crop
const rows = JSON.parse(readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8')) as { uv?: number[]; x0?: number; y0?: number; width: number; height: number }
const work = resolve(ROOT, 'reference/derived/cypress-silhouette-painting.png')
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', work], { stdio: 'ignore' })
const painting = decodePNG(readFileSync(work))
const px0 = rows.uv ? Math.round(rows.uv[0] * painting.width) : rows.x0!
const py0 = rows.uv ? Math.round(rows.uv[1] * painting.height) : rows.y0!
const pw = rows.uv ? Math.round((rows.uv[2] - rows.uv[0]) * painting.width) : rows.width
const ph = rows.uv ? Math.round((rows.uv[3] - rows.uv[1]) * painting.height) : rows.height
const PX0 = Math.max(0, px0 - 40)
const PW = Math.min(painting.width - PX0, pw + 80)
const paintMask = treeComponent(painting.rgba, painting.width, PX0, py0, PW, ph, 1)
const paintExtent = extent(paintMask)

// the render's mask
const capture = decodePNG(readFileSync(capturePath))
const renderMask = treeComponent(capture.rgba, capture.width, CX, CY, CW, CH, 1)
const renderExtent = extent(renderMask)
const scale = paintExtent.height / renderExtent.height
console.log(`painting tree ${paintExtent.height} px tall (crop ${PW}x${ph} at ${PX0},${py0}); render tree ${renderExtent.height} px tall (crop ${CW}x${CH} at ${CX},${CY}), scale ${scale.toFixed(3)}`)

// the render's mask resampled to the painting's frame: scaled by `scale`, the base centres aligned, the tops aligned
const aligned: Mask = { data: new Uint8Array(PW * ph), width: PW, height: ph }
for (let y = 0; y < ph; y++) {
  for (let x = 0; x < PW; x++) {
    const ry = Math.round(renderExtent.top + (y - paintExtent.top) / scale)
    const rx = Math.round(renderExtent.baseCentre + (x - paintExtent.baseCentre) / scale)
    if (ry < 0 || ry >= CH || rx < 0 || rx >= CW) continue
    aligned.data[y * PW + x] = renderMask.data[ry * CW + rx]
  }
}
let inter = 0
let union = 0
for (let i = 0; i < aligned.data.length; i++) {
  const a = paintMask.data[i]
  const b = aligned.data[i]
  inter += a & b
  union += a | b
}
const iou = union ? inter / union : 0

// the width table: the trunk run per height on each side
const lines: string[] = ['h      painting trunk (px, extent)   | render trunk (px, aligned extent)   diff']
let worst = 0
let tipRatio = 0
let paintNear = paintExtent.baseCentre
let renderNear = paintExtent.baseCentre
for (let k = 1; k < 20; k++) {
  const h = k / 20
  const y = Math.round(paintExtent.bottom - h * (paintExtent.height - 1))
  const p = trunkRun(runsOf(paintMask, y), paintNear)
  const r = trunkRun(runsOf(aligned, y), renderNear)
  if (p) paintNear = (p[0] + p[1]) / 2
  if (r) renderNear = (r[0] + r[1]) / 2
  const pwid = p ? p[1] - p[0] + 1 : NaN
  const rwid = r ? r[1] - r[0] + 1 : NaN
  const diff = Math.abs(rwid - pwid)
  if (h >= 0.05 && h <= 0.95 && !Number.isNaN(diff)) worst = Math.max(worst, diff)
  if (k === 19) tipRatio = rwid / pwid
  lines.push(`${h.toFixed(2)}   ${String(pwid).padStart(4)}  ${p ? `${p[0]}-${p[1]}` : 'none'}`.padEnd(36) + ` | ${String(rwid).padStart(4)}  ${r ? `${r[0]}-${r[1]}` : 'none'}`.padEnd(36) + `  ${Number.isNaN(diff) ? '' : diff}`)
}
lines.push(`IoU ${iou.toFixed(3)}; worst trunk-width difference from 0.05 to 0.95: ${worst} px; tip width at 0.95: ${tipRatio.toFixed(2)} of the painting's`)
console.log(lines.join('\n'))
writeFileSync(`${outPrefix}-table.txt`, lines.join('\n') + '\n')

// side by side: the painting's mask, the aligned render's mask, and the overlap (white both, grey one)
const outW = PW * 3 + 16
const rgba = new Uint8Array(outW * ph * 4)
for (let y = 0; y < ph; y++) {
  for (let x = 0; x < outW; x++) {
    const o = (y * outW + x) * 4
    let v = 18
    if (x < PW) v = paintMask.data[y * PW + x] ? 220 : 18
    else if (x < PW + 8) v = 120
    else if (x < 2 * PW + 8) v = aligned.data[y * PW + x - PW - 8] ? 220 : 18
    else if (x < 2 * PW + 16) v = 120
    else {
      const i = y * PW + x - 2 * PW - 16
      v = paintMask.data[i] && aligned.data[i] ? 230 : paintMask.data[i] || aligned.data[i] ? 110 : 18
    }
    rgba[o] = v
    rgba[o + 1] = v
    rgba[o + 2] = v
    rgba[o + 3] = 255
  }
}
writeFileSync(`${outPrefix}-masks.png`, encodePNG(outW, ph, rgba))
console.log(`wrote ${outPrefix}-table.txt and ${outPrefix}-masks.png (painting | render aligned | overlap). LOOK AT IT.`)
