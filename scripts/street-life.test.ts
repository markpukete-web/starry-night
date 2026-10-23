import assert from 'node:assert/strict'
import test from 'node:test'
import { BufferGeometry, Vector3 } from 'three'
import {
  hillsGeometry,
  lifeTime,
  litWindows,
  LIFE,
  swayInjection,
  HILL_PAINT,
} from '../src/scene/streetLife.ts'
import { STREET, STREET_HOUSES } from '../src/scene/streetLayout.ts'
import type { BrushArraysWithCls } from '../src/scene/streetGeometry.ts'

test('lit windows are the class-2 quads, their normals out of the house', () => {
  const h = STREET_HOUSES[0]
  const houseCenter = new Vector3(h.x, 0, h.z)
  const along = new Vector3(Math.cos(h.yaw), 0, Math.sin(h.yaw))
  const across = new Vector3(-Math.sin(h.yaw), 0, Math.cos(h.yaw))
  // front wall is at +d/2 along across
  const wallCenter = houseCenter.clone().addScaledVector(across, h.d / 2).setY(0.05)

  // Quad vertices on front wall
  const q0 = wallCenter.clone().addScaledVector(along, -0.02)
  const q1 = wallCenter.clone().addScaledVector(along, 0.02)
  const q2 = wallCenter.clone().addScaledVector(along, 0.02).add(new Vector3(0, 0.04, 0))
  const q3 = wallCenter.clone().addScaledVector(along, -0.02).add(new Vector3(0, 0.04, 0))

  // Dark quad elsewhere
  const d0 = new Vector3(10, 0, 10)
  const d1 = new Vector3(10.1, 0, 10)
  const d2 = new Vector3(10.1, 0.1, 10)
  const d3 = new Vector3(10, 0.1, 10)

  const positions = [
    q0.x, q0.y, q0.z, q1.x, q1.y, q1.z, q2.x, q2.y, q2.z, q3.x, q3.y, q3.z,
    d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, d2.x, d2.y, d2.z, d3.x, d3.y, d3.z,
  ]
  const cls = [2, 2, 2, 2, 1, 1, 1, 1]

  const windows: BrushArraysWithCls = {
    positions,
    colors: new Array(positions.length).fill(1),
    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7],
    cls,
    src: new Array(cls.length).fill(0),
  }

  const result = litWindows(windows)
  assert.equal(result.length, 1, 'only one lit window extracted')
  const w = result[0]
  // normal points away from house centre
  const outOfHouse = w.centre.clone().sub(houseCenter).setY(0).normalize()
  assert.ok(w.normal.dot(outOfHouse) > 0.5, 'normal points out of the house')
})

test('life time follows the pinned clock and stops when reduced', () => {
  assert.equal(lifeTime(5, 99, false), 5)
  assert.equal(lifeTime(undefined, 99, false), 99)
  assert.equal(lifeTime(undefined, 99, true), 0)
})

test('LIFE constants and swayInjection are defined', () => {
  assert.equal(LIFE.sway, 0.06)
  assert.equal(LIFE.fireflies, 160)
  assert.deepEqual(LIFE.fireflyT, [0.05, 1.0])
  assert.deepEqual(HILL_PAINT, [990, 858, 1290, 898])
  const injection = swayInjection()
  assert.ok(injection.vertexTransform.includes('swayH'))
})

test('the hills stand on the ground behind the street', () => {
  const g = hillsGeometry()
  assert.ok(g instanceof BufferGeometry)
  const pos = g.getAttribute('position')
  const fwd = new Vector3(...STREET.forward).normalize()
  const right = new Vector3(-fwd.z, 0, fwd.x)

  let minTheta = Infinity
  let maxTheta = -Infinity

  // The geometry is built in 4-vertex columns per radial step:
  // [bottom (-0.05), mid1, mid2, top]
  for (let i = 0; i < pos.count; i += 4) {
    const bottomY = pos.getY(i)
    const topY = pos.getY(i + 3)
    assert.ok(topY > bottomY, `top vertex (y=${topY}) stands above bottom vertex (y=${bottomY})`)

    for (let k = 0; k < 4; k++) {
      const idx = i + k
      const x = pos.getX(idx)
      const z = pos.getZ(idx)
      const dist = Math.hypot(x, z)
      assert.ok(dist >= 4.0, `vertex at distance ${dist.toFixed(2)} is at least 4 from origin`)

      const along = x * fwd.x + z * fwd.z
      const across = x * right.x + z * right.z
      const theta = Math.atan2(across, along)
      if (theta < minTheta) minTheta = theta
      if (theta > maxTheta) maxTheta = theta
    }
  }

  assert.ok(minTheta <= -1.24, `ranges span below -1.24 rad of STREET.forward (got ${minTheta.toFixed(3)})`)
  assert.ok(maxTheta >= 1.24, `ranges span above +1.24 rad of STREET.forward (got ${maxTheta.toFixed(3)})`)
})
