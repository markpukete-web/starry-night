import assert from 'node:assert/strict'
import test from 'node:test'
import { STREET, WALK_T } from '../src/scene/streetLayout.ts'
import {
  gait,
  hitBox,
  initialWalk,
  stepWalk,
  stopWalk,
  toggleWalk,
  wheelPixels,
} from '../src/scene/streetWalk.ts'

test('the wheel walks forward and eases', () => {
  const L = STREET.pathLength
  let s = initialWalk(0.2, false)
  s = stepWalk(s, { dt: 1 / 60, wheelPx: 100, keys: 0, autoMode: false, paused: false, still: false })
  assert.ok(Math.abs(s.target - (0.2 + 0.1 / L)) < 1e-9, 'target moved by 0.1 / L')
  assert.ok(s.target - s.t > 0, 'precondition: target - t > 0')
  assert.ok(s.t - 0.2 < 0.1 / L, 't moved by less than target')
  for (let k = 0; k < 120; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: false, paused: false, still: false })
  }
  assert.equal(s.t, s.target, 'after 120 more steps t equals target')
})

test('a fling is capped', () => {
  const L = STREET.pathLength
  let s = initialWalk(0, false)
  const dt = 1 / 60
  s = stepWalk(s, { dt, wheelPx: 20000, keys: 0, autoMode: false, paused: false, still: false })
  const maxMove = (0.5 * dt) / L
  assert.ok(s.t <= maxMove + 1e-9, `t move ${s.t} <= maxMove ${maxMove}`)
  for (let k = 0; k < 599; k++) {
    s = stepWalk(s, { dt, wheelPx: 20000, keys: 0, autoMode: false, paused: false, still: false })
  }
  assert.equal(s.t, WALK_T.max, '600 steps end at exactly WALK_T.max')
  assert.ok(s.t <= WALK_T.max, 'never above WALK_T.max')

  let sAuto = initialWalk(0.89, true)
  for (let k = 0; k < 60; k++) {
    sAuto = stepWalk(sAuto, { dt, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  }
  assert.equal(sAuto.t, 0.9, 't is 0.9')
  assert.equal(sAuto.auto, false, 'auto is false once t is 0.9')
})

test('keys walk at their speed', () => {
  const L = STREET.pathLength
  let s = initialWalk(0.2, false)
  for (let k = 0; k < 60; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 1, autoMode: false, paused: false, still: false })
  }
  const delta = s.t - 0.2
  const expected = 0.15 / L
  assert.ok(Math.abs(delta - expected) / expected <= 0.02, `keys 1 moved ${delta} within 2% of ${expected}`)

  for (let k = 0; k < 60; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: -1, autoMode: false, paused: false, still: false })
  }
  const deltaBack = Math.abs(s.t - 0.2)
  assert.ok(deltaBack / expected <= 0.02, 'keys -1 walked back within 2%')

  let sZero = initialWalk(0.01, false)
  for (let k = 0; k < 60; k++) {
    sZero = stepWalk(sZero, { dt: 1 / 60, wheelPx: 0, keys: -1, autoMode: false, paused: false, still: false })
  }
  assert.ok(sZero.t >= 0, 't never goes below 0')
  assert.equal(sZero.t, 0, 't clamped at 0')
})

test('the automatic walk', () => {
  const L = STREET.pathLength
  let s = initialWalk(0.2, true)
  for (let k = 0; k < 60; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  }
  const delta = s.t - 0.2
  const expected = 0.08 / L
  assert.ok(Math.abs(delta - expected) / expected <= 0.02, `auto moved ${delta} within 2% of ${expected}`)

  let sPaused = initialWalk(0.2, true)
  for (let k = 0; k < 60; k++) {
    sPaused = stepWalk(sPaused, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: true, still: false })
  }
  assert.equal(sPaused.t, 0.2, 'with paused true: delta = 0')

  let sStill = initialWalk(0.2, true)
  for (let k = 0; k < 60; k++) {
    sStill = stepWalk(sStill, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: true })
  }
  assert.equal(sStill.t, 0.2, 'with still true: delta = 0')

  let sEnd = initialWalk(WALK_T.max, true)
  sEnd = stepWalk(sEnd, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  assert.equal(sEnd.t, WALK_T.max, 'at WALK_T.max it stays there')
})

test('releasing the keys stops at once', () => {
  let s = initialWalk(0.2, false)
  for (let k = 0; k < 60; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 1, autoMode: false, paused: false, still: false })
  }
  assert.ok(s.t > 0.2, 'precondition: t moved')
  const before = s.t
  s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: false, paused: false, still: false })
  assert.equal(s.t - before, 0, 'the next step moves t by 0')
})

test('a stop cancels the queue', () => {
  const L = STREET.pathLength
  let s = initialWalk(0.2, false)
  for (let k = 0; k < 3; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 300, keys: 0, autoMode: false, paused: false, still: false })
  }
  assert.ok(s.target - s.t > 0.01 / L, `precondition: target - t > 0.01 / L (${s.target - s.t} > ${0.01 / L})`)
  s = stopWalk(s)
  const afterStop = s.t
  for (let k = 0; k < 30; k++) {
    s = stepWalk(s, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: false, paused: false, still: false })
  }
  assert.equal(s.t, afterStop, 't unchanged after stopWalk')

  let sTap = initialWalk(0.2, true)
  for (let k = 0; k < 60; k++) {
    sTap = stepWalk(sTap, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  }
  sTap = toggleWalk(sTap, false)
  assert.equal(sTap.auto, false, 'auto is false after toggleWalk')
  const tapStopT = sTap.t
  for (let k = 0; k < 30; k++) {
    sTap = stepWalk(sTap, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  }
  assert.equal(sTap.t, tapStopT, 'next 30 steps leave t unchanged')
})

test('still has no easing', () => {
  let s = initialWalk(0.2, false)
  s = stepWalk(s, { dt: 1 / 60, wheelPx: 100, keys: 0, autoMode: false, paused: false, still: true })
  assert.equal(s.t, s.target, 't equals target after that one step under still')
})

test('a tap toggles, and under still steps to the next stop', () => {
  let s = initialWalk(0.2, false)
  s = toggleWalk(s, false)
  assert.equal(s.auto, true, 'toggleWalk flips auto to true')
  s = toggleWalk(s, false)
  assert.equal(s.auto, false, 'toggleWalk flips auto to false')

  const s03 = toggleWalk(initialWalk(0.3, false), true)
  assert.equal(s03.t, 0.44, 'from 0.3 gives 0.44')
  assert.equal(s03.auto, false, 'auto is false')

  const s044 = toggleWalk(initialWalk(0.44, false), true)
  assert.equal(s044.t, 0.66, 'from 0.44 gives 0.66')
  assert.equal(s044.auto, false, 'auto is false')

  const s09 = toggleWalk(initialWalk(0.9, false), true)
  assert.equal(s09.t, 0.9, 'from 0.9 stays 0.9')
  assert.equal(s09.auto, false, 'auto is false')
})

test('wheel units', () => {
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 0, ctrlKey: false }, 800), 10)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 1, ctrlKey: false }, 800), 160)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 2, ctrlKey: false }, 800), 8000)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 0, ctrlKey: true }, 800), 0)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 1, ctrlKey: true }, 800), 0)
})

test('the gait settles', () => {
  const g0 = gait(0.05, 0, false)
  assert.equal(g0.lift, 0)
  assert.equal(g0.roll, 0)

  const gMid = gait(0.02, 0.15, false)
  assert.ok(Math.abs(gMid.lift - 0.0015) < 1e-6, `mid-step lift is 0.0015 (got ${gMid.lift})`)

  const gStill = gait(0.02, 0.15, true)
  assert.equal(gStill.lift, 0)
  assert.equal(gStill.roll, 0)
  assert.equal(gStill.arm, 0)
})

test('the hit box is at least 48 px', () => {
  const box = { x0: 95, y0: 85, x1: 105, y1: 115 }
  assert.equal(hitBox(box, 100, 76), true, 'hits (100, 76)')
  assert.equal(hitBox(box, 120, 100), true, 'hits (120, 100)')
  assert.equal(hitBox(box, 100, 70), false, 'misses (100, 70)')
})
