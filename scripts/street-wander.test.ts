// Vincent's wander spike (2026-10-28): the walkable test, the straight-line test, the step and the aim.
import assert from 'node:assert/strict'
import test from 'node:test'
import { laneAt, STREET_HOUSES } from '../src/scene/streetLayout.ts'
import {
  aimToward,
  clearLine,
  passable,
  stepWander,
  walkable,
  WANDER,
  type WanderState,
} from '../src/scene/streetWander.ts'

function findVerge(): { t: number; lat: number; x: number; z: number } {
  for (let t = 0.1; t <= 0.8 + 1e-9; t += 0.01) {
    for (const side of [1, -1]) {
      for (let lat = 0.08; lat <= 0.5 + 1e-9; lat += 0.02) {
        const { x, z } = laneAt(t, side * lat)
        if (!walkable(x, z)) continue
        // a verge point the lane reaches in a straight, clear line across the grass
        let clear = true
        for (let l = 0; l <= lat + 1e-9; l += 0.01) {
          const p = laneAt(t, side * l)
          if (!passable(p.x, p.z)) clear = false
        }
        if (clear) return { t, lat: side * lat, x, z }
      }
    }
  }
  throw new Error('no verge point found')
}

test('walkable: not the lane, not a house, not far out; yes on a verge point', () => {
  const lane = laneAt(0.3, 0)
  assert.equal(walkable(lane.x, lane.z), false)
  assert.equal(passable(lane.x, lane.z), true)
  const house = STREET_HOUSES[0]
  assert.equal(walkable(house.x, house.z), false)
  const far = laneAt(0.3, 0.7)
  assert.equal(walkable(far.x, far.z), false)
  const v = findVerge()
  assert.equal(walkable(v.x, v.z), true)
  console.log(`verge point: t ${v.t.toFixed(2)} lateral ${v.lat.toFixed(2)} at (${v.x.toFixed(4)}, ${v.z.toFixed(4)})`)
})

test('clearLine: refused through a house, allowed from the lane across the grass', () => {
  const v = findVerge()
  const house = STREET_HOUSES[0]
  assert.equal(clearLine(v.x, v.z, house.x, house.z), false)
  const lane = laneAt(v.t, 0)
  assert.equal(clearLine(lane.x, lane.z, v.x, v.z), true)
})

test('stepWander reaches its target in distance / speed and holds; returning ends on the lane at the slot', () => {
  const dt = 1 / 60
  const slot = { x: 0.2, z: 0.1, yaw: 1.25 }
  const start: WanderState = { mode: 'going', x: 0, z: 0, tx: 0.3, tz: 0.4, yaw: 0, walked: 0 }
  const distance = 0.5
  let s = start
  let frames = 0
  while (Math.hypot(s.tx - s.x, s.tz - s.z) > 0 && frames < 1000) {
    const before = s
    s = stepWander(s, dt, slot)
    frames++
    if (s.x === before.x && s.z === before.z) break
  }
  const elapsed = frames * dt
  assert.ok(elapsed <= distance / WANDER.speed + dt, `elapsed ${elapsed}`)
  assert.ok(elapsed >= (distance - WANDER.arrive) / WANDER.speed - dt, `elapsed ${elapsed}`)
  assert.equal(s.mode, 'going')
  assert.equal(s.x, 0.3)
  assert.equal(s.z, 0.4)
  assert.ok(Math.abs(s.walked - distance) < 1e-9, `walked ${s.walked}`)
  const held = stepWander(s, dt, slot)
  assert.equal(held.x, s.x)
  assert.equal(held.z, s.z)
  assert.equal(held.walked, s.walked)

  let r: WanderState = { ...s, mode: 'returning' }
  for (let i = 0; i < 1000 && r.mode !== 'lane'; i++) r = stepWander(r, dt, slot)
  assert.equal(r.mode, 'lane')
  assert.equal(r.x, slot.x)
  assert.equal(r.z, slot.z)
  assert.equal(r.yaw, slot.yaw)
  assert.equal(stepWander(r, dt, slot), r)
})

test('aimToward turns by exactly maxDeg when the bearing is farther, fully when nearer', () => {
  const pos = [0, 0.09, 0] as const
  const tgt = [0, 0.06, 1] as const
  const bearing = (t: readonly number[]) => (Math.atan2(t[0] - pos[0], t[2] - pos[2]) * 180) / Math.PI
  const far = aimToward(pos, tgt, [1, 0, 1], 20)
  assert.ok(Math.abs(bearing(far) - 20) < 1e-9)
  assert.equal(far[1], 0.06)
  assert.ok(Math.abs(Math.hypot(far[0], far[2]) - 1) < 1e-9)
  const left = aimToward(pos, tgt, [-1, 0, 1], 20)
  assert.ok(Math.abs(bearing(left) + 20) < 1e-9)
  const near = aimToward(pos, tgt, [0.2, 0, 1], 20)
  assert.ok(Math.abs(bearing(near) - (Math.atan2(0.2, 1) * 180) / Math.PI) < 1e-9)
  const none = aimToward(pos, tgt, [1, 0, 1], 0)
  assert.ok(Math.abs(bearing(none)) < 1e-9)
})
