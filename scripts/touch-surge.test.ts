import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyGesture,
  flareShape,
  hoverDue,
  nearestStar,
  pushSurge,
  SKY_ASPECT,
  surgeSum,
  surgeTerms,
  TOUCH_SURGE,
  type Surge,
} from '../src/scene/touchSurge.ts'
import { SPAN_H, SPAN_V } from '../src/scene/skyMapping.ts'

// ---- B, touch (tasks/2026-10-13-touch-b-plan.md)

const T = TOUCH_SURGE
const along: readonly [number, number] = [1, 0]

test('T22 the surge twin: nothing before t0, a bounded lift, a monotone kick, a crest that runs at the speed, gone by five tau', () => {
  const s: Surge = { u: 0.5, v: 0.3, t0: 5, amp: 1 }
  assert.deepEqual(surgeTerms([0.5, 0.3], along, s, 4.9), { lift: 0, warp: 0 })
  // age exactly 0: the bloom lights the point, the kick is 0
  const at0 = surgeTerms([0.5, 0.3], along, s, 5)
  assert.ok(at0.lift > 1.4 && at0.lift <= T.maxLift + 1e-12, `the point lights at age 0: ${at0.lift}`)
  assert.equal(at0.warp, 0)
  // the summed lift never exceeds the ceiling, three surges overlapping
  const three: Surge[] = [s, { u: 0.52, v: 0.31, t0: 5.2, amp: 1 }, { u: 0.49, v: 0.3, t0: 5.5, amp: 1 }]
  let minStep = Infinity
  for (let x = 0.3; x <= 0.8; x += 0.01) {
    let previous: number | null = null
    for (let t = 4; t <= 14; t += 1 / 120) {
      const { lift, warp } = surgeSum([x, 0.3], along, three, t)
      assert.ok(lift <= T.maxLift + 1e-12)
      if (previous !== null) minStep = Math.min(minStep, warp - previous)
      previous = warp
    }
  }
  assert.ok(minStep >= 0, `the kick never steps backwards (min step ${minStep})`)
  // the crest of the pulse sits at speed · age along the tangent (within 1%, after the bloom lets go)
  for (const age of [1, 2]) {
    let best = -1
    let bestX = 0
    for (let x = 0; x <= 1.2; x += 0.0005) {
      const { lift } = surgeTerms([x, 0.3], along, { ...s, t0: 0 }, age)
      if (lift > best) {
        best = lift
        bestX = x - 0.5
      }
    }
    assert.ok(Math.abs(bestX - T.speed * age) <= 0.01 * T.speed * age + 1e-3, `crest at ${bestX} for age ${age}`)
  }
  // an upstream vertex takes the bloom only: at along = -0.2 the lift is a thousandth of the peak
  const up = surgeTerms([0.3, 0.3], along, { ...s, t0: 0 }, 0.8)
  assert.ok(up.lift < 1e-3)
  // gone by five tau
  let late = 0
  for (let x = 0; x <= 1.3; x += 0.001) late = Math.max(late, surgeTerms([x, 0.3], along, { ...s, t0: 0 }, 5 * T.tau).lift)
  assert.ok(late < 0.005 * T.maxLift, `late lift ${late}`)
  // the aspect: v is scaled so the dome's distances are isotropic
  assert.ok(Math.abs(SKY_ASPECT - (SPAN_V * 1.06) / (SPAN_H * 1.16)) < 1e-12)
})

test('T22b the surge list: the oldest goes beyond the cap, the stale are pruned', () => {
  let list: Surge[] = []
  for (let i = 0; i < 12; i++) list = pushSurge(list, { u: i / 12, v: 0.3, t0: i * 0.1, amp: 1 }, i * 0.1)
  assert.equal(list.length, T.maxSurges)
  assert.equal(list[0].u, 4 / 12, 'the newest eight remain')
  list = pushSurge(list, { u: 0.9, v: 0.3, t0: 20, amp: 1 }, 20)
  assert.deepEqual(list, [{ u: 0.9, v: 0.3, t0: 20, amp: 1 }], 'everything older than the prune age is gone')
})

test('T23 the classifier: a quick still down-up is a tap, anything longer or further is a drag; hovers are throttled', () => {
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 104, y: 103, ms: 200 }), 'tap')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 100, y: 100, ms: 301 }), 'drag')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 109, y: 100, ms: 100 }), 'drag')
  assert.equal(classifyGesture({ x: 100, y: 100, ms: 0 }, { x: 100, y: 108, ms: 300 }), 'tap')
  assert.equal(hoverDue(null, 1000), true)
  assert.equal(hoverDue(1000, 1030), false)
  assert.equal(hoverDue(1000, 1060), true)
  // the throttle emits at most one surge per hoverMs over a 1 s sweep
  let last: number | null = null
  let emitted = 0
  for (let ms = 0; ms < 1000; ms += 16) {
    if (hoverDue(last, ms)) {
      emitted++
      last = ms
    }
  }
  assert.ok(emitted <= Math.ceil(1000 / T.hoverMs) && emitted >= Math.floor(1000 / T.hoverMs) - 1, `emitted ${emitted}`)
})

test('T25 the star hit test: the nearest star within its radius, none beyond, the moon at its larger radius', () => {
  const stars = [
    { u: 0.27, v: 0.33, radius: T.starRadius },
    { u: 0.13, v: 0.13, radius: T.starRadius },
    { u: 0.86, v: 0.13, radius: T.moonRadius },
  ]
  assert.equal(nearestStar(0.28, 0.34, stars), 0)
  assert.equal(nearestStar(0.5, 0.5, stars), -1)
  assert.equal(nearestStar(0.27 + T.starRadius * 1.01, 0.33, stars), -1, 'just outside the radius')
  assert.equal(nearestStar(0.86 + 0.05, 0.13, stars), 2, 'the moon reaches further')
  // the aspect applies: a v offset is worth less than the same u offset
  assert.equal(nearestStar(0.27, 0.33 + T.starRadius * 1.2, stars), 0)
})

test('T25b the flare: 0 at and before age 0, a quick rise, a slow fall', () => {
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
