/** The trees and bushes (E2.4): the domes on the terrain, the union's continuity, the contact policy, the counts. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, Vector3 } from 'three'

import { islandHeightAt } from '../src/scene/islandShape.ts'
import { buildLandTrees, CONTACT, DOME_HEIGHT_CAP, DOME_LIFT, domesOf, drapeOnDomes, liftToDomes, placeMass, pushDome, RIM_REACH, type BakedMass } from '../src/scene/landDomes.ts'
import { ribbonColumns, type CypressRibbon } from '../src/scene/cypressStrokes.ts'
import { STRIP_COLUMNS } from '../src/scene/cypressLobeGeometry.ts'
import { LAND_MASSES } from '../src/scene/landMasses.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const rowBack = placeMass(LAND_MASSES.find((m) => m.id === 'row-back')!)

test('every mass\'s domes stand on the terrain, their count by the width', () => {
  for (const mass of LAND_MASSES) {
    const placed = placeMass(mass)
    const domes = domesOf(placed)
    const ry = placed.height / 2
    assert.equal(domes.length, Math.max(1, Math.round(placed.width / (ry * 1.4))), `${mass.id}'s dome count`)
    for (const dome of domes) {
      assert.ok(Math.abs(dome.centre.y - dome.ry - islandHeightAt(dome.centre.x, dome.centre.z)) < 1e-6, `${mass.id}: the lowest point on the ground`)
      assert.ok(dome.rz > 0 && dome.rz <= Math.min(dome.rx, dome.ry) * 0.5 + 1e-9)
    }
    assert.ok(placed.height > 0.1 && placed.height <= DOME_HEIGHT_CAP + 1e-9, `${mass.id} stands ${placed.height.toFixed(2)} high`)
  }
})

test('liftToDomes is continuous across row-back\'s dome boundaries along the facing axis; the winning dome\'s normal is not', () => {
  const domes = domesOf(rowBack)
  assert.ok(domes.length >= 3, 'row-back has boundaries to cross')
  let worstFacing = 0
  let worstNormal = 0
  let switches = 0
  let previous: ReturnType<typeof liftToDomes> = null
  let previousNormal: Vector3 | null = null
  for (let s = 0; s <= 1; s += 1e-4) {
    const hit = liftToDomes(domes, rowBack, s, 0.5, true)
    assert.ok(hit, `a point at s ${s.toFixed(4)}`)
    // the control: an offset of DOME_LIFT along the winning ellipsoid's outward normal
    const d = hit.dome
    const normal = new Vector3((hit.position.x - d.centre.x) / d.rx ** 2, (hit.position.y - d.centre.y) / d.ry ** 2, (hit.position.z - d.centre.z) / d.rz ** 2).normalize()
    const alongNormal = hit.position.clone().addScaledVector(normal, DOME_LIFT)
    if (previous && previousNormal) {
      worstFacing = Math.max(worstFacing, hit.position.clone().setZ(hit.position.z + DOME_LIFT).distanceTo(previous.position.clone().setZ(previous.position.z + DOME_LIFT)))
      worstNormal = Math.max(worstNormal, alongNormal.distanceTo(previousNormal))
      if (previous.dome !== hit.dome) switches++
    }
    previous = hit
    previousNormal = alongNormal
  }
  assert.ok(switches >= 2, `${switches} dome switches crossed`)
  assert.ok(worstFacing < 0.002, `the facing-axis lift steps at most ${worstFacing.toFixed(4)}`)
  assert.ok(worstNormal > 0.002, `the normal offset's worst step ${worstNormal.toFixed(4)} (the control)`)
})

test('drapeOnDomes emits a continuous strip through row-back\'s crossings (the runtime, not a recomputation)', () => {
  // a ribbon along s at t 0.5, every sample one source column apart, the seed in the middle
  const domes = domesOf(rowBack)
  const samples = Array.from({ length: 201 }, (_, k) => ({ px: k / 200, py: 0.5, inside: true }))
  const ribbon: CypressRibbon = { samples, seedSample: samples[100], colour: [0.2, 0.3, 0.3], halfWidth: 0.01, relief: 1, seed: 1 }
  const columns = ribbonColumns(ribbon, 200, 60, 1, STRIP_COLUMNS)
  const strip = drapeOnDomes(ribbon, columns, domes, rowBack, true)
  assert.ok(strip && strip.steps.length >= 150, `${strip?.steps.length ?? 0} steps kept`)
  let worst = 0
  for (let k = 1; k < strip!.steps.length; k++) {
    for (let j = 0; j < STRIP_COLUMNS; j++) worst = Math.max(worst, strip!.steps[k][j].distanceTo(strip!.steps[k - 1][j]))
  }
  assert.ok(worst < 0.012, `the emitted columns step at most ${worst.toFixed(4)} (one source column is ${(rowBack.width / 200).toFixed(4)} along x)`)
  for (const step of strip!.steps) for (const point of step) assert.ok(point.y >= islandHeightAt(point.x, point.z) + CONTACT - 1e-9, 'the contact policy on the emitted columns')
})

test('beyond every dome the nearest rim\'s plane carries the point to 0.6 of a radius, null past it; the back mirrors the front', () => {
  const domes = domesOf(rowBack)
  // above the apex of the first dome: outside every ellipse
  const first = domes[0]
  const sApex = (first.centre.x - (rowBack.x - rowBack.width / 2)) / rowBack.width
  const tOf = (y: number) => 1 - (y - (first.centre.y - first.ry)) / rowBack.height
  const near = liftToDomes(domes, rowBack, sApex, tOf(first.centre.y + first.ry * 1.3), true)
  assert.ok(near && near.lateral > 1 && Math.abs(near.position.z - first.centre.z) < 1e-9, 'on the rim plane')
  const far = liftToDomes(domes, rowBack, sApex, tOf(first.centre.y + first.ry * (1 + RIM_REACH + 0.05)), true)
  assert.equal(far, null)
  const front = liftToDomes(domes, rowBack, sApex, tOf(first.centre.y), true)!
  const back = liftToDomes(domes, rowBack, sApex, tOf(first.centre.y), false)!
  assert.ok(front.position.z > first.centre.z && Math.abs(front.position.z - first.centre.z - (first.centre.z - back.position.z)) < 1e-9, 'mirrored in z')
})

test('the shipped masses build: no emitted point below the contact height, every mass ≥ 24 strips and orchard-upper ≥ 60', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting: ImageData2D = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }
  const trees = buildLandTrees(flow, painting, baked)
  for (const mass of LAND_MASSES) {
    const count = trees.counts[mass.id]
    assert.ok(count.front + count.back >= 24, `${mass.id}: ${count.front} front, ${count.back} back strips`)
    if (mass.id === 'orchard-upper') assert.ok(count.front + count.back >= 60, `orchard-upper: ${count.front + count.back}`)
  }
  const p = trees.strokes.positions
  let lowest = Infinity
  for (let i = 0; i < p.length; i += 3) lowest = Math.min(lowest, p[i + 1] - islandHeightAt(p[i], p[i + 2]))
  assert.ok(lowest >= CONTACT - 1e-9, `the lowest emitted point ${lowest.toFixed(4)} above the ground`)
  assert.equal(trees.stroke.length, (p.length / 3) * 2)
  assert.ok(trees.solid.indices.length > 0 && trees.solid.indices.every((i) => i < trees.solid.positions.length / 3))
})

test('a strip point at the crop\'s top over every dome\'s centre lands on that dome\'s top, whatever the terrain under the row', () => {
  // capture 4: orchard-upper's left dome stood 0.74 heights above the mass's base and its top was bare
  for (const mass of LAND_MASSES) {
    const placed = placeMass(mass)
    const domes = domesOf(placed)
    domes.forEach((dome, i) => {
      const hit = liftToDomes(domes, placed, (i + 0.5) / domes.length, 0, true)
      assert.ok(hit, `${mass.id} dome ${i}: no lift at the top`)
      const top = dome.centre.y + dome.ry
      assert.ok(Math.abs(hit.position.y - top) < 1e-6, `${mass.id} dome ${i}: the top point at ${hit.position.y.toFixed(3)}, the dome's top at ${top.toFixed(3)}`)
    })
  }
})

test('pushDome winds every triangle outward, so a front-side material shows the near shell (Codex E2 F1)', () => {
  const arr = { positions: [] as number[], colors: [] as number[], indices: [] as number[] }
  const dome = { centre: new Vector3(0.3, 0.5, -0.2), rx: 0.2, ry: 0.15, rz: 0.075 }
  pushDome(arr, dome, new Color(0.1, 0.2, 0.3))
  let tested = 0
  for (let i = 0; i < arr.indices.length; i += 3) {
    const p = (k: number) => new Vector3().fromArray(arr.positions, arr.indices[i + k] * 3)
    const [a, b, c] = [p(0), p(1), p(2)]
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a))
    if (normal.length() < 1e-9) continue
    const outward = new Vector3().addVectors(a, b).add(c).divideScalar(3).sub(dome.centre)
    assert.ok(normal.dot(outward) > 0, `triangle ${i / 3} winds inward`)
    tested++
  }
  assert.ok(tested >= 60, `${tested} triangles tested`)
})

test('no emitted strip vertex lies inside its own mass\'s domes after the contact clamp (Codex E2 F2)', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting: ImageData2D = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }
  for (const mass of LAND_MASSES) {
    const trees = buildLandTrees(flow, painting, baked, 0x7ee5, [mass])
    const domes = domesOf(placeMass(mass))
    const p = trees.strokes.positions
    let buried = 0
    let worst = Infinity
    for (let i = 0; i < p.length; i += 3) {
      for (const d of domes) {
        const value = ((p[i] - d.centre.x) / d.rx) ** 2 + ((p[i + 1] - d.centre.y) / d.ry) ** 2 + ((p[i + 2] - d.centre.z) / d.rz) ** 2
        worst = Math.min(worst, value)
        if (value < 1 - 1e-9) buried++
      }
    }
    assert.equal(buried, 0, `${mass.id}: ${buried} vertices inside a dome (the deepest at ${worst.toFixed(4)} of the ellipsoid)`)
  }
})

test('D1: every tree vertex carries a bend weight, its height above the terrain under it over the mass\'s height, in [0, 1]: a contact point near 0, a crest 1', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]
  const painting: ImageData2D = { data: new Uint8ClampedArray([58, 92, 96, 255]), width: 1, height: 1 }
  const trees = buildLandTrees(flow, painting, baked)
  // the field itself, per vertex against its own mass's height (a binary field passed the extrema checks, Codex D1
  // review F8): each mass built alone, every weight the clamped height over the terrain over that mass's height
  let checked = 0
  let intermediate = 0
  for (const mass of LAND_MASSES) {
    const alone = buildLandTrees(flow, painting, baked, 0x7ee5, [mass])
    const height = placeMass(mass).height
    for (const [weights, positions] of [[alone.bend, alone.strokes.positions], [alone.solidBend, alone.solid.positions]] as const) {
      for (let i = 0; i < weights.length; i++) {
        const above = positions[i * 3 + 1] - islandHeightAt(positions[i * 3], positions[i * 3 + 2])
        const expected = Math.min(1, Math.max(0, above / height))
        assert.ok(Math.abs(weights[i] - expected) < 1e-9, `${mass.id}: weight ${weights[i]} at vertex ${i}, expected ${expected.toFixed(4)}`)
        checked++
        if (expected > 0.1 && expected < 0.9) intermediate++
      }
    }
  }
  assert.ok(checked > 50000 && intermediate > 10000, `${checked} weights checked, ${intermediate} intermediate`)
  assert.equal(trees.bend.length, trees.strokes.positions.length / 3, 'one weight per strip vertex')
  assert.equal(trees.solidBend.length, trees.solid.positions.length / 3, 'one weight per dome vertex')
  for (const [name, weights, positions] of [['strips', trees.bend, trees.strokes.positions], ['domes', trees.solidBend, trees.solid.positions]] as const) {
    let lowest = Infinity
    let highest = -Infinity
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i]
      assert.ok(Number.isFinite(w) && w >= 0 && w <= 1, `${name}: weight ${w} at vertex ${i}`)
      lowest = Math.min(lowest, w)
      highest = Math.max(highest, w)
      // the weight is the vertex's own height over the terrain under it, over its mass's height: check it against the position
      // a strip never goes under the terrain (the contact policy); a dome on a slope is buried on its uphill side, weight 0 there
      const y = positions[i * 3 + 1] - islandHeightAt(positions[i * 3], positions[i * 3 + 2])
      if (name === 'strips') assert.ok(y >= -1e-9, `${name}: a vertex under the terrain at ${i}`)
      if (y <= 0) assert.equal(w, 0, `${name}: a buried vertex weighs 0`)
    }
    assert.ok(lowest <= 0.05, `${name}: the lowest weight ${lowest.toFixed(3)} (a contact point)`)
    assert.ok(highest >= 0.95, `${name}: the highest weight ${highest.toFixed(3)} (a crest)`)
  }
})
