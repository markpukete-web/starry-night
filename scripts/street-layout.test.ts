import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'
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
  STATION_T,
  WALK_T,
  LANE_JOINS,
  WALK_ROUND,
  walkTangent,
  walkPose,
  VINCENT_RIG,
  vincentPlace,
  vincentBoxCorners,
  STREET_SQUARE,
  churchFront,
} from '../src/scene/streetLayout.ts'
import {
  VILLAGE_CHURCH,
  VILLAGE_NEIGHBOURS,
  VILLAGE_CONTEXT,
} from '../src/scene/villageKnot.ts'
import { buildStreetTrees } from '../src/scene/streetTrees.ts'

/** Each tree's reach: the farthest of its built vertices from its foot, flat (Codex T2: the old 1.19 R proxy fell short
 * of pass 7's crowns). The positions do not depend on the painting, so a plain one stands in for the scan. */
const TREE_REACH = (() => {
  const width = 1600, height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [120, 140, 170, 255]][i % 4], i * 4)
  const built = buildStreetTrees({ data, width, height }, STREET_TREES)
  const reach = new Map(STREET_TREES.map((tree) => [tree.id, 0]))
  for (const p of [built.solid.positions, built.strokes.positions]) {
    for (let i = 0; i < p.length; i += 3) {
      // ponytail: each vertex goes to the nearest foot, exact while trees stand 0.61 apart; tag vertices per tree in
      // buildStreetTrees if one is ever placed inside another's reach
      const d = STREET_TREES.map((tree) => Math.hypot(p[i] - tree.x, p[i + 2] - tree.z))
      const k = d.indexOf(Math.min(...d))
      reach.set(STREET_TREES[k].id, Math.max(reach.get(STREET_TREES[k].id)!, d[k]))
    }
  }
  return reach
})()

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
    const reach = TREE_REACH.get(tree.id)!
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
    r: TREE_REACH.get(tree.id)!,
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
      reach: TREE_REACH.get(tree.id)!,
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
  // front wall center (the door foot), from the turned church's yaw (the church plan, F5)
  const { x: frontWallCenterX, z: frontWallCenterZ } = churchFront()
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

test('walk pose reproduces the stations', () => {
  assert.deepEqual(WALK_T, { min: 0, max: 0.9 })
  for (const portrait of [false, true]) {
    for (let i = 0; i < 5; i++) {
      const w = walkPose(STATION_T[i], portrait)
      const s = stationPose(i as 0 | 1 | 2 | 3 | 4, portrait)
      for (let k = 0; k < 3; k++) {
        assert.ok(Math.abs(w.position[k] - s.position[k]) <= 1e-9, `position[${k}] matches at ${i} portrait=${portrait}`)
        assert.ok(Math.abs(w.target[k] - s.target[k]) <= 1e-9, `target[${k}] matches at ${i} portrait=${portrait}`)
      }
      assert.ok(Math.abs(w.fov - s.fov) <= 1e-9, `fov matches at ${i} portrait=${portrait}`)
      assert.ok(Math.abs(w.near - s.near) <= 1e-9, `near matches at ${i} portrait=${portrait}`)
      assert.ok(Math.abs(w.far - s.far) <= 1e-9, `far matches at ${i} portrait=${portrait}`)
    }
  }
})

test('the rounding keeps clear of the stations', () => {
  assert.equal(LANE_JOINS.length, 2)
  assert.ok(Math.abs(LANE_JOINS[0] - 0.33168) <= 1e-4, `LANE_JOINS[0] within 1e-4 of 0.33168`)
  assert.ok(Math.abs(LANE_JOINS[1] - 0.68440) <= 1e-4, `LANE_JOINS[1] within 1e-4 of 0.68440`)
  for (const st of STATION_T) {
    for (const j of LANE_JOINS) {
      assert.ok(Math.abs(st - j) > WALK_ROUND, `station ${st} > WALK_ROUND (${WALK_ROUND}) from join ${j}`)
    }
  }
})

test("walkTangent is the lane's tangent outside the rounding", () => {
  const ts = [0, 0.2, 0.5, 0.8, 0.9, 1, 1 + 1e-6, 0.9 + VINCENT_RIG.ahead / STREET.pathLength]
  for (const t of ts) {
    const wt = walkTangent(t)
    const pt = pathTangent(t)
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(wt[k] - pt[k]) <= 1e-12, `walkTangent matches pathTangent at t=${t} component ${k}`)
    }
  }
  const lastT = 0.9 + VINCENT_RIG.ahead / STREET.pathLength
  const wtLast = walkTangent(lastT)
  const pt09 = pathTangent(0.9)
  const diff = Math.hypot(wtLast[0] - pt09[0], wtLast[2] - pt09[2])
  assert.ok(diff > 0.1, `negative control: diff at ${lastT} vs pathTangent(0.9) is ${diff} > 0.1`)
})

test('Vincent faces the lane at his own place', () => {
  const L = STREET.pathLength
  const smooth = (a: number, b: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)
  }
  for (let k = 0; k <= 900; k++) {
    const t = k / 1000
    const { position, yaw } = vincentPlace(t)
    const tv = t + VINCENT_RIG.ahead / L
    const wt = walkTangent(tv)
    const facing = [Math.sin(yaw), 0, Math.cos(yaw)]
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(facing[i] - wt[i]) <= 1e-9, `facing[${i}] matches walkTangent at t=${t}`)
    }
    const lat = VINCENT_RIG.lateral + (VINCENT_RIG.lateralEnd - VINCENT_RIG.lateral) * smooth(STATION_T[3], STATION_T[4], t)
    const [vx, , vz] = pathPoint(tv)
    const [tx, , tz] = wt
    const expectedPos = [vx - tz * lat, 0, vz + tx * lat]
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(position[i] - expectedPos[i]) <= 1e-9, `position[${i}] matches expected at t=${t}`)
    }
  }
})

test('the walk has no kink', () => {
  for (let k = 1; k < 900; k++) {
    const t = k / 1000
    const offset = (u: number) => {
      const p = pathPoint(u)
      const c = walkPose(u, false).position
      return [c[0] - p[0], c[2] - p[2]]
    }
    const a = offset(t - 0.001)
    const b = offset(t)
    const c = offset(t + 0.001)
    const d2 = Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1])
    assert.ok(d2 <= 0.0001, `second difference at t=${t} is ${d2} <= 0.0001`)
  }
})

test('walk pose is smooth', () => {
  for (let k = 0; k < 900; k++) {
    const t0 = k / 1000
    const t1 = (k + 1) / 1000
    const p0 = walkPose(t0, false)
    const p1 = walkPose(t1, false)
    const move = Math.hypot(p1.position[0] - p0.position[0], p1.position[1] - p0.position[1], p1.position[2] - p0.position[2])
    assert.ok(move <= 0.004, `camera move between ${t0} and ${t1} is ${move} <= 0.004`)

    const h0x = p0.target[0] - p0.position[0]
    const h0z = p0.target[2] - p0.position[2]
    const angle0 = Math.atan2(h0x, h0z)

    const h1x = p1.target[0] - p1.position[0]
    const h1z = p1.target[2] - p1.position[2]
    const angle1 = Math.atan2(h1x, h1z)

    let dAngle = Math.abs(angle1 - angle0)
    if (dAngle > Math.PI) dAngle = 2 * Math.PI - dAngle
    const dDeg = (dAngle * 180) / Math.PI
    assert.ok(dDeg <= 1.5, `heading turn between ${t0} and ${t1} is ${dDeg}° <= 1.5°`)
  }
})

test('the walk stays inside the painted arc', () => {
  for (const portrait of [false, true]) {
    for (let k = 0; k <= 900; k++) {
      const t = k / 1000
      const pose = walkPose(t, portrait)
      const dx = pose.target[0] - pose.position[0]
      const dy = pose.target[1] - pose.position[1]
      const dz = pose.target[2] - pose.position[2]
      const horiz = Math.hypot(dx, dz)

      // Heading relative to forward
      const headingDeg = (Math.atan2(dx * STREET.forward[2] - dz * STREET.forward[0], dx * STREET.forward[0] + dz * STREET.forward[2]) * 180) / Math.PI
      assert.ok(Math.abs(headingDeg) <= 60, `walk t=${t} portrait=${portrait} heading ${headingDeg} deg within ±60 deg`)

      // Pitch
      const pitchDeg = (Math.atan2(dy, horiz) * 180) / Math.PI
      assert.ok(pitchDeg >= -20 && pitchDeg <= 40, `walk t=${t} portrait=${portrait} pitch ${pitchDeg} deg within -20 to +40 deg`)
      assert.ok(pitchDeg + pose.fov / 2 <= 50, `walk t=${t} portrait=${portrait}: tilt ${pitchDeg.toFixed(1)}° + half the fov ${pose.fov / 2}° within 50°`)
    }
  }
})

test('Vincent stays in frame', () => {
  for (const [aspect, portrait] of [[1.6, false], [390 / 844, true]] as const) {
    for (let k = 0; k <= 900; k++) {
      const t = k / 1000
      const pose = walkPose(t, portrait)
      const c = new PerspectiveCamera(pose.fov, aspect, STREET.near, STREET.far)
      c.position.set(...pose.position)
      c.lookAt(...pose.target)
      c.updateMatrixWorld()

      const place = vincentPlace(t)
      const footPt = new Vector3(place.position[0], 0, place.position[2]).project(c)
      const headPt = new Vector3(place.position[0], VINCENT_RIG.height, place.position[2]).project(c)

      assert.ok(Math.abs(headPt.x) <= 0.85, `head |x| at t=${t} portrait=${portrait} is ${Math.abs(headPt.x)} <= 0.85`)

      const h = (headPt.y - footPt.y) / 2
      if (portrait) {
        assert.ok(h >= 0.08 && h <= 0.13, `portrait height share at t=${t} is ${h} in [0.08, 0.13]`)
      } else {
        assert.ok(h >= 0.14 && h <= 0.22, `landscape height share at t=${t} is ${h} in [0.14, 0.22]`)
      }

      const corners = vincentBoxCorners(t)
      for (const corner of corners) {
        const pt = new Vector3(...corner).project(c)
        assert.ok(Math.abs(pt.x) < 1, `corner |x| at t=${t} portrait=${portrait} is ${Math.abs(pt.x)} < 1`)
        assert.ok(pt.y >= -0.95, `corner y at t=${t} portrait=${portrait} is ${pt.y} >= -0.95`)
      }
    }
  }
})

test('Vincent clears the church door at stop 4', () => {
  const nave = STREET_CHURCH.nave
  // the door's foot and its width's direction, from the turned church's yaw (the church plan, F5)
  const foot = churchFront()
  const side = new Vector3(Math.cos(nave.yaw), 0, Math.sin(nave.yaw))

  for (const [aspect, portrait] of [[1.6, false], [390 / 844, true]] as const) {
    const pose = walkPose(0.9, portrait)
    const c = new PerspectiveCamera(pose.fov, aspect, STREET.near, STREET.far)
    c.position.set(...pose.position)
    c.lookAt(...pose.target)
    c.updateMatrixWorld()

    const doorCorners = [-1, 1].flatMap((s) =>
      [0, 0.12].map((y) => foot.clone().addScaledVector(side, 0.025 * s).setY(y).project(c))
    )
    const dx0 = Math.min(...doorCorners.map((v) => v.x))
    const dx1 = Math.max(...doorCorners.map((v) => v.x))
    const dy0 = Math.min(...doorCorners.map((v) => v.y))
    const dy1 = Math.max(...doorCorners.map((v) => v.y))

    const vCorners = vincentBoxCorners(0.9).map((pt) => new Vector3(...pt).project(c))
    const vx0 = Math.min(...vCorners.map((v) => v.x))
    const vx1 = Math.max(...vCorners.map((v) => v.x))
    const vy0 = Math.min(...vCorners.map((v) => v.y))
    const vy1 = Math.max(...vCorners.map((v) => v.y))

    const overlap = !(vx1 < dx0 || vx0 > dx1 || vy1 < dy0 || vy0 > dy1)
    assert.equal(overlap, false, `Vincent box clears church door on portrait=${portrait}`)
  }
})

test('Vincent stands in the square at stop 4', () => {
  const { position } = vincentPlace(0.9)
  const dist = Math.hypot(position[0] - STREET_SQUARE.x, position[2] - STREET_SQUARE.z)
  assert.ok(dist <= STREET_SQUARE.radius, `Vincent distance ${dist} <= square radius ${STREET_SQUARE.radius}`)
})

