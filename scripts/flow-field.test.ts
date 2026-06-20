import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { buildVortices } from '../src/scene/skyMapping.ts'
import { makeFlowField, vortexTangent } from '../src/scene/flowField.ts'

function flatFlow(width = 8, height = 8): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4) // cos2θ=1, sin2θ=0 → θ=0; coherence high
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 128; data[i + 2] = 220; data[i + 3] = 255 }
  return { data, width, height }
}
const perp = (p: Vector3, t: Vector3) => Math.abs(p.dot(t))

test('vortex tangent is perpendicular to the sample direction', () => {
  const V = buildVortices()
  const out = new Vector3()
  for (const p of [new Vector3(0, 1, 0.2).normalize(), new Vector3(0.5, 0.6, -0.6).normalize()]) {
    vortexTangent(V, 0.45, p, out)
    assert.equal(perp(p, out) < 1e-6, true, `p·t = ${p.dot(out)}`)
  }
})

test('vortex circulation flips sign when every vortex sign flips', () => {
  const V = buildVortices()
  const Vneg = V.map((v) => ({ ...v, sign: -v.sign }))
  const a = vortexTangent(V, 0, new Vector3(0.3, 0.8, 0.5).normalize(), new Vector3())
  const b = vortexTangent(Vneg, 0, new Vector3(0.3, 0.8, 0.5).normalize(), new Vector3())
  assert.equal(a.clone().add(b).length() < 1e-6, true) // a ≈ -b with swirlTightness 0
})

test('makeFlowField returns a unit tangent perpendicular to p everywhere', () => {
  const field = makeFlowField({ flow: flatFlow(), vortices: buildVortices(), swirlTightness: 0.45, flowBias: 0.6 })
  const out = new Vector3()
  for (const p of [new Vector3(0, 1, 0).normalize(), new Vector3(-0.4, 0.5, 0.7).normalize(), new Vector3(0.2, 0.3, -0.9).normalize()]) {
    field(p, out)
    assert.equal(Math.abs(out.length() - 1) < 1e-5, true, `|t| = ${out.length()}`)
    assert.equal(perp(p, out) < 1e-5, true, `p·t = ${p.dot(out)}`)
  }
})
