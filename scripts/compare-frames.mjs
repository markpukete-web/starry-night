#!/usr/bin/env node
// Compare two PNG captures: identical or not, mean and max absolute RGB difference, the share of pixels that
// differ, and an optional amplified difference image. Optional crop `x,y,w,h` restricts the measure to a region.
//
//   node scripts/compare-frames.mjs a.png b.png [diff.png] [--crop x,y,w,h] [--gain 8]
//
// Exit 0 always; the caller reads the numbers. `identical` is the byte-exact test the gates use.
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePNG, encodePNG } from './lib/png.ts'

const args = process.argv.slice(2)
const files = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
if (files.length < 2) {
  console.error('usage: compare-frames.mjs a.png b.png [diff.png] [--crop x,y,w,h] [--gain 8]')
  process.exit(1)
}
const [aFile, bFile, diffFile] = files
const aBuf = readFileSync(aFile)
const bBuf = readFileSync(bFile)
const identical = aBuf.equals(bBuf)
const a = decodePNG(aBuf)
const b = decodePNG(bBuf)
if (a.width !== b.width || a.height !== b.height) {
  console.error(`size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`)
  process.exit(1)
}
const crop = opt('crop', null)
const [cx, cy, cw, ch] = crop ? crop.split(',').map(Number) : [0, 0, a.width, a.height]
if (!(cx >= 0 && cy >= 0 && cw > 0 && ch > 0 && cx + cw <= a.width && cy + ch <= a.height)) {
  console.error('crop outside the image')
  process.exit(1)
}
const gain = Number(opt('gain', 8))
let sum = 0
let max = 0
let differing = 0
const diff = diffFile ? new Uint8Array(a.width * a.height * 4) : null
for (let y = cy; y < cy + ch; y++) {
  for (let x = cx; x < cx + cw; x++) {
    const i = (y * a.width + x) * 4
    const d = (Math.abs(a.rgba[i] - b.rgba[i]) + Math.abs(a.rgba[i + 1] - b.rgba[i + 1]) + Math.abs(a.rgba[i + 2] - b.rgba[i + 2])) / 3
    sum += d
    if (d > max) max = d
    if (d > 0) differing++
    if (diff) {
      const v = Math.min(255, Math.round(d * gain))
      diff[i] = v
      diff[i + 1] = v
      diff[i + 2] = v
      diff[i + 3] = 255
    }
  }
}
const n = cw * ch
const report = {
  identical,
  crop: [cx, cy, cw, ch],
  meanAbsDiff: Number((sum / n).toFixed(4)),
  maxAbsDiff: Number(max.toFixed(2)),
  differingShare: Number((differing / n).toFixed(4)),
}
if (!Number.isFinite(report.meanAbsDiff)) {
  console.error('non-finite measure')
  process.exit(1)
}
if (diff) writeFileSync(diffFile, encodePNG(a.width, a.height, diff))
console.log(JSON.stringify(report))
