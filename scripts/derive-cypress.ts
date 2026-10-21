/*
 * Bake the cypress's whole-tree mask, its orientation field and its row table (E1, 2026-10-21).
 *
 * Two resolutions. The seed, the main column's chain, comes from the 1600 px `painting.jpg` through `cypressMask`
 * as before: on the 3840 px scan the same extractor returns a 69-row fragment (the scan's canvas weave and pale
 * speckles split the rows' runs). Everything else comes from the 3840 px scan: the treeish component flooded
 * from the scaled seed inside the seed's own box (so the terrain joined to the base stays out), the structure
 * tensor at a stroke's scale, and the painting's lean kept (the blend to vertical gated on anisotropy, not on
 * gradient energy). Dependency-free apart from the repository's existing macOS `sips` JPEG decode path.
 *
 * Outputs: public/reference/cypress-flow.png (R, G the signed-up direction; B 0 outside the mask, the anisotropy
 * inside, never 0; A 255), public/reference/cypress-rows.json, and the review images in reference/derived.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  satelliteRuns,
  signedUpDirection,
  toCropLocalRuns,
  treeComponent,
  type Box,
  type Domain,
  type RowSpan,
  type Run,
} from './lib/cypress-field.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REVIEW_DIR = resolve(ROOT, 'reference/derived')
const WORK_1600 = resolve(REVIEW_DIR, 'cypress-work-1600.png')
const WORK = resolve(REVIEW_DIR, 'cypress-work.png')
const OUT_FLOW = resolve(ROOT, 'public/reference/cypress-flow.png')
const OUT_ROWS = resolve(ROOT, 'public/reference/cypress-rows.json')
const OUT_SKIN_SOURCE = resolve(REVIEW_DIR, 'cypress-skin-source.png')
const OUT_FIELD_OVERLAY = resolve(REVIEW_DIR, 'cypress-field-overlay.png')
const OUT_MASK_OVERLAY = resolve(REVIEW_DIR, 'cypress-mask-overlay.png')

const REGION = { u0: 0.02, u1: 0.32, v0: 0.04, v1: 1 }
/** scan pixels of side margin around the seed's box: the tongues' overshoot; none above or below (Codex F2) */
const SIDE_MARGIN = 16
/** the tensor's window and the low-pass, in scan pixels: a stroke is 8–14 px wide at 3840 */
const TENSOR_SIGMA = 6
const LOW_PASS_SIGMA = 5
const CLOSE = 1
/** the derive guard: the component must be the tree, whole and nothing else (the 2026-10-21 scratch run: 352,568 px) */
const GUARD = { minSeedRows: 600, minHeightShare: 0.95, minPixels: 250_000, maxPixels: 450_000 }

mkdirSync(REVIEW_DIR, { recursive: true })
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK_1600], { stdio: 'ignore' })
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'reference/starry-night-source.jpg'), '--out', WORK], { stdio: 'ignore' })
const paintingBytes = readFileSync(WORK_1600)
const scanBytes = readFileSync(WORK)
const painting = decodePNG(paintingBytes)
const scan = decodePNG(scanBytes)
// the decoded inputs' digests ride in the table: a JPEG decoder is not part of the repository (`sips` is the
// existing path, deterministic on this Mac, three decodes one md5 on 2026-10-21), so a change in it shows here
// rather than as a silent shift of the bake (Codex, code review F8)
const source = {
  painting: createHash('md5').update(paintingBytes).digest('hex'),
  scan: createHash('md5').update(scanBytes).digest('hex'),
  decoder: 'sips -s format png (macOS)',
}
const scale = scan.width / painting.width
if (Math.abs(scan.height / painting.height - scale) > 0.01) {
  throw new Error(`the scan (${scan.width}x${scan.height}) and painting.jpg (${painting.width}x${painting.height}) have different aspects`)
}

// 1. the seed at 1600, validated
const box: Box = {
  x0: Math.floor(REGION.u0 * painting.width),
  y0: Math.floor(REGION.v0 * painting.height),
  x1: Math.ceil(REGION.u1 * painting.width),
  y1: Math.ceil(REGION.v1 * painting.height),
}
const { spans: seedSpans } = cypressMask(painting, box)
if (seedSpans.length < GUARD.minSeedRows) {
  throw new Error(`cypress seed found only ${seedSpans.length} rows at 1600 px — the region or width gate is wrong`)
}
const seeds: RowSpan[] = seedSpans.map((span) => ({
  y: Math.round(span.y * scale),
  x0: Math.round(span.x0 * scale),
  x1: Math.round(span.x1 * scale),
}))

// 2. the domain: the scaled seed's box, side margins only
const domain: Domain = {
  x0: Math.max(0, Math.min(...seeds.map((s) => s.x0)) - SIDE_MARGIN),
  y0: Math.min(...seeds.map((s) => s.y)),
  x1: Math.min(scan.width, Math.max(...seeds.map((s) => s.x1)) + 1 + SIDE_MARGIN),
  y1: Math.min(scan.height, Math.max(...seeds.map((s) => s.y)) + 1),
}
const domainWidth = domain.x1 - domain.x0
const domainHeight = domain.y1 - domain.y0

// 3. the whole-tree component inside the domain
const component = treeComponent(scan, domain, seeds, CLOSE)
const componentHeight = component.bounds.y1 - component.bounds.y0
const componentWidth = component.bounds.x1 - component.bounds.x0
if (
  componentHeight < GUARD.minHeightShare * domainHeight ||
  componentWidth > domainWidth ||
  component.pixels < GUARD.minPixels ||
  component.pixels > GUARD.maxPixels
) {
  throw new Error(
    `cypress component out of range: ${component.pixels} px, ${componentWidth}x${componentHeight} in a ${domainWidth}x${domainHeight} domain ` +
      `(guard: height ≥ ${GUARD.minHeightShare} of the domain, width ≤ the domain, ${GUARD.minPixels}–${GUARD.maxPixels} px)`,
  )
}

// 4. the main column per row of the component: the run with the most overlap with the interpolated seed span
function seedSpanAt(y: number): RowSpan {
  let low = 0
  let high = seeds.length - 1
  if (y <= seeds[0].y) return seeds[0]
  if (y >= seeds[high].y) return seeds[high]
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (seeds[middle].y <= y) low = middle
    else high = middle
  }
  const a = seeds[low]
  const b = seeds[high]
  const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y)
  return { y, x0: Math.round(a.x0 + (b.x0 - a.x0) * t), x1: Math.round(a.x1 + (b.x1 - a.x1) * t) }
}
const runsByRow = new Map<number, Run[]>()
for (const run of component.runs) {
  const row = runsByRow.get(run.y)
  if (row) row.push(run)
  else runsByRow.set(run.y, [run])
}
const mainSpans: RowSpan[] = []
for (let y = domain.y0; y < domain.y1; y++) {
  const seed = seedSpanAt(y)
  let best: Run | null = null
  let bestOverlap = 0
  for (const run of runsByRow.get(y) ?? []) {
    const overlap = Math.min(run.x1, seed.x1) - Math.max(run.x0, seed.x0) + 1
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      best = run
    }
  }
  if (best) mainSpans.push({ y, x0: best.x0, x1: best.x1 })
}
const satellites = satelliteRuns(component.runs, mainSpans)

// 5. the crop is the domain
const cropX0 = domain.x0
const cropY0 = domain.y0
const cropWidth = domainWidth
const cropHeight = domainHeight
const luminance = { width: cropWidth, height: cropHeight, data: new Float64Array(cropWidth * cropHeight) }
const cropMask = new Uint8Array(cropWidth * cropHeight)
for (let y = 0; y < cropHeight; y++) {
  for (let x = 0; x < cropWidth; x++) {
    const sourcePixel = (y + cropY0) * scan.width + (x + cropX0)
    const source = sourcePixel * 4
    const destination = y * cropWidth + x
    luminance.data[destination] = 0.299 * scan.rgba[source] + 0.587 * scan.rgba[source + 1] + 0.114 * scan.rgba[source + 2]
    cropMask[destination] = component.mask[sourcePixel]
  }
}

// 6. the field: the tensor, the low-pass, the gated blend
const raw = orientationField(luminance, cropMask, TENSOR_SIGMA)
const smoothed = lowPassOrientation(raw.cos2, raw.sin2, cropMask, cropWidth, cropHeight, LOW_PASS_SIGMA)
const field = blendToVertical(smoothed.cos2, smoothed.sin2, raw.anisotropy)

const flowRgba = new Uint8Array(cropWidth * cropHeight * 4)
for (let i = 0; i < cropWidth * cropHeight; i++) {
  const { dx, dy } = signedUpDirection(field.cos2[i], field.sin2[i])
  flowRgba[i * 4] = Math.round(((dx + 1) / 2) * 255)
  flowRgba[i * 4 + 1] = Math.round(((dy + 1) / 2) * 255)
  // B carries the mask: 0 outside, the anisotropy inside and never 0 there. The mask cannot ride in alpha: the
  // runtime reads the PNG through a 2D canvas, which premultiplies, and a texel with alpha 0 comes back R = G = 0.
  flowRgba[i * 4 + 2] = cropMask[i] ? Math.max(1, Math.round(Math.min(1, Math.max(0, raw.anisotropy[i])) * 255)) : 0
  flowRgba[i * 4 + 3] = 255
}
writeFileSync(OUT_FLOW, encodePNG(cropWidth, cropHeight, flowRgba))

// 7. the skin source (review and the flat gates only; nothing public): the crop with the mask as alpha
const skinRgba = new Uint8Array(cropWidth * cropHeight * 4)
for (let y = 0; y < cropHeight; y++) {
  for (let x = 0; x < cropWidth; x++) {
    const source = ((y + cropY0) * scan.width + (x + cropX0)) * 4
    const destination = (y * cropWidth + x) * 4
    skinRgba[destination] = scan.rgba[source]
    skinRgba[destination + 1] = scan.rgba[source + 1]
    skinRgba[destination + 2] = scan.rgba[source + 2]
    skinRgba[destination + 3] = cropMask[y * cropWidth + x] ? 255 : 0
  }
}
writeFileSync(OUT_SKIN_SOURCE, encodePNG(cropWidth, cropHeight, skinRgba))

// 8. the row table, in the crop's frame; `uv` is the crop's box in painting-normalised coordinates
const cropLocal = { x0: cropX0, y0: cropY0 }
const rowTable = {
  uv: [cropX0 / scan.width, cropY0 / scan.height, (cropX0 + cropWidth) / scan.width, (cropY0 + cropHeight) / scan.height].map((v) => Number(v.toFixed(6))),
  width: cropWidth,
  height: cropHeight,
  spans: mainSpans.map(
    (span) =>
      [
        Number(((span.y - cropY0) / (cropHeight - 1)).toFixed(6)),
        Number(((span.x0 - cropX0) / (cropWidth - 1)).toFixed(6)),
        Number(((span.x1 - cropX0) / (cropWidth - 1)).toFixed(6)),
      ] as [number, number, number],
  ),
  satellites: toCropLocalRuns(satellites, cropLocal),
  source,
  component: {
    bounds: {
      x0: component.bounds.x0 - cropX0,
      y0: component.bounds.y0 - cropY0,
      x1: component.bounds.x1 - cropX0,
      y1: component.bounds.y1 - cropY0,
    },
    pixels: component.pixels,
    rows: mainSpans.length,
  },
}
writeFileSync(OUT_ROWS, `${JSON.stringify(rowTable)}\n`)

// 9. the review overlays at the scan's resolution: the mask in red, the field's ticks green by anisotropy
const fieldOverlay = new Uint8Array(cropWidth * cropHeight * 4)
const maskOverlay = new Uint8Array(cropWidth * cropHeight * 4)
for (let i = 0; i < cropWidth * cropHeight; i++) {
  const source = ((Math.floor(i / cropWidth) + cropY0) * scan.width + (i % cropWidth) + cropX0) * 4
  for (const output of [fieldOverlay, maskOverlay]) {
    output[i * 4] = scan.rgba[source]
    output[i * 4 + 1] = scan.rgba[source + 1]
    output[i * 4 + 2] = scan.rgba[source + 2]
    output[i * 4 + 3] = 255
  }
  if (cropMask[i]) {
    maskOverlay[i * 4] = Math.min(255, maskOverlay[i * 4] + 100)
    maskOverlay[i * 4 + 1] = Math.round(maskOverlay[i * 4 + 1] * 0.55)
    maskOverlay[i * 4 + 2] = Math.round(maskOverlay[i * 4 + 2] * 0.55)
  }
}
for (let y = 6; y < cropHeight; y += 12) {
  for (let x = 6; x < cropWidth; x += 12) {
    if (!cropMask[y * cropWidth + x]) continue
    const { dx, dy } = signedUpDirection(field.cos2[y * cropWidth + x], field.sin2[y * cropWidth + x])
    const confidence = Math.min(1, Math.max(0, raw.anisotropy[y * cropWidth + x]))
    for (let along = -5; along <= 5; along++) {
      const pixelX = Math.round(x + dx * along)
      const pixelY = Math.round(y + dy * along)
      if (pixelX < 0 || pixelY < 0 || pixelX >= cropWidth || pixelY >= cropHeight) continue
      const destination = (pixelY * cropWidth + pixelX) * 4
      fieldOverlay[destination] = 255
      fieldOverlay[destination + 1] = Math.round(40 + 200 * confidence)
      fieldOverlay[destination + 2] = 30
    }
  }
}
writeFileSync(OUT_FIELD_OVERLAY, encodePNG(cropWidth, cropHeight, fieldOverlay))
writeFileSync(OUT_MASK_OVERLAY, encodePNG(cropWidth, cropHeight, maskOverlay))

let anisotropySum = 0
let anisotropySamples = 0
let leaning = 0
for (let i = 0; i < cropMask.length; i++) {
  if (!cropMask[i]) continue
  anisotropySum += raw.anisotropy[i]
  anisotropySamples++
  const { dx, dy } = signedUpDirection(field.cos2[i], field.sin2[i])
  if ((Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI > 15) leaning++
}
console.log(
  `cypress: seed ${seedSpans.length} rows at 1600 px (scale ${scale.toFixed(3)}); component ${component.pixels} px, ` +
    `${componentWidth}x${componentHeight} in the ${cropWidth}x${cropHeight} domain at (${cropX0},${cropY0}); ` +
    `main column on ${mainSpans.length} rows, ${satellites.length} satellite runs\n` +
    `mean anisotropy ${(anisotropySum / anisotropySamples).toFixed(3)}, field beyond 15° from vertical on ${((100 * leaning) / anisotropySamples).toFixed(1)}% of the mask\n` +
    'NEXT: npm run slim-reference, then npm run flat-cypress-lobes and LOOK at reference/derived/cypress-field-overlay.png',
)
