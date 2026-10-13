import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyGesture,
  closingWindow,
  endWindow,
  flareShape,
  hoverDue,
  kickShape,
  kickTerms,
  liftSum,
  nearestStar,
  NO_END,
  pruneSurges,
  pushKick,
  pushSurge,
  segmentDistance,
  SKY_ASPECT,
  surgeTerms,
  TOUCH_SURGE,
  warpSum,
  type Kick,
  type Surge,
} from '../src/scene/touchSurge.ts'
import { SPAN_H, SPAN_V } from '../src/scene/skyMapping.ts'

// ---- B, touch (tasks/2026-10-13-touch-b-plan.md)

const T = TOUCH_SURGE
const along: readonly [number, number] = [1, 0]
const live = (u: number, v: number, t0: number, amp = 1): Surge => ({ u, v, t0, amp, end: NO_END })

test('T22 the lift twin: nothing at or before t0, a rise, a bounded sum, a crest that runs at the speed, longer than wide, gone by the window', () => {
  const s = live(0.5, 0.3, 5)
  assert.equal(surgeTerms([0.5, 0.3], along, s, 4.9), 0)
  assert.equal(surgeTerms([0.5, 0.3], along, s, 5), 0, 'exactly 0 at age 0: the rise')
  assert.ok(surgeTerms([0.5, 0.3], along, s, 5.2) > 0.5, 'and up within a fifth of a second')
  // the summed, weighted lift never exceeds the ceiling, three surges overlapping, full weight
  const three = [s, live(0.52, 0.31, 5.2), live(0.49, 0.3, 5.5)]
  for (let x = 0.3; x <= 0.8; x += 0.01) for (let t = 5; t <= 9; t += 0.05) assert.ok(liftSum([x, 0.3], along, three, t) <= T.maxLift + 1e-12)
  assert.ok(liftSum([0.5, 0.3], along, three, 5.3) === T.maxLift, 'three on one spot hit the ceiling')
  assert.ok(liftSum([0.5, 0.3], along, [s], 5.3, 0.15) < 0.25, 'the calm floor takes little (weight 0.15)')
  // the crest of the pulse sits at speed · age along the tangent (within 1%, after the bloom lets go)
  for (const age of [1, 2]) {
    let best = -1
    let bestX = 0
    for (let x = 0; x <= 1.2; x += 0.0005) {
      const lift = surgeTerms([x, 0.3], along, live(0.5, 0.3, 0), age)
      if (lift > best) {
        best = lift
        bestX = x - 0.5
      }
    }
    assert.ok(Math.abs(bestX - T.speed * age) <= 0.01 * T.speed * age + 1e-3, `crest at ${bestX} for age ${age}`)
  }
  // anisotropy (review F11): the pulse at its crest beside the ribbon is under a tenth of the crest on it
  const on = surgeTerms([0.5 + T.speed, 0.3], along, live(0.5, 0.3, 0), 1)
  const beside = surgeTerms([0.5, 0.3 + T.speed / SKY_ASPECT], along, live(0.5, 0.3, 0), 1)
  assert.ok(beside < 0.1 * on, `a run, not a ring: ${beside} vs ${on}`)
  // the bloom too is longer along the stroke than across it (review F13)
  const bloomAlong = surgeTerms([0.5 + 0.05, 0.3], along, live(0.5, 0.3, 0), 0.05)
  const bloomAcross = surgeTerms([0.5, 0.3 + 0.05 / SKY_ASPECT], along, live(0.5, 0.3, 0), 0.05)
  assert.ok(bloomAlong > 2 * bloomAcross)
  // an upstream vertex takes the bloom only
  assert.ok(surgeTerms([0.3, 0.3], along, live(0.5, 0.3, 0), 0.8) < 1e-3)
  // closed exactly by the window, and gone from the list after it
  assert.equal(closingWindow(T.windowEnd), 0)
  assert.equal(closingWindow(T.windowEnd + 1), 0)
  assert.equal(surgeTerms([0.5 + T.speed * T.windowEnd, 0.3], along, live(0.5, 0.3, 0), T.windowEnd), 0)
  assert.deepEqual(pruneSurges([live(0.5, 0.3, 0)], T.windowEnd), [])
  assert.ok(Math.abs(SKY_ASPECT - (SPAN_V * 1.06) / (SPAN_H * 1.16)) < 1e-12)
})

test('T22b the kick: 0 at age 0, closed to exactly 0 by the window, never evicted live, and the clock never steps back across the pruning instant', () => {
  assert.equal(kickShape(0), 0)
  assert.equal(kickShape(-1), 0)
  assert.ok(kickShape(0.5) > 0.4)
  assert.equal(kickShape(T.windowEnd), 0)
  assert.equal(kickShape(T.windowEnd + 5), 0)
  // point-to-segment distance, three hand cases
  assert.ok(Math.abs(segmentDistance([0.5, 0.5], [0, 0], [1, 0]) - 0.5) < 1e-12, 'beside the middle')
  assert.ok(Math.abs(segmentDistance([-0.3, 0.4], [0, 0], [1, 0]) - 0.5) < 1e-12, 'past the start')
  assert.ok(Math.abs(segmentDistance([0.5, 0.2], [0.5, 0.2], [0.5, 0.2]) - 0) < 1e-12, 'a degenerate segment')
  // a modelled list: four coincident taps at the knob's maximum on a ribbon they sit on, a fifth refused
  const knobMax = 1.5
  let kicks: Kick[] = []
  for (let i = 0; i < 5; i++) {
    const r = pushKick(kicks, { u: 0.5, v: 0.3, t0: 5 + i * 0.1, amp: knobMax }, 5 + i * 0.1)
    kicks = r.kicks
    assert.equal(r.accepted, i < T.maxKicks, `tap ${i} ${i < T.maxKicks ? 'kicks' : 'is refused'}`)
  }
  assert.equal(kicks.length, T.maxKicks)
  const segment: [number, number, number, number] = [0.4, 0.3, 0.6, 0.3]
  // the warped clock t + Σ warp is non-decreasing on a 1/240 s grid, across the pruning instants
  let previous = -Infinity
  let slowest = Infinity
  for (let t = 4; t <= 20; t += 1 / 240) {
    kicks = kicks.filter((k) => t - k.t0 < T.windowEnd) // the frame loop's prune
    const clock = t + warpSum(segment, kicks, t)
    if (previous !== -Infinity) {
      assert.ok(clock >= previous - 1e-9, `the clock never steps back (t ${t.toFixed(3)}: ${clock} < ${previous})`)
      slowest = Math.min(slowest, (clock - previous) * 240)
    }
    previous = clock
  }
  assert.ok(slowest > 0.5, `the strokes never run below half speed at the knob's maximum with four taps (slowest rate ${slowest.toFixed(3)})`)
  // the kick reaches a whole ribbon from its end, and the neighbour ribbon less
  const near = kickTerms([0.5, 0.3, 0.9, 0.3], { u: 0.5, v: 0.3, t0: 0, amp: 1 }, 0.5)
  const far = kickTerms([0.5, 0.3 + 0.12 / SKY_ASPECT, 0.9, 0.3 + 0.12 / SKY_ASPECT], { u: 0.5, v: 0.3, t0: 0, amp: 1 }, 0.5)
  assert.ok(near > 0.1 && far < 0.2 * near)
})

test('T22c the lift list: the oldest live one fades on eviction and keeps its slot to its end, a full set of slots refuses, entries drop at their end or window, hovers need distance and time', () => {
  let list: Surge[] = []
  const step = 0.1
  // the push that first exceeds the live cap fades the oldest live one, which keeps its slot until its end
  for (let i = 0; i <= T.maxSurges; i++) list = pushSurge(list, { u: i / 20, v: 0.3, t0: i * step, amp: 1 }, i * step)
  assert.equal(list.length, T.maxSurges + 1)
  const evicted = list.find((s) => s.end !== NO_END)
  assert.ok(evicted && evicted.u === 0, 'the oldest live one is the one fading')
  assert.ok(Math.abs(evicted.end - (T.maxSurges * step + T.fadeOut)) < 1e-9, 'its end is fadeOut after the push that evicted it')
  assert.equal(endWindow(evicted.end, evicted.end), 0)
  assert.equal(surgeTerms([0, 0.3], along, evicted, evicted.end), 0, 'exactly 0 at its end')
  assert.ok(surgeTerms([0, 0.3], along, evicted, evicted.end - T.fadeOut / 2) > 0, 'and still lit mid-fade')
  assert.ok(pruneSurges(list, evicted.end - 0.01).includes(evicted), 'kept until its end')
  assert.ok(!pruneSurges(list, evicted.end).includes(evicted), 'dropped at its end, by the prune, not by a push')
  // a trail of 17: the live cap holds, fading ones keep their slots, and the total stays within the slots
  for (let i = T.maxSurges + 1; i < 17; i++) list = pushSurge(list, { u: i / 20, v: 0.3, t0: i * step, amp: 1 }, i * step)
  assert.equal(list.filter((s) => s.end === NO_END).length, T.maxSurges, 'the live cap holds')
  assert.ok(list.length <= T.surgeSlots && list.length > T.maxSurges, 'fading ones keep their slots, within the slots')
  assert.equal(pruneSurges(list, 16 * step + T.windowEnd).length, 0, 'all dropped past the window')
  // every slot taken in one instant: the push is refused, nothing is dropped
  let full: Surge[] = []
  for (let i = 0; i < T.surgeSlots + 3; i++) full = pushSurge(full, { u: i / 20, v: 0.3, t0: 1, amp: 1 }, 1)
  assert.equal(full.length, T.surgeSlots)
  assert.equal(full.filter((s) => s.end !== NO_END).length, T.surgeSlots - T.maxSurges, 'the overflow is fading, none dropped')
  // hovers: far enough and long enough after the last
  assert.equal(hoverDue(null, { ms: 0, u: 0.5, v: 0.3 }), true)
  assert.equal(hoverDue({ ms: 0, u: 0.5, v: 0.3 }, { ms: 100, u: 0.505, v: 0.3 }), false, 'too near')
  assert.equal(hoverDue({ ms: 0, u: 0.5, v: 0.3 }, { ms: 30, u: 0.55, v: 0.3 }), false, 'too soon')
  assert.equal(hoverDue({ ms: 0, u: 0.5, v: 0.3 }, { ms: 60, u: 0.52, v: 0.3 }), true)
})

test('T23 the classifier: a quick still down-up is a tap, anything longer or further is a drag', () => {
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 104, y: 103, ms: 200 }), 'tap')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 100, y: 100, ms: 301 }), 'drag')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 109, y: 100, ms: 100 }), 'drag')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 100, y: 108, ms: 300 }), 'tap')
})

test('T25 the star hit test and the flare', () => {
  const stars = [
    { u: 0.27, v: 0.33, radius: T.starRadius },
    { u: 0.13, v: 0.13, radius: T.starRadius },
    { u: 0.8987, v: 0.1697, radius: T.moonRadius },
  ]
  assert.equal(nearestStar(0.28, 0.34, stars), 0)
  assert.equal(nearestStar(0.5, 0.5, stars), -1)
  assert.equal(nearestStar(0.27 + T.starRadius * 1.01, 0.33, stars), -1, 'just outside the radius')
  assert.equal(nearestStar(0.8987 + 0.05, 0.1697, stars), 2, 'the moon reaches further')
  assert.equal(nearestStar(0.27, 0.33 + T.starRadius * 1.2, stars), 0, 'a v offset is worth less than u')
  assert.equal(flareShape(0), 0)
  assert.equal(flareShape(-1), 0)
  let peak = 0
  let peakAge = 0
  for (let age = 0; age <= 5; age += 0.001) {
    const f = flareShape(age)
    if (f > peak) {
      peak = f
      peakAge = age
    }
  }
  assert.ok(peakAge > 0.15 && peakAge < 0.5, `peak at ${peakAge}`)
  assert.ok(flareShape(5) < 0.05 * peak)
})
