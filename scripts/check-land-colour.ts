/*
 * The land's colour gate (E2.6, G6; Codex plan review F12): the shares of the land band's classes in a capture's
 * island top against the painting's band, inside an expected area the render's colours cannot move.
 *
 * The expected area is the island's top projected by the design camera (three's PerspectiveCamera under node at
 * the capture's 1600 × 900), every top point inside the coast on a 0.01 grid, dilated by two pixels, minus the
 * houses', the church's and the cypress's projected boxes. Inside it every pixel is classed by `landClass`; the
 * gate asserts the ground, foliage and hill shares within 15 points of the painting's over the band's texels
 * that map onto the island (the village's footprint and the cypress column out), the `other` share at most the
 * painting's plus 10 points, the olive share in the bushes' projected box at least 0.1, and reports each
 * class's Lab mean ΔE76 as a diagnostic (bound 12). The controls: `--control=cyan` paints 40% of the area cyan
 * and must fail on `other`; `--control=sky` reads the sky 400 px above every area pixel and must fail on the
 * counts.
 *
 *   node scripts/check-land-colour.ts [capture-dir] [--control=cyan|sky]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PerspectiveCamera, Vector3 } from 'three'

import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import { coastR, islandHeightAt } from '../src/scene/islandShape.ts'
import { landClass, type LandClass } from '../src/scene/landClass.ts'
import { paintingUvAt } from '../src/scene/landMapping.ts'
import { LAND_MASSES, VILLAGE_FOOTPRINT } from '../src/scene/landMasses.ts'
import { columnShift } from '../src/scene/landStrokes.ts'
import { placeMass } from '../src/scene/landDomes.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const control = (args.find((a) => a.startsWith('--control=')) ?? '').slice('--control='.length)
const captureDir = args.find((a) => !a.startsWith('--')) ?? 'output/playwright/e2-capture-3-2026-10-21'
const capturePath = resolve(ROOT, captureDir, 'desktop-centre.png')
const capture = decodePNG(readFileSync(capturePath))
const painting = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/_work-painting.png')))
const W = capture.width
const H = capture.height
const SHARE_TOLERANCE = 0.15
const OTHER_TOLERANCE = 0.1
const MIN_BUSH_OLIVE = 0.1
const MAX_DELTA_E = 12
const MIN_AREA = 20000

// the design camera at the capture's viewport
const design = DIORAMA_CAMERAS.design
const camera = new PerspectiveCamera(design.fov, W / H, design.near, design.far)
camera.position.set(...design.position)
camera.lookAt(...design.target)
camera.updateMatrixWorld()
const project = (x: number, y: number, z: number): [number, number] | null => {
  const p = new Vector3(x, y, z).project(camera)
  if (p.z > 1) return null
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H]
}

// the island's top, projected and dilated
const area = new Uint8Array(W * H)
for (let x = -2.1; x <= 2.1; x += 0.01) {
  for (let z = -1.4; z <= 1.4; z += 0.01) {
    if (Math.hypot(x, z) > coastR(Math.atan2(z, x))) continue
    const s = project(x, islandHeightAt(x, z), z)
    if (!s) continue
    const sx = Math.round(s[0])
    const sy = Math.round(s[1])
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const px = sx + dx
      const py = sy + dy
      if (px >= 0 && py >= 0 && px < W && py < H) area[py * W + px] = 1
    }
  }
}
// minus the projected boxes: the houses, the church and its spire, the cypress
type Box = { x: number; z: number; w: number; d: number; yaw: number; height: number; tip?: [number, number, number] }
const HOUSES: Box[] = [
  { x: -0.34, z: 0.42, w: 0.21, d: 0.27, yaw: 0.58, height: 0.32 },
  { x: -0.66, z: 0.65, w: 0.28, d: 0.34, yaw: 1.28, height: 0.26 },
  { x: 0.39, z: 0.9, w: 0.31, d: 0.46, yaw: 1.44, height: 0.31 },
  { x: 0.38, z: 0.43, w: 0.22, d: 0.29, yaw: -0.26, height: 0.42 },
  { x: 0.77, z: 0.585, w: 0.28, d: 0.26, yaw: -0.3, height: 0.34 },
  { x: 1.1, z: 0.415, w: 0.3, d: 0.26, yaw: 0.32, height: 0.36 },
  { x: -0.86, z: 0.35, w: 0.3, d: 0.26, yaw: 0.1, height: 0.34 },
  { x: -0.036, z: 0.37, w: 0.26, d: 0.31, yaw: 0.65, height: 0.43, tip: [0.054, 1.125, 0.227] },
  { x: -1.5, z: 0.72, w: 0.7, d: 0.6, yaw: 0, height: 2.7 },
]
function screenBox(box: Box, pad = 4): [number, number, number, number] {
  const points: [number, number][] = []
  const base = islandHeightAt(box.x, box.z)
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = box.x + ((cx * Math.cos(box.yaw) - cz * Math.sin(box.yaw)) * box.w) / 2
    const z = box.z + ((cx * Math.sin(box.yaw) + cz * Math.cos(box.yaw)) * box.d) / 2
    for (const y of [base - 0.05, base + box.height]) {
      const s = project(x, y, z)
      if (s) points.push(s)
    }
  }
  if (box.tip) {
    const s = project(...box.tip)
    if (s) points.push(s)
  }
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return [Math.floor(Math.min(...xs)) - pad, Math.floor(Math.min(...ys)) - pad, Math.ceil(Math.max(...xs)) + pad, Math.ceil(Math.max(...ys)) + pad]
}
for (const box of HOUSES) {
  const [x0, y0, x1, y1] = screenBox(box)
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) area[y * W + x] = 0
}

// the render's pixels inside the area, with the controls applied
const rgba = new Uint8Array(capture.rgba)
let areaPixels = 0
for (let i = 0; i < W * H; i++) if (area[i]) areaPixels++
if (control === 'cyan') {
  let painted = 0
  for (let i = 0; i < W * H && painted < areaPixels * 0.4; i++) {
    if (!area[i]) continue
    rgba[i * 4] = 0
    rgba[i * 4 + 1] = 255
    rgba[i * 4 + 2] = 255
    painted++
  }
} else if (control === 'sky') {
  for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!area[i]) continue
    const from = (Math.max(0, y - 400) * W + x) * 4
    rgba[i * 4] = capture.rgba[from]
    rgba[i * 4 + 1] = capture.rgba[from + 1]
    rgba[i * 4 + 2] = capture.rgba[from + 2]
  }
}

type Lab = { l: number; a: number; b: number }
function srgbToLab(red: number, green: number, blue: number): Lab {
  const linear = (value: number) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  const r = linear(red)
  const g = linear(green)
  const b = linear(blue)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (value: number) => (value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value) / 116 + 16 / 116)
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) }
}
const CLASSES: LandClass[] = ['ground', 'teal', 'yellowGreen', 'hill', 'other']
type Tally = Record<LandClass, { n: number; lab: Lab }>
const tally = (): Tally => Object.fromEntries(CLASSES.map((c) => [c, { n: 0, lab: { l: 0, a: 0, b: 0 } }])) as Tally
const add = (t: Tally, r: number, g: number, b: number) => {
  const c = landClass(r, g, b)
  const lab = srgbToLab(r, g, b)
  t[c].n++
  t[c].lab.l += lab.l
  t[c].lab.a += lab.a
  t[c].lab.b += lab.b
}
const shares = (t: Tally) => {
  const total = CLASSES.reduce((s, c) => s + t[c].n, 0)
  return Object.fromEntries(CLASSES.map((c) => [c, total ? t[c].n / total : 0])) as Record<LandClass, number>
}
const meanLab = (t: Tally, c: LandClass): Lab => ({ l: t[c].lab.l / (t[c].n || 1), a: t[c].lab.a / (t[c].n || 1), b: t[c].lab.b / (t[c].n || 1) })

const render = tally()
for (let i = 0; i < W * H; i++) if (area[i]) add(render, rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])

// the painting's band over the island (through the plan-view map), the village's footprint and the column out
const source = tally()
for (let x = -2.1; x <= 2.1; x += 0.01) {
  for (let z = -1.4; z <= 1.4; z += 0.01) {
    if (Math.hypot(x, z) > coastR(Math.atan2(z, x))) continue
    const [u, v] = paintingUvAt(x, z)
    if (u < 0 || u > 1 || v < 0.58 || v > 1 || columnShift(u, v) !== null) continue
    const px = u * 1600
    const py = v * 1267
    if (VILLAGE_FOOTPRINT.some(([x0, y0, x1, y1]) => px >= x0 && px < x1 && py >= y0 && py < y1)) continue
    const i = (Math.min(painting.height - 1, Math.round(v * (painting.height - 1))) * painting.width + Math.min(painting.width - 1, Math.round(u * (painting.width - 1)))) * 4
    add(source, painting.rgba[i], painting.rgba[i + 1], painting.rgba[i + 2])
  }
}

// the bushes' box: the olive share at the cypress's foot
const bushes = placeMass(LAND_MASSES.find((m) => m.id === 'bushes')!)
const [bx0, by0, bx1, by1] = screenBox({ x: bushes.x, z: bushes.z, w: bushes.width, d: 0.3, yaw: 0, height: bushes.height }, 2)
let bushPixels = 0
let bushOlive = 0
for (let y = Math.max(0, by0); y < Math.min(H, by1); y++) for (let x = Math.max(0, bx0); x < Math.min(W, bx1); x++) {
  const i = (y * W + x) * 4
  bushPixels++
  if (landClass(rgba[i], rgba[i + 1], rgba[i + 2]) === 'yellowGreen') bushOlive++
}
const bushShare = bushPixels ? bushOlive / bushPixels : 0

const renderShares = shares(render)
const sourceShares = shares(source)
const deltaE = Object.fromEntries(CLASSES.map((c) => {
  const a = meanLab(render, c)
  const b = meanLab(source, c)
  return [c, render[c].n && source[c].n ? +Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b).toFixed(1) : null]
}))
const failures: string[] = []
if (areaPixels < MIN_AREA) failures.push(`the expected area is ${areaPixels} px, under ${MIN_AREA}`)
const foliage = (s: Record<LandClass, number>) => s.teal + s.yellowGreen
for (const [label, a, b] of [['ground', renderShares.ground, sourceShares.ground], ['foliage', foliage(renderShares), foliage(sourceShares)], ['hill', renderShares.hill, sourceShares.hill]] as const) {
  if (Math.abs(a - b) > SHARE_TOLERANCE) failures.push(`${label} share ${(100 * a).toFixed(0)}% against the painting's ${(100 * b).toFixed(0)}% (±${100 * SHARE_TOLERANCE})`)
}
if (renderShares.other > sourceShares.other + OTHER_TOLERANCE) failures.push(`other share ${(100 * renderShares.other).toFixed(0)}% over the painting's ${(100 * sourceShares.other).toFixed(0)}% + ${100 * OTHER_TOLERANCE}`)
if (bushShare < MIN_BUSH_OLIVE) failures.push(`olive share at the cypress's foot ${(100 * bushShare).toFixed(0)}% under ${100 * MIN_BUSH_OLIVE}%`)
const diagnostics = CLASSES.filter((c) => deltaE[c] !== null && (deltaE[c] as number) > MAX_DELTA_E).map((c) => `${c} ΔE ${deltaE[c]}`)

// the area, for the eye
const overlay = new Uint8Array(W * H * 4)
for (let i = 0; i < W * H; i++) {
  overlay[i * 4] = Math.round(rgba[i * 4] * (area[i] ? 1 : 0.35))
  overlay[i * 4 + 1] = Math.round(rgba[i * 4 + 1] * (area[i] ? 1 : 0.35))
  overlay[i * 4 + 2] = Math.round(rgba[i * 4 + 2] * (area[i] ? 1 : 0.35))
  overlay[i * 4 + 3] = 255
}
for (let y = Math.max(0, by0); y < Math.min(H, by1); y++) for (const x of [bx0, bx1 - 1]) if (x >= 0 && x < W) { const o = (y * W + x) * 4; overlay[o] = 240; overlay[o + 1] = 230; overlay[o + 2] = 60 }
const overlayPath = resolve(ROOT, captureDir, `land-colour-area${control ? `-${control}` : ''}.png`)
writeFileSync(overlayPath, encodePNG(W, H, overlay))

const round = (s: Record<LandClass, number>) => Object.fromEntries(CLASSES.map((c) => [c, +(100 * s[c]).toFixed(1)]))
console.log(JSON.stringify({ control: control || null, areaPixels, render: round(renderShares), painting: round(sourceShares), bushOlive: +(100 * bushShare).toFixed(1), deltaE, overlay: overlayPath }))
if (diagnostics.length) console.log(`diagnostic: ${diagnostics.join(', ')} beyond ${MAX_DELTA_E} (not a failure)`)
if (failures.length) {
  console.log(`FAIL: ${failures.join('; ')}`)
  process.exitCode = 1
} else {
  console.log('PASS: the land\'s class shares within their bounds')
}
