#!/usr/bin/env node
/**
 * Browser-level guard for the responsive camera: rotating an open page must reach the SAME framing
 * as loading fresh at that viewport — no reload.
 *
 * Why this cannot be a unit test: `scripts/diorama-layout.test.ts` pins the camera constants, but
 * the failure this catches is a live one. `isPortrait` used to read `window.inner*` during render
 * without subscribing to canvas size, so the camera stayed stale after a resize (landscape→portrait
 * kept the desktop close-up); and the sky's home orientation used to be latched from the first
 * rendered frame, so even once the camera followed, the sky stayed keyed to the previous
 * orientation and clipped the moon. Both are only observable in a real resized browser.
 *
 * Method: prefers-reduced-motion: reduce stills the churn, so a fresh load and a rotated one are
 * comparable pixel-for-pixel rather than through a noise floor.
 *
 *   npm run check:viewport
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const outDir = process.argv[2] || 'output/playwright/viewport-camera'
const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5179/'
const appPort = new URL(appUrl).port || '80'
const chromePath =
  process.env.CHROME_PATH ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ].find((path) => existsSync(path))

if (!chromePath) {
  console.error('No Chrome-compatible browser found. Set CHROME_PATH to a browser executable.')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PORTRAIT = { width: 390, height: 844 }
const LANDSCAPE = { width: 1600, height: 900 }

async function urlOk(url) {
  try {
    const res = await fetch(url)
    return res.ok && (await res.text()).includes('The Starry Night')
  } catch {
    return false
  }
}

async function startViteIfNeeded() {
  if (await urlOk(appUrl)) return null
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', appPort, '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (c) => (log += c))
  child.stderr.on('data', (c) => (log += c))
  const start = Date.now()
  while (Date.now() - start < 25000) {
    if (await urlOk(appUrl)) return child
    await sleep(300)
  }
  child.kill()
  throw new Error(`Vite did not become ready at ${appUrl}\n${log}`)
}

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-viewport-'))
  const child = spawn(
    chromePath,
    [
      '--headless=new',
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
    cleanup() {
      child.kill()
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    },
  }
}

class CdpPage {
  constructor(wsUrl, errors) {
    this.wsUrl = wsUrl
    this.errors = errors
    this.seq = 0
    this.pending = new Map()
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.addEventListener('message', (event) => {
      const m = JSON.parse(event.data)
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        if (m.error) reject(new Error(m.error.message))
        else resolve(m.result)
        return
      }
      if (m.method === 'Runtime.exceptionThrown') this.errors.push(`exception: ${m.params.exceptionDetails?.text}`)
      if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') this.errors.push(`log: ${m.params.entry.text}`)
    })
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('Log.enable')
  }
  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  close() {
    this.ws.close()
  }
}

async function setViewport(page, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < viewport.height,
  })
}

async function newPage(port, viewport, errors) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!res.ok) throw new Error(`Failed to create Chrome target: ${res.status}`)
  const target = await res.json()
  const page = new CdpPage(target.webSocketDebuggerUrl, errors)
  await page.connect()
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await setViewport(page, viewport)
  await page.send('Page.navigate', { url: `${appUrl}?mode=diorama&clean=1` })
  const start = Date.now()
  for (;;) {
    await sleep(500)
    const probe = await page.send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('canvas'))`,
      returnByValue: true,
    })
    if (probe.result.value === true) break
    if (Date.now() - start > 25000) throw new Error('no canvas')
  }
  await sleep(2500)
  return page
}

async function shot(page, file) {
  const result = await page.send('Runtime.evaluate', {
    expression: `new Promise((resolve, reject) => {
      const c = document.querySelector('canvas')
      if (!c) { reject(new Error('no canvas')); return }
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(c.toDataURL('image/png'))))
    })`,
    awaitPromise: true,
    returnByValue: true,
  })
  const dataUrl = result.result.value
  writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf('base64,') + 7), 'base64'))
  return file
}

async function main() {
  const vite = await startViteIfNeeded()
  const port = 9700 + Math.floor(Math.random() * 300)
  const chrome = startChrome(port)
  const errors = []
  const results = []
  try {
    await sleep(1200)
    for (const [name, from, to] of [
      ['landscape-to-portrait', LANDSCAPE, PORTRAIT],
      ['portrait-to-landscape', PORTRAIT, LANDSCAPE],
    ]) {
      let page = await newPage(port, to, errors)
      const fresh = await shot(page, join(outDir, `${name}-fresh.png`))
      page.close()

      page = await newPage(port, from, errors)
      await setViewport(page, to)
      await sleep(2500)
      const rotated = await shot(page, join(outDir, `${name}-rotated.png`))
      page.close()

      const identical = readFileSync(fresh).equals(readFileSync(rotated))
      results.push({ name, identical })
      console.log(`  ${name.padEnd(22)} ${identical ? 'matches a fresh load' : 'DOES NOT MATCH a fresh load'}`)
    }
    writeFileSync(join(outDir, 'viewport-summary.json'), JSON.stringify({ results, errors }, null, 2))
    const failed = results.filter((r) => !r.identical)
    if (failed.length || errors.length) {
      if (errors.length) console.error(errors.join('\n'))
      console.error(`FAIL: ${failed.map((f) => f.name).join(', ') || 'console errors'}`)
      process.exitCode = 1
    } else {
      console.log('PASS: rotating an open page reaches the same framing as loading fresh')
    }
  } finally {
    chrome.cleanup()
    if (vite) vite.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
