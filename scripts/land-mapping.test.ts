/** The ground's plan-view map (E2.2) and the authored masses' placements (E2.1). */

import assert from 'node:assert/strict'
import test from 'node:test'

import { coastR, islandHeightAt, RZ } from '../src/scene/islandShape.ts'
import { crestAt, flowToPainting, HILL_CREST, LAND_MAP, paintingUvAt, worldAt } from '../src/scene/landMapping.ts'
import { LAND_MASSES } from '../src/scene/landMasses.ts'
import { BACK_ROW, FRONT_ROW, LEFT_ROW, RIGHT_ROW, stationBox } from '../src/scene/villageStations.ts'

test('the map is centred on the church\'s nave, round-trips, and is monotone and continuous in z', () => {
  const [u, v] = paintingUvAt(-0.036, 0.37)
  assert.ok(Math.abs(u - 0.56) < 0.005, `the nave at u ${u.toFixed(3)}`)
  assert.ok(v > 0.78 && v < 1, `the nave on the apron at v ${v.toFixed(3)}`)
  for (const [x, z] of [[-1.9, 1.2], [0, 0], [1.8, -1.2], [0.5, 0.25], [-1.2, -0.9]]) {
    const [uu, vv] = paintingUvAt(x, z)
    const [xx, zz] = worldAt(uu, vv)
    assert.ok(Math.abs(xx - x) < 1e-9 && Math.abs(zz - z) < 1e-9, `round trip at (${x}, ${z})`)
  }
  let previous = Infinity
  for (let z = RZ; z >= -RZ; z -= 0.05) {
    const [, v] = paintingUvAt(0, z)
    assert.ok(v <= previous + 1e-12, 'v falls toward the back')
    previous = v
  }
  const before = paintingUvAt(0, LAND_MAP.apron.zBack + 1e-6)[1]
  const after = paintingUvAt(0, LAND_MAP.apron.zBack - 1e-6)[1]
  assert.ok(Math.abs(before - after) < 1e-4, 'continuous where the apron meets the hills')
  const [uBack, vBack] = paintingUvAt(0, -RZ)
  assert.ok(Math.abs(paintingUvAt(0, RZ)[1] - 1) < 1e-9 && Math.abs(vBack - crestAt(uBack)) < 1e-9, 'the back rim is the crest')
})

test('the scales are the stated ones: 4.75 per u (the right coast under the painting\'s right edge), 5.0 per v on the apron, the hills\' per u to the crest', () => {
  const { apron, hills } = LAND_MAP
  assert.ok(Math.abs(LAND_MAP.worldPerU - 4.75) < 1e-9)
  const [rightCoast] = paintingUvAt(coastR(0), 0)
  assert.ok(Math.abs(rightCoast - 1) < 0.01, `the right coast at u ${rightCoast.toFixed(3)}`)
  const [leftCoast] = paintingUvAt(-coastR(Math.PI), 0)
  assert.ok(leftCoast > 0.05 && leftCoast < 0.26, `the left coast at u ${leftCoast.toFixed(3)}, under the cypress column`)
  const apronPerV = (apron.zFront - apron.zBack) / (apron.vFront - apron.vBack)
  assert.ok(Math.abs(apronPerV - 5.0) < 0.01, `apron ${apronPerV.toFixed(2)} per v`)
  // the hills' stretch per u: from the fields' top to the crest at that u
  for (const [u, low, high] of [[0.95, 7.9, 8.1], [0.6, 9.3, 9.5], [0.45, 17.5, 18]] as const) {
    const hillsPerV = (apron.zBack - hills.zBack) / (apron.vBack - crestAt(u))
    assert.ok(hillsPerV > low && hillsPerV < high, `hills ${hillsPerV.toFixed(2)} per v at u ${u}`)
  }
  for (const [u, v] of HILL_CREST) assert.ok(v >= LAND_MAP.bandV0 && v < apron.vBack - 0.05 && u >= 0 && u <= 1, `the crest at u ${u} inside the band`)
  // the sky above the crest maps off the island's back
  const [, zSky] = worldAt(0.5, crestAt(0.5) - 0.02)
  assert.ok(zSky < -RZ, `the sky at z ${zSky.toFixed(2)}`)
  assert.deepEqual(flowToPainting(0.5, 0), [0.5, LAND_MAP.bandV0])
  assert.deepEqual(flowToPainting(0.5, 1), [0.5, 1])
})

test('every authored mass stands inside the coast with a positive margin at both ends of its base, on the ground', () => {
  for (const mass of LAND_MASSES) {
    for (const x of [mass.x - mass.width / 2, mass.x + mass.width / 2]) {
      const margin = coastR(Math.atan2(mass.z, x)) - Math.hypot(x, mass.z)
      assert.ok(margin > 0.02, `${mass.id}: the base's end at x ${x.toFixed(2)} is ${margin.toFixed(3)} inside the coast`)
    }
    assert.ok(islandHeightAt(mass.x, mass.z) >= 0, `${mass.id} has ground under it`)
    assert.ok(mass.box[2] > mass.box[0] && mass.box[3] > mass.box[1], `${mass.id}'s box is ordered`)
    assert.ok(mass.box[1] >= 0.58 * 1267 - 1, `${mass.id}'s box lies in the land band`)
  }
  const ids = new Set(LAND_MASSES.map((m) => m.id))
  for (const id of ['row-front', 'row-back', 'row-right', 'row-left', 'bushes']) assert.ok(ids.has(id), id)
  assert.ok(LAND_MASSES.filter((m) => m.id.startsWith('orchard')).length >= 2)
})

test('the rows\' boxes are their stations\' x range and crest-to-base range', () => {
  const rows: [string, readonly (readonly number[])[]][] = [['row-front', FRONT_ROW], ['row-back', BACK_ROW], ['row-right', RIGHT_ROW], ['row-left', LEFT_ROW]]
  for (const [id, stations] of rows) {
    const mass = LAND_MASSES.find((m) => m.id === id)!
    assert.deepEqual([...mass.box], stationBox(stations), id)
    for (const [x, crest, base] of stations) {
      assert.ok(x >= mass.box[0] && x <= mass.box[2] && crest >= mass.box[1] && base <= mass.box[3], `${id}'s station at ${x} inside its box`)
    }
  }
  assert.deepEqual(stationBox(FRONT_ROW), [742, 1107, 829, 1142])
  assert.deepEqual(stationBox(BACK_ROW), [1004, 954, 1212, 1017])
})
