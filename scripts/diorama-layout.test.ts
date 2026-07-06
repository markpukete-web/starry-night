import assert from 'node:assert/strict'
import test from 'node:test'
import { DIORAMA_CAMERAS, DIORAMA_ORBIT, type DioramaDebugMode } from '../src/scene/dioramaContract.ts'
import { makeRidgeStones, makeTerrainBlades } from '../src/scene/dioramaLayout.ts'

test('terrain detail layout is deterministic', () => {
  assert.deepEqual(makeTerrainBlades(24, 123), makeTerrainBlades(24, 123))
})

test('terrain detail stays inside the stage footprint', () => {
  for (const blade of makeTerrainBlades(160, 456)) {
    const [x, , z] = blade.position
    assert.ok(Math.abs(x) <= 1.82)
    assert.ok(Math.abs(z) <= 1.13)
    assert.ok((x / 1.82) ** 2 + (z / 1.13) ** 2 <= 1.0001)
  }
})

test('ridge stones are deterministic and bounded', () => {
  const stones = makeRidgeStones(789)
  assert.deepEqual(stones, makeRidgeStones(789))
  assert.equal(stones.length, 14)
  for (const stone of stones) {
    const [x, , z] = stone.position
    assert.ok(Math.abs(x) <= 1.3)
    assert.ok(Math.abs(z) <= 0.9)
  }
})

test('diorama orbit cannot pan or zoom out of the authored envelope', () => {
  assert.equal(DIORAMA_ORBIT.enablePan, false)
  assert.ok(DIORAMA_ORBIT.minDistance >= 3)
  assert.ok(DIORAMA_ORBIT.maxDistance <= 5.6)
  assert.ok(DIORAMA_ORBIT.maxPolarAngle <= 1.62)
})

test('diorama exposes a painting-flow debug route', () => {
  const mode: DioramaDebugMode = 'flow'
  assert.equal(mode, 'flow')
})

test('painting-first design camera stays close to the front composition basis', () => {
  assert.ok(DIORAMA_CAMERAS.design.position[2] >= 5)
  assert.ok(DIORAMA_CAMERAS.design.position[1] < 1.35)
  assert.ok(DIORAMA_CAMERAS.design.fov >= 49)
  assert.ok(DIORAMA_CAMERAS.mobile.fov > DIORAMA_CAMERAS.design.fov)
})
