import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { islandHeightAt } from '../src/scene/islandShape.ts'
import { buildLandTrees, type BakedMass } from '../src/scene/landDomes.ts'
import { LAND_MASSES } from '../src/scene/landMasses.ts'
import { buildStreet } from '../src/scene/streetGeometry.ts'
import { readStreetFlags, streetReadiness, touchEnabled } from '../src/scene/streetMode.ts'
import { decodePNG } from './lib/png.ts'

test('flags', () => {
  // absent gives street: false
  const def = readStreetFlags('')
  assert.equal(def.street, false)
  assert.equal(def.station, 0)
  assert.equal(def.flat, false)
  assert.equal(def.ids, false)
  assert.equal(def.fail, null)
  assert.equal(def.anchor, 'A')
  assert.equal(def.turn, 'lock')

  // street=0 gives street: false
  assert.equal(readStreetFlags('?street=0').street, false)

  // street=1&station=9 gives station 4
  const s9 = readStreetFlags('?street=1&station=9')
  assert.equal(s9.street, true)
  assert.equal(s9.station, 4)

  // station clamping
  assert.equal(readStreetFlags('?street=1&station=-2').station, 0)
  assert.equal(readStreetFlags('?street=1&station=2').station, 2)

  // anchors and turns
  assert.equal(readStreetFlags('?street=1&skyAnchor=B').anchor, 'B')
  assert.equal(readStreetFlags('?street=1&skyTurn=world').turn, 'world')
})

test('readiness', () => {
  // all pending
  assert.deepEqual(streetReadiness({ painting: 'pending', flow: 'pending', masses: 'pending' }), { ready: false, render: false })
  // one pending, others ok
  assert.deepEqual(streetReadiness({ painting: 'pending', flow: 'ok', masses: 'ok' }), { ready: false, render: false })
  // each one failed
  assert.deepEqual(streetReadiness({ painting: 'failed', flow: 'ok', masses: 'ok' }), { ready: true, render: false })
  assert.deepEqual(streetReadiness({ painting: 'ok', flow: 'failed', masses: 'ok' }), { ready: true, render: false })
  assert.deepEqual(streetReadiness({ painting: 'ok', flow: 'ok', masses: 'failed' }), { ready: true, render: false })
  // multiple failed
  assert.deepEqual(streetReadiness({ painting: 'failed', flow: 'failed', masses: 'failed' }), { ready: true, render: false })
  // all ok
  assert.deepEqual(streetReadiness({ painting: 'ok', flow: 'ok', masses: 'ok' }), { ready: true, render: true })
})

test('touch is off in the street', () => {
  for (const touch of [false, true]) {
    for (const reduced of [false, true]) {
      for (const arriving of [false, true]) {
        assert.equal(touchEnabled({ touch, reduced, arriving, street: true }), false)
      }
    }
  }
  // When street is false, preserves today's behavior
  assert.equal(touchEnabled({ touch: true, reduced: false, arriving: false, street: false }), true)
  assert.equal(touchEnabled({ touch: false, reduced: false, arriving: false, street: false }), false)
  assert.equal(touchEnabled({ touch: true, reduced: true, arriving: false, street: false }), false)
  assert.equal(touchEnabled({ touch: true, reduced: false, arriving: true, street: false }), false)
})

test('the land is unchanged by groundAt', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }

  const trees = buildLandTrees(flow, painting, baked)

  const hasher = createHash('sha256')
  for (const arr of [
    Float32Array.from(trees.strokes.positions),
    Float32Array.from(trees.strokes.colors),
    Uint32Array.from(trees.strokes.indices),
    Float32Array.from(trees.solid.positions),
    Float32Array.from(trees.solid.colors),
    Uint32Array.from(trees.solid.indices),
    Float32Array.from(trees.bend),
    Float32Array.from(trees.solidBend),
  ]) {
    hasher.update(Buffer.from(arr.buffer))
  }
  const hash = hasher.digest('hex')
  assert.equal(hash, '0313681b3eb616db6786e332cfcf116840d778f2270aa5652cd4f24062ca80fd')
})

test('groundAt reaches every terrain read', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }

  // olive-right is at x=0.7, z=0.05 where islandHeightAt is ~0.2023 > 0.1
  const oliveRight = LAND_MASSES.find((m) => m.id === 'olive-right')!
  assert.ok(islandHeightAt(oliveRight.x, oliveRight.z) > 0.1)

  let drapeContactCalls = 0
  const zeroGround = (_x: number, z: number) => {
    if (Math.abs(z - oliveRight.z) > 0.001) drapeContactCalls++
    return 0
  }
  const treesZero = buildLandTrees(flow, painting, baked, 0x7ee5, [oliveRight], zeroGround)
  assert.ok(drapeContactCalls > 0, `groundAt called in drapeOnDomes contact check (${drapeContactCalls} calls)`)

  // Max y of solids with zeroGround is placed.height, whereas with islandHeightAt it would be islandHeightAt + placed.height
  const solidPositions = treesZero.solid.positions
  let maxSolidY = -Infinity
  let minSolidY = Infinity
  for (let i = 1; i < solidPositions.length; i += 3) {
    maxSolidY = Math.max(maxSolidY, solidPositions[i])
    minSolidY = Math.min(minSolidY, solidPositions[i])
  }
  assert.ok(minSolidY >= -1e-6 && minSolidY <= 0.05, `minSolidY ${minSolidY} measured from y=0`)
  assert.ok(maxSolidY < 0.20, `maxSolidY ${maxSolidY} < 0.20 (islandHeightAt was 0.2023)`)

  // Strips y
  const strokePositions = treesZero.strokes.positions
  let minStrokeY = Infinity
  let maxStrokeY = -Infinity
  for (let i = 1; i < strokePositions.length; i += 3) {
    minStrokeY = Math.min(minStrokeY, strokePositions[i])
    maxStrokeY = Math.max(maxStrokeY, strokePositions[i])
  }
  assert.ok(minStrokeY >= 0.005 - 1e-6 && minStrokeY < 0.1, `minStrokeY ${minStrokeY} measured from y=0`)
  assert.ok(maxStrokeY < 0.25, `maxStrokeY ${maxStrokeY} < 0.25`)

  // Bend weights measured from y=0
  for (let i = 0; i < treesZero.bend.length; i++) {
    const y = strokePositions[i * 3 + 1]
    const expected = Math.min(1, Math.max(0, y / 0.1748))
    assert.ok(Math.abs(treesZero.bend[i] - expected) < 1e-4, 'bend weight measured from y=0')
  }
})

test('the street builds all or nothing', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }

  assert.equal(buildStreet(null, flow, baked), null)
  assert.equal(buildStreet(painting, null, baked), null)
  assert.equal(buildStreet(painting, flow, null), null)
  assert.notEqual(buildStreet(painting, flow, baked), null)
})
