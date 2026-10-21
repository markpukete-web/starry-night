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

test('landClass: the five classes on exemplars read from the crops and the authored boxes', () => {
  assert.equal(landClass(22, 30, 36), 'ground', 'the dark navy-green field')
  assert.equal(landClass(58, 92, 96), 'teal', 'a teal curl of the foliage')
  assert.equal(landClass(52, 73, 89), 'teal', 'the back row\'s mean')
  assert.equal(landClass(110, 150, 70), 'yellowGreen', 'a bright bush curl')
  assert.equal(landClass(44, 56, 40), 'yellowGreen', 'the bushes\' olive at a quarter resolution')
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

test('the shipped land assets: every authored mass validated, the flow\'s mask is the island\'s support, the hills\' lean, the size', { skip: !existsSync(new URL('../public/reference/land-masses.json', import.meta.url)) && 'not yet baked' }, async () => {
  const { LAND_MASSES } = await import('../src/scene/landMasses.ts')
  const { worldAt, flowToPainting } = await import('../src/scene/landMapping.ts')
  const { coastR } = await import('../src/scene/islandShape.ts')
  const baked = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as { id: string; class: string; share: number; width: number; height: number; runs: { y: number; x0: number; x1: number }[] }[]
  for (const mass of LAND_MASSES) {
    const entry = baked.find((m) => m.id === mass.id)
    assert.ok(entry, `${mass.id} baked`)
    assert.ok(entry.share >= 0.35, `${mass.id}: ${(100 * entry.share).toFixed(0)}% of its box is foliage`)
    assert.equal(entry.class, mass.class, `${mass.id}'s dominant hue`)
    assert.ok(entry.runs.length > 0 && entry.width > 0 && entry.height > 0)
  }
  const flowBytes = readFileSync(new URL('../public/reference/land-flow.png', import.meta.url))
  assert.ok(flowBytes.length < 500_000, `land-flow.png is ${flowBytes.length} bytes`)
  const flow = decodePNG(flowBytes)
  assert.equal(flow.width, 960)
  const b = (px: number, py: number) => flow.rgba[(Math.round(py * (flow.height - 1)) * flow.width + Math.round(px * (flow.width - 1))) * 4 + 2]
  // the cypress column, and ten points whose world lies outside the coast: no support
  assert.equal(b(0.1, 0.5), 0, 'the cypress column')
  let outside = 0
  let inside = 0
  for (let k = 0; k < 400; k++) {
    const px = (k % 20) / 19
    const py = Math.floor(k / 20) / 19
    const [u, v] = flowToPainting(px, py)
    if (u < 0.26 && v < 0.95) continue
    const [x, z] = worldAt(u, v)
    const supported = Math.hypot(x, z) <= coastR(Math.atan2(z, x)) * 0.97
    if (supported) { inside++; assert.ok(b(px, py) >= 8, `support at (${px.toFixed(2)}, ${py.toFixed(2)})`) } else { outside++; assert.equal(b(px, py), 0, `no support at (${px.toFixed(2)}, ${py.toFixed(2)})`) }
  }
  assert.ok(inside >= 10 && outside >= 10, `${inside} inside, ${outside} outside`)
  // the hills' rows (v < 0.78, u > 0.3) lean 40–60° from vertical
  const bins = new Float64Array(9)
  for (let y = 0; y < flow.height; y++) {
    for (let x = 0; x < flow.width; x++) {
      const i = (y * flow.width + x) * 4
      const [u, v] = flowToPainting(x / (flow.width - 1), y / (flow.height - 1))
      if (v >= 0.78 || u < 0.3 || flow.rgba[i + 2] === 0) continue
      const dx = (flow.rgba[i] / 255) * 2 - 1
      const dy = (flow.rgba[i + 1] / 255) * 2 - 1
      const deg = (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI
      bins[Math.min(8, Math.floor(deg / 10))] += flow.rgba[i + 2] / 255
    }
  }
  const peak = bins.indexOf(Math.max(...bins))
  assert.ok(peak >= 4 && peak <= 5, `the hills' hatching peaks at ${peak * 10}–${peak * 10 + 10}°`)
})
