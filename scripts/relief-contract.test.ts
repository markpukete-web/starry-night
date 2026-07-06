import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RELIEF_CAPTURE,
  RELIEF_FRAMING,
  RELIEF_LAYERS,
  RELIEF_POINTER,
  RELIEF_VISUAL_CONTRACT,
} from '../src/scene/reliefContract.ts'

test('relief pointer movement is deliberately tiny and bounded', () => {
  assert.equal(RELIEF_POINTER.maxX, 0.012)
  assert.equal(RELIEF_POINTER.maxY, 0.008)
  assert.ok(RELIEF_POINTER.response >= 6)
  assert.ok(RELIEF_POINTER.response <= 10)
})

test('foreground layers are ordered in shallow relief depth', () => {
  assert.ok(RELIEF_LAYERS.cypress.depth > RELIEF_LAYERS.foreground.depth)
  assert.ok(RELIEF_LAYERS.cypress.shadowDepth < RELIEF_LAYERS.cypress.depth)
  assert.ok(RELIEF_LAYERS.foreground.shadowDepth < RELIEF_LAYERS.foreground.depth)
  assert.ok(RELIEF_LAYERS.cypress.opacity <= 0.65)
  assert.ok(RELIEF_LAYERS.foreground.opacity <= 0.45)
})

test('relief capture contract keeps deterministic review dimensions', () => {
  assert.equal(RELIEF_CAPTURE.designWidth, 1440)
  assert.equal(RELIEF_CAPTURE.designHeight, 960)
  assert.equal(RELIEF_CAPTURE.mobileWidth, 390)
  assert.equal(RELIEF_CAPTURE.mobileHeight, 844)
  assert.equal(RELIEF_CAPTURE.seed, 0x5712a3)
})

test('relief framing keeps portrait larger without becoming a full free crop', () => {
  assert.ok(RELIEF_FRAMING.desktop.zoom > 1)
  assert.ok(RELIEF_FRAMING.desktop.zoom < 1.1)
  assert.ok(RELIEF_FRAMING.mobile.zoom > RELIEF_FRAMING.desktop.zoom)
  assert.ok(RELIEF_FRAMING.mobile.zoom < 1.55)
  assert.ok(RELIEF_FRAMING.mobile.center[0] > 0.5)
  assert.ok(RELIEF_FRAMING.mobile.center[0] < 0.56)
})

test('relief visual contract rejects the failed diorama behaviours', () => {
  assert.ok(RELIEF_VISUAL_CONTRACT.rejects.some((item) => item.includes('sky card edge')))
  assert.ok(RELIEF_VISUAL_CONTRACT.rejects.some((item) => item.includes('black cone')))
  assert.ok(
    RELIEF_VISUAL_CONTRACT.invariants.some((item) => item.includes('pointer input moves only masked foreground')),
  )
})
