/*
 * Bake the land band's orientation field and validate the authored masses (E2, tasks/2026-10-21-land-e2-plan.md).
 *
 * From the 3840 scan's decode (E1's `reference/derived/cypress-work.png`, made here if missing) take the band
 * v ∈ [0.58, 1.0] at a quarter of the resolution (960 × 320, box-filtered). The structure tensor at σ 1.5, the
 * low-pass σ 1.5, the blend to HORIZONTAL where the tensor has no orientation (the ground's strokes lie along the
 * ground) over the whole band, the cypress column included (the bushes' box lies under it and the masses read
 * the tensor there; the ground's walks take a horizontal fill over the column at run time, landStrokes.ts). The
 * flow's B channel is the island's support, not the band: a texel whose painting uv maps through `worldAt`
 * inside the coast shrunk by 3% carries the anisotropy at 32 levels (never 0), every other texel 0, so the
 * ground tracer seeds only where a strip can stand (Codex, plan review F6; the masses mask B by their own runs).
 * The field is baked undirected (the double-angle resolved to dx ≥ 0): the land's walks carry a continuous
 * heading (F9).
 *
 * The masses are authored (`src/scene/landMasses.ts`); the derive validates each box's foliage share (teal or
 * olive, ≥ 0.35), confirms its dominant hue is the authored class, and writes its foliage pixel runs at the flow's
 * resolution for the runtime's seeds and pigment (F1).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { coastR } from '../src/scene/islandShape.ts'
import { flowToPainting, worldAt } from '../src/scene/landMapping.ts'
import { LAND_MASSES } from '../src/scene/landMasses.ts'
import { blendToVertical, HORIZONTAL, lowPassOrientation, orientationField } from './lib/cypress-field.ts'
import { FOLIAGE, landClass, type LandClass } from './lib/land-field.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REVIEW_DIR = resolve(ROOT, 'reference/derived')
const WORK = resolve(REVIEW_DIR, 'cypress-work.png')
const OUT_FLOW = resolve(ROOT, 'public/reference/land-flow.png')
const OUT_MASSES = resolve(ROOT, 'public/reference/land-masses.json')
const OUT_FIELD_OVERLAY = resolve(REVIEW_DIR, 'land-field-overlay.png')
const OUT_MASSES_OVERLAY = resolve(REVIEW_DIR, 'land-masses-overlay.png')

const BAND_V0 = 0.58
const SCALE = 4
const TENSOR_SIGMA = 1.5
const LOW_PASS_SIGMA = 1.5
/** the coast shrunk by the widest ribbon's reach, so a strip seeded at the mask's edge still stands */
const SUPPORT = 0.97
const MIN_SHARE = 0.35
/** the painting's cypress stands here; the ground's walks take a horizontal fill under it (landStrokes.ts) */
const CYPRESS_COLUMN = { u: 0.26, v: 0.95 }
const PAINTING = { width: 1600, height: 1267 }

mkdirSync(REVIEW_DIR, { recursive: true })
if (!existsSync(WORK)) {
  execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'reference/starry-night-source.jpg'), '--out', WORK], { stdio: 'ignore' })
}
const scan = decodePNG(readFileSync(WORK))
const y0 = Math.floor(BAND_V0 * scan.height)
const width = Math.floor(scan.width / SCALE)
const height = Math.floor((scan.height - y0) / SCALE)

// 1. the band at a quarter: box-filtered rgb, luminance, class
const rgb = new Uint8Array(width * height * 3)
const luminance = { width, height, data: new Float64Array(width * height) }
const classes = new Array<LandClass>(width * height)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    let r = 0
    let g = 0
    let b = 0
    for (let dy = 0; dy < SCALE; dy++) {
      for (let dx = 0; dx < SCALE; dx++) {
        const i = ((y0 + y * SCALE + dy) * scan.width + x * SCALE + dx) * 4
        r += scan.rgba[i]
        g += scan.rgba[i + 1]
        b += scan.rgba[i + 2]
      }
    }
    const n = SCALE * SCALE
    const o = y * width + x
    rgb[o * 3] = Math.round(r / n)
    rgb[o * 3 + 1] = Math.round(g / n)
    rgb[o * 3 + 2] = Math.round(b / n)
    luminance.data[o] = 0.299 * rgb[o * 3] + 0.587 * rgb[o * 3 + 1] + 0.114 * rgb[o * 3 + 2]
    classes[o] = landClass(rgb[o * 3], rgb[o * 3 + 1], rgb[o * 3 + 2])
  }
}

// 2. the band mask (the whole band) and the island's support; the cypress column, hatched in the overlay
const bandMask = new Uint8Array(width * height).fill(1)
const support = new Uint8Array(width * height)
const column = new Uint8Array(width * height)
let supported = 0
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const o = y * width + x
    const [u, v] = flowToPainting(x / (width - 1), y / (height - 1))
    if (u < CYPRESS_COLUMN.u && v < CYPRESS_COLUMN.v) column[o] = 1
    const [wx, wz] = worldAt(u, v)
    if (Math.hypot(wx, wz) <= coastR(Math.atan2(wz, wx)) * SUPPORT) {
      support[o] = 1
      supported++
    }
  }
}

// 3. the field: the tensor, the low-pass, the horizontal fallback
const raw = orientationField(luminance, bandMask, TENSOR_SIGMA)
const smoothed = lowPassOrientation(raw.cos2, raw.sin2, bandMask, width, height, LOW_PASS_SIGMA)
const field = blendToVertical(smoothed.cos2, smoothed.sin2, raw.anisotropy, HORIZONTAL)

/** the undirected orientation as a direction with dx ≥ 0 (the land's walks carry their own heading) */
function undirected(cos2: number, sin2: number): { dx: number; dy: number } {
  const angle = 0.5 * Math.atan2(sin2, cos2)
  let dx = Math.cos(angle)
  let dy = Math.sin(angle)
  if (dx < 0) {
    dx = -dx
    dy = -dy
  }
  return { dx, dy }
}

const flowRgba = new Uint8Array(width * height * 4)
let leaning = 0
let hillTexels = 0
for (let i = 0; i < width * height; i++) {
  const { dx, dy } = undirected(field.cos2[i], field.sin2[i])
  flowRgba[i * 4] = Math.round(((dx + 1) / 2) * 255)
  flowRgba[i * 4 + 1] = Math.round(((dy + 1) / 2) * 255)
  // B: the support with the anisotropy at 32 levels (8 .. 255), 0 where no strip can stand
  flowRgba[i * 4 + 2] = support[i] ? Math.max(8, Math.round(Math.min(1, Math.max(0, raw.anisotropy[i])) * 31) * 8) : 0
  flowRgba[i * 4 + 3] = 255
  const v = BAND_V0 + (Math.floor(i / width) / (height - 1)) * (1 - BAND_V0)
  if (bandMask[i] && v < 0.78) {
    hillTexels++
    if ((Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI > 30) leaning++
  }
}
writeFileSync(OUT_FLOW, encodePNG(width, height, flowRgba))

// 4. the authored masses: the class share of each box, its runs at the flow's resolution
type Run = { y: number; x0: number; x1: number }
const baked = LAND_MASSES.map((mass) => {
  const bx0 = Math.max(0, Math.floor(((mass.box[0] / PAINTING.width) * scan.width) / SCALE))
  const bx1 = Math.min(width, Math.ceil(((mass.box[2] / PAINTING.width) * scan.width) / SCALE))
  const by0 = Math.max(0, Math.floor((((mass.box[1] / PAINTING.height) * scan.height - y0)) / SCALE))
  const by1 = Math.min(height, Math.ceil((((mass.box[3] / PAINTING.height) * scan.height - y0)) / SCALE))
  const runs: Run[] = []
  const hues: Record<string, number> = { teal: 0, yellowGreen: 0 }
  let total = 0
  for (let y = by0; y < by1; y++) {
    let start = -1
    for (let x = bx0; x <= bx1; x++) {
      const cls = x < bx1 ? classes[y * width + x] : 'other'
      const on = x < bx1 && FOLIAGE.includes(cls)
      if (x < bx1) total++
      if (on) hues[cls]++
      if (on && start < 0) start = x
      if (!on && start >= 0) {
        runs.push({ y: y - by0, x0: start - bx0, x1: x - 1 - bx0 })
        start = -1
      }
    }
  }
  const dominant = hues.yellowGreen > hues.teal ? 'yellowGreen' : 'teal'
  return { id: mass.id, class: dominant, expected: mass.class, share: total ? (hues.teal + hues.yellowGreen) / total : 0, x0: bx0, y0: by0, width: bx1 - bx0, height: by1 - by0, runs }
})
const failing = baked.filter((m) => m.share < MIN_SHARE || m.class !== m.expected)
if (failing.length) {
  throw new Error(`land masses failing the guard: ${failing.map((m) => `${m.id} ${(100 * m.share).toFixed(0)}% foliage, dominant ${m.class} (authored ${m.expected})`).join(', ')}`)
}
writeFileSync(OUT_MASSES, `${JSON.stringify(baked)}\n`)

// 5. the overlays: the field's ticks (green by anisotropy), the masses' boxes with their shares
const fieldOverlay = new Uint8Array(width * height * 4)
const massesOverlay = new Uint8Array(width * height * 4)
for (let i = 0; i < width * height; i++) {
  for (const out of [fieldOverlay, massesOverlay]) {
    out[i * 4] = rgb[i * 3]
    out[i * 4 + 1] = rgb[i * 3 + 1]
    out[i * 4 + 2] = rgb[i * 3 + 2]
    out[i * 4 + 3] = 255
  }
  if (!support[i]) {
    fieldOverlay[i * 4] = Math.round(fieldOverlay[i * 4] * 0.4)
    fieldOverlay[i * 4 + 1] = Math.round(fieldOverlay[i * 4 + 1] * 0.4)
    fieldOverlay[i * 4 + 2] = Math.round(fieldOverlay[i * 4 + 2] * 0.4)
  }
  // the cypress column hatched in magenta every sixth diagonal: the ground's fill, the masses' own tensor
  if (column[i] && ((i % width) + Math.floor(i / width)) % 6 === 0) {
    fieldOverlay[i * 4] = 220
    fieldOverlay[i * 4 + 1] = 40
    fieldOverlay[i * 4 + 2] = 200
  }
}
for (let y = 4; y < height; y += 8) {
  for (let x = 4; x < width; x += 8) {
    if (!bandMask[y * width + x]) continue
    const { dx, dy } = undirected(field.cos2[y * width + x], field.sin2[y * width + x])
    const confidence = Math.min(1, Math.max(0, raw.anisotropy[y * width + x]))
    for (let along = -3; along <= 3; along++) {
      const px = Math.round(x + dx * along)
      const py = Math.round(y + dy * along)
      if (px < 0 || py < 0 || px >= width || py >= height) continue
      const o = (py * width + px) * 4
      fieldOverlay[o] = 255
      fieldOverlay[o + 1] = Math.round(40 + 200 * confidence)
      fieldOverlay[o + 2] = 30
    }
  }
}
for (const mass of baked) {
  const colour = mass.class === 'teal' ? [80, 220, 255] : [240, 230, 60]
  for (let x = mass.x0; x < mass.x0 + mass.width; x++) {
    for (const y of [mass.y0, mass.y0 + mass.height - 1]) {
      const o = (y * width + x) * 4
      massesOverlay[o] = colour[0]
      massesOverlay[o + 1] = colour[1]
      massesOverlay[o + 2] = colour[2]
    }
  }
  for (let y = mass.y0; y < mass.y0 + mass.height; y++) {
    for (const x of [mass.x0, mass.x0 + mass.width - 1]) {
      const o = (y * width + x) * 4
      massesOverlay[o] = colour[0]
      massesOverlay[o + 1] = colour[1]
      massesOverlay[o + 2] = colour[2]
    }
  }
  for (const run of mass.runs) {
    const o = ((mass.y0 + run.y) * width + mass.x0 + run.x0) * 4
    massesOverlay[o] = 255
    massesOverlay[o + 1] = 255
    massesOverlay[o + 2] = 255
  }
}
writeFileSync(OUT_FIELD_OVERLAY, encodePNG(width, height, fieldOverlay))
writeFileSync(OUT_MASSES_OVERLAY, encodePNG(width, height, massesOverlay))

console.log(
  `land: band ${width}x${height} from v ${BAND_V0}; support on ${((100 * supported) / (width * height)).toFixed(1)}% of the band; ` +
    `the hills' texels beyond 30° from vertical ${((100 * leaning) / hillTexels).toFixed(1)}%\n` +
    baked.map((m) => `  ${m.id.padEnd(14)} ${m.class.padEnd(11)} foliage ${(100 * m.share).toFixed(0)}%  box ${m.width}x${m.height} at (${m.x0},${m.y0})  runs ${m.runs.length}`).join('\n') +
    `\nflow ${readFileSync(OUT_FLOW).length} bytes. NEXT: npm run slim-reference, then LOOK at reference/derived/land-field-overlay.png and land-masses-overlay.png`,
)
