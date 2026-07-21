/** Surface-to-painting mapping for the camera-facing cypress and its mirrored back. */

import assert from 'node:assert/strict'
import test from 'node:test'

import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import {
  cypressViewBearing,
  isFrontFacing,
  normalisedFromCrop,
  paintingUToAngle,
  paintingUV,
  rowSpanAt,
  surfaceToPaintingU,
  type RowTable,
} from '../src/scene/cypressMapping.ts'

const BASE = [-1.5, 0.02, 0.72] as const

test('the view bearing follows the design camera rather than assuming +Z', () => {
  const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, BASE)
  const degrees = (bearing * 180) / Math.PI
  assert.ok(Math.abs(degrees - 64.6) < 2, `expected about 64.6 degrees, got ${degrees}`)
  assert.ok(Math.abs(degrees - 90) > 10)
})

test('painting centre faces the camera and its edges land on the visible silhouette', () => {
  const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, BASE)
  assert.ok(Math.abs(surfaceToPaintingU(bearing, bearing) - 0.5) < 1e-9)
  assert.ok(Math.abs(surfaceToPaintingU(bearing - Math.PI / 2, bearing) - 1) < 1e-9)
  assert.ok(Math.abs(surfaceToPaintingU(bearing + Math.PI / 2, bearing)) < 1e-9)
})

test('the back mirrors the front continuously at both silhouette edges', () => {
  const bearing = 1.1
  for (const edge of [bearing - Math.PI / 2, bearing + Math.PI / 2]) {
    const left = surfaceToPaintingU(edge - 1e-5, bearing)
    const right = surfaceToPaintingU(edge + 1e-5, bearing)
    assert.ok(Math.abs(left - right) < 1e-8, `mapping jumped at ${edge}`)
  }
})

test('u round-trips on both hemispheres for every camera contract', () => {
  for (const camera of Object.values(DIORAMA_CAMERAS)) {
    const bearing = cypressViewBearing(camera.position, BASE)
    for (const u of [0, 0.13, 0.5, 0.82, 1]) {
      for (const front of [true, false]) {
        const angle = paintingUToAngle(u, bearing, front)
        assert.ok(Math.abs(surfaceToPaintingU(angle, bearing) - u) < 1e-9)
        if (u > 0 && u < 1) assert.equal(isFrontFacing(angle, bearing), front)
      }
    }
  }
})

const ROWS: RowTable = {
  width: 100,
  height: 100,
  spans: [
    [0, 0.45, 0.55],
    [0.5, 0.25, 0.75],
    [1, 0.05, 0.95],
  ],
}

test('paintingUV normalises u inside each real row span', () => {
  const tip = paintingUV(0.5, 1, ROWS)
  assert.ok(Math.abs(tip.px - 0.5) < 1e-9)
  assert.ok(Math.abs(paintingUV(1, 1, ROWS).px - 0.55) < 1e-9)
  assert.ok(Math.abs(paintingUV(1, 0, ROWS).px - 0.95) < 1e-9)
})

test('paintingUV and normalisedFromCrop are inverses across tapered rows', () => {
  for (const heightFraction of [0, 0.2, 0.5, 0.8, 1]) {
    for (const u of [0, 0.2, 0.5, 0.9, 1]) {
      const pixel = paintingUV(u, heightFraction, ROWS)
      const normalised = normalisedFromCrop(pixel.px, pixel.py, ROWS)
      assert.ok(Math.abs(normalised.u - u) < 1e-9)
      assert.ok(Math.abs(normalised.heightFraction - heightFraction) < 1e-9)
    }
  }
})

test('rowSpanAt interpolates and clamps beyond the baked span range', () => {
  assert.deepEqual(rowSpanAt(-1, ROWS), { left: 0.45, right: 0.55 })
  assert.deepEqual(rowSpanAt(2, ROWS), { left: 0.05, right: 0.95 })
  const middle = rowSpanAt(0.25, ROWS)
  assert.ok(Math.abs(middle.left - 0.35) < 1e-9)
  assert.ok(Math.abs(middle.right - 0.65) < 1e-9)
})

test('isFrontFacing splits the camera-facing hemisphere', () => {
  const bearing = 1.1
  assert.equal(isFrontFacing(bearing, bearing), true)
  assert.equal(isFrontFacing(bearing + Math.PI, bearing), false)
})
