/*
 * The grass's look in numbers (S3b task 0): light and dark, the lightest strokes' colour, the local contrast and how
 * well the strokes agree in direction, over the verge of a capture or a rectangle of the painting.
 *
 * The verge mask is every grass pixel of the ID view (0, 188, 255) and every ground pixel (255, 255, 0) within 12 px
 * of one: the blades and the gaps between them. The structure tensor reads grey with Sobel gradients and a σ 2
 * Gaussian on their products, over the mask shrunk by 7 px so its edge against the path or the sky adds no gradient.
 *
 * Usage:
 *   node scripts/grass-look.ts <colour.png> <ids.png>
 *   node scripts/grass-look.ts <colour.png> --rect x0,y0,x1,y1
 */

import { readFileSync } from 'node:fs'
import { decodePNG, type DecodedPNG } from './lib/png.ts'

export type Look = {
  pixels: number
  L: { p5: number; p25: number; p50: number; p75: number; p95: number }
  under15: number
  over60: number
  /** the mean sRGB of the lightest 2% */
  top2: [number, number, number]
  /** the mean 3 × 3 standard deviation of grey (0–255) */
  std3: number
  /** the tensor's coherence, `Σ(λ1 − λ2) / Σ(λ1 + λ2)` over the shrunk mask */
  coherence: number
  /** the strokes' orientation in 8 bins over [0, π) from +x, counter-clockwise on screen, weighted by λ1 + λ2 */
  orientation: number[]
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** CIE L* of an sRGB byte triple (D65). */
export function lightness(r: number, g: number, b: number): number {
  const y = 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255)
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}

/** Grow (`by` > 0) or shrink (`by` < 0) a mask by a square of `|by|` px. */
function morph(mask: Uint8Array, w: number, h: number, by: number): Uint8Array {
  const r = Math.abs(by)
  // growing spreads the mask's ones, shrinking its zeros (Codex B1: the two were swapped)
  const keep = by > 0 ? 1 : 0
  const pass = (src: Uint8Array, dx: number, dy: number) => {
    const out = new Uint8Array(src)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x] !== keep) continue
        for (let k = -r; k <= r; k++) {
          const xx = x + k * dx
          const yy = y + k * dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          out[yy * w + xx] = keep
        }
      }
    }
    return out
  }
  return pass(pass(mask, 1, 0), 0, 1)
}

/** The verge: grass pixels of the ID view and the ground within 12 px of them. The ID view must be `size`'s shape. */
export function vergeMask(ids: DecodedPNG, size: { width: number; height: number }): Uint8Array {
  const { width: w, height: h, rgba } = ids
  if (w !== size.width || h !== size.height) throw new Error(`grass-look: the ID view is ${w} × ${h}, the size ${size.width} × ${size.height}`)
  const grass = new Uint8Array(w * h)
  const ground = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]
    if (r === 0 && g === 188 && b === 255) grass[i] = 1
    else if (r === 255 && g === 255 && b === 0) ground[i] = 1
  }
  const near = morph(grass, w, h, 12)
  for (let i = 0; i < w * h; i++) near[i] = grass[i] || (ground[i] && near[i]) ? 1 : 0
  return near
}

export function rectMask(w: number, h: number, [x0, y0, x1, y1]: number[]): Uint8Array {
  const m = new Uint8Array(w * h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1
  return m
}

function blur(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const r = Math.ceil(sigma * 3)
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)))
  const sum = k.reduce((a, b) => a + b)
  const tmp = new Float64Array(w * h)
  const out = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) s += k[i + r] * src[y * w + Math.min(w - 1, Math.max(0, x + i))]
      tmp[y * w + x] = s / sum
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) s += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x]
      out[y * w + x] = s / sum
    }
  }
  return out
}

export function measure(img: DecodedPNG, mask: Uint8Array): Look {
  const { width: w, height: h, rgba } = img
  if (mask.length !== w * h) throw new Error(`grass-look: the mask has ${mask.length} pixels, the image's size ${w} × ${h}`)
  const grey = new Float64Array(w * h)
  const L: [number, number][] = []
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]
    grey[i] = 0.299 * r + 0.587 * g + 0.114 * b
    if (mask[i]) L.push([lightness(r, g, b), i])
  }
  if (L.length === 0) throw new Error('grass-look: the mask is empty')
  L.sort((p, q) => p[0] - q[0])
  const q = (k: number) => L[Math.floor(k * (L.length - 1))][0]
  const top = L.slice(Math.floor(0.98 * L.length))
  const top2 = [0, 1, 2].map((c) => top.reduce((a, [, i]) => a + rgba[i * 4 + c], 0) / top.length) as [number, number, number]

  const inner = morph(mask, w, h, -1)
  let std = 0
  let nStd = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!inner[y * w + x]) continue
      let s = 0
      let s2 = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = grey[(y + dy) * w + x + dx]
          s += v
          s2 += v * v
        }
      }
      std += Math.sqrt(Math.max(0, s2 / 9 - (s / 9) ** 2))
      nStd++
    }
  }

  const jxx = new Float64Array(w * h)
  const jyy = new Float64Array(w * h)
  const jxy = new Float64Array(w * h)
  const at = (x: number, y: number) => grey[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      jxx[y * w + x] = gx * gx
      jyy[y * w + x] = gy * gy
      jxy[y * w + x] = gx * gy
    }
  }
  const [bxx, byy, bxy] = [blur(jxx, w, h, 2), blur(jyy, w, h, 2), blur(jxy, w, h, 2)]
  const core = morph(mask, w, h, -7)
  let diff = 0
  let total = 0
  const orientation = new Array(8).fill(0)
  for (let i = 0; i < w * h; i++) {
    if (!core[i]) continue
    const tr = bxx[i] + byy[i]
    const d = Math.sqrt((bxx[i] - byy[i]) ** 2 + 4 * bxy[i] ** 2)
    diff += d
    total += tr
    // the gradient's angle in image space (y down); the stroke runs across it, and on screen y is up
    const grad = 0.5 * Math.atan2(2 * bxy[i], bxx[i] - byy[i])
    const stroke = (((-(grad + Math.PI / 2)) % Math.PI) + Math.PI) % Math.PI
    orientation[Math.min(7, Math.floor((stroke / Math.PI) * 8))] += tr
  }
  const pct = (n: number) => n / L.length
  return {
    pixels: L.length,
    L: { p5: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95) },
    under15: pct(L.filter(([l]) => l < 15).length),
    over60: pct(L.filter(([l]) => l > 60).length),
    top2,
    std3: nStd ? std / nStd : 0,
    coherence: total ? diff / total : 0,
    orientation: orientation.map((v) => (total ? v / total : 0)),
  }
}

export function formatLook(name: string, k: Look): string {
  const f = (n: number) => n.toFixed(1)
  const p = (n: number) => `${(100 * n).toFixed(1)}%`
  return [
    `${name}: ${k.pixels} px`,
    `  L p5 ${f(k.L.p5)} p25 ${f(k.L.p25)} p50 ${f(k.L.p50)} p75 ${f(k.L.p75)} p95 ${f(k.L.p95)} | L<15 ${p(k.under15)} L>60 ${p(k.over60)}`,
    `  top 2% rgb(${k.top2.map(Math.round).join(', ')}) | 3x3 std ${k.std3.toFixed(2)} | coherence ${k.coherence.toFixed(3)}`,
    `  orientation (0°→180°, 22.5° bins) ${k.orientation.map((v) => Math.round(100 * v)).join(' ')}`,
  ].join('\n')
}

if (import.meta.main) {
  const [colourPath, second, rect] = process.argv.slice(2)
  if (!colourPath || !second) {
    console.error('usage: grass-look.ts <colour.png> (<ids.png> | --rect x0,y0,x1,y1)')
    process.exit(1)
  }
  const colour = decodePNG(readFileSync(colourPath))
  const mask = second === '--rect' ? rectMask(colour.width, colour.height, rect.split(',').map(Number)) : vergeMask(decodePNG(readFileSync(second)), colour)
  const look = measure(colour, mask)
  console.log(formatLook(colourPath, look))
  console.log(JSON.stringify(look))
}
