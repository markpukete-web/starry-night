#!/usr/bin/env node
/**
 * Task 4, Step 5: Walk checks for street mode.
 * Asserts the five cases from tasks/2026-10-24-street-s2-plan.md:
 * 1. Wheel walks forward and moves camera.
 * 2. Keys walk at speed and blur stops queued motion.
 * 3. Phone auto-walk, tap toggling, pause holds, multi-touch and drag rejected.
 * 4. Reduced motion stays still, tap cuts to 0.23, captures byte-identical.
 * 5. Flat panel camera holds FLAT_VIEW, walk and vincent undefined.
 * 6. The review's fixes K1 to K4 (K4 waits on the turn, V1).
 * 7. The dwell: 4 s on the form's own clock, the turn in and out, the lantern lit, a tap ends it (V1).
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5191/'
const parsedUrl = new URL(appUrl)
const origin = parsedUrl.origin
const L = 2.3962

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

function countHeadlessChromes() {
  try {
    const out = execSync("pgrep -fl 'Chrome.*headless' 2>/dev/null | wc -l", { encoding: 'utf8' })
    return parseInt(out.trim(), 10) || 0
  } catch {
    return 0
  }
}

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-walk-'))
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

  async evaluate(fnOrExpr) {
    const expression = typeof fnOrExpr === 'function' ? `(${fnOrExpr.toString()})()` : fnOrExpr
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true })
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

async function main() {
  const chromesBefore = countHeadlessChromes()
  const port = 9444 + Math.floor(Math.random() * 400)
  const chrome = startChrome(port)

  try {
    await waitForChrome(port)
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
    const target = await response.json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()

    // -------------------------------------------------------------
    // Case 1: Wheel
    // ?street=1&station=0&arrival=0&walkMode=input, three wheel events of 200 px over the canvas:
    // t rises by more than 0.1 / L within 1 s, and __streetCamera().position moved.
    // -------------------------------------------------------------
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()

    const c1Init = await page.evaluate(() => ({
      t: window.__streetWalk?.t,
      cam: window.__streetCamera?.()?.position,
    }))
    if (typeof c1Init.t !== 'number' || !c1Init.cam) {
      throw new Error('Case 1 precondition failed: __streetWalk or __streetCamera missing')
    }
    if (c1Init.t !== 0) {
      throw new Error(`Case 1 precondition failed: initial t is ${c1Init.t}, expected 0`)
    }

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas')
        canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, deltaMode: 0, bubbles: true, cancelable: true }))
      })
      await sleep(30)
    }
    await sleep(1000)

    const c1After = await page.evaluate(() => ({
      t: window.__streetWalk?.t,
      cam: window.__streetCamera?.()?.position,
    }))
    const c1DeltaT = c1After.t - c1Init.t
    const c1MinRise = 0.1 / L
    if (c1DeltaT <= c1MinRise) {
      throw new Error(`Case 1 failed: t rose by ${c1DeltaT.toFixed(4)}, expected > ${c1MinRise.toFixed(4)}`)
    }
    const c1CamDist = Math.hypot(c1After.cam[0] - c1Init.cam[0], c1After.cam[2] - c1Init.cam[2])
    if (c1CamDist <= 1e-4) {
      throw new Error(`Case 1 failed: camera did not move (camDist: ${c1CamDist})`)
    }
    console.log(`PASS: wheel walks forward (deltaT=${c1DeltaT.toFixed(4)} > ${c1MinRise.toFixed(4)}) and camera moved (${c1CamDist.toFixed(4)})`)

    // -------------------------------------------------------------
    // Case 2: Keys
    // ArrowUp held 1 s: Δt = 0.15 / L ± 25%. Then three wheel events of 300 px and ArrowUp down together
    // (precondition: target − t > 0.01 / L), a blur event, 0.5 s: t changes by < 0.002 / L after the blur.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()

    const c2T0 = await page.evaluate(() => window.__streetWalk?.t)
    if (typeof c2T0 !== 'number') throw new Error('Case 2 precondition failed: __streetWalk missing')

    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    await sleep(1000)
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })

    const c2T1 = await page.evaluate(() => window.__streetWalk?.t)
    const c2DeltaT = c2T1 - c2T0
    const c2Expected = 0.15 / L
    if (c2DeltaT < c2Expected * 0.75 || c2DeltaT > c2Expected * 1.25) {
      throw new Error(`Case 2 failed: ArrowUp deltaT was ${c2DeltaT.toFixed(4)}, expected within 25% of ${c2Expected.toFixed(4)}`)
    }

    // Now hold ArrowUp and fire three wheel events of 300 px
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas')
        canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, deltaMode: 0, bubbles: true, cancelable: true }))
      })
      await sleep(20)
    }

    const c2Pre = await page.evaluate(() => ({
      t: window.__streetWalk?.t,
      target: window.__streetWalk?.target,
    }))
    const c2Lead = c2Pre.target - c2Pre.t
    if (c2Lead <= 0.01 / L) {
      throw new Error(`Case 2 precondition failed: target - t is ${c2Lead.toFixed(4)}, expected > ${ (0.01 / L).toFixed(4) }`)
    }

    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    const c2TAfterBlur = await page.evaluate(() => window.__streetWalk?.t)
    await sleep(500)
    const c2TEnd = await page.evaluate(() => window.__streetWalk?.t)
    const c2ChangeAfterBlur = Math.abs(c2TEnd - c2TAfterBlur)
    if (c2ChangeAfterBlur >= 0.002 / L) {
      throw new Error(`Case 2 failed: t changed by ${c2ChangeAfterBlur.toFixed(5)} after blur, expected < ${ (0.002 / L).toFixed(5) }`)
    }
    console.log(`PASS: keys walk at speed (deltaT=${c2DeltaT.toFixed(4)} in range) and blur stops queued motion (drift=${c2ChangeAfterBlur.toFixed(5)})`)

    // -------------------------------------------------------------
    // Case 3: Phone
    // walkMode=auto at 390 × 844 with touch on: t rises over 2 s; a tap at __vincentBox()'s centre: auto
    // false and t unchanged over 1 s; a second tap: auto true. A tap on the "Pause motion" button: t still over
    // 1 s, and auto still true (the pause stopped him, not a toggle). A second touch (Input.dispatchTouchEvent, a
    // second id) that starts and ends near Vincent's centre while the first touch is held: auto unchanged. A touch on
    // Vincent ended by touchCancel: auto unchanged (F6). A touch on Vincent that moves 20 px before it ends: auto
    // unchanged (Review Focus 3).
    // -------------------------------------------------------------
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto` })
    await page.waitForStreetReady()

    const c3Init = await page.evaluate(() => ({
      t: window.__streetWalk?.t,
      auto: window.__streetWalk?.auto,
    }))
    if (c3Init.auto !== true) {
      throw new Error(`Case 3 precondition failed: auto is ${c3Init.auto}, expected true`)
    }

    await sleep(2000)
    const c3T1 = await page.evaluate(() => window.__streetWalk?.t)
    if (c3T1 <= c3Init.t + 0.02 / L) {
      throw new Error(`Case 3 precondition failed: t did not rise over 2 s (init=${c3Init.t}, after=${c3T1})`)
    }

    const box = await page.evaluate(() => window.__vincentBox?.())
    if (!box) throw new Error('Case 3 precondition failed: __vincentBox missing')
    const cx = Math.round((box.x0 + box.x1) / 2)
    const cy = Math.round((box.y0 + box.y1) / 2)

    // Tap on Vincent
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx, y: cy, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    const c3Auto1 = await page.evaluate(() => window.__streetWalk?.auto)
    if (c3Auto1 !== false) {
      throw new Error(`Case 3 failed: tap on Vincent expected auto false, got ${c3Auto1}`)
    }

    const c3TStop1 = await page.evaluate(() => window.__streetWalk?.t)
    await sleep(1000)
    const c3TStop2 = await page.evaluate(() => window.__streetWalk?.t)
    if (c3TStop2 !== c3TStop1) {
      throw new Error(`Case 3 failed: t changed while stopped (drift: ${c3TStop2 - c3TStop1})`)
    }

    // Second tap on Vincent: auto true
    const box2 = await page.evaluate(() => window.__vincentBox?.())
    const cx2 = Math.round((box2.x0 + box2.x1) / 2)
    const cy2 = Math.round((box2.y0 + box2.y1) / 2)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx2, y: cy2, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    const c3Auto2 = await page.evaluate(() => window.__streetWalk?.auto)
    if (c3Auto2 !== true) {
      throw new Error(`Case 3 failed: second tap on Vincent expected auto true, got ${c3Auto2}`)
    }

    // Tap on Pause motion button
    const pausePos = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Pause') || b.getAttribute('aria-label')?.includes('Pause'),
      )
      if (!btn) return null
      const r = btn.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })
    if (!pausePos) throw new Error('Case 3 failed: Pause motion button not found')

    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: pausePos.x, y: pausePos.y, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await sleep(100)

    const c3TPause0 = await page.evaluate(() => window.__streetWalk?.t)
    const c3AutoPause0 = await page.evaluate(() => window.__streetWalk?.auto)
    if (!c3AutoPause0) throw new Error('Case 3 failed: auto should still be true after pause button tap')

    await sleep(1000)
    const c3TPause1 = await page.evaluate(() => window.__streetWalk?.t)
    const c3AutoPause1 = await page.evaluate(() => window.__streetWalk?.auto)
    if (c3TPause1 !== c3TPause0) {
      throw new Error(`Case 3 failed: t moved while paused (drift: ${c3TPause1 - c3TPause0})`)
    }
    if (!c3AutoPause1) throw new Error('Case 3 failed: auto should remain true while paused')

    // Resume motion by tapping Play motion
    const playPos = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Play') || b.getAttribute('aria-label')?.includes('Play'),
      )
      if (!btn) return null
      const r = btn.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })
    if (playPos) {
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: playPos.x, y: playPos.y, id: 0 }],
      })
      await sleep(50)
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
      await sleep(100)
    }

    // Helper for plain tap and positive control
    const tapAt = async (x, y) => {
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y, id: 0 }],
      })
      await sleep(50)
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    }

    const positiveControl = async (name) => {
      const box = await page.evaluate(() => window.__vincentBox?.())
      if (!box) throw new Error(`Case 3 precondition failed: __vincentBox missing before ${name}`)
      const x = Math.round((box.x0 + box.x1) / 2)
      const y = Math.round((box.y0 + box.y1) / 2)

      const autoBefore = await page.evaluate(() => window.__streetWalk?.auto)
      await tapAt(x, y)
      const autoToggled = await page.evaluate(() => window.__streetWalk?.auto)
      if (autoToggled === autoBefore) {
        throw new Error(`Case 3 failed: positive control before ${name} did not toggle auto`)
      }

      await tapAt(x, y)
      const autoRestored = await page.evaluate(() => window.__streetWalk?.auto)
      if (autoRestored !== autoBefore) {
        throw new Error(`Case 3 failed: positive control before ${name} did not restore auto`)
      }

      return { x, y }
    }

    // Positive control before second touch
    const pt2 = await positiveControl('second touch')

    // Second touch while first touch is held
    const autoBefore2nd = await page.evaluate(() => window.__streetWalk?.auto)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: pt2.x, y: pt2.y, id: 0 }],
    })
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: pt2.x, y: pt2.y, id: 0 },
        { x: pt2.x + 2, y: pt2.y + 2, id: 1 },
      ],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ x: pt2.x + 2, y: pt2.y + 2, id: 1 }],
    })
    const autoAfter2nd = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoAfter2nd !== autoBefore2nd) {
      throw new Error(`Case 3 failed: second touch changed auto (before=${autoBefore2nd}, after=${autoAfter2nd})`)
    }
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    const autoAfter1stEnd = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoAfter1stEnd !== autoBefore2nd) {
      throw new Error(`Case 3 failed: first touch ending after second touch changed auto (before=${autoBefore2nd}, after=${autoAfter1stEnd})`)
    }

    // Positive control before touchCancel
    const ptCancel = await positiveControl('touchCancel')

    // Touch ended by touchCancel: auto unchanged
    const autoBeforeCancel = await page.evaluate(() => window.__streetWalk?.auto)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: ptCancel.x, y: ptCancel.y, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    })
    const autoAfterCancel = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoAfterCancel !== autoBeforeCancel) {
      throw new Error('Case 3 failed: touchCancel changed auto')
    }

    // Positive control before drag
    const ptDrag = await positiveControl('drag')

    // Touch that moves 20 px: auto unchanged
    const autoBeforeMove = await page.evaluate(() => window.__streetWalk?.auto)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: ptDrag.x, y: ptDrag.y, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: ptDrag.x + 20, y: ptDrag.y, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    const autoAfterMove = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoAfterMove !== autoBeforeMove) {
      throw new Error('Case 3 failed: drag > 20px changed auto')
    }

    console.log('PASS: phone auto-walk, tap toggling, pause holds, multi-touch and drag rejected')

    // -------------------------------------------------------------
    // Case 4: Reduced motion
    // (Emulation.setEmulatedMedia prefers-reduced-motion: reduce) with walkMode=auto:
    // t unchanged over 2 s; a tap on Vincent: t equals 0.23 exactly. Two captures 1 s apart: byte-identical.
    // -------------------------------------------------------------
    await page.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto` })
    await page.waitForStreetReady()

    const c4T0 = await page.evaluate(() => window.__streetWalk?.t)
    if (c4T0 !== 0) throw new Error(`Case 4 precondition failed: t0 is ${c4T0}, expected 0`)

    await sleep(2000)
    const c4T1 = await page.evaluate(() => window.__streetWalk?.t)
    if (c4T1 !== 0) throw new Error(`Case 4 failed: t changed under reduced motion (drift: ${c4T1})`)

    const box4 = await page.evaluate(() => window.__vincentBox?.())
    const cx4 = Math.round((box4.x0 + box4.x1) / 2)
    const cy4 = Math.round((box4.y0 + box4.y1) / 2)

    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx4, y: cy4, id: 0 }],
    })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    const c4TapT = await page.evaluate(() => window.__streetWalk?.t)
    if (c4TapT !== 0.23) {
      throw new Error(`Case 4 failed: tap on Vincent gave t=${c4TapT}, expected exactly 0.23`)
    }

    const cap1 = await page.send('Page.captureScreenshot', { format: 'png' })
    await sleep(1000)
    const cap2 = await page.send('Page.captureScreenshot', { format: 'png' })
    if (cap1.data !== cap2.data) {
      throw new Error('Case 4 failed: two captures 1 s apart under reduced motion are not byte-identical')
    }
    console.log(`PASS: reduced motion still (t=0 over 2s), tap cuts to 0.23 (got ${c4TapT}), captures byte-identical`)

    // -------------------------------------------------------------
    // Case 5: The flat panel (F8)
    // ?street=1&flat=1&arrival=0: after 1 s __streetCamera() gives position [0.8, 0.285, 1.9]
    // and fov 30 (FLAT_VIEW, src/scene/streetGeometry.ts:594) within 1e-6, and __streetWalk and __vincentBox are undefined.
    // -------------------------------------------------------------
    await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await page.send('Page.navigate', { url: `${origin}/?street=1&flat=1&arrival=0` })
    await page.waitForStreetReady()
    await sleep(1000)

    const c5State = await page.evaluate(() => ({
      cam: typeof window.__streetCamera === 'function' ? window.__streetCamera() : null,
      walk: window.__streetWalk,
      vincent: window.__vincentBox,
    }))
    if (!c5State.cam) throw new Error('Case 5 failed: __streetCamera missing')
    const [fx, fy, fz] = c5State.cam.position
    if (Math.abs(fx - 0.8) > 1e-6 || Math.abs(fy - 0.285) > 1e-6 || Math.abs(fz - 1.9) > 1e-6) {
      throw new Error(`Case 5 failed: position was [${fx}, ${fy}, ${fz}], expected [0.8, 0.285, 1.9]`)
    }
    if (Math.abs(c5State.cam.fov - 30) > 1e-6) {
      throw new Error(`Case 5 failed: fov was ${c5State.cam.fov}, expected 30`)
    }
    if (c5State.walk !== undefined) {
      throw new Error('Case 5 failed: __streetWalk is defined')
    }
    if (c5State.vincent !== undefined) {
      throw new Error('Case 5 failed: __vincentBox is defined')
    }
    console.log('PASS: flat panel camera holds FLAT_VIEW, walk and vincent undefined')

    // -------------------------------------------------------------
    // Case 6: Codex's review, K1–K4 (the Lead, 2026-10-24). Each event pair is dispatched in one evaluate, so no
    // frame runs between them, and each check has its positive control first.
    // -------------------------------------------------------------
    const tNow = () => page.evaluate(() => window.__streetWalk?.t)
    const wheelOnCanvas = `document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: 600, deltaMode: 0, bubbles: true, cancelable: true }))`

    // K1, blur: a wheel turned and a blur before the next frame leave him where he stands
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()
    await sleep(500)
    const k1T0 = await tNow()
    await page.evaluate(wheelOnCanvas)
    await sleep(800)
    const k1T1 = await tNow()
    if (!(k1T1 - k1T0 > 0.01 / L)) throw new Error(`Case 6 precondition failed: a synthetic wheel did not walk (Δt ${k1T1 - k1T0})`)
    await page.evaluate(`${wheelOnCanvas}; window.dispatchEvent(new Event('blur'))`)
    await sleep(800)
    const k1Drift = Math.abs((await tNow()) - k1T1)
    if (k1Drift >= 0.002 / L) throw new Error(`Case 6 failed (K1): a wheel before a blur moved him by ${k1Drift.toFixed(5)}`)

    // K1, tap: a wheel turned and a tap that stops the automatic walk, before the next frame, leave him where he stands
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto` })
    await page.waitForStreetReady()
    await sleep(800)
    const tapOnVincent = `(() => {
      const b = window.__vincentBox(); const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2
      const c = document.querySelector('canvas'), o = { pointerId: 1, isPrimary: true, clientX: x, clientY: y, bubbles: true }
      c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o))
    })()`
    await page.evaluate(tapOnVincent)
    await sleep(200)
    if ((await page.evaluate(() => window.__streetWalk?.auto)) !== false) throw new Error('Case 6 precondition failed: a synthetic tap on Vincent did not stop the walk')
    await page.evaluate(tapOnVincent)
    await sleep(800)
    if ((await page.evaluate(() => window.__streetWalk?.auto)) !== true) throw new Error('Case 6 precondition failed: a second synthetic tap did not restart the walk')
    await page.evaluate(`${wheelOnCanvas}; ${tapOnVincent}`)
    await sleep(800)
    const k1TapT1 = await tNow()
    await sleep(800)
    const k1TapDrift = Math.abs((await tNow()) - k1TapT1)
    if ((await page.evaluate(() => window.__streetWalk?.auto)) !== false) throw new Error('Case 6 failed (K1): the tap with a queued wheel did not stop the walk')
    if (k1TapDrift >= 0.002 / L) throw new Error(`Case 6 failed (K1): a wheel before a stopping tap moved him by ${k1TapDrift.toFixed(5)} after it`)

    // K2: a key held over the scene and released over an input stops him
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()
    await sleep(500)
    const k2T0 = await tNow()
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' })))
    await sleep(500)
    const k2T1 = await tNow()
    if (!(k2T1 - k2T0 > 0.01 / L)) throw new Error(`Case 6 precondition failed: a synthetic keydown did not walk (Δt ${k2T1 - k2T0})`)
    await page.evaluate(() => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }))
      input.remove()
    })
    await sleep(800)
    const k2T2 = await tNow()
    await sleep(500)
    const k2Drift = Math.abs((await tNow()) - k2T2)
    if (k2Drift >= 0.002 / L) throw new Error(`Case 6 failed (K2): a key released over an input left him walking (drift ${k2Drift.toFixed(5)})`)

    // K3: under skyAnchor=A the street, the camera and Vincent move by the anchor's 5 once, so his box does not move
    const poseAt = async (extra) => {
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=2&arrival=0&walkMode=input${extra}` })
      await page.waitForStreetReady()
      // V1: his box takes in his figure, which turns side-on after a rest. Read it once he has turned and the lantern
      // has settled (τ 0.15 s), not mid-turn, where two loads differ by the turn's timing
      for (let i = 0; i < 150 && !((await page.evaluate(() => window.__vincentForm?.()))?.turn >= 1); i++) await sleep(100)
      await sleep(1000)
      return page.evaluate(() => ({ pose: window.__vincentPose?.(), box: window.__vincentBox?.() }))
    }
    const k3B = await poseAt('')
    const k3A = await poseAt('&skyAnchor=A')
    if (!k3B.pose || !k3A.pose || !k3B.box || !k3A.box) throw new Error('Case 6 precondition failed: __vincentPose or __vincentBox missing')
    const k3D = k3A.pose.world.map((v, i) => v - k3B.pose.world[i])
    if (Math.abs(k3D[0]) > 1e-4 || Math.abs(k3D[1]) > 1e-4 || Math.abs(k3D[2] - 5) > 1e-4) {
      throw new Error(`Case 6 failed (K3): anchor A moved Vincent by [${k3D.map((v) => v.toFixed(4))}], expected [0, 0, 5]`)
    }
    const k3Box = Math.max(...['x0', 'x1', 'y0', 'y1'].map((k) => Math.abs(k3A.box[k] - k3B.box[k])))
    if (k3Box > 1) throw new Error(`Case 6 failed (K3): anchor A moved his box by ${k3Box.toFixed(2)} px`)

    // K4: the gait the frame loop applies is on the rendered figure while he walks, and gone once he stands
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()
    await sleep(500)
    const k4Rest = await page.evaluate(() => window.__vincentPose?.())
    if (!k4Rest) throw new Error('Case 6 precondition failed: __vincentPose missing')
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    let k4Roll = 0
    let k4Arm = 0
    for (let i = 0; i < 12; i++) {
      await sleep(100)
      const p = await page.evaluate(() => window.__vincentPose?.())
      k4Roll = Math.max(k4Roll, Math.abs(p.roll))
      k4Arm = Math.max(k4Arm, Math.abs(p.arm))
    }
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    if (k4Roll < 0.005 || k4Arm < 0.05) throw new Error(`Case 6 failed (K4): walking, his largest roll was ${k4Roll.toFixed(4)} and arm ${k4Arm.toFixed(4)}, expected ≥ 0.005 and ≥ 0.05`)
    // V1: standing, he turns side-on after a rest and holds the lantern out. Wait on the turn, not on a fixed time (the
    // plan's Task 3 Step 1): his roll is 0, the left arm raised at -0.75 and the right arm at rest.
    let k4Turn = 0
    for (let i = 0; i < 150 && !(k4Turn >= 1 - 1e-9); i++) {
      await sleep(100)
      k4Turn = (await page.evaluate(() => window.__vincentForm?.()))?.turn ?? 0
    }
    if (!(k4Turn >= 1 - 1e-9)) throw new Error(`Case 6 failed (K4): standing, his turn was ${k4Turn} after 15 s, expected 1`)
    const k4End = await page.evaluate(() => window.__vincentPose?.())
    if (Math.abs(k4End.roll) > 1e-6 || Math.abs(k4End.arm + 0.75) > 1e-6 || Math.abs(k4End.armRight) > 1e-6) {
      throw new Error(`Case 6 failed (K4): standing and turned, his roll ${k4End.roll}, left arm ${k4End.arm} and right arm ${k4End.armRight}, expected 0, -0.75 and 0`)
    }
    console.log(`PASS: the review's fixes: a queued wheel dies with a blur and a stopping tap (drift ${k1Drift.toFixed(5)}, ${k1TapDrift.toFixed(5)}), a key released over an input stops him (${k2Drift.toFixed(5)}), anchor A moves him by [${k3D.map((v) => v.toFixed(3))}] and his box by ${k3Box.toFixed(2)} px, his gait shows while he walks (roll ${k4Roll.toFixed(4)}, arm ${k4Arm.toFixed(4)}) and settles to a roll of 0 with the left arm raised at -0.75 and the right at 0`)

    // -------------------------------------------------------------
    // Case 7 (V1): the dwell. ?street=1&walkT=0.2&walkMode=auto&arrival=0 at 390 × 844. __vincentForm() is recorded on
    // every animation frame until t has passed 0.23. On the form's own `clock` (the frame loop's clamped dt, not wall
    // time): the first frame at t 0.23 is the arrival, the first later frame above it the departure, the departure's
    // clock less the arrival's lies in [3.9, 4.2], turn reaches 1 between them and is 0 at the departure, and the
    // lantern's strength is 1 on every frame. Then the tap leg: a tap on him in a dwell stops the walk and ends the
    // dwell, a second tap starts the walk again.
    // -------------------------------------------------------------
    await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const c7Url = `${origin}/?street=1&walkT=0.2&walkMode=auto&arrival=0`
    await page.send('Page.navigate', { url: c7Url })
    await page.waitForStreetReady()
    const c7Run = await page.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise((resolve) => {
        const frames = []
        const start = performance.now()
        const step = () => {
          const f = window.__vincentForm?.()
          if (f) frames.push(f)
          if ((f && f.t > 0.23 + 1e-9) || performance.now() - start > 40000) resolve(frames)
          else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })`,
    })
    const c7Frames = c7Run.result?.value
    if (!Array.isArray(c7Frames) || c7Frames.length === 0) throw new Error('Case 7 precondition failed: __vincentForm gave no frame')
    const c7Arrive = c7Frames.findIndex((f) => Math.abs(f.t - 0.23) < 1e-9)
    if (c7Arrive < 0) throw new Error(`Case 7 failed: no frame at t 0.23 in ${c7Frames.length} frames (last t ${c7Frames.at(-1).t})`)
    const c7Depart = c7Frames.findIndex((f, i) => i > c7Arrive && f.t > 0.23 + 1e-9)
    if (c7Depart < 0) throw new Error(`Case 7 failed: he never left 0.23 within 40 s (${c7Frames.length} frames)`)
    const c7Dwell = c7Frames[c7Depart].clock - c7Frames[c7Arrive].clock
    if (!(c7Dwell >= 3.9 && c7Dwell <= 4.2)) throw new Error(`Case 7 failed: the dwell lasted ${c7Dwell.toFixed(3)} s on the form's clock, expected [3.9, 4.2]`)
    const c7Turn = Math.max(...c7Frames.slice(c7Arrive, c7Depart + 1).map((f) => f.turn))
    if (!(c7Turn >= 1 - 1e-9)) throw new Error(`Case 7 failed: the turn peaked at ${c7Turn} in the dwell, expected 1`)
    if (c7Frames[c7Depart].turn !== 0) throw new Error(`Case 7 failed: the turn was ${c7Frames[c7Depart].turn} at the departure, expected 0`)
    const c7Dark = c7Frames.filter((f) => f.lantern !== 1).length
    if (c7Dark > 0) throw new Error(`Case 7 failed: the lantern was not 1 on ${c7Dark} of ${c7Frames.length} frames`)

    // the tap leg
    await page.send('Page.navigate', { url: c7Url })
    await page.waitForStreetReady()
    const waitFor = async (fn, ms) => {
      const from = Date.now()
      while (Date.now() - from < ms) {
        if (await page.evaluate(fn)) return true
        await sleep(50)
      }
      return false
    }
    if (!(await waitFor(() => window.__vincentForm?.().dwell > 0, 40000))) throw new Error('Case 7 failed: no dwell began within 40 s')
    const c7Tap = async () => {
      const b = await page.evaluate(() => window.__vincentBox?.())
      if (!b) throw new Error('Case 7 precondition failed: __vincentBox missing')
      const x = Math.round((b.x0 + b.x1) / 2)
      const y = Math.round((b.y0 + b.y1) / 2)
      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
      await sleep(50)
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await c7Tap()
    if (!(await waitFor(() => window.__vincentForm?.().dwell === 0 && window.__vincentForm?.().auto === false, 2000))) {
      throw new Error(`Case 7 failed: after a tap in the dwell, state is ${JSON.stringify(await page.evaluate(() => window.__vincentForm?.()))}, expected dwell 0 and auto false`)
    }
    await c7Tap()
    if (!(await waitFor(() => window.__vincentForm?.().auto === true, 2000))) throw new Error('Case 7 failed: a second tap did not start the walk again')
    if (!(await waitFor(() => window.__vincentForm?.().t > 0.23 + 1e-9, 5000))) throw new Error('Case 7 failed: after the second tap t did not rise above 0.23 within 5 s')
    console.log(`PASS: the dwell lasts ${c7Dwell.toFixed(3)} s on the form's clock, the turn peaks at ${c7Turn}, the lantern is 1 on ${c7Frames.length} frames, a tap in the dwell stops the walk and a second tap restarts it`)

    await page.close()
  } finally {
    chrome.cleanup()
  }

  const chromesAfter = countHeadlessChromes()
  if (chromesAfter > chromesBefore) {
    throw new Error(`Headless Chrome leak detected: before=${chromesBefore}, after=${chromesAfter}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
