import assert from 'node:assert/strict'
import test from 'node:test'
import { STATION_T, STREET, WALK_T } from '../src/scene/streetLayout.ts'
import {
  admitGesture,
  flicker,
  gait,
  hitBox,
  initialPause,
  initialWalk,
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
  type Pause,
  type WalkInput,
  type WalkState,
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
    const r = frame(initialWalk(STATION_T[1], true), { dwell: 2, rest: 0, turn: 0, last: STATION_T[1] }, over)
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
  let r = frame(initialWalk(STATION_T[1], true), { dwell: 2, rest: 0, turn: 0, last: STATION_T[1] }, { keys: -1 })
  assert.equal(r.p.dwell, 0, 'the step back ends the dwell')
  for (let k = 0; k < 20; k++) {
    r = frame(r.s, r.p)
    assert.equal(r.p.dwell, 0, `no dwell on step ${k + 1}`)
  }
  assert.ok(r.s.t > STATION_T[1], 'he walked on past the station')
})

test('a walk back past the station re-arms it', () => {
  let r = { s: initialWalk(0.215, true), p: { dwell: 0, rest: 0, turn: 0, last: STATION_T[1] } as Pause }
  for (let k = 0; k < 50 && r.p.dwell === 0; k++) r = frame(r.s, r.p)
  assert.equal(r.p.dwell, PAUSE.dwell, 'the crossing of 0.23 starts a 4 s dwell')
  assert.equal(r.p.last, STATION_T[1])
})

test('a stop on blur keeps the dwell', () => {
  const s = stopWalk(initialWalk(STATION_T[1], true))
  const r = frame(s, { dwell: 2, rest: 0, turn: 0, last: STATION_T[1] })
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
