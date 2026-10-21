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

import { decodePNG, encodePNG } from './lib/png.ts'
import { alignRender, extent, runsOf, treeComponent, trunkRun } from './lib/silhouette.ts'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const capturePath = resolve(ROOT, args[0] ?? 'output/playwright/e1-measure-2026-10-21/desktop-centre.png')
const [CX, CY, CW, CH] = args.length >= 5 ? args.slice(1, 5).map(Number) : [330, 80, 220, 578]
const outPrefix = resolve(ROOT, args[5] ?? 'reference/derived/cypress-silhouette')
mkdirSync(resolve(outPrefix, '..'), { recursive: true })

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

// the render's mask in the painting's frame at the best x offset (scripts/lib/silhouette.ts)
const alignment = alignRender(paintMask, renderMask)
const { aligned, iou, shift: bestShift } = alignment

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
lines.push(`IoU ${iou.toFixed(3)} at an x shift of ${bestShift} px from the base-centre alignment; worst trunk-width difference from 0.05 to 0.95: ${worst} px; tip width at 0.95: ${tipRatio.toFixed(2)} of the painting's`)
console.log(lines.join('\n'))
writeFileSync(`${outPrefix}-table.txt`, lines.join('\n') + '\n')

// side by side: the painting's mask, the aligned render's mask, and the overlap (white both, grey one)
const outW = PW * 3 + 16
const rgba = new Uint8Array(outW * ph * 4)
for (let y = 0; y < ph; y++) {
  for (let x = 0; x < outW; x++) {
    const o = (y * outW + x) * 4
    let v: number
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
