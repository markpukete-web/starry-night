import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Vector3 } from 'three'
import {
  makeBrushArrays,
  moonShade,
  MOON_DIR,
  pushBrush,
  pushBrushRibbon,
  vnoise,
} from '../src/scene/brushForms.ts'

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

test('pushBrushRibbon builds a quad strip along the polyline', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = points.map(() => new Vector3(0, 0, 1))
  const colours = [new Color(1, 0, 0), new Color(0, 1, 0), new Color(0, 0, 1)]
  pushBrushRibbon(arr, points, normals, colours, 0.1)

  assert.equal(arr.positions.length / 3, points.length * 2)
  assert.equal(arr.indices.length, (points.length - 1) * 6)
  const xs = []
  for (let i = 0; i < arr.positions.length; i += 3) xs.push(arr.positions[i])
  assert.ok(Math.max(...xs) > 0.05 && Math.min(...xs) < -0.05, 'ribbon straddles the centre line')
})

test('pushBrushRibbon does not darken along its length', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = points.map(() => new Vector3(0, 0, 1))
  const colours = points.map(() => new Color(0.5, 0.5, 0.5))
  pushBrushRibbon(arr, points, normals, colours, 0.1)

  for (const channel of arr.colors) {
    assert.ok(Math.abs(channel - 0.5) < 1e-6, `expected flat 0.5, got ${channel}`)
  }
})

test('pushBrushRibbon keeps its winding consistent around a curved tube', () => {
  const arr = makeBrushArrays()
  const points: Vector3[] = []
  const normals: Vector3[] = []
  const colours: Color[] = []
  for (let i = 0; i < 12; i++) {
    const t = i / 11
    const angle = t * Math.PI * 1.5
    const radius = 0.5 + 0.2 * Math.sin(t * 6)
    points.push(new Vector3(Math.cos(angle) * radius, t * 2, Math.sin(angle) * radius))
    normals.push(new Vector3(Math.cos(angle), 0.12, Math.sin(angle)).normalize())
    colours.push(new Color(1, 1, 1))
  }
  pushBrushRibbon(arr, points, normals, colours, 0.05)

  const position = arr.positions
  const vertex = (index: number) =>
    new Vector3(position[index * 3], position[index * 3 + 1], position[index * 3 + 2])
  let flips = 0
  let previous: Vector3 | null = null
  for (let i = 0; i < points.length; i++) {
    const edge = vertex(i * 2).sub(vertex(i * 2 + 1))
    if (previous && edge.dot(previous) < 0) flips++
    previous = edge.clone()
  }
  assert.equal(flips, 0, `ribbon width flipped direction ${flips} times — quads are crossed`)
})

test('pushBrushRibbon ignores degenerate input', () => {
  const arr = makeBrushArrays()
  pushBrushRibbon(
    arr,
    [new Vector3(0, 0, 0)],
    [new Vector3(0, 0, 1)],
    [new Color(1, 1, 1)],
    0.1,
  )
  assert.equal(arr.positions.length, 0)

  const duplicate = [new Vector3(1, 1, 1), new Vector3(1, 1, 1)]
  pushBrushRibbon(
    arr,
    duplicate,
    [new Vector3(0, 0, 1), new Vector3(0, 0, 1)],
    [new Color(1, 1, 1), new Color(1, 1, 1)],
    0.1,
  )
  assert.equal(arr.positions.length, 0)
})

test('pushBrushRibbon tapers width toward the far end', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = points.map(() => new Vector3(0, 0, 1))
  const colours = points.map(() => new Color(1, 1, 1))
  pushBrushRibbon(arr, points, normals, colours, 0.1, 0.3)

  const first = Math.abs(arr.positions[0])
  const last = Math.abs(arr.positions[arr.positions.length - 3])
  assert.ok(last < first * 0.5, `far end must be narrower: ${last} vs ${first}`)
})
