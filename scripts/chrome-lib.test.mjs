import assert from 'node:assert/strict'
import test from 'node:test'
import { CdpPage, PORTS, debugPort } from './lib/chrome.mjs'

test('CdpPage.send rejects with error.message on error reply', async () => {
  const page = new CdpPage()
  let sentId = null
  page.ws = {
    send(raw) {
      sentId = JSON.parse(raw).id
    },
  }
  const promise = page.send('Runtime.evaluate', { expression: '1' })
  page.onMessage({ data: JSON.stringify({ id: sentId, error: { code: -32000, message: 'boom' } }) })
  await assert.rejects(promise, (err) => err instanceof Error && err.message === 'boom')
})

test('CdpPage.send resolves with result on success reply', async () => {
  const page = new CdpPage()
  let sentId = null
  page.ws = {
    send(raw) {
      sentId = JSON.parse(raw).id
    },
  }
  const expected = { result: { type: 'number', value: 42 } }
  const promise = page.send('Runtime.evaluate', { expression: '42' })
  page.onMessage({ data: JSON.stringify({ id: sentId, result: expected }) })
  assert.deepEqual(await promise, expected)
})

test('CdpPage.waitFor throws its timeout message after its cap', async () => {
  const page = new CdpPage()
  page.evaluate = async () => false
  await assert.rejects(
    page.waitFor('window.__ready', 50, 'ready seam', 10),
    (err) => err instanceof Error && err.message === 'timed out after 50 ms waiting for ready seam',
  )
})

test('debugPort stays within [debug, debug + range) over 1,000 draws', () => {
  const row = PORTS['check-street-walk']
  for (let i = 0; i < 1000; i++) {
    const p = debugPort('check-street-walk')
    assert.ok(Number.isInteger(p) && p >= row.debug && p < row.debug + row.range, `out of range: ${p}`)
  }
})
