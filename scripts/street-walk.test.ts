import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { mulberry32 } from '../src/scene/brush.ts'
import { STATION_T, STREET, vincentPlace, WALK_T } from '../src/scene/streetLayout.ts'
import * as walk from '../src/scene/streetWalk.ts'
import {
  admitGesture,
  autoOn,
  flicker,
  gait,
  hitBox,
  initialPause,
  initialWalk,
  keyDown,
  keyUp,
  lag,
  limbs,
  PAUSE,
  stepPause,
  stepWalk,
  stopWalk,
  setVincentGround,
  toggleWalk,
  turnPose,
  wheelPixels,
  vincentGround,
  type HeldKeys,
  type Pause,
  type WalkInput,
  type WalkState,
} from '../src/scene/streetWalk.ts'
import { roundedJson } from './lib/rounded-json.ts'

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

  // a tap with a scroll still queued: the walking pass above has none, since the automatic walk moves t and target
  // together (the Lead's gate: dropping the tap's cancel survived it)
  let sQueued = initialWalk(0.2, true)
  for (let k = 0; k < 3; k++) {
    sQueued = stepWalk(sQueued, { dt: 1 / 60, wheelPx: 300, keys: 0, autoMode: true, paused: false, still: false })
  }
  assert.ok(sQueued.target - sQueued.t > 0.01 / L, 'precondition: a queue behind the automatic walk')
  sQueued = toggleWalk(sQueued, false)
  assert.equal(sQueued.target, sQueued.t, 'the tap cancels the queue')
  const queuedStopT = sQueued.t
  for (let k = 0; k < 30; k++) {
    sQueued = stepWalk(sQueued, { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false })
  }
  assert.equal(sQueued.t, queuedStopT, 'he stays where the tap stopped him')
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

})

test('wheel units', () => {
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 0, ctrlKey: false }, 800), 10)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 1, ctrlKey: false }, 800), 160)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 2, ctrlKey: false }, 800), 8000)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 0, ctrlKey: true }, 800), 0)
  assert.equal(wheelPixels({ deltaY: 10, deltaMode: 1, ctrlKey: true }, 800), 0)
})

// V1 task 2: the pause, the turn and the stride (Decisions (f), (g), (h), (i) of the plan)
const STEP: WalkInput = { dt: 0.01, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false }

function frame(
  s: WalkState,
  p: Pause,
  over: Partial<WalkInput> = {},
  immediate = false,
): { s: WalkState; p: Pause } {
  const i = { ...STEP, ...over }
  const r = stepPause(s, stepWalk(s, i), p, i, immediate)
  return { s: r.next, p: r.pause }
}

/** Walks from `t0` until the first frame whose `t` is the station's: frame 0, the arrival. */
function arrive(t0: number, station: number): { s: WalkState; p: Pause } {
  let r = { s: initialWalk(t0, true), p: initialPause() }
  for (let k = 0; k < 50 && r.s.t !== station; k++) r = frame(r.s, r.p)
  assert.equal(r.s.t, station, 'precondition: the walk reached the station')
  return r
}

const near = (a: number, b: number, tol = 1e-12): boolean => Math.abs(a - b) <= tol

test('a dwell holds the walk 4 s at a station', () => {
  const station = STATION_T[1]
  let r = arrive(0.229, station)
  assert.equal(r.p.dwell, PAUSE.dwell, 'frame 0 starts the dwell')
  for (let k = 1; k < 400; k++) {
    r = frame(r.s, r.p)
    assert.equal(r.s.t, station, `t is the station's on frame ${k}`)
  }
  r = frame(r.s, r.p)
  assert.ok(r.s.t > station, 't moves on frame 400')
})

test('no dwell starting on a station', () => {
  const r = frame(initialWalk(STATION_T[1], true), initialPause())
  assert.ok(r.s.t > STATION_T[1], 't rises on the first step')
  assert.equal(r.p.dwell, 0)
})

test('a step from just under a station stops on it', () => {
  // Codex, PR #34: a frame that lands within 1e-6 below 0.23 crossed it on the next step with no dwell
  const r = frame(initialWalk(STATION_T[1] - 5e-7, true), initialPause())
  assert.equal(r.s.t, STATION_T[1])
  assert.equal(r.p.dwell, PAUSE.dwell)
})

test("no dwell at the walk's end", () => {
  let r = { s: initialWalk(0.89, true), p: initialPause() }
  for (let k = 0; k < 600 && r.s.t < WALK_T.max; k++) {
    r = frame(r.s, r.p)
    assert.equal(r.p.dwell, 0, `no dwell on frame ${k}`)
  }
  assert.equal(r.s.t, WALK_T.max, 'the walk reached its end')
  assert.equal(r.p.dwell, 0)
})

test('the turn comes in after the rest and leaves before the dwell ends', () => {
  let r = arrive(0.229, STATION_T[1])
  const turn: number[] = [r.p.turn]
  for (let k = 1; k <= 410; k++) {
    r = frame(r.s, r.p)
    turn.push(r.p.turn)
  }
  assert.equal(turn[49], 0, 'frame 49')
  assert.ok(turn[51] > 0, 'frame 51')
  assert.equal(turn[111], 1, 'frame 111')
  assert.ok(turn[357] < 1, 'frame 357')
  for (let k = 387; k <= 410; k++) assert.equal(turn[k], 0, `frame ${k}`)
})

test('input ends a dwell', () => {
  for (const over of [{ wheelPx: 100 }, { keys: 1 as const }]) {
    const r = frame(initialWalk(STATION_T[1], true), { dwell: 2, rest: 0, turn: 0, last: STATION_T[1], about: 0 }, over)
    assert.equal(r.p.dwell, 0, `${JSON.stringify(over)} ends the dwell`)
    assert.ok(r.s.t > STATION_T[1], `${JSON.stringify(over)}: that frame's walk step stands`)
  }
})

test('a scroll across a station makes no stop', () => {
  // Codex B2: the wheel's own frame crosses 0.23, and the walk step stands as `stepWalk` made it
  const s0 = initialWalk(0.229, true)
  const walked = stepWalk(s0, { ...STEP, wheelPx: 100 })
  assert.ok(walked.t > STATION_T[1], 'the control: the wheel frame crosses the station')
  let r = frame(s0, initialPause(), { wheelPx: 100 })
  assert.equal(r.p.dwell, 0, 'no dwell on the wheel frame')
  assert.equal(r.s.t, walked.t)
  assert.equal(r.s.target, walked.target)
  // a scroll that crosses while it eases in, on frames with no input, carries him past too
  r = frame(initialWalk(0.225, true), initialPause(), { wheelPx: 100 })
  let crossed = false
  for (let k = 0; k < 400 && r.s.t !== r.s.target; k++) {
    const before = r.s.t
    r = frame(r.s, r.p)
    if (before < STATION_T[1] && r.s.t >= STATION_T[1]) crossed = true
    assert.equal(r.p.dwell, 0, `frame ${k}: no dwell while the scroll eases in`)
  }
  assert.ok(crossed, 'the control: the eased scroll crosses the station on a frame with no input')
  assert.equal(r.s.t, r.s.target, 'the scroll is taken in full')
})

test('a dwell ended by a step back does not start again', () => {
  let r = frame(initialWalk(STATION_T[1], true), { dwell: 2, rest: 0, turn: 0, last: STATION_T[1], about: 0 }, { keys: -1 })
  assert.equal(r.p.dwell, 0, 'the step back ends the dwell')
  for (let k = 0; k < 20; k++) {
    r = frame(r.s, r.p)
    assert.equal(r.p.dwell, 0, `no dwell on step ${k + 1}`)
  }
  assert.ok(r.s.t > STATION_T[1], 'he walked on past the station')
})

test('a walk back past the station re-arms it', () => {
  let r = { s: initialWalk(0.215, true), p: { dwell: 0, rest: 0, turn: 0, last: STATION_T[1], about: 0 } as Pause }
  for (let k = 0; k < 50 && r.p.dwell === 0; k++) r = frame(r.s, r.p)
  assert.equal(r.p.dwell, PAUSE.dwell, 'the crossing of 0.23 starts a 4 s dwell')
  assert.equal(r.p.last, STATION_T[1])
})

test('a stop on blur keeps the dwell', () => {
  const s = stopWalk(initialWalk(STATION_T[1], true))
  const r = frame(s, { dwell: 2, rest: 0, turn: 0, last: STATION_T[1], about: 0 })
  assert.equal(r.s.auto, true)
  assert.equal(r.s.t, STATION_T[1])
  assert.ok(near(r.p.dwell, 1.99), `dwell is 1.99 (got ${r.p.dwell})`)
})

test('the input walk turns at rest', () => {
  let r = { s: initialWalk(0.3, false), p: initialPause() }
  for (let k = 0; k < 111; k++) r = frame(r.s, r.p, { autoMode: false })
  assert.equal(r.p.turn, 1, 'turn is 1 after 1.11 s')
})

test('reduced motion stands turned', () => {
  const r = frame(initialWalk(0.3, false), initialPause(), { autoMode: false }, true)
  assert.equal(r.p.turn, 1)
})

test('no stride walking backward, turned or still', () => {
  const zero = { lift: 0, roll: 0, arm: 0, leg: 0, pitch: 0 }
  assert.deepEqual(gait(0.02, 0.15, false, 0), zero, 'not forward')
  assert.deepEqual(gait(0.02, 0.15, true, PAUSE.turnGate), zero, 'turn 0.2')
  assert.deepEqual(gait(0.02, 0, true, 0), zero, 'speed 0')
  const walking = gait(0.02, 0.15, true, 0)
  assert.notEqual(walking.arm, 0, 'control: the arm swings')
  assert.notEqual(walking.leg, 0, 'control: the leg swings')
  // the plan's control sits at mid-step, where cos is 6e-17: at the end of the swing the control means something
  const swing = gait(0, 0.15, true, 0)
  assert.ok(near(swing.arm, 0.12) && near(swing.leg, 0.35) && near(swing.pitch, 0.06), 'control: full swing')
})

test('the head lags the body', () => {
  const quarter = turnPose(0.25)
  assert.equal(quarter.head, 0)
  assert.ok(quarter.body > 0)
  const full = turnPose(1)
  assert.ok(near(full.body, Math.PI / 2) && near(full.head, Math.PI / 4) && near(full.raise, 0.75))
})

test('each arm moves with the opposite leg', () => {
  const w = limbs(gait(0.02, 0.15, true, 0), turnPose(0))
  assert.equal(w.armRight, -w.armLeft)
  assert.equal(w.legLeft, -w.legRight)
  assert.equal(Math.sign(w.armLeft), Math.sign(w.legRight))
  // away from mid-step, where the swings are not rounding noise
  const s = limbs(gait(0, 0.15, true, 0), turnPose(0))
  assert.ok(near(s.armLeft, 0.12) && near(s.armRight, -0.12), 'the arms swing against each other')
  assert.ok(near(s.legLeft, -0.35) && near(s.legRight, 0.35), 'left leg −leg, right leg +leg')
  assert.ok(s.armLeft > 0 && s.legRight > 0 && s.armRight < 0 && s.legLeft < 0, 'each arm with the opposite leg')
  const still = limbs(gait(0.02, 0, true, 1), turnPose(1))
  assert.ok(near(still.armLeft, -0.75), 'left arm raised')
  assert.ok(near(still.armRight, 0) && near(still.legLeft, 0) && near(still.legRight, 0))
  assert.ok(near(still.hang, 0.75))
})

test('the lantern lags the hand', () => {
  assert.ok(near(lag(0, 1, PAUSE.lag), 1 - Math.exp(-1), 1e-9))
})

test('the pool is still under reduced motion', () => {
  for (const t of [0, 0.37, 1.2, 2.5, 7.9]) {
    assert.equal(flicker(t, true), 1, `still at ${t}`)
    const f = flicker(t, false)
    assert.ok(f >= 0.92 && f <= 1, `lit flicker at ${t} is ${f}`)
  }
  assert.ok(near(flicker(0, false), 0.96))
})

test('the hit box is at least 48 px', () => {
  const box = { x0: 95, y0: 85, x1: 105, y1: 115 }
  assert.equal(hitBox(box, 100, 76), true, 'hits (100, 76)')
  assert.equal(hitBox(box, 120, 100), true, 'hits (120, 100)')
  assert.equal(hitBox(box, 100, 70), false, 'misses (100, 70)')
})

test('admitGesture: down outside with up inside is a hand gesture', () => {
  const box = { x0: 100, y0: 100, x1: 200, y1: 200 }
  // Padded boundary for 100x100 box: [100..200, 100..200]
  // Down 1 px outside: x = 99, y = 150
  const kind = admitGesture(box, 99, 150)
  assert.equal(kind, 'hand', 'down 1 px outside is a hand gesture')
})

test('admitGesture: down inside with box moved away at up is still Vincent\'s', () => {
  const box = { x0: 100, y0: 100, x1: 200, y1: 200 }
  // Down inside: x = 150, y = 150
  const kind = admitGesture(box, 150, 150)
  assert.equal(kind, 'vincent', 'down inside is Vincent\'s gesture')
})

test('admitGesture: null box is a hand gesture', () => {
  const kind = admitGesture(null, 150, 150)
  assert.equal(kind, 'hand', 'null box is a hand gesture')
})

test('vincentGround: null until the walk writes it, a live binding after, null again when the walk goes', () => {
  assert.equal(vincentGround, null)
  setVincentGround([0.25, -0.5])
  assert.deepEqual(vincentGround, [0.25, -0.5])
  setVincentGround(null)
  assert.equal(vincentGround, null)
})

test('autoOn: true exactly when the automatic walk moves him, for all sixteen inputs (the wander\'s walk home, (p))', () => {
  for (const auto of [false, true]) {
    for (const autoMode of [false, true]) {
      for (const paused of [false, true]) {
        for (const still of [false, true]) {
          const s = { ...initialWalk(0.3, autoMode), auto }
          const i: WalkInput = { dt: 1 / 60, wheelPx: 0, keys: 0, autoMode, paused, still }
          assert.equal(autoOn(s, i), stepWalk(s, i).t > s.t, JSON.stringify({ auto, autoMode, paused, still }))
        }
      }
    }
  }
})

test('the held keys: Cmd+Arrow holds nothing, and a Meta release clears both, since macOS sends no keyup for a key released while Cmd is down (the audit, item 11c)', () => {
  const none: HeldKeys = { forward: false, back: false }
  const both: HeldKeys = { forward: true, back: true }
  const press = (code: string, metaKey = false) => ({ code, metaKey })
  const release = (code: string, key: string) => ({ code, key })
  // one table, so a red run names every case it gets wrong
  assert.deepEqual(
    {
      arrowUp: keyDown(none, press('ArrowUp')),
      keyS: keyDown(none, press('KeyS')),
      cmdArrowUp: keyDown(none, press('ArrowUp', true)),
      cmdArrowDown: keyDown(none, press('ArrowDown', true)),
      metaLeftUp: keyUp(both, release('MetaLeft', 'Meta')),
      metaRightUp: keyUp(both, release('MetaRight', 'Meta')),
      arrowUpUp: keyUp(both, release('ArrowUp', 'ArrowUp')),
      shiftUp: keyUp(both, release('ShiftLeft', 'Shift')),
    },
    {
      arrowUp: { forward: true, back: false },
      keyS: { forward: false, back: true },
      cmdArrowUp: none,
      cmdArrowDown: none,
      metaLeftUp: none,
      metaRightUp: none,
      arrowUpUp: { forward: false, back: true },
      shiftUp: both,
    },
  )
})

// The walk's end and the walk back (tasks/2026-11-14-walk-end-plan.md, tests 1 to 7, 9 and 10). Each walk steps at dt
// 1/60 through `stepWalk` then `stepPause`, the frame loop's order. `walk.` reads the names the base commit lacks, so
// this file still loads there (F6)
const DT = 1 / 60
const PHONE: WalkInput = { dt: DT, wheelPx: 0, keys: 0, autoMode: true, paused: false, still: false }
const ease = (x: number) => x * x * (3 - 2 * x)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const aboutOf = (p: Pause): number => p.about ?? 0
/** his turn: the figure's yaw relative to the lane, with no slot yaw in it (Argon's A4, V4-1) */
const hisTurn = (p: Pause) => Math.PI * ease(aboutOf(p)) + turnPose(p.turn, aboutOf(p)).body
/** test 7's bar: the steepest step of the dwell's turn-out in the forward walk Mark passed, from the constants */
const BAR = (PAUSE.body * 1.5 * DT) / PAUSE.turnOut + 1e-9

type Frame = { prevT: number; t: number; turn: number; about: number; dwell: number; his: number; head: number; distance: number; speed: number }

function step(s: WalkState, p: Pause, over: Partial<WalkInput> = {}): { s: WalkState; p: Pause } {
  const i = { ...PHONE, ...over }
  const r = stepPause(s, stepWalk(s, i), p, i, false)
  return { s: r.next, p: r.pause }
}

function record(prevT: number, s: WalkState, p: Pause): Frame {
  const about = aboutOf(p)
  return { prevT, t: s.t, turn: p.turn, about, dwell: p.dwell, his: hisTurn(p), head: turnPose(p.turn, about).head, distance: s.distance, speed: s.speed }
}

/** the automatic walk stepped until it turns off, or the cap */
function walkOn(s: WalkState, p: Pause, cap = 20000): { s: WalkState; p: Pause; frames: Frame[]; ended: boolean } {
  const frames: Frame[] = []
  while (s.auto && frames.length < cap) {
    const prevT = s.t
    ;({ s, p } = step(s, p))
    frames.push(record(prevT, s, p))
  }
  return { s, p, frames, ended: !s.auto }
}

const forwardWalk = () => walkOn(initialWalk(0, true), initialPause())

/** test 2's walk: from the end of test 1 with the lantern raised, a tap on him, then the automatic walk */
function walkBack() {
  const f = forwardWalk()
  const p = { ...f.p, turn: 1 }
  const tapped = toggleWalk(f.s, false, true)
  return { start: p, tapped, ...walkOn(tapped, p) }
}

function roundTrip() {
  const b = walkBack()
  const tapped = toggleWalk(b.s, false, true)
  return { start: b.p, tapped, ...walkOn(tapped, b.p) }
}

/** the runs of frames with a dwell: the station and the run's length in frames */
function dwells(frames: Frame[]): { station: number; frames: number }[] {
  const out: { station: number; frames: number }[] = []
  let k = 0
  while (k < frames.length) {
    if (frames[k].dwell > 0) {
      const station = frames[k].t
      let n = 0
      while (k < frames.length && frames[k].dwell > 0) {
        assert.equal(frames[k].t, station, `the dwell at ${station} holds t`)
        n++
        k++
      }
      out.push({ station, frames: n })
    } else k++
  }
  return out
}

test('the walk end, 1: the forward walk is unchanged, t and turn', () => {
  const f = forwardWalk()
  assert.ok(f.ended, 'the forward walk ends')
  const pairs = f.frames.map((x) => [x.t, x.turn])
  // read on the base: 1429a57 (main 8ebb527's walk code, the plan only on top), 2,337 frames. The `t` alone hashes to
  // a7dd47de8e3b1696 there, as Argon read it on 1dc440d
  assert.equal(pairs.length, 2337, 'frames')
  assert.equal(createHash('sha256').update(roundedJson(pairs)).digest('hex').slice(0, 16), 'f4152ecffdc095cd', 'the [t, turn] hash')
})

test('the walk end, 2: a tap at stop 4 turns him, and the automatic walk takes him back to stop 0 with its dwells', () => {
  const b = walkBack()
  assert.equal(b.tapped.dir, -1, 'the tap gives dir -1')
  assert.equal(b.tapped.auto, true, 'the tap turns the automatic walk on')
  assert.ok(b.ended, `the automatic walk turned off within the cap (t ${b.s.t})`)
  assert.equal(typeof walk.facesMotion, 'function', 'facesMotion exists')
  const first = b.frames.findIndex((f) => f.t !== f.prevT)
  assert.ok(first >= 0, 'he moved')
  const f0 = b.frames[first]
  assert.ok(f0.about === 1 && f0.turn < PAUSE.turnGate, `t first changes on frame ${first} with about ${f0.about} and turn ${f0.turn}`)
  let his = hisTurn(b.start)
  for (let k = 0; k <= first; k++) {
    // 1e-12 is float rounding: with turn 1 and about rising his turn is π/2, but not to the last bit
    assert.ok(b.frames[k].his >= his - 1e-12, `his turn fell on frame ${k}: ${his} to ${b.frames[k].his}`)
    his = b.frames[k].his
  }
  const d = dwells(b.frames)
  assert.deepEqual(d.map((x) => x.station), [STATION_T[3], STATION_T[2], STATION_T[1]], 'dwells at 0.66, 0.44, 0.23, none at 0.9 or 0')
  for (const x of d) assert.ok(Math.abs(x.frames * DT - PAUSE.dwell) <= DT + 1e-9, `the dwell at ${x.station} lasts ${x.frames} frames`)
  const falling = b.frames.filter((f) => f.t < f.prevT)
  let striding = 0
  for (const f of falling) {
    const faces = walk.facesMotion(f.prevT, f.t, f.about)
    assert.ok(f.turn < PAUSE.turnGate && faces, `at t ${f.t}: turn ${f.turn}, facesMotion ${faces}`)
    if (gait(f.distance, f.speed, faces, f.turn).leg !== 0) striding++
  }
  assert.ok(striding > falling.length / 2, `he strides on ${striding} of ${falling.length} frames`)
  assert.equal(b.s.t, WALK_T.min, 'the walk ends at t 0')
  assert.equal(b.s.auto, false, 'with the automatic walk off')
})

test('the walk end, 3: a tap at stop 0 turns him again, and the walk forward repeats the dwells', () => {
  const r = roundTrip()
  assert.equal(r.tapped.dir, 1, 'the tap gives dir 1')
  assert.equal(r.tapped.auto, true, 'the tap turns the automatic walk on')
  assert.ok(r.ended, 'the automatic walk turned off within the cap')
  assert.deepEqual(dwells(r.frames), dwells(forwardWalk().frames), "test 1's dwells")
  assert.equal(r.s.t, WALK_T.max, 'the walk ends at t 0.9')
})

test('the walk end, 4: a tap mid-lane toggles the walk and keeps dir', () => {
  for (const dir of [1, -1] as const) {
    const on = { ...initialWalk(0.3, true), dir }
    const off = toggleWalk(on, false, true)
    assert.deepEqual([off.auto, off.dir], [false, dir], `dir ${dir}: a tap stops him`)
    const again = toggleWalk(off, false, true)
    assert.deepEqual([again.auto, again.dir], [true, dir], `dir ${dir}: a second tap starts him`)
  }
})

test('the walk end, 5: in the still state taps from 0.9 visit every station down, then flip and go up', () => {
  for (const autoMode of [false, true]) {
    let s = initialWalk(0.9, autoMode)
    const visits: number[] = []
    for (let k = 0; k < 6; k++) {
      s = toggleWalk(s, true, autoMode)
      assert.equal(s.auto, false, 'auto is false')
      visits.push(s.t)
    }
    assert.deepEqual(visits, [0.66, 0.44, 0.23, 0, 0.23, 0.44], `autoMode ${autoMode}`)
  }
})

test('the walk end, 6: at a dwell he faces the same way in the world going up and coming back', () => {
  const station = STATION_T[2]
  const up = forwardWalk().frames.find((f) => f.t === station && f.turn === 1)
  const back = walkBack().frames.find((f) => f.t === station && f.turn === 1)
  assert.ok(up && back, 'a frame at 0.44 turned in full each way')
  const slot = vincentPlace(station).yaw
  assert.ok(Math.abs(wrap(slot + up.his - (slot + back.his))) <= 1e-9, `up ${up.his}, back ${back.his}`)
})

test("the walk end, 7: no snap, his turn steps by at most the passed walk's steepest step", () => {
  for (const r of [walkBack(), roundTrip()]) {
    let his = hisTurn(r.start)
    r.frames.forEach((f, k) => {
      assert.ok(Math.abs(f.his - his) <= BAR, `frame ${k}: his turn stepped ${Math.abs(f.his - his)}`)
      his = f.his
    })
  }
  // the sweep: a half-turn at each end from five turns, through `stepPause` with the automatic walk on
  const ends = [
    { t: WALK_T.max, dir: 1, about: 0, sign: 1 },
    { t: WALK_T.min, dir: -1, about: 1, sign: -1 },
  ] as const
  for (const end of ends) {
    for (const turn of [0, 0.25, 0.5, 0.75, 1]) {
      const what = `the half-turn at t ${end.t} from turn ${turn}`
      let s = toggleWalk({ ...initialWalk(end.t, true), dir: end.dir, auto: false }, false, true)
      let p: Pause = { ...initialPause(), turn, rest: 1, about: end.about }
      let his = hisTurn(p)
      let head = turnPose(p.turn, aboutOf(p)).head
      for (let k = 0; k < 200; k++) {
        const prevT = s.t
        ;({ s, p } = step(s, p))
        const f = record(prevT, s, p)
        assert.ok(end.sign * (f.his - his) >= -1e-12, `${what}, frame ${k}: his turn went back, ${his} to ${f.his}`)
        assert.ok(Math.abs(f.his - his) <= BAR, `${what}, frame ${k}: his turn stepped ${Math.abs(f.his - his)}`)
        assert.ok(Math.abs(f.head - head) <= BAR, `${what}, frame ${k}: his head stepped ${Math.abs(f.head - head)}`)
        his = f.his
        head = f.head
        if (f.t !== prevT) {
          assert.ok(f.turn < PAUSE.turnGate, `${what}: turn ${f.turn} on the first frame he moves`)
          break
        }
      }
    }
  }
})

test('the walk end, 9a: turned at a stand, a back key slides him back turned (V1)', () => {
  let r = { s: { ...initialWalk(0.3, true), auto: false }, p: { ...initialPause(), turn: 1, rest: 1 } }
  for (let k = 0; k < 30; k++) r = step(r.s, r.p, { keys: -1 })
  assert.ok(r.s.t < 0.3, 'precondition: he moved back')
  assert.equal(r.p.turn, 1, 'turn is still 1')
})

test('the walk end, 9b: after the walk back a forward key turns him to face up the lane', () => {
  const b = walkBack()
  let r = { s: b.s, p: b.p }
  assert.ok(r.s.t === WALK_T.min && aboutOf(r.p) === 1, `precondition: at 0 facing down (t ${r.s.t}, about ${aboutOf(r.p)})`)
  const frames: Frame[] = []
  for (let k = 0; k < 60; k++) {
    const prevT = r.s.t
    r = step(r.s, r.p, { keys: 1 })
    if (k === 0) assert.equal(r.s.dir, 1, 'dir is 1 from the first frame')
    frames.push(record(prevT, r.s, r.p))
  }
  const zero = frames.findIndex((f) => f.about === 0)
  assert.ok(zero >= 0 && (zero + 1) * DT <= PAUSE.about + DT + 1e-9, `about reaches 0 on frame ${zero}`)
  assert.ok(r.s.t > WALK_T.min, 't rises')
  for (const f of frames.slice(zero + 1)) assert.ok(walk.facesMotion(f.prevT, f.t, f.about), `facesMotion at t ${f.t}`)
})

test('the walk end, 9c: on the desktop a tap at 0.9 does not turn him', () => {
  let r = { s: toggleWalk(initialWalk(WALK_T.max, false), false, false), p: initialPause() }
  assert.equal(r.s.dir, 1, 'dir is 1')
  for (let k = 0; k < 60; k++) {
    r = step(r.s, r.p, { autoMode: false })
    assert.equal(aboutOf(r.p), 0, `about is 0 on frame ${k}`)
  }
})

test('the walk end, 10: the property test, 500 seeded sequences of 600 frames in each mode', () => {
  const SEQUENCES = 500
  const FRAMES = 600
  for (const autoMode of [true, false]) {
    for (let seed = 1; seed <= SEQUENCES; seed++) {
      const rand = mulberry32(autoMode ? seed : 100000 + seed)
      const station = STATION_T[Math.floor(rand() * STATION_T.length)]
      const dir = autoMode && rand() < 0.5 ? -1 : 1
      let s: WalkState = { ...initialWalk(station, autoMode), dir }
      let p: Pause = { ...initialPause(), about: dir === -1 ? 1 : 0 }
      let idle = 0
      for (let k = 0; k < FRAMES; k++) {
        const fail = (what: string) =>
          assert.fail(`seed ${seed}, autoMode ${autoMode}, frame ${k}: ${what} (t ${s.t}, dir ${s.dir}, about ${aboutOf(p)}, turn ${p.turn})`)
        let keys: -1 | 0 | 1 = 0
        let wheelPx = 0
        if (idle > 0) idle--
        else {
          const act = Math.floor(rand() * 6)
          if (act === 1) s = toggleWalk(s, false, autoMode)
          else if (act === 2) keys = 1
          else if (act === 3) keys = -1
          else if (act === 4) wheelPx = rand() < 0.5 ? 120 : -120
          else if (act === 5) idle = 1 + Math.floor(rand() * 60)
        }
        const before = hisTurn(p)
        const prevT = s.t
        ;({ s, p } = step(s, p, { keys, wheelPx, autoMode }))
        if (!autoMode && s.dir !== 1) fail('dir is not 1 with autoMode false')
        if (keys > 0 && s.dir !== 1) fail('dir is not 1 after a forward key')
        const end = s.dir === -1 ? 1 : 0
        const against = Math.abs(s.t - prevT) > 1e-7 && !walk.facesMotion(prevT, s.t, aboutOf(p))
        if (against && !((s.dir === 1 && s.t < prevT) || aboutOf(p) !== end)) fail(`he moved ${prevT} to ${s.t} against his facing`)
        if (Math.abs(hisTurn(p) - before) > BAR) fail(`his turn stepped ${Math.abs(hisTurn(p) - before)}`)
      }
    }
  }
})
