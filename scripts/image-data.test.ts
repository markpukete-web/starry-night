import assert from 'node:assert/strict'
import test from 'node:test'
import { readPixels, type ImageData2D } from '../src/scene/useImageData.ts'

// `readPixels` is the image's `onload`: a canvas the size of the image, drawn and read back. The browser's globals are
// stubbed, so each case can make one step fail (the audit, item 11b)
type Canvas = { width: number; height: number; getContext: () => unknown }

function run(canvas: Canvas) {
  const g = globalThis as { document?: unknown }
  const before = g.document
  g.document = { createElement: () => canvas }
  const done: ImageData2D[] = []
  let failed = 0
  const logged: unknown[][] = []
  const error = console.error
  console.error = (...args: unknown[]) => logged.push(args)
  try {
    readPixels({ naturalWidth: 2, naturalHeight: 1, src: '/reference/x.png' } as HTMLImageElement, (p) => done.push(p), () => failed++)
  } finally {
    console.error = error
    g.document = before
  }
  return { done, failed, logged }
}

const context = (over: Record<string, unknown> = {}) => ({
  drawImage: () => {},
  getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).fill(7) }),
  ...over,
})

test('readPixels: a loaded image hands its pixels on and fails nothing', () => {
  const r = run({ width: 0, height: 0, getContext: () => context() })
  assert.equal(r.failed, 0)
  assert.equal(r.done.length, 1)
  assert.deepEqual([r.done[0].width, r.done[0].height, r.done[0].data.length, r.done[0].data[0]], [2, 1, 8, 7])
  assert.equal(r.logged.length, 0)
})

for (const [name, canvas] of [
  ['no 2D context', { width: 0, height: 0, getContext: () => null }],
  ['a draw that throws', { width: 0, height: 0, getContext: () => context({ drawImage: () => { throw new Error('draw failed') } }) }],
  ['a read-back that throws (a tainted canvas)', { width: 0, height: 0, getContext: () => context({ getImageData: () => { throw new Error('SecurityError') } }) }],
] as const) {
  test(`readPixels: ${name} fails once with the cause logged, so a caller waiting on the pixels stops waiting`, () => {
    let r: ReturnType<typeof run> | undefined
    assert.doesNotThrow(() => {
      r = run(canvas)
    })
    assert.equal(r!.failed, 1, 'failed once')
    assert.equal(r!.done.length, 0, 'no pixels')
    assert.equal(r!.logged.length, 1, 'one console.error')
    assert.ok(r!.logged[0].some((a) => a instanceof Error), 'the cause is in the log')
    assert.ok(r!.logged[0].some((a) => typeof a === 'string' && a.includes('/reference/x.png')), 'the log names the image')
  })
}
