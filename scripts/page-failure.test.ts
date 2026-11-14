import assert from 'node:assert/strict'
import test from 'node:test'

// `failPage` is what the page's error boundary does when a scene throws (the audit, item 6). The browser's globals are
// stubbed. `bootCurtain.ts` keeps whether it dropped the curtain, so each case imports its own copy of the module.
type Seams = { __skyReady?: boolean; __streetReady?: boolean }

async function failWith(boot: boolean, copy: string) {
  const { failPage } = (await import(`../src/bootCurtain.ts?${copy}`)) as typeof import('../src/bootCurtain.ts')
  const g = globalThis as { document?: unknown; window?: unknown }
  let removed = 0
  const classes: string[] = []
  const w: Seams = { __skyReady: false, __streetReady: false }
  g.document = {
    getElementById: (id: string) => (id === 'boot' && boot ? { remove: () => removed++ } : null),
    documentElement: { classList: { add: (name: string) => classes.push(name) } },
  }
  g.window = w
  const logged: unknown[][] = []
  const error = console.error
  console.error = (...args: unknown[]) => logged.push(args)
  const cause = new Error('Could not load /reference/sky-mask.png')
  try {
    failPage(cause)
  } finally {
    console.error = error
  }
  // a canvas unmounts in its own root after the catch, and a sky that had mounted writes false on its way out
  w.__skyReady = false
  w.__streetReady = false
  const result = { removed, classes, sky: w.__skyReady, street: w.__streetReady, logged, cause }
  delete g.document
  delete g.window
  return result
}

for (const boot of [true, false]) {
  test(`failPage ${boot ? 'with the loading curtain up' : 'with the curtain already gone'}: no curtain, the cue hidden, the ready seams held true, one console.error with the cause`, async () => {
    const r = await failWith(boot, boot ? 'up' : 'gone')
    assert.equal(r.removed, boot ? 1 : 0, 'the curtain is removed, so one painting shows: the fallback\'s')
    assert.deepEqual(r.classes, ['arrival-failed'], 'the failed state hides the cue')
    assert.equal(r.sky, true, '__skyReady holds true after a later write of false')
    assert.equal(r.street, true, '__streetReady holds true after a later write of false')
    assert.equal(r.logged.length, 1, 'one console.error')
    assert.ok(r.logged[0].includes(r.cause), 'the cause is in the log')
    assert.ok(r.logged[0].some((a) => typeof a === 'string' && /failed/.test(a)), 'the log says the page failed')
  })
}
