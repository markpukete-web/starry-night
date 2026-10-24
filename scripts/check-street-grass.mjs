#!/usr/bin/env node
/**
 * Task 4, Step 5: Grass checks for street mode.
 * Asserts the ten cases from tasks/2026-10-24-street-s3-plan.md:
 * 1. The hand bends: stop 0, __grassHand at a verge point: __grassPeak > 0.5 within 0.3 s.
 * 2. The blades move (S8): with ids=1, class-9 pixels within 80 px of held hand differ, none differ beyond 300 px.
 * 3. The sky and the roof: __grassHand at a point above horizon: __grassHit null and __grassStamps.hand unchanged.
 * 4. The walk re-casts (S3, C2): hand held still on verge, ArrowUp for 1 s: __grassHit moves by > 0.1, projected within 1 px.
 * 5. The phone: tap on Vincent toggles auto and leaves hand stamps unchanged. Down outside moved inside bends and does not toggle.
 *    Touch-drag bends and leaves auto. Touch canceled stops hand stamps.
 * 6. The swing and its end, vincent=0: hand held for 0.5 s, lifted: __grassPeak falls below 0.05 and rises again, __grassHandLive is 0 by 5.5 s.
 * 7. Vincent's feet: with Vincent walking, __grassStamps.feet rises and texels beside his place are live.
 * 8. Reduced motion, vincent=0: hand held bends (> 0.5), peak never rises again after lift, captures 1 s apart byte-identical.
 * 9. The pause (S6), vincent=0: hand lifted mid-swing, Pause motion on: captures byte-identical, new hand sweep adds no stamps, unpaused peak changes.
 * 10. grass=0: __grassCount undefined, canvas cursor is not grab.
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathPoint, pathTangent } from '../src/scene/streetLayout.ts'
import { GRASS_BLADE } from '../src/scene/grassBlade.ts'
import { decodePNG } from './lib/png.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5191/'
const parsedUrl = new URL(appUrl)
const origin = parsedUrl.origin

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
    const out = execSync("pgrep -fl '[C]hrome.*headless' 2>/dev/null | wc -l", { encoding: 'utf8' })
    return parseInt(out.trim(), 10) || 0
  } catch {
    return 0
  }
}

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-grass-'))
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

function getVerge3DPoint() {
  const [px, , pz] = pathPoint(0.12)
  const [tx, , tz] = pathTangent(0.12)
  const len = Math.hypot(tx, tz)
  const utx = tx / len
  const utz = tz / len
  const x = px + 0.15 * (-utz)
  const z = pz + 0.15 * utx
  const y = GRASS_BLADE.height / 2
  return [x, y, z]
}

async function getVergeClientPoint(page) {
  const vergePoint = getVerge3DPoint()
  return await page.evaluate((pt) => {
    return window.__walkProject(window.__streetWalk?.t ?? 0, pt)
  }, vergePoint)
}

async function main() {
  const chromesBefore = countHeadlessChromes()
  const port = 9555 + Math.floor(Math.random() * 300)
  const chrome = startChrome(port)

  try {
    await waitForChrome(port)
    const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
    const target = await response.json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()

    // Desktop viewport
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    // -------------------------------------------------------------
    // Case 1: The hand bends
    // stop 0, __grassHand at a verge point (precondition: __grassHit inside the map):
    // __grassPeak > 0.5 within 0.3 s.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()

    const stop0GrassCount = await page.evaluate(() => window.__grassCount)
    if (typeof stop0GrassCount !== 'number' || stop0GrassCount <= 0) {
      throw new Error(`Case 1 precondition failed: invalid __grassCount: ${stop0GrassCount}`)
    }
    console.log(`window.__grassCount at stop 0: ${stop0GrassCount}`)

    const [vx1, vy1] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx1, vy1])
    await sleep(50)

    const c1Hit = await page.evaluate(() => window.__grassHit)
    if (!c1Hit) {
      throw new Error('Case 1 precondition failed: __grassHit is null inside verge map')
    }

    const t0Case1 = Date.now()
    let c1Peak = 0
    while (Date.now() - t0Case1 < 300) {
      c1Peak = await page.evaluate(() => window.__grassPeak ?? 0)
      if (c1Peak > 0.5) break
      await sleep(20)
    }
    if (c1Peak <= 0.5) {
      throw new Error(`Case 1 failed: __grassPeak was ${c1Peak.toFixed(3)}, expected > 0.5 within 0.3 s`)
    }
    await page.evaluate(() => window.__grassHand(null))
    console.log(`PASS: case 1 - hand bends: __grassPeak > 0.5 within 0.3 s (peak=${c1Peak.toFixed(3)})`)

    // -------------------------------------------------------------
    // Case 2: The blades move (S8)
    // with ids=1, class-9 pixels within 80 px of a held hand differ from a capture without
    // the hand at the same pinned time, and none differ beyond 300 px.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&ids=1&pinnedTime=1.0` })
    await page.waitForStreetReady()
    await page.evaluate(() => window.__grassHand(null))
    await sleep(100)

    const shot1 = await page.send('Page.captureScreenshot', { format: 'png' })
    const img1 = decodePNG(Buffer.from(shot1.data, 'base64'))

    const [vx2, vy2] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx2, vy2])

    for (let i = 0; i < 20; i++) {
      await sleep(20)
      const p = await page.evaluate(() => window.__grassPeak ?? 0)
      if (p > 0.5) break
    }

    const shot2 = await page.send('Page.captureScreenshot', { format: 'png' })
    const img2 = decodePNG(Buffer.from(shot2.data, 'base64'))
    await page.evaluate(() => window.__grassHand(null))

    const W = img1.width
    const H = img1.height
    let differWithin80Class9 = 0
    let differBeyond300 = 0

    // Class 9 is vec3(0.0, 128/255, 1.0) -> in sRGB around (0, 188, 255)
    const isClass9 = (r, g, b) => r < 30 && g > 100 && b > 200

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4
        const r1 = img1.rgba[idx]
        const g1 = img1.rgba[idx + 1]
        const b1 = img1.rgba[idx + 2]
        const r2 = img2.rgba[idx]
        const g2 = img2.rgba[idx + 1]
        const b2 = img2.rgba[idx + 2]

        const differs = r1 !== r2 || g1 !== g2 || b1 !== b2
        if (differs) {
          const d = Math.hypot(x - vx2, y - vy2)
          if (d > 300) {
            differBeyond300++
          }
          if (d <= 80 && (isClass9(r1, g1, b1) || isClass9(r2, g2, b2))) {
            differWithin80Class9++
          }
        }
      }
    }

    if (differWithin80Class9 === 0) {
      throw new Error('Case 2 failed: no class-9 pixels differed within 80 px of the hand')
    }
    if (differBeyond300 > 0) {
      throw new Error(`Case 2 failed: ${differBeyond300} pixels differed beyond 300 px from the hand`)
    }
    console.log(
      `PASS: case 2 - blades move: ${differWithin80Class9} class-9 pixels differ within 80 px, 0 differ beyond 300 px`,
    )

    // -------------------------------------------------------------
    // Case 3: The sky and the roof
    // __grassHand at a point above the horizon: __grassHit null and __grassStamps.hand unchanged.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()

    const stamps3Before = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    await page.evaluate(() => window.__grassHand(800, 100))
    await sleep(200)

    const c3Hit = await page.evaluate(() => window.__grassHit)
    const stamps3After = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (c3Hit !== null) {
      throw new Error(`Case 3 failed: __grassHit was not null above horizon (got ${JSON.stringify(c3Hit)})`)
    }
    if (stamps3After !== stamps3Before) {
      throw new Error(`Case 3 failed: __grassStamps.hand changed from ${stamps3Before} to ${stamps3After}`)
    }
    await page.evaluate(() => window.__grassHand(null))
    console.log('PASS: case 3 - sky and roof: __grassHit null and stamps.hand unchanged')

    // -------------------------------------------------------------
    // Case 4: The walk re-casts (S3, C2)
    // the hand held still on the verge, ArrowUp for 1 s: __grassHit moves by > 0.1.
    // On ten frames during the walk, page projects hit through __walkProject: within 1 px.
    // Precondition: __grassHit.t advances by >= 0.002 between sampled frames.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await page.waitForStreetReady()

    const [vx4, vy4] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx4, vy4])
    await sleep(100)

    const c4Hit0 = await page.evaluate(() => window.__grassHit)
    if (!c4Hit0) throw new Error('Case 4 precondition failed: initial __grassHit is null')

    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })

    let lastT = c4Hit0.t
    const projErrors = []
    const castPlaneY = GRASS_BLADE.height / 2

    for (let i = 0; i < 10; i++) {
      await sleep(100)
      const hit = await page.evaluate(() => window.__grassHit)
      if (!hit) throw new Error(`Case 4 frame ${i}: __grassHit became null`)
      const dt = hit.t - lastT
      if (dt < 0.002) {
        throw new Error(`Case 4 precondition failed: __grassHit.t did not advance by >= 0.002 (dt=${dt.toFixed(4)})`)
      }
      lastT = hit.t

      const proj = await page.evaluate(
        ({ t, x, z, y }) => window.__walkProject(t, [x, y, z]),
        { t: hit.t, x: hit.x, z: hit.z, y: castPlaneY },
      )
      const err = Math.hypot(proj[0] - vx4, proj[1] - vy4)
      if (err > 1.0) {
        throw new Error(`Case 4 frame ${i}: projected [${proj[0].toFixed(1)}, ${proj[1].toFixed(1)}] is ${err.toFixed(2)} px from [${vx4}, ${vy4}]`)
      }
      projErrors.push(err)
    }

    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    const c4HitFinal = await page.evaluate(() => window.__grassHit)
    const c4Dist = Math.hypot(c4HitFinal.x - c4Hit0.x, c4HitFinal.z - c4Hit0.z)

    if (c4Dist <= 0.1) {
      throw new Error(`Case 4 failed: __grassHit moved by ${c4Dist.toFixed(3)}, expected > 0.1`)
    }
    await page.evaluate(() => window.__grassHand(null))
    console.log(
      `PASS: case 4 - walk re-casts: hit moved by ${c4Dist.toFixed(3)} > 0.1, all 10 frames projected within 1 px (max error: ${Math.max(...projErrors).toFixed(2)} px)`,
    )

    // -------------------------------------------------------------
    // Case 5: The phone (walkMode=auto, touch, 390 × 844)
    // a tap on Vincent toggles auto and leaves __grassStamps.hand unchanged (precondition: tap elsewhere does not toggle).
    // A down 1 px outside his padded box moved 2 px inside by its up bends (hand stamps rise) and does not toggle.
    // A touch-drag across the verge bends and leaves auto as it was.
    // A touch ended by touchCancel stops the hand's stamps at once.
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

    const autoInit = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoInit !== true) {
      throw new Error(`Case 5 precondition failed: auto is ${autoInit}, expected true`)
    }

    // Precondition: tap elsewhere does not toggle auto
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 50, y: 50, id: 0 }] })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(100)
    const autoPre = await page.evaluate(() => window.__streetWalk?.auto)
    if (autoPre !== true) {
      throw new Error('Case 5 precondition failed: tap elsewhere toggled auto')
    }

    // Tap on Vincent toggles auto and leaves __grassStamps.hand unchanged
    const stamps5A = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    const vincentBox = await page.evaluate(() => window.__vincentBox())
    const vcx = Math.round((vincentBox.x0 + vincentBox.x1) / 2)
    const vcy = Math.round((vincentBox.y0 + vincentBox.y1) / 2)

    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vcx, y: vcy, id: 0 }] })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(100)

    const autoAfterTapV = await page.evaluate(() => window.__streetWalk?.auto)
    const stamps5AfterTapV = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (autoAfterTapV !== false) {
      throw new Error(`Case 5 failed: tap on Vincent expected auto false, got ${autoAfterTapV}`)
    }
    if (stamps5AfterTapV !== stamps5A) {
      throw new Error(`Case 5 failed: tap on Vincent changed hand stamps (${stamps5A} -> ${stamps5AfterTapV})`)
    }

    // A down 1 px outside his padded box moved 2 px inside by its up bends (hand stamps rise) and does not toggle
    const padded = await page.evaluate(() => {
      const b = window.__vincentBox()
      const cx = (b.x0 + b.x1) / 2
      const cy = (b.y0 + b.y1) / 2
      const hw = Math.max((b.x1 - b.x0) / 2, 24)
      const hh = Math.max((b.y1 - b.y0) / 2, 24)
      return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh, cx, cy }
    })
    const downX = Math.round(padded.x1 + 1)
    const downY = Math.round(padded.cy)
    const upX = Math.round(padded.x1 - 1)
    const upY = Math.round(padded.cy)

    const stampsBeforeB = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: downX, y: downY, id: 0 }] })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: upX, y: upY, id: 0 }] })
    await sleep(50)
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(100)

    const autoAfterB = await page.evaluate(() => window.__streetWalk?.auto)
    const stampsAfterB = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (autoAfterB !== false) {
      throw new Error('Case 5 failed: down outside moved inside toggled auto (should not toggle)')
    }
    if (stampsAfterB <= stampsBeforeB) {
      throw new Error(`Case 5 failed: hand stamps did not rise for down outside box (${stampsBeforeB} -> ${stampsAfterB})`)
    }

    // A touch-drag across the verge bends and leaves auto as it was
    const stampsBeforeC = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 481, id: 0 }] })
    await sleep(40)
    await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350, y: 481, id: 0 }] })
    await sleep(40)
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(100)

    const autoAfterC = await page.evaluate(() => window.__streetWalk?.auto)
    const stampsAfterC = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (autoAfterC !== false) {
      throw new Error('Case 5 failed: touch-drag across verge changed auto')
    }
    if (stampsAfterC <= stampsBeforeC) {
      throw new Error(`Case 5 failed: touch-drag across verge did not rise hand stamps (${stampsBeforeC} -> ${stampsAfterC})`)
    }

    // A touch ended by touchCancel stops the hand's stamps at once
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 339, y: 481, id: 0 }] })
    await sleep(100)
    await page.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    const stampsAfterCancel = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    await sleep(250)
    const stampsAfterWait = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (stampsAfterWait !== stampsAfterCancel) {
      throw new Error(`Case 5 failed: hand stamps continued rising after touchCancel (${stampsAfterCancel} -> ${stampsAfterWait})`)
    }
    console.log('PASS: case 5 - phone touch: vincent admission, drag across verge, touchCancel verified')

    // Restore desktop emulation
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    // -------------------------------------------------------------
    // Case 6: The swing and its end, with vincent=0 (S5)
    // hand held still on verge for 0.5 s, lifted: __grassPeak falls below 0.05 and rises again,
    // and __grassHandLive is 0 by 5.5 s.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0` })
    await page.waitForStreetReady()

    const [vx6, vy6] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx6, vy6])
    await sleep(500)

    const p6Held = await page.evaluate(() => window.__grassPeak ?? 0)
    if (p6Held <= 0.5) throw new Error(`Case 6 precondition failed: peak was ${p6Held.toFixed(3)}, expected > 0.5`)

    await page.evaluate(() => window.__grassHand(null))

    const t0Case6 = Date.now()
    let sawBelow005 = false
    let sawSwingRise = false
    let handLiveAtEnd = 1
    let minPeakAfterRelease = Infinity

    while (Date.now() - t0Case6 < 5500) {
      await sleep(40)
      const st = await page.evaluate(() => ({
        peak: window.__grassPeak ?? 0,
        handLive: window.__grassHandLive ?? 0,
      }))
      if (st.peak < minPeakAfterRelease) minPeakAfterRelease = st.peak
      if (st.peak < 0.05) sawBelow005 = true
      if (sawBelow005 && st.peak > minPeakAfterRelease + 0.03) {
        sawSwingRise = true
      }
      handLiveAtEnd = st.handLive
      if (sawSwingRise && handLiveAtEnd === 0 && Date.now() - t0Case6 > 4200) {
        break
      }
    }

    if (!sawBelow005) {
      throw new Error(`Case 6 failed: __grassPeak did not fall below 0.05 (min was ${minPeakAfterRelease.toFixed(3)})`)
    }
    if (!sawSwingRise) {
      throw new Error('Case 6 failed: __grassPeak did not rise again after falling below 0.05')
    }
    if (handLiveAtEnd !== 0) {
      throw new Error(`Case 6 failed: __grassHandLive was not 0 by 5.5 s (got ${handLiveAtEnd})`)
    }
    console.log('PASS: case 6 - swing and its end: peak fell below 0.05, rose again, and handLive is 0 by 5.5 s')

    // -------------------------------------------------------------
    // Case 7: Vincent's feet
    // with Vincent walking, __grassStamps.feet rises and texels beside his place are live.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto&vincent=1` })
    await page.waitForStreetReady()

    const feet0 = await page.evaluate(() => window.__grassStamps?.feet ?? 0)
    await sleep(1500)
    const feet1 = await page.evaluate(() => window.__grassStamps?.feet ?? 0)

    if (feet1 <= feet0) {
      throw new Error(`Case 7 failed: __grassStamps.feet did not rise while walking (${feet0} -> ${feet1})`)
    }
    const peakFeet = await page.evaluate(() => window.__grassPeak ?? 0)
    if (peakFeet <= 0) {
      throw new Error('Case 7 failed: no live texels beside Vincent')
    }
    console.log(`PASS: case 7 - Vincent feet: stamps.feet rose (${feet0} -> ${feet1}) and texels are live`)

    // -------------------------------------------------------------
    // Case 8: Reduced motion, vincent=0
    // hand held still bends (> 0.5). After it lifts, __grassPeak never rises again,
    // and two captures 1 s apart, from 1 s after release, are byte-identical.
    // -------------------------------------------------------------
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0` })
    await page.waitForStreetReady()

    const [vx8, vy8] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx8, vy8])
    await sleep(300)

    const p8Held = await page.evaluate(() => window.__grassPeak ?? 0)
    if (p8Held <= 0.5) {
      throw new Error(`Case 8 failed: hand held peak was ${p8Held.toFixed(3)}, expected > 0.5`)
    }

    await page.evaluate(() => window.__grassHand(null))

    let prevPeak8 = p8Held
    for (let i = 0; i < 20; i++) {
      await sleep(50)
      const curr = await page.evaluate(() => window.__grassPeak ?? 0)
      if (curr > prevPeak8 + 1e-4) {
        throw new Error(`Case 8 failed: __grassPeak rose after lift under reduced motion (${prevPeak8.toFixed(4)} -> ${curr.toFixed(4)})`)
      }
      prevPeak8 = curr
    }

    const cap8A = await page.send('Page.captureScreenshot', { format: 'png' })
    await sleep(1000)
    const cap8B = await page.send('Page.captureScreenshot', { format: 'png' })

    const buf8A = Buffer.from(cap8A.data, 'base64')
    const buf8B = Buffer.from(cap8B.data, 'base64')
    if (Buffer.compare(buf8A, buf8B) !== 0) {
      throw new Error('Case 8 failed: two captures 1 s apart under reduced motion were not byte-identical')
    }
    console.log('PASS: case 8 - reduced motion: peak bent > 0.5, never rose after lift, and captures 1 s apart are byte-identical')

    // -------------------------------------------------------------
    // Case 9: The pause (S6), vincent=0
    // hand lifted mid-swing, then Pause motion on: two captures 0.1 s and 1 s apart are byte-identical,
    // and a new hand sweep adds no hand stamps. Pause off: __grassPeak changes again.
    // -------------------------------------------------------------
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: '' }] })
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0` })
    await page.waitForStreetReady()

    const [vx9, vy9] = await getVergeClientPoint(page)
    await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx9, vy9])
    await sleep(300)

    const p9Held = await page.evaluate(() => window.__grassPeak ?? 0)
    if (p9Held <= 0.5) throw new Error(`Case 9 precondition failed: peak was ${p9Held.toFixed(3)}`)

    await page.evaluate(() => window.__grassHand(null))
    await sleep(100)

    // Pause motion on
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Pause') || b.getAttribute('aria-label')?.includes('Pause'),
      )
      btn?.click()
    })
    await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.includes('Play') || b.getAttribute('aria-label')?.includes('Play') || b.textContent?.includes('Resume'),
        )
        if (btn) {
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          return
        }
        await new Promise((r) => setTimeout(r, 20))
      }
    })
    await sleep(300)

    const cap9A = await page.send('Page.captureScreenshot', { format: 'png' })
    await sleep(100)
    const cap9B = await page.send('Page.captureScreenshot', { format: 'png' })
    await sleep(900)
    const cap9C = await page.send('Page.captureScreenshot', { format: 'png' })

    const buf9A = Buffer.from(cap9A.data, 'base64')
    const buf9B = Buffer.from(cap9B.data, 'base64')
    const buf9C = Buffer.from(cap9C.data, 'base64')

    if (Buffer.compare(buf9A, buf9B) !== 0) {
      const imA = decodePNG(buf9A)
      const imB = decodePNG(buf9B)
      const diffs = []
      for (let y = 0; y < imA.height; y++) {
        for (let x = 0; x < imA.width; x++) {
          const i = (y * imA.width + x) * 4
          if (imA.rgba[i] !== imB.rgba[i] || imA.rgba[i+1] !== imB.rgba[i+1] || imA.rgba[i+2] !== imB.rgba[i+2]) {
            if (diffs.length < 10) diffs.push({ x, y, a: [imA.rgba[i], imA.rgba[i+1], imA.rgba[i+2]], b: [imB.rgba[i], imB.rgba[i+1], imB.rgba[i+2]] })
          }
        }
      }
      console.log('Case 9 diffs between cap9A and cap9B (0.1s):', diffs)
      throw new Error('Case 9 failed: captures 0.1 s apart while paused were not byte-identical')
    }
    if (Buffer.compare(buf9A, buf9C) !== 0) {
      throw new Error('Case 9 failed: captures 1.0 s apart while paused were not byte-identical')
    }

    // New hand sweep while paused
    const stamps9Before = await page.evaluate(() => window.__grassStamps?.hand ?? 0)
    await page.evaluate(([x, y]) => window.__grassHand(x - 10, y), [vx9, vy9])
    await sleep(50)
    await page.evaluate(([x, y]) => window.__grassHand(x + 10, y), [vx9, vy9])
    await sleep(50)
    await page.evaluate(() => window.__grassHand(null))
    const stamps9After = await page.evaluate(() => window.__grassStamps?.hand ?? 0)

    if (stamps9After !== stamps9Before) {
      throw new Error(`Case 9 failed: hand sweep while paused added hand stamps (${stamps9Before} -> ${stamps9After})`)
    }

    // Pause off: __grassPeak changes again
    const peakPaused = await page.evaluate(() => window.__grassPeak ?? 0)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Resume') || b.textContent?.includes('Play') || b.getAttribute('aria-label')?.includes('Resume'),
      )
      btn?.click()
    })
    await sleep(250)
    const peakResumed = await page.evaluate(() => window.__grassPeak ?? 0)

    if (Math.abs(peakResumed - peakPaused) < 1e-4) {
      throw new Error(`Case 9 failed: __grassPeak did not change after unpausing (stayed ${peakPaused.toFixed(4)})`)
    }
    console.log('PASS: case 9 - pause freezes trail: captures byte-identical, no stamps added, resumes when unpaused')

    // -------------------------------------------------------------
    // Case 10: grass=0
    // __grassCount undefined, canvas cursor is not grab.
    // -------------------------------------------------------------
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&grass=0` })
    await page.waitForStreetReady()

    const count10 = await page.evaluate(() => window.__grassCount)
    const cursor10 = await page.evaluate(() => document.querySelector('canvas')?.style.cursor)

    if (count10 !== undefined) {
      throw new Error(`Case 10 failed: __grassCount was defined with grass=0 (${count10})`)
    }
    if (cursor10 === 'grab') {
      throw new Error('Case 10 failed: canvas cursor was grab with grass=0')
    }
    console.log(`PASS: case 10 - grass=0: __grassCount undefined, canvas cursor is not grab (cursor="${cursor10 ?? ''}")`)

    await page.close()
  } finally {
    chrome.cleanup()
  }

  const chromesAfter = countHeadlessChromes()
  if (chromesAfter > chromesBefore) {
    try {
      execSync("pkill -fl '[C]hrome.*headless' 2>/dev/null || true")
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
