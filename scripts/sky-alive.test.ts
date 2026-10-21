import assert from 'node:assert/strict'
import test from 'node:test'
import { ALIVE_DEFAULTS, ALIVE_KNOBS, aliveSavePayload, GUST, hasAliveKnobs, gustLag, gustPulse, gustTime, gustUniformValues, gustWeight, HALO_BREATH, haloPeriod, meanTempoBound, readAliveTuning, ribbonGusts, whorlWeight } from '../src/scene/skyAlive.ts'
import { SWIRLS } from '../src/scene/skySwirls.ts'
import { arraysToGeometry, ribbonBuffers, ribbonsToArrays } from '../src/scene/skyRibbonArrays.ts'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import type { SourceRibbonVertex } from '../src/scene/streamlineGeometry.ts'
import { readFileSync } from 'node:fs'
import { concatInjections, injectAliveSource, replaceOnce } from '../src/scene/aliveMaterial.ts'
import { CYPRESS_FLICKER, flickerEnv, flickerF, flickerFactor, flickerMeanBound, flickerUniformValues, flickerWeight, lobeHeight, ribbonFlicker } from '../src/scene/cypressFlicker.ts'
import { strokeGlsl } from '../src/scene/cypressStrokeShader.ts'
import { ShaderLib } from 'three'
import { buildCypressLobePlan, type CypressLobeRows } from '../src/scene/cypressLobes.ts'
import { glowFactor, glowMeanBound, glowOmega, glowPeriods, MARK_STEPS, markVertexCount, packGlow, WINDOW_GLOW } from '../src/scene/villageGlow.ts'
import { Vector3 } from 'three'
import { homeInverseQuaternion, skyPointFromRay, uvFromSkyDirection, uvToDioramaSkyPosition } from '../src/scene/dioramaSkyProjection.ts'
import { DOME_R } from '../src/scene/skyMapping.ts'
import { SKY_ASPECT } from '../src/scene/touchSurge.ts'

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
  const junk = readAliveTuning(new URLSearchParams('gust=abc&lift=&shimmer=NaN&breath=Infinity&flicker=x&glimmer='))
  assert.deepEqual(junk, ALIVE_DEFAULTS)
  const high = readAliveTuning(new URLSearchParams('gust=5&lift=9&shimmer=2&breath=99&flicker=5&glimmer=7&surge=9&bend=9'))
  assert.deepEqual(high, { gust: 0.95, lift: 0.5, shimmer: 1, breath: 3, flicker: 1, glimmer: 1, surge: 1.5, bend: 1.5 })
  const low = readAliveTuning(new URLSearchParams('gust=-1&lift=-1&shimmer=-1&breath=-1&flicker=-1&glimmer=-1&surge=-1&bend=-1'))
  assert.deepEqual(low, { gust: 0, lift: 0, shimmer: 0, breath: 0, flicker: 0, glimmer: 0, surge: 0, bend: 0 })
  // the shipped defaults (sky-tuning.json's alive keys) are passed in; a URL knob still wins over them
  const shipped = { gust: 0.95, lift: 0.3, shimmer: 1, breath: 2, flicker: 1, glimmer: 1, surge: 1, bend: 1 }
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

// ---- make-it-alive A, second pass (tasks/2026-10-13-alive-a2-plan.md): the cypress flicker and the window glimmer

const cypressRows = JSON.parse(readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8')) as CypressLobeRows

test('T14 the flicker weight: the tips and the outer tongues carry it, the core keeps the floor, a frond tip counts on its own lobe, back strokes take half', () => {
  const { floor } = CYPRESS_FLICKER
  // fixtures straddling both thresholds (the T7 lesson): below, inside and above the tip and the tongue bands
  assert.equal(flickerWeight(0.5, 0.3), floor, 'a core vertex of a core stroke keeps the floor')
  assert.ok(flickerWeight(0.725, 0.3) > floor && flickerWeight(0.725, 0.3) < 1, 'inside the tip band')
  assert.equal(flickerWeight(0.95, 0.3), 1, 'a tip vertex takes the full weight')
  assert.equal(flickerWeight(0.2, 0.95), 1, 'an outer tongue takes the full weight at any height')
  assert.ok(flickerWeight(0.2, 0.825) > floor && flickerWeight(0.2, 0.825) < 1, 'inside the tongue band')
  // the tongue term exists (dropping it makes these equal: the mutation proof)
  assert.ok(flickerWeight(0, 0.95) > flickerWeight(0, 0))
  // back strokes: half the tongue term
  assert.ok(Math.abs(flickerWeight(0, 0.95, true) - (floor + (1 - floor) * CYPRESS_FLICKER.backLick)) < 1e-12)
  // monotone in the vertex's height
  let previous = 0
  for (let h = 0; h <= 1; h += 0.05) {
    const w = flickerWeight(h, 0)
    assert.ok(w >= previous, `tip weight never falls with height, h ${h}`)
    previous = w
  }
  // the real tree: a frond's top vertex reaches the tip weight on its OWN lobe range, where the absolute height never would
  const plan = buildCypressLobePlan(cypressRows)
  const lobeRange = new Map(plan.lobes.map((lobe) => [lobe.id, [lobe.sections[0].heightFraction, lobe.sections[lobe.sections.length - 1].heightFraction] as const]))
  const frond = plan.lobes.find((lobe) => lobe.id !== plan.lobes[0].id)
  assert.ok(frond, 'the shipped row table has a frond')
  const [frondStart, frondEnd] = lobeRange.get(frond.id)!
  assert.ok(frondEnd < 0.9, `the frond ends at ${frondEnd} of the tree, below the tip band`)
  assert.equal(flickerWeight(lobeHeight(frondEnd, frondStart, frondEnd), 0), 1, "a frond's own tip weighs 1")
  assert.ok(flickerWeight(lobeHeight(frondEnd, 0, 1), 0) < 1, 'on the absolute height it would not')
  // the packing on the ribbon path (E1): one weight per kept sample from the ribbon's mean |lateral| and the
  // sample's height within its lobe; the tip run weighs 1 at its top, a tongue run weighs 1 throughout, the back halves it
  const tipRun = ribbonFlicker([{ h: 0.5, lateral: 0.1 }, { h: 0.8, lateral: 0.1 }, { h: 1, lateral: 0.1 }], [0, 1], false)
  assert.equal(tipRun.length, 3)
  assert.equal(tipRun[0][0], floor)
  assert.equal(tipRun[2][0], 1)
  assert.deepEqual(tipRun.map(([, h]) => h), [0.5, 0.8, 1])
  const tongue = ribbonFlicker([{ h: 0.1, lateral: 0.95 }, { h: 0.2, lateral: 0.95 }], [0, 1], false)
  assert.ok(tongue.every(([w]) => w === 1))
  const backTongue = ribbonFlicker([{ h: 0.1, lateral: 0.95 }], [0, 1], true)
  assert.ok(Math.abs(backTongue[0][0] - (floor + (1 - floor) * CYPRESS_FLICKER.backLick)) < 1e-12)
  // the frond's own range: its top sample weighs 1 although its absolute height is low
  const frondRun = ribbonFlicker([{ h: frondEnd, lateral: 0 }], [frondStart, frondEnd], false)
  assert.equal(frondRun[0][0], 1)
})

test('T15 the flicker wave: exactly 0 at t = 0, bounded by 1, mean within the analytic bound, and it climbs at ω/k', () => {
  // `0 · (negative sine)` is −0; `1 + (−0)` is exactly 1, which is what the factor asserts below
  for (const h of [0, 0.185, 0.37, 0.605, 1]) assert.ok(flickerF(h, 0) === 0, `F(${h}, 0) is zero`)
  assert.equal(flickerEnv(0), 0)
  assert.equal(flickerFactor(1, 1, 0.37, 0), 1, 'the factor is exactly 1 at t = 0')
  // bounded by Σ Aᵢ = 1 everywhere, the transient included (the first draft overshot to 1.42: review F3)
  for (let t = 0; t <= 30; t += 1 / 60) for (let h = 0; h <= 1; h += 0.01) assert.ok(Math.abs(flickerF(h, t)) <= 1 + 1e-12, `|F| ≤ 1 at h ${h}, t ${t}`)
  // at the knob's maximum and full weight the factor stays inside [0.4, 1.6]
  assert.ok(Math.abs(flickerFactor(1, 1, 0, 0.5 * CYPRESS_FLICKER.periods[0]) - 1) <= CYPRESS_FLICKER.depth + 1e-12)
  // the time-mean of the factor after the envelope: 1 within the finite-window bound (first pass F11, review F7)
  const seconds = 60
  const bound = flickerMeanBound(seconds)
  assert.ok(bound > 0.01 && bound < 0.02, `bound ${bound} is the analytic one, not a round number`)
  for (const h of [0, 0.37, 0.7, 1]) {
    let sum = 0
    let n = 0
    for (let t = 5 * CYPRESS_FLICKER.tau; t <= 5 * CYPRESS_FLICKER.tau + seconds; t += 1 / 240) {
      sum += flickerFactor(1, 1, h, t)
      n++
    }
    assert.ok(Math.abs(sum / n - 1) <= CYPRESS_FLICKER.depth * bound + 1e-6, `mean at h ${h}: ${sum / n}`)
  }
  // the climb, on one mode (two modes make the argmax jump, review F8): the pattern at t + Δ is the pattern at t
  // moved UP by ω/k · Δ tree heights; moved down it is not
  const one = [1, 0]
  const speed = (CYPRESS_FLICKER.cycles[0] * CYPRESS_FLICKER.periods[0]) ** -1 // ω/k = (2π/P)/(2π·c)
  assert.ok(Math.abs(speed - 0.405) < 0.405 * 0.1, `0.40 tree heights per second, got ${speed}`)
  for (const t of [10, 11.3, 20.7]) {
    for (const h of [0.1, 0.3, 0.5]) {
      const now = flickerF(h, t, one) / flickerEnv(t)
      const later = flickerF(h + speed * 0.5, t + 0.5, one) / flickerEnv(t + 0.5)
      const wrong = flickerF(h - speed * 0.5, t + 0.5, one) / flickerEnv(t + 0.5)
      assert.ok(Math.abs(later - now) < 1e-9, `the crest climbed by ω/k · Δ at h ${h}, t ${t}`)
      assert.ok(Math.abs(wrong - now) > 1e-3, 'and did not descend')
    }
  }
  // the uniforms carry the table: the solid takes its share of the knob
  const u = flickerUniformValues({ flicker: 1 })
  assert.deepEqual(u.amplitudes, CYPRESS_FLICKER.amplitudes)
  assert.equal(u.strength, CYPRESS_FLICKER.depth)
  assert.equal(flickerUniformValues({ flicker: 1 }, true).strength, CYPRESS_FLICKER.depth * CYPRESS_FLICKER.solidShare)
  assert.equal(flickerUniformValues({ flicker: 0 }).strength, 0)
})

test('T16 the glow packing: weight 1 and the window rates on exactly the lit ranges, 0 elsewhere, a mark is 2 · (MARK_STEPS + 1) vertices', () => {
  assert.equal(markVertexCount(), 2 * (MARK_STEPS + 1))
  assert.equal(markVertexCount(), 10)
  const ranges = [{ start: 10, count: 10 }, { start: 50, count: 10 }]
  const glow = packGlow(100, ranges)
  assert.equal(glow.length, 300)
  for (let i = 0; i < 100; i++) {
    const n = ranges.findIndex((r) => i >= r.start && i < r.start + r.count)
    if (n < 0) {
      assert.deepEqual([glow[i * 3], glow[i * 3 + 1], glow[i * 3 + 2]], [0, 0, 0], `vertex ${i} unlit`)
    } else {
      const [slow, fast] = glowOmega(n)
      assert.equal(glow[i * 3], 1, `vertex ${i} lit`)
      assert.ok(Math.abs(glow[i * 3 + 1] - slow) < 1e-6 && Math.abs(glow[i * 3 + 2] - fast) < 1e-6, `vertex ${i} carries window ${n}'s rates`)
    }
  }
  assert.throws(() => packGlow(100, [{ start: 95, count: 10 }]), /outside/)
})

test('T17 the glimmer: every window its own two periods inside their ranges, none shared, 0 at t = 0, mean within the bound', () => {
  const windows = 7
  const all: number[] = []
  for (let n = 0; n < windows; n++) {
    const [slow, fast] = glowPeriods(n)
    assert.ok(slow >= WINDOW_GLOW.slow[0] && slow <= WINDOW_GLOW.slow[1], `slow period ${slow} in range`)
    assert.ok(fast >= WINDOW_GLOW.fast[0] && fast <= WINDOW_GLOW.fast[1], `fast period ${fast} in range`)
    all.push(slow, fast)
    assert.equal(glowFactor(1, 0, n), 1, `window ${n} is exactly today's at t = 0`)
    let sum = 0
    let count = 0
    for (let t = 0; t <= 60; t += 1 / 240) {
      const f = glowFactor(1, t, n)
      assert.ok(f >= 1 - WINDOW_GLOW.depth - 1e-12 && f <= 1 + WINDOW_GLOW.depth + 1e-12, 'inside the depth')
      sum += f
      count++
    }
    assert.ok(Math.abs(sum / count - 1) <= WINDOW_GLOW.depth * glowMeanBound(60) + 1e-6, `window ${n} mean ${sum / count}`)
  }
  assert.equal(new Set(all.map((p) => p.toFixed(4))).size, all.length, 'no two windows share a period')
})

test('T18 the second pass knobs read, clamp and default like the first four, and leave the gust uniforms alone', () => {
  const d = readAliveTuning(new URLSearchParams(''))
  assert.equal(d.flicker, ALIVE_DEFAULTS.flicker)
  assert.equal(d.glimmer, ALIVE_DEFAULTS.glimmer)
  assert.deepEqual(readAliveTuning(new URLSearchParams('flicker=0.25&glimmer=0')), { ...ALIVE_DEFAULTS, flicker: 0.25, glimmer: 0 })
  assert.equal(hasAliveKnobs(new URLSearchParams('alive=1&flicker=0.3')), true)
  assert.deepEqual(gustUniformValues({ ...ALIVE_DEFAULTS, flicker: 1, glimmer: 1 }), gustUniformValues(ALIVE_DEFAULTS))
})

test('T19 the shader injection replaces each chunk marker exactly once and throws on a missing or doubled one', () => {
  const vertex = 'void main() {\n#include <common>\n#include <color_vertex>\n}'
  const fragment = 'void main() {\n#include <common>\n#include <color_fragment>\n#include <opaque_fragment>\n}'
  const injection = { key: 'k', uniforms: {}, vertexHead: 'VH', vertexBody: 'VB', fragmentHead: 'FH', fragmentBody: 'FB' }
  const out = injectAliveSource(vertex, fragment, injection)
  assert.ok(out.vertexShader.includes('#include <common>\nVH') && out.vertexShader.includes('#include <color_vertex>\nVB'))
  assert.ok(out.fragmentShader.includes('#include <common>\nFH') && out.fragmentShader.includes('#include <color_fragment>\nFB'))
  assert.ok(out.fragmentShader.indexOf('FB') < out.fragmentShader.indexOf('<opaque_fragment>'), 'the multiply lands before the output chunks')
  assert.throws(() => replaceOnce('a b', 'c', 'x'), /exactly one/)
  assert.throws(() => replaceOnce('c c', 'c', 'x'), /exactly one/)
  assert.throws(() => injectAliveSource(vertex, fragment.replace('#include <color_fragment>', ''), injection), /color_fragment/)
})

test('T19b concatInjections joins in order, merges uniforms, carries a vertex transform, and the stroke + flicker + bend injection lands once on three\'s real basic shader', () => {
  const stroke = { uniforms: { uA: { value: 1 } }, ...strokeGlsl }
  const flicker = { uniforms: { uB: { value: 2 } }, vertexHead: 'FLV', vertexBody: 'FLB', fragmentHead: 'FLF', fragmentBody: 'FLX' }
  const bend = { uniforms: { uC: { value: 3 } }, vertexHead: 'attribute float aBend;', vertexBody: '', fragmentHead: '', fragmentBody: '', vertexTransform: 'transformed += vec3(aBend);' }
  const two = concatInjections('k2', stroke, flicker)
  assert.equal(two.key, 'k2')
  assert.deepEqual(Object.keys(two.uniforms), ['uA', 'uB'])
  assert.ok(two.fragmentBody.indexOf('discard') < two.fragmentBody.indexOf('FLX'), 'the stroke body precedes the flicker')
  assert.equal(two.vertexTransform, undefined, 'no transform without a part that has one')
  const three = concatInjections('k3', stroke, flicker, bend)
  assert.equal(three.vertexTransform, 'transformed += vec3(aBend);')
  const out = injectAliveSource(ShaderLib.basic.vertexShader, ShaderLib.basic.fragmentShader, three)
  assert.equal(out.vertexShader.split('#include <begin_vertex>').length, 2, 'one begin_vertex')
  assert.ok(out.vertexShader.includes('#include <begin_vertex>\ntransformed += vec3(aBend);'), 'the transform follows begin_vertex')
  for (const name of ['aStroke', 'aSeed', 'aBend', 'FLV']) assert.ok(out.vertexShader.includes(name), name)
  assert.ok(out.fragmentShader.includes('dFdx') && out.fragmentShader.indexOf('dFdx') < out.fragmentShader.indexOf('discard;'), 'the derivatives come before the first discard statement')
  assert.ok(out.fragmentShader.indexOf('FLX') > out.fragmentShader.indexOf('discard;'))
  assert.ok(out.fragmentShader.indexOf('FLX') < out.fragmentShader.indexOf('<opaque_fragment>'))
  const withoutTransform = injectAliveSource(ShaderLib.basic.vertexShader, ShaderLib.basic.fragmentShader, two)
  assert.ok(!withoutTransform.vertexShader.includes('aBend'))
  assert.equal(withoutTransform.vertexShader.split('#include <begin_vertex>').length, 2)
})

// ---- B, touch (tasks/2026-10-13-touch-b-plan.md): the mapping, the packing, the knob

test('T20 the sky mapping inverts: a round trip over the strips and the cap, the far root from inside and outside the dome, null on a miss', () => {
  let worst = 0
  for (let u = -0.3; u <= 1.3001; u += 0.05) {
    for (let v = -0.1; v <= 0.9001; v += 0.05) {
      const [iu, iv] = uvFromSkyDirection(uvToDioramaSkyPosition(u, v, new Vector3()))
      worst = Math.max(worst, Math.abs(iu - u), Math.abs(iv - v))
    }
  }
  assert.ok(worst < 1e-9, `round trip worst ${worst}`)
  // from the home camera, inside the dome: the far root at DOME_R, on the ray's far side
  const inside = new Vector3(0.62, 1.18, 5.18)
  const target = uvToDioramaSkyPosition(0.62, 0.3, new Vector3())
  const hit = skyPointFromRay(inside, target.clone().sub(inside), new Vector3())
  assert.ok(hit && Math.abs(hit.length() - DOME_R) < 1e-9 && hit.distanceTo(target) < 1e-6)
  // from the orbit's extreme, 6.52 from the origin, OUTSIDE the dome, looking in: still the far root (review F4)
  const outside = new Vector3(0, 0, 6.52)
  const through = skyPointFromRay(outside, new Vector3(0.1, -0.2, -1), new Vector3())
  assert.ok(through && Math.abs(through.length() - DOME_R) < 1e-9 && through.z < 0, 'the painted far side, not the near cap')
  // a ray that misses the sphere
  assert.equal(skyPointFromRay(outside, new Vector3(0, 0, 1), new Vector3()), null)
  assert.equal(skyPointFromRay(outside, new Vector3(1, 0, 0), new Vector3()), null)
  // the home inverse: camera × homeInverse is the identity at the home pose (the sky is unrotated there)
  const home = { position: [0.62, 1.18, 5.18] as const, target: [0.08, 1.03, 0.02] as const }
  const q = homeInverseQuaternion(home)
  assert.ok(Math.abs(q.length() - 1) < 1e-12)
})

test('T21 the touch attributes: the side pair shares its point and tangent, the tangent is unit in the isotropic metric and follows the ribbon, aSeg is one value per ribbon, flag off packs neither, every buffer transfers', () => {
  const size = 64
  const flow = flat(size, size, [255, 128, 0, 255])
  const mask = flat(size, size, [255, 255, 255, 255])
  const painting = flat(size, size, [120, 140, 200, 255])
  const built = buildSourceStreamlineRibbons({ flowData: flow, maskData: mask, paintingData: painting, count: 12, strokeWidth: 0.004, points: 10, stepSize: 0.015, seed: 7 })
  const arrays = ribbonsToArrays(built, { gust: true, touch: true })
  assert.ok(arrays.aTouch && arrays.aSeg)
  assert.equal(arrays.aTouch.length, built.vertices.length * 4)
  assert.equal(arrays.aSeg.length, built.vertices.length * 4)
  let ribbons = 0
  for (let i = 0; i < built.vertices.length; i += 2) {
    const a = arrays.aTouch.subarray(i * 4, i * 4 + 4)
    const b = arrays.aTouch.subarray(i * 4 + 4, i * 4 + 8)
    assert.deepEqual(Array.from(a), Array.from(b), `pair ${i} shares its point and tangent`)
    const va = built.vertices[i]
    const vb = built.vertices[i + 1]
    assert.ok(Math.abs(a[0] - (va.u + vb.u) / 2) < 1e-6 && Math.abs(a[1] - (va.v + vb.v) / 2) < 1e-6, 'the pair mean')
    assert.ok(Math.abs(Math.hypot(a[2], a[3]) - 1) < 1e-5, 'unit tangent')
    // the tangent follows the ribbon: within 25° of the chord to the next pair of the same ribbon
    const same = i + 2 < built.vertices.length && built.vertices[i + 2].phase === va.phase && built.vertices[i + 2].rate === va.rate
    if (same) {
      const n = arrays.aTouch.subarray((i + 2) * 4, (i + 2) * 4 + 4)
      const cx = n[0] - a[0]
      const cy = (n[1] - a[1]) * SKY_ASPECT
      const mag = Math.hypot(cx, cy)
      if (mag > 1e-9) assert.ok((a[2] * cx + a[3] * cy) / mag > Math.cos((25 * Math.PI) / 180), `tangent along the ribbon at ${i}`)
    } else {
      ribbons++
    }
    const seg = arrays.aSeg.subarray(i * 4, i * 4 + 4)
    assert.deepEqual(Array.from(seg), Array.from(arrays.aSeg.subarray(i * 4 + 4, i * 4 + 8)))
  }
  // aSeg: one value per ribbon, its ends the ribbon's first and last pair means
  let start = 0
  while (start < built.vertices.length) {
    const { phase, rate } = built.vertices[start]
    let end = start
    while (end < built.vertices.length && built.vertices[end].phase === phase && built.vertices[end].rate === rate) end++
    const seg = Array.from(arrays.aSeg.subarray(start * 4, start * 4 + 4))
    const first = arrays.aTouch.subarray(start * 4, start * 4 + 2)
    const last = arrays.aTouch.subarray((end - 2) * 4, (end - 2) * 4 + 2)
    assert.deepEqual(seg, [first[0], first[1], last[0], last[1]])
    for (let i = start; i < end; i++) assert.deepEqual(Array.from(arrays.aSeg.subarray(i * 4, i * 4 + 4)), seg)
    start = end
  }
  assert.ok(ribbons > 1)
  // the geometry carries both as vec4, and every typed array transfers (A's F8)
  const geometry = arraysToGeometry(arrays)
  assert.equal(geometry.getAttribute('aTouch').itemSize, 4)
  assert.equal(geometry.getAttribute('aSeg').itemSize, 4)
  assert.equal(ribbonBuffers(arrays).length, Object.values(arrays).filter((v) => ArrayBuffer.isView(v)).length)
  geometry.dispose()
  // the flag off: neither packed
  const plain = ribbonsToArrays(built, { gust: true })
  assert.equal(plain.aTouch, undefined)
  assert.equal(plain.aSeg, undefined)
})

test('T24 the surge knob reads, clamps and defaults like the others, and leaves the gust uniforms alone', () => {
  const d = readAliveTuning(new URLSearchParams(''))
  assert.equal(d.surge, ALIVE_DEFAULTS.surge)
  assert.deepEqual(readAliveTuning(new URLSearchParams('surge=0.25')), { ...ALIVE_DEFAULTS, surge: 0.25 })
  assert.equal(readAliveTuning(new URLSearchParams('surge=4')).surge, 1.5)
  assert.equal(hasAliveKnobs(new URLSearchParams('touch=1&surge=0.3')), true)
  assert.deepEqual(gustUniformValues({ ...ALIVE_DEFAULTS, surge: 1.5 }), gustUniformValues(ALIVE_DEFAULTS))
})

test('T26 the tuner saves only the knobs it shows: no touchSurge or touchBend off the touch route, every alive key either way', () => {
  const tuning = { ...ALIVE_DEFAULTS, surge: 0.6, flicker: 0.4, bend: 0.7 }
  const shown = ALIVE_KNOBS.filter((name) => name !== 'surge' && name !== 'bend')
  const off = aliveSavePayload(tuning, shown)
  assert.deepEqual(off, {
    aliveGust: tuning.gust,
    aliveLift: tuning.lift,
    aliveShimmer: tuning.shimmer,
    aliveBreath: tuning.breath,
    aliveFlicker: 0.4,
    aliveGlimmer: tuning.glimmer,
  })
  assert.equal('touchSurge' in off, false)
  assert.equal('touchBend' in off, false)
  assert.deepEqual(aliveSavePayload(tuning, ALIVE_KNOBS), { ...off, touchSurge: 0.6, touchBend: 0.7 })
})
