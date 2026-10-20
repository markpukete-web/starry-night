import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera } from 'three'
import { ARRIVAL, ARRIVAL_END, ARRIVAL_START_INSIDE_ORBIT, ArrivalClock, arrivalCamera, arrivalFrame } from '../src/scene/arrival.ts'
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
  // not ready, but a skip: opens
  const skippedWait = new ArrivalClock()
  assert.ok(skippedWait.tick({ dt: 1 / 60, ready: false, skipRequested: true }) > 0)
  // not ready for readyTimeout: opens
  const timedOut = new ArrivalClock()
  let a = 0
  for (let t = 0; t <= ARRIVAL.readyTimeout + 0.2; t += 0.05) a = timedOut.tick({ dt: 0.05, ready: false, skipRequested: false })
  assert.ok(a > 0, 'the curtain never opened on its own')
  // a pin sets a; past the end it latches
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
