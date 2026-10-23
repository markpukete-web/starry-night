#!/usr/bin/env node
/**
 * Task 8, Step 4: Rotation check for street mode.
 * Loads ?street=1&station=2 at 1440 × 900, waits for __streetReady,
 * sets metrics to 390 × 844 (mobile portrait), waits 1 s.
 * Asserts window.__streetCounts.builds === 1 (geometry not rebuilt)
 * and window.__streetCamera().fov === 75 (camera updated to portrait fov).
 * Exits 1 otherwise.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5181/'
const parsedUrl = new URL(appUrl)
const portStr = parsedUrl.port || '80'
const testUrl = `${parsedUrl.origin}/?street=1&station=2`

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
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-rotation-'))
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

async function main() {
  const port = 9223 + Math.floor(Math.random() * 500)
  const chrome = startChrome(port)
  try {
    await waitForChrome(port)
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
    const target = await response.json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()

    // 1. Initial desktop viewport: 1440 × 900
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await page.send('Page.navigate', { url: testUrl })

    // Wait for __streetReady
    const start = Date.now()
    for (;;) {
      await sleep(200)
      const probe = await page.send('Runtime.evaluate', {
        expression: `Boolean(window.__streetReady)`,
        returnByValue: true,
      })
      if (probe.result?.value === true) break
      if (Date.now() - start > 25000) throw new Error(`Timeout waiting for __streetReady at ${testUrl}`)
    }

    // 2. Rotate to mobile portrait: 390 × 844
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })

    // Wait 1 s
    await sleep(1000)

    // 3. Assert counts and camera
    const evalRes = await page.send('Runtime.evaluate', {
      expression: `(() => ({
        counts: window.__streetCounts,
        camera: typeof window.__streetCamera === 'function' ? window.__streetCamera() : null
      }))()`,
      returnByValue: true,
    })

    const state = evalRes.result?.value
    if (!state) throw new Error('Failed to read state from page')

    console.log('Street rotation state:', JSON.stringify(state, null, 2))

    const builds = state.counts?.builds
    const fov = state.camera?.fov

    if (builds !== 1) {
      console.error(`FAIL: expected window.__streetCounts.builds === 1, got ${builds}`)
      process.exit(1)
    }

    if (fov !== 75) {
      console.error(`FAIL: expected window.__streetCamera().fov === 75, got ${fov}`)
      process.exit(1)
    }

    console.log(`PASS: street rotation holds builds=${builds} and updates fov=${fov}`)
    await page.close()
  } finally {
    chrome.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
