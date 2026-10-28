#!/usr/bin/env node
// Frame-exact sky captures: pins `window.__skyTime` (PaintingFlowSky3D's capture seam) to each listed time and
// reads the canvas back, so motion can be judged and compared headless. Any URL, any viewport.
//
//   node scripts/capture-sky-frames.mjs <outDir> --url 'http://127.0.0.1:5179/?mode=diorama&clean=1&alive=1' \
//        --times 0,0.5,3.7,11.2 [--viewport desktop|mobile] [--prefix alive] [--eval '<js>']
//
// `--eval` runs in the page once it has settled, with the clock already pinned to the first time. A touch
// injected with an explicit t0 (`window.__touchInject(0.62, 0.3, 1, 5, true)`) replays B's gate rows on any
// machine. The frames JSON records what the code returned (`evalResult`).
// C (arrival): `--arrival-times a,b,c`, one per `--times` entry, finite and non-decreasing, pins `window.__arrivalTime`
// in the same evaluation as `__skyTime`, and the first pair is installed before navigation so the arrival cannot finish
// during the settle. Files are then `<prefix>-t<time>-a<arrival>.png`. `--screenshot` reads the page (the arrival's
// layer is DOM) instead of the canvas. With neither option the script runs exactly as before.
// Env: CHROME_PATH, CHROME_FLAGS (--no-sandbox in a cloud session), CAPTURE_SETTLE_MS (about 10000 there).
// Each frame is <outDir>/<prefix>-t<time>.png. The self-check: the pinned clock must be read back as finite, and
// two reads at the same pinned time must be byte-identical, or the hook is not in the page (Codex F2, 2026-10-11).
// `--moving` skips the byte-identical reads for an --eval that keeps the page moving on its own clock (the grass's hand
// sweep), and the frames JSON then records `moving: true`.
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
// the boolean flags, read past every option's value: `--prefix --moving` must not switch the self-check off (Codex F03)
const VALUED = new Set(['--url', '--times', '--viewport', '--prefix', '--eval', '--wait-for', '--arrival-times'])
const flags = new Set(args.slice(1).filter((a, i, rest) => a.startsWith('--') && !VALUED.has(a) && !VALUED.has(rest[i - 1])))
if (!outDir || outDir.startsWith('--')) {
  console.error('usage: capture-sky-frames.mjs <outDir> --url <url> --times 0,1,2 [--viewport desktop|mobile] [--prefix p] [--eval js] [--moving]')
  process.exit(1)
}
const url = opt('url', 'http://127.0.0.1:5179/?mode=diorama&clean=1')
const times = opt('times', '0,0.5,3.7,11.2').split(',').map(Number)
const viewportName = opt('viewport', 'desktop')
const prefix = opt('prefix', viewportName)
const evalBefore = opt('eval', null)
const waitFor = opt('wait-for', null)
// a page the --eval keeps moving on its own clock (the grass's hand sweep, S3 task 5) cannot pass the self-check, so
// it opts out by name: every other --eval still proves the clock pinned
const moving = flags.has('--moving')
// presence and value apart: an empty `--arrival-times ''` (a shell variable that came out empty) must fail, not
// silently run the sky-only path with the arrival unpinned (Codex, code review F15)
const hasArrivalTimes = args.includes('--arrival-times')
const arrivalRaw = hasArrivalTimes ? opt('arrival-times', '') : null
if (hasArrivalTimes && (!arrivalRaw || arrivalRaw.startsWith('--'))) {
  console.error('--arrival-times needs a value: one arrival time per --times entry')
  process.exit(1)
}
const arrivalTimes = hasArrivalTimes ? arrivalRaw.split(',').map(Number) : null
const screenshot = flags.has('--screenshot')
if (arrivalTimes) {
  const bad =
    arrivalTimes.length !== times.length
      ? `--arrival-times has ${arrivalTimes.length} entries, --times has ${times.length}`
      : arrivalTimes.some((a) => !Number.isFinite(a))
        ? '--arrival-times must all be finite'
        : arrivalTimes.some((a, i) => i > 0 && a < arrivalTimes[i - 1])
          ? '--arrival-times must not decrease: the arrival latches once it is done'
          : null
  if (bad) {
    console.error(bad)
    process.exit(1)
  }
}
/** Both pins in ONE expression: a frame between two evaluations could move the arrival on (PR #11 P2, the same race). */
const pin = (i) => (arrivalTimes ? `window.__skyTime = ${times[i]}; window.__arrivalTime = ${arrivalTimes[i]};` : `window.__skyTime = ${times[i]};`)
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
  if (screenshot) {
    // the same three-frame wait, then the page as composited (the arrival's layer is DOM, outside the canvas)
    await page.send('Runtime.evaluate', {
      expression: `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))`,
      awaitPromise: true,
    })
    const shot = await page.send('Page.captureScreenshot', { format: 'png' })
    if (typeof shot.data !== 'string') throw new Error(`bad screenshot: ${JSON.stringify(shot).slice(0, 200)}`)
    return Buffer.from(shot.data, 'base64')
  }
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
    if (arrivalTimes || screenshot) await page.send('Page.enable')
    // the arrival is held at its first pair from the page's first frame, so the settle cannot run it to the end
    if (arrivalTimes) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: pin(0) })
    await page.send('Page.navigate', { url })
    const start = Date.now()
    for (;;) {
      await sleep(500)
      const probe = await page.send('Runtime.evaluate', { expression: `Boolean(document.querySelector('canvas'))`, returnByValue: true })
      if (probe.result.value === true) break
      if (Date.now() - start > 25000) throw new Error(`no canvas at ${url}`)
    }
    await sleep(2500 + SETTLE_MS)
    if (waitFor) {
      const waitStart = Date.now()
      for (;;) {
        const probe = await page.send('Runtime.evaluate', { expression: `Boolean(${waitFor})`, returnByValue: true })
        if (probe.result?.value === true) break
        if (Date.now() - waitStart > 30000) throw new Error(`--wait-for timed out after 30s: ${waitFor}`)
        await sleep(200)
      }
    }
    let evalResult = null
    if (evalBefore) {
      // pin the clock in the same evaluation, before the page code: an unpinned frame between the two would prune
      // an injected entry whose explicit t0 is older than the live clock's window (Codex, PR #11 P2)
      const ran = await page.send('Runtime.evaluate', { expression: `${pin(0)}\n${evalBefore}`, returnByValue: true, awaitPromise: true })
      if (ran.exceptionDetails) throw new Error(`--eval threw: ${ran.exceptionDetails.exception?.description ?? ran.exceptionDetails.text}`)
      evalResult = ran.result.value ?? null
    }
    // Vincent's turn and his lantern's swing run on the walk's real time, as the walk does, not on the pinned clock: wait
    // for them to rest, here after the eval because a portal entry first shows him there (V1). A figure that never rests,
    // walking on, is left to the self-check below
    const restStart = Date.now()
    while (Date.now() - restStart < 10000) {
      const probe = await page.send('Runtime.evaluate', { expression: '!window.__vincentForm || window.__vincentForm().settled', returnByValue: true })
      if (probe.result?.value === true) break
      await sleep(100)
    }
    // the new fields only when their options are on, so the old path's JSON is the old JSON (code review F14)
    const summary = { url, viewport, times, ...(arrivalTimes ? { arrivalTimes } : {}), ...(screenshot ? { screenshot } : {}), ...(waitFor ? { waitFor } : {}), ...(moving ? { moving } : {}), evalBefore, evalResult, frames: [], errors: page.errors }
    const firstMoving = times.find((t) => t > 0)
    for (let i = 0; i < times.length; i++) {
      const t = times[i]
      await page.send('Runtime.evaluate', { expression: pin(i) })
      const a = await readFrame(page)
      // the self-check on the first time and the first t > 0 only (a readback costs seconds under software
      // rendering): at t = 0 a foreground reading the clock one frame late would still show as pinned
      if (!moving && (t === times[0] || t === firstMoving)) {
        const b = await readFrame(page)
        if (!a.equals(b)) throw new Error(`pinned clock self-check failed at t=${t}: two reads differ, so the page is not pinned`)
      }
      const file = join(outDir, `${prefix}-t${t}${arrivalTimes ? `-a${arrivalTimes[i]}` : ''}.png`)
      writeFileSync(file, a)
      summary.frames.push({ t, ...(arrivalTimes ? { a: arrivalTimes[i] } : {}), file, bytes: a.length })
      console.log(`t=${t}${arrivalTimes ? ` a=${arrivalTimes[i]}` : ''}  ${a.length} bytes  ${file}`)
    }
    const readBack = await page.send('Runtime.evaluate', { expression: `window.__skyTime`, returnByValue: true })
    if (!Number.isFinite(readBack.result.value)) throw new Error('pinned clock not readable')
    if (arrivalTimes) {
      const arrivalBack = await page.send('Runtime.evaluate', { expression: `window.__arrivalTime`, returnByValue: true })
      if (!Number.isFinite(arrivalBack.result.value)) throw new Error('pinned arrival clock not readable')
    }
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
