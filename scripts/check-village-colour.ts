/*
 * Displayed village colour gate using regional Lab distributions.
 *
 * Deliberately NOT a registered per-pixel comparison (the diorama's compact huddle is a
 * different composition from the painting's wide village band). We compare mean Lab and channel
 * spread over the matched houses-band rects from the 2026-07-22 look pass and report ΔE76
 * between the means, bound by the locked palette tolerance (<10). Coarse by design: both rects
 * are village-dominated but include background; the gate catches family-level drift, and the
 * visual compare (compare-village.mjs) catches everything else.
 *
 * Source: reference/derived/_work-painting.png (1600×1267; rebake via `npm run derive-reference`
 * if missing). Live: a capture directory's desktop-centre.png (1600×900 deterministic pose).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { decodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const capturePath = resolve(ROOT, process.argv[2] ?? '', 'desktop-centre.png')
const source = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/_work-painting.png')))
const capture = decodePNG(readFileSync(capturePath))

// The matched houses-band rects from tasks/2026-07-22-village-look.md.
const SRC_BAND = { x: 560, y: 1005, w: 500, h: 80 }
const LIVE_BAND = { x: 580, y: 600, w: 500, h: 70 }

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
  const f = (value: number) =>
    value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27) * value / 116 + 16 / 116
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) }
}

function bandLabs(img: { width: number; height: number; rgba: Uint8Array }, band: { x: number; y: number; w: number; h: number }): Lab[] {
  const out: Lab[] = []
  for (let y = band.y; y < band.y + band.h; y++)
    for (let x = band.x; x < band.x + band.w; x++) {
      const i = (y * img.width + x) * 4
      out.push(srgbToLab(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]))
    }
  return out
}

function summary(values: Lab[]) {
  const mean = { l: 0, a: 0, b: 0 }
  for (const v of values) {
    mean.l += v.l
    mean.a += v.a
    mean.b += v.b
  }
  mean.l /= values.length
  mean.a /= values.length
  mean.b /= values.length
  const spread = { l: 0, a: 0, b: 0 }
  for (const v of values) {
    spread.l += (v.l - mean.l) ** 2
    spread.a += (v.a - mean.a) ** 2
    spread.b += (v.b - mean.b) ** 2
  }
  spread.l = Math.sqrt(spread.l / values.length)
  spread.a = Math.sqrt(spread.a / values.length)
  spread.b = Math.sqrt(spread.b / values.length)
  const round = (o: Lab) => ({ l: +o.l.toFixed(1), a: +o.a.toFixed(1), b: +o.b.toFixed(1) })
  return { mean: round(mean), spread: round(spread) }
}

const src = summary(bandLabs(source, SRC_BAND))
const live = summary(bandLabs(capture, LIVE_BAND))
const dE = Math.hypot(src.mean.l - live.mean.l, src.mean.a - live.mean.a, src.mean.b - live.mean.b)
console.log(JSON.stringify({ deltaEMean: +dE.toFixed(2), source: src, live }))
console.log('comparison=regional Lab distribution over matched houses bands (not registered per-pixel)')
if (dE >= 10) {
  console.log(`FAIL: band-mean ΔE76 ${dE.toFixed(2)} >= 10 (locked palette tolerance)`)
  process.exitCode = 1
}
