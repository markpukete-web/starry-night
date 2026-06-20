import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV, buildVortices, frontUV, uvToFrontDir } from '../src/scene/skyMapping.ts'

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

test('buildVortices is deterministic and exposes cores, stars and a moon', () => {
  const a = buildVortices()
  const b = buildVortices()
  assert.equal(a.length, b.length)
  assert.equal(a[0].dir.equals(b[0].dir), true)
  assert.equal(a.some((v) => v.core), true)
  assert.equal(a.some((v) => v.star), true)
  assert.equal(a.filter((v) => v.moon).length, 1)
})
