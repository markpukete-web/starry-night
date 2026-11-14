#!/usr/bin/env node
// Reduced-motion still-state check for ?mode=diorama (locked acceptance criterion).
// Emulates prefers-reduced-motion: reduce, captures two frames apart in time — they must be
// byte-identical. A control page without the emulation must differ.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, debugPort, openPage, PORTS, startChrome, startViteIfNeeded } from './lib/chrome.mjs'

const DEFAULT_URL = `http://127.0.0.1:${PORTS['check-reduced-motion'].app}/`
const outDir = process.argv[2] || 'output/playwright/reduced-motion-check'
const appUrl = process.env.DIORAMA_CAPTURE_URL || DEFAULT_URL
const appPort = new URL(appUrl).port || '80'
chromePath()

mkdirSync(outDir, { recursive: true })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE_MS ?? 0) || 0

async function newPage(port, url, { reduce }) {
  const page = await openPage(port)
  try {
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
    await page.waitFor("document.querySelector('canvas')", 20000, `canvas at ${url}`, 600)
    // CAPTURE_SETTLE_MS: software WebGL in a cloud session needs ~10 s more before the cypress draws, and a
    // frame A before it is a false FAIL. Unset on a Mac.
    await sleep(2500 + SETTLE_MS) // let textures resolve and the first frames settle
    return page
  } catch (err) {
    await page.close()
    throw err
  }
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
  const vite = await startViteIfNeeded(appUrl, appPort)
  const port = debugPort('check-reduced-motion')
  const chrome = await startChrome({ port, prefix: 'starry-reduced-chrome-' })
  // Set the route on top of any query already in DIORAMA_CAPTURE_URL (e.g. ?sky=moving). Appending
  // "?mode=…" to such a URL made sky = "moving?mode=diorama", so the check silently ran the default sky.
  const baseUrl = new URL(appUrl)
  baseUrl.searchParams.set('mode', 'diorama')
  baseUrl.searchParams.set('clean', '1')
  // the opening is on by default (2026-10-20); this check measures the steady state, so it opts out unless the
  // base URL asks for the arrival (then the control page needs CAPTURE_SETTLE_MS past the arrival's 8.75 s)
  if (!baseUrl.searchParams.has('arrival')) baseUrl.searchParams.set('arrival', '0')
  const base = baseUrl.toString()
  console.log(`page query: ${baseUrl.search}`)
  try {
    let reduced
    const reducedPage = await newPage(port, base, { reduce: true })
    try {
      reduced = await pair(reducedPage, 'reduced')
    } finally {
      await reducedPage.close()
    }

    let control
    const controlPage = await newPage(port, base, { reduce: false })
    try {
      control = await pair(controlPage, 'control')
    } finally {
      await controlPage.close()
    }

    const summary = { url: base, reduced, control }
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
    console.log(JSON.stringify(summary, null, 2))
    const pass = reduced.identical && !control.identical
    console.log(pass ? 'PASS: reduced still + control churns' : 'FAIL')
    process.exitCode = pass ? 0 : 1
  } finally {
    await chrome.close()
    if (vite) vite.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
