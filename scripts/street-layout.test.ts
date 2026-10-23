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
  STREET_CYPRESS,
  laneOffset,
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
    const c = Math.cos(house.yaw), s = Math.sin(house.yaw)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const y of [0, house.eave + house.pitch]) {
          const cornerX = house.x + (sx * house.w / 2) * c - (sz * house.d / 2) * s + ox
          const cornerY = y + oy
          const cornerZ = house.z + (sx * house.w / 2) * s + (sz * house.d / 2) * c + oz
          const dist = Math.hypot(cornerX, cornerY, cornerZ)
          assert.ok(dist <= 5.8, `house ${house.id} corner (${cornerX}, ${cornerY}, ${cornerZ}) dist ${dist} <= 5.8`)
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
    const reach = 1.19 * Math.min(0.17, Math.max(0.12, tree.width / 2))
    const treeX = tree.x + ox
    const treeY = tree.width + oy
    const treeZ = tree.z + oz
    const treeDist = Math.hypot(treeX, treeY, treeZ) + reach
    assert.ok(treeDist <= 5.8, `tree ${tree.id} dist ${treeDist} <= 5.8`)
  }

  // Cypress
  const cypressX = STREET_CYPRESS.x + ox
  const cypressY = STREET_CYPRESS.height + oy
  const cypressZ = STREET_CYPRESS.z + oz
  const cypressDist = Math.hypot(cypressX, cypressY, cypressZ) + 0.12
  assert.ok(cypressDist <= 5.8, `cypress dist ${cypressDist} <= 5.8`)
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
      // G5 (the world-fixed sky): the frame's top edge within the painted arc's +52°, with a 2° margin
      assert.ok(pitchDeg + pose.fov / 2 <= 50, `station ${i} portrait=${portrait}: tilt ${pitchDeg.toFixed(1)}° + half the fov ${pose.fov / 2}° within 50°`)
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

test('houses never block the lane', () => {
  let minLaneMargin = Infinity
  for (const house of STREET_HOUSES) {
    const c = Math.cos(house.yaw), s = Math.sin(house.yaw)
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([cx, cz]) => ({
      x: house.x + (cx * house.w / 2) * c - (cz * house.d / 2) * s,
      z: house.z + (cx * house.w / 2) * s + (cz * house.d / 2) * c,
    }))
    for (const corner of corners) {
      const clearance = house.side * laneOffset(corner.x, corner.z)
      if (clearance < minLaneMargin) minLaneMargin = clearance
      assert.ok(clearance >= 0.08, `house ${house.id} corner clearance ${clearance.toFixed(4)} >= 0.08`)
    }
  }
  console.log(`[margin] houses never block the lane: min margin = ${minLaneMargin.toFixed(4)} (threshold 0.08)`)
})

test('the lane is the map\'s S', () => {
  const [fx, , fz] = STREET.forward
  const [rx, , rz] = [-fz, 0, fx]

  const p0 = pathPoint(0)
  assert.ok(Math.hypot(p0[0], p0[2]) < 0.001, `pathPoint(0) at origin: ${p0}`)
  assert.ok(pathTangent(0).every(Number.isFinite), 'pathTangent(0) finite')

  const p1 = pathPoint(1)
  const a1 = p1[0] * fx + p1[2] * fz
  const l1 = p1[0] * rx + p1[2] * rz
  assert.ok(Math.abs(a1 - 2.112) < 0.001, `pathPoint(1) local a ${a1} matches 2.112`)
  assert.ok(Math.abs(l1 - 0) < 0.001, `pathPoint(1) local l ${l1} matches 0`)

  assert.ok(STREET.pathLength >= 2.39 && STREET.pathLength <= 2.40, `STREET.pathLength ${STREET.pathLength} between 2.39 and 2.40`)

  let minL = Infinity
  let maxL = -Infinity
  const steps = 200
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const p = pathPoint(t)
    const l = p[0] * rx + p[2] * rz
    if (l < minL) minL = l
    if (l > maxL) maxL = l
  }
  assert.ok(minL < -0.2, `minimum lateral l ${minL.toFixed(4)} below -0.2`)
  assert.ok(maxL > 0.2, `maximum lateral l ${maxL.toFixed(4)} above 0.2`)
  console.log(`[margin] the lane is the map's S: minL = ${minL.toFixed(4)}, maxL = ${maxL.toFixed(4)}, length = ${STREET.pathLength.toFixed(4)}`)
})

type Box2D = {
  id: string
  cx: number
  cz: number
  w: number
  d: number
  yaw: number
  corners: { x: number; z: number }[]
}

function makeBox(id: string, cx: number, cz: number, w: number, d: number, yaw: number): Box2D {
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => ({
    x: cx + (sx * w / 2) * c - (sz * d / 2) * s,
    z: cz + (sx * w / 2) * s + (sz * d / 2) * c,
  }))
  return { id, cx, cz, w, d, yaw, corners }
}

function distPointToBox(px: number, pz: number, box: Box2D): number {
  const dx = px - box.cx
  const dz = pz - box.cz
  const c = Math.cos(-box.yaw)
  const s = Math.sin(-box.yaw)
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  const qx = Math.max(0, Math.abs(lx) - box.w / 2)
  const qz = Math.max(0, Math.abs(lz) - box.d / 2)
  return Math.hypot(qx, qz)
}

function distBoxToBox(b1: Box2D, b2: Box2D): number {
  let minDist = Infinity
  for (const pt of b1.corners) {
    const d = distPointToBox(pt.x, pt.z, b2)
    if (d < minDist) minDist = d
  }
  for (const pt of b2.corners) {
    const d = distPointToBox(pt.x, pt.z, b1)
    if (d < minDist) minDist = d
  }
  return minDist
}

test('houses and trees do not overlap', () => {
  const boxes: Box2D[] = STREET_HOUSES.map(h => makeBox(h.id, h.x, h.z, h.w, h.d, h.yaw))
  const nave = STREET_CHURCH.nave
  boxes.push(makeBox('nave', nave.x, nave.z, nave.w, nave.d, nave.yaw))

  let minBoxBoxGap = Infinity
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const gap = distBoxToBox(boxes[i], boxes[j])
      if (gap < minBoxBoxGap) minBoxBoxGap = gap
      assert.ok(gap >= 0.02, `overlap between ${boxes[i].id} and ${boxes[j].id}: gap ${gap.toFixed(4)} < 0.02`)
    }
  }

  type Circle2D = { id: string; x: number; z: number; r: number }
  const circles: Circle2D[] = STREET_TREES.map(tree => ({
    id: tree.id,
    x: tree.x,
    z: tree.z,
    r: 1.19 * Math.min(0.17, Math.max(0.12, tree.width / 2)),
  }))
  circles.push({
    id: 'cypress',
    x: STREET_CYPRESS.x,
    z: STREET_CYPRESS.z,
    r: 0.12,
  })

  let minCircleBoxGap = Infinity
  for (const c of circles) {
    for (const b of boxes) {
      const gap = distPointToBox(c.x, c.z, b) - c.r
      if (gap < minCircleBoxGap) minCircleBoxGap = gap
      assert.ok(gap >= 0.02, `overlap between circle ${c.id} and box ${b.id}: gap ${gap.toFixed(4)} < 0.02`)
    }
  }

  let minCircleCircleGap = Infinity
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const gap = Math.hypot(circles[i].x - circles[j].x, circles[i].z - circles[j].z) - circles[i].r - circles[j].r
      if (gap < minCircleCircleGap) minCircleCircleGap = gap
      assert.ok(gap >= 0.02, `overlap between circles ${circles[i].id} and ${circles[j].id}: gap ${gap.toFixed(4)} < 0.02`)
    }
  }

  console.log(`[margin] houses and trees do not overlap: min box-box = ${minBoxBoxGap.toFixed(4)}, min circle-box = ${minCircleBoxGap.toFixed(4)}, min circle-circle = ${minCircleCircleGap.toFixed(4)}`)
})

test('no station camera stands inside anything', () => {
  const boxes: Box2D[] = STREET_HOUSES.map(h => makeBox(h.id, h.x, h.z, h.w, h.d, h.yaw))
  const nave = STREET_CHURCH.nave
  boxes.push(makeBox('nave', nave.x, nave.z, nave.w, nave.d, nave.yaw))

  const circles = [
    ...STREET_TREES.map(tree => ({
      id: tree.id,
      x: tree.x,
      z: tree.z,
      reach: 1.19 * Math.min(0.17, Math.max(0.12, tree.width / 2)),
    })),
    { id: 'cypress', x: STREET_CYPRESS.x, z: STREET_CYPRESS.z, reach: 0.12 },
  ]

  let minCameraClearance = Infinity
  for (const portrait of [false, true]) {
    for (const i of [0, 1, 2, 3, 4] as const) {
      const pose = stationPose(i, portrait)
      const px = pose.position[0]
      const pz = pose.position[2]

      for (const box of boxes) {
        const d = distPointToBox(px, pz, box)
        if (d < minCameraClearance) minCameraClearance = d
        assert.ok(d >= 0.1, `station ${i} portrait=${portrait} camera too close to ${box.id}: dist ${d.toFixed(4)} < 0.1`)
      }

      for (const c of circles) {
        const d = Math.hypot(px - c.x, pz - c.z) - c.reach
        if (d < minCameraClearance) minCameraClearance = d
        assert.ok(d >= 0.1, `station ${i} portrait=${portrait} camera too close to ${c.id}: dist ${d.toFixed(4)} < 0.1`)
      }
    }
  }
  console.log(`[margin] no station camera stands inside anything: min clearance = ${minCameraClearance.toFixed(4)} (threshold 0.1)`)
})

test('stop 4 frames the gable and the door', () => {
  const nave = STREET_CHURCH.nave
  const [fx, , fz] = STREET.forward
  // front wall center (the door foot)
  const frontWallCenterX = nave.x - fx * (nave.d / 2)
  const frontWallCenterZ = nave.z - fz * (nave.d / 2)
  const doorFoot = { x: frontWallCenterX, y: 0, z: frontWallCenterZ }
  const gablePeak = { x: frontWallCenterX, y: nave.eave + nave.pitch, z: frontWallCenterZ }

  for (const portrait of [false, true]) {
    const pose = stationPose(4, portrait)
    const cam = pose.position
    const tgt = pose.target
    const dx = tgt[0] - cam[0]
    const dz = tgt[2] - cam[2]
    const dy = tgt[1] - cam[1]
    const horiz = Math.hypot(dx, dz)
    const pitch = (Math.atan2(dy, horiz) * 180) / Math.PI
    const halfFov = pose.fov / 2

    for (const [name, pt] of [['door foot', doorFoot], ['gable peak', gablePeak]] as const) {
      const pdx = pt.x - cam[0]
      const pdz = pt.z - cam[2]
      const pdy = pt.y - cam[1]
      const phoriz = Math.hypot(pdx, pdz)
      const elev = (Math.atan2(pdy, phoriz) * 180) / Math.PI

      const marginLower = elev - (pitch - halfFov)
      const marginUpper = (pitch + halfFov) - elev
      assert.ok(marginLower >= 0, `stop 4 portrait=${portrait}: ${name} elev ${elev.toFixed(1)}° below frame bottom ${(pitch - halfFov).toFixed(1)}°`)
      assert.ok(marginUpper >= 0, `stop 4 portrait=${portrait}: ${name} elev ${elev.toFixed(1)}° above frame top ${(pitch + halfFov).toFixed(1)}°`)
      console.log(`[margin] stop 4 portrait=${portrait} ${name}: elev=${elev.toFixed(2)}°, pitch=${pitch.toFixed(2)}°, marginLower=${marginLower.toFixed(2)}°, marginUpper=${marginUpper.toFixed(2)}°`)
    }
  }
})

test('stop 0 composes the painting', () => {
  const nave = STREET_CHURCH.nave

  // Landscape
  {
    const pose = stationPose(0, false)
    const cam = pose.position
    const tgt = pose.target
    const hx = tgt[0] - cam[0]
    const hz = tgt[2] - cam[2]
    const hLen = Math.hypot(hx, hz)
    const forwardX = hx / hLen
    const forwardZ = hz / hLen
    const rightX = -forwardZ
    const rightZ = forwardX

    // Cypress angle
    const cdx = STREET_CYPRESS.x - cam[0]
    const cdz = STREET_CYPRESS.z - cam[2]
    const cAlong = cdx * forwardX + cdz * forwardZ
    const cRight = cdx * rightX + cdz * rightZ
    const cypressAngle = (Math.atan2(cRight, cAlong) * 180) / Math.PI

    // Nave angle
    const ndx = nave.x - cam[0]
    const ndz = nave.z - cam[2]
    const nAlong = ndx * forwardX + ndz * forwardZ
    const nRight = ndx * rightX + ndz * rightZ
    const naveAngle = (Math.atan2(nRight, nAlong) * 180) / Math.PI

    // Landscape: cypress 22° to 30° left (-30° to -22°), nave 5° to 13° right (+5° to +13°)
    assert.ok(cypressAngle >= -30 && cypressAngle <= -22, `stop 0 landscape cypress angle ${cypressAngle.toFixed(2)}° between -30° and -22°`)
    assert.ok(naveAngle >= 5 && naveAngle <= 13, `stop 0 landscape nave angle ${naveAngle.toFixed(2)}° between +5° and +13°`)
    console.log(`[margin] stop 0 landscape: cypressAngle=${cypressAngle.toFixed(2)}° (range [-30, -22]), naveAngle=${naveAngle.toFixed(2)}° (range [5, 13])`)
  }

  // Portrait
  {
    const pose = stationPose(0, true)
    const cam = pose.position
    const tgt = pose.target
    const hx = tgt[0] - cam[0]
    const hz = tgt[2] - cam[2]
    const hLen = Math.hypot(hx, hz)
    const forwardX = hx / hLen
    const forwardZ = hz / hLen
    const rightX = -forwardZ
    const rightZ = forwardX

    const cdx = STREET_CYPRESS.x - cam[0]
    const cdz = STREET_CYPRESS.z - cam[2]
    const cAlong = cdx * forwardX + cdz * forwardZ
    const cRight = cdx * rightX + cdz * rightZ
    const cypressAngle = (Math.atan2(cRight, cAlong) * 180) / Math.PI

    const ndx = nave.x - cam[0]
    const ndz = nave.z - cam[2]
    const nAlong = ndx * forwardX + ndz * forwardZ
    const nRight = ndx * rightX + ndz * rightZ
    const naveAngle = (Math.atan2(nRight, nAlong) * 180) / Math.PI

    assert.ok(Math.abs(cypressAngle) <= 19.5, `stop 0 portrait cypress angle ${cypressAngle.toFixed(2)}° within ±19.5°`)
    assert.ok(Math.abs(naveAngle) <= 19.5, `stop 0 portrait nave angle ${naveAngle.toFixed(2)}° within ±19.5°`)
    console.log(`[margin] stop 0 portrait: cypressAngle=${cypressAngle.toFixed(2)}° (<=19.5), naveAngle=${naveAngle.toFixed(2)}° (<=19.5)`)
  }
})
