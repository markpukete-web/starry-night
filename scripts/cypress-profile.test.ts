/** Public contracts for the shared runtime/diagnostic cypress profile. */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CYPRESS_LUM_MAX,
  CYPRESS_PROFILE_CONFIG,
  composedRadius,
  makeCypressProfile,
  projectedHalfWidth,
  tongue,
} from '../src/scene/cypressProfile.ts'

const SLICES = [0.12, 0.2, 0.11, 0.18, 0.08, 0.03]

test('runtime and diagnostic construct the same named baseline', () => {
  assert.equal(CYPRESS_LUM_MAX, 90)
  assert.deepEqual(makeCypressProfile(SLICES), {
    slices: SLICES,
    ...CYPRESS_PROFILE_CONFIG,
  })
})

test('composedRadius is positive and finite across the whole surface', () => {
  const profile = makeCypressProfile(SLICES)
  for (let height = 0; height <= 1; height += 0.025) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const radius = composedRadius(height, angle, profile)
      assert.ok(Number.isFinite(radius) && radius >= 0.015)
    }
  }
})

test('upper taper reduces the tip without changing the base', () => {
  const baseline = makeCypressProfile(SLICES)
  const withTaper = { ...baseline, useUpperTaper: true }
  const withoutTaper = { ...baseline, useUpperTaper: false }
  assert.ok(
    Math.abs(composedRadius(0, 0, withTaper) - composedRadius(0, 0, withoutTaper)) < 1e-9,
  )
  assert.ok(composedRadius(1, 0, withTaper) < composedRadius(1, 0, withoutTaper) * 0.7)
})

test('smoothing removes a narrow waist rather than moving the endpoints', () => {
  const raw = { ...makeCypressProfile(SLICES), useTongue: false, useUpperTaper: false }
  const smoothed = { ...raw, smoothingWindow: 1 }
  assert.ok(composedRadius(0.4, 0, smoothed) > composedRadius(0.4, 0, raw))
  assert.ok(composedRadius(0, 0, smoothed) > 0)
  assert.ok(composedRadius(1, 0, smoothed) > 0)
})

test('tongue displacement is deterministic and low-frequency around the form', () => {
  assert.equal(tongue(0.75, 0.8), tongue(0.75, 0.8))
  const samples = Array.from({ length: 64 }, (_, i) => tongue((i / 64) * Math.PI * 2, 0.8))
  let signChanges = 0
  for (let i = 1; i < samples.length; i++) {
    if (Math.sign(samples[i]) !== Math.sign(samples[i - 1])) signChanges++
  }
  assert.ok(signChanges < 24, `tongue displacement is too noisy: ${signChanges} sign changes`)
})

test('projectedHalfWidth measures the visible rim rather than an angular average', () => {
  const profile = { ...makeCypressProfile(SLICES), useTongue: true }
  const projected = projectedHalfWidth(0.7, 1.2, profile, 128)
  const mean =
    Array.from({ length: 128 }, (_, i) =>
      composedRadius(0.7, (i / 128) * Math.PI * 2, profile),
    ).reduce((sum, radius) => sum + radius, 0) / 128
  assert.ok(projected > mean * 0.75, `projected rim collapsed to an average: ${projected}`)
})

test('the shipping profile tapers continuously instead of preserving the extracted hourglass', () => {
  const profile = { ...makeCypressProfile(SLICES), useTongue: false }
  assert.equal(profile.useContinuousTaper, true)
  const radii = [0, 0.2, 0.4, 0.6, 0.8, 1].map((height) =>
    composedRadius(height, 0, profile),
  )
  for (let i = 1; i < radii.length; i++) {
    assert.ok(radii[i] < radii[i - 1], `profile swelled from ${radii[i - 1]} to ${radii[i]}`)
  }
  assert.ok(radii.at(-1)! < radii[0] * 0.12, 'the tip must be pointed rather than blunt')
})
