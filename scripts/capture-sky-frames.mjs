#!/usr/bin/env node
// Frame-exact sky captures: pins `window.__skyTime` (PaintingFlowSky3D's capture seam) to each listed time and
// reads the canvas back, so motion can be judged and compared headless. Any URL, any viewport.
//
//   node scripts/capture-sky-frames.mjs <outDir> --url 'http://127.0.0.1:5179/?mode=diorama&clean=1&alive=1' \
//        --times 0,0.5,3.7,11.2 [--viewport desktop|mobile] [--prefix alive]
//
// Env: CHROME_PATH, CHROME_FLAGS (--no-sandbox in a cloud session), CAPTURE_SETTLE_MS (about 10000 there).
// Each frame is <outDir>/<prefix>-t<time>.png. The self-check: the pinned clock must be read back as finite, and
// two reads at the same pinned time must be byte-identical, or the hook is not in the page (Codex F2, 2026-10-11).
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const outDir = args[0]
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
if (!outDir || outDir.startsWith('--')) {
  console.error('usage: capture-sky-frames.mjs <outDir> --url <url> --times 0,1,2 [--viewport desktop|mobile] [--prefix p]')
  process.exit(1)
}
const url = opt('url', 'http://127.0.0.1:5179/?mode=diorama&clean=1')
const times = opt('times', '0,0.5,3.7,11.2').split(',').map(Number)
const viewportName = opt('viewport', 'desktop')
const prefix = opt('prefix', viewportName)
const viewport = viewportName === 'mobile' ? { width: 390, height: 844, mobile: true } : { width: 1600, height: 900, mobile: false }
const chromePath =
  process.env.CHROME_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find((p) => existsSync(p))
if (!chromePath) {
  console.error('No Chrome-compatible browser found. Set CHROME_PATH.')
  process.exit(1)
}
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE_MS ?? 0) || 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
mkdirSync(outDir, { recursive: true })

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-frames-chrome-'))
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      ...(process.env.CHROME_FLAGS ?? '').split(/\s+/).filter(Boolean),
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  return { child, userDataDir }
}

async function waitForChrome(port, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      /* not up yet */
    }
    await sleep(150)
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.id = 0
    this.pending = new Map()
    this.errors = []
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error('CDP socket failed'))
      this.ws.onmessage = (m) => {
        const msg = JSON.parse(m.data)
        if (msg.id && this.pending.has(msg.id)) {
          // resolve with the result, as the other capture scripts do: callers read `.result.value`
          this.pending.get(msg.id)(msg.result ?? msg)
          this.pending.delete(msg.id)
        } else if (msg.method === 'Runtime.exceptionThrown') {
          this.errors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 400))
        } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          this.errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400))
        }
      }
    })
  }
  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++this.id
      this.pending.set(id, resolve)
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  close() {
    this.ws.close()
  }
}

async function readFrame(page) {
  const result = await page.send('Runtime.evaluate', {
    expression: `new Promise((resolve, reject) => {
      const c = document.querySelector('canvas')
      if (!c) { reject(new Error('no canvas')); return }
      // three frames: the pinned value is read in useFrame, drawn, then composited
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve(c.toDataURL('image/png')))))
    })`,
    awaitPromise: true,
    returnByValue: true,
  })
  const dataUrl = result.result.value
  if (typeof dataUrl !== 'string' || !dataUrl.includes('base64,')) throw new Error(`bad frame: ${JSON.stringify(result).slice(0, 200)}`)
  return Buffer.from(dataUrl.slice(dataUrl.indexOf('base64,') + 7), 'base64')
}

async function main() {
  const port = 9223 + Math.floor(Math.random() * 500)
  const { child, userDataDir } = startChrome(port)
  try {
    await waitForChrome(port)
    const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    const target = await res.json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()
    await page.send('Runtime.enable')
    await page.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile })
    await page.send('Page.navigate', { url })
    const start = Date.now()
    for (;;) {
      await sleep(500)
      const probe = await page.send('Runtime.evaluate', { expression: `Boolean(document.querySelector('canvas'))`, returnByValue: true })
      if (probe.result.value === true) break
      if (Date.now() - start > 25000) throw new Error(`no canvas at ${url}`)
    }
    await sleep(2500 + SETTLE_MS)
    const summary = { url, viewport, times, frames: [], errors: page.errors }
    for (const t of times) {
      await page.send('Runtime.evaluate', { expression: `window.__skyTime = ${t}` })
      const a = await readFrame(page)
      // the self-check on the first frame only: a readback costs seconds under software rendering
      if (t === times[0]) {
        const b = await readFrame(page)
        if (!a.equals(b)) throw new Error(`pinned clock self-check failed at t=${t}: two reads differ, so the page is not pinned`)
      }
      const file = join(outDir, `${prefix}-t${t}.png`)
      writeFileSync(file, a)
      summary.frames.push({ t, file, bytes: a.length })
      console.log(`t=${t}  ${a.length} bytes  ${file}`)
    }
    const readBack = await page.send('Runtime.evaluate', { expression: `window.__skyTime`, returnByValue: true })
    if (!Number.isFinite(readBack.result.value)) throw new Error('pinned clock not readable')
    page.close()
    writeFileSync(join(outDir, `${prefix}-frames.json`), JSON.stringify(summary, null, 2))
    if (page.errors.length) {
      console.error('page errors:\n  ' + page.errors.join('\n  '))
      process.exitCode = 1
    }
  } finally {
    child.kill()
    // the profile is still being written as Chrome exits; a failed removal is not a failed capture
    await sleep(500)
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      /* leave the temp profile */
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
