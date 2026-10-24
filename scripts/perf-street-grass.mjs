#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathPoint, pathTangent, STATION_T } from '../src/scene/streetLayout.ts'
import { GRASS_BLADE } from '../src/scene/grassBlade.ts'

const args = process.argv.slice(2)
const outDirArg = args.find((a) => !a.startsWith('--')) || 'scratch/street-s3-2026-10-24/t5'
const outDir = resolve(process.cwd(), outDirArg)
mkdirSync(outDir, { recursive: true })

const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && i + 1 < args.length) return args[i + 1]
  const prefix = `--${name}=`
  const match = args.find((a) => a.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const stationOpt = opt('station', null)
const viewportOpt = opt('viewport', null)

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5191/'
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
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-perf-grass-'))
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

  async evaluate(fnOrExpr, arg) {
    let expression
    if (typeof fnOrExpr === 'function') {
      expression = arg !== undefined ? `(${fnOrExpr.toString()})(${JSON.stringify(arg)})` : `(${fnOrExpr.toString()})()`
    } else {
      expression = fnOrExpr
    }
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text}`)
    }
    return res.result?.value
  }

  async waitForStreetReady(timeoutMs = 25000) {
    const start = Date.now()
    for (;;) {
      await sleep(150)
      const ready = await this.evaluate('Boolean(window.__streetReady)')
      if (ready) return
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timeout waiting for __streetReady')
      }
    }
  }

  async close() {
    this.ws.close()
  }
}

function getSweep3DEnds(station) {
  const t0 = STATION_T[station]
  const sign = station === 0 ? 1 : -1
  const t = t0 + 0.16
  const [px, , pz] = pathPoint(t)
  const [tx, , tz] = pathTangent(t)
  const n = Math.hypot(tx, tz)
  const utx = tx / n
  const utz = tz / n
  const y = GRASS_BLADE.height / 2
  const pt0 = [px + sign * 0.08 * (-utz), y, pz + sign * 0.08 * utx]
  const pt1 = [px + sign * 0.22 * (-utz), y, pz + sign * 0.22 * utx]
  return { pt0, pt1 }
}

const VIEWPORTS = {
  desktop: { width: 1600, height: 900, mobile: false, dpr: 1.5 },
  mobile: { width: 390, height: 844, mobile: true, dpr: 1.5 },
}

async function runSweep(station, viewportName) {
  const vp = VIEWPORTS[viewportName]
  const port = 9600 + Math.floor(Math.random() * 300)
  const chrome = startChrome(port)

  try {
    await waitForChrome(port)
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
    const target = await response.json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()

    await page.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dpr,
      mobile: vp.mobile,
    })

    const url = `${origin}/?street=1&station=${station}&perf=1&arrival=0&walkMode=input`
    console.log(`Opening ${url} (${viewportName})...`)
    await page.send('Page.navigate', { url })
    await page.waitForStreetReady()
    await sleep(1000)

    const ends = getSweep3DEnds(station)

    // Start in-page sweep
    await page.evaluate(({ pt0, pt1 }) => {
      const p0 = window.__walkProject(window.__streetWalk?.t ?? 0, pt0)
      const p1 = window.__walkProject(window.__streetWalk?.t ?? 0, pt1)
      window.__stopGrassSweep = false
      const startTime = performance.now()
      function step(now) {
        if (window.__stopGrassSweep) return
        const elapsed = (now - startTime) / 1000
        const phase = (elapsed % 2.0) / 2.0
        const u = phase < 0.5 ? phase * 2.0 : (1.0 - phase) * 2.0
        const x = p0[0] + u * (p1[0] - p0[0])
        const y = p0[1] + u * (p1[1] - p0[1])
        if (typeof window.__grassHand === 'function') {
          window.__grassHand(x, y)
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, ends)

    // Clear __perf.t
    await page.evaluate(() => {
      if (window.__perf) {
        window.__perf.t = []
      }
    })

    console.log(`Measuring sweep perf for 8 s at station ${station} (${viewportName})...`)
    await sleep(8000)

    // Read perf stats
    const stats = await page.evaluate(() => {
      const perf = window.__perf
      if (!perf || perf.t.length < 30) return null
      const intervals = perf.t.slice(1).map((val, idx) => val - perf.t[idx]).sort((a, b) => a - b)
      return {
        samples: intervals.length,
        meanMs: intervals.reduce((sum, val) => sum + val, 0) / intervals.length,
        p50Ms: intervals[Math.floor(intervals.length / 2)],
        p95Ms: intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))],
        maxMs: intervals[intervals.length - 1],
        triangles: perf.info?.triangles,
      }
    })

    // Stop sweep
    await page.evaluate(() => {
      window.__stopGrassSweep = true
      if (typeof window.__grassHand === 'function') {
        window.__grassHand(null)
      }
    })

    if (!stats) {
      throw new Error(`Failed to read perf stats for station ${station} ${viewportName}`)
    }

    const result = {
      station,
      viewport: viewportName,
      samples: stats.samples,
      meanMs: Number(stats.meanMs.toFixed(2)),
      p50Ms: Number(stats.p50Ms.toFixed(2)),
      p95Ms: Number(stats.p95Ms.toFixed(2)),
      maxMs: Number(stats.maxMs.toFixed(2)),
      triangles: stats.triangles,
    }

    const outFile = join(outDir, `perf-sweep-s${station}-${viewportName}.json`)
    writeFileSync(outFile, JSON.stringify(result, null, 2))
    console.log(`Saved ${outFile}:`, result)

    await page.close()
    return result
  } finally {
    chrome.cleanup()
  }
}

async function main() {
  const stations = stationOpt !== null ? [parseInt(stationOpt, 10)] : [0, 2]
  const viewports = viewportOpt !== null ? [viewportOpt] : ['desktop', 'mobile']

  for (const s of stations) {
    for (const v of viewports) {
      await runSweep(s, v)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
