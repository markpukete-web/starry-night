/*
 * The street's flat panel (S1 task 3, G4a): each source rectangle of the 3840 scan at 1:1 on the left, and on the
 * right, at the same scale, the face traced from it (its underpaint, its ribbons in their per-sample pigments, its
 * outlines) drawn flat, so the strokes' width, length, lean and the ink can be read against the painting's own
 * marks before anything stands in 3D. A tree mass (`orchard-lower`) through the land's mass tracer closes it.
 *
 *   node scripts/flat-street-gate.ts [out.png] [scale]
 *   env SCAN_PNG (the 3840 scan as PNG), PAINTING_PNG (the 1600 painting), defaults under scratch/ and reference/
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { Color, Vector3 } from 'three'

import { ribbonEdges, traceCypressRibbons } from '../src/scene/cypressStrokes.ts'
import { FOLIAGE_TEXEL, massCrop, type BakedMass } from '../src/scene/landDomes.ts'
import { outlineFace, sourceUnderpaint, STREET_SOURCES, streetMassConfig, traceFace, type StreetFace, type StreetSourceName } from '../src/scene/streetStrokes.ts'
import { PALETTE } from '../src/scene/palette.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const out = process.argv[2] ?? 'scratch/street-s1-2026-10-23/t3/panel.png'
const S = Number(process.argv[3] ?? 3)
const image = (path: string) => {
  const png = decodePNG(readFileSync(path))
  return { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height }
}
const scan = image(process.env.SCAN_PNG ?? 'scratch/street-s1-2026-10-23/t3/scan.png')
const painting = image(process.env.PAINTING_PNG ?? 'reference/derived/_work-painting.png')
const flow = image('public/reference/land-flow.png')
const baked = JSON.parse(readFileSync('public/reference/land-masses.json', 'utf8')) as BakedMass[]
const K = scan.width / 1600

type Row = { label: string; box: readonly [number, number, number, number]; draw: (put: Put, w: number, h: number) => void }
type Put = (x: number, y: number, r: number, g: number, b: number) => void

const srgb = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))

type RGB = [number, number, number]

/** A triangle filled with its vertices' colours blended, as the GPU interpolates vertex colours (pass 0's flat fill read as pixel blocks). */
function triangle(put: Put, w: number, h: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, ca: RGB, cb: RGB = ca, cc: RGB = ca): void {
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
  if (Math.abs(area) < 1e-9) return
  for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(h - 1, Math.ceil(Math.max(ay, by, cy))); y++) {
    for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
      const px = x + 0.5
      const py = y + 0.5
      const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
      const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
      const w2 = 1 - w0 - w1
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) put(x, y, w0 * ca[0] + w1 * cb[0] + w2 * cc[0], w0 * ca[1] + w1 * cb[1] + w2 * cc[1], w0 * ca[2] + w1 * cb[2] + w2 * cc[2])
    }
  }
}

/** Draw brush arrays laid in face pixels (x right, y up from the face's bottom), flipped into the panel. */
function drawArrays(put: Put, w: number, h: number, arrays: { positions: number[]; colors: number[]; indices: number[] }): void {
  const p = arrays.positions
  for (let t = 0; t < arrays.indices.length; t += 3) {
    const [i, j, k] = [arrays.indices[t], arrays.indices[t + 1], arrays.indices[t + 2]]
    const c = arrays.colors
    const rgb = (n: number): RGB => [srgb(c[n * 3]), srgb(c[n * 3 + 1]), srgb(c[n * 3 + 2])]
    triangle(put, w, h, p[i * 3], h - p[i * 3 + 1], p[j * 3], h - p[j * 3 + 1], p[k * 3], h - p[k * 3 + 1], rgb(i), rgb(j), rgb(k))
  }
}

function faceRow(label: string, source: StreetSourceName, shape: 'quad' | 'triangle', kind: StreetFace['kind'], refOf: (w: number, h: number) => number): Row {
  return {
    label,
    box: STREET_SOURCES[source],
    draw: (put, w, h) => {
      const face: StreetFace = {
        origin: new Vector3(0, 0, 0), u: new Vector3(w, 0, 0), v: new Vector3(0, h, 0), normal: new Vector3(0, 0, 1),
        shape, kind, source, refHeight: refOf(w, h), seed: 0x51, mirror: false,
      }
      const under = sourceUnderpaint(painting, source).map((c) => Math.round(c * 255))
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const s = (x + 0.5) / w
          const t = 1 - (y + 0.5) / h
          if (shape === 'triangle' && t > 1 - 2 * Math.abs(s - 0.5)) continue
          put(x, y, under[0], under[1], under[2])
        }
      }
      drawArrays(put, w, h, traceFace(face, flow, painting).arrays)
      const corners = shape === 'triangle'
        ? [new Vector3(0, 0, 0), new Vector3(w, 0, 0), new Vector3(w / 2, h, 0)]
        : [new Vector3(0, 0, 0), new Vector3(w, 0, 0), new Vector3(w, h, 0), new Vector3(0, h, 0)]
      const edges = corners.map((a, i) => [a, corners[(i + 1) % corners.length]] as const)
      drawArrays(put, w, h, outlineFace(face, edges, new Color(PALETTE.ground), 0x51).arrays)
    },
  }
}

const wallHeightPx = (STREET_SOURCES.wallA[3] - STREET_SOURCES.wallA[1]) * K * S
const rows: Row[] = [
  faceRow('wallA', 'wallA', 'quad', 'wall', (_w, h) => h),
  faceRow('wallB gable', 'wallB', 'triangle', 'wall', (_w, h) => h),
  faceRow('roofStriped', 'roofStriped', 'quad', 'roof', (_w, h) => h),
  faceRow('field', 'field', 'quad', 'ground', () => wallHeightPx),
  {
    label: 'orchard-lower',
    box: [1244, 1048, 1412, 1148],
    draw: (put, w, h) => {
      const entry = baked.find((m) => m.id === 'orchard-lower')
      if (!entry) throw new Error('orchard-lower is not baked')
      const { crop, rows: cropRows, pixels } = massCrop(flow, entry)
      const config = streetMassConfig(crop, pixels)
      for (const ribbon of traceCypressRibbons(crop, painting, cropRows, config.frontCount, 0x7ee5, config, FOLIAGE_TEXEL)) {
        const edges = ribbonEdges(ribbon, crop.width, crop.height, config.taper)
        const pigment = ribbon.colour.map((c) => Math.round(Math.min(1, c * ribbon.relief) * 255)) as RGB
        for (let k = 0; k < edges.length - 1; k++) {
          const a = edges[k]
          const c = edges[k + 1]
          const X = (q: [number, number]) => q[0] * (w - 1)
          const Y = (q: [number, number]) => q[1] * (h - 1)
          triangle(put, w, h, X(a.left), Y(a.left), X(a.right), Y(a.right), X(c.right), Y(c.right), pigment)
          triangle(put, w, h, X(a.left), Y(a.left), X(c.right), Y(c.right), X(c.left), Y(c.left), pigment)
        }
      }
    },
  },
]

const GAP = 12
const sizes = rows.map((row) => {
  const [x0, y0, x1, y1] = row.box
  return [Math.round((x1 - x0) * K * S), Math.round((y1 - y0) * K * S)]
})
const W = Math.max(...sizes.map(([w]) => w)) * 2 + GAP * 3
const H = sizes.reduce((sum, [, h]) => sum + h + GAP, GAP)
const canvas = new Uint8Array(W * H * 4)
for (let i = 0; i < W * H; i++) canvas.set([24, 24, 24, 255], i * 4)
let top = GAP
const half = (W - GAP) / 2
rows.forEach((row, index) => {
  const [w, h] = sizes[index]
  const [x0, y0] = row.box
  // left: the scan at 1:1, nearest ×S
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(scan.width - 1, Math.floor(x0 * K + x / S))
      const sy = Math.min(scan.height - 1, Math.floor(y0 * K + y / S))
      const i = (sy * scan.width + sx) * 4
      canvas.set([scan.data[i], scan.data[i + 1], scan.data[i + 2], 255], ((top + y) * W + GAP + x) * 4)
    }
  }
  // right: the face, the same size
  const left = Math.round(half + GAP / 2)
  row.draw((x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    canvas.set([r, g, b, 255], ((top + y) * W + left + x) * 4)
  }, w, h)
  top += h + GAP
})
writeFileSync(out, encodePNG(W, H, canvas))
console.log(`flat street gate: ${rows.map((r) => r.label).join(', ')} at ×${S} of the 3840 scan → ${out} (${W}×${H})`)
