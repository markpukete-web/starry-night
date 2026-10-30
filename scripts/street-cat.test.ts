/**
 * The cat on wall W3 at stop 3 (`docs/superpowers/specs/2026-10-30-street-cat-design.md`, the build's task 2): its
 * height and triangle budget, its pale bib (`churchLit`) and red-brown coat (`roofSienna`), its place on the wall's
 * top stones facing the lane, its draw distance along the walk, and its head finding Vincent from stop 2.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, SRGBColorSpace } from 'three'

import { buildCat, CAT, catBlink, catNeck, catPlace } from '../src/scene/cat.ts'
import { frogBlink } from '../src/scene/frog.ts'
import { OWL, owlLook } from '../src/scene/owl.ts'
import { laneAt, STATION_T, STREET_WALL, vincentPlace, walkPose } from '../src/scene/streetLayout.ts'
import { sourceUnderpaint, STROKE_LIFT } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import type { VincentPart } from '../src/scene/vincent.ts'
import { decodePNG } from './lib/png.ts'

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'

const painting: ImageData2D = skip
  ? { data: new Uint8ClampedArray(0), width: 0, height: 0 }
  : (() => {
      const png = decodePNG(readFileSync(workPainting))
      return { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height }
    })()

/** Every vertex of a part, strokes and underpaint, shifted by `dy`. */
function points(part: VincentPart, dy = 0): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const arr of [part.strokes.arrays.positions, part.underpaint.positions]) {
    for (let i = 0; i < arr.length; i += 3) out.push([arr[i], arr[i + 1] + dy, arr[i + 2]])
  }
  return out
}

test('the cat stands CAT.size from its feet to its ear tips and costs at most 1,500 triangles', { skip }, () => {
  const cat = buildCat(painting)
  const ys = [...points(cat.body), ...points(cat.head, cat.neck[1]), ...points(cat.tail, cat.tailRoot[1])].map((p) => p[1])
  const height = Math.max(...ys) - Math.min(...ys)
  assert.ok(Math.abs(height - CAT.size) < 0.02 * CAT.size, `feet to ear tips ${height}`)
  assert.ok(cat.triangles <= 1500, `${cat.triangles} triangles`)
  assert.ok(cat.triangles > 400, `${cat.triangles} triangles`)
})

test("the bib is churchLit's and the coat roofSienna's", { skip }, () => {
  const cat = buildCat(painting)
  const linear = (rgb: [number, number, number]) => new Color().setRGB(...rgb, SRGBColorSpace).toArray()
  const lit = linear(sourceUnderpaint(painting, 'churchLit', 1))
  const coat = linear(sourceUnderpaint(painting, 'roofSienna', 1))
  const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]))
  const { positions, colors } = cat.body.strokes.arrays
  // the parts overlap (the haunches reach z 0.16 behind the chest's front), so a window on z cannot isolate the bib:
  // the pale vertices must sit on the chest's front at its height, and the back must be coat
  const pale: [number, number][] = []
  const back: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const [y, z] = [positions[i + 1] / CAT.size, positions[i + 2] / CAT.size]
    const c = [colors[i], colors[i + 1], colors[i + 2]]
    const nearLit = dist(c, lit) < dist(c, coat)
    if (nearLit) pale.push([y, z])
    if (z < -0.12) back.push(nearLit ? 1 : 0)
  }
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const bibVertices = CAT.bib.strokes * 4 * 3 // the bib's strokes, 4 steps of 3 columns
  // each stroke takes one texel of its rectangle, and `churchLit` holds a few dark outline texels: one bib stroke of
  // four may read dark (the owl's chest read 0.83 pale for the same reason)
  assert.ok(pale.length >= 0.7 * bibVertices && pale.length <= 1.1 * bibVertices, `${pale.length} pale vertices of ${bibVertices}`)
  assert.ok(mean(pale.map((p) => p[1])) > 0.12, `the pale paint's mean z ${mean(pale.map((p) => p[1]))}`)
  const y = mean(pale.map((p) => p[0]))
  assert.ok(y > 0.3 && y < 0.7, `the pale paint's mean height ${y}`)
  assert.ok(back.length > 30, `${back.length} back vertices`)
  assert.ok(mean(back) <= 0.1, `back ${mean(back)} nearer churchLit`)
})

test("the cat sits on W3's top stones at its t, facing the lane", () => {
  const { position, yaw } = catPlace()
  const at = laneAt(CAT.t, CAT.lateral)
  assert.ok(Math.abs(position[0] - at.x) < 1e-12 && Math.abs(position[2] - at.z) < 1e-12)
  assert.equal(position[1], STREET_WALL.height + STROKE_LIFT + CAT.contact)
  // three's Ry turns +z to (sin yaw, cos yaw): the lane is +lateral from a wall on the −lateral side
  assert.ok(Math.sin(yaw) * at.nx + Math.cos(yaw) * at.nz > 0.999999)
  // the haunches reach past both top rows' near edges (the rows at −0.1425 and −0.1575, about 0.011 wide), so it sits
  // on stone, not on the strip of underpaint between them (Codex's facts read)
  const [, , cz] = CAT.haunches.centre
  const depth = CAT.haunches.radii[1]
  assert.ok(CAT.lateral + (cz + depth) * CAT.size > -0.148, 'over the lane-side row')
  assert.ok(CAT.lateral + (cz - depth) * CAT.size < -0.152, 'over the far row')
})

test('the tail curls round the side toward the camera at stops 2 and 3', () => {
  // from both stops the camera is behind the cat's left (its −x); the curl's widest point must face it
  const { position, yaw } = catPlace()
  const [x, , z] = CAT.tail.bend.map((c) => c * CAT.size)
  const bend = [position[0] + x * Math.cos(yaw) + z * Math.sin(yaw), position[2] - x * Math.sin(yaw) + z * Math.cos(yaw)]
  for (const stop of [2, 3]) {
    const eye = walkPose(STATION_T[stop], false).position
    const away = (p: number[]) => Math.hypot(p[0] - eye[0], p[1] - eye[2])
    assert.ok(away(bend) < away([position[0], position[2]]), `stop ${stop}: the tail's bend ${away(bend)}`)
  }
})

test('the cat is drawn from stop 2 on and never at the walk’s worst triangle point', () => {
  const { position } = catPlace()
  const away = (t: number) => {
    const p = walkPose(t, false).position
    return Math.hypot(p[0] - position[0], p[1] - position[1], p[2] - position[2])
  }
  assert.ok(away(0.26) > CAT.draw, `t 0.26: ${away(0.26)}`)
  assert.ok(away(0.4) > CAT.draw, `t 0.40: ${away(0.4)}`)
  assert.ok(away(STATION_T[2]) < CAT.draw, `stop 2: ${away(STATION_T[2])}`)
  assert.ok(away(STATION_T[3]) < CAT.draw, `stop 3: ${away(STATION_T[3])}`)
})

test("from stop 2 the cat's cone finds Vincent where the owl's would not, and at stop 3 he is in front of it", () => {
  const neck = catNeck()
  const target = (t: number): [number, number] => {
    const p = vincentPlace(t).position
    return [p[0], p[2]]
  }
  const { yaw } = catPlace()
  const s2 = owlLook(neck, yaw, target(STATION_T[2]), CAT.look)
  assert.ok(Math.abs(s2.yaw) > 1.2217, `stop 2 head ${s2.yaw}`)
  assert.deepEqual(owlLook(neck, yaw, target(STATION_T[2]), OWL.look), { yaw: 0, pitch: 0 })
  const s3 = owlLook(neck, yaw, target(STATION_T[3]), CAT.look)
  assert.ok(s3.yaw !== 0 && Math.abs(s3.yaw) < 0.6, `stop 3 head ${s3.yaw}`)
})

test("the cat blinks on the frogs' table with its own phase, open at 0", () => {
  assert.equal(catBlink(0), 0)
  for (const t of [0.5, 1.7, 4.2, 9.9]) assert.equal(catBlink(t), frogBlink(t + CAT.blink.phase))
})
