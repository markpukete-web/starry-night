import assert from 'node:assert/strict'
import test from 'node:test'
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import {
  STREET,
  pathPoint,
  pathTangent,
  stationPose,
  streetGroundAt,
  STREET_HOUSES,
  STREET_CHURCH,
  STREET_TREES,
} from '../src/scene/streetLayout.ts'
import {
  VILLAGE_CHURCH,
  VILLAGE_NEIGHBOURS,
  VILLAGE_CONTEXT,
} from '../src/scene/villageKnot.ts'

test('the knot moved unchanged', () => {
  assert.equal(VILLAGE_NEIGHBOURS.length, 4, 'four neighbours')
  assert.equal(VILLAGE_CONTEXT.length, 3, 'three context houses')
  assert.deepEqual(VILLAGE_CHURCH.belfry, {
    cx: 0.066,
    cz: 0.235,
    width: 0.09,
    yaw: 0.65,
    floorDrop: 0.035,
    topY: 0.445,
  })
  assert.deepEqual(VILLAGE_CHURCH.spireTip, {
    dx: -0.012,
    y: 1.125,
    dz: -0.008,
  })
  assert.equal(VILLAGE_CHURCH.nave.wall, 'pale')
  assert.equal(VILLAGE_CHURCH.nave.roof, 'roof')
})

test('forward is the home camera\'s', () => {
  const eye = DIORAMA_CAMERAS.design.position
  const target = DIORAMA_CAMERAS.design.target
  const dx = target[0] - eye[0]
  const dz = target[2] - eye[2]
  const len = Math.hypot(dx, dz)
  const computed = [dx / len, 0, dz / len]

  assert.ok(Math.abs(STREET.forward[0] - computed[0]) < 1e-4, 'forward x matches')
  assert.equal(STREET.forward[1], 0, 'forward y is 0')
  assert.ok(Math.abs(STREET.forward[2] - computed[2]) < 1e-4, 'forward z matches')
})

test('every object lies inside the dome under method A', () => {
  const [ox, oy, oz] = STREET.originA

  // Houses
  for (const house of STREET_HOUSES) {
    const at = house.at
    const [px, , pz] = pathPoint(at)
    const [tx, , tz] = pathTangent(at)
    const [nx, , nz] = [-tz, 0, tx]
    const cx = px + nx * (house.side * (0.1 + house.d / 2))
    const cz = pz + nz * (house.side * (0.1 + house.d / 2))

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const y of [0, house.eave + house.pitch]) {
          const cornerX = cx + tx * (sx * house.w / 2) + nx * (sz * house.d / 2) + ox
          const cornerY = y + oy
          const cornerZ = cz + tz * (sx * house.w / 2) + nz * (sz * house.d / 2) + oz
          const dist = Math.hypot(cornerX, cornerY, cornerZ)
          assert.ok(dist <= 5.8, `house at ${at} corner (${cornerX}, ${cornerY}, ${cornerZ}) dist ${dist} <= 5.8`)
        }
      }
    }
  }

  // Church
  const spireTipX = STREET_CHURCH.belfry.cx + STREET_CHURCH.spireTip.dx + ox
  const spireTipY = STREET_CHURCH.spireTip.y + oy
  const spireTipZ = STREET_CHURCH.belfry.cz + STREET_CHURCH.spireTip.dz + oz
  const churchDist = Math.hypot(spireTipX, spireTipY, spireTipZ)
  assert.ok(churchDist <= 5.8, `church spire tip dist ${churchDist} <= 5.8`)
  assert.equal(STREET_CHURCH.nave.door, true, 'church has door')

  // Trees
  for (const tree of STREET_TREES) {
    const treeX = tree.x + ox
    const treeY = tree.width + oy
    const treeZ = tree.z + oz
    const treeDist = Math.hypot(treeX, treeY, treeZ)
    assert.ok(treeDist <= 5.8, `tree ${tree.id} dist ${treeDist} <= 5.8`)
  }
})

test('stations stay inside the painted arc', () => {
  for (const portrait of [false, true]) {
    for (const i of [0, 1, 2, 3, 4] as const) {
      const pose = stationPose(i, portrait)
      const dx = pose.target[0] - pose.position[0]
      const dy = pose.target[1] - pose.position[1]
      const dz = pose.target[2] - pose.position[2]
      const horiz = Math.hypot(dx, dz)

      // Heading relative to forward
      const headingDeg = (Math.atan2(dx * STREET.forward[2] - dz * STREET.forward[0], dx * STREET.forward[0] + dz * STREET.forward[2]) * 180) / Math.PI
      assert.ok(Math.abs(headingDeg) <= 60, `station ${i} portrait=${portrait} heading ${headingDeg} deg within ±60 deg`)

      // Pitch
      const pitchDeg = (Math.atan2(dy, horiz) * 180) / Math.PI
      assert.ok(pitchDeg >= -20 && pitchDeg <= 40, `station ${i} portrait=${portrait} pitch ${pitchDeg} deg within -20 to +40 deg`)
    }
  }
})

test('the near plane clears the ground', () => {
  for (const portrait of [false, true]) {
    for (const i of [0, 1, 2, 3, 4] as const) {
      const pose = stationPose(i, portrait)
      assert.ok(pose.near <= STREET.eye / 10, `station ${i} near ${pose.near} <= eye/10`)
      const ground = streetGroundAt(pose.position[0], pose.position[2])
      const heightAboveGround = pose.position[1] - ground
      assert.ok(heightAboveGround >= 4 * pose.near, `station ${i} height ${heightAboveGround} >= 4 * near (${4 * pose.near})`)
    }
  }
})

test('houses never block the path', () => {
  for (const house of STREET_HOUSES) {
    const p = pathPoint(house.at)
    const t = pathTangent(house.at)
    const n = [-t[2], 0, t[0]]
    const c = Math.cos(house.yaw), s = Math.sin(house.yaw)
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([cx, cz]) => ({
      x: house.x + (cx * house.w / 2) * c - (cz * house.d / 2) * s,
      z: house.z + (cx * house.w / 2) * s + (cz * house.d / 2) * c,
    }))
    const minDistance = Math.min(...corners.map(pt => Math.abs((pt.x - p[0]) * n[0] + (pt.z - p[2]) * n[2])))
    assert.ok(minDistance >= 0.08, `house at ${house.at} clearance ${minDistance} >= 0.08`)
  }
})
