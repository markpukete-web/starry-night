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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, debugPort, openPage, PORTS, startChrome, startViteIfNeeded } from './lib/chrome.mjs'

const outDir = process.argv[2] || 'output/playwright/viewport-camera'
const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['check-viewport-camera'].app}/`
const appPort = new URL(appUrl).port || '80'
chromePath()
mkdirSync(outDir, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE_MS ?? 0) || 0

const PORTRAIT = { width: 390, height: 844 }
const LANDSCAPE = { width: 1600, height: 900 }

/**
 * Chrome geometry cases. The interesting one is a phone in LANDSCAPE (844x390): wider than the
 * 640px breakpoint, so it takes the desktop chrome rules, but only 390px tall — the placard is
 * sized for a tall window and nothing had ever laid it out in a short one.
 */
const CHROME_VIEWPORTS = [
  ['phone-portrait', { width: 390, height: 844 }],
  ['phone-portrait-narrow', { width: 360, height: 800 }],
  ['phone-landscape', { width: 844, height: 390 }],
  ['phone-landscape-large', { width: 932, height: 430 }],
  ['phone-landscape-small', { width: 667, height: 375 }],
  ['short-and-narrow', { width: 640, height: 360 }],
  ['desktop', { width: 1600, height: 900 }],
  // the portal's pill wraps the dock to four rows here (2026-10-28, Codex plan review F3)
  ['phone-320', { width: 320, height: 568 }],
]

async function setViewport(page, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < viewport.height,
  })
}

async function newPage(port, viewport, errors, { clean = true } = {}) {
  const page = await openPage(port, { domains: ['Page', 'Runtime', 'Log'] })
  try {
    page.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') errors.push(`log: ${params.entry.text}`)
    })
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await setViewport(page, viewport)
    // Built with URL, not by appending `?mode=…`: a base that carries a query of its own got a second `?`, and
    // `arrival=0` read as "0?mode=diorama", so the opt-out was lost (Codex, PR #14 P2). The opening is on by
    // default (2026-10-20) and this check wants the steady state, so it opts out unless the base URL carries an
    // `arrival` value of its own.
    const pageUrl = new URL(appUrl)
    pageUrl.searchParams.set('mode', 'diorama')
    // the chrome checks need the chrome: a `clean=1` carried by the base must go on those pages (Codex, PR #14 P2)
    if (clean) pageUrl.searchParams.set('clean', '1')
    else pageUrl.searchParams.delete('clean')
    if (!pageUrl.searchParams.has('arrival')) pageUrl.searchParams.set('arrival', '0')
    await page.send('Page.navigate', { url: pageUrl.toString() })
    await page.waitFor("document.querySelector('canvas')", 25000, 'canvas', 500)
    // CAPTURE_SETTLE_MS: software WebGL in a cloud session draws the cypress ~10 s late, and a fresh-load frame
    // without it never matches the rotated one. Unset on a Mac.
    await sleep(2500 + SETTLE_MS)
    return page
  } catch (err) {
    errors.push(...page.errors)
    await page.close()
    throw err
  }
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

/** Show the original placard, so the check covers the state where the most chrome is on screen. */
async function showOriginal(page) {
  await page.send('Runtime.evaluate', {
    expression: `(() => {
      const b = [...document.querySelectorAll('.visitor-control')]
        .find((el) => (el.getAttribute('aria-label') || '').toLowerCase().includes('original'))
      if (b) b.click()
      return Boolean(b)
    })()`,
    returnByValue: true,
  })
  await sleep(500)
}

async function chromeRects(page) {
  const result = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const rect = (el) => {
        if (!el) return null
        const b = el.getBoundingClientRect()
        return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, w: b.width, h: b.height }
      }
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        title: rect(document.querySelector('.visitor-title')),
        dock: rect(document.querySelector('.visitor-dock')),
        reference: rect(document.querySelector('.visitor-reference')),
        controls: [...document.querySelectorAll('.visitor-control')].map((el) => {
          const b = el.getBoundingClientRect()
          const at = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
          return { label: el.getAttribute('aria-label'), ...rect(el), hit: Boolean(at && el.contains(at)) }
        }),
        // the bottom stack is pointer-events none: beside the dock a drag must start on the canvas (Codex F2)
        besideDock: (() => {
          const d = document.querySelector('.visitor-dock')?.getBoundingClientRect()
          if (!d || d.x < 24) return null
          return document.elementFromPoint(d.x - 8, d.y + d.height / 2)?.tagName ?? 'nothing'
        })(),
      }
    })()`,
    returnByValue: true,
  })
  return result.result.value
}

const overlaps = (a, b) =>
  Boolean(a && b) && a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom

/** Returns a list of human-readable faults; empty means the chrome lays out cleanly. */
function chromeFaults(r) {
  const faults = []
  const TOL = 0.5
  const inViewport = (name, box) => {
    if (!box) return
    if (box.x < -TOL || box.y < -TOL || box.right > r.vw + TOL || box.bottom > r.vh + TOL) {
      faults.push(
        `${name} outside the viewport: [${box.x.toFixed(0)}, ${box.y.toFixed(0)}, ${box.right.toFixed(0)}, ${box.bottom.toFixed(0)}] vs ${r.vw}x${r.vh}`,
      )
    }
  }
  inViewport('title', r.title)
  inViewport('dock', r.dock)
  inViewport('placard', r.reference)
  for (const c of r.controls) inViewport(`control "${c.label}"`, c)
  for (const c of r.controls) if (!c.hit) faults.push(`control "${c.label}" is not the element at its centre`)
  if (r.besideDock && r.besideDock !== 'CANVAS') faults.push(`beside the dock a press lands on ${r.besideDock}, not the canvas`)

  // The title is decorative text with pointer-events:none, but the placard sitting on top of it
  // still reads as a broken layout — and the dock must never be covered, it is interactive.
  if (overlaps(r.reference, r.dock)) faults.push('placard overlaps the control dock')
  if (overlaps(r.reference, r.title)) faults.push('placard overlaps the title/attribution')
  if (overlaps(r.dock, r.title)) faults.push('dock overlaps the title/attribution')
  return faults
}

async function main() {
  const vite = await startViteIfNeeded(appUrl, appPort)
  const port = debugPort('check-viewport-camera')
  const chrome = await startChrome({ port, prefix: 'starry-viewport-' }).catch((err) => {
    // a browser that never comes up must not leave this script's own server on the port (Codex, PR #59 P2)
    if (vite) vite.kill()
    throw err
  })
  const errors = []
  const results = []
  try {
    console.log('Camera framing — rotated page vs fresh load:')
    for (const [name, from, to] of [
      ['landscape-to-portrait', LANDSCAPE, PORTRAIT],
      ['portrait-to-landscape', PORTRAIT, LANDSCAPE],
      // the portrait lens follows the aspect (portraitFov, 2026-10-25): Safari's bars going away mid-visit must reach
      // the framing of a fresh load at the taller size
      ['bars-collapse', { width: 440, height: 735 }, { width: 440, height: 956 }],
    ]) {
      let fresh
      const freshPage = await newPage(port, to, errors)
      try {
        fresh = await shot(freshPage, join(outDir, `${name}-fresh.png`))
      } finally {
        errors.push(...freshPage.errors)
        await freshPage.close()
      }

      let rotated
      const rotatedPage = await newPage(port, from, errors)
      try {
        await setViewport(rotatedPage, to)
        await sleep(2500 + SETTLE_MS)
        rotated = await shot(rotatedPage, join(outDir, `${name}-rotated.png`))
      } finally {
        errors.push(...rotatedPage.errors)
        await rotatedPage.close()
      }

      const identical = readFileSync(fresh).equals(readFileSync(rotated))
      results.push({ name, identical })
      console.log(`  ${name.padEnd(22)} ${identical ? 'matches a fresh load' : 'DOES NOT MATCH a fresh load'}`)
    }
    const cameraFailed = results.filter((r) => !r.identical)
    if (cameraFailed.length) console.error(`  camera FAIL: ${cameraFailed.map((f) => f.name).join(', ')}`)
    else console.log('  camera: both rotations reach the same framing as a fresh load')

    // --- visitor chrome geometry, fresh and after a rotation ---
    console.log('\nVisitor chrome (attribution, dock, placard) — clipping and overlap:')
    const chromeResults = []
    for (const [name, viewport] of CHROME_VIEWPORTS) {
      const page = await newPage(port, viewport, errors, { clean: false })
      try {
        await showOriginal(page)
        const rects = await chromeRects(page)
        const faults = chromeFaults(rects)
        chromeResults.push({ case: `fresh ${name}`, viewport, faults, rects })
        console.log(`  ${`fresh ${name}`.padEnd(30)} ${faults.length ? `FAIL — ${faults.join('; ')}` : 'clean'}`)
      } finally {
        errors.push(...page.errors)
        await page.close()
      }
    }
    // The gap this closes: the chrome had only ever been laid out at fixed viewports, never across
    // a live rotation. Media queries re-evaluate natively, but that is a claim worth testing.
    for (const [name, from, to] of [
      ['rotate portrait->landscape', { width: 390, height: 844 }, { width: 844, height: 390 }],
      ['rotate landscape->portrait', { width: 844, height: 390 }, { width: 390, height: 844 }],
      ['rotate phone->desktop', { width: 390, height: 844 }, { width: 1600, height: 900 }],
      ['resize phone->320', { width: 390, height: 844 }, { width: 320, height: 568 }],
    ]) {
      const page = await newPage(port, from, errors, { clean: false })
      try {
        await showOriginal(page)
        await setViewport(page, to)
        await sleep(900)
        const rects = await chromeRects(page)
        const faults = chromeFaults(rects)
        chromeResults.push({ case: name, from, to, faults, rects })
        console.log(`  ${name.padEnd(30)} ${faults.length ? `FAIL — ${faults.join('; ')}` : 'clean'}`)
      } finally {
        errors.push(...page.errors)
        await page.close()
      }
    }

    writeFileSync(
      join(outDir, 'viewport-summary.json'),
      JSON.stringify({ camera: results, chrome: chromeResults, errors }, null, 2),
    )
    const chromeFailed = chromeResults.filter((c) => c.faults.length)
    if (cameraFailed.length || chromeFailed.length || errors.length) {
      if (errors.length) console.error(errors.join('\n'))
      console.error(
        `\nFAIL: ${[
          cameraFailed.length && `camera (${cameraFailed.map((f) => f.name).join(', ')})`,
          chromeFailed.length && `chrome (${chromeFailed.map((f) => f.case).join(', ')})`,
          errors.length && 'console errors',
        ]
          .filter(Boolean)
          .join('; ')}`,
      )
      process.exitCode = 1
    } else {
      console.log('\nPASS: camera and visitor chrome both survive a live rotation')
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
