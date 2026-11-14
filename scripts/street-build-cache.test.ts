/**
 * Audit item 14 (2026-11-14): `faceCrop` and `rectUnderpaint` repeat within one street build, so `withBuildCache` keeps
 * their results for that build. These tests pin that the cache keys on everything each helper reads, that it ends with
 * its build, and that each helper's body runs once per distinct input. The street's output is unchanged by the cache:
 * the identity probe of the slice (B2) proves that on the real painting.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Session } from 'node:inspector/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { Color, SRGBColorSpace, Vector3 } from 'three'

import { buildStreet } from '../src/scene/streetGeometry.ts'
import { faceCrop, sourceUnderpaint, withBuildCache, type StreetFace } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }

/** a one-texel painting: every source rectangle reads this one colour, and the build's keys do not depend on pixels */
const stub = (r: number, g: number, b: number): ImageData2D => ({ data: new Uint8ClampedArray([r, g, b, 255]), width: 1, height: 1 })

function face(shape: StreetFace['shape']): StreetFace {
  return { origin: new Vector3(), u: new Vector3(0.3, 0, 0), v: new Vector3(0, 0.2, 0), normal: new Vector3(0, 0, 1), shape, kind: 'wall', source: 'wallB', refHeight: 0.2, seed: 1, mirror: false }
}

test('two faces that differ only in shape get different crops within one build', () => {
  const painting = stub(120, 90, 60)
  const [quad, triangle] = withBuildCache(painting, flow, () => [faceCrop(flow, face('quad'), 64, painting), faceCrop(flow, face('triangle'), 64, painting)])
  // outside a build nothing is cached, so these are the helper's own answers
  assert.deepEqual(quad.crop, faceCrop(flow, face('quad'), 64, painting).crop)
  assert.deepEqual(triangle.crop, faceCrop(flow, face('triangle'), 64, painting).crop)
  assert.notDeepEqual(quad.crop.data, triangle.crop.data, 'a triangle clears B outside its shape')
})

test("a second build from a different painting gives that painting's result, not the first's", () => {
  const a = stub(200, 40, 40)
  const b = stub(40, 40, 200)
  const f = face('quad')
  withBuildCache(a, flow, () => [sourceUnderpaint(a, 'wallA', 1), faceCrop(flow, f, 64, a)])
  const [under, crop] = withBuildCache(b, flow, () => [sourceUnderpaint(b, 'wallA', 1), faceCrop(flow, f, 64, b)] as const)
  assert.deepEqual(under, [40 / 255, 40 / 255, 200 / 255])
  assert.deepEqual(crop.pigment, faceCrop(flow, f, 64, b).pigment)
  // inside one build, a call with another painting or another flow is not served the build's entries
  const other = { ...flow, data: flow.data.map((v, i) => (i % 4 === 0 ? 255 - v : v)) }
  const otherCrop = faceCrop(other, f, 64, a).crop
  withBuildCache(a, flow, () => {
    sourceUnderpaint(a, 'wallA', 1)
    faceCrop(flow, f, 64, a)
    assert.deepEqual(sourceUnderpaint(b, 'wallA', 1), [40 / 255, 40 / 255, 200 / 255])
    assert.deepEqual(faceCrop(flow, f, 64, b).pigment, crop.pigment)
    assert.deepEqual(faceCrop(other, f, 64, a).crop, otherCrop)
  })
})

test("a whole street built after another painting's takes its own underpaint", () => {
  // not red-dominant: the flowers' heads need a usable bush texel (`grassTopUsable`)
  const a = stub(40, 160, 40)
  const b = stub(40, 40, 200)
  assert.ok(buildStreet(a, flow, []))
  const build = buildStreet(b, flow, [])
  assert.ok(build)
  // a roof's base is its source's mean, unlerped (`clad`), so on a one-texel painting it is that texel, in linear RGB
  const { r, g, b: blue } = new Color().setRGB(40 / 255, 40 / 255, 200 / 255, SRGBColorSpace)
  const roofs = build.report.faces.filter((f) => f.source === 'roofBlue' || f.source === 'roofSienna' || f.source === 'roofStriped')
  assert.ok(roofs.length > 0, 'the street has roofs')
  for (const roof of roofs) assert.deepEqual(roof.base, [r, g, blue], `${roof.owner}/${roof.name}`)
})

/**
 * Counts, through the inspector, the calls of an exported helper and the runs of the function that does its work,
 * without touching the module: a conditional breakpoint whose condition records and returns false never pauses. The
 * keys are written here from what each helper reads, not taken from the cache.
 */
test("one build runs each helper's body once per distinct input", async (t) => {
  const file = fileURLToPath(new URL('../src/scene/streetStrokes.ts', import.meta.url))
  const lines = readFileSync(file, 'utf8').split('\n')
  const firstLineOf = (header: string) => {
    const at = lines.findIndex((l) => l.startsWith(header))
    assert.ok(at >= 0, `streetStrokes.ts has a line starting \`${header}\``)
    return at + 1 // zero-based: the line after the header, the function's first statement
  }
  const g = globalThis as unknown as { __b2: Record<string, string[]>; __b2id: (o: object | undefined) => number }
  // a WeakMap has no `size`: a counter numbers each object once (the first version read `ids.size`, so every id was NaN)
  const ids = new WeakMap<object, number>()
  let nextId = 0
  g.__b2 = { cropCalls: [], cropRuns: [], underCalls: [], underRuns: [] }
  g.__b2id = (o) => (o ? (ids.get(o) ?? (ids.set(o, ++nextId), nextId)) : 0)
  const record = (list: string, expr: string) => `(globalThis.__b2.${list}.push(JSON.stringify(${expr})), false)`
  const cropKey = '[__b2id(flow), face.u.length(), face.v.length(), face.source, face.mirror, face.shape, minRows, __b2id(painting)]'
  const underKey = '[__b2id(painting), String(rect), share, lightest]'
  const session = new Session()
  session.connect()
  try {
    await session.post('Debugger.enable')
    const url = new URL(`file://${file}`).href
    for (const [header, list, key] of [
      ['export function faceCrop(', 'cropCalls', cropKey],
      ['function cropFace(', 'cropRuns', cropKey],
      ['export function rectUnderpaint(', 'underCalls', underKey],
      ['function underpaintOf(', 'underRuns', underKey],
    ] as const) {
      await session.post('Debugger.setBreakpointByUrl', { url, lineNumber: firstLineOf(header), condition: record(list, key.replaceAll('__b2id', 'globalThis.__b2id')) })
    }
    assert.ok(buildStreet(stub(58, 92, 96), flow, []))
  } finally {
    session.disconnect()
  }
  const { cropCalls, cropRuns, underCalls, underRuns } = g.__b2
  for (const [name, calls, runs] of [['faceCrop', cropCalls, cropRuns], ['rectUnderpaint', underCalls, underRuns]] as const) {
    const distinct = new Set(calls).size
    t.diagnostic(`${name}: ${calls.length} calls, ${distinct} distinct inputs, ${runs.length} body runs`)
    assert.ok(distinct > 0 && distinct < calls.length, `${name}: the build repeats inputs (${calls.length} calls, ${distinct} distinct)`)
    assert.equal(runs.length, distinct, `${name}: body runs against distinct inputs`)
    assert.equal(new Set(runs).size, runs.length, `${name}: no input's body ran twice`)
  }
})
