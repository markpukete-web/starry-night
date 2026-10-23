/** The street's light (S1b task 4, tasks/2026-10-23-street-s1b-plan.md): the moon, the wall shade and the lean, moved
 * from the spike and named. */

import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'

import { HOUSE_LEAN, STREET_LIGHT, STREET_MOON, leanOf, lightOf, wallShade } from '../src/scene/streetLight.ts'
import type { StreetFace } from '../src/scene/streetStrokes.ts'

function face(kind: StreetFace['kind'], normal: Vector3, origin = new Vector3(0, 0, 0)): StreetFace {
  return { origin, u: new Vector3(1, 0, 0), v: new Vector3(0, 1, 0), normal, shape: 'quad', kind, source: 'wallA', refHeight: 1, seed: 0, mirror: false }
}

test('a face turned to the moon is lit, a face turned away is not', () => {
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-12
  assert.ok(close(lightOf(face('wall', STREET_MOON.clone())), STREET_LIGHT.ambient + STREET_LIGHT.key))
  assert.ok(close(lightOf(face('wall', STREET_MOON.clone().negate())), STREET_LIGHT.ambient))
  assert.equal(lightOf(face('ground', new Vector3(0, 1, 0))), 1)
})

test('walls darken toward the ground and the corners', () => {
  const wall = face('wall', new Vector3(0, 0, 1))
  const mid = wallShade(wall, 0.5, 0.6, 0)
  assert.ok(Math.abs(wallShade(wall, 0.5, 0, 0) - 0.5 * mid) < 1e-12, 'half at the foot')
  assert.ok(Math.abs(wallShade(wall, 0, 0.6, 0) - 0.78 * mid) < 1e-12, '0.78 at the corner')
  assert.equal(wallShade(face('wall', new Vector3(0, 0, 1), new Vector3(0, 0.2, 0)), 0.5, 0.3, 0), 1, 'a gable is not shaded')
})

test('each house leans within 2.6°, the church not at all', () => {
  for (let i = 0; i < 10; i++) assert.ok(Math.abs(leanOf(i)) <= HOUSE_LEAN / 2, `house ${i} leans ${leanOf(i)}`)
  assert.ok(Math.atan(HOUSE_LEAN / 2) < (2.6 * Math.PI) / 180)
  assert.equal(leanOf(100), 0)
})

test('light=0 makes the street unlit', () => {
  assert.equal(lightOf(face('wall', STREET_MOON.clone().negate()), false), 1)
  assert.equal(wallShade(face('wall', new Vector3(0, 0, 1)), 0.5, 0, 0, false), 1)
})
