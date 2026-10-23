/*
 * The street's palette gate (S1 task 7).
 *
 * Compares the street render's mean Lab per class under its ID pass mask against references:
 *   - walls: mean of wallA, wallB and plaster in _work-painting.png over STREET_SOURCES
 *   - roofs: mean of roofStriped, roofBlue and roofSienna over STREET_SOURCES
 *   - ground: mean of field over STREET_SOURCES
 *   - path: mean of field mixed toward PATH_LIFT.toward by PATH_LIFT.share in linear sRGB, the build's own lift
 *   - trees: mean of TREE_CURLS, the painting's curled tree the street's trees take every pigment from (pass 6)
 *   - windows: mean of STREET_SOURCES.windowLit, the painting's window dabs a lit window is painted in (pass 5)
 *   - fog: PALETTE.skyHorizon
 *
 * Usage:
 *   node scripts/check-street-colour.ts <dir> --station S --viewport V [--control=cyan]
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PALETTE } from '../src/scene/palette.ts'
import { PATH_LIFT, STREET_SOURCES } from '../src/scene/streetStrokes.ts'
import { TREE_CURLS } from '../src/scene/streetTrees.ts'
import palette from '../public/reference/palette.json' with { type: 'json' }
import { decodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')

const args = process.argv.slice(2)
const dirArg = args.find((a) => !a.startsWith('--'))
const opt = (name: string, fallback: string = ''): string => {
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && i + 1 < args.length) return args[i + 1]
  const prefix = `--${name}=`
  const match = args.find((a) => a.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const station = opt('station', '0')
const viewport = opt('viewport', 'desktop')
const control = opt('control', '')
const sources = args.includes('--sources')
const fullPrefixOpt = opt('full-prefix', '')
const idsPrefixOpt = opt('ids-prefix', '')

if (!dirArg) {
  console.error('Usage: check-street-colour.ts <dir> --station S --viewport V [--sources] [--control=cyan]')
  process.exit(1)
}

const dir = resolve(process.cwd(), dirArg)

function findFile(basePrefix: string, extensions: string[]): string | null {
  for (const ext of extensions) {
    const candidate = resolve(dir, `${basePrefix}${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return null
}

const fullPrefix = fullPrefixOpt || `full-s${station}-${viewport}`
const idsPrefix = idsPrefixOpt || (sources ? `ids2-s${station}-${viewport}` : `ids-s${station}-${viewport}`)

const fullPngPath = findFile(fullPrefix, ['-t5.png', '.png'])
const fullJsonPath = findFile(fullPrefix, ['-frames.json', '.json'])
const idsPngPath = findFile(idsPrefix, ['-t5.png', '.png'])
const idsJsonPath = findFile(idsPrefix, ['-frames.json', '.json'])

if (!fullPngPath || !fullJsonPath || !idsPngPath || !idsJsonPath) {
  console.error(`Missing input files in ${dir}:`)
  if (!fullPngPath) console.error(`  full PNG: ${fullPrefix}{ -t5.png, .png }`)
  if (!fullJsonPath) console.error(`  full JSON: ${fullPrefix}{ -frames.json, .json }`)
  if (!idsPngPath) console.error(`  ids PNG: ${idsPrefix}{ -t5.png, .png }`)
  if (!idsJsonPath) console.error(`  ids JSON: ${idsPrefix}{ -frames.json, .json }`)
  process.exit(1)
}

const fullMeta = JSON.parse(readFileSync(fullJsonPath, 'utf8'))
const idsMeta = JSON.parse(readFileSync(idsJsonPath, 'utf8'))

function cleanUrl(u: string): string {
  return u
    .replace(/([?&])ids=\d+(&|$)/, (_, sep, end) => (end === '&' ? sep : ''))
    .replace(/([?&])fogColour=[^&]+(&|$)/, (_, sep, end) => (end === '&' ? sep : ''))
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?')
}

// Validation: URLs (less &ids=1), viewports, times
if (cleanUrl(fullMeta.url) !== cleanUrl(idsMeta.url)) {
  console.error(`FAIL: URLs differ (ignoring &ids=1): full "${fullMeta.url}" vs ids "${idsMeta.url}"`)
  process.exit(1)
}

if (
  fullMeta.viewport?.width !== idsMeta.viewport?.width ||
  fullMeta.viewport?.height !== idsMeta.viewport?.height ||
  Boolean(fullMeta.viewport?.mobile) !== Boolean(idsMeta.viewport?.mobile)
) {
  console.error(`FAIL: Viewports differ: full ${JSON.stringify(fullMeta.viewport)} vs ids ${JSON.stringify(idsMeta.viewport)}`)
  process.exit(1)
}

if (JSON.stringify(fullMeta.times) !== JSON.stringify(idsMeta.times)) {
  console.error(`FAIL: Times differ: full ${JSON.stringify(fullMeta.times)} vs ids ${JSON.stringify(idsMeta.times)}`)
  process.exit(1)
}

const fullPng = decodePNG(readFileSync(fullPngPath))
const idsPng = decodePNG(readFileSync(idsPngPath))

if (fullPng.width !== idsPng.width || fullPng.height !== idsPng.height) {
  console.error(`FAIL: Dimensions differ: full ${fullPng.width}x${fullPng.height} vs ids ${idsPng.width}x${idsPng.height}`)
  process.exit(1)
}

const W = fullPng.width
const H = fullPng.height
const totalPixels = W * H

type Lab = { l: number; a: number; b: number }

function linear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linToLab(r: number, g: number, b: number): Lab {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (val: number) => (val > 216 / 24389 ? Math.cbrt(val) : (24389 / 27) * val / 116 + 16 / 116)
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) }
}

function srgbToLab(r: number, g: number, b: number): Lab {
  return linToLab(linear(r), linear(g), linear(b))
}

function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b)
}

// Work painting
const paintingPath = resolve(ROOT, 'reference/derived/_work-painting.png')
const workPainting = decodePNG(readFileSync(paintingPath))

function rectLabs(img: typeof workPainting, rect: readonly [number, number, number, number]): Lab[] {
  const out: Lab[] = []
  const [x0, y0, x1, y1] = rect
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4
      out.push(srgbToLab(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]))
    }
  }
  return out
}

function meanLab(labs: Lab[]): Lab {
  let l = 0, a = 0, b = 0
  for (const v of labs) {
    l += v.l
    a += v.a
    b += v.b
  }
  return { l: l / labs.length, a: a / labs.length, b: b / labs.length }
}

function regionWeightedMeanLab(regionName: string): Lab {
  const reg = (palette.regions as Record<string, { colours: { lab: number[]; weight: number }[] }>)[regionName]
  let l = 0, a = 0, b = 0, totalW = 0
  for (const c of reg.colours) {
    l += c.lab[0] * c.weight
    a += c.lab[1] * c.weight
    b += c.lab[2] * c.weight
    totalW += c.weight
  }
  return { l: l / totalW, a: a / totalW, b: b / totalW }
}

// References
const refWalls = meanLab([
  ...rectLabs(workPainting, STREET_SOURCES.wallA),
  ...rectLabs(workPainting, STREET_SOURCES.wallB),
  ...rectLabs(workPainting, STREET_SOURCES.plaster),
])

const refRoofs = meanLab([
  ...rectLabs(workPainting, STREET_SOURCES.roofStriped),
  ...rectLabs(workPainting, STREET_SOURCES.roofBlue),
  ...rectLabs(workPainting, STREET_SOURCES.roofSienna),
])

const refGround = meanLab(rectLabs(workPainting, STREET_SOURCES.field))

const pathLabs: Lab[] = []
// the build's own lift (Fable R12: the share was hard-coded at 0.35 after pass 5 set 0.12)
const crestR = parseInt(PATH_LIFT.toward.slice(1, 3), 16)
const crestG = parseInt(PATH_LIFT.toward.slice(3, 5), 16)
const crestB = parseInt(PATH_LIFT.toward.slice(5, 7), 16)
const keep = 1 - PATH_LIFT.share
const linCrestR = linear(crestR), linCrestG = linear(crestG), linCrestB = linear(crestB)
const [fx0, fy0, fx1, fy1] = STREET_SOURCES.field
for (let y = fy0; y < fy1; y++) {
  for (let x = fx0; x < fx1; x++) {
    const i = (y * workPainting.width + x) * 4
    pathLabs.push(
      linToLab(
        keep * linear(workPainting.rgba[i]) + PATH_LIFT.share * linCrestR,
        keep * linear(workPainting.rgba[i + 1]) + PATH_LIFT.share * linCrestG,
        keep * linear(workPainting.rgba[i + 2]) + PATH_LIFT.share * linCrestB,
      ),
    )
  }
}
const refPath = meanLab(pathLabs)

const refTrees = meanLab(rectLabs(workPainting, TREE_CURLS))
const refWindows = meanLab(rectLabs(workPainting, STREET_SOURCES.windowLit))

const fogR = parseInt(PALETTE.skyHorizon.slice(1, 3), 16)
const fogG = parseInt(PALETTE.skyHorizon.slice(3, 5), 16)
const fogB = parseInt(PALETTE.skyHorizon.slice(5, 7), 16)
const refFog = srgbToLab(fogR, fogG, fogB)

// Source references
const refWallA = meanLab(rectLabs(workPainting, STREET_SOURCES.wallA))
const refWallB = meanLab(rectLabs(workPainting, STREET_SOURCES.wallB))
const refPlaster = meanLab(rectLabs(workPainting, STREET_SOURCES.plaster))
const refRoofStriped = meanLab(rectLabs(workPainting, STREET_SOURCES.roofStriped))
const refRoofBlue = meanLab(rectLabs(workPainting, STREET_SOURCES.roofBlue))
const refRoofSienna = meanLab(rectLabs(workPainting, STREET_SOURCES.roofSienna))

const SOURCES: Record<string, { idR: number; idG: number; idB: number; ref: Lab }> = {
  wallA: { idR: 255, idG: 0, idB: 0, ref: refWallA },
  wallB: { idR: 0, idG: 255, idB: 0, ref: refWallB },
  plaster: { idR: 0, idG: 0, idB: 255, ref: refPlaster },
  roofStriped: { idR: 255, idG: 255, idB: 0, ref: refRoofStriped },
  roofBlue: { idR: 0, idG: 255, idB: 255, ref: refRoofBlue },
  roofSienna: { idR: 255, idG: 0, idB: 255, ref: refRoofSienna },
}

// Palette regional means
const diagVillage = regionWeightedMeanLab('village')
const diagHills = regionWeightedMeanLab('hills')
const diagCypress = regionWeightedMeanLab('cypress')

type ClassDef = {
  idR: number
  idG: number
  idB: number
  minArea: number
  ref: Lab | null
  diag: Lab | null
}

const CLASSES: Record<string, ClassDef> = {
  walls: { idR: 255, idG: 0, idB: 0, minArea: 2000, ref: refWalls, diag: diagVillage },
  roofs: { idR: 0, idG: 255, idB: 0, minArea: 2000, ref: refRoofs, diag: diagVillage },
  ground: { idR: 255, idG: 255, idB: 0, minArea: 2000, ref: refGround, diag: diagHills },
  path: { idR: 0, idG: 255, idB: 255, minArea: 1000, ref: refPath, diag: diagHills },
  trees: { idR: 255, idG: 0, idB: 255, minArea: 1000, ref: refTrees, diag: diagCypress },
  fog: { idR: 255, idG: 255, idB: 255, minArea: 1000, ref: refFog, diag: null },
  windows: { idR: 0, idG: 0, idB: 255, minArea: 100, ref: refWindows, diag: null },
}

if (sources) {
  const maskIndices: Record<string, number[]> = {
    wallA: [],
    wallB: [],
    plaster: [],
    roofStriped: [],
    roofBlue: [],
    roofSienna: [],
  }

  for (let i = 0; i < totalPixels; i++) {
    const o = i * 4
    const r = idsPng.rgba[o]
    const g = idsPng.rgba[o + 1]
    const b = idsPng.rgba[o + 2]
    if (r === 255 && g === 0 && b === 0) maskIndices.wallA.push(i)
    else if (r === 0 && g === 255 && b === 0) maskIndices.wallB.push(i)
    else if (r === 0 && g === 0 && b === 255) maskIndices.plaster.push(i)
    else if (r === 255 && g === 255 && b === 0) maskIndices.roofStriped.push(i)
    else if (r === 0 && g === 255 && b === 255) maskIndices.roofBlue.push(i)
    else if (r === 255 && g === 0 && b === 255) maskIndices.roofSienna.push(i)
  }

  const fullRgba = new Uint8Array(fullPng.rgba)
  if (control === 'cyan') {
    for (const indices of Object.values(maskIndices)) {
      const nToCyan = Math.floor(indices.length * 0.4)
      for (let k = 0; k < nToCyan; k++) {
        const o = indices[k] * 4
        fullRgba[o] = 0
        fullRgba[o + 1] = 255
        fullRgba[o + 2] = 255
      }
    }
  }

  const failures: string[] = []
  console.log(`Street colour check: station ${station}, viewport ${viewport} (sources)${control ? ` (control: ${control})` : ''}`)
  console.log(`Files: full="${fullPngPath}", ids="${idsPngPath}"`)

  for (const [name, def] of Object.entries(SOURCES)) {
    const indices = maskIndices[name]
    const area = indices.length
    if (area < 2000) {
      console.log(`  ${name.padEnd(12)}: not in view (${area} px)`)
      continue
    }

    let sumL = 0, sumA = 0, sumB = 0
    for (const idx of indices) {
      const o = idx * 4
      const lab = srgbToLab(fullRgba[o], fullRgba[o + 1], fullRgba[o + 2])
      sumL += lab.l
      sumA += lab.a
      sumB += lab.b
    }
    const mean: Lab = { l: sumL / area, a: sumA / area, b: sumB / area }
    const dE = deltaE76(mean, def.ref)

    if (dE >= 10) {
      failures.push(`${name}: ΔE76 ${dE.toFixed(2)} >= 10`)
      console.log(`  ${name.padEnd(12)}: FAIL ΔE76 ${dE.toFixed(2)} (area ${area} px, mean Lab [${mean.l.toFixed(1)}, ${mean.a.toFixed(1)}, ${mean.b.toFixed(1)}])`)
    } else {
      console.log(`  ${name.padEnd(12)}: PASS ΔE76 ${dE.toFixed(2)} < 10 (area ${area} px, mean Lab [${mean.l.toFixed(1)}, ${mean.a.toFixed(1)}, ${mean.b.toFixed(1)}])`)
    }
  }

  if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`)
    process.exit(1)
  } else {
    console.log('PASS: all in-view sources meet ΔE76 < 10')
  }
} else {
  // Find pixel indices for each class
  const maskIndices: Record<string, number[]> = {
    walls: [],
    roofs: [],
    windows: [],
    ground: [],
    path: [],
    trees: [],
    fog: [],
  }

  for (let i = 0; i < totalPixels; i++) {
    const o = i * 4
    const r = idsPng.rgba[o]
    const g = idsPng.rgba[o + 1]
    const b = idsPng.rgba[o + 2]
    if (r === 255 && g === 0 && b === 0) maskIndices.walls.push(i)
    else if (r === 0 && g === 255 && b === 0) maskIndices.roofs.push(i)
    else if (r === 0 && g === 0 && b === 255) maskIndices.windows.push(i)
    else if (r === 255 && g === 255 && b === 0) maskIndices.ground.push(i)
    else if (r === 0 && g === 255 && b === 255) maskIndices.path.push(i)
    else if (r === 255 && g === 0 && b === 255) maskIndices.trees.push(i)
    else if (r === 255 && g === 255 && b === 255) maskIndices.fog.push(i)
  }

  // Full image copy in case of control
  const fullRgba = new Uint8Array(fullPng.rgba)
  if (control === 'cyan') {
    for (const indices of Object.values(maskIndices)) {
      const nToCyan = Math.floor(indices.length * 0.4)
      for (let k = 0; k < nToCyan; k++) {
        const o = indices[k] * 4
        fullRgba[o] = 0
        fullRgba[o + 1] = 255
        fullRgba[o + 2] = 255
      }
    }
  }

  const failures: string[] = []
  console.log(`Street colour check: station ${station}, viewport ${viewport}${control ? ` (control: ${control})` : ''}`)
  console.log(`Files: full="${fullPngPath}", ids="${idsPngPath}"`)

  for (const [name, def] of Object.entries(CLASSES)) {
    const indices = maskIndices[name]
    const area = indices.length
    if (area < def.minArea) {
      failures.push(`${name}: area ${area} px < minimum ${def.minArea} px`)
      console.log(`  ${name.padEnd(8)}: FAIL area ${area} px < min ${def.minArea} px`)
      continue
    }

    let sumL = 0, sumA = 0, sumB = 0
    for (const idx of indices) {
      const o = idx * 4
      const lab = srgbToLab(fullRgba[o], fullRgba[o + 1], fullRgba[o + 2])
      sumL += lab.l
      sumA += lab.a
      sumB += lab.b
    }
    const mean: Lab = { l: sumL / area, a: sumA / area, b: sumB / area }

    const dE = deltaE76(mean, def.ref!)
    const diagDE = def.diag ? deltaE76(mean, def.diag) : null
    const diagStr = diagDE !== null ? ` (diag to palette: ${diagDE.toFixed(2)})` : ''

    if (dE >= 10) {
      failures.push(`${name}: ΔE76 ${dE.toFixed(2)} >= 10`)
      console.log(`  ${name.padEnd(8)}: FAIL ΔE76 ${dE.toFixed(2)} (area ${area} px, mean Lab [${mean.l.toFixed(1)}, ${mean.a.toFixed(1)}, ${mean.b.toFixed(1)}])${diagStr}`)
    } else {
      console.log(`  ${name.padEnd(8)}: PASS ΔE76 ${dE.toFixed(2)} < 10 (area ${area} px, mean Lab [${mean.l.toFixed(1)}, ${mean.a.toFixed(1)}, ${mean.b.toFixed(1)}])${diagStr}`)
    }
  }

  if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`)
    process.exit(1)
  } else {
    console.log('PASS: all classes meet minimum area and ΔE76 < 10')
  }
}
