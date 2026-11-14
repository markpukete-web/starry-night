#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { debugPort, openPage, PORTS, startChrome } from './lib/chrome.mjs'
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

const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['perf-street-grass'].app}/`
const origin = new URL(appUrl).origin

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function evaluate(page, fnOrExpr, arg) {
  let expression
  if (typeof fnOrExpr === 'function') {
    expression = arg !== undefined ? `(${fnOrExpr.toString()})(${JSON.stringify(arg)})` : `(${fnOrExpr.toString()})()`
  } else {
    expression = fnOrExpr
  }
  return page.evaluate(expression)
}

function waitForStreetReady(page, timeoutMs = 25000) {
  return page.waitFor('window.__streetReady', timeoutMs, '__streetReady', 150)
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
  const port = debugPort('perf-street-grass')
  const chrome = await startChrome({ port, prefix: 'starry-perf-grass-' })

  try {
    const page = await openPage(port)
    try {

    await page.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dpr,
      mobile: vp.mobile,
    })

    const url = `${origin}/?street=1&station=${station}&perf=1&arrival=0&walkMode=input`
    console.log(`Opening ${url} (${viewportName})...`)
    await page.send('Page.navigate', { url })
    await waitForStreetReady(page)
    await sleep(1000)

    const ends = getSweep3DEnds(station)

    // Start in-page sweep
    await evaluate(page, ({ pt0, pt1 }) => {
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
    await evaluate(page, () => {
      if (window.__perf) {
        window.__perf.t = []
      }
    })

    console.log(`Measuring sweep perf for 8 s at station ${station} (${viewportName})...`)
    await sleep(8000)

    // Read perf stats
    const stats = await evaluate(page, () => {
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
    await evaluate(page, () => {
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

      return result
    } finally {
      await page.close()
    }
  } finally {
    await chrome.close()
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
