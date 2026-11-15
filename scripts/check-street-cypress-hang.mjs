#!/usr/bin/env node
/**
 * Task 10, Step 3: Cypress hang check for street mode.
 * Loads ?mode=diorama&clean=1&street=1&station=0&arrival=0,
 * intercepts and holds /reference/cypress-flow.png unanswered,
 * asserts window.__streetReady within 25 s and window.__streetCounts.triangles > 0.
 * Exits 1 otherwise.
 */
import { debugPort, openPage, PORTS, startChrome } from './lib/chrome.mjs'

const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['check-street-cypress-hang'].app}/`
const parsedUrl = new URL(appUrl)
const testUrl = `${parsedUrl.origin}/?mode=diorama&clean=1&street=1&station=0&arrival=0`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const port = debugPort('check-street-cypress-hang')
  const chrome = await startChrome({ port, prefix: 'starry-hang-' })
  try {
    const page = await openPage(port)
    let interceptedUrl = null
    try {
      page.on('Fetch.requestPaused', ({ requestId, request }) => {
        if (request.url.includes('cypress-flow.png')) {
          interceptedUrl = request.url
          console.log(`[hang-check] Holding request unanswered: ${request.url}`)
          // Do not respond or continue - hold unanswered
        } else {
          page.send('Fetch.continueRequest', { requestId }).catch(() => {})
        }
      })
      await page.send('Fetch.enable', {
        patterns: [{ urlPattern: '*cypress-flow.png*' }],
      })

      console.log(`Navigating to ${testUrl}...`)
      await page.send('Page.navigate', { url: testUrl })

      // Wait up to 25 s for window.__streetReady
      const start = Date.now()
      let ready = false
      while (Date.now() - start < 25000) {
        await sleep(250)
        const probe = await page.send('Runtime.evaluate', {
          expression: 'Boolean(window.__streetReady)',
          returnByValue: true,
        })
        if (probe.result?.value === true) {
          ready = true
          break
        }
      }

      const elapsedMs = Date.now() - start

      // a throw, not process.exit: the exit skipped the finally and left the headless Chrome running. The message names the
      // hold and the street's counts, so a guard waiting for the held cypress, a server that is down and an early script
      // error read apart (Fable C7)
      if (!ready) {
        const counts = await page.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__streetCounts ?? null)', returnByValue: true })
        throw new Error(`FAIL: window.__streetReady was not ready within 25 s (elapsed ${elapsedMs} ms); held: ${interceptedUrl ?? 'nothing'}; street counts: ${counts.result?.value ?? 'unreadable'}`)
      }

      const countsRes = await page.send('Runtime.evaluate', {
        expression: 'window.__streetCounts ? window.__streetCounts.triangles : 0',
        returnByValue: true,
      })
      const triangles = countsRes.result?.value ?? 0

      if (triangles <= 0) throw new Error(`FAIL: expected window.__streetCounts.triangles > 0, got ${triangles}`)

      // a PASS must have held something: if the flow's URL changes and the pattern matches nothing, the street is ready as
      // on any visit and the check would pass vacuously (Fable C7). The cypress may ask after the street is ready
      const holdStart = Date.now()
      while (!interceptedUrl && Date.now() - holdStart < 5000) await sleep(100)
      if (!interceptedUrl) throw new Error('FAIL: the cypress flow was never requested, so nothing was held')

      console.log(`PASS: street became ready in ${elapsedMs} ms with ${triangles} triangles while cypress held unanswered (${interceptedUrl})`)
    } finally {
      await page.close()
    }
  } finally {
    await chrome.close()
  }
}

main().catch((err) => {
  console.error('Error during hang check:', err)
  process.exit(1)
})
