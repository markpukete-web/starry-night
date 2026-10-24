/**
 * The hand's trail (S3 task 3, tasks/2026-10-24-street-s3-plan.md):
 * D1's rise, swing, settle and freeze in every texel of the map.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTrail,
  stampSegment,
  stepTrail,
  encodePush,
  TRAIL,
  type Trail,
} from '../src/scene/grassTrail.ts'

function getTexelPush(trail: Trail, x: number, z: number): [number, number] {
  const [x0, z0] = trail.rect
  const [cols, rows] = trail.size
  const col = Math.floor((x - x0) / TRAIL.texel)
  const row = Math.floor((z - z0) / TRAIL.texel)
  if (col < 0 || col >= cols || row < 0 || row >= rows) return [0, 0]
  const idx = row * cols + col
  const b0 = trail.bytes[idx * 2]
  const b1 = trail.bytes[idx * 2 + 1]
  return [(b0 - 128) / 127, (b1 - 128) / 127]
}

test('a held stamp rises and pushes away', () => {
  const trail = createTrail([0, 0, 0.4, 0.4])
  const center: [number, number] = [0.2005, 0.2025]
  const dt = 1 / 60
  const targetR = 0.6 * TRAIL.radius
  const testPt: [number, number] = [center[0] + targetR, center[1]]

  let reachedFull = false
  let reachTime = -1

  const expectedByte = Math.round(128 + 127 * (1 - 0.6) ** 2) // 148, push ~ 0.1575
  const col = Math.floor((testPt[0] - trail.rect[0]) / TRAIL.texel)
  const row = Math.floor((testPt[1] - trail.rect[1]) / TRAIL.texel)
  const idx = row * trail.size[0] + col

  for (let step = 0; step <= 20; step++) {
    const t = step * dt
    stampSegment(trail, null, center, TRAIL.radius, t, 'hand')
    stepTrail(trail, t, 'swing')

    if (trail.bytes[idx * 2] >= expectedByte && reachTime < 0) {
      reachedFull = true
      reachTime = t
    }
  }

  assert.ok(reachedFull, 'texel at 0.6 of radius reaches full push')
  assert.ok(
    Math.abs(reachTime - TRAIL.rise) <= dt * 1.01,
    `reached full push by rise (${reachTime} vs ${TRAIL.rise})`,
  )

  // Points away from centre: dx > 0, dz ~ 0
  const [px, pz] = getTexelPush(trail, testPt[0], testPt[1])
  assert.ok(px > 0.1, `points away along +x (${px})`)
  assert.ok(Math.abs(pz) < 0.02, `no z push (${pz})`)

  // Centre texel push is 0
  const [cx, cz] = getTexelPush(trail, center[0], center[1])
  assert.equal(Math.hypot(cx, cz), 0, 'centre texel push is 0')
})

test('a moving hand retargets without restarting', () => {
  const trail = createTrail([0, 0, 0.4, 0.4])
  const targetTexel: [number, number] = [0.2025, 0.2025]
  const dt = 1 / 60

  // Point A at distance r1 where target is ~0.3: (1 - q)^2 = 0.3 => q = 1 - sqrt(0.3) ~ 0.452
  const d1 = (1 - Math.sqrt(0.3)) * TRAIL.radius
  const pA: [number, number] = [targetTexel[0] - d1, targetTexel[1]]

  // Step 2 frames
  let now = 0
  stampSegment(trail, null, pA, TRAIL.radius, now, 'hand')
  stepTrail(trail, now, 'swing')

  now += dt
  stampSegment(trail, null, pA, TRAIL.radius, now, 'hand')
  stepTrail(trail, now, 'swing')
  const pushBefore = getTexelPush(trail, targetTexel[0], targetTexel[1])[0]

  // Now hand moves to Point B at distance r2 where target is ~0.6: (1 - q)^2 = 0.6 => q = 1 - sqrt(0.6) ~ 0.225
  const d2 = (1 - Math.sqrt(0.6)) * TRAIL.radius
  const pB: [number, number] = [targetTexel[0] - d2, targetTexel[1]]

  now += dt
  stampSegment(trail, null, pB, TRAIL.radius, now, 'hand')
  stepTrail(trail, now, 'swing')
  const pushAfter = getTexelPush(trail, targetTexel[0], targetTexel[1])[0]

  assert.ok(pushAfter >= pushBefore - 1e-4, `push never drops on retarget (${pushAfter} >= ${pushBefore})`)

  // And continues rising in subsequent frames
  now += dt
  stampSegment(trail, null, pB, TRAIL.radius, now, 'hand')
  stepTrail(trail, now, 'swing')
  const pushNext = getTexelPush(trail, targetTexel[0], targetTexel[1])[0]
  assert.ok(pushNext > pushAfter, `push keeps rising (${pushNext} > ${pushAfter})`)
})

test('released, it swings back and closes', () => {
  const trail = createTrail([0, 0, 0.4, 0.4])
  const center: [number, number] = [0.2025, 0.2025]
  const testPt: [number, number] = [center[0] + 0.6 * TRAIL.radius, center[1]]

  // Stamp until held
  for (let t = 0; t <= TRAIL.rise + 0.02; t += 0.02) {
    stampSegment(trail, null, center, TRAIL.radius, t, 'hand')
    stepTrail(trail, t, 'swing')
  }

  const releaseTime = TRAIL.rise + 0.04
  // Do not stamp -> releases at step
  stepTrail(trail, releaseTime, 'swing')

  // Check swing: between period / 4 and period / 2 after release, push changes sign
  const tQuarter = releaseTime + TRAIL.period / 4
  const tHalf = releaseTime + TRAIL.period / 2

  stepTrail(trail, tQuarter, 'swing')
  const pushQuarter = getTexelPush(trail, testPt[0], testPt[1])[0]

  stepTrail(trail, tHalf, 'swing')
  const pushHalf = getTexelPush(trail, testPt[0], testPt[1])[0]

  assert.ok(pushQuarter >= -0.05, `positive or near zero at quarter (${pushQuarter})`)
  assert.ok(pushHalf < -0.05, `negative at half (${pushHalf})`)
  assert.ok(pushQuarter * pushHalf <= 0 || pushHalf < 0, 'push changed sign between period/4 and period/2')

  // From windowEnd on, push is exactly 0 and live list is empty
  const tEnd = releaseTime + TRAIL.windowEnd + 0.05
  stepTrail(trail, tEnd, 'swing')
  const pushEnd = getTexelPush(trail, testPt[0], testPt[1])[0]
  assert.equal(pushEnd, 0, 'push is exactly 0 after windowEnd')
  assert.equal(trail.live.size, 0, 'live list is empty after windowEnd')
})

test('settle never crosses zero', () => {
  // Case A: held, released in settle -> falls monotonically to 0 by rise
  const trailA = createTrail([0, 0, 0.4, 0.4])
  const center: [number, number] = [0.2025, 0.2025]
  const testPt: [number, number] = [center[0] + 0.5 * TRAIL.radius, center[1]]

  for (let t = 0; t <= TRAIL.rise + 0.02; t += 0.02) {
    stampSegment(trailA, null, center, TRAIL.radius, t, 'hand')
    stepTrail(trailA, t, 'swing')
  }

  const releaseA = TRAIL.rise + 0.04
  stepTrail(trailA, releaseA, 'settle') // release in settle

  let prevA = getTexelPush(trailA, testPt[0], testPt[1])[0]
  assert.ok(prevA > 0)

  for (let t = releaseA + 0.02; t <= releaseA + TRAIL.rise + 0.04; t += 0.02) {
    stepTrail(trailA, t, 'settle')
    const currA = getTexelPush(trailA, testPt[0], testPt[1])[0]
    assert.ok(currA <= prevA + 1e-6, `monotonically falls: ${currA} <= ${prevA}`)
    assert.ok(currA >= 0, `never crosses zero: ${currA} >= 0`)
    prevA = currA
  }
  assert.equal(prevA, 0, 'falls to 0 by rise')

  // Case B: swinging negative in swing mode, then switched to settle -> rises monotonically to 0, never crosses zero
  const trailB = createTrail([0, 0, 0.4, 0.4])
  for (let t = 0; t <= TRAIL.rise + 0.02; t += 0.02) {
    stampSegment(trailB, null, center, TRAIL.radius, t, 'hand')
    stepTrail(trailB, t, 'swing')
  }
  const releaseB = TRAIL.rise + 0.04
  stepTrail(trailB, releaseB, 'swing')

  // Advance to mid-swing negative
  const tNeg = releaseB + TRAIL.period / 2
  stepTrail(trailB, tNeg, 'swing')
  let prevB = getTexelPush(trailB, testPt[0], testPt[1])[0]
  assert.ok(prevB < -0.05, `mid-swing is negative: ${prevB}`)

  // Switch to settle
  for (let t = tNeg + 0.02; t <= tNeg + TRAIL.rise + 0.04; t += 0.02) {
    stepTrail(trailB, t, 'settle')
    const currB = getTexelPush(trailB, testPt[0], testPt[1])[0]
    assert.ok(currB >= prevB - 1e-6, `monotonically rises: ${currB} >= ${prevB}`)
    assert.ok(currB <= 0, `never crosses zero: ${currB} <= 0`)
    prevB = currB
  }
  assert.equal(prevB, 0, 'rises to 0 by rise')
})

test('frozen holds still and resumes', () => {
  const center: [number, number] = [0.2025, 0.2025]
  const testPt: [number, number] = [center[0] + 0.5 * TRAIL.radius, center[1]]

  // Case 1: 0.05 s after release
  // Case 2: 0.5 s after release (mid-swing, negative)
  for (const freezeDelay of [0.05, 0.5]) {
    const trail = createTrail([0, 0, 0.4, 0.4])
    for (let t = 0; t <= TRAIL.rise + 0.02; t += 0.02) {
      stampSegment(trail, null, center, TRAIL.radius, t, 'hand')
      stepTrail(trail, t, 'swing')
    }
    const release = TRAIL.rise + 0.04
    stepTrail(trail, release, 'swing')

    const tFreeze = release + freezeDelay
    stepTrail(trail, tFreeze, 'frozen')
    const pushAtFreeze = getTexelPush(trail, testPt[0], testPt[1])[0]
    const bytesFrozen = new Uint8Array(trail.bytes)

    // Frozen for 2 s
    for (let dt = 0.2; dt <= 2.0; dt += 0.2) {
      stampSegment(trail, null, [0.3, 0.3], TRAIL.radius, tFreeze + dt, 'hand')
      const changed = stepTrail(trail, tFreeze + dt, 'frozen')
      assert.equal(changed, false, 'stepTrail while frozen returns false')
      assert.deepEqual(trail.bytes, bytesFrozen, 'bytes stay identical over 2 s frozen')
    }

    // Back in swing with frozen time left out: resumed at tFreeze + 2.0
    stepTrail(trail, tFreeze + 2.0, 'swing')
    const pushAfterResume = getTexelPush(trail, testPt[0], testPt[1])[0]
    assert.equal(pushAfterResume, pushAtFreeze, 'push continues exactly from frozen value')
  }
})

test('a fling is a line', () => {
  const trail = createTrail([0, 0, 0.8, 0.4])
  const from: [number, number] = [0.1, 0.2]
  const to: [number, number] = [0.6, 0.2]

  stampSegment(trail, from, to, TRAIL.radius, 0, 'hand')
  stepTrail(trail, TRAIL.rise, 'swing')

  // Sample texels on the line between from and to
  for (let x = 0.12; x <= 0.58; x += 0.02) {
    const [px] = getTexelPush(trail, x, 0.2)
    assert.ok(px > 0.5, `texel at x=${x} has push > 0.5 (${px})`)
  }

  // Negative control: stamping only the end point leaves a gap
  const trail2 = createTrail([0, 0, 0.8, 0.4])
  stampSegment(trail2, null, to, TRAIL.radius, 0, 'hand')
  stepTrail(trail2, TRAIL.rise, 'swing')

  const [midPx] = getTexelPush(trail2, 0.35, 0.2)
  assert.equal(midPx, 0, 'stamping only end point leaves gap in the middle')
})

test('the stronger push is kept', () => {
  const trail = createTrail([0, 0, 0.4, 0.4])
  const texel: [number, number] = [0.2025, 0.2025]

  // Strong stamp (close to texel, target ~ 0.8)
  const dStrong = (1 - Math.sqrt(0.8)) * TRAIL.radius
  stampSegment(trail, null, [texel[0] - dStrong, texel[1]], TRAIL.radius, 0, 'hand')

  // Weak stamp over it (farther, target ~ 0.2)
  const dWeak = (1 - Math.sqrt(0.2)) * TRAIL.radius
  stampSegment(trail, null, [texel[0] - dWeak, texel[1]], TRAIL.radius, 0, 'hand')

  stepTrail(trail, TRAIL.rise, 'swing')
  const push = getTexelPush(trail, texel[0], texel[1])[0]
  assert.ok(push > 0.75, `stronger push is kept (${push} > 0.75)`)
})

test('outside the map nothing is stamped, outside the radius nothing changes', () => {
  const trail = createTrail([0.1, 0.1, 0.2, 0.2])
  // Stamp outside map
  stampSegment(trail, null, [-0.5, -0.5], TRAIL.radius, 0, 'hand')
  stepTrail(trail, TRAIL.rise, 'swing')
  assert.equal(trail.live.size, 0, 'nothing stamped outside map')

  // Stamp inside at center
  const center: [number, number] = [0.2025, 0.2025]
  stampSegment(trail, null, center, TRAIL.radius, 0, 'hand')
  stepTrail(trail, TRAIL.rise, 'swing')

  // Outside radius nothing changes
  const farPt: [number, number] = [center[0] + TRAIL.radius + 0.02, center[1]]
  const [farPx, farPz] = getTexelPush(trail, farPt[0], farPt[1])
  assert.equal(farPx, 0)
  assert.equal(farPz, 0)
})

test('the bytes', () => {
  // Push -1, 0, 1 encode as 1, 128, 255
  assert.equal(encodePush(-1), 1)
  assert.equal(encodePush(0), 128)
  assert.equal(encodePush(1), 255)
})
