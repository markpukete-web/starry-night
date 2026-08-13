#!/usr/bin/env node
// Reduced-motion still-state check for ?mode=diorama (locked acceptance criterion).
// Emulates prefers-reduced-motion: reduce, captures two frames apart in time — they must be
// byte-identical. A control page without the emulation must differ.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_URL = 'http://127.0.0.1:5179/'
const outDir = process.argv[2] || 'output/playwright/reduced-motion-check'
const appUrl = process.env.DIORAMA_CAPTURE_URL || DEFAULT_URL
const appPort = new URL(appUrl).port || '80'
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

mkdirSync(outDir, { recursive: true })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function urlOk(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const html = await response.text()
    return html.includes('The Starry Night')
  } catch {
    return false
  }
}

async function waitForUrl(url, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await urlOk(url)) return true
    await sleep(250)
  }
  return false
}

async function startViteIfNeeded() {
  if (await urlOk(appUrl)) return null
  const child = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', appPort, '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'], cwd: process.cwd() },
  )
  let log = ''
  child.stdout.on('data', (c) => (log += c.toString()))
  child.stderr.on('data', (c) => (log += c.toString()))
  if (!(await waitForUrl(appUrl))) {
    child.kill()
    throw new Error(`Vite did not become ready at ${appUrl}\n${log}`)
  }
  return child
}

async function waitForChrome(port, timeoutMs = 15000) {
  const versionUrl = `http://127.0.0.1:${port}/json/version`
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(versionUrl)
      if (response.ok) return await response.json()
    } catch {
      await sleep(150)
    }
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-reduced-chrome-'))
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
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  return {
    child,
    cleanup() {
      child.kill()
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    },
  }
}

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.seq = 0
    this.pending = new Map()
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
      }
    })
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    await this.send('Page.enable')
    await this.send('Runtime.enable')
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

async function newPage(port, url, { reduce }) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
  const target = await response.json()
  const page = new CdpPage(target.webSocketDebuggerUrl)
  await page.connect()
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  if (reduce) {
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }
  await page.send('Page.navigate', { url })
  const start = Date.now()
  for (;;) {
    await sleep(600)
    const probe = await page.send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('canvas'))`,
      returnByValue: true,
    })
    if (probe.result.value === true) break
    if (Date.now() - start > 20000) throw new Error(`no canvas at ${url} after 20s`)
  }
  await sleep(2500) // let textures resolve and the first frames settle
  return page
}

async function canvasDataUrl(page) {
  const expression = `
    new Promise((resolve, reject) => {
      const canvas = document.querySelector('canvas')
      if (!canvas) { reject(new Error('no canvas')); return }
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(canvas.toDataURL('image/png'))))
    })
  `
  const result = await page.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  return result.result.value
}

function save(dataUrl, file) {
  const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7)
  const buffer = Buffer.from(base64, 'base64')
  writeFileSync(file, buffer)
  return buffer
}

async function pair(page, prefix) {
  const a = save(await canvasDataUrl(page), join(outDir, `${prefix}-frame-a.png`))
  await sleep(1500)
  const b = save(await canvasDataUrl(page), join(outDir, `${prefix}-frame-b.png`))
  return { identical: a.equals(b), bytesA: a.length, bytesB: b.length }
}

async function main() {
  const vite = await startViteIfNeeded()
  const port = 9223 + Math.floor(Math.random() * 500)
  const chrome = startChrome(port)
  const base = `${appUrl}?mode=diorama&clean=1`
  try {
    await waitForChrome(port)

    const reducedPage = await newPage(port, base, { reduce: true })
    const reduced = await pair(reducedPage, 'reduced')
    reducedPage.close()

    const controlPage = await newPage(port, base, { reduce: false })
    const control = await pair(controlPage, 'control')
    controlPage.close()

    const summary = { url: base, reduced, control }
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
    console.log(JSON.stringify(summary, null, 2))
    const pass = reduced.identical && !control.identical
    console.log(pass ? 'PASS: reduced still + control churns' : 'FAIL')
    process.exitCode = pass ? 0 : 1
  } finally {
    chrome.cleanup()
    if (vite) vite.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
