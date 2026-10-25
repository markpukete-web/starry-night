import assert from 'node:assert/strict'
import test from 'node:test'
import { lightness, measure, rectMask } from './grass-look.ts'
import { mulberry32 } from '../src/scene/brush.ts'

function image(w: number, h: number, grey: (x: number, y: number) => number) {
  const rgba = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.max(0, Math.min(255, Math.round(grey(x, y))))
      rgba.set([v, v, v, 255], (y * w + x) * 4)
    }
  }
  return { width: w, height: h, rgba }
}

test('lightness is CIE L*: black 0, white 100, mid-grey about 53', () => {
  assert.equal(lightness(0, 0, 0), 0)
  assert.ok(Math.abs(lightness(255, 255, 255) - 100) < 1e-6)
  assert.ok(Math.abs(lightness(128, 128, 128) - 53.6) < 0.2)
})

test('parallel stripes are coherent and point one way, noise is not', () => {
  // stripes running at 30° on screen (y up): grey varies across them
  const a = (30 * Math.PI) / 180
  const stripes = image(96, 96, (x, y) => 128 + 100 * Math.sin((-x * Math.sin(a) - y * Math.cos(a)) * 0.6))
  const s = measure(stripes, rectMask(96, 96, [0, 0, 96, 96]))
  assert.ok(s.coherence > 0.9, `stripes ${s.coherence}`)
  assert.ok(s.orientation[1] > 0.9, `30° falls in the 22.5–45° bin: ${s.orientation}`)
  const rand = mulberry32(7)
  const noise = image(96, 96, () => 255 * rand())
  const n = measure(noise, rectMask(96, 96, [0, 0, 96, 96]))
  // a σ 2 window averages about 50 independent gradients, so white noise keeps a coherence near 0.23
  assert.ok(n.coherence < 0.3, `noise ${n.coherence}`)
})

test('the shares and percentiles count only the mask', () => {
  const half = image(40, 40, (x) => (x < 20 ? 0 : 255))
  const left = measure(half, rectMask(40, 40, [0, 0, 20, 40]))
  assert.equal(left.under15, 1)
  assert.equal(left.L.p95, 0)
  assert.deepEqual(left.top2, [0, 0, 0])
})
