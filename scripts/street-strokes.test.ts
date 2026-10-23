/** The street's face strokes (S1 task 3, tasks/2026-10-23-street-s1-plan.md): the crop, the width at any heading, the outlines, the clip, the cover, the sources, the attributes. */

import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Vector3 } from 'three'

import { LAND_MASSES, VILLAGE_FOOTPRINT } from '../src/scene/landMasses.ts'
import { strokeGeometry } from '../src/scene/strokeGeometry.ts'
import { faceConfig, faceCrop, outlineFace, STREET_SOURCES, traceFace, type StreetFace } from '../src/scene/streetStrokes.ts'
import { VILLAGE_PATCHES } from '../src/scene/villagePatches.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

/** A land-flow-sized field (960 × 319) with one direction everywhere and full support. */
function uniformFlow(dx: number, dy: number, width = 960, height = 319): ImageData2D {
  const m = Math.hypot(dx, dy)
  const r = Math.round(((dx / m + 1) / 2) * 255)
  const g = Math.round(((dy / m + 1) / 2) * 255)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([r, g, 255, 255], i * 4)
  return { data, width, height }
}

/** A 1600 × 1267 painting: red left of `splitX` (painting px), blue right of it. */
function splitPainting(splitX: number): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(x < splitX ? [200, 30, 30, 255] : [30, 30, 200, 255], (y * width + x) * 4)
  }
  return { data, width, height }
}

function face(width: number, height: number, extra: Partial<StreetFace> = {}): StreetFace {
  return {
    origin: new Vector3(0, 0, 0),
    u: new Vector3(width, 0, 0),
    v: new Vector3(0, height, 0),
    normal: new Vector3(0, 0, 1),
    shape: 'quad',
    kind: 'wall',
    source: 'wallA',
    refHeight: height,
    seed: 7,
    mirror: false,
    ...extra,
  }
}

const positionsOf = (arrays: { positions: number[] }) =>
  Array.from({ length: arrays.positions.length / 3 }, (_, i) => new Vector3(arrays.positions[i * 3], arrays.positions[i * 3 + 1], arrays.positions[i * 3 + 2]))

test('a face maps its crop\'s corners exactly, and mirror swaps the pigment left for right', () => {
  const f = face(0.6, 0.2)
  const { crop, rows } = faceCrop(uniformFlow(1, 0), f)
  assert.ok(crop.height >= 64, 'upsampled to at least 64 rows')
  assert.ok(Math.abs(crop.width / crop.height - 3) < 0.05, 'square pixels on a 3:1 face')
  // corners: the crop's (0, 0) is the face's top left, (1, 1) its bottom right
  const strokes = traceFace(f, uniformFlow(1, 0), splitPainting(9999))
  const points = positionsOf(strokes.arrays)
  assert.ok(points.length > 0)
  for (const p of points) {
    assert.ok(p.x > -0.05 && p.x < 0.65 && p.y > -0.05 && p.y < 0.25 && p.z >= 0.002 - 1e-9 && p.z <= 0.002 + 15 * 0.00015 + 1e-9, `on the face: ${p.toArray()}`)
  }
  // each ribbon on its own lift level: one shared lift z-fought into rectangular patches (`734903f`, Fable R3)
  assert.ok(new Set(points.map((p) => p.z.toFixed(6))).size >= 8, 'the ribbons stand on at least 8 lift levels')
  // pigment: a source split down its middle; the face's left edge carries the source's left unless mirrored
  const [x0, , x1] = STREET_SOURCES.wallA
  const painting = splitPainting((x0 + x1) / 2)
  const leftColour = (mirror: boolean) => {
    const s = traceFace({ ...f, mirror }, uniformFlow(1, 0), painting)
    const pts = positionsOf(s.arrays)
    let red = 0
    let blue = 0
    pts.forEach((p, i) => {
      if (p.x > 0.1) return
      if (s.arrays.colors[i * 3] > s.arrays.colors[i * 3 + 2]) red++
      else blue++
    })
    return red > blue ? 'red' : 'blue'
  }
  assert.equal(leftColour(false), 'red')
  assert.equal(leftColour(true), 'blue')
  assert.ok(rows.uv[0] < rows.uv[2], 'unmirrored uv runs left to right')
  assert.ok(faceCrop(uniformFlow(1, 0), { ...f, mirror: true }).rows.uv[0] > faceCrop(uniformFlow(1, 0), { ...f, mirror: true }).rows.uv[2], 'mirrored uv runs right to left')
})

test('stroke width is the measured fraction at any heading, on wide and tall faces', () => {
  for (const [w, h] of [[0.8, 0.2], [0.1, 0.2]]) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) {
      const f = face(w, h, { kind: 'ground', source: 'field', refHeight: 0.2 })
      const config = faceConfig(f)
      const expected = config.minHalfWidth * w // half-width in crop widths × the face's width = 0.5 × f × refHeight
      const fraction = (2 * expected) / 0.2
      assert.ok(fraction >= 0.149 && fraction <= 0.251, `the ground's measured width fraction (${fraction})`)
      // a single ribbon traced at the minimum half-width: the world distance between its outer columns at sample 0
      const strokes = traceFace({ ...f, seed: 11 }, uniformFlow(dx, dy), splitPainting(9999), { count: 3, fixedHalfWidth: config.minHalfWidth, taper: 1 })
      const points = positionsOf(strokes.arrays)
      assert.ok(points.length >= 9, `a ribbon was traced (${w}×${h}, heading ${dx},${dy})`)
      const width = points[0].distanceTo(points[2]) / 2
      assert.ok(Math.abs(width - expected) / expected < 0.02, `half-width ${width} against ${expected} (${w}×${h}, heading ${dx},${dy})`)
    }
  }
})

test('the outline width is 0.14 of the wall', () => {
  for (const ref of [0.1, 0.3]) {
    const f = face(1, ref, { refHeight: ref })
    const edge: [Vector3, Vector3] = [new Vector3(0, ref, 0), new Vector3(1, ref, 0)]
    const outline = outlineFace(f, [edge], new Color(0x151b24), 3)
    const points = positionsOf(outline.arrays)
    const columns = 3
    const steps = points.length / columns
    const middle = Math.floor(steps / 2)
    const width = points[middle * columns].distanceTo(points[middle * columns + 2])
    assert.ok(Math.abs(width - 0.14 * ref) < 1e-6, `outline ${width} against ${0.14 * ref}`)
  }
})

test('a gable and a spire keep their strokes inside the triangle, grown by half an outline width', () => {
  for (const [w, h, ref] of [[0.3, 0.12, 0.2], [0.09, 0.68, 0.2]]) {
    const f = face(w, h, { shape: 'triangle', source: 'plaster', refHeight: ref })
    const strokes = traceFace(f, uniformFlow(0.3, 1), splitPainting(9999))
    const allowance = 0.5 * 0.14 * ref + 1e-9
    const points = positionsOf(strokes.arrays)
    assert.ok(points.length > 0, 'the triangle is clad')
    for (const p of points) {
      // distance from the triangle (0,0)-(w,0)-(w/2,h) in the face plane
      assert.ok(distanceToTriangle(p.x, p.y, w, h) <= allowance, `vertex ${p.x.toFixed(4)},${p.y.toFixed(4)} beyond the ${w}×${h} gable`)
    }
  }
})

function distanceToTriangle(x: number, y: number, w: number, h: number): number {
  const a: [number, number] = [0, 0]
  const b: [number, number] = [w, 0]
  const c: [number, number] = [w / 2, h]
  const side = (p: [number, number], q: [number, number]) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
  if (side(a, b) >= 0 && side(b, c) >= 0 && side(c, a) >= 0) return 0
  const segment = (p: [number, number], q: [number, number]) => {
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - p[0] - t * dx, y - p[1] - t * dy)
  }
  return Math.min(segment(a, b), segment(b, c), segment(c, a))
}

test('a face is covered', () => {
  const f = face(0.6, 0.2)
  const strokes = traceFace(f, uniformFlow(1, 0.15), splitPainting(9999))
  const cells = new Uint8Array(200 * 100)
  const pts = positionsOf(strokes.arrays)
  const idx = strokes.arrays.indices
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [pts[idx[t]], pts[idx[t + 1]], pts[idx[t + 2]]]
    const ax = (a.x / 0.6) * 200, ay = (a.y / 0.2) * 100
    const bx = (b.x / 0.6) * 200, by = (b.y / 0.2) * 100
    const cx = (c.x / 0.6) * 200, cy = (c.y / 0.2) * 100
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if (Math.abs(area) < 1e-12) continue
    for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(99, Math.ceil(Math.max(ay, by, cy))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(199, Math.ceil(Math.max(ax, bx, cx))); x++) {
        const px = x + 0.5, py = y + 0.5
        const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
        const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
        if (w0 >= 0 && w1 >= 0 && 1 - w0 - w1 >= 0) cells[y * 200 + x] = 1
      }
    }
  }
  const covered = cells.reduce((sum, c) => sum + c, 0) / cells.length
  assert.ok(covered >= 0.85, `covered ${covered.toFixed(3)}`)
})

test('every source is inscribed in its patch, and the field is clear of houses and masses', () => {
  // the thatch has no patch: picked from rendered candidates, it straddles the striped roof's edge (the S1b record)
  const patchOf: Record<string, keyof typeof VILLAGE_PATCHES> = {
    wallA: 'blueWallA', wallB: 'blueWallB', plaster: 'churchPlaster', roofStriped: 'stripedRoof', roofBlue: 'blueRoof', roofSienna: 'siennaRoof',
  }
  const insideQuad = (x: number, y: number, quad: readonly (readonly [number, number])[]) => {
    let sign = 0
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = quad[i]
      const [bx, by] = quad[(i + 1) % 4]
      const s = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax))
      if (s === 0) continue
      if (sign === 0) sign = s
      else if (s !== sign) return false
    }
    return true
  }
  for (const [name, patch] of Object.entries(patchOf)) {
    const [x0, y0, x1, y1] = STREET_SOURCES[name as keyof typeof STREET_SOURCES]
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) assert.ok(insideQuad(x, y, VILLAGE_PATCHES[patch]), `${name}'s corner ${x},${y} inside ${patch}`)
  }
  const field = STREET_SOURCES.field
  assert.deepEqual([...field], [760, 1214, 935, 1262])
  const overlaps = (a: readonly number[], b: readonly number[]) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1])
  for (const box of VILLAGE_FOOTPRINT) assert.ok(!overlaps(field, box), `the field clears the footprint ${box}`)
  for (const mass of LAND_MASSES) assert.ok(!overlaps(field, mass.box), `the field clears ${mass.id}`)
})

test('the stroke attributes are whole, and a build without them throws', () => {
  const strokes = traceFace(face(0.6, 0.2), uniformFlow(1, 0.2), splitPainting(9999))
  const geometry = strokeGeometry(strokes.arrays, strokes.stroke, strokes.seed)
  const vertices = geometry.getAttribute('position').count
  assert.equal(geometry.getAttribute('aStroke').count, vertices)
  assert.equal(geometry.getAttribute('aStroke').itemSize, 2)
  assert.equal(geometry.getAttribute('aSeed').count, vertices)
  const along = geometry.getAttribute('aStroke')
  const acrossValues = new Set<number>()
  for (let i = 0; i < vertices; i++) {
    const a = along.getX(i)
    assert.ok(a >= 0 && a <= 1, 'along in [0, 1]')
    acrossValues.add(along.getY(i))
  }
  assert.deepEqual([...acrossValues].sort(), [0, 0.5, 1])
  assert.throws(() => strokeGeometry(strokes.arrays, [], strokes.seed), /aStroke/)
  assert.throws(() => strokeGeometry(strokes.arrays, strokes.stroke, []), /aSeed/)
})

test('density halves the ribbons', () => {
  const f = face(0.6, 0.2)
  const full = traceFace(f, uniformFlow(1, 0), splitPainting(9999))
  const half = traceFace(f, uniformFlow(1, 0), splitPainting(9999), { density: 0.5 })
  assert.ok(full.ribbons > 0, 'full ribbons > 0')
  const ratio = half.ribbons / full.ribbons
  assert.ok(ratio >= 0.4 && ratio <= 0.6, `ratio ${ratio.toFixed(3)} at density 0.5 (half ${half.ribbons}, full ${full.ribbons})`)
})

