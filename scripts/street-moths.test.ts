/**
 * The moths (church-owl plan, Task 2): three to a lamp and two to a lit window, one instanced mesh, the loop on the CPU.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Vector3 } from 'three'

import type { BakedMass } from '../src/scene/landDomes.ts'
import { MOTHS, mothBright, mothPositions, mothSpecs } from '../src/scene/moths.ts'
import { buildStreet } from '../src/scene/streetGeometry.ts'
import { litWindows } from '../src/scene/streetLife.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const root = new URL('../', import.meta.url)
const workPainting = new URL('reference/derived/_work-painting.png', root)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'

// seven lanterns at y 0.138 along a line, four windows with unit normals
const lamps = Array.from({ length: 7 }, (_, i) => ({ lantern: new Vector3(-1 + 0.3 * i, 0.138, 0.2) }))
const windows = [
  { centre: new Vector3(0.5, 0.12, -0.4), normal: new Vector3(0, 0, 1), width: 0.02 },
  { centre: new Vector3(0.8, 0.12, -0.4), normal: new Vector3(1, 0, 0), width: 0.02 },
  { centre: new Vector3(-0.5, 0.11, 0.9), normal: new Vector3(-0.6, 0, 0.8), width: 0.02 },
  { centre: new Vector3(-0.9, 0.13, 0.5), normal: new Vector3(0, 0, -1), width: 0.02 },
]

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

test('three moths a lamp and two a lit window: 29 for seven lamps and four windows', () => {
  const specs = mothSpecs(lamps, windows)
  assert.equal(specs.length, 29)
  assert.equal(specs.filter((s) => s.window).length, 8)
})

test("each moth rests on its glass's frame and loops within its radius", () => {
  for (const s of mothSpecs(lamps, windows)) {
    assert.ok(s.radius >= 0.02 && s.radius <= 0.05)
    assert.ok(s.period >= 1.2 && s.period <= 2.5)
    assert.ok(s.flap >= 0.12 && s.flap <= 0.2)
    const rest = distance(s.anchor, s.glass)
    assert.ok(Math.abs(rest - (s.window ? MOTHS.restWindow : MOTHS.rest)) < 1e-9)
    assert.ok(Math.abs(s.anchor[1] - s.glass[1]) < 1e-9, 'the rest point is level with the glass')
    assert.ok(s.phase >= 0 && s.phase < 2 * Math.PI)
    if (!s.window) assert.ok(Math.hypot(s.anchor[0] - s.glass[0], s.anchor[2] - s.glass[2]) > 0.006 * Math.SQRT2 + 0.0015, 'clear of the lantern box at any yaw')
  }
  const specs = mothSpecs(lamps, windows)
  const out = new Float32Array(specs.length * 3)
  mothPositions(specs, 0, out)
  specs.forEach((s, i) => assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.anchor) < 1e-6, 'at rest at time 0'))
  for (let t = 0.05; t <= 5; t += 0.05) {
    mothPositions(specs, t, out)
    specs.forEach((s, i) => assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.glass) <= s.radius + (s.window ? MOTHS.restWindow : MOTHS.rest) + MOTHS.wobble + 1.5 * Math.sqrt(3) * MOTHS.jitter + 1e-6))
  }
  specs.forEach((s, i) => {
    const t0 = (1 - s.phase / (2 * Math.PI)) * s.period // θ = 2π: a lap's crossing of the rest point
    mothPositions(specs, t0, out)
    assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.anchor) < 1e-6, 'at its rest point once a lap (Codex F1)')
  })
})

test('a moth never comes nearer its glass than its rest point, and its path doubles back (look pass 5)', () => {
  const specs = mothSpecs(lamps, windows)
  const at = (t: number) => {
    const out = new Float32Array(specs.length * 3)
    mothPositions(specs, t, out)
    return out
  }
  for (let t = 1 / 60; t <= 5; t += 1 / 60) {
    const out = at(t)
    specs.forEach((s, i) => assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.glass) >= (s.window ? MOTHS.restWindow : MOTHS.rest) - 1e-9, 'never nearer the glass than the rest point'))
  }
  // over 0.1 s a smooth loop turns at most 30° (the shortest lap is 1.2 s); the lurch and the jitter turn it back past
  // 90°, 21 to 36 times in 5 s on these specs
  const turns = specs.map(() => 0)
  for (let k = 1; k + 2 <= 50; k++) {
    const [a, b, c] = [at(k / 10), at((k + 1) / 10), at((k + 2) / 10)]
    specs.forEach((_, i) => {
      let dot = 0
      for (let x = 0; x < 3; x++) dot += (b[3 * i + x] - a[3 * i + x]) * (c[3 * i + x] - b[3 * i + x])
      if (dot < 0) turns[i]++
    })
  }
  turns.forEach((n, i) => assert.ok(n >= 10, `moth ${i}: ${n} turns back in 5 s`))
})

test("a moth at the glass is bright and one at the halo's edge is faint", () => {
  assert.equal(mothBright(0), 1)
  assert.equal(mothBright(MOTHS.dimRadius), MOTHS.dimFloor)
  assert.ok(mothBright(0.02) > mothBright(0.05))
})

test('the built street has seven lamps and four lit windows, so 29 moths', { skip }, () => {
  // flow and masses loaded as street-lived.test.ts does. No `paint`: it is a WallPaint, not a flag (Codex F4)
  const flowPng = decodePNG(readFileSync(new URL('public/reference/land-flow.png', root)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const masses = JSON.parse(readFileSync(new URL('public/reference/land-masses.json', root), 'utf8')) as BakedMass[]
  const paintingPng = decodePNG(readFileSync(workPainting))
  const painting: ImageData2D = { data: new Uint8ClampedArray(paintingPng.rgba), width: paintingPng.width, height: paintingPng.height }
  const build = buildStreet(painting, flow, masses, { grass: true, lit: true, lane: true, lived: true, flowers: true })!
  assert.equal(build.report.lane.lamps.length, 7)
  assert.equal(litWindows(build.windows).length, 4)
  assert.equal(mothSpecs(build.report.lane.lamps, litWindows(build.windows)).length, 29)
})
