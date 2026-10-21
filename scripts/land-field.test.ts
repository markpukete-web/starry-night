/**
 * The land's derivation (E2): the colour classes of the painting's land band, the field's horizontal fallback,
 * and the shipped assets' facts.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { blendToVertical, HORIZONTAL, signedUpDirection, VERTICAL } from './lib/cypress-field.ts'
import { landClass } from './lib/land-field.ts'
import { decodePNG } from './lib/png.ts'

function angleOf(cos2: number, sin2: number): number {
  let angle = (0.5 * Math.atan2(sin2, cos2) * 180) / Math.PI
  while (angle < 0) angle += 180
  return angle % 180
}

test('landClass: the five classes on exemplars read from the 1:1 crops', () => {
  assert.equal(landClass(22, 30, 36), 'ground', 'the dark navy-green field')
  assert.equal(landClass(58, 92, 96), 'teal', 'a teal curl of the foliage')
  assert.equal(landClass(110, 150, 70), 'yellowGreen', 'a yellow-green bush curl')
  assert.equal(landClass(70, 90, 180), 'hill', 'the hills\' blue')
  assert.equal(landClass(200, 200, 190), 'other', 'a pale house wall')
  assert.equal(landClass(150, 60, 40), 'other', 'a sienna roof')
})

test('blendToVertical takes the fallback: horizontal for the land, vertical for the cypress, and keeps an oriented texel either way', () => {
  const doubleAngle = (2 * 30 * Math.PI) / 180
  const cos2 = new Float64Array([Math.cos(doubleAngle), Math.cos(doubleAngle)])
  const sin2 = new Float64Array([Math.sin(doubleAngle), Math.sin(doubleAngle)])
  const anisotropy = new Float64Array([1, 0])
  const land = blendToVertical(cos2, sin2, anisotropy, HORIZONTAL)
  assert.ok(Math.abs(angleOf(land.cos2[0], land.sin2[0]) - 30) < 1, 'anisotropy 1 keeps 30°')
  const flat = signedUpDirection(land.cos2[1], land.sin2[1])
  assert.ok(Math.abs(Math.abs(flat.dx) - 1) < 1e-9 && Math.abs(flat.dy) < 1e-9, 'anisotropy 0 lies along the ground')
  const tree = blendToVertical(cos2, sin2, anisotropy, VERTICAL)
  const up = signedUpDirection(tree.cos2[1], tree.sin2[1])
  assert.ok(Math.abs(up.dx) < 1e-9 && Math.abs(up.dy + 1) < 1e-9, 'the cypress\'s fallback points up')
  const byDefault = blendToVertical(cos2, sin2, anisotropy)
  assert.deepEqual([...byDefault.cos2], [...tree.cos2], 'the default is the cypress\'s')
})

test('the shipped land assets: the masses the guard requires, and the flow\'s mask and lean', { skip: !existsSync(new URL('../public/reference/land-masses.json', import.meta.url)) && 'not yet baked' }, () => {
  const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as { class: string; u0: number; v0: number; u1: number; v1: number; pixels: number }[]
  const teal = masses.filter((m) => m.class === 'teal')
  const inside = (u: number, v: number) => teal.some((m) => u >= m.u0 && u <= m.u1 && v >= m.v0 && v <= m.v1)
  // the F2 rows' stations (villageGeometry.ts), each inside a teal mass
  assert.ok(inside(0.49, 0.86), 'the front row')
  assert.ok(inside(0.69, 0.78), 'the back row')
  assert.ok(inside(0.77, 0.9), 'the right row')
  assert.ok(inside(0.45, 0.87), 'the left row')
  assert.ok(teal.filter((m) => m.u0 > 0.74 && m.v0 < 0.82).length >= 2, 'the orchard')
  assert.ok(masses.some((m) => m.class === 'yellowGreen' && m.u1 < 0.2), 'the bushes at the cypress\'s foot')
  const flow = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  assert.equal(flow.width, 1280)
  let cypressB = 0
  let bandZero = 0
  const bins = new Float64Array(9)
  for (let y = 0; y < flow.height; y++) {
    for (let x = 0; x < flow.width; x++) {
      const i = (y * flow.width + x) * 4
      const u = x / flow.width
      const v = 0.58 + (y / flow.height) * 0.42
      if (u < 0.26 && v < 0.95) cypressB += flow.rgba[i + 2]
      else if (flow.rgba[i + 2] === 0) bandZero++
      if (v < 0.78 && u > 0.3) {
        const dx = (flow.rgba[i] / 255) * 2 - 1
        const dy = (flow.rgba[i + 1] / 255) * 2 - 1
        const deg = (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI
        bins[Math.min(8, Math.floor(deg / 10))] += flow.rgba[i + 2] / 255
      }
    }
  }
  assert.equal(cypressB, 0, 'B is 0 in the cypress column')
  assert.equal(bandZero, 0, 'B is never 0 in the band')
  const peak = bins.indexOf(Math.max(...bins))
  assert.ok(peak >= 4 && peak <= 5, `the hills' hatching peaks at ${peak * 10}–${peak * 10 + 10}°`)
})
