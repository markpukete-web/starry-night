/** The street's grass blade (S3 task 1): the template, the clump and the reach. */

import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, SRGBColorSpace } from 'three'

import { mulberry32 } from '../src/scene/brush.ts'
import { bladeMoonFacing, bladeReach, bladeTemplate, bladeVertex, clump, clumpSide, GRASS_BLADE, GRASS_LIGHT, GRASS_SOURCES, grassTexelUsable, grassTopUsable } from '../src/scene/grassBlade.ts'
import { inFootprint } from '../src/scene/streetGrass.ts'
import { STREET_MOON } from '../src/scene/streetLight.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

/**
 * A 1600 × 1267 painting in blues, greens, an olive, a near-white, a canvas beige and a brown, so every rule has texels
 * to refuse, and a pale grey: the lit edge of a bush stroke, which the blade refuses and the top colour keeps (S3b).
 */
function painting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  const swatches = [[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [150, 150, 70, 255], [240, 240, 235, 255], [170, 160, 140, 255], [120, 80, 50, 255], [160, 170, 165, 255]]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(swatches[(x * 7 + y * 13) % swatches.length], (y * width + x) * 4)
  return { data, width, height }
}

test('the template has a row per step, two triangles a segment, and narrows to its tip', () => {
  const t = bladeTemplate()
  const rows = GRASS_BLADE.segments + 1
  assert.equal(t.positions.length, rows * 2 * 3)
  assert.equal(t.indices.length / 3, 2 * GRASS_BLADE.segments)
  assert.equal(t.stroke.length, rows * 2 * 2)
  const half = (j: number) => Math.abs(t.positions[j * 6])
  const widest = Math.max(...Array.from({ length: rows }, (_, j) => half(j)))
  assert.ok(half(rows - 1) < 0.5 * widest, `tip ${half(rows - 1)} against widest ${widest}`)
  // the stroke runs 0.5 → 1 from root to tip, so the body shapes the tip only
  assert.equal(t.stroke[0], 0.5)
  assert.equal(t.stroke[(rows - 1) * 4], 1)
})

test('a clump is the same for the same seed', () => {
  const p = painting()
  assert.deepEqual(clump(mulberry32(7), p, 0.1, 0.2, 0.024), clump(mulberry32(7), p, 0.1, 0.2, 0.024))
  assert.notDeepEqual(clump(mulberry32(7), p, 0.1, 0.2, 0.024), clump(mulberry32(8), p, 0.1, 0.2, 0.024))
})

test('every colour is a texel of a source, never a near-white, the canvas or a brown', () => {
  const p = painting()
  const allowed = new Set<string>()
  const key = (c: readonly number[]) => c.map((v) => v.toFixed(6)).join(',')
  for (const [x0, y0, x1, y1] of Object.values(GRASS_SOURCES)) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * p.width + x) * 4
      if (!grassTexelUsable(p.data[i], p.data[i + 1], p.data[i + 2])) continue
      const c = new Color().setRGB(p.data[i] / 255, p.data[i + 1] / 255, p.data[i + 2] / 255, SRGBColorSpace)
      allowed.add(key([c.r, c.g, c.b]))
    }
  }
  // the three refusals, read independently of the rule
  assert.ok(!grassTexelUsable(240, 240, 235) && !grassTexelUsable(170, 160, 140) && !grassTexelUsable(120, 80, 50))
  assert.ok(grassTexelUsable(40, 60, 110) && grassTexelUsable(150, 150, 70))
  const rand = mulberry32(3)
  for (let k = 0; k < 200; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) assert.ok(allowed.has(key(b.colour)), `colour ${b.colour}`)
  }
})

test('a clump fans out: the outer blades lean further and are paler than the inner', () => {
  const p = painting()
  const rand = mulberry32(11)
  let inner = 0, outer = 0, innerL = 0, outerL = 0
  const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  for (let k = 0; k < 300; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) {
      if (Math.abs(b.lean) < 0.25 * GRASS_BLADE.fan) { inner++; innerL += lum(b.colour) }
      else if (Math.abs(b.lean) > 0.75 * GRASS_BLADE.fan) { outer++; outerL += lum(b.colour) }
    }
  }
  assert.ok(inner > 0 && outer > 0)
  assert.ok(outerL / outer > 1.3 * (innerL / inner), `outer ${outerL / outer} inner ${innerL / inner}`)
})

test('no blade bends into the ground: its spine stays up and its tip well above the root', () => {
  const p = painting()
  const rand = mulberry32(5)
  for (let k = 0; k < 300; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) {
      for (let j = 0; j <= 16; j++) assert.ok(bladeVertex(b, j / 16, 0, [1, 0])[1] >= 0, `spine below the ground at ${j / 16}`)
      const tip = bladeVertex(b, 1, 0, [1, 0])[1]
      assert.ok(tip >= 0.15 * b.height, `tip ${tip} for a blade ${b.height} long`)
    }
  }
})

test('the reach holds every vertex, with the push and the wind, and grows with the distance', () => {
  const p = painting()
  const rand = mulberry32(9)
  const t = bladeTemplate()
  for (let k = 0; k < 100; k++) {
    for (const b of clump(rand, p, 0.3, -0.2, 0.024)) {
      for (const d of [0.1, 0.3, 1.2]) {
        const widen = Math.max(1, d / GRASS_BLADE.widenFrom)
        let far = 0
        for (let v = 0; v < t.positions.length / 3; v++) {
          const [x, , z] = bladeVertex(b, t.positions[v * 3 + 1], t.positions[v * 3], [0.6, 0.8], widen)
          far = Math.max(far, Math.hypot(x - b.x, z - b.z))
        }
        assert.ok(bladeReach(b, d) >= far + GRASS_BLADE.push + GRASS_BLADE.wind - 1e-12, `reach ${bladeReach(b, d)} far ${far}`)
      }
      assert.ok(bladeReach(b, 3) > bladeReach(b, 0.3))
    }
  }
})

const sub = (p: readonly number[], q: readonly number[]) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
const dot = (p: readonly number[], q: readonly number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2]
const unit = (p: readonly number[]) => {
  const l = Math.hypot(p[0], p[1], p[2])
  return [p[0] / l, p[1] / l, p[2] / l]
}

test('the moon lights the outer arch: the centreline\'s normal away from its centre, by finite differences', () => {
  const moon = [STREET_MOON.x, STREET_MOON.y, STREET_MOON.z] as const
  const rights: [number, number][] = [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2]]
  const base = { x: 0.3, z: -0.2, height: 0.036, halfWidth: 0.003, colour: [0, 0, 0] as [number, number, number], topColour: [0, 0, 0] as [number, number, number], seed: 0 }
  const h = 1e-4
  let lit = 0
  let dark = 0
  for (const curl of [1.5, -1.5, 0.8, -0.8]) for (const lean of [0.3, -0.3]) for (const yaw of [0, 0.4, -0.4]) for (const right of rights) {
    for (const a of [0.25, 0.5, 1]) {
      const spec = { ...base, curl, lean, yaw }
      const [p0, p1, p2] = [a - h, a, a + h].map((t) => bladeVertex(spec, t, 0, right))
      const tangent = unit(sub(p2, p0))
      const bend = sub(sub(p0, p1), sub(p1, p2))
      const inward = unit(sub(bend, tangent.map((v) => v * dot(bend, tangent))))
      const expected = Math.max(0, -dot(inward, moon))
      const got = bladeMoonFacing(spec, a, right, moon)
      assert.ok(Math.abs(got - expected) < 1e-6, `curl ${curl} lean ${lean} yaw ${yaw} right ${right} a ${a}: ${got} against ${expected}`)
      if (expected > 0.1) lit++
      if (expected === 0) dark++
    }
  }
  assert.ok(lit > 0 && dark > 0, `lit ${lit} dark ${dark}: the cases must reach both sides`)
  // a straight blade has no arch: its upper side takes the light
  for (const lean of [0.3, -0.3]) {
    const spec = { ...base, curl: 0, lean, yaw: 0.2 }
    const right: [number, number] = [0.6, 0.8]
    const tangent = unit(sub(bladeVertex(spec, 0.5 + h, 0, right), bladeVertex(spec, 0.5 - h, 0, right)))
    const upper = unit(sub([0, 1, 0], tangent.map((v) => v * tangent[1])))
    assert.ok(Math.abs(bladeMoonFacing(spec, 0.5, right, moon) - Math.max(0, dot(upper, moon))) < 1e-6, `straight, lean ${lean}`)
  }
})

test('every blade curls by at least 0.5 rad, so the straight rule never picks the lit side in the street', () => {
  const p = painting()
  const rand = mulberry32(13)
  for (let k = 0; k < 300; k++) for (const b of clump(rand, p, 0, 0, 0.024)) assert.ok(Math.abs(b.curl) >= 0.5, `curl ${b.curl}`)
})

test('a top colour is a lit bush texel: kept by its own rule, and among the lightest of its pool', () => {
  const p = painting()
  // the rule, read independently: the pale grey is the lit edge, the near-white and the brown are not
  assert.ok(grassTopUsable(160, 170, 165) && !grassTexelUsable(160, 170, 165))
  assert.ok(!grassTopUsable(240, 240, 235) && !grassTopUsable(120, 80, 50) && !grassTopUsable(170, 160, 140))
  const key = (c: readonly number[]) => c.map((v) => v.toFixed(6)).join(',')
  const lumaOf = new Map<string, number>()
  const lumas: number[] = []
  const [x0, y0, x1, y1] = GRASS_SOURCES.bushes
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * p.width + x) * 4
    const [r, g, b] = [p.data[i], p.data[i + 1], p.data[i + 2]]
    if (!grassTopUsable(r, g, b)) continue
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    lumas.push(luma)
    const c = new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
    lumaOf.set(key([c.r, c.g, c.b]), luma)
  }
  lumas.sort((m, n) => n - m)
  const cut = lumas[Math.max(0, Math.ceil(GRASS_LIGHT.topShare * lumas.length) - 1)]
  const rand = mulberry32(17)
  for (let k = 0; k < 200; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) {
      const luma = lumaOf.get(key(b.topColour))
      assert.ok(luma !== undefined, `top ${b.topColour} is not a kept bush texel`)
      assert.ok(luma >= cut, `top luma ${luma} under the pool's cut ${cut}`)
    }
  }
})

test("a clump is the same twice, and a painting with no lit bush texel throws", () => {
  const p = painting()
  const a = clump(mulberry32(21), p, 0.1, 0.2, 0.024)
  const b = clump(mulberry32(21), p, 0.1, 0.2, 0.024)
  assert.deepEqual(a, b)
  const bare = painting()
  const [x0, y0, x1, y1] = GRASS_SOURCES.bushes
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) bare.data.set([240, 240, 235, 255], (y * bare.width + x) * 4)
  assert.throws(() => clump(mulberry32(1), bare, 0, 0, 0.024), /no lit texel/)
})

test('a clump curls with its side: at least 75% of its blades, where the fountain gave half (S3b task 2)', () => {
  const p = painting()
  const rand = mulberry32(23)
  for (const side of [1, -1] as const) {
    let clumps = 0
    let blades = 0
    let along = 0
    for (let i = 0; clumps < 200 && i < 100000; i++) {
      const x = -2 + rand() * 4
      const z = -2 + rand() * 4
      if (clumpSide(x, z) !== side) continue
      clumps++
      for (const b of clump(rand, p, x, z, 0.024)) {
        blades++
        if (Math.sign(b.curl) === side) along++
      }
    }
    assert.equal(clumps, 200)
    assert.ok(along / blades >= 0.75, `side ${side}: ${along} of ${blades} blades curl with it`)
  }
})

test('neighbours agree: two clumps 0.03 apart on the verge take the same side at least 80% of the time', () => {
  const rand = mulberry32(29)
  let pairs = 0
  let same = 0
  let sides = 0
  for (let i = 0; pairs < 2000 && i < 200000; i++) {
    const x = -3 + rand() * 6
    const z = -3 + rand() * 6
    if (!inFootprint(x, z)) continue
    const a = rand() * 2 * Math.PI
    pairs++
    if (clumpSide(x, z) === clumpSide(x + 0.03 * Math.cos(a), z + 0.03 * Math.sin(a))) same++
    if (clumpSide(x, z) === 1) sides++
  }
  assert.equal(pairs, 2000)
  assert.ok(same / pairs >= 0.8, `${same} of ${pairs} pairs agree`)
  assert.ok(sides > 0.2 * pairs && sides < 0.8 * pairs, `${sides} of ${pairs} take side 1: both sides must occur`)
})
