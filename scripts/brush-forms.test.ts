import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Vector3 } from 'three'
import { makeBrushArrays, moonShade, MOON_DIR, pushBrush, vnoise } from '../src/scene/brushForms.ts'

test('vnoise is deterministic and in range', () => {
  assert.equal(vnoise(1.3, 4.7), vnoise(1.3, 4.7))
  for (let i = 0; i < 200; i++) {
    const n = vnoise(i * 0.37, i * 1.13)
    assert.ok(n >= 0 && n <= 1, `noise out of range: ${n}`)
  }
})

test('moonShade is 1 facing the moon, 0 facing away', () => {
  assert.ok(Math.abs(moonShade(MOON_DIR.clone()) - 1) < 1e-9)
  assert.equal(moonShade(MOON_DIR.clone().negate()), 0)
})

test('pushBrush appends one tapered mark: 6 verts, 4 tris, darker far half', () => {
  const arr = makeBrushArrays()
  pushBrush(arr, new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), 0.1, 0.02, new Color(0.4, 0.5, 0.6))
  assert.equal(arr.positions.length, 18) // 6 verts
  assert.equal(arr.colors.length, 18)
  assert.equal(arr.indices.length, 12) // 4 triangles
  // near tip (vert 0) keeps the base colour; the far tip (vert 3) is darkened
  assert.ok(Math.abs(arr.colors[0] - 0.4) < 1e-6, 'near tip keeps base colour')
  assert.ok(arr.colors[9] < 0.4, 'far tip is darker')
})

test('pushBrush skips a degenerate stroke whose tangent is parallel to the normal', () => {
  const arr = makeBrushArrays()
  pushBrush(arr, new Vector3(0, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, 1), 0.1, 0.02, new Color(1, 1, 1))
  assert.equal(arr.positions.length, 0)
})
