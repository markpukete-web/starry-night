import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import {
  HOME_EYE,
  SOURCE_SHELL_R,
  sourceUVAtDistance,
  worldPerU,
  worldToSourceUV,
} from '../src/scene/sourceProjection.ts'

test('worldToSourceUV inverts sourceUVAtDistance at any depth', () => {
  for (const dist of [3.2, 4.7, 6.1, 8.8]) {
    for (const [u, v] of [
      [0.1, 0.8],
      [0.5, 0.4],
      [0.85, 0.2],
      [0.06, 0.95],
    ]) {
      const p = sourceUVAtDistance(u, v, dist, new Vector3())
      assert.equal(p.distanceTo(HOME_EYE) > dist - 1e-6, true)
      const q = worldToSourceUV(p)
      assert.ok(Math.abs(q.u - u) < 1e-5, `u ${q.u} vs ${u} at dist ${dist}`)
      assert.ok(Math.abs(q.v - v) < 1e-5, `v ${q.v} vs ${v} at dist ${dist}`)
    }
  }
})

test('the home eye sits inside the source shell so every UV has a forward hit', () => {
  assert.ok(SOURCE_SHELL_R > HOME_EYE.length())
  const p = sourceUVAtDistance(0.3, 0.6, 1, new Vector3())
  const onShell = p.sub(HOME_EYE).normalize()
  assert.ok(onShell.lengthSq() > 0)
})

test('worldPerU scales linearly with distance', () => {
  assert.ok(Math.abs(worldPerU(4) * 2 - worldPerU(8)) < 1e-9)
})
