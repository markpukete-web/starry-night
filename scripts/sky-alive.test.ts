import assert from 'node:assert/strict'
import test from 'node:test'
import { ALIVE_DEFAULTS, GUST, hasAliveKnobs, gustLag, gustPulse, gustTime, gustUniformValues, gustWeight, HALO_BREATH, haloPeriod, meanTempoBound, readAliveTuning, ribbonGusts, whorlWeight } from '../src/scene/skyAlive.ts'
import { SWIRLS } from '../src/scene/skySwirls.ts'
import { arraysToGeometry, ribbonBuffers, ribbonsToArrays } from '../src/scene/skyRibbonArrays.ts'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import type { SourceRibbonVertex } from '../src/scene/streamlineGeometry.ts'

// make-it-alive A (tasks/2026-10-13-alive-a-plan.md): T7–T9

function ribbon(phase: number, u0: number, v0: number, color: [number, number, number], points = 3, rate = 1): SourceRibbonVertex[] {
  const out: SourceRibbonVertex[] = []
  for (let k = 0; k < points; k++) {
    // the colour varies along the path, so a per-vertex weight (the T7 mutation) differs within the ribbon
    const shade = 1 + 0.5 * (k / (points - 1))
    const c: [number, number, number] = [Math.min(1, color[0] * shade), Math.min(1, color[1] * shade), Math.min(1, color[2] * shade)]
    for (const across of [0, 1]) out.push({ u: u0 + k * 0.01, v: v0 + across * 0.002, len: k / (points - 1), across, phase, rate, color: c })
  }
  return out
}

const farFromWhorls: [number, number] = [0.9, 0.5]

test('T7 aGust is one [weight, lag] per ribbon, grouped by the ribbon phase', () => {
  // lum 0.36 at the head rising to 0.55 at the tail: the path straddles the band, so per-vertex weights would differ
  const dark = ribbon(0.31, 0.85, 0.5, [0.3, 0.38, 0.45])
  const pale = ribbon(1.77, 0.95, 0.45, [0.7, 0.75, 0.6])
  const gust = ribbonGusts([...dark, ...pale])
  assert.equal(gust.length, (dark.length + pale.length) * 2)
  const pairs = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => [gust[(from + i) * 2], gust[(from + i) * 2 + 1]])
  const darkPairs = pairs(0, dark.length)
  const palePairs = pairs(dark.length, dark.length + pale.length)
  for (const p of darkPairs) assert.deepEqual(p, darkPairs[0])
  for (const p of palePairs) assert.deepEqual(p, palePairs[0])
  assert.ok(palePairs[0][0] > darkPairs[0][0], 'the pale ribbon carries more of the gust')
  // lag is the ribbon's mean u times the travel
  const meanU = dark.reduce((s, v) => s + v.u, 0) / dark.length
  assert.ok(Math.abs(darkPairs[0][1] - gustLag(meanU)) < 1e-6)
  assert.ok(Math.abs(gustLag(meanU) - meanU * GUST.travel) < 1e-9)
  // two adjacent ribbons with the same phase but different rates are two ribbons (review F7)
  const twin = ribbon(0.31, 0.95, 0.45, [0.7, 0.75, 0.6], 3, 1.2)
  const paired = ribbonGusts([...dark, ...twin])
  assert.ok(paired[0] !== paired[dark.length * 2], 'grouped by the (phase, rate) pair, not phase alone')
})

test('T8 the weight: dark reads the floor, pale reads 1, a dark ribbon in the whorl reads 1, lag clamps to the strips', () => {
  assert.equal(gustWeight(0.2, ...farFromWhorls), GUST.floor)
  assert.equal(gustWeight(0.6, ...farFromWhorls), 1)
  const [cu, cv] = SWIRLS[0]
  assert.equal(whorlWeight(cu, cv), 1)
  assert.equal(gustWeight(0.2, cu, cv), 1)
  const mid = gustWeight((GUST.bandLum[0] + GUST.bandLum[1]) / 2, ...farFromWhorls)
  assert.ok(mid > GUST.floor && mid < 1)
  assert.equal(gustLag(-0.6), -0.3 * GUST.travel)
  assert.equal(gustLag(1.6), 1.3 * GUST.travel)
})

test('T9 the gust clock starts at 0, never runs backwards, and averages today\'s tempo', () => {
  assert.ok(GUST.amplitudes.reduce((a, b) => a + b, 0) < 1, 'amplitudes sum under 1')
  for (const lag of [0, 1.5, 3.9]) assert.ok(Math.abs(gustTime(0, 1, lag)) < 1e-12, `T(0) = 0 at lag ${lag}`)
  for (const lag of [0, 2]) {
    let previous = gustTime(0, 1, lag)
    for (let i = 1; i <= 120 * 240; i++) {
      const t = i / 240
      const now = gustTime(t, 1, lag)
      assert.ok(now > previous, `monotone at t ${t} lag ${lag}`)
      previous = now
    }
    // the exact finite-window bound, not a round number (review F11)
    assert.ok(Math.abs(gustTime(120, 1, lag) / 120 - 1) <= meanTempoBound(120) * 1.001, 'mean tempo within the analytic bound over 120 s')
  }
  // the bound is small for any amplitudes under 1 with periods under 20 s: the window error, not a tempo bias
  assert.ok(meanTempoBound(120) < 0.05)
  // the brightness lift is 0 at t = 0, whatever the lag, so the t = 0 frame equals today's (review F1)
  assert.equal(gustPulse(0), 0)
  // the flag off is exactly t, however large the warp would be
  for (const t of [0.5, 37.25, 1000]) assert.equal(t + 0 * (gustTime(t, 1, 0) - t), t)
})

function flat(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
}

test('T10 the packer carries aGust as a vec2 attribute and transfers every buffer', () => {
  const built = buildSourceStreamlineRibbons({
    flowData: flat(16, 16, [255, 128, 255, 255]),
    maskData: flat(16, 16, [255, 255, 255, 255]),
    paintingData: flat(16, 16, [120, 140, 170, 255]),
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  })
  const arrays = ribbonsToArrays(built, { gust: true })
  assert.ok(arrays.aGust)
  assert.equal(arrays.aGust.length, built.vertices.length * 2)
  assert.deepEqual(Array.from(arrays.aGust), Array.from(ribbonGusts(built.vertices)))
  const geometry = arraysToGeometry(arrays)
  assert.equal(geometry.getAttribute('aGust').itemSize, 2)
  assert.equal(geometry.getAttribute('aGust').count, built.vertices.length)
  // a buffer left out of the transfer list is copied silently, never an error (review F8)
  const typed = Object.values(arrays).filter((v) => ArrayBuffer.isView(v))
  assert.equal(ribbonBuffers(arrays).length, typed.length)
  geometry.dispose()
  // the flag off (the default): main's arrays and geometry, no gust attribute packed, uploaded or transferred
  const plain = ribbonsToArrays(built)
  assert.equal(plain.aGust, undefined)
  const plainGeometry = arraysToGeometry(plain)
  assert.equal(plainGeometry.getAttribute('aGust'), undefined)
  assert.equal(ribbonBuffers(plain).length, Object.values(plain).filter((v) => ArrayBuffer.isView(v)).length)
  assert.deepEqual(Array.from(plain.aLen), Array.from(arrays.aLen))
  plainGeometry.dispose()
})

test('T11 every star halo breathes at its own period inside the range, and none at the same rate', () => {
  const periods = Array.from({ length: 12 }, (_, i) => haloPeriod(i))
  for (const p of periods) assert.ok(p >= HALO_BREATH.periodMin && p <= HALO_BREATH.periodMax, `period ${p} in range`)
  assert.equal(new Set(periods.map((p) => p.toFixed(3))).size, periods.length, 'distinct periods')
})

test('T12 the live knobs: defaults when absent or unparseable, clamped to their ranges, and the clock stays monotone at the gust maximum', () => {
  const d = readAliveTuning(new URLSearchParams(''))
  assert.deepEqual(d, ALIVE_DEFAULTS)
  assert.ok(Math.abs(d.gust - GUST.amplitudes.reduce((a, b) => a + b, 0)) < 1e-12)
  const junk = readAliveTuning(new URLSearchParams('gust=abc&lift=&shimmer=NaN&breath=Infinity'))
  assert.deepEqual(junk, ALIVE_DEFAULTS)
  const high = readAliveTuning(new URLSearchParams('gust=5&lift=9&shimmer=2&breath=99'))
  assert.deepEqual(high, { gust: 0.95, lift: 0.5, shimmer: 1, breath: 3 })
  const low = readAliveTuning(new URLSearchParams('gust=-1&lift=-1&shimmer=-1&breath=-1'))
  assert.deepEqual(low, { gust: 0, lift: 0, shimmer: 0, breath: 0 })
  // the shipped defaults (sky-tuning.json's alive keys) are passed in; a URL knob still wins over them
  const shipped = { gust: 0.95, lift: 0.3, shimmer: 1, breath: 2 }
  assert.deepEqual(readAliveTuning(new URLSearchParams(''), shipped), shipped)
  assert.deepEqual(readAliveTuning(new URLSearchParams('lift=0.1'), shipped), { ...shipped, lift: 0.1 })
  assert.equal(hasAliveKnobs(new URLSearchParams('alive=1&tune=1')), false)
  assert.equal(hasAliveKnobs(new URLSearchParams('alive=1&breath=2')), true)
  // at the gust maximum the scaled amplitudes still sum under 1, so T stays monotone
  const { amplitudes } = gustUniformValues(high)
  assert.ok(amplitudes.reduce((a, b) => a + b, 0) < 1)
  let previous = gustTime(0, 1, 1.5, amplitudes)
  for (let i = 1; i <= 60 * 240; i++) {
    const now = gustTime(i / 240, 1, 1.5, amplitudes)
    assert.ok(now > previous, `monotone at the gust maximum, t ${i / 240}`)
    previous = now
  }
})

test('T13 the gust knob at 0: every amplitude 0, the pulse 0 rather than NaN, the clock exactly t', () => {
  const off = readAliveTuning(new URLSearchParams('alive=1&gust=0'))
  const { amplitudes } = gustUniformValues(off)
  assert.deepEqual(amplitudes, [0, 0, 0])
  for (const t of [0, 1.7, 33]) {
    const pulse = gustPulse(t, amplitudes)
    assert.ok(Number.isFinite(pulse), `pulse finite at t ${t}`)
    assert.equal(pulse, 0)
    assert.equal(gustTime(t, 1, 1.35, amplitudes), t)
  }
})
