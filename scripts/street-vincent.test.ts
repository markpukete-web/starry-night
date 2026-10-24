// Vincent (S2 task 3): the build fits the rig, stays cheap, carries the gate's classes and the painting's paint.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, Vector3 } from 'three'
import palette from '../public/reference/palette.json' with { type: 'json' }
import { mulberry32 } from '../src/scene/brush.ts'
import { VINCENT_RIG } from '../src/scene/streetLayout.ts'
import { rectUnderpaint, sourceUnderpaint, STREET_SOURCES, type StreetSourceName } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { buildVincent, vincentMoon, vincentStrokeBody, VINCENT_CLASS, VINCENT_SOURCES, type VincentPart } from '../src/scene/vincent.ts'
import { decodePNG } from './lib/png.ts'

/** A 1600 × 1267 painting of seeded noise: the geometry does not depend on the colours. */
function noisePainting(): ImageData2D {
  const [width, height] = [1600, 1267]
  const rand = mulberry32(7)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 40 + rand() * 120
    data[i + 1] = 40 + rand() * 120
    data[i + 2] = 40 + rand() * 120
    data[i + 3] = 255
  }
  return { data, width, height }
}

const painting = noisePainting()
const build = buildVincent(painting)

function points(part: VincentPart): Vector3[] {
  const out: Vector3[] = []
  for (const positions of [part.strokes.arrays.positions, part.underpaint.positions]) {
    for (let i = 0; i < positions.length; i += 3) out.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]))
  }
  return out
}

test('Vincent fits the rig', () => {
  const pivot = new Vector3(...build.armLeft.pivot)
  const all = [...points(build.body)]
  for (const swing of [-0.25, 0, 0.25]) {
    for (const p of points(build.armLeft)) all.push(p.clone().applyAxisAngle(new Vector3(1, 0, 0), swing).add(pivot))
  }
  let top = -Infinity
  for (const p of all) {
    assert.ok(Math.abs(p.x) <= VINCENT_RIG.halfWidth, `x ${p.x.toFixed(4)} past the half-width ${VINCENT_RIG.halfWidth}`)
    assert.ok(Math.abs(p.z) <= VINCENT_RIG.halfDepth, `z ${p.z.toFixed(4)} past the half-depth ${VINCENT_RIG.halfDepth}`)
    assert.ok(p.y >= 0 && p.y <= VINCENT_RIG.height + 0.002, `y ${p.y.toFixed(4)} outside 0 to ${VINCENT_RIG.height} + 0.002`)
    top = Math.max(top, p.y)
  }
  assert.ok(Math.abs(top - VINCENT_RIG.height) <= 0.002, `his top is ${top.toFixed(4)}, not his height ${VINCENT_RIG.height}`)
})

test('Vincent is cheap', () => {
  const count = (part: VincentPart) => (part.strokes.arrays.indices.length + part.underpaint.indices.length) / 3
  assert.equal(build.triangles, count(build.body) + count(build.armLeft) + build.shadow.indices.length / 3)
  assert.ok(build.triangles <= 4000, `${build.triangles} triangles`)
})

test('the smock and the hat carry their classes', () => {
  const allowed = new Set<number>([VINCENT_CLASS.smock, VINCENT_CLASS.hat, VINCENT_CLASS.none])
  for (const part of [build.body, build.armLeft]) {
    const vertices = part.strokes.arrays.positions.length / 3
    assert.equal(part.strokes.cls.length, vertices)
    assert.equal(part.strokes.stroke.length, vertices * 2)
    assert.equal(part.strokes.seed.length, vertices)
    assert.equal(part.underpaint.cls.length, part.underpaint.positions.length / 3)
    assert.deepEqual(part.underpaint.src, part.underpaint.cls, 'the source pass carries his classes too')
    for (const c of [...part.strokes.cls, ...part.underpaint.cls]) assert.ok(allowed.has(c), `class ${c}`)
  }
  assert.ok(build.body.strokes.cls.includes(VINCENT_CLASS.smock))
  assert.ok(build.body.strokes.cls.includes(VINCENT_CLASS.hat))
  assert.ok(build.armLeft.strokes.cls.every((c) => c === VINCENT_CLASS.smock), 'his sleeve is the smock')
})

test('each part carries its class, where it sits on him', () => {
  // by place, so one part losing its class fails even while another part still carries it (a revert proof found both
  // hat parts redundant under a "class present" check)
  const { positions } = build.body.strokes.arrays
  const groups = { hatSide: [] as number[], crownTop: [] as number[], smockLow: [] as number[], smockHigh: [] as number[] }
  for (let i = 0; i < positions.length / 3; i++) {
    const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]
    const c = build.body.strokes.cls[i]
    if (y >= 0.0725 && Math.hypot(x, z) >= 0.0071) groups.hatSide.push(c) // the crown's side and the brim, outside the head
    if (y > 0.0785) groups.crownTop.push(c) // above the head's top
    if (y < 0.04) groups.smockLow.push(c) // below the canvas: the smock's lower tier and his hands
    if (y >= 0.054 && y <= 0.062) groups.smockHigh.push(c) // above the canvas, below the head: the upper tier, the arms
  }
  for (const [name, cls] of Object.entries(groups)) {
    assert.ok(cls.length > 0, `${name}: no vertex`)
    const want = name.startsWith('smock') ? VINCENT_CLASS.smock : VINCENT_CLASS.hat
    assert.ok(cls.every((c) => c === want), `${name}: a vertex of class ${cls.find((c) => c !== want)}, not ${want}`)
  }
})

test('the build is deterministic', () => {
  assert.deepEqual(buildVincent(painting), build)
})

test('rectUnderpaint is sourceUnderpaint', () => {
  for (const name of Object.keys(STREET_SOURCES) as StreetSourceName[]) {
    for (const share of [0.1, 0.4, 1]) assert.deepEqual(rectUnderpaint(painting, STREET_SOURCES[name], share), sourceUnderpaint(painting, name, share))
  }
})

test('the moon is in the lit body only, after the stroke body', () => {
  assert.deepEqual(vincentMoon(false), { vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' })
  const lit = vincentStrokeBody(true)
  const moon = vincentMoon(true).fragmentBody
  assert.ok(lit.fragmentBody.endsWith(moon), 'the light runs last in the body, so before the fog in material()')
  assert.match(moon, /gl_FrontFacing/)
  assert.doesNotMatch(vincentStrokeBody(false).fragmentBody, /vMoonNormal/)
})

type Lab = [number, number, number]
function srgbToLab(r: number, g: number, b: number): Lab {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
function swatchMean(region: string, pick?: number[]): Lab {
  const colours = (palette.regions as Record<string, { colours: { lab: number[]; weight: number }[] }>)[region].colours
  const chosen = pick ? pick.map((i) => colours[i]) : colours
  const w = chosen.reduce((s, c) => s + c.weight, 0)
  return [0, 1, 2].map((k) => chosen.reduce((s, c) => s + c.lab[k] * c.weight, 0) / w) as Lab
}

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
test('his paint is the painting\'s', { skip: !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI); Task 5\'s browser gate measures the render' }, () => {
  const png = decodePNG(readFileSync(workPainting))
  const real = buildVincent({ data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height })
  const meanOf = (cls: number): Lab => {
    const labs: Lab[] = []
    const { colors } = real.body.strokes.arrays
    real.body.strokes.cls.forEach((c, i) => {
      if (c !== cls) return
      const s = new Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]).convertLinearToSRGB()
      labs.push(srgbToLab(s.r, s.g, s.b))
    })
    return [0, 1, 2].map((k) => labs.reduce((s, l) => s + l[k], 0) / labs.length) as Lab
  }
  const dE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  // the smock against the village's ultramarine swatch (#2a3f6f, index 1), a target read from palette.json and never
  // from VINCENT_SOURCES (Codex T1); its source patch is a second check, that the strokes keep their patch's colour
  const [x0, y0, x1, y1] = VINCENT_SOURCES.smock
  const source: Lab[] = []
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (Math.floor(y * png.height / 1267) * png.width + Math.floor(x * png.width / 1600)) * 4
    source.push(srgbToLab(png.rgba[i] / 255, png.rgba[i + 1] / 255, png.rgba[i + 2] / 255))
  }
  const sourceMean = [0, 1, 2].map((k) => source.reduce((s, l) => s + l[k], 0) / source.length) as Lab
  const smock = dE(meanOf(VINCENT_CLASS.smock), swatchMean('village', [1]))
  const fidelity = dE(meanOf(VINCENT_CLASS.smock), sourceMean)
  const hat = dE(meanOf(VINCENT_CLASS.hat), swatchMean('villageWarm'))
  assert.ok(smock < 10, `smock ΔE76 ${smock.toFixed(2)} from the village's ultramarine`)
  assert.ok(fidelity < 3, `smock ΔE76 ${fidelity.toFixed(2)} from its source patch`)
  assert.ok(hat < 10, `hat ΔE76 ${hat.toFixed(2)}`)
  console.log(`[margin] smock ${smock.toFixed(2)} from the ultramarine, ${fidelity.toFixed(2)} from its source; hat ${hat.toFixed(2)}`)
})
