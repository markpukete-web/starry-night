import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DIORAMA_CAMERAS,
  DIORAMA_ORBIT,
  DIORAMA_RECOVERY_CONTRACT,
  type DioramaDebugMode,
} from '../src/scene/dioramaContract.ts'
import {
  dioramaSourceEdgeFade,
  SIDE_BORDER_U,
  SIDE_EXTEND_U,
  SIDE_FADE_START_U,
} from '../src/scene/dioramaSkyProjection.ts'

test('diorama orbit cannot pan or zoom out of the authored envelope', () => {
  assert.equal(DIORAMA_ORBIT.enablePan, false)
  assert.ok(DIORAMA_ORBIT.minDistance >= 3)
  assert.ok(DIORAMA_ORBIT.maxDistance <= 5.6)
  assert.ok(DIORAMA_ORBIT.minAzimuthAngle >= -Math.PI / 12)
  assert.ok(DIORAMA_ORBIT.maxAzimuthAngle <= Math.PI / 4)
  assert.ok(DIORAMA_ORBIT.maxPolarAngle <= 1.62)
})

test('diorama exposes a painting-flow debug route', () => {
  const mode: DioramaDebugMode = 'flow'
  assert.equal(mode, 'flow')
})

test('every authored camera renders as authored — inside the orbit envelope, not clamped', () => {
  // The portrait camera used to ask for distance 9.18 against a maxDistance of 5.6, so
  // OrbitControls silently pulled it in on its first update() and the framing shipped a third
  // closer than the numbers claimed (2026-07-28). A camera outside the envelope is a wish.
  for (const [name, camera] of Object.entries(DIORAMA_CAMERAS)) {
    const [px, py, pz] = camera.position
    const [tx, ty, tz] = camera.target
    const [ox, oy, oz] = [px - tx, py - ty, pz - tz]
    const distance = Math.hypot(ox, oy, oz)
    const azimuth = Math.atan2(ox, oz)
    const polar = Math.acos(oy / distance)
    assert.ok(
      distance >= DIORAMA_ORBIT.minDistance && distance <= DIORAMA_ORBIT.maxDistance,
      `${name}: distance ${distance.toFixed(2)} outside [${DIORAMA_ORBIT.minDistance}, ${DIORAMA_ORBIT.maxDistance}] — will be clamped`,
    )
    assert.ok(
      azimuth >= DIORAMA_ORBIT.minAzimuthAngle && azimuth <= DIORAMA_ORBIT.maxAzimuthAngle,
      `${name}: azimuth ${azimuth.toFixed(3)} outside the authored arc — will be clamped`,
    )
    assert.ok(
      polar >= DIORAMA_ORBIT.minPolarAngle && polar <= DIORAMA_ORBIT.maxPolarAngle,
      `${name}: polar ${polar.toFixed(3)} outside [${DIORAMA_ORBIT.minPolarAngle}, ${DIORAMA_ORBIT.maxPolarAngle}] — will be clamped`,
    )
  }
})

test('portrait home holds the whole composition — Mark 2026-07-28, checklist item 2', () => {
  // The accepted trade: everything in frame, letterboxed. Guards against a silent revert to a
  // pose that drops the cypress or clips the moon.
  const portrait = DIORAMA_CAMERAS.mobile
  assert.equal(portrait.pose.azimuthDeg, -15)
  assert.equal(portrait.pose.fov, 88)
  assert.equal(portrait.pose.distance, 5.4)
})

test('painting-first design camera stays close to the front composition basis', () => {
  assert.ok(DIORAMA_CAMERAS.design.position[2] >= 5)
  assert.ok(DIORAMA_CAMERAS.design.position[1] < 1.35)
  assert.ok(DIORAMA_CAMERAS.design.fov >= 49)
  assert.ok(DIORAMA_CAMERAS.mobile.fov > DIORAMA_CAMERAS.design.fov)
})

test('S4 side fade: full paint across the canvas and inner strips, gone at the strip edge', () => {
  // the canvas itself never side-fades any more — the strips own the melt
  assert.equal(dioramaSourceEdgeFade(0.5, 0.4), 1)
  assert.equal(dioramaSourceEdgeFade(0, 0.4), 1)
  assert.equal(dioramaSourceEdgeFade(1, 0.4), 1)
  // full paint through the measured exposure envelope, zero by the strip's outer edge
  assert.equal(dioramaSourceEdgeFade(-SIDE_FADE_START_U, 0.4), 1)
  assert.equal(dioramaSourceEdgeFade(1 + SIDE_FADE_START_U, 0.4), 1)
  assert.equal(dioramaSourceEdgeFade(-SIDE_EXTEND_U, 0.4), 0)
  assert.equal(dioramaSourceEdgeFade(1 + SIDE_EXTEND_U, 0.4), 0)
  const mid = dioramaSourceEdgeFade(-(SIDE_FADE_START_U + SIDE_EXTEND_U) / 2, 0.4)
  assert.ok(mid > 0 && mid < 1, `fade zone should be partial, got ${mid}`)
  // the weave border the strips own sits well inside the full-paint zone
  assert.ok(SIDE_BORDER_U > 0 && SIDE_BORDER_U < SIDE_FADE_START_U)
})

test('diorama recovery preserves source ribbons and rejects native dome replacement', () => {
  assert.equal(DIORAMA_RECOVERY_CONTRACT.preserveSourceSpaceRibbons, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.sourceAuthoredHalosRemainReadableWithoutBloom, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.rejectNativeDomeReplacement, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.frontArcOnlyForThisSlice, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.isolateCypressAndEdgeFixes, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.cameraLockedSourceSkyForFrontArc, true)
})
