#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A dedicated capture port: 5173 is routinely occupied by ANOTHER Vite app on this machine (the
// markma.dev portfolio), and a bare 200-OK check happily captures the wrong app's canvas.
const DEFAULT_URL = 'http://127.0.0.1:5179/'
const outDir = process.argv[2] || 'output/playwright/diorama-recovery-2026-07-07'
const appUrl = process.env.DIORAMA_CAPTURE_URL || DEFAULT_URL
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function urlOk(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    // make sure it is THIS app, not whatever other dev server squats on the port
    const html = await response.text()
    return html.includes('The Starry Night')
  } catch {
    return false
  }
}

async function waitForUrl(url, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await urlOk(url)) return true
    await sleep(250)
  }
  return false
}

async function startViteIfNeeded() {
  if (await urlOk(appUrl)) return null
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', appPort, '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    log += chunk.toString()
  })
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
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-diorama-chrome-'))
  const child = spawn(chromePath, [
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
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  return {
    child,
    userDataDir,
    cleanup() {
      child.kill()
      // Chrome may still be flushing its profile as it dies — retry the removal
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    },
    stderr: () => stderr,
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
    this.ws.addEventListener('message', (event) => this.onMessage(event))
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('Log.enable')
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
      this.errors.push(`exception: ${message.params.exceptionDetails?.text || 'runtime exception'}`)
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      this.errors.push(`log: ${message.params.entry.text}`)
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

async function newPage(port, url, viewport, errors) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
  const target = await response.json()
  const page = new CdpPage(target.webSocketDebuggerUrl, errors)
  await page.connect()
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: Boolean(viewport.mobile),
  })
  await page.send('Page.navigate', { url })
  // wait for the WebGL canvas to actually exist — a fixed sleep races Vite's cold-start
  // dependency optimise/reload and returns undefined from toDataURL
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
  await sleep(1800)
  return { page, targetId: target.id }
}

async function canvasDataUrl(page) {
  const expression = `
    new Promise((resolve, reject) => {
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        reject(new Error('no canvas'))
        return
      }
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

function saveDataUrl(dataUrl, file) {
  const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7)
  writeFileSync(file, Buffer.from(base64, 'base64'))
  return statSync(file).size
}

async function capture(page, name) {
  const file = join(outDir, `${name}.png`)
  const bytes = saveDataUrl(await canvasDataUrl(page), file)
  return { name, file, bytes }
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
  await sleep(900)
}

async function main() {
  const vite = await startViteIfNeeded()
  const port = 9223 + Math.floor(Math.random() * 500)
  const chrome = startChrome(port)
  const errors = []
  const captures = []
  // DIORAMA_CAPTURE_EXTRA appends debug params (e.g. '&hide=wash') for layer-bisection probes
  const base = `${appUrl}?mode=diorama&clean=1${process.env.DIORAMA_CAPTURE_EXTRA || ''}`
  const desktop = { width: 1600, height: 900 }
  const mobile = { width: 390, height: 844, mobile: true }

  try {
    await waitForChrome(port)
    const cases = [
      ['desktop-centre', base, desktop],
      ['desktop-flow', `${base}&debug=flow`, desktop],
      ['desktop-stage', `${base}&debug=stage`, desktop],
      ['desktop-nopost', `${base}&debug=nopost`, desktop],
      ['desktop-orbit-preset', `${base}&view=orbit`, desktop],
      ['mobile-centre', base, mobile],
    ]
    for (const [name, url, viewport] of cases) {
      const { page } = await newPage(port, url, viewport, errors)
      captures.push(await capture(page, name))
      await page.close()
    }

    for (const [name, dx, dy] of [
      ['desktop-drag-left-boundary', -620, 0],
      ['desktop-drag-right-boundary', 620, 0],
      ['desktop-lookdown', 260, -320], // the angle that exposed the projected-relief funnel
    ]) {
      const { page } = await newPage(port, base, desktop, errors)
      await dragCanvas(page, dx, dy)
      captures.push(await capture(page, name))
      await page.close()
    }

    const summary = {
      url: base,
      browser: chromePath,
      viewport: { desktop, mobile },
      captures,
      errors,
    }
    writeFileSync(join(outDir, 'capture-summary.json'), JSON.stringify(summary, null, 2))
    console.log(`Captured ${captures.length} diorama views to ${outDir}`)
    if (errors.length) {
      console.error(errors.join('\n'))
      process.exitCode = 1
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
