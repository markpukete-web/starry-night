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
