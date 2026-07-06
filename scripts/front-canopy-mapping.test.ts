import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV } from '../src/scene/skyMapping.ts'
import { canopyEdgeFade, canopyRoundTrip, uvToCanopyPosition } from '../src/scene/frontCanopyMapping.ts'

const close = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps

test('canopy mapping preserves painting anchors', () => {
  for (const [u, v] of [VENUS_UV, MOON_UV, ...STAR_UVS]) {
    const rt = canopyRoundTrip(u, v)
    assert.equal(rt.onArc, true)
    assert.equal(close(rt.u, u), true, `u ${rt.u} ~= ${u}`)
    assert.equal(close(rt.v, v), true, `v ${rt.v} ~= ${v}`)
  }
})

test('canopy positions sit on a spherical front volume', () => {
  const p = uvToCanopyPosition(0.5, 0.35)
  assert.ok(Math.abs(p.length() - 6) < 1e-6)
})

test('canopy edge fade hides rectangular boundaries', () => {
  assert.equal(canopyEdgeFade(0.5, 0.4) > 0.95, true)
  assert.equal(canopyEdgeFade(0.001, 0.4) < 0.05, true)
  assert.equal(canopyEdgeFade(0.5, 0.99) < 0.25, true)
})
