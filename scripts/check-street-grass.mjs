#!/usr/bin/env node
/**
 * Task 4, Step 5: Grass checks for street mode.
 * Asserts the ten cases from tasks/2026-10-24-street-s3-plan.md:
 * 1. The hand bends: stop 0, __grassHand at a verge point: __grassPeak > 0.5 within 0.3 s.
 * 2. The blades move (S8): with ids=1, class-9 pixels within 80 px of held hand differ, none differ beyond 300 px.
 * 3. The sky and the roof: __grassHand at a point above horizon: __grassHit null and __grassStamps.hand unchanged.
 * 4. The walk re-casts (S3, C2): hand held still on verge, ArrowUp for 1 s: __grassHit moves by > 0.1, projected within 0.25 px.
 * 5. The phone: tap on Vincent toggles auto and leaves hand stamps unchanged. Down outside moved inside bends and does not toggle.
 *    Touch-drag bends and leaves auto. Touch canceled stops hand stamps.
 * 6. The swing and its end, vincent=0: hand held for 0.5 s, lifted: __grassPeak falls below 0.05 and rises again, __grassHandLive is 0 by 5.5 s.
 * 7. Vincent's feet: with Vincent walking, __grassStamps.feet rises and texels beside his place are live.
 * 8. Reduced motion, vincent=0: hand held bends (> 0.5), peak never rises again after lift, captures 1 s apart byte-identical.
 * 9. The pause (S6), vincent=0: hand lifted mid-swing, Pause motion on: captures byte-identical, new hand sweep adds no stamps, unpaused peak changes.
 * 10. grass=0: __grassCount undefined, canvas cursor is not grab.
 * 11. Anchor A: cases 1 and 7 again under skyAnchor=A.
 * 12. Focus loss (Codex F01): a real mouse move stamps, a window blur stops the stamps, the next move restarts them.
 * 13. walk=0 (Codex, PR #22): a touch-drag across the verge moves __grassHit with the finger.
 * 14. The moon's GLSL by number (S3b task 1): grassMoonFacing, drawn to pixels at 255 per unit, reads back within 1/255
 *     of bladeMoonFacing for both curl signs, signed lean, yaw 0 and ±0.4, three right vectors and a straight blade.
 * 15. The hand against lit tops (S3b task 1), stop 0, vincent=0: the hand held on the verge brightens by more than
 *     5 L*, within 80 px of it, at least 0.85 as many pixels on the lit page as on the unlit one (main's program).
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathPoint, pathTangent, STREET, vincentPlace } from '../src/scene/streetLayout.ts'
import { bladeMoonFacing, GRASS_BLADE, GRASS_MOON_GLSL } from '../src/scene/grassBlade.ts'
import { STREET_MOON } from '../src/scene/streetLight.ts'
import { decodePNG } from './lib/png.ts'
import { WALK } from '../src/scene/streetWalk.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5191/'
const parsedUrl = new URL(appUrl)
const origin = parsedUrl.origin

const caseArgIdx = process.argv.indexOf('--case')
const targetCase = caseArgIdx >= 0 ? parseInt(process.argv[caseArgIdx + 1], 10) : null
const shouldRun = (c) => targetCase === null || targetCase === c

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
    // stops only the browser this run started: a machine-wide count would signal another agent's Chrome (Codex F02)
    async cleanup() {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise((resolve) => child.once('exit', () => resolve(true)))
        child.kill()
        if (!(await Promise.race([exited, sleep(5000).then(() => false)]))) {
          child.kill('SIGKILL')
          console.error(`FAIL: this run's headless Chrome (pid ${child.pid}) did not exit within 5 s of TERM`)
          process.exitCode = 1
        }
      }
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
    if (shouldRun(1)) {
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0` })
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
    }

    // -------------------------------------------------------------
    // Case 2: The blades move (S8)
    // with ids=1, class-9 pixels within 80 px of a held hand differ from a capture without
    // the hand at the same pinned time, and none differ beyond 300 px.
    // -------------------------------------------------------------
    if (shouldRun(2)) {
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&ids=1&vincent=0` })
      await page.waitForStreetReady()
      await page.evaluate(() => {
        window.__skyTime = 1
        window.__grassHand(null)
      })
      await sleep(100)

      // Precondition: two captures 0.2 s apart without the hand are byte-identical
      const shotPre1 = await page.send('Page.captureScreenshot', { format: 'png' })
      await sleep(200)
      const shotPre2 = await page.send('Page.captureScreenshot', { format: 'png' })
      const bufPre1 = Buffer.from(shotPre1.data, 'base64')
      const bufPre2 = Buffer.from(shotPre2.data, 'base64')
      if (Buffer.compare(bufPre1, bufPre2) !== 0) {
        throw new Error('Case 2 precondition failed: two captures 0.2 s apart without hand were not byte-identical')
      }

      const img1 = decodePNG(bufPre1)

      const [vx2, vy2] = await getVergeClientPoint(page)
      await page.evaluate(([x, y]) => {
        window.__skyTime = 1
        window.__grassHand(x, y)
      }, [vx2, vy2])

      for (let i = 0; i < 20; i++) {
        await sleep(20)
        const p = await page.evaluate(() => window.__grassPeak ?? 0)
        if (p > 0.5) break
      }

      await page.evaluate(() => {
        window.__skyTime = 1
      })
      const shot2 = await page.send('Page.captureScreenshot', { format: 'png' })
      const img2 = decodePNG(Buffer.from(shot2.data, 'base64'))
      await page.evaluate(() => {
        window.__grassHand(null)
        delete window.__skyTime
      })

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
    }

    // -------------------------------------------------------------
    // Case 3: The sky and the roof
    // __grassHand at a point above the horizon: __grassHit null and __grassStamps.hand unchanged.
    // -------------------------------------------------------------
    if (shouldRun(3)) {
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
    }

    // -------------------------------------------------------------
    // Case 4: The walk re-casts (S3, C2)
    // the hand held still on the verge, ArrowUp for 1 s: __grassHit moves by > 0.1.
    // On ten frames during the walk, page projects hit through __walkProject: within 0.25 px.
    // Precondition: __grassHit.t advances by >= 0.002 between sampled frames.
    // -------------------------------------------------------------
    if (shouldRun(4)) {
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
        // 0.25 px: correct code reads 0.00, and a ray cast through last frame's matrix (the walk's updateMatrixWorld
        // deleted) reads 0.90 at the arrow key's pace, which a 1 px bound let through (S3 task 6, G8)
        if (err > 0.25) {
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
        `PASS: case 4 - walk re-casts: hit moved by ${c4Dist.toFixed(3)} > 0.1, all 10 frames projected within 0.25 px (max error: ${Math.max(...projErrors).toFixed(2)} px)`,
      )
    }

    // -------------------------------------------------------------
    // Case 5: The phone (walkMode=auto, touch, 390 × 844)
    // a tap on Vincent toggles auto and leaves __grassStamps.hand unchanged (precondition: tap elsewhere does not toggle).
    // A down 1 px outside his padded box moved 2 px inside by its up bends (hand stamps rise) and does not toggle.
    // A touch-drag across the verge bends and leaves auto as it was.
    // A touch ended by touchCancel stops the hand's stamps at once.
    // -------------------------------------------------------------
    if (shouldRun(5)) {
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
      const padded = await page.evaluate((hitMinHalf) => {
        const b = window.__vincentBox()
        const cx = (b.x0 + b.x1) / 2
        const cy = (b.y0 + b.y1) / 2
        const hw = Math.max((b.x1 - b.x0) / 2, hitMinHalf)
        const hh = Math.max((b.y1 - b.y0) / 2, hitMinHalf)
        return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh, cx, cy }
      }, WALK.hitMin / 2)
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
    }

    // -------------------------------------------------------------
    // Case 6: The swing and its end, with vincent=0 (S5)
    // hand held still on verge for 0.5 s, lifted: __grassPeak falls below 0.05 and rises again,
    // and __grassHandLive is 0 by 5.5 s.
    // -------------------------------------------------------------
    if (shouldRun(6)) {
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
    }

    // -------------------------------------------------------------
    // Case 7: Vincent's feet
    // with Vincent walking, __grassStamps.feet rises and texels beside his place are live.
    // -------------------------------------------------------------
    if (shouldRun(7)) {
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
      const walkT = await page.evaluate(() => window.__streetWalk?.t ?? 0)
      const p = vincentPlace(walkT).position
      const q = pathPoint(walkT)

      const pushP = await page.evaluate(([x, z]) => window.__grassPushNear(x, z, 0.06), [p[0], p[2]])
      if (pushP <= 0.1) {
        throw new Error(`Case 7 failed: __grassPushNear at Vincent's place was ${pushP.toFixed(3)}, expected > 0.1`)
      }

      const pushQ = await page.evaluate(([x, z]) => window.__grassPushNear(x, z, 0.06), [q[0], q[2]])
      if (pushQ !== 0) {
        throw new Error(`Case 7 failed: __grassPushNear at pathPoint was ${pushQ.toFixed(3)}, expected 0`)
      }
      console.log(`PASS: case 7 - Vincent feet: stamps.feet rose (${feet0} -> ${feet1}), pushNear at place=${pushP.toFixed(3)} > 0.1, pushNear at pathPoint=0`)
    }

    // -------------------------------------------------------------
    // Case 8: Reduced motion, vincent=0
    // hand held still bends (> 0.5). After it lifts, __grassPeak never rises again,
    // and two captures 1 s apart, from 1 s after release, are byte-identical.
    // -------------------------------------------------------------
    if (shouldRun(8)) {
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
    }

    // -------------------------------------------------------------
    // Case 9: The pause (S6), vincent=0
    // hand lifted mid-swing, then Pause motion on: two captures 0.1 s and 1 s apart are byte-identical,
    // and a new hand sweep adds no hand stamps. Pause off: __grassPeak changes again.
    // -------------------------------------------------------------
    if (shouldRun(9)) {
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
    }

    // -------------------------------------------------------------
    // Case 10: grass=0
    // __grassCount undefined, canvas cursor is not grab.
    // -------------------------------------------------------------
    if (shouldRun(10)) {
      // First load without grass=0: canvas cursor must be grab
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
      await page.waitForStreetReady()
      const cursorWithGrass = await page.evaluate(() => document.querySelector('canvas')?.style.cursor)
      if (cursorWithGrass !== 'grab') {
        throw new Error(`Case 10 precondition failed: canvas cursor was "${cursorWithGrass}", expected "grab" with grass enabled`)
      }

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
      console.log(`PASS: case 10 - grass=0: cursor was grab with grass on, __grassCount undefined and cursor not grab with grass=0 (cursor="${cursor10 ?? ''}")`)
    }

    // -------------------------------------------------------------
    // Case 11: anchor A
    // with &skyAnchor=A, repeat case 1 (with &vincent=0) and case 7.
    // Case 1's verge point is the same layout point plus STREET.originA,
    // projected with __walkProject.
    // In case 7 under anchor A, __grassPeakAt and vincentPlace are both
    // in the street's own coordinates, so compare them as they are.
    // Both must pass.
    // -------------------------------------------------------------
    if (shouldRun(11)) {
      // Part A: repeat case 1 with &vincent=0 &skyAnchor=A
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0&skyAnchor=A` })
      await page.waitForStreetReady()

      const stop0GrassCountA = await page.evaluate(() => window.__grassCount)
      if (typeof stop0GrassCountA !== 'number' || stop0GrassCountA <= 0) {
        throw new Error(`Case 11 precondition failed: invalid __grassCount: ${stop0GrassCountA}`)
      }

      const vergeBase = getVerge3DPoint()
      const vergePtA = [
        vergeBase[0] + STREET.originA[0],
        vergeBase[1] + STREET.originA[1],
        vergeBase[2] + STREET.originA[2],
      ]
      const [vx11, vy11] = await page.evaluate((pt) => {
        return window.__walkProject(window.__streetWalk?.t ?? 0, pt)
      }, vergePtA)

      await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx11, vy11])
      await sleep(50)

      const c11Hit = await page.evaluate(() => window.__grassHit)
      if (!c11Hit) {
        throw new Error('Case 11 (case 1 under anchor A) failed: __grassHit is null inside verge map')
      }

      const t0Case11 = Date.now()
      let c11Peak = 0
      while (Date.now() - t0Case11 < 300) {
        c11Peak = await page.evaluate(() => window.__grassPeak ?? 0)
        if (c11Peak > 0.5) break
        await sleep(20)
      }
      if (c11Peak <= 0.5) {
        throw new Error(`Case 11 (case 1 under anchor A) failed: __grassPeak was ${c11Peak.toFixed(3)}, expected > 0.5 within 0.3 s`)
      }
      await page.evaluate(() => window.__grassHand(null))

      // Part B: repeat case 7 with &skyAnchor=A
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto&vincent=1&skyAnchor=A` })
      await page.waitForStreetReady()

      const feet11_0 = await page.evaluate(() => window.__grassStamps?.feet ?? 0)
      await sleep(1500)
      const feet11_1 = await page.evaluate(() => window.__grassStamps?.feet ?? 0)

      if (feet11_1 <= feet11_0) {
        throw new Error(`Case 11 (case 7 under anchor A) failed: __grassStamps.feet did not rise while walking (${feet11_0} -> ${feet11_1})`)
      }
      const peakFeet11 = await page.evaluate(() => window.__grassPeak ?? 0)
      if (peakFeet11 <= 0) {
        throw new Error('Case 11 (case 7 under anchor A) failed: no live texels beside Vincent')
      }
      const walkT11 = await page.evaluate(() => window.__streetWalk?.t ?? 0)
      const p11 = vincentPlace(walkT11).position
      const q11 = pathPoint(walkT11)

      const pushP11 = await page.evaluate(([x, z]) => window.__grassPushNear(x, z, 0.06), [p11[0], p11[2]])
      if (pushP11 <= 0.1) {
        throw new Error(`Case 11 (case 7 under anchor A) failed: __grassPushNear at Vincent's place was ${pushP11.toFixed(3)}, expected > 0.1`)
      }

      const pushQ11 = await page.evaluate(([x, z]) => window.__grassPushNear(x, z, 0.06), [q11[0], q11[2]])
      if (pushQ11 !== 0) {
        throw new Error(`Case 11 (case 7 under anchor A) failed: __grassPushNear at pathPoint was ${pushQ11.toFixed(3)}, expected 0`)
      }
      console.log(`PASS: case 11 - anchor A: case 1 hand bends (peak=${c11Peak.toFixed(3)}) and case 7 feet footprint verified (pushAtPlace=${pushP11.toFixed(3)} > 0.1, pushAtPathPoint=0)`)
    }

    // -------------------------------------------------------------
    // Case 12: Focus loss (Codex F01), vincent=0: a real mouse move over the verge stamps, a window blur stops the
    // stamps, and the next move starts them again. The real pointer path, not __grassHand.
    // -------------------------------------------------------------
    if (shouldRun(12)) {
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0` })
      await page.waitForStreetReady()
      const [vx12, vy12] = await getVergeClientPoint(page)
      const move12 = ([x, y]) =>
        document.querySelector('canvas').dispatchEvent(
          new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true, bubbles: true }),
        )
      const handStamps = () => page.evaluate(() => window.__grassStamps.hand)

      const s0 = await handStamps()
      await page.evaluate(move12, [vx12, vy12])
      await sleep(250)
      const s1 = await handStamps()
      if (s1 <= s0) throw new Error(`Case 12 precondition failed: a mouse move over the verge added no stamps (${s0} -> ${s1})`)

      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
      await sleep(50)
      const s2 = await handStamps()
      await sleep(250)
      const s3 = await handStamps()
      if (s3 !== s2) throw new Error(`Case 12 failed: the hand kept stamping after a blur (${s2} -> ${s3})`)

      await page.evaluate(move12, [vx12, vy12])
      await sleep(250)
      const s4 = await handStamps()
      if (s4 <= s3) throw new Error(`Case 12 failed: a move after the blur added no stamps (${s3} -> ${s4})`)
      console.log(`PASS: case 12 - focus loss: stamps ${s0} -> ${s1} over the verge, held at ${s2} -> ${s3} after a blur, ${s4} after the next move`)
    }

    // -------------------------------------------------------------
    // Case 13: walk=0 (Codex, PR #22), the phone, vincent=0: with the walk off nothing sets the street gesture, so the
    // grass follows its own touch: a touch-drag across the verge moves __grassHit with it.
    // -------------------------------------------------------------
    if (shouldRun(13)) {
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walk=0&vincent=0` })
      await page.waitForStreetReady()

      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 481, id: 0 }] })
      await sleep(150)
      const hitA = await page.evaluate(() => window.__grassHit)
      await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350, y: 481, id: 0 }] })
      await sleep(150)
      const hitB = await page.evaluate(() => window.__grassHit)
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })

      if (!hitA) throw new Error('Case 13 precondition failed: __grassHit is null after a touch down on the verge')
      const moved = hitB ? Math.hypot(hitB.x - hitA.x, hitB.z - hitA.z) : 0
      if (moved < 0.01) throw new Error(`Case 13 failed: the hit moved ${moved.toFixed(4)} with a 30 px touch-drag and walk=0`)
      console.log(`PASS: case 13 - walk=0 touch-drag: the hit moved ${moved.toFixed(3)} with the finger`)
    }

    // -------------------------------------------------------------
    // Case 14: the moon's GLSL by number (S3b task 1). A bare WebGL canvas draws grassMoonFacing for each case into one
    // pixel at 255 per unit. Each reads back within 1/255 of bladeMoonFacing, plus half a step for the rounding.
    // -------------------------------------------------------------
    if (shouldRun(14)) {
      const moon = [STREET_MOON.x, STREET_MOON.y, STREET_MOON.z]
      const cases14 = []
      for (const curl of [1.5, -1.5, 0.8, -0.8]) for (const lean of [0.3, -0.3]) for (const yaw of [0, 0.4, -0.4]) {
        for (const right of [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2]]) for (const a of [0.25, 0.5, 1]) cases14.push({ a, lean, curl, yaw, right })
      }
      for (const lean of [0.3, -0.3]) cases14.push({ a: 0.5, lean, curl: 0, yaw: 0.2, right: [0.6, 0.8] })
      for (const c of cases14) c.expected = bladeMoonFacing({ lean: c.lean, curl: c.curl, yaw: c.yaw }, c.a, c.right, moon)
      await page.send('Page.navigate', { url: 'about:blank' })
      await sleep(200)
      const got14 = await page.evaluate(({ glsl, cases, moon }) => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const gl = canvas.getContext('webgl')
        const compile = (type, src) => {
          const sh = gl.createShader(type)
          gl.shaderSource(sh, src)
          gl.compileShader(sh)
          if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
          return sh
        }
        const prog = gl.createProgram()
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, `precision highp float;
uniform float uA, uLean, uCurl, uYaw;
uniform vec2 uRight;
uniform vec3 uMoon;
${glsl}
void main() { gl_FragColor = vec4(grassMoonFacing(vec3(0.0), uA, 0.0, 0.036, 0.003, uLean, uCurl, uYaw, uRight, 1.0, uMoon), 0.0, 0.0, 1.0); }`))
        gl.linkProgram(prog)
        gl.useProgram(prog)
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        const u = (n) => gl.getUniformLocation(prog, n)
        gl.uniform3fv(u('uMoon'), moon)
        const px = new Uint8Array(4)
        return cases.map((c) => {
          gl.uniform1f(u('uA'), c.a)
          gl.uniform1f(u('uLean'), c.lean)
          gl.uniform1f(u('uCurl'), c.curl)
          gl.uniform1f(u('uYaw'), c.yaw)
          gl.uniform2fv(u('uRight'), c.right)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
          return px[0] / 255
        })
      }, { glsl: GRASS_MOON_GLSL, cases: cases14, moon })
      let worst14 = 0
      let lit14 = 0
      cases14.forEach((c, i) => {
        const err = Math.abs(got14[i] - c.expected)
        worst14 = Math.max(worst14, err)
        if (c.expected > 0.1) lit14++
        if (err > 1.5 / 255) throw new Error(`Case 14 failed: ${JSON.stringify(c)} read ${got14[i].toFixed(4)}`)
      })
      if (lit14 === 0 || lit14 === cases14.length) throw new Error(`Case 14 precondition failed: ${lit14} of ${cases14.length} cases lit`)
      console.log(`PASS: case 14 - the moon's GLSL: ${cases14.length} cases (${lit14} lit) within ${(worst14 * 255).toFixed(2)}/255 of bladeMoonFacing`)
    }

    // -------------------------------------------------------------
    // Case 15: the hand against lit tops (S3b task 1), stop 0, vincent=0, the clock pinned. The hand's lift must read
    // where the moon lights the tips: within 80 px of the hand, the pixels it brightens by more than 5 L* number at least
    // 0.85 of the unlit page's, where the grass runs main's program. Measured: lit 1,369 against unlit 1,361 (1.01), and
    // 891 (0.65) with the lift off in the lit program. The disc's mean L* does not separate them: main's moves by 0.55.
    // -------------------------------------------------------------
    if (shouldRun(15)) {
      const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      const lightnessAt = (img, i) => {
        const Y = 0.2126 * lin(img.rgba[i] / 255) + 0.7152 * lin(img.rgba[i + 1] / 255) + 0.0722 * lin(img.rgba[i + 2] / 255)
        return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y
      }
      const shot = async () => decodePNG(Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
      const brightened = {}
      for (const light of ['', '&light=0']) {
        await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input&vincent=0${light}` })
        await page.waitForStreetReady()
        await page.evaluate(() => {
          window.__skyTime = 0
          window.__grassHand(null)
        })
        await sleep(300)
        const [vx15, vy15] = await getVergeClientPoint(page)
        const before = await shot()
        await page.evaluate(([x, y]) => window.__grassHand(x, y), [vx15, vy15])
        let peak15 = 0
        for (let i = 0; i < 20 && peak15 <= 0.5; i++) {
          await sleep(20)
          peak15 = await page.evaluate(() => window.__grassPeak ?? 0)
        }
        const after = await shot()
        await page.evaluate(() => {
          window.__grassHand(null)
          delete window.__skyTime
        })
        if (peak15 <= 0.5) throw new Error(`Case 15 precondition failed: __grassPeak ${peak15.toFixed(3)} never passed 0.5 (light '${light}')`)
        let n = 0
        for (let y = Math.max(0, Math.floor(vy15 - 80)); y <= Math.min(before.height - 1, Math.ceil(vy15 + 80)); y++) {
          for (let x = Math.max(0, Math.floor(vx15 - 80)); x <= Math.min(before.width - 1, Math.ceil(vx15 + 80)); x++) {
            const i = (y * before.width + x) * 4
            if (Math.hypot(x - vx15, y - vy15) <= 80 && lightnessAt(after, i) - lightnessAt(before, i) > 5) n++
          }
        }
        brightened[light ? 'unlit' : 'lit'] = n
      }
      if (brightened.unlit < 500) throw new Error(`Case 15 precondition failed: the unlit hand brightened ${brightened.unlit} pixels, under 500`)
      const ratio15 = brightened.lit / brightened.unlit
      if (ratio15 < 0.85) throw new Error(`Case 15 failed: the lit hand brightened ${brightened.lit} pixels against the unlit ${brightened.unlit} (${ratio15.toFixed(2)}, under 0.85)`)
      console.log(`PASS: case 15 - the hand against lit tops: ${brightened.lit} pixels brightened lit, ${brightened.unlit} unlit (${ratio15.toFixed(2)})`)
    }

    await page.close()
  } finally {
    await chrome.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
