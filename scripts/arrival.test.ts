import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PerspectiveCamera } from 'three'
import { ARRIVAL, ARRIVAL_CUE, ARRIVED_KEY, ARRIVAL_END, ARRIVAL_START_INSIDE_ORBIT, ArrivalClock, VINCENTS_CITE, VINCENTS_LINE, arrivalCamera, arrivalFrame, boundedDt } from '../src/scene/arrival.ts'
import { DIORAMA_CAMERAS, DIORAMA_ORBIT } from '../src/scene/dioramaContract.ts'
import { homeInverseQuaternion } from '../src/scene/dioramaSkyProjection.ts'

// C (arrival): tasks/2026-10-20-arrival-c-plan.md, C8. The pure timeline, the clock and the camera path; the
// driver's wiring (lookAt, onDone, the line write, the sky's step) is the gate's job, by capture and by hand.

const HOMES = { design: DIORAMA_CAMERAS.design, mobile: DIORAMA_CAMERAS.mobile }
const GRID = Array.from({ length: 1201 }, (_, i) => i / 100)
/** derived angles round by about 6e-17 along the path; the mobile home sits exactly on the azimuth limit (review F10) */
const ANGLE_TOLERANCE = 1e-12

/** OrbitControls' spherical convention: polar from +Y, azimuth about +Y from +Z. */
function spherical(position: readonly number[], target: readonly number[]) {
  const [x, y, z] = [position[0] - target[0], position[1] - target[1], position[2] - target[2]]
  const distance = Math.hypot(x, y, z)
  return { distance, azimuth: Math.atan2(x, z), polar: Math.acos(Math.max(-1, Math.min(1, y / distance))) }
}

test('A1 at a = 0: the painting, the line, the sky held, the camera at the start pose on the home axis', () => {
  const f = arrivalFrame(0)
  assert.equal(f.overlay, 1)
  assert.equal(f.ground, 1)
  assert.equal(f.line, 1)
  assert.equal(f.rate, 0)
  assert.equal(f.push, 0)
  assert.equal(f.done, false)
  for (const [name, home] of Object.entries(HOMES)) {
    const p = arrivalCamera(home, 0)
    const { distance } = spherical(p, home.target)
    assert.ok(Math.abs(distance - ARRIVAL.startDistance) < 1e-9, `${name}: start distance ${distance}`)
    // on the axis: the cross product of the start offset and the home offset is zero
    const a = [p[0] - home.target[0], p[1] - home.target[1], p[2] - home.target[2]]
    const b = [home.position[0] - home.target[0], home.position[1] - home.target[1], home.position[2] - home.target[2]]
    const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    assert.ok(Math.hypot(...cross) < 1e-9, `${name}: start pose off the home axis`)
  }
})

test('A2 at the end and beyond: the layer gone, the sky live, the camera the home tuple itself', () => {
  for (const a of [ARRIVAL_END, ARRIVAL_END + 1, 100]) {
    const f = arrivalFrame(a)
    assert.equal(f.overlay, 0)
    assert.equal(f.ground, 0)
    assert.equal(f.rate, 1)
    assert.equal(f.push, 1)
    assert.equal(f.done, true)
  }
  for (const home of Object.values(HOMES)) {
    assert.equal(arrivalCamera(home, 1), home.position)
    assert.equal(arrivalCamera(home, 1.5), home.position)
  }
})

test('A3 monotone: nothing runs backwards at any speed', () => {
  let prev = arrivalFrame(0)
  let prevDistance = spherical(arrivalCamera(HOMES.design, 0), HOMES.design.target).distance
  for (const a of GRID.slice(1)) {
    const f = arrivalFrame(a)
    assert.ok(f.overlay <= prev.overlay, `overlay rose at ${a}`)
    assert.ok(f.ground <= prev.ground, `ground rose at ${a}`)
    assert.ok(f.line <= prev.line, `line rose at ${a}`)
    assert.ok(f.rate >= prev.rate, `rate fell at ${a}`)
    assert.ok(f.push >= prev.push, `push fell at ${a}`)
    assert.ok(f.scale >= prev.scale, `scale fell at ${a}`)
    const distance = spherical(arrivalCamera(HOMES.design, f.push), HOMES.design.target).distance
    assert.ok(distance <= prevDistance + 1e-12, `distance grew at ${a}`)
    prev = f
    prevDistance = distance
  }
})

test('A4 envelope: every pose on the path is inside DIORAMA_ORBIT, for both homes', () => {
  assert.ok(ARRIVAL_START_INSIDE_ORBIT)
  for (const [name, home] of Object.entries(HOMES)) {
    const homeAngles = spherical(home.position, home.target)
    for (const a of GRID) {
      const { distance, azimuth, polar } = spherical(arrivalCamera(home, arrivalFrame(a).push), home.target)
      assert.ok(distance >= DIORAMA_ORBIT.minDistance && distance <= DIORAMA_ORBIT.maxDistance, `${name} a=${a}: distance ${distance}`)
      assert.ok(azimuth >= DIORAMA_ORBIT.minAzimuthAngle - ANGLE_TOLERANCE && azimuth <= DIORAMA_ORBIT.maxAzimuthAngle + ANGLE_TOLERANCE, `${name} a=${a}: azimuth ${azimuth}`)
      assert.ok(polar >= DIORAMA_ORBIT.minPolarAngle - ANGLE_TOLERANCE && polar <= DIORAMA_ORBIT.maxPolarAngle + ANGLE_TOLERANCE, `${name} a=${a}: polar ${polar}`)
      // the path turns nowhere: the home's own angles throughout
      assert.ok(Math.abs(azimuth - homeAngles.azimuth) < ANGLE_TOLERANCE, `${name} a=${a}: azimuth drifted`)
      assert.ok(Math.abs(polar - homeAngles.polar) < ANGLE_TOLERANCE, `${name} a=${a}: polar drifted`)
    }
  }
})

test('A5 order: the line is gone before the dissolve, the sky and the push wait for the lead', () => {
  const atHold = arrivalFrame(ARRIVAL.hold)
  assert.equal(atHold.line, 0)
  assert.equal(atHold.overlay, 1)
  const atLead = arrivalFrame(ARRIVAL.hold + ARRIVAL.lead)
  assert.equal(atLead.rate, 0)
  assert.equal(atLead.push, 0)
  assert.ok(atLead.overlay < 1, 'the dissolve has begun by the lead')
  // the ground is gone while the scan still shows: the sky appears around the painting first
  const midDissolve = arrivalFrame(ARRIVAL.hold + ARRIVAL.dissolve * ARRIVAL.groundShare)
  assert.equal(midDissolve.ground, 0)
  assert.ok(midDissolve.overlay > 0.3, `scan still showing at mid-dissolve: ${midDissolve.overlay}`)
})

test('A6 reduced motion: the end state at once', () => {
  const f = arrivalFrame(0, true)
  assert.equal(f.done, true)
  assert.equal(f.rate, 1)
  assert.equal(f.push, 1)
  assert.equal(f.overlay, 0)
})

test('A7 the hold: the sky rate is exactly 0 until the lead, so the first revealed frame is the still', () => {
  for (const a of GRID.filter((t) => t <= ARRIVAL.hold + ARRIVAL.lead)) assert.equal(arrivalFrame(a).rate, 0, `rate at ${a}`)
})

test('A8 the clock: waits for the scene, bounds a frame, skips within 1.1 s, opens on timeout, latches', () => {
  const live = { ready: true, skipRequested: false }
  // not ready: held at 0
  const waiting = new ArrivalClock()
  for (let i = 0; i < 200; i++) assert.equal(waiting.tick({ dt: 1 / 60, ready: false, skipRequested: false }), 0)
  // ready: advances by dt
  const running = new ArrivalClock()
  assert.ok(Math.abs(running.tick({ dt: 1 / 60, ...live }) - 1 / 60) < 1e-12)
  // a 30 s frame (a hidden tab) advances maxDt only
  const hidden = new ArrivalClock()
  assert.equal(hidden.tick({ dt: 30, ...live }), ARRIVAL.maxDt)
  // a NaN frame advances nothing
  assert.equal(hidden.tick({ dt: NaN, ...live }), ARRIVAL.maxDt)
  // skip at 0 and at 2: done within 1.1 s of ticked time, never backwards
  for (const skipAt of [0, 2]) {
    const clock = new ArrivalClock()
    let ticked = 0
    let prev = 0
    while (ticked < skipAt) {
      ticked += 1 / 60
      prev = clock.tick({ dt: 1 / 60, ...live })
    }
    let sinceSkip = 0
    while (!clock.done) {
      sinceSkip += 1 / 60
      const a = clock.tick({ dt: 1 / 60, ready: true, skipRequested: true })
      assert.ok(a >= prev, 'the skipped clock stepped back')
      prev = a
      assert.ok(sinceSkip < 5, 'the skip never finished')
    }
    assert.ok(sinceSkip <= 1.1 + 1 / 60, `skip at ${skipAt}: ${sinceSkip.toFixed(3)} s`)
  }
  // not ready, but a skip: still waits for the scene (the loading curtain, decision (e)), then runs at the skip's speed
  const skippedWait = new ArrivalClock()
  for (let i = 0; i < 300; i++) assert.equal(skippedWait.tick({ dt: 1 / 60, ready: false, skipRequested: true }), 0)
  assert.equal(skippedWait.waiting, true)
  assert.ok(Math.abs(skippedWait.tick({ dt: 1 / 60, ready: true, skipRequested: true }) - ARRIVAL.skipSpeed / 60) < 1e-12)
  assert.equal(skippedWait.waiting, false)
  // not ready for readyTimeout: opens
  const timedOut = new ArrivalClock()
  let a = 0
  for (let t = 0; t <= ARRIVAL.readyTimeout + 0.2; t += 0.05) a = timedOut.tick({ dt: 0.05, ready: false, skipRequested: false })
  assert.ok(a > 0, 'the curtain never opened on its own')
  const pinned = new ArrivalClock()
  assert.equal(pinned.tick({ dt: 1 / 60, ...live, pinned: 3.5 }), 3.5)
  assert.equal(pinned.tick({ dt: 1 / 60, ...live, pinned: 20 }), 20)
  assert.equal(pinned.done, true)
  assert.equal(pinned.tick({ dt: 1 / 60, ...live }), 20)
  // after done, every tick returns the same a
  const finished = new ArrivalClock()
  while (!finished.done) finished.tick({ dt: 0.1, ...live })
  const end = finished.a
  for (let i = 0; i < 10; i++) assert.equal(finished.tick({ dt: 0.1, ...live }), end)
})

test('A11 the loading curtain: the hold counts from the painting, with afterReady left once the scene is ready', () => {
  const cap = ARRIVAL.hold - ARRIVAL.afterReady
  const waitThenReady = (seconds: number, shown: boolean) => {
    const clock = new ArrivalClock()
    for (let t = 0; t < seconds - 1e-9; t += 0.05) assert.equal(clock.tick({ dt: 0.05, ready: false, skipRequested: false, shown }), 0)
    return { clock, a: clock.tick({ dt: 1 / 60, ready: true, skipRequested: false, shown }) }
  }
  // a long wait with the painting up: the credit is capped, so afterReady of the hold is left and the line is still whole
  const long = waitThenReady(6, true)
  assert.ok(Math.abs(long.a - (cap + 1 / 60)) < 1e-9, `a after a long wait ${long.a}`)
  assert.equal(arrivalFrame(long.a).line, 1)
  assert.ok(ARRIVAL.afterReady >= ARRIVAL.lineFade, 'the line keeps its whole fade')
  // a short wait: the whole credit, no cap
  const short = waitThenReady(0.4, true)
  assert.ok(Math.abs(short.a - (0.4 + 1 / 60)) < 1e-6, `a after a short wait ${short.a}`)
  // the painting not yet shown: no credit
  const unseen = waitThenReady(6, false)
  assert.ok(Math.abs(unseen.a - 1 / 60) < 1e-12, `a with no painting ${unseen.a}`)
  // a slow build: 2 s at 4 fps with the painting up credits the whole 2 s, not maxDt's 0.2; a 30 s gap counts seenDt
  const slow = new ArrivalClock()
  for (let i = 0; i < 8; i++) slow.tick({ dt: 0.25, ready: false, skipRequested: false, shown: true })
  assert.ok(Math.abs(slow.tick({ dt: 1 / 60, ready: true, skipRequested: false, shown: true }) - (2 + 1 / 60)) < 1e-9, 'slow frames credit their time')
  const gap = new ArrivalClock()
  gap.tick({ dt: 30, ready: false, skipRequested: false, shown: true })
  assert.ok(Math.abs(gap.tick({ dt: 1 / 60, ready: true, skipRequested: false, shown: true }) - (ARRIVAL.seenDt + 1 / 60)) < 1e-9, 'a hidden tab credits seenDt')
  // the credit never shows: every frame up to the cap is the first frame
  for (const a of GRID.filter((t) => t <= cap)) assert.deepEqual(arrivalFrame(a), arrivalFrame(0), `frame at ${a}`)
  // waiting is the clock's own state: true while it holds for the scene, false after
  assert.equal(long.clock.waiting, false)
  const held = new ArrivalClock()
  held.tick({ dt: 1 / 60, ready: false, skipRequested: false, shown: true })
  assert.equal(held.waiting, true)
  // the timeout still opens, with the same capped credit
  const timedOut = new ArrivalClock()
  let opened = 0
  for (let t = 0; t <= ARRIVAL.readyTimeout + 0.05; t += 0.05) opened = timedOut.tick({ dt: 0.05, ready: false, skipRequested: false, shown: true })
  assert.ok(opened > cap && opened <= cap + 0.05 + 1e-9, `a at the timeout ${opened}`)
  // a pin never waits
  const pinned = new ArrivalClock()
  pinned.tick({ dt: 1 / 60, ready: false, skipRequested: false, pinned: 1 })
  assert.equal(pinned.waiting, false)
})

test('A12 the loading curtain in index.html carries the opening\'s words, so the hand-over does not change them', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const boot = html.slice(html.indexOf('id="boot"'), html.indexOf('</div>', html.indexOf('id="boot"')))
  assert.ok(boot.length > 0, 'index.html has #boot')
  for (const words of [VINCENTS_LINE, VINCENTS_CITE, ARRIVAL_CUE]) assert.ok(boot.includes(`>${words}</p>`), `#boot lacks: ${words}`)
})

test('A13 the curtain\'s script in index.html removes it on every page that will not play the opening', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const after = html.indexOf('<script>', html.indexOf('id="boot"'))
  assert.ok(after > 0 && after < html.indexOf('<script type="module"'), 'the script follows #boot, before the bundle')
  const body = html.slice(after + '<script>'.length, html.indexOf('</script>', after))
  const run = (search: string, { arrived = false, reduced = false, blocked = false } = {}) => {
    let removed = false
    const storage = { getItem: (key: string) => { if (blocked) throw new Error('SecurityError'); return key === ARRIVED_KEY && arrived ? '1' : null } }
    const doc = { getElementById: (id: string) => (id === 'boot' ? { remove: () => { removed = true } } : null) }
    new Function('location', 'sessionStorage', 'matchMedia', 'document', body)({ search }, storage, () => ({ matches: reduced }), doc)
    return removed
  }
  // App.tsx: arrival = !street && (arrival === '1' || (arrival !== '0' && !arrivedThisSession())), in mode diorama, not reduced
  assert.equal(run(''), false, 'a first plain visit keeps it')
  assert.equal(run('?mode=diorama&sky=light'), false)
  assert.equal(run('', { blocked: true }), false, 'a blocked store plays the opening, as arrivedThisSession does')
  assert.equal(run('?arrival=1', { arrived: true }), false, 'the link always plays it')
  assert.equal(run('', { arrived: true }), true, 'a repeat visit in the session')
  assert.equal(run('?arrival=0'), true)
  assert.equal(run('?street=1'), true)
  assert.equal(run('?street=1&arrival=1'), true)
  assert.equal(run('?mode=relief'), true)
  assert.equal(run('', { reduced: true }), true)
  assert.equal(run('?arrival=1', { reduced: true }), true)
})

test('A10 the sky step: held, then the rate times the bounded delta, kept through the frame that ends it, then null', () => {
  assert.equal(boundedDt(30), ARRIVAL.maxDt)
  assert.equal(boundedDt(NaN), 0)
  assert.equal(boundedDt(-1), 0)
  const live = { ready: true, skipRequested: false }
  const clock = new ArrivalClock()
  // waiting for the scene: the sky holds
  clock.tick({ dt: 1 / 60, ready: false, skipRequested: false })
  assert.equal(clock.step, 0)
  // the hold: rate 0, so step 0, up to the last tick before the lead
  while (clock.a + 1 / 60 < ARRIVAL.hold + ARRIVAL.lead) clock.tick({ dt: 1 / 60, ...live })
  assert.equal(clock.step, 0)
  // live: the rate times the frame
  while (clock.a < ARRIVAL.hold + ARRIVAL.lead + ARRIVAL.breathe) clock.tick({ dt: 1 / 60, ...live })
  assert.ok(Math.abs((clock.step ?? 0) - 1 / 60) < 1e-12, `live step ${clock.step}`)
  // a 30 s frame at a = 8.7 reaches the end: the sky gets the bounded 0.1, not the 30 (code review F12)
  const terminal = new ArrivalClock()
  while (terminal.a < 8.7 - 1e-9) terminal.tick({ dt: 0.1, ...live })
  assert.ok(Math.abs(terminal.a - 8.7) < 1e-9)
  terminal.tick({ dt: 30, ...live })
  assert.equal(terminal.done, true)
  assert.equal(terminal.step, ARRIVAL.maxDt)
  // the frame after: handed back
  terminal.tick({ dt: 1 / 60, ...live })
  assert.equal(terminal.step, null)
  // reduced motion: done on the first tick with no wait, the step the frame's own, then null
  const reduced = new ArrivalClock()
  reduced.tick({ dt: 1 / 60, ready: false, skipRequested: false, reduced: true })
  assert.equal(reduced.done, true)
  assert.ok(Math.abs((reduced.step ?? 0) - 1 / 60) < 1e-12)
  reduced.tick({ dt: 1 / 60, ready: false, skipRequested: false, reduced: true })
  assert.equal(reduced.step, null)
})

test('A9 orientation: along the whole path the camera-locked sky stays at identity', () => {
  for (const [name, home] of Object.entries(HOMES)) {
    const homeInverse = homeInverseQuaternion(home)
    for (const push of [0, 0.5, 1]) {
      const camera = new PerspectiveCamera(50, 16 / 9, 0.08, 48)
      camera.position.set(...arrivalCamera(home, push))
      camera.lookAt(home.target[0], home.target[1], home.target[2])
      const q = camera.quaternion.clone().multiply(homeInverse)
      assert.ok(Math.abs(q.x) < 1e-12 && Math.abs(q.y) < 1e-12 && Math.abs(q.z) < 1e-12 && Math.abs(Math.abs(q.w) - 1) < 1e-12, `${name} push ${push}: ${q.toArray().join(', ')}`)
    }
  }
})
