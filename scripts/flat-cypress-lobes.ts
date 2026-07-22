/*
 * Source-first gate for the compound cypress. Original painting crop is left; the connected lobe
 * plan is right. If the right panel collapses to one spear, no 3D work is allowed to proceed.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCypressLobePlan,
  lobeIntervalsAt,
  type CypressLobeRows,
} from '../src/scene/cypressLobes.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = resolve(ROOT, 'reference/derived/cypress-lobe-gate.png')
const painting = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/cypress-work.png')))
const rows = JSON.parse(
  readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8'),
) as CypressLobeRows & { x0: number; y0: number }
const plan = buildCypressLobePlan(rows)

const allSections = plan.lobes.flatMap((lobe) => lobe.sections)
const cropLeft = Math.max(
  0,
  Math.floor(
    rows.x0 +
      Math.min(...allSections.map((section) => section.sourceCenter - section.sourceHalfWidth)) *
        (rows.width - 1),
  ) - 8,
)
const cropRight = Math.min(
  painting.width - 1,
  Math.ceil(
    rows.x0 +
      Math.max(...allSections.map((section) => section.sourceCenter + section.sourceHalfWidth)) *
        (rows.width - 1),
  ) + 8,
)
const cropTop = rows.y0
const cropBottom = Math.min(painting.height - 1, rows.y0 + rows.height - 1)
const panelWidth = cropRight - cropLeft + 1
const panelHeight = cropBottom - cropTop + 1
const gutter = 8
const outputWidth = panelWidth * 2 + gutter
const output = new Uint8Array(outputWidth * panelHeight * 4)
const colours: Record<string, readonly [number, number, number]> = {
  main: [21, 58, 45],
  'frond-1': [133, 72, 43],
  'frond-2': [45, 102, 76],
  'frond-3': [154, 91, 50],
  'frond-4': [39, 84, 63],
  'frond-5': [117, 61, 42],
}

for (let y = 0; y < panelHeight; y++) {
  const heightFraction = 1 - y / Math.max(1, panelHeight - 1)
  const intervals = lobeIntervalsAt(plan, heightFraction)
  for (let x = 0; x < outputWidth; x++) {
    const destination = (y * outputWidth + x) * 4
    if (x < panelWidth) {
      const source = ((cropTop + y) * painting.width + cropLeft + x) * 4
      output[destination] = painting.rgba[source]
      output[destination + 1] = painting.rgba[source + 1]
      output[destination + 2] = painting.rgba[source + 2]
    } else if (x < panelWidth + gutter) {
      output[destination] = 238
      output[destination + 1] = 184
      output[destination + 2] = 74
    } else {
      output[destination] = 8
      output[destination + 1] = 12
      output[destination + 2] = 18
      const sourceX = cropLeft + x - panelWidth - gutter
      for (const interval of intervals) {
        const left = rows.x0 + interval.left * (rows.width - 1)
        const right = rows.x0 + interval.right * (rows.width - 1)
        if (sourceX < left || sourceX > right) continue
        const rgb = colours[interval.lobeId] ?? [90, 90, 90]
        output[destination] = rgb[0]
        output[destination + 1] = rgb[1]
        output[destination + 2] = rgb[2]
      }
    }
    output[destination + 3] = 255
  }
}

writeFileSync(OUTPUT, encodePNG(outputWidth, panelHeight, output))
console.log(
  `lobe gate: ${plan.lobes.length} closed lobes (${plan.lobes.length - 1} source fronds), ` +
    `crop x=${cropLeft}..${cropRight}, y=${cropTop}..${cropBottom}\n` +
    `wrote ${OUTPUT} — original LEFT, lobe identities RIGHT. LOOK AT IT.`,
)
