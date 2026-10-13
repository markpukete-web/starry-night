import assert from 'node:assert/strict'
import test from 'node:test'
import { GUST, gustLag, gustTime, gustWeight, ribbonGusts, whorlWeight } from '../src/scene/skyAlive.ts'
import { SWIRLS } from '../src/scene/skySwirls.ts'
import type { SourceRibbonVertex } from '../src/scene/streamlineGeometry.ts'

// make-it-alive A (tasks/2026-10-13-alive-a-plan.md): T7–T9

function ribbon(phase: number, u0: number, v0: number, color: [number, number, number], points = 3): SourceRibbonVertex[] {
  const out: SourceRibbonVertex[] = []
  for (let k = 0; k < points; k++) {
    // the colour varies along the path, so a per-vertex weight (the T7 mutation) differs within the ribbon
    const shade = 1 + 0.5 * (k / (points - 1))
    const c: [number, number, number] = [Math.min(1, color[0] * shade), Math.min(1, color[1] * shade), Math.min(1, color[2] * shade)]
    for (const across of [0, 1]) out.push({ u: u0 + k * 0.01, v: v0 + across * 0.002, len: k / (points - 1), across, phase, rate: 1, color: c })
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
    assert.ok(Math.abs(gustTime(120, 1, lag) / 120 - 1) < 0.02, 'mean tempo within 2% of 1 over 120 s')
  }
  // the flag off is exactly t, however large the warp would be
  for (const t of [0.5, 37.25, 1000]) assert.equal(t + 0 * (gustTime(t, 1, 0) - t), t)
})
