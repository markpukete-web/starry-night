#!/usr/bin/env node
/**
 * Task 10, Step 3: Cypress hang check for street mode.
 * Loads ?mode=diorama&clean=1&street=1&station=0&arrival=0,
 * intercepts and holds /reference/cypress-flow.png unanswered,
 * asserts window.__streetReady within 25 s and window.__streetCounts.triangles > 0.
 * Exits 1 otherwise.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5183/'
const parsedUrl = new URL(appUrl)
const testUrl = `${parsedUrl.origin}/?mode=diorama&clean=1&street=1&station=0&arrival=0`

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
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-hang-'))
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
    this.interceptedUrl = null
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
    await this.send('Fetch.enable', {
      patterns: [{ urlPattern: '*cypress-flow.png*' }],
    })
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
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params
      if (request.url.includes('cypress-flow.png')) {
        this.interceptedUrl = request.url
        console.log(`[hang-check] Holding request unanswered: ${request.url}`)
        // Do not respond or continue - hold unanswered
      } else {
        this.send('Fetch.continueRequest', { requestId }).catch(() => {})
      }
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

    console.log(`Navigating to ${testUrl}...`)
    await page.send('Page.navigate', { url: testUrl })

    // Wait up to 25 s for window.__streetReady
    const start = Date.now()
    let ready = false
    while (Date.now() - start < 25000) {
      await sleep(250)
      const probe = await page.send('Runtime.evaluate', {
        expression: 'Boolean(window.__streetReady)',
        returnByValue: true,
      })
      if (probe.result?.value === true) {
        ready = true
        break
      }
    }

    const elapsedMs = Date.now() - start

    if (!ready) {
      console.error(`FAIL: window.__streetReady was not ready within 25 s (elapsed ${elapsedMs} ms)`)
      process.exit(1)
    }

    const countsRes = await page.send('Runtime.evaluate', {
      expression: 'window.__streetCounts ? window.__streetCounts.triangles : 0',
      returnByValue: true,
    })
    const triangles = countsRes.result?.value ?? 0

    if (triangles <= 0) {
      console.error(`FAIL: expected window.__streetCounts.triangles > 0, got ${triangles}`)
      process.exit(1)
    }

    console.log(`PASS: street became ready in ${elapsedMs} ms with ${triangles} triangles while cypress held unanswered (${page.interceptedUrl ?? 'intercepted'})`)
    await page.close()
  } finally {
    chrome.cleanup()
  }
}

main().catch((err) => {
  console.error('Error during hang check:', err)
  process.exit(1)
})
