/**
 * The barn owl on the church nave's ridge (`tasks/2026-10-29-church-owl-plan.md`, Task 1): its triangle budget and
 * extent, its pale chest (`churchLit`) and olive-brown back (`thatch`), its perch behind the front gable peak, its
 * draw cull and sightline from stops 3 and 4, its head turn toward Vincent, its easing, and its blink phase.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, PerspectiveCamera, Ray, SRGBColorSpace, Vector3 } from 'three'

import { frogBlink } from '../src/scene/frog.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildOwl, easeLook, OWL, owlBlink, owlLook, owlPerch } from '../src/scene/owl.ts'
import { buildStreet } from '../src/scene/streetGeometry.ts'
import { churchFront, STATION_T, STREET_CHURCH, vincentPlace, walkPose } from '../src/scene/streetLayout.ts'
import { lifeTime } from '../src/scene/streetLife.ts'
import { OUTLINE_LIFT, sourceUnderpaint } from '../src/scene/streetStrokes.ts'
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

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

function plainPainting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([[40, 60, 110, 255], [120, 140, 170, 255]][i % 2], i * 4)
  return { data, width, height }
}

/** The camera of a pose on the walk, at an aspect (`scripts/street-frog.test.ts:135-146`). */
function camera(t: number, aspect: number, portrait: boolean): PerspectiveCamera {
  const pose = walkPose(t, portrait)
  const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
  cam.position.set(...pose.position)
  cam.lookAt(...pose.target)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return cam
}

const ASPECTS = [[1600 / 900, false, '16:9'], [1280 / 800, false, '16:10'], [390 / 844, true, 'phone']] as const

function distance(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function lowestY(part: VincentPart): number {
  let low = Infinity
  for (const arrays of [part.underpaint, part.strokes.arrays]) {
    for (let i = 1; i < arrays.positions.length; i += 3) low = Math.min(low, arrays.positions[i])
  }
  return low
}

function highestY(part: VincentPart): number {
  let high = -Infinity
  for (const arrays of [part.underpaint, part.strokes.arrays]) {
    for (let i = 1; i < arrays.positions.length; i += 3) high = Math.max(high, arrays.positions[i])
  }
  return high
}

function linear(srgb: readonly [number, number, number]): [number, number, number] {
  const c = new Color().setRGB(srgb[0], srgb[1], srgb[2], SRGBColorSpace)
  return [c.r, c.g, c.b]
}

function dist(c: readonly [number, number, number], d: readonly [number, number, number]): number {
  return Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2])
}

function mean(xs: readonly number[]): number {
  return xs.reduce((sum, x) => sum + x, 0) / xs.length
}

function headCentre(perch: readonly [number, number, number], yaw: number): Vector3 {
  const lx = (OWL.neck[0] + OWL.head.centre[0]) * OWL.size
  const ly = (OWL.neck[1] + OWL.head.centre[1]) * OWL.size
  const lz = (OWL.neck[2] + OWL.head.centre[2]) * OWL.size
  return new Vector3(
    perch[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    perch[1] + ly,
    perch[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  )
}

test('the owl fits: at most 1,500 triangles, its feet on the perch, its crown at its size', { skip }, () => {
  const owl = buildOwl(painting)
  assert.ok(owl.triangles <= 1500, `${owl.triangles} triangles`)
  assert.ok(Math.abs(lowestY(owl.body)) <= 0.0002) // every vertex of body.underpaint and body.strokes
  assert.ok(Math.abs(owl.neck[1] + highestY(owl.head) - OWL.size) <= 0.0015)
})

test('the chest is pale and the back is the thatch: the strokes by their side', { skip }, () => {
  const owl = buildOwl(painting)
  const lit = linear(sourceUnderpaint(painting, 'churchLit', 1))
  const thatch = linear(sourceUnderpaint(painting, 'thatch', 1))
  const front: number[] = []
  const back: number[] = []
  const { positions, colors } = owl.body.strokes.arrays // the stroke vertices' colours are linear
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2]
    const c: [number, number, number] = [colors[i], colors[i + 1], colors[i + 2]]
    const nearerLit = dist(c, lit) < dist(c, thatch) ? 1 : 0
    if (z > 0.03 * OWL.size) front.push(nearerLit)
    else if (z < -0.03 * OWL.size) back.push(nearerLit)
  }
  assert.ok(front.length > 50 && back.length > 50, `${front.length} front, ${back.length} back`)
  assert.ok(mean(front) >= 0.8, `front nearer churchLit: ${mean(front)}`) // Codex F2: the sides, not a band
  assert.ok(mean(back) <= 0.2, `back nearer churchLit: ${mean(back)}`)
})

test('the perch is on the ridge, 0.08 behind the front peak, on the ridge ink', () => {
  const { position: [x, y, z], yaw } = owlPerch()
  const nave = STREET_CHURCH.nave
  const toPath = [-Math.sin(nave.yaw), Math.cos(nave.yaw)]
  const f = churchFront()
  assert.ok(Math.hypot(x - (f.x - toPath[0] * OWL.back), z - (f.z - toPath[1] * OWL.back)) < 1e-9)
  assert.ok(Math.abs(y - (nave.eave + nave.pitch + OUTLINE_LIFT)) < 1e-9)
  assert.ok(Math.abs(yaw - Math.atan2(toPath[0], toPath[1])) < 1e-9)
})

test('the owl is drawn at stops 3 and 4 and not before, and is in frame there on 16:9, 16:10 and the phone', () => {
  const { position: p, yaw } = owlPerch()
  for (const [i, t] of STATION_T.entries()) {
    const d = distance(walkPose(t, false).position, p)
    assert.equal(d < OWL.draw, i >= 3, `stop ${i}: ${d}`)
  }
  const head = headCentre(p, yaw)
  for (const stop of [3, 4] as const) {
    for (const [aspect, portrait, name] of ASPECTS) {
      const cam = camera(STATION_T[stop], aspect, portrait)
      const ndc = head.clone().project(cam)
      assert.ok(
        Math.abs(ndc.x) <= 0.95 && Math.abs(ndc.y) <= 0.95 && ndc.z < 1,
        `stop ${stop} ${name}: (${ndc.x.toFixed(3)}, ${ndc.y.toFixed(3)})`,
      )
    }
  }
})

test('the owl is seen from stops 3 and 4: the line to its head clears the nave', () => {
  const build = buildStreet(plainPainting(), flow, masses, { lit: true })!
  const faces = build.report.faces.filter((f) => f.owner === 'church')
  assert.ok(faces.length > 0)
  const { position: p, yaw } = owlPerch()
  const head = headCentre(p, yaw)
  const hit = new Vector3()
  for (const stop of [3, 4] as const) {
    for (const portrait of [false, true]) {
      const eye = new Vector3(...walkPose(STATION_T[stop], portrait).position)
      const dir = head.clone().sub(eye)
      const headDist = dir.length()
      const ray = new Ray(eye, dir.normalize())
      for (const face of faces) {
        const c = face.corners
        for (let i = 1; i + 1 < c.length; i++) {
          const at = ray.intersectTriangle(c[0], c[i], c[i + 1], false, hit)
          if (at) {
            const d = at.distanceTo(eye)
            assert.ok(
              d >= headDist - 0.01,
              `stop ${stop} (portrait ${portrait}) hit ${face.name} at ${d.toFixed(4)} < ${(headDist - 0.01).toFixed(4)}`,
            )
          }
        }
      }
    }
  }
})

test('the head turns toward a target within reach and inside the cone, never without one', () => {
  const { position: perch, yaw } = owlPerch()
  const neck: [number, number, number] = [perch[0], perch[1] + OWL.neck[1] * OWL.size, perch[2]]
  const at = (angle: number, dist: number): [number, number] => {
    const a = yaw + angle
    return [neck[0] + Math.sin(a) * dist, neck[2] + Math.cos(a) * dist]
  }
  assert.deepEqual(owlLook(neck, yaw, null), { yaw: 0, pitch: 0 })
  assert.deepEqual(owlLook(neck, yaw, at(0.5, 0.7)), { yaw: 0, pitch: 0 }) // out of reach
  assert.deepEqual(owlLook(neck, yaw, at(1.4, 0.3)), { yaw: 0, pitch: 0 }) // outside the 70° cone
  const look = owlLook(neck, yaw, at(0.5, 0.3))
  assert.ok(Math.abs(look.yaw - 0.5) < 1e-6)
  assert.ok(Math.abs(look.pitch - Math.max(-OWL.look.pitch, Math.atan2(OWL.look.targetY - neck[1], 0.3))) < 1e-6)
  const s4 = vincentPlace(STATION_T[4]).position
  const l4 = owlLook(neck, yaw, [s4[0], s4[2]])
  assert.ok(Math.abs(Math.abs(l4.yaw) - 0.976) < 0.05, `stop 4 yaw ${l4.yaw}`) // 55.9° at look pass 4's perch (Task 0's 49.7° at back 0.08)
  assert.equal(l4.pitch, -OWL.look.pitch) // 50.8° down, capped
  const s3 = vincentPlace(STATION_T[3]).position
  assert.deepEqual(owlLook(neck, yaw, [s3[0], s3[2]]), { yaw: 0, pitch: 0 }) // 0.818 away
})

test('the easing reaches 95% in three taus and holds at dt 0', () => {
  let a = 0
  for (let i = 0; i < 18; i++) a = easeLook(a, 1, 0.1) // 1.8 s of 0.1 s frames, three taus (Codex F5)
  assert.ok(a > 0.94 && a < 0.96, `${a}`)
  assert.equal(easeLook(0, 1, 0.6), easeLook(0, 1, 0.1), 'a frame over 0.1 s counts as 0.1')
  assert.equal(easeLook(0.3, 1, 0), 0.3)
})

test("the owl blinks on the frogs' table with its own phase, open at 0 and under reduced motion", () => {
  assert.equal(owlBlink(0), 0)
  assert.equal(owlBlink(lifeTime(5, 99, true)), 0)
  assert.equal(frogBlink(OWL.blink.phase), 0)
  let apart = false
  for (let t = 0.01; t < 60 && !apart; t += 0.01) apart = owlBlink(t) === 1 && frogBlink(t) === 0
  assert.ok(apart, 'the owl is shut at some time the frogs are open')
})
