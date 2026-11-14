#!/usr/bin/env node
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, debugPort, openPage, PORTS, startChrome, startViteIfNeeded } from './lib/chrome.mjs'

// A dedicated capture port: 5173 is routinely occupied by ANOTHER Vite app on this machine (the
// markma.dev portfolio), and a bare 200-OK check happily captures the wrong app's canvas.
const DEFAULT_URL = `http://127.0.0.1:${PORTS['capture-diorama'].app}/`
const outDir = process.argv[2] || 'output/playwright/diorama-recovery-2026-07-07'
const perfOnly = process.argv.includes('--perf')
// --unlocked: vsync off, so a frame reads its real cost. Under the 60 Hz lock every case reads 16.7 ms and a
// regression shows only once it costs a whole frame (the performance review, tasks/2026-10-30-perf-review.md).
const unlocked = process.argv.includes('--unlocked')
const dprIndex = process.argv.indexOf('--dpr')
const dpr = dprIndex >= 0 ? Number(process.argv[dprIndex + 1]) : 1
const appUrl = process.env.DIORAMA_CAPTURE_URL || DEFAULT_URL
const appPort = new URL(appUrl).port || '80'
const browser = chromePath()

mkdirSync(outDir, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE_MS ?? 0) || 0

async function newPage(port, url, viewport, errors, deviceDpr = dpr) {
  const page = await openPage(port, { domains: ['Page', 'Runtime', 'Log'] })
  try {
    page.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') {
        errors.push(`log: ${params.entry.text}`)
      }
    })
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: deviceDpr,
      mobile: Boolean(viewport.mobile),
    })
    await page.send('Page.navigate', { url })
    // wait for the WebGL canvas to actually exist — a fixed sleep races Vite's cold-start
    // dependency optimise/reload and returns undefined from toDataURL
    await page.waitFor("document.querySelector('canvas')", 20000, `canvas at ${url}`, 600)
    // CAPTURE_SETTLE_MS adds to every post-load wait: software WebGL in a cloud session takes ~10 s to decode the
    // painting and build the cypress, and a capture before that shows no cypress. Unset on a Mac.
    await sleep(1800 + SETTLE_MS)
    return page
  } catch (err) {
    errors.push(...page.errors)
    await page.close()
    throw err
  }
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

async function readPerf(page) {
  const result = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const perf = window.__perf
      if (!perf || perf.t.length < 30) return null
      const intervals = perf.t.slice(1).map((value, index) => value - perf.t[index]).sort((a, b) => a - b)
      const canvas = document.querySelector('canvas')
      return {
        samples: intervals.length,
        meanMs: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
        p50Ms: intervals[Math.floor(intervals.length / 2)],
        p95Ms: intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))],
        maxMs: intervals[intervals.length - 1],
        drawingBuffer: canvas ? { width: canvas.width, height: canvas.height } : null,
        info: perf.info,
      }
    })()`,
    returnByValue: true,
  })
  return result.result.value
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
  const vite = await startViteIfNeeded(appUrl, appPort)
  const port = debugPort('capture-diorama')
  const chrome = await startChrome({
    port,
    prefix: 'starry-diorama-chrome-',
    flags: unlocked ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [],
  })
  const errors = []
  const captures = []
  // Built with URL, not by appending `?mode=…`: a base with a query of its own got a second `?` and its values
  // read wrong (Codex, PR #14 P2). DIORAMA_CAPTURE_EXTRA carries debug params (e.g. '&debug=stage') for
  // layer-bisection probes, merged as pairs. The opening is on by default (2026-10-20) and these captures want the
  // steady state, so `arrival=0` unless the base or EXTRA asked for an arrival value of its own.
  const baseUrl = new URL(appUrl)
  baseUrl.searchParams.set('mode', 'diorama')
  baseUrl.searchParams.set('clean', '1')
  for (const [key, value] of new URLSearchParams(process.env.DIORAMA_CAPTURE_EXTRA || '')) baseUrl.searchParams.set(key, value)
  if (!baseUrl.searchParams.has('arrival')) baseUrl.searchParams.set('arrival', '0')
  const base = baseUrl.toString()
  const desktop = { width: 1600, height: 900 }
  const mobile = { width: 390, height: 844, mobile: true }

  try {
    if (perfOnly) {
      const metrics = []
      for (const [name, url, viewport] of [
        ['desktop-final', `${base}&debug=final&perf=1`, desktop],
        ['mobile-viewport-final', `${base}&debug=final&perf=1`, mobile],
      ]) {
        const page = await newPage(port, url, viewport, errors)
        try {
          // DIORAMA_CAPTURE_EVAL: an expression awaited before the wait, so the 600 frames read come after it (the portal's
          // street, entered through the village, tasks/2026-10-25-street-portal.md Task 8)
          if (process.env.DIORAMA_CAPTURE_EVAL) await page.send('Runtime.evaluate', { expression: process.env.DIORAMA_CAPTURE_EVAL, awaitPromise: true })
          await sleep(10000)
          metrics.push({ name, url, viewport, metrics: await readPerf(page) })
        } finally {
          errors.push(...page.errors)
          await page.close()
        }
      }
      const summary = {
        browser,
        dpr,
        unlocked,
        drawingBuffer: metrics[0]?.metrics?.drawingBuffer ?? null,
        note: 'mobile-viewport-final is viewport emulation on desktop hardware, not the locked real-device gate',
        metrics,
        errors,
      }
      writeFileSync(join(outDir, 'perf-summary.json'), JSON.stringify(summary, null, 2))
      console.log(JSON.stringify(summary, null, 2))
      if (errors.length) process.exitCode = 1
      return
    }
    const cases = [
      ['desktop-centre', base, desktop],
      ['desktop-flow', `${base}&debug=flow`, desktop],
      ['desktop-stage', `${base}&debug=stage`, desktop],
      ['desktop-orbit-preset', `${base}&view=orbit`, desktop],
      ['mobile-centre', base, mobile],
    ]
    for (const [name, url, viewport] of cases) {
      const page = await newPage(port, url, viewport, errors)
      try {
        captures.push(await capture(page, name))
      } finally {
        errors.push(...page.errors)
        await page.close()
      }
    }

    for (const [name, dx, dy] of [
      ['desktop-drag-left-boundary', -620, 0],
      ['desktop-drag-right-boundary', 620, 0],
      ['desktop-lookdown', 260, -320], // the angle that exposed the projected-relief funnel
    ]) {
      const page = await newPage(port, base, desktop, errors)
      try {
        await dragCanvas(page, dx, dy)
        captures.push(await capture(page, name))
      } finally {
        errors.push(...page.errors)
        await page.close()
      }
    }

    const summary = {
      url: base,
      browser,
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
    await chrome.close()
    if (vite) vite.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
