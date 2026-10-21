/** D1 — touch the land: the model (tasks/2026-10-20-touch-land-d1-plan.md, D1.1 with Codex F1, F5, F7, F10; the rebase's R1). */

import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

import { concatInjections, injectAliveSource } from '../src/scene/aliveMaterial.ts'
import { ALIVE_DEFAULTS, ALIVE_KNOB_MAX, ALIVE_KNOBS, ALIVE_TUNING_KEYS, readAliveTuning } from '../src/scene/skyAlive.ts'
import {
  beginHeld,
  bendInjection,
  closing,
  followHeld,
  isLive,
  LAND_TOUCH,
  landAmplitude,
  landDisplacement,
  landFalloff,
  landLateral,
  landUniformValues,
  NO_RELEASE,
  emptyLandStore,
  pruneLand,
  pushTap,
  releaseHeld,
  type LandStore,
  type LandTouch,
} from '../src/scene/landTouch.ts'

const T = LAND_TOUCH
const held = (t0: number, amp = 1, from = 0): LandTouch => ({ x: 0, y: 0, z: 0, t0, amp, from, release: NO_RELEASE })

test('L1 amplitude: a held touch rises from 0 at t0 to amp by t0 + rise and stays; the swing starts from the value it had, overshoots, and is exactly 0 from release + windowEnd', () => {
  const k = held(10)
  assert.equal(landAmplitude(k, 10), 0, 'the t0 frame is the no-input frame')
  assert.ok(landAmplitude(k, 10 + T.rise / 2) > 0 && landAmplitude(k, 10 + T.rise / 2) < 1)
  assert.equal(landAmplitude(k, 10 + T.rise), 1)
  assert.equal(landAmplitude(k, 20), 1, 'held: stays')
  const released: LandTouch = { ...k, release: 12 }
  assert.equal(landAmplitude(released, 12), landAmplitude(k, 12), 'continuous at the release')
  let minimum = Infinity
  let peak = 0
  for (let t = 12; t <= 12 + T.windowEnd; t += 0.01) {
    const a = landAmplitude(released, t)
    minimum = Math.min(minimum, a)
    peak = Math.max(peak, Math.abs(a))
  }
  assert.ok(minimum < -0.05, `the swing overshoots the other way (min ${minimum.toFixed(3)})`)
  assert.ok(peak <= 1 + 1e-9, 'never beyond the held value')
  assert.equal(landAmplitude(released, 12 + T.windowEnd), 0, 'exactly 0 from windowEnd')
  assert.equal(landAmplitude(released, 12 + T.windowEnd + 3), 0)
  // a tap: held for rise, then released from exactly amp
  const tap: LandTouch = { ...held(5), release: 5 + T.rise }
  assert.equal(landAmplitude(tap, 5 + T.rise), 1)
  // F5: a retarget ramps from the amplitude it had, never a jump
  const hover = held(0, T.hoverAmp)
  const pressed: LandTouch = { ...hover, from: landAmplitude(hover, 2), amp: 1, t0: 2 }
  assert.equal(landAmplitude(pressed, 2), T.hoverAmp, 'the press starts where the hover was')
  assert.equal(landAmplitude(pressed, 2 + T.rise), 1)
  assert.equal(closing(T.windowEnd), 0)
  assert.equal(closing(T.windowStart), 1)
})

test('L2 falloffs: the hat is 1 at 0, exactly 0 at and beyond radius, monotone down; the lateral field is 0 at the centre, peaks at 1 inside, and is 0 beyond radius', () => {
  assert.equal(landFalloff(0), 1)
  assert.equal(landFalloff(T.radius), 0)
  assert.equal(landFalloff(T.radius * 3), 0)
  let previous = 1
  for (let d = 0; d <= T.radius; d += T.radius / 50) {
    const f = landFalloff(d)
    assert.ok(f <= previous + 1e-12, 'monotone')
    previous = f
  }
  assert.equal(landLateral(0), 0, 'a smooth vector field vanishes at the touch (Codex F1)')
  let peak = 0
  for (let d = 0; d <= T.radius; d += T.radius / 500) peak = Math.max(peak, landLateral(d))
  assert.ok(Math.abs(peak - 1) < 2e-3, `the lateral field peaks at 1 (${peak.toFixed(4)})`)
  assert.equal(landLateral(T.radius), 0)
  assert.equal(landLateral(T.radius * 2), 0)
})

test('L3 displacement: zero bend moves nothing; at the touch point the vertex only dips; across the centre the lateral push is continuous and away from the point; finite support', () => {
  const touch = { x: 1, y: 0, z: 1, amp: 1 }
  assert.deepEqual(landDisplacement([1.1, 0.5, 1], 0, [touch], T.push), [0, 0, 0])
  const at = landDisplacement([1, 0.5, 1], 1, [touch], T.push)
  assert.equal(at[0], 0)
  assert.equal(at[2], 0)
  assert.ok(Math.abs(at[1] + T.push * T.down) < 1e-12, 'the centre dips by down × push')
  const right = landDisplacement([1.2, 0.5, 1], 1, [touch], T.push)
  assert.ok(right[0] > 0 && Math.abs(right[2]) < 1e-12, 'pushed away along +x')
  // a sweep across the centre: the lateral push changes sign smoothly, with no jump (Codex F1)
  let last = landDisplacement([1 - 0.05, 0.5, 1], 1, [touch], T.push)[0]
  for (let dx = -0.05 + 1e-3; dx <= 0.05; dx += 1e-3) {
    const now = landDisplacement([1 + dx, 0.5, 1], 1, [touch], T.push)[0]
    assert.ok(Math.abs(now - last) < T.push * 0.05, `no jump across the centre at dx ${dx.toFixed(3)}`)
    last = now
  }
  assert.deepEqual(landDisplacement([1 + T.radius, 0.5, 1], 1, [touch], T.push), [0, 0, 0], 'exactly 0 at radius')
  assert.deepEqual(landDisplacement([1 + T.radius * 2, 0.5, 1], 1, [touch], T.push), [0, 0, 0])
})

test('L4 the store: beginHeld releases the previous held one and adds; a fifth live touch is refused; followHeld moves the held one and begins one when none is held; pushTap holds for rise; pruneLand keeps the held one and every unclosed swing; admission counts live touches, not the raw list (Codex F10)', () => {
  let s: LandStore = emptyLandStore()
  s = beginHeld(s, [0, 0, 0], T.hoverAmp, 1)
  assert.equal(s.touches.length, 1)
  assert.equal(s.heldIndex, 0)
  s = beginHeld(s, [1, 0, 0], 1, 2)
  assert.equal(s.touches.length, 2)
  assert.equal(s.touches[0].release, 2, 'the previous held one is released')
  assert.equal(s.heldIndex, 1)
  s = followHeld(s, [1.5, 0, 0], 1, 3)
  assert.equal(s.touches[1].x, 1.5)
  assert.equal(s.touches.length, 2, 'following moves, never adds')
  s = releaseHeld(s, 4)
  assert.equal(s.heldIndex, -1)
  s = followHeld(s, [2, 0, 0], T.hoverAmp, 5)
  assert.equal(s.touches.length, 3, 'a follow with nothing held begins one')
  s = pushTap(s, [3, 0, 0], 1, 6)
  assert.equal(s.touches.length, 4)
  assert.equal(s.touches[3].release, 6 + T.rise, 'a tap is held for rise')
  const refused = pushTap(s, [4, 0, 0], 1, 6.1)
  assert.equal(refused.touches.length, 4, 'a fifth live touch is refused')
  // the closed ones await the prune: admission looks at what is live at now, not the list's length
  const later = 6 + T.windowEnd + 1
  const admitted = pushTap(s, [4, 0, 0], 1, later)
  assert.equal(admitted.touches.filter((k) => isLive(k, later)).length, 1, 'only the new one is live')
  const pruned = pruneLand(s, later)
  assert.equal(pruned.touches.length, 0, 'every swing closed')
  // the held one is never pruned, whatever its age
  const holding = beginHeld(emptyLandStore(), [0, 0, 0], 1, 0)
  assert.equal(pruneLand(holding, 1000).touches.length, 1)
  assert.equal(pruneLand(holding, 1000).heldIndex, 0)
  // F5: a press over a hover ramps from the hover's amplitude
  const hovered = followHeld(emptyLandStore(), [0, 0, 0], T.hoverAmp, 0)
  const pressed = followHeld(hovered, [0, 0, 0], 1, 1)
  assert.equal(pressed.touches[0].from, T.hoverAmp)
  assert.equal(pressed.touches[0].t0, 1)
  assert.equal(pressed.touches[0].amp, 1)
})

test('L5 uniforms: zero amplitudes are left out, the offset subtracted, the count right, never more than maxTouches', () => {
  let s: LandStore = emptyLandStore()
  s = pushTap(s, [1, 2, 3], 1, 0)
  s = pushTap(s, [4, 5, 6], 1, 0)
  const atZero = landUniformValues(s, 0, [1, 1, 1])
  assert.equal(atZero.count, 0, 'the t0 frame packs nothing')
  const later = landUniformValues(s, 0 + T.rise, [1, 1, 1])
  assert.equal(later.count, 2)
  assert.deepEqual(later.entries.slice(0, 4), [0, 1, 2, 1])
  assert.deepEqual(later.entries.slice(4, 8), [3, 4, 5, 1])
  assert.equal(later.entries.length, 4 * later.count)
})

test('L6 the injection: the bend transform lands after <begin_vertex> once with the given weight expression; the attribute is declared only when asked; a shader without the marker throws', () => {
  const island = bendInjection({ weight: 'aBend', attribute: 'aBend' })
  const cypress = bendInjection({ weight: 'clamp(transformed.y / 2.7, 0.0, 1.0)' })
  assert.ok(island.vertexHead.includes('attribute float aBend;'))
  assert.ok(!cypress.vertexHead.includes('attribute float aBend;'))
  assert.ok(island.vertexTransform?.includes('landBend(transformed, aBend)'))
  assert.ok(cypress.vertexTransform?.includes('landBend(transformed, clamp(transformed.y / 2.7, 0.0, 1.0))'))
  assert.ok(island.vertexHead.includes(`uniform vec4 uLand[${T.maxTouches}];`), 'the array length from maxTouches')
  const vertex = 'void main() {\n#include <common>\n#include <begin_vertex>\n#include <color_vertex>\n}'
  const fragment = 'void main() {\n#include <common>\n#include <color_fragment>\n}'
  const out = injectAliveSource(vertex, fragment, concatInjections('bend-test', { uniforms: {}, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }, island))
  assert.equal(out.vertexShader.split('#include <begin_vertex>').length, 2)
  assert.ok(out.vertexShader.includes('#include <begin_vertex>\n') && out.vertexShader.includes('transformed += landBend(transformed, aBend);'))
  assert.throws(() => injectAliveSource('void main() {\n#include <common>\n#include <color_vertex>\n}', fragment, island), /exactly one/)
  assert.ok(island.uniforms.uLand && island.uniforms.uLandCount && island.uniforms.uLandParams, 'its own uniform objects')
  assert.notEqual(island.uniforms.uLand, cypress.uniforms.uLand, 'one set per injection')
})

test('L7 the knob: bend is a tuning knob with its shipped key in sky-tuning.json and in the writer\'s allowlist (Codex F6), ceiling 1.5, default 1', () => {
  assert.equal(ALIVE_TUNING_KEYS.bend, 'touchBend')
  assert.equal(ALIVE_DEFAULTS.bend, 1)
  assert.equal(ALIVE_KNOB_MAX.bend, 1.5)
  assert.ok((ALIVE_KNOBS as readonly string[]).includes('bend'))
  const shipped = JSON.parse(readFileSync(new URL('../src/scene/sky-tuning.json', import.meta.url), 'utf8')) as Record<string, number>
  assert.equal(shipped.touchBend, 1, 'shipped at 1')
  // the writer's allowlist lives in vite.config.ts, which imports vite: checked as text, so a key the tuner saves is never silently dropped
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
  const allowlist = config.slice(config.indexOf('TUNING_FIELDS = new Set(['), config.indexOf('])', config.indexOf('TUNING_FIELDS = new Set([')))
  assert.ok(allowlist.includes("'touchBend'"), 'touchBend in the writer\'s allowlist')
  const url = new URLSearchParams('bend=9')
  assert.equal(readAliveTuning(url).bend, 1.5, 'clamped to the ceiling')
  assert.equal(readAliveTuning(new URLSearchParams('bend=')).bend, 1, 'an empty knob is the default')
})
