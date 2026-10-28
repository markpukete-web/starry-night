import assert from 'node:assert/strict'
import test from 'node:test'
import { DIORAMA_CAMERAS, DIORAMA_ORBIT } from '../src/scene/dioramaContract.ts'
import { islandHeightAt } from '../src/scene/islandShape.ts'
import {
  controlsEnabled,
  dioramaMounted,
  flightPose,
  flightStep,
  PORTAL,
  portalStep,
  streetMounted,
  type PortalEvent,
  type PortalPlace,
  type Pose,
} from '../src/scene/portal.ts'

// The portal, slice 4 (tasks/2026-10-25-street-portal-plan.md, Task 1): the places, the moves between them and the
// flight's path. The driver's wiring (the copy, the swap, the fades, the way back) is check-portal.mjs's job.

const PLACES: PortalPlace[] = ['diorama', 'flying', 'entering', 'street', 'leaving']
const EVENTS: PortalEvent[] = ['enter', 'flown', 'ready', 'failed', 'timeout', 'leave', 'left']
const MOVES: [PortalPlace, PortalEvent, PortalPlace][] = [
  ['diorama', 'enter', 'flying'],
  ['flying', 'flown', 'entering'],
  ['entering', 'ready', 'street'],
  ['entering', 'failed', 'leaving'],
  ['entering', 'timeout', 'leaving'],
  ['street', 'leave', 'leaving'],
  ['leaving', 'left', 'diorama'],
]

test("decision (a): every move in the table, and every other pair stays where it is", () => {
  for (const place of PLACES) {
    for (const event of EVENTS) {
      const move = MOVES.find(([from, on]) => from === place && on === event)
      assert.equal(portalStep(place, event), move ? move[2] : place, `${place} on ${event}`)
    }
  }
})

test('reduced motion enters with no flight, and the arrival holds the diorama', () => {
  assert.equal(portalStep('diorama', 'enter', { still: true }), 'entering')
  assert.equal(portalStep('diorama', 'enter', { arriving: true }), 'diorama')
  assert.equal(portalStep('diorama', 'enter', { still: true, arriving: true }), 'diorama')
})

test('what each place mounts, shows and enables', () => {
  const mounted = PLACES.filter(streetMounted)
  assert.deepEqual(mounted, ['entering', 'street'])
  for (const place of PLACES) assert.equal(dioramaMounted(place), !streetMounted(place), place)
  assert.deepEqual(PLACES.filter(controlsEnabled), ['diorama'])
})

const v2: Pose = { position: [0.9, 0.35, 1.5], target: [0.4, 0.1, 0.2] }

test("the flight's end is v2's pose, the last at which the village reads as paint (C11)", () => {
  assert.deepEqual(PORTAL.flightEnd, v2)
})

test('the path starts and ends on its poses exactly, and closes on the end all the way', () => {
  const from = DIORAMA_CAMERAS.design
  assert.deepEqual(flightPose(from, v2, 0), { position: from.position, target: from.target })
  assert.deepEqual(flightPose(from, v2, 1), v2)
  const gap = (p: Pose) => Math.hypot(p.position[0] - v2.position[0], p.position[1] - v2.position[1], p.position[2] - v2.position[2])
  let last = Infinity
  for (let i = 0; i <= 100; i++) {
    const d = gap(flightPose(from, v2, i / 100))
    assert.ok(d <= last + 1e-12, `the camera moves away from the end at s ${i / 100}`)
    last = d
  }
})

/** The orbit's pose at a polar, an azimuth and a distance about a target: OrbitControls' convention. */
function orbitPose(target: readonly [number, number, number], polar: number, azimuth: number, distance: number): Pose {
  const s = Math.sin(polar)
  return {
    position: [target[0] + distance * s * Math.sin(azimuth), target[1] + distance * Math.cos(polar), target[2] + distance * s * Math.cos(azimuth)],
    target,
  }
}

test('from every corner of the orbit and both homes, the path clears the island and the cypress', () => {
  const { minPolarAngle, maxPolarAngle, minAzimuthAngle, maxAzimuthAngle, minDistance, maxDistance } = DIORAMA_ORBIT
  const homes: Pose[] = [DIORAMA_CAMERAS.design, DIORAMA_CAMERAS.mobile]
  const starts = [...homes]
  for (const home of homes) {
    for (const polar of [minPolarAngle, maxPolarAngle]) {
      for (const azimuth of [minAzimuthAngle, maxAzimuthAngle]) {
        for (const distance of [minDistance, maxDistance]) starts.push(orbitPose(home.target, polar, azimuth, distance))
      }
    }
  }
  // the cypress's axis (BrushCypress.tsx: BASE at (−1.5, 0.02, 0.72), 2.7 high)
  const cypress = [-1.5, 0.72] as const
  for (const start of starts) {
    for (let i = 0; i <= 200; i++) {
      const [x, y, z] = flightPose(start, v2, i / 200).position
      assert.ok(y - islandHeightAt(x, z) >= 0.15, `the camera ${(y - islandHeightAt(x, z)).toFixed(3)} above the island at ${[x, y, z].map((n) => n.toFixed(2))}`)
      assert.ok(Math.hypot(x - cypress[0], z - cypress[1]) >= 0.5, `the camera within 0.5 of the cypress at ${[x, z].map((n) => n.toFixed(2))}`)
    }
  }
})

test("the flight's clock takes at most 0.1 s from a frame, so a hidden tab cannot end it in one step", () => {
  assert.equal(flightStep(0, 30), 0.1 / PORTAL.flight)
  assert.equal(flightStep(0.99, 0.1), 1)
  assert.equal(flightStep(0.5, Number.NaN), 0.5)
  assert.ok(Math.abs(flightStep(0, PORTAL.flight / 100) - 0.01) < 1e-12)
})
