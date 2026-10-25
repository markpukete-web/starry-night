/**
 * The frog (S3b pass 5, tasks/2026-10-25-street-s3b-plan.md Task 6): its blink on the sky's clock, its size, its place
 * in the verge and its clearing in the grass, and stop 0's view of it.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'

import { buildFrog, FROG, FROG_EYES, frogBlink, frogPlace } from '../src/scene/frog.ts'
import { GRASS, grassChunks } from '../src/scene/streetGrass.ts'
import { lifeTime } from '../src/scene/streetLife.ts'
import { laneParam, STATION_T, VINCENT_RIG, vincentPlace, walkPose } from '../src/scene/streetLayout.ts'
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

test('the frog is small: under 2,500 triangles', { skip }, () => {
  const png = decodePNG(readFileSync(workPainting))
  const frog = buildFrog({ data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height })
  assert.ok(frog.triangles > 1000 && frog.triangles < 2500, `${frog.triangles} triangles`)
})

/** The frog's frame to the street's. */
function toStreet(local: Vector3): Vector3 {
  const { position, yaw } = frogPlace()
  return new Vector3(
    position[0] + local.x * Math.cos(yaw) + local.z * Math.sin(yaw),
    position[1] + local.y,
    position[2] - local.x * Math.sin(yaw) + local.z * Math.cos(yaw),
  )
}

test("the frog sits in the verge on the grass's base, past the path's edge and clear of Vincent's side", () => {
  assert.equal(FROG.y, GRASS.baseY, 'its feet on the base')
  const { position } = frogPlace()
  const [t, lateral] = laneParam(position[0], position[2])
  assert.ok(Math.abs(t - FROG.place.t) < 0.002, `along the lane at ${t.toFixed(4)}`)
  assert.ok(Math.abs(lateral - FROG.place.lateral) < 0.001, `lateral ${lateral.toFixed(4)}`)
  // the widest of it: the haunches, the shadow, the arms
  const reach = Math.max(FROG.haunch.centre[0] + FROG.haunch.radii[0], FROG.shadow.across, FROG.arm.hand[0])
  const v = vincentPlace(STATION_T[0]).position
  const [, vLat] = laneParam(v[0], v[2])
  for (let k = 0; k < 16; k++) {
    const th = (k / 16) * Math.PI * 2
    const p = toStreet(new Vector3(Math.cos(th) * reach, 0, Math.sin(th) * Math.max(reach, FROG.shadow.along)))
    const [, lat] = laneParam(p.x, p.z)
    // the path is 0.12 wide (`streetGeometry.ts`), and over it the frog would stand on its strokes, not the base
    assert.ok(Math.abs(lat) > 0.06 && Math.abs(lat) < GRASS.lat[1], `a point of its edge at lateral ${lat.toFixed(4)}, off the verge`)
    assert.ok(Math.abs(lat - vLat) > VINCENT_RIG.halfWidth + 0.02, `${Math.abs(lat - vLat).toFixed(4)} from Vincent's line`)
  }
})

test('no blade comes up through the frog, and blades stand round it', { skip }, () => {
  const png = decodePNG(readFileSync(workPainting))
  const blades = grassChunks({ data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height }).flatMap((c) => c.blades)
  const [x, , z] = frogPlace().position
  const near = blades.map((b) => Math.hypot(b.x - x, b.z - z))
  assert.ok(near.every((d) => d >= FROG.clear), `a root ${Math.min(...near).toFixed(4)} from its centre`)
  const round = near.filter((d) => d < 2 * FROG.clear).length
  assert.ok(round >= 4, `${round} blades within ${2 * FROG.clear} of it`)
})

test('stop 0 sees the frog and both eyes, on the desktop and the phone', () => {
  for (const [portrait, aspect] of [[false, 1280 / 800], [true, 390 / 844]] as const) {
    const pose = walkPose(STATION_T[0], portrait)
    const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
    cam.position.set(...pose.position)
    cam.lookAt(...pose.target)
    cam.updateMatrixWorld()
    cam.updateProjectionMatrix()
    for (const local of [new Vector3(), ...FROG_EYES.map((e) => new Vector3(...e))]) {
      const ndc = toStreet(local).project(cam)
      assert.ok(Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1, `${portrait ? 'phone' : 'desktop'}: (${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)})`)
    }
  }
})
