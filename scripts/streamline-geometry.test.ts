import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import { SWIRLS } from '../src/scene/skySwirls.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

function image(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
}

/**
 * Pre-FILLED blue-sky painting with a mask hole column on the left (the old 2D cypress
 * cut-out). Since the offline inpaint pipeline (docs/decisions/0003-inpaint-extend.md) the
 * painting handed to the 3D builder already carries real sky in the holes — the runtime's job
 * is only to keep seeding ribbons there. (The old donor/fill-grid heuristics and their tests
 * are replaced by scripts/inpaint.test.ts.)
 */
function holeScene(width = 64, height = 64) {
  const painting = image(width, height, [40, 90, 180, 255])
  const mask = image(width, height, [255, 255, 255, 255])
  const holeW = Math.floor(width / 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= holeW; x++) {
      mask.data[(y * width + x) * 4] = x === holeW ? 80 : 0
    }
  }
  return { painting, mask, holeW }
}

test('source streamline builder is deterministic', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const a = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  })
  const b = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  })
  assert.deepEqual(a, b)
  assert.ok(a.vertices.length > 0)
  assert.ok(a.indices.length > 0)
})

test('source streamline vertices stay close to image UV bounds', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 16,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 456,
  })
  for (const vertex of built.vertices) {
    assert.ok(vertex.u >= -0.02 && vertex.u <= 1.02)
    assert.ok(vertex.v >= -0.02 && vertex.v <= 1.02)
  }
})

test('ribbons seed inside mask holes when openSkyBandV is set, wearing the filled painting', () => {
  const { painting, mask, holeW } = holeScene()
  const flow = image(64, 64, [255, 128, 255, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 789,
    openSkyBandV: 1,
  })
  assert.ok(built.vertices.length > 0)
  // the hole column must be churned over (the fill is real sky now, not a dead patch)
  const holeU = holeW / 64
  assert.ok(
    built.vertices.some((vertex) => vertex.u < holeU * 0.9),
    'some ribbon vertices should lie inside the old cut-out column',
  )
  for (const vertex of built.vertices) {
    const [r, , b] = vertex.color
    assert.ok(b > r, `ribbon colour should be the painting's sky, got rgb ${vertex.color.join(',')}`)
  }
})

/**
 * S4 side-extension composite: [strip | canvas | strip] with distinctively darker-blue strips,
 * as PaintingFlowSky3D stitches from sky-extend-{left,right}.png. The mask stays canvas-sized.
 */
function sideExtendScene(width = 64, height = 64, pad = 16) {
  const compW = width + 2 * pad
  const composite = image(compW, height, [40, 90, 180, 255])
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < compW; x++) {
      if (x >= pad && x < pad + width) continue
      const p = (y * compW + x) * 4
      composite.data[p] = 10
      composite.data[p + 1] = 40
      composite.data[p + 2] = 120
    }
  }
  const flow = image(compW, height, [255, 128, 255, 255])
  const mask = image(width, height, [255, 255, 255, 255])
  return { composite, flow, mask, uPad: pad / width }
}

test('uPad 0 is byte-identical to the pre-S4 builder', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const opts = {
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  }
  assert.deepEqual(buildSourceStreamlineRibbons({ ...opts, uPad: 0 }), buildSourceStreamlineRibbons(opts))
})

test('with uPad ribbons seed in the side strips and emit painting-space u', () => {
  const { composite, flow, mask, uPad } = sideExtendScene()
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: composite,
    count: 120,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 42,
    openSkyBandV: 1,
    uPad,
  })
  assert.ok(built.vertices.length > 0)
  const outside = built.vertices.filter((vertex) => vertex.u < -0.03 || vertex.u > 1.03)
  assert.ok(outside.length > 0, 'some ribbons should live in the side strips')
  for (const vertex of built.vertices) {
    assert.ok(vertex.u >= -uPad - 0.02 && vertex.u <= 1 + uPad + 0.02, `paintU out of extended bounds: ${vertex.u}`)
  }
  // strip vertices carry the STRIP's paint (sampled from the composite, not the canvas)
  const deepStrip = built.vertices.filter((vertex) => vertex.u < -0.06)
  assert.ok(deepStrip.length > 0)
  for (const vertex of deepStrip) {
    assert.ok(vertex.color[2] < 0.6, `strip vertex should wear the strip's darker blue, got b=${vertex.color[2]}`)
  }
})

test('with uPad but without openSkyBandV the strips stay unseeded (2D contract)', () => {
  const { composite, flow, mask, uPad } = sideExtendScene()
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: composite,
    count: 120,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 42,
    uPad,
  })
  const outside = built.vertices.filter((vertex) => vertex.u < -0.03 || vertex.u > 1.03).length
  assert.ok(outside / Math.max(1, built.vertices.length) < 0.1, `only trail drift may exit the canvas, got ${outside}`)
})

test('without openSkyBandV (2D routes) mask holes stay unseeded', () => {
  const { painting, mask, holeW } = holeScene()
  const flow = image(64, 64, [255, 128, 255, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 789,
  })
  assert.ok(built.vertices.length > 0)
  // seeds start outside the hole (trails may drift across; seeding must not START in it) —
  // approximate by requiring the vast majority of vertices to sit outside the column
  const holeU = (holeW / 64) * 0.9
  const inside = built.vertices.filter((vertex) => vertex.u < holeU).length
  assert.ok(inside / built.vertices.length < 0.1, `only trail drift may enter the hole, got ${inside}/${built.vertices.length}`)
})

// ── Moving-sky builder options (feat/sky-choice, plan scratch/sky-choice-2026-10-11/plan-v2.md) ──

type BuildOptions = Parameters<typeof buildSourceStreamlineRibbons>[0]
type Built = ReturnType<typeof buildSourceStreamlineRibbons>

/**
 * T2 golden fixture, a byte-for-byte port of scratch/sky-choice-2026-10-11/golden/ramp-scene.mjs.
 * Asymmetric colour ramp (so a colour-sampling error shows), varied flow direction, and side strips
 * (uPad 0.25) with their own blue, as the shipping diorama sky builds them.
 */
function rampScene(): BuildOptions {
  const W = 48
  const H = 48
  const pad = 12
  const compW = W + 2 * pad
  const painting = image(compW, H, [0, 0, 0, 0])
  const flow = image(compW, H, [0, 0, 0, 0])
  const mask = image(W, H, [255, 255, 255, 255])
  for (let y = 0; y < H; y++)
    for (let x = 0; x < compW; x++) {
      const i = (y * compW + x) * 4
      const strip = x < pad || x >= pad + W
      painting.data.set([Math.round((255 * x) / (compW - 1)), Math.round((255 * y) / (H - 1)), strip ? 220 : 60, 255], i)
      const angle = 0.9 * (x / (compW - 1))
      flow.data.set([Math.round(((Math.cos(angle) + 1) / 2) * 255), Math.round(((Math.sin(angle) + 1) / 2) * 255), 128, 255], i)
    }
  return {
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 16,
    stepSize: 0.02,
    seed: 123,
    openSkyBandV: 0.62,
    uPad: pad / W,
    trailMaxV: 0.7,
  }
}

/** A 64×64 field flowing +x left of u = 0.5 and along `right` (image axes, y down) from there on. */
function splitScene(right: [number, number]): BuildOptions {
  const size = 64
  const flow = image(size, size, [255, 128, 128, 255])
  const enc = (d: number) => Math.round(((d + 1) / 2) * 255)
  for (let y = 0; y < size; y++)
    for (let x = size / 2; x < size; x++) flow.data.set([enc(right[0]), enc(right[1]), 128, 255], (y * size + x) * 4)
  return {
    flowData: flow,
    maskData: image(size, size, [255, 255, 255, 255]),
    paintingData: image(size, size, [40, 90, 180, 255]),
    count: 200,
    strokeWidth: 0.004,
    points: 16,
    stepSize: 0.01,
    seed: 123,
  }
}

/** Ribbons as [start, end) vertex ranges. A ribbon starts at its first point's across-0 vertex. */
function ribbonRanges(out: Built): [number, number][] {
  const starts = out.vertices.flatMap((v, i) => (v.len === 0 && v.across === 0 ? [i] : []))
  return starts.map((s, k) => [s, starts[k + 1] ?? out.vertices.length])
}

/** Centreline points of one ribbon: the mean of each vertex pair (the width is symmetric). */
function centreline(out: Built, [s, e]: [number, number]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = s; i < e; i += 2) pts.push([(out.vertices[i].u + out.vertices[i + 1].u) / 2, (out.vertices[i].v + out.vertices[i + 1].v) / 2])
  return pts
}

/** Cosine of the turn between each pair of consecutive centreline segments. */
function turnCosines(pts: [number, number][]): number[] {
  const out: number[] = []
  for (let k = 2; k < pts.length; k++) {
    const a = [pts[k - 1][0] - pts[k - 2][0], pts[k - 1][1] - pts[k - 2][1]]
    const b = [pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]
    out.push((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1])))
  }
  return out
}

test('T1 unset moving-sky options equal their explicit defaults', () => {
  const { painting, mask } = holeScene()
  const hole: BuildOptions = {
    flowData: image(64, 64, [255, 128, 255, 255]),
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 123,
    openSkyBandV: 1,
  }
  for (const opts of [hole, rampScene()]) {
    assert.deepEqual(buildSourceStreamlineRibbons(opts), buildSourceStreamlineRibbons({ ...opts, maxTurnCos: undefined, minPoints: 3, colourPerRibbon: false, smoothTrail: false }))
  }
})

test('T2 default build is byte-identical to base c20d8b1 on the ramp scene', () => {
  // Golden from a clean `git archive c20d8b1` export: scratch/sky-choice-2026-10-11/golden/golden.raw.txt
  // (Lead), reproduced independently by the Worker and the Reviewer on 2026-10-11.
  const out = buildSourceStreamlineRibbons(rampScene())
  assert.equal(createHash('sha256').update(JSON.stringify(out)).digest('hex'), '0da6971aa6bc79df2478ea450251d0ecf504b4ef990dc317bfd885f61fa95095')
})

test('T3a maxTurnCos ends a trail before any turn sharper than the limit', () => {
  const out = buildSourceStreamlineRibbons({ ...splitScene([0, 1]), maxTurnCos: 0.5 })
  const ribbons = ribbonRanges(out).map((r) => centreline(out, r))
  for (const pts of ribbons) for (const c of turnCosines(pts)) assert.ok(c >= 0.5 - 1e-9, `kept a turn with cos ${c}`)
  assert.ok(ribbons.some((pts) => pts.length >= 3 && pts[0][0] < 0.45), 'no left-seeded prefix survived')
})

test('T3b without maxTurnCos the same field keeps the sharp turn (positive control)', () => {
  const out = buildSourceStreamlineRibbons(splitScene([0, 1]))
  const ribbons = ribbonRanges(out).map((r) => centreline(out, r))
  assert.ok(ribbons.some((pts) => turnCosines(pts).some((c) => c < 0.5)))
})

test('T3c maxTurnCos keeps a turn gentler than the limit', () => {
  const out = buildSourceStreamlineRibbons({ ...splitScene([Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]), maxTurnCos: 0.5 })
  const ribbons = ribbonRanges(out).map((r) => centreline(out, r))
  assert.ok(ribbons.some((pts) => turnCosines(pts).some((c) => c > 0.5 && c < 0.99)))
})

test('T3d the flip correction runs before the turn cutoff', () => {
  const out = buildSourceStreamlineRibbons({ ...splitScene([-1, 0]), maxTurnCos: 0.5 })
  const outsideSwirls = ([u, v]: [number, number]) => SWIRLS.every(([su, sv, , sr]) => Math.hypot(u - su, v - sv) >= sr * 1.5)
  const crossed = ribbonRanges(out)
    .map((r) => centreline(out, r))
    .filter((pts) => pts[0][0] < 0.45)
    .filter((pts) => {
      const at = pts.findIndex(([u]) => u >= 0.5)
      return at >= 0 && outsideSwirls(pts[at]) && pts.filter(([u]) => u > 0.5).length >= 2
    })
  assert.ok(crossed.length > 0, 'no left-seeded ribbon continued across the reversal')
})

test('T4 minPoints drops ribbons by realised length, leaving the rest unchanged', () => {
  const opts = { ...rampScene(), trailMaxV: 0.5 }
  const all = buildSourceStreamlineRibbons(opts)
  const lengths = ribbonRanges(all).map(([s, e]) => (e - s) / 2)
  assert.ok(lengths.includes(7) && lengths.includes(8), `fixture must hold both sides of the boundary: ${lengths}`)
  const expected: Built = { vertices: [], indices: [] }
  for (const [s, e] of ribbonRanges(all)) {
    const m = (e - s) / 2
    if (m < 8) continue
    const base = expected.vertices.length
    expected.vertices.push(...all.vertices.slice(s, e))
    for (let k = 0; k < m - 1; k++) {
      const v0 = base + k * 2
      expected.indices.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
    }
  }
  assert.deepEqual(buildSourceStreamlineRibbons({ ...opts, minPoints: 8 }), expected)
})

test('T5 colourPerRibbon gives each ribbon the composite-space colour at its middle point', () => {
  const plain = buildSourceStreamlineRibbons(rampScene())
  const single = buildSourceStreamlineRibbons({ ...rampScene(), colourPerRibbon: true })
  const strip = ({ u }: { u: number }) => u < 0 || u > 1
  assert.ok(plain.vertices.some(strip), 'fixture must keep a side-strip ribbon')
  assert.deepEqual(single.indices, plain.indices)
  const shape = (v: Built['vertices'][number]) => [v.u, v.v, v.len, v.across, v.phase, v.rate]
  assert.deepEqual(single.vertices.map(shape), plain.vertices.map(shape))
  let varied = false
  for (const [s, e] of ribbonRanges(plain)) {
    const mid = s + 2 * Math.floor(((e - s) / 2 - 1) / 2)
    const want = plain.vertices[mid].color
    for (let i = s; i < e; i++) assert.deepEqual(single.vertices[i].color, want, `ribbon at ${s}, vertex ${i}`)
    if (plain.vertices.slice(s, e).some((v) => v.color.join() !== want.join())) varied = true
  }
  assert.ok(varied, 'positive control: without the option some ribbon changes colour along its length')
})

test('T6 smoothTrail moves only interior centre-line points, to the 1-2-1 average, and keeps the topology', () => {
  const plain = buildSourceStreamlineRibbons(rampScene())
  const smooth = buildSourceStreamlineRibbons({ ...rampScene(), smoothTrail: true })
  assert.deepEqual(smooth.indices, plain.indices)
  const meta = (v: Built['vertices'][number]) => [v.len, v.across, v.phase, v.rate]
  assert.deepEqual(smooth.vertices.map(meta), plain.vertices.map(meta))
  // the centre line is the mean of each across pair: the ±normal offsets cancel
  const centre = (b: Built, i: number) => [(b.vertices[i].u + b.vertices[i + 1].u) / 2, (b.vertices[i].v + b.vertices[i + 1].v) / 2]
  let moved = false
  for (const [s, e] of ribbonRanges(plain)) {
    const n = (e - s) / 2
    for (let k = 0; k < n; k++) {
      const got = centre(smooth, s + 2 * k)
      const want =
        k === 0 || k === n - 1
          ? centre(plain, s + 2 * k)
          : [0, 1].map((c) => (centre(plain, s + 2 * (k - 1))[c] + 2 * centre(plain, s + 2 * k)[c] + centre(plain, s + 2 * (k + 1))[c]) / 4)
      for (const c of [0, 1]) assert.ok(Math.abs(got[c] - want[c]) < 1e-12, `ribbon at ${s}, point ${k}`)
      if (Math.hypot(got[0] - centre(plain, s + 2 * k)[0], got[1] - centre(plain, s + 2 * k)[1]) > 1e-9) moved = true
    }
  }
  assert.ok(moved, 'positive control: the ramp scene has corners for the smoothing to move')
})
