import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV, frontUV, uvToFrontDir } from '../src/scene/skyMapping.ts'

const close = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps

test('front mapping round-trips the painting anchors', () => {
  for (const [u, v] of [VENUS_UV, MOON_UV, ...STAR_UVS]) {
    const r = frontUV(uvToFrontDir(u, v))
    assert.equal(r.onArc, true)
    assert.equal(close(r.u, u), true, `u ${r.u} ~= ${u}`)
    assert.equal(close(r.v, v), true, `v ${r.v} ~= ${v}`)
  }
})

test('front mapping rejects the back of the dome', () => {
  const front = uvToFrontDir(0.5, 0.5)
  assert.equal(frontUV(front.clone().multiplyScalar(-1)).onArc, false)
})
