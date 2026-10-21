/*
 * The flat land gate (E2.6, G4): the painting's land band on the left, the traced ground ribbons drawn flat in
 * their pigments on the right (over the dark ground, the unsupported texels dimmed), at twice the flow's size, so
 * the strokes' count, width, length and lean can be read against the painting before the drape.
 *
 *   node scripts/flat-land-gate.ts [out.png] [count]
 */

import { readFileSync, writeFileSync } from 'node:fs'

import { ribbonEdges } from '../src/scene/cypressStrokes.ts'
import { LAND_RIBBON_CONFIG, traceLandRibbons } from '../src/scene/landStrokes.ts'
import { LAND_MAP } from '../src/scene/landMapping.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const out = process.argv[2] ?? 'reference/derived/land-flat-gate.png'
const count = Number(process.argv[3] ?? LAND_RIBBON_CONFIG.frontCount)
const SCALE = 2

const image = (path: string) => {
  const png = decodePNG(readFileSync(path))
  return { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height }
}
const flow = image('public/reference/land-flow.png')
const painting = image(process.env.LAND_PAINTING ?? 'scratch/land-e2-2026-10-21/painting.png')

const W = flow.width * SCALE
const H = flow.height * SCALE
const canvas = new Uint8Array(W * 2 * H * 4)
const put = (x: number, y: number, r: number, g: number, b: number) => {
  if (x < 0 || y < 0 || x >= W * 2 || y >= H) return
  const i = (y * W * 2 + x) * 4
  canvas[i] = r
  canvas[i + 1] = g
  canvas[i + 2] = b
  canvas[i + 3] = 255
}

// the left: the painting's band, nearest-sampled
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = Math.round((x / (W - 1)) * (painting.width - 1))
    const v = LAND_MAP.bandV0 + (y / (H - 1)) * (1 - LAND_MAP.bandV0)
    const py = Math.min(painting.height - 1, Math.round(v * (painting.height - 1)))
    const i = (py * painting.width + px) * 4
    put(x, y, painting.data[i], painting.data[i + 1], painting.data[i + 2])
  }
}
// the right: the dark ground (the island's top, hills 0x263041 at 0.3 linear ≈ 0.58 sRGB), unsupported texels dimmer
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (Math.floor(y / SCALE) * flow.width + Math.floor(x / SCALE)) * 4
    const supported = flow.data[i + 2] > 0
    const k = supported ? 0.58 : 0.25
    put(W + x, y, Math.round(0x26 * k), Math.round(0x30 * k), Math.round(0x41 * k))
  }
}

// the ribbons as flat quads between consecutive edge pairs
function triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number, g: number, b: number): void {
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)))
  const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)))
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
  const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)))
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
  if (Math.abs(area) < 1e-9) return
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
      const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
      const w2 = 1 - w0 - w1
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) put(W + x, y, r, g, b)
    }
  }
}
const ribbons = traceLandRibbons(flow, painting, count, 0x1a4d)
let drawn = 0
for (const ribbon of ribbons) {
  const edges = ribbonEdges(ribbon, flow.width, flow.height, LAND_RIBBON_CONFIG.taper)
  const [r, g, b] = ribbon.colour.map((c) => Math.round(Math.min(1, c * ribbon.relief) * 255))
  const sx = (p: [number, number]) => p[0] * (W - 1)
  const sy = (p: [number, number]) => p[1] * (H - 1)
  for (let k = 0; k < edges.length - 1; k++) {
    const a = edges[k]
    const c = edges[k + 1]
    triangle(sx(a.left), sy(a.left), sx(a.right), sy(a.right), sx(c.right), sy(c.right), r, g, b)
    triangle(sx(a.left), sy(a.left), sx(c.right), sy(c.right), sx(c.left), sy(c.left), r, g, b)
  }
  drawn++
}
writeFileSync(out, encodePNG(W * 2, H, canvas))
console.log(`flat land gate: ${drawn} ribbons of ${count} drawn at ${W}x${H} beside the band → ${out}`)
