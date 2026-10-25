/**
 * The frogs (S3b pass 5, then `tasks/2026-10-25-street-frogs-plan.md`): the blink on the sky's clock, the shape, and the
 * five spots, one by each stop: in a gap of the grass or on the square, side-on to the stop's camera, in its frame,
 * clear of Vincent and the path, and never two drawn at once.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Frustum, Matrix4, PerspectiveCamera, Sphere, Vector3 } from 'three'

import { buildFrog, FROG, frogBlink, frogPlace, FROGS, type FrogSpec } from '../src/scene/frog.ts'
import { GRASS, grassChunks, inFootprint } from '../src/scene/streetGrass.ts'
import { lifeTime } from '../src/scene/streetLife.ts'
import { laneParam, pathTangent, STATION_T, vincentBoxCorners, walkPose } from '../src/scene/streetLayout.ts'
import { LIFT_LEVELS, LIFT_STEP, STROKE_LIFT } from '../src/scene/streetStrokes.ts'
import { buildVincent } from '../src/scene/vincent.ts'
import { decodePNG } from './lib/png.ts'

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'

/** Every blink over [0, until), sampled each millisecond: its start, its end, and how long it was fully shut. */
function blinks(until: number): { start: number; end: number; shutFor: number }[] {
  const out: { start: number; end: number; shutFor: number }[] = []
  let open = true
  for (let ms = 0; ms < until * 1000; ms++) {
    const s = frogBlink(ms / 1000)
    if (open && s > 0) {
      out.push({ start: ms / 1000, end: ms / 1000, shutFor: 0 })
      open = false
    } else if (!open && s === 0) {
      out[out.length - 1].end = ms / 1000
      open = true
    }
    if (s === 1) out[out.length - 1].shutFor += 0.001
  }
  return out
}

test('the eyes are open at time 0, before the first blink and under reduced motion', () => {
  assert.equal(frogBlink(0), 0)
  for (const t of [-1, Number.NaN, 0.5, FROG.blink.first - 0.01]) assert.equal(frogBlink(t), 0, `open at ${t}`)
  const shutAt = FROG.blink.first + FROG.blink.down + FROG.blink.hold / 2
  assert.equal(frogBlink(shutAt), 1, 'shut in the middle of the first blink')
  assert.equal(frogBlink(lifeTime(shutAt, 99, true)), 0, 'reduced motion pins the clock at 0, so a pinned blink stays open')
  assert.equal(frogBlink(lifeTime(shutAt, 99, false)), 1, 'a pinned capture reads the blink at the pin')
})

test('the frog blinks: each blink shut for its hold, none longer than down, hold and up, the gaps from the table', () => {
  const B = FROG.blink
  const found = blinks(300)
  assert.ok(found.length >= 300 / B.gap[1], `${found.length} blinks in 300 s`)
  const length = B.down + B.hold + B.up
  for (const b of found) {
    assert.ok(b.end - b.start <= length + 0.002, `a blink at ${b.start.toFixed(3)} lasted ${(b.end - b.start).toFixed(3)} s`)
    assert.ok(b.shutFor >= B.hold - 0.002, `a blink at ${b.start.toFixed(3)} was shut ${b.shutFor.toFixed(3)} s`)
  }
  // a double's second blink starts `doubleAfter` after its first; every other start is a group's, 2.5–6 s apart
  const groups: number[] = []
  let doubles = 0
  for (let i = 0; i < found.length; i++) {
    if (i > 0 && Math.abs(found[i].start - found[i - 1].start - B.doubleAfter) < 0.002) doubles++
    else groups.push(found[i].start)
  }
  assert.ok(doubles >= 1, 'at least one double blink')
  for (let i = 1; i < groups.length; i++) {
    const gap = groups[i] - groups[i - 1]
    assert.ok(gap >= B.gap[0] - 0.002 && gap <= B.gap[1] + 0.002, `the gap before ${groups[i].toFixed(3)} is ${gap.toFixed(3)} s`)
  }
})

const painting = () => {
  const png = decodePNG(readFileSync(workPainting))
  return { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height }
}

// the walk's tightest point with a frog drawn is t 0.295 on the desktop, stop 1's frog 0.2 away: 1,643 under the
// ceiling without it (the plan's Fact 9). The cap holds only while one frog at most is drawn there (`draw`, below)
test('the frog fits the walk: at most 1,250 triangles', { skip }, () => {
  const frog = buildFrog(painting())
  assert.ok(frog.triangles <= 1250, `${frog.triangles} triangles`)
})

test('the frog sits on the ground: its lowest point within 0.0002 of its feet', { skip }, () => {
  const frog = buildFrog(painting())
  let low = Infinity
  for (const arrays of [frog.body.underpaint, frog.body.strokes.arrays]) {
    for (let i = 1; i < arrays.positions.length; i += 3) low = Math.min(low, arrays.positions[i])
  }
  assert.ok(low >= -0.0001 && low <= 0.0002, `its lowest point at ${low.toFixed(6)}`)
})

test('its back leg folds, the knee forward and out', () => {
  assert.ok(FROG.knee[2] > FROG.hip[2] && FROG.knee[2] > FROG.heel[2], 'the knee ahead of the hip and the heel')
  assert.ok(FROG.knee[0] > FROG.torso.radii[0], 'the knee out past the torso')
})

test('its eyes stand on its head', () => {
  assert.ok(FROG.eye.centre[1] - FROG.eye.r > FROG.head.centre[1], 'the eye above the head\'s middle')
  assert.ok(FROG.eye.centre[2] >= FROG.head.centre[2], "the eye in the head's front half")
})

test('Vincent keeps his strokes: the lift parameter defaults to his 0.0004', { skip }, async () => {
  const { createHash } = await import('node:crypto')
  const v = buildVincent(painting())
  const h = createHash('sha256')
  for (const part of [v.body, v.armLeft]) {
    h.update(JSON.stringify(part.strokes.arrays.positions))
    h.update(JSON.stringify(part.underpaint.positions))
  }
  // read at cc56207, before `stroke` and `clad` took a lift
  assert.equal(h.digest('hex').slice(0, 16), '79338a361cd6b11c')
})

/** A frog's frame to the street's: its group's uniform scale, then its yaw, then its place. */
function toStreet(spec: FrogSpec, local: Vector3): Vector3 {
  const { position, yaw } = frogPlace(spec)
  const [x, y, z] = [local.x * spec.scale, local.y * spec.scale, local.z * spec.scale]
  return new Vector3(position[0] + x * Math.cos(yaw) + z * Math.sin(yaw), position[1] + y, position[2] - x * Math.sin(yaw) + z * Math.cos(yaw))
}

/** Every vertex of the frog's body, in its own frame. */
function bodyVertices(): Vector3[] {
  const frog = buildFrog(painting())
  const out: Vector3[] = []
  for (const arrays of [frog.body.underpaint, frog.body.strokes.arrays]) {
    for (let i = 0; i < arrays.positions.length; i += 3) out.push(new Vector3(arrays.positions[i], arrays.positions[i + 1], arrays.positions[i + 2]))
  }
  return out
}

/** The camera of a pose on the walk, at an aspect. */
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
/** The square's strokes reach this high: its face at 0.002 (`streetGeometry.ts`), the strokes' top level over it. */
const SQUARE_TOP = 0.002 + STROKE_LIFT + (LIFT_LEVELS - 1) * LIFT_STEP

test('one frog per stop, in stop order', () => {
  assert.deepEqual(FROGS.map((f) => f.stop), [0, 1, 2, 3, 4])
})

test("each frog keeps clear of Vincent's walk: 0.02 from his box at every point of it", { skip }, () => {
  const feet = bodyVertices().filter((v) => v.y < 0.0006)
  const boxes = Array.from({ length: 901 }, (_, k) => {
    const c = vincentBoxCorners(k / 1000).filter((p) => p[1] === 0)
    return [c[0], c[1], c[3], c[2]]
  })
  const toQuad = (x: number, z: number, quad: [number, number, number][]) => {
    let inside = true
    let best = Infinity
    for (let i = 0; i < 4; i++) {
      const [p, q] = [quad[i], quad[(i + 1) % 4]]
      const [vx, vz] = [q[0] - p[0], q[2] - p[2]]
      if (vx * (z - p[2]) - vz * (x - p[0]) < 0) inside = false
      const s = Math.max(0, Math.min(1, ((x - p[0]) * vx + (z - p[2]) * vz) / (vx * vx + vz * vz)))
      best = Math.min(best, Math.hypot(x - p[0] - s * vx, z - p[2] - s * vz))
    }
    return inside ? 0 : best
  }
  for (const f of FROGS) {
    const points = feet.map((v) => toStreet(f, v))
    let gap = Infinity
    for (const quad of boxes) for (const p of points) gap = Math.min(gap, toQuad(p.x, p.z, quad))
    assert.ok(gap >= 0.02, `stop ${f.stop}: ${gap.toFixed(4)} from his box`)
  }
})

test('each frog in the grass sits in a gap ringed by blades, and stop 4 stands on the square', { skip }, () => {
  const blades = grassChunks(painting()).flatMap((c) => c.blades)
  for (const f of FROGS) {
    const [x, , z] = frogPlace(f).position
    if (f.stop === 4) {
      assert.ok(!inFootprint(x, z), 'stop 4 is past the grass')
      assert.ok(Math.abs(f.y - (SQUARE_TOP + 0.00025)) < 1e-12, `stop 4 at y ${f.y}, the square's strokes at ${SQUARE_TOP}`)
      continue
    }
    assert.equal(f.y, GRASS.baseY, `stop ${f.stop} on the grass's base`)
    const near = blades.map((b) => Math.hypot(b.x - x, b.z - z))
    const clear = FROG.clear * f.scale
    assert.ok(near.every((d) => d >= clear), `stop ${f.stop}: a root ${Math.min(...near).toFixed(4)} from its centre`)
    // within three clearances, about three frog lengths: stop 0's spot has 1 blade within two and 10 within three
    const round = near.filter((d) => d < 3 * clear).length
    assert.ok(round >= 4, `stop ${f.stop}: ${round} blades within ${(3 * clear).toFixed(4)}`)
  }
})

test('each frog is off the path', { skip }, () => {
  const feet = bodyVertices().filter((v) => v.y < 0.0006)
  for (const f of FROGS) {
    for (const v of feet) {
      const p = toStreet(f, v)
      const [, lat] = laneParam(p.x, p.z)
      // the path is 0.12 wide (`streetGeometry.ts`)
      assert.ok(Math.abs(lat) > 0.06, `stop ${f.stop}: a foot at lateral ${lat.toFixed(4)}`)
    }
  }
})

test('each frog is side-on to its stop, its nose to the lane or away as its spec says', () => {
  for (const f of FROGS) {
    assert.ok(f.face >= 0.25 && f.face <= 0.5, `stop ${f.stop}: face ${f.face}`)
    const { position, yaw } = frogPlace(f)
    const cam = walkPose(STATION_T[f.stop], false).position
    const bearing = Math.atan2(cam[0] - position[0], cam[2] - position[2])
    const turn = Math.abs(Math.atan2(Math.sin(yaw - bearing), Math.cos(yaw - bearing)))
    assert.ok(Math.abs(turn - (Math.PI / 2 - f.face)) < 1e-9, `stop ${f.stop}: turned ${turn.toFixed(4)} from its camera`)
    const [tx, , tz] = pathTangent(f.t)
    const n = Math.hypot(tx, tz)
    // the walker's right is (−tz, tx): toward the lane's centre is against the frog's own side
    const toCentre = -(Math.sin(yaw) * (-tz / n) + Math.cos(yaw) * (tx / n)) * Math.sign(f.lateral)
    assert.ok(f.toward === 'lane' ? toCentre > 0 : toCentre < 0, `stop ${f.stop}: ${f.toward}, its nose ${toCentre.toFixed(2)} toward the centre`)
  }
})

test('each frog is in frame at its stop: 16:9, 16:10 and the phone', { skip }, () => {
  const body = bodyVertices()
  for (const f of FROGS) {
    const points = body.map((v) => toStreet(f, v))
    for (const [aspect, portrait, name] of ASPECTS) {
      const cam = camera(STATION_T[f.stop], aspect, portrait)
      // stop 4's desktop frame meets the ground at its lower edge, so its frog sits lower in it
      const edge = f.stop === 4 && !portrait ? 0.95 : 0.9
      for (const p of points) {
        const ndc = p.clone().project(cam)
        assert.ok(Math.abs(ndc.x) <= edge && Math.abs(ndc.y) <= edge && ndc.z < 1, `stop ${f.stop} ${name}: (${ndc.x.toFixed(3)}, ${ndc.y.toFixed(3)})`)
      }
    }
  }
})

test('no frog crowds a camera: 0.15 from every station camera', () => {
  for (const f of FROGS) {
    const p = new Vector3(...frogPlace(f).position)
    for (const t of STATION_T) {
      for (const portrait of [false, true]) {
        const d = p.distanceTo(new Vector3(...walkPose(t, portrait).position))
        assert.ok(d >= 0.15, `stop ${f.stop}'s frog ${d.toFixed(3)} from station ${t}`)
      }
    }
  }
})

test('the sizes vary a little', () => {
  for (const f of FROGS) assert.ok(f.scale >= 0.9 && f.scale <= 1.1, `stop ${f.stop}: scale ${f.scale}`)
  assert.equal(new Set(FROGS.map((f) => f.scale)).size, FROGS.length, 'no two the same size')
})

test('each stop draws its own frog', () => {
  for (const f of FROGS) {
    for (const portrait of [false, true]) {
      const d = new Vector3(...frogPlace(f).position).distanceTo(new Vector3(...walkPose(STATION_T[f.stop], portrait).position))
      assert.ok(d < f.draw, `stop ${f.stop}: ${d.toFixed(3)} from its camera, beyond ${f.draw}`)
    }
  }
})

/** The frogs drawn at a walk pose: in the frustum and within their `draw`, with their distances. */
function drawnAt(t: number, aspect: number, portrait: boolean): { stop: number; d: number }[] {
  const cam = camera(t, aspect, portrait)
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
  return FROGS.flatMap((f) => {
    const p = new Vector3(...frogPlace(f).position)
    const d = p.distanceTo(cam.position)
    return d < f.draw && frustum.intersectsSphere(new Sphere(p.clone().setY(p.y + 0.002), 0.008)) ? [{ stop: f.stop, d }] : []
  })
}

// the walk's tight stretch ends by t 0.45, where the diorama leaves the frame: before it the room is under 2,000
// triangles, for one frog (the plan's Fact 9)
test('at most one frog is drawn on the walk before t 0.45', () => {
  for (const [aspect, portrait, name] of ASPECTS) {
    for (let k = 0; k < 450; k++) {
      const drawn = drawnAt(k / 1000, aspect, portrait)
      assert.ok(drawn.length <= 1, `${name} at t ${k / 1000}: stops ${drawn.map((f) => f.stop).join(', ')} drawn`)
    }
  }
})

// the five share one blink: a second frog drawn is at least 0.8 away, its eyes a pixel or two, so nobody sees two
// blink together
test('when two frogs are drawn, the farther is at least 0.8 away', () => {
  for (const [aspect, portrait, name] of ASPECTS) {
    for (let k = 0; k <= 900; k++) {
      const drawn = drawnAt(k / 1000, aspect, portrait)
      assert.ok(drawn.length <= 2, `${name} at t ${k / 1000}: ${drawn.length} drawn`)
      if (drawn.length === 2) assert.ok(Math.max(...drawn.map((f) => f.d)) >= 0.8, `${name} at t ${k / 1000}: two drawn within 0.8`)
    }
  }
})

test('reduced motion keeps the eyes open', () => {
  for (let k = 0; k <= 1200; k++) assert.equal(frogBlink(lifeTime(k * 0.05, 99, true)), 0, `open at ${(k * 0.05).toFixed(2)} s`)
})
