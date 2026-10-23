#!/usr/bin/env node
/**
 * Task 6, Step 4b: Verify the component applies the transform live in the browser.
 * On capture-diorama.mjs's CDP setup and drag:
 * - Load ?mode=diorama&clean=1&arrival=0
 * - Drag canvas 240 px right, wait 1.5 s, read __skyTransform()
 * - In node, compute home quaternion from DIORAMA_CAMERAS.design (lookAt position to target)
 *   and expected camera × home⁻¹
 * - Assert sky's quaternion within 1e-6 of expected, position at origin (< 1e-6)
 * - Assert camera moved off home by at least 5°
 * - Repeat with &sky=light and under prefers-reduced-motion: reduce
 * - Exit 1 otherwise.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5181/'
const origin = new URL(appUrl).origin

const chromePath =
  process.env.CHROME_PATH ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ].find((path) => existsSync(path))

if (!chromePath) {
  console.error('No Chrome-compatible browser found. Set CHROME_PATH.')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-sky-transform-'))
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      ...(process.env.CHROME_FLAGS ?? '').split(/\s+/).filter(Boolean),
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  )
  return {
    child,
    userDataDir,
    cleanup() {
      child.kill()
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    },
  }
}

async function waitForChrome(port, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      /* wait */
    }
    await sleep(150)
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.seq = 0
    this.pending = new Map()
    this.errors = []
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.addEventListener('message', (event) => this.onMessage(event))
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    await this.send('Page.enable')
    await this.send('Runtime.enable')
  }

  onMessage(event) {
    const message = JSON.parse(event.data)
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
      return
    }
    if (message.method === 'Runtime.exceptionThrown') {
      this.errors.push(message.params.exceptionDetails?.text || 'runtime exception')
    }
  }

  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  async close() {
    this.ws.close()
  }
}

async function dragCanvas(page, dx, dy = 0) {
  const result = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const r = document.querySelector('canvas').getBoundingClientRect()
      return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.52 }
    })()`,
    returnByValue: true,
  })
  const { x, y } = result.result.value
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  for (let i = 1; i <= 24; i++) {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: x + (dx * i) / 24,
      y: y + (dy * i) / 24,
      button: 'left',
      buttons: 1,
    })
  }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: 'left', clickCount: 1 })
}

// Compute home quaternion from DIORAMA_CAMERAS.design
const eye = new Vector3(...DIORAMA_CAMERAS.design.position)
const target = new Vector3(...DIORAMA_CAMERAS.design.target)
const homeMatrix = new Matrix4().lookAt(eye, target, new Vector3(0, 1, 0))
const homeQ = new Quaternion().setFromRotationMatrix(homeMatrix)
const homeInverse = homeQ.clone().invert()

const cases = [
  { name: 'moving sky', url: `${origin}/?mode=diorama&clean=1&arrival=0`, reducedMotion: false },
  { name: 'painted light', url: `${origin}/?mode=diorama&clean=1&arrival=0&sky=light`, reducedMotion: false },
  { name: 'reduced motion', url: `${origin}/?mode=diorama&clean=1&arrival=0`, reducedMotion: true },
]

async function runCase(port, { name, url, reducedMotion }) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!res.ok) throw new Error(`Failed to create target: ${res.status}`)
  const target = await res.json()
  const page = new CdpPage(target.webSocketDebuggerUrl)
  await page.connect()

  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
    if (reducedMotion) {
      await page.send('Emulation.setEmulatedMedia', {
        media: '',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
    }

    await page.send('Page.navigate', { url })

    // Wait for canvas
    const start = Date.now()
    for (;;) {
      await sleep(250)
      const probe = await page.send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('canvas')) && typeof window.__skyTransform === 'function'`,
        returnByValue: true,
      })
      if (probe.result?.value === true) break
      if (Date.now() - start > 25000) throw new Error(`Timeout waiting for canvas and __skyTransform at ${url}`)
    }

    // Drag canvas 240 px right
    await dragCanvas(page, 240, 0)

    // Wait 1.5 s
    await sleep(1500)

    // Read __skyTransform()
    const read = await page.send('Runtime.evaluate', {
      expression: `window.__skyTransform()`,
      returnByValue: true,
    })

    const val = read.result?.value
    if (!val) throw new Error(`No value returned from __skyTransform() in ${name}`)

    const sqRaw = val.quaternion
    const spRaw = val.position
    const cqRaw = val.camera

    const sq = new Quaternion(sqRaw[0] ?? sqRaw.x, sqRaw[1] ?? sqRaw.y, sqRaw[2] ?? sqRaw.z, sqRaw[3] ?? sqRaw.w)
    const sp = new Vector3(spRaw[0] ?? spRaw.x, spRaw[1] ?? spRaw.y, spRaw[2] ?? spRaw.z)
    const cq = new Quaternion(cqRaw[0] ?? cqRaw.x, cqRaw[1] ?? cqRaw.y, cqRaw[2] ?? cqRaw.z, cqRaw[3] ?? cqRaw.w)

    // 1. Camera moved off home by at least 5 degrees
    const cosAngle = Math.min(1, Math.max(-1, Math.abs(cq.dot(homeQ))))
    const angleDeg = 2 * Math.acos(cosAngle) * (180 / Math.PI)
    assert.ok(angleDeg >= 5, `${name}: camera angle ${angleDeg.toFixed(2)}° must be >= 5° off home`)

    // 2. Expected sky quaternion: camera × home⁻¹
    const expectedSkyQ = cq.clone().multiply(homeInverse)
    const d1 = Math.hypot(sq.x - expectedSkyQ.x, sq.y - expectedSkyQ.y, sq.z - expectedSkyQ.z, sq.w - expectedSkyQ.w)
    const d2 = Math.hypot(sq.x + expectedSkyQ.x, sq.y + expectedSkyQ.y, sq.z + expectedSkyQ.z, sq.w + expectedSkyQ.w)
    const quatDiff = Math.min(d1, d2)
    assert.ok(quatDiff < 1e-6, `${name}: sky quaternion difference ${quatDiff.toExponential(3)} must be < 1e-6`)

    // 3. Sky position at origin (< 1e-6)
    const posDist = sp.length()
    assert.ok(posDist < 1e-6, `${name}: sky position distance ${posDist.toExponential(3)} must be at origin (< 1e-6)`)

    console.log(`PASS [${name}]: camera moved ${angleDeg.toFixed(2)}° off home, sky quat diff ${quatDiff.toExponential(3)}, pos distance ${posDist.toExponential(3)}`)
  } finally {
    await page.close()
  }
}

async function main() {
  const port = 9223 + Math.floor(Math.random() * 500)
  const chrome = startChrome(port)
  try {
    await waitForChrome(port)
    for (const c of cases) {
      await runCase(port, c)
    }
    console.log('ALL SKY TRANSFORM CHECKS PASSED')
  } finally {
    chrome.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
