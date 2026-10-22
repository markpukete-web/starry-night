/** E3 — the cypress's medium: colour along the stroke (tasks/2026-10-22-cypress-e3-plan.md, E3.1, Codex F2 and F7). */

import assert from 'node:assert/strict'
import test from 'node:test'

import { sampleColours, TREE_TEXEL, type CypressRibbonSample, type RibbonRows } from '../src/scene/cypressStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

const W = 40
const H = 40
/** a painting: a brown band on the left half, a dark green band on the right, a sky stripe (rejected) across the middle rows */
const painting: ImageData2D = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H }
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const sky = y >= 18 && y < 22
    const [r, g, b] = sky ? [90, 130, 220] : x < W / 2 ? [92, 60, 30] : [20, 50, 30]
    painting.data[i] = r
    painting.data[i + 1] = g
    painting.data[i + 2] = b
    painting.data[i + 3] = 255
  }
}
const rows = { uv: [0, 0, 1, 1] as [number, number, number, number] }
/** a vertical ribbon down the left band, crossing the sky stripe */
const vertical = (x: number): CypressRibbonSample[] => Array.from({ length: 40 }, (_, k) => ({ px: x, py: (k + 0.5) / 40, inside: true }))
const legacy: [number, number, number] = [0.5, 0.5, 0.5]

test('C1 per-sample colours: each sample takes the accepted texel under it; a sample over the sky takes the nearest accepted along the ribbon; a ribbon with no accepted sample takes the legacy colour', () => {
  const colours = sampleColours(painting, rows, vertical(0.25), TREE_TEXEL, legacy, 0)
  assert.equal(colours.length, 40)
  for (let k = 0; k < 40; k++) {
    assert.ok(Math.abs(colours[k][0] - 92 / 255) < 1e-9 && Math.abs(colours[k][1] - 60 / 255) < 1e-9, `sample ${k} carries the brown band, sky samples filled from their neighbours`)
  }
  // a horizontal ribbon crossing from brown to green at the middle row: the colour steps at the band's edge
  const across: CypressRibbonSample[] = Array.from({ length: 40 }, (_, k) => ({ px: (k + 0.5) / 40, py: 0.25, inside: true }))
  const stepped = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 0)
  assert.ok(Math.abs(stepped[10][0] - 92 / 255) < 1e-9, 'brown on the left')
  assert.ok(Math.abs(stepped[30][1] - 50 / 255) < 1e-9, 'green on the right')
  // entirely over the sky: the legacy colour throughout
  const skyOnly: CypressRibbonSample[] = Array.from({ length: 10 }, (_, k) => ({ px: (k + 0.5) / 10, py: 0.5, inside: true }))
  assert.deepEqual(sampleColours(painting, rows, skyOnly, TREE_TEXEL, legacy, 0), Array.from({ length: 10 }, () => legacy))

  // the nearest side wins across a rejected run between two different bands: a ribbon down the sky stripe's rows
  // at the band edge, brown samples left of it, green right of it, sky between (code review F3: always the first
  // accepted sample passed the old fixture)
  const mixed: CypressRibbonSample[] = [
    { px: 0.25, py: 0.1, inside: true }, // brown
    { px: 0.25, py: 0.2, inside: true }, // brown
    { px: 0.3, py: 0.475, inside: true }, // sky
    { px: 0.5, py: 0.5, inside: true }, // sky
    { px: 0.7, py: 0.525, inside: true }, // sky
    { px: 0.75, py: 0.8, inside: true }, // green
    { px: 0.75, py: 0.9, inside: true }, // green
  ]
  const filled = sampleColours(painting, rows, mixed, TREE_TEXEL, legacy, 0)
  const brown = [92 / 255, 60 / 255, 30 / 255]
  const green = [20 / 255, 50 / 255, 30 / 255]
  const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
  assert.ok(same(filled[2], brown), 'the sky sample nearer the brown takes brown')
  assert.ok(same(filled[4], green), 'the sky sample nearer the green takes green')
  assert.ok(same(filled[3], brown), 'at a tie the earlier accepted sample wins')
  // rejected endpoints: filled from the nearest accepted inward
  const ends: CypressRibbonSample[] = [{ px: 0.5, py: 0.5, inside: true }, { px: 0.25, py: 0.1, inside: true }, { px: 0.75, py: 0.9, inside: true }, { px: 0.5, py: 0.5, inside: true }]
  const endsFilled = sampleColours(painting, rows, ends, TREE_TEXEL, legacy, 0)
  assert.ok(same(endsFilled[0], brown) && same(endsFilled[3], green), 'each rejected end takes its neighbour')
  // one accepted sample colours the whole ribbon
  const one: CypressRibbonSample[] = [{ px: 0.5, py: 0.5, inside: true }, { px: 0.75, py: 0.9, inside: true }, { px: 0.5, py: 0.5, inside: true }]
  assert.ok(sampleColours(painting, rows, one, TREE_TEXEL, legacy, 0).every((c) => same(c, green)))
})

test('C2 the smoothing: a box of ±k samples in linear RGB blends only at a band edge, leaves a uniform band untouched, and keeps the fill-before-smoothing order', () => {
  const across: CypressRibbonSample[] = Array.from({ length: 40 }, (_, k) => ({ px: (k + 0.5) / 40, py: 0.25, inside: true }))
  const sharp = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 0)
  const smooth = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 3)
  const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
  assert.ok(same(smooth[5], sharp[5]), 'inside the brown band: untouched')
  assert.ok(same(smooth[34], sharp[34]), 'inside the green band: untouched')
  const edge = smooth[20]
  assert.ok(edge[0] < sharp[19][0] && edge[0] > sharp[20][0], 'at the edge the red channel lies between the two bands')
  // monotone across the edge: no overshoot
  for (let k = 15; k < 25; k++) assert.ok(smooth[k][0] >= smooth[k + 1][0] - 1e-9, `red falls monotonically across the edge at ${k}`)
  // fill before smoothing: a sky sample inside the brown band is brown after smoothing, not a blend with blue
  const down = sampleColours(painting, rows, vertical(0.25), TREE_TEXEL, legacy, 3)
  for (let k = 17; k < 23; k++) assert.ok(Math.abs(down[k][2] - 30 / 255) < 1e-9, `no sky blue leaks into the band at ${k}`)

  // the exact linear-space mean at the edge (sample 20: three brown, four green in the ±3 window) and at a clipped
  // window (sample 0: four brown); an sRGB-space average differs by more than a thousandth
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const srgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  const expectedLinear = srgb((3 * lin(92 / 255) + 4 * lin(20 / 255)) / 7)
  const expectedSrgbAverage = (3 * 92 / 255 + 4 * 20 / 255) / 7
  assert.ok(Math.abs(smooth[20][0] - expectedLinear) < 1e-9, `the red channel at the edge is the linear mean (${smooth[20][0].toFixed(5)} vs ${expectedLinear.toFixed(5)})`)
  assert.ok(Math.abs(smooth[20][0] - expectedSrgbAverage) > 1e-3, 'and not the sRGB average')
  assert.ok(Math.abs(smooth[0][0] - 92 / 255) < 1e-9, 'a clipped window inside one band is that band')
  const edgeClipped = sampleColours(painting, rows, across.slice(18, 22), TREE_TEXEL, legacy, 3)
  // four samples: two brown, two green; every window holds all four
  const expectedHalf = srgb((2 * lin(92 / 255) + 2 * lin(20 / 255)) / 4)
  assert.ok(edgeClipped.every((c) => Math.abs(c[0] - expectedHalf) < 1e-9), 'a window clipped at both ends averages what it holds')
})

test('C4 the stroke body factory: the defaults reproduce the land\'s text exactly (E1 hashes unchanged), and the cypress\'s constants emit the coarse lane, sharpened lane and saturation', async () => {
  const { strokeGlsl, strokeGlslWith, STROKE_BODY_DEFAULTS, CYPRESS_STROKE_BODY } = await import('../src/scene/cypressStrokeShader.ts')
  const defaults = strokeGlslWith(STROKE_BODY_DEFAULTS)
  // E1's four committed fields (399a956), pinned by hash so the land's program text cannot drift (code review F4)
  const { createHash } = await import('node:crypto')
  const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
  const E1 = { vertexHead: 'ffb4ed4985f6ae92', vertexBody: 'd45ee1fe660fc282', fragmentHead: '44207e80a56eb3e1', fragmentBody: '48240ba5268eba4d' }
  for (const field of ['vertexHead', 'vertexBody', 'fragmentHead', 'fragmentBody'] as const) {
    assert.equal(hash(defaults[field]), E1[field], `${field} is E1's text`)
    assert.equal(hash(strokeGlsl[field]), E1[field], `strokeGlsl.${field} is E1's text`)
  }
  assert.ok(defaults.fragmentBody.includes('mix(0.86, 1.08, streak)') && defaults.fragmentBody.includes('1.0 + 0.35 * lit'), 'E1 and E2 literals')
  assert.ok(!defaults.fragmentBody.includes('lane2'), 'no coarse lane by default')
  const cypress = strokeGlslWith(CYPRESS_STROKE_BODY)
  assert.ok(cypress.fragmentBody.includes('mix(0.78, 1.14, ') && cypress.fragmentBody.includes('1.0 + 0.8 * lit'), 'the lane and the rake')
  assert.ok(cypress.fragmentBody.includes('lane2') && cypress.fragmentBody.includes('mix(streak, lane2.x, 0.33)'), 'the coarse lane')
  assert.ok(cypress.fragmentBody.includes('smoothstep(0.42 + 0.15 * load, 0.58 + 0.15 * load, streak)'), 'the sharpened drifting lane')
  assert.ok(cypress.fragmentBody.includes('mix(vec3(lum), col, 1.1)'), 'the cypress\'s saturation')
  // per-field isolation of the E4 paint fields is verified in C5 below; with only laneLow, laneHigh and rake kept from CYPRESS_STROKE_BODY, only those two lines differ from E1's defaults
  const plain = strokeGlslWith({ ...STROKE_BODY_DEFAULTS, laneLow: CYPRESS_STROKE_BODY.laneLow, laneHigh: CYPRESS_STROKE_BODY.laneHigh, rake: CYPRESS_STROKE_BODY.rake })
  const a = defaults.fragmentBody.split('\n')
  const b = plain.fragmentBody.split('\n')
  assert.equal(a.length, b.length)
  const differing = a.filter((line, i) => line !== b[i])
  assert.equal(differing.length, 2, `two lines differ: ${differing.join(' | ')}`)
})

test('C5 E4.1 the cypress paint fields: each field isolates cleanly with exact executable line counts, the stripped standalone and composed shaders carry the exact executable statements without sheen, and BrushCypress installs CYPRESS_STROKE_BODY', async () => {
  const { strokeGlslWith, STROKE_BODY_DEFAULTS, CYPRESS_STROKE_BODY } = await import('../src/scene/cypressStrokeShader.ts')
  const { injectAliveSource } = await import('../src/scene/aliveMaterial.ts')
  const { ShaderLib } = await import('three')
  const { createHash } = await import('node:crypto')
  const { readFileSync } = await import('node:fs')
  const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
  const E1_FRAG = '48240ba5268eba4d'

  const stripGlslComments = (glsl: string): string =>
    glsl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const execLines = (glsl: string): string[] =>
    stripGlslComments(glsl)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  const diffExecLines = (base: string[], next: string[]): { changed: number; added: number; removed: number } => {
    let i = 0
    let j = 0
    let changed = 0
    let added = 0
    let removed = 0
    while (i < base.length || j < next.length) {
      if (i < base.length && j < next.length && base[i] === next[j]) {
        i++
        j++
      } else if (i + 1 < base.length && j < next.length && base[i + 1] === next[j]) {
        removed++
        i++
      } else if (i < base.length && j + 1 < next.length && base[i] === next[j + 1]) {
        added++
        j++
      } else if (i < base.length && j < next.length) {
        changed++
        i++
        j++
      } else if (i < base.length) {
        removed++
        i++
      } else {
        added++
        j++
      }
    }
    return { changed, added, removed }
  }

  const defaults = strokeGlslWith(STROKE_BODY_DEFAULTS)
  assert.equal(hash(defaults.fragmentBody), E1_FRAG, 'defaults fragmentBody matches E1 hash')

  // F4: loadDrift without laneEdge emits no dead float load declaration
  const driftWithoutLaneEdge = strokeGlslWith({ ...STROKE_BODY_DEFAULTS, loadDrift: 0.15 })
  assert.equal(driftWithoutLaneEdge.fragmentBody, defaults.fragmentBody, 'loadDrift with null laneEdge leaves defaults unchanged')

  // Per-field isolation table derived from reading cypressStrokeShader.ts:
  // - tube (0.95): replaces tubeExpr on `float relief = ...` -> 1 changed, 0 added, 0 removed
  // - rim (1.0): replaces rimExpr on `float rim = ...` -> 1 changed, 0 added, 0 removed
  // - sheen (0): omits `col += pow(max(lit, 0.0), 3.0) * 0.06;` -> 0 changed, 0 added, 1 removed
  // - laneCycles (5.0): updates `vec2 lane1 = ...` and `float streakSlope = ...` -> 2 changed, 0 added, 0 removed
  // - loadDrift (0.15 on laneEdge [0.42, 0.58] fixture): adds `float load = ...` and shifts `smoothstep(...)` on `float bristle = ...` -> 1 changed, 1 added, 0 removed
  // - fray (0.16): appends frayFactor to `float r = ...` -> 1 changed, 0 added, 0 removed
  // - gaps ({ band: 0.7, below: 0.3 }): adds `if (y > 0.7 * r && streak < 0.3) discard;` -> 0 changed, 1 added, 0 removed
  // - dryFrom (0.55): updates `if (streak < smoothstep(0.55, 1.0, w) * 0.6) discard;` -> 1 changed, 0 added, 0 removed
  // - ridgeSide (0.15): updates `float lit = ...` -> 1 changed, 0 added, 0 removed
  // - ridgeSlope (0.5): updates `float lit = ...` -> 1 changed, 0 added, 0 removed
  // - rakeClamp ([0.4, 1.6]): wraps `1.0 + 0.35 * lit` in `clamp(..., 0.4, 1.6)` on `float rake = ...` -> 1 changed, 0 added, 0 removed
  const laneEdgeBase = { ...STROKE_BODY_DEFAULTS, laneEdge: [0.42, 0.58] as [number, number] }
  const fieldTable: {
    field: keyof typeof STROKE_BODY_DEFAULTS
    onVal: unknown
    base: typeof STROKE_BODY_DEFAULTS
    changed: number
    added: number
    removed: number
  }[] = [
    { field: 'tube', onVal: 0.95, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'rim', onVal: 1.0, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'sheen', onVal: 0, base: STROKE_BODY_DEFAULTS, changed: 0, added: 0, removed: 1 },
    { field: 'laneCycles', onVal: 5.0, base: STROKE_BODY_DEFAULTS, changed: 2, added: 0, removed: 0 },
    { field: 'loadDrift', onVal: 0.15, base: laneEdgeBase, changed: 1, added: 1, removed: 0 },
    { field: 'fray', onVal: 0.16, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'gaps', onVal: { band: 0.7, below: 0.3 }, base: STROKE_BODY_DEFAULTS, changed: 0, added: 1, removed: 0 },
    { field: 'dryFrom', onVal: 0.55, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'ridgeSide', onVal: 0.15, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'ridgeSlope', onVal: 0.5, base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
    { field: 'rakeClamp', onVal: [0.4, 1.6], base: STROKE_BODY_DEFAULTS, changed: 1, added: 0, removed: 0 },
  ]

  const cypress = strokeGlslWith(CYPRESS_STROKE_BODY)
  const cypressExec = execLines(cypress.fragmentBody)
  for (const { field, onVal, base, changed, added, removed } of fieldTable) {
    const baseShader = strokeGlslWith(base)
    const withOn = { ...base, [field]: onVal } as typeof STROKE_BODY_DEFAULTS
    const turnedOn = strokeGlslWith(withOn)
    const counts = diffExecLines(execLines(baseShader.fragmentBody), execLines(turnedOn.fragmentBody))
    assert.deepEqual(counts, { changed, added, removed }, `enabling ${String(field)} alone has exact executable line diff`)

    const restored = strokeGlslWith({ ...withOn, [field]: base[field] } as typeof STROKE_BODY_DEFAULTS)
    assert.equal(restored.fragmentBody, baseShader.fragmentBody, `restoring ${String(field)} restores base fragmentBody`)
    if (base === STROKE_BODY_DEFAULTS) {
      assert.equal(hash(restored.fragmentBody), E1_FRAG, `restoring ${String(field)} to default restores E1 hash`)
    }

    const turnedOffInCypress = strokeGlslWith({ ...CYPRESS_STROKE_BODY, [field]: STROKE_BODY_DEFAULTS[field] })
    const offCounts = diffExecLines(cypressExec, execLines(turnedOffInCypress.fragmentBody))
    assert.deepEqual(
      offCounts,
      { changed, added: removed, removed: added },
      `disabling ${String(field)} alone in CYPRESS_STROKE_BODY has exact reverse executable line diff`,
    )
  }

  assert.deepEqual(CYPRESS_STROKE_BODY.laneEdge, [0.42, 0.58], 'cypress laneEdge is narrowed to [0.42, 0.58]')

  const exactStatements = [
    'if (y > 0.7 * r && streak < 0.3) discard;',
    'float rake = clamp(1.0 + 0.8 * lit, 0.4, 1.6);',
    'float load = cyNoise1(w * 3.0 + seed * 1.3) - 0.5;',
    'float lit = (side * 0.15 - 0.5 * streakSlope) * facing;',
    'float bristle = mix(0.78, 1.14, smoothstep(0.42 + 0.15 * load, 0.58 + 0.15 * load, streak));',
    'float relief = 0.95 * rake;',
    'float rim = 1.0;',
    'if (streak < smoothstep(0.55, 1.0, w) * 0.6) discard;',
  ]
  const fraySuffix = ' * (0.84 + 0.16 * cyNoise1(w * 40.0 + seed * 3.0));'
  const expectedRLine = `float r = pow(max(1.0 - pow(x, 2.5), 0.0), 0.4) * mix(1.0, 0.72, w) * (0.9 + 0.1 * cyNoise1(w * 9.0 + seed))${fraySuffix}`

  for (const stmt of exactStatements) {
    assert.ok(cypressExec.includes(stmt), `stripped cypress fragmentBody includes executable statement: ${stmt}`)
  }
  const cypressRLine = cypressExec.find((line) => line.startsWith('float r = '))
  assert.equal(cypressRLine, expectedRLine, 'stripped cypress fragmentBody float r = line carries exact fray factor')
  const strippedCypressBody = stripGlslComments(cypress.fragmentBody)
  assert.ok(!strippedCypressBody.includes('pow(max(lit, 0.0), 3.0)'), 'stripped cypress fragmentBody omits wet sheen')
  assert.ok(!strippedCypressBody.includes('(0.86 + 0.12 * (1.0 - y * y))'), 'stripped cypress fragmentBody omits rounded tube shading')

  const composed = injectAliveSource(ShaderLib.basic.vertexShader, ShaderLib.basic.fragmentShader, {
    key: 'cypress-strokes',
    uniforms: {},
    ...cypress,
  })
  const composedExec = execLines(composed.fragmentShader)
  const strippedComposed = stripGlslComments(composed.fragmentShader)
  for (const stmt of exactStatements) {
    assert.ok(composedExec.includes(stmt), `stripped composed basic fragmentShader includes executable statement: ${stmt}`)
  }
  const composedRLine = composedExec.find((line) => line.startsWith('float r = '))
  assert.equal(composedRLine, expectedRLine, 'stripped composed basic fragmentShader float r = line carries exact fray factor')
  assert.ok(!strippedComposed.includes('pow(max(lit, 0.0), 3.0)'), 'stripped composed basic fragmentShader omits sheen')
  assert.ok(strippedComposed.indexOf('dFdx') < strippedComposed.indexOf('discard;'), 'derivatives precede first discard in stripped composed shader')

  const brushSource = readFileSync(new URL('../src/scene/BrushCypress.tsx', import.meta.url), 'utf8')
  assert.ok(stripGlslComments(brushSource).includes('strokeGlslWith(CYPRESS_STROKE_BODY)'), 'BrushCypress installs strokeGlslWith(CYPRESS_STROKE_BODY)')
})

test('C6 E4.2 sharper colour along the stroke: CYPRESS_RIBBON_CONFIG.colourSmoothing is 1, traceCypressRibbons honours config.colourSmoothing on a two-band fixture where ±1 and ±3 differ, and land configs emit no per-sample colours', async () => {
  const { CYPRESS_RIBBON_CONFIG, traceCypressRibbons } = await import('../src/scene/cypressStrokes.ts')
  const { LAND_RIBBON_CONFIG } = await import('../src/scene/landStrokes.ts')
  const { massConfig } = await import('../src/scene/landDomes.ts')

  assert.equal(CYPRESS_RIBBON_CONFIG.colourSmoothing, 1, 'cypress colourSmoothing is ±1 sample')
  assert.equal(CYPRESS_RIBBON_CONFIG.perSampleColours, true, 'cypress perSampleColours is enabled')

  const bandPainting: ImageData2D = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H }
  const horizFlow: ImageData2D = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const [r, g, b] = x < W / 2 ? [92, 60, 30] : [20, 50, 30]
      bandPainting.data[i] = r
      bandPainting.data[i + 1] = g
      bandPainting.data[i + 2] = b
      bandPainting.data[i + 3] = 255
      // straight horizontal flow (dx = +1, dy = 0, inside = 255) so walks cross the vertical band boundary at x = 0.5
      horizFlow.data[i] = 255
      horizFlow.data[i + 1] = 128
      horizFlow.data[i + 2] = 255
      horizFlow.data[i + 3] = 255
    }
  }
  const fixtureRows: RibbonRows = { width: W, height: H, uv: [0, 0, 1, 1], spans: [[0, 0, 1], [1, 0, 1]] }
  const traceCfg = { ...CYPRESS_RIBBON_CONFIG, step: 1 / (W - 1), minLength: 0.5, maxLength: 0.8, spireSeedWeight: 1, heading: 'continuous' as const }
  const ribbonsAtConfig = traceCypressRibbons(horizFlow, bandPainting, fixtureRows, 24, 42, traceCfg, TREE_TEXEL)
  const ribbonsAt3 = traceCypressRibbons(horizFlow, bandPainting, fixtureRows, 24, 42, { ...traceCfg, colourSmoothing: 3 }, TREE_TEXEL)
  assert.ok(ribbonsAtConfig.length > 0, 'traced ribbons on two-band fixture')

  let crossingDiffered = 0
  for (let r = 0; r < ribbonsAtConfig.length; r++) {
    const rib1 = ribbonsAtConfig[r]
    const rib3 = ribbonsAt3[r]
    const expected1 = sampleColours(bandPainting, fixtureRows, rib1.samples, TREE_TEXEL, rib1.colour, 1)
    assert.deepEqual(rib1.colours, expected1, `ribbon ${r} colours match ±1 smoothing from config`)
    const differsFrom3 = rib1.colours.some((c, k) => Math.abs(c[0] - rib3.colours[k][0]) > 1e-4)
    if (differsFrom3) crossingDiffered++
  }
  assert.ok(crossingDiffered > 0, 'at least one traced ribbon crosses the band edge and differs between ±1 and ±3')

  assert.equal(LAND_RIBBON_CONFIG.perSampleColours, false, 'land ground config keeps perSampleColours: false')
  const domeCfg = massConfig(horizFlow, 12)
  assert.equal(domeCfg.perSampleColours, false, 'land dome massConfig keeps perSampleColours: false')
  const groundRibbons = traceCypressRibbons(horizFlow, bandPainting, fixtureRows, 8, 42, LAND_RIBBON_CONFIG, TREE_TEXEL)
  const domeRibbons = traceCypressRibbons(horizFlow, bandPainting, fixtureRows, 8, 42, domeCfg, TREE_TEXEL)
  assert.ok(groundRibbons.length > 0 && groundRibbons.every((r) => r.colours.length === 0), 'land ground trace returns no per-sample colours')
  assert.ok(domeRibbons.length > 0 && domeRibbons.every((r) => r.colours.length === 0), 'land dome trace returns no per-sample colours')
})
