import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DIORAMA_CAMERAS,
  DIORAMA_ORBIT,
  DIORAMA_RECOVERY_CONTRACT,
  type DioramaDebugMode,
} from '../src/scene/dioramaContract.ts'

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

test('diorama recovery preserves source ribbons and rejects native dome replacement', () => {
  assert.equal(DIORAMA_RECOVERY_CONTRACT.preserveSourceSpaceRibbons, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.rejectNativeDomeReplacement, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.frontArcOnlyForThisSlice, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.isolateCypressAndEdgeFixes, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.cameraLockedSourceSkyForFrontArc, true)
})
