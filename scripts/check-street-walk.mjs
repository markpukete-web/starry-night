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
 * 8. The wander (2026-10-29, tasks/2026-10-29-vincent-wander-plan.md, Task 2): a tap on open ground sends him; a house's
 *    wall, a drag and a refused leg do not; his tap box, the trail at his feet, the wheel, the Pause control and reduced
 *    motion, on the desktop with a mouse and on the phone with a finger; on the automatic walk, his walk home after the
 *    dwell (decision (p)).
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PerspectiveCamera, Vector3 } from 'three'
import { STATION_T, STREET_HOUSES, laneParam, vincentPlace, walkPose } from '../src/scene/streetLayout.ts'
import { inFootprint } from '../src/scene/streetGrass.ts'
import { PAUSE, WALK } from '../src/scene/streetWalk.ts'
import { WANDER, followT, hidden, inFrame, initialWander, legSeen, standable, tripFrom, wanderTo } from '../src/scene/streetWander.ts'

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

// --- the wander's point choice (pure; Case 8 reads these, and a node dry run can load them) ---

/** the camera the page draws, from `__streetCamera()` (the aim turned toward him included), for projecting in node */
function liveCamera(cam, size) {
  const persp = new PerspectiveCamera(cam.fov, size.width / size.height, cam.near, cam.far)
  persp.position.fromArray(cam.position)
  persp.quaternion.fromArray(cam.quaternion)
  persp.updateMatrixWorld()
  persp.updateProjectionMatrix()
  return persp
}

/** a street point in client pixels, as `__walkProject` gives them */
function toClient(persp, size, [x, y, z]) {
  const v = new Vector3(x, y, z).project(persp)
  return [size.left + ((v.x + 1) / 2) * size.width, size.top + ((1 - v.y) / 2) * size.height]
}

/** the street-frame ground point a tap at a client pixel lands on (the plane y = 0), or null above the horizon */
function groundCast(persp, size, px, py) {
  const ndc = new Vector3(((px - size.left) / size.width) * 2 - 1, 1 - ((py - size.top) / size.height) * 2, 0.5)
  const dir = ndc.unproject(persp).sub(persp.position).normalize()
  if (dir.y >= 0) return null
  const k = -persp.position.y / dir.y
  return [persp.position.x + k * dir.x, persp.position.z + k * dir.z]
}

const insideBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
const insideCanvas = (size, x, y, margin) => x >= size.left + margin && x <= size.left + size.width - margin && y >= size.top + margin && y <= size.top + size.height - margin

/** his place on the lane at the walk's `t`, as the page's tap reads it */
function slotAt(t) {
  const slot = vincentPlace(t)
  return { x: slot.position[0], z: slot.position[2], yaw: slot.yaw, t }
}

/**
 * Points `wanderTo` accepts from his lane slot at `t`, each on the canvas by 24 px, outside his box, with the ground
 * test and the sight test both passing (`onCanvas(x, y)` is the page's elementFromPoint). Sorted by the change in his
 * lane coordinate, so the camera moves least, then by distance from the slot.
 */
function acceptedPoints(persp, size, box, view, t, onCanvas, { min = 0.12, max = 0.3, reach = 0.5 } = {}) {
  const here = slotAt(t)
  const out = []
  for (let dx = -reach; dx <= reach; dx += 0.01) {
    for (let dz = -reach; dz <= reach; dz += 0.01) {
      const x = here.x + dx
      const z = here.z + dz
      const d = Math.hypot(dx, dz)
      if (d < min || d > max || !standable(x, z)) continue
      if (!wanderTo(initialWander(), here, x, z, view) || hidden(persp.position.x, persp.position.z, x, z)) continue
      const [px, py] = toClient(persp, size, [x, 0, z])
      if (!insideCanvas(size, px, py, 40) || insideBox(box, px, py) || !onCanvas(px, py)) continue
      out.push({ x, z, px, py, d, dLane: Math.abs(laneParam(x, z)[0] - laneParam(here.x, here.z)[0]) })
    }
  }
  return out.sort((a, b) => a.dLane - b.dLane || a.d - b.d)
}

/**
 * The sight guard's qualification (Codex F8): the point is in front of the camera, on the canvas by 24 px and outside
 * his box, and its pixel casts back to it (Codex r1 N1); standable, reached by a clear leg and seen from the live
 * camera (so only the leg's sight can refuse it); refused by `wanderTo` with the view; the leg's own samples less the
 * last are seen (so the last sample alone refuses it, `seenButLast`), and the leg ending one `WANDER.sightStep` short
 * passes `legSeen`.
 */
function sightQualifies(persp, size, box, view, t, x, z) {
  const here = slotAt(t)
  const depth = new Vector3(x, 0, z).project(persp).z
  if (!(depth > -1 && depth < 1)) return false
  const [px, py] = toClient(persp, size, [x, 0, z])
  if (!insideCanvas(size, px, py, 24) || insideBox(box, px, py)) return false
  const back = groundCast(persp, size, px, py)
  if (!back || Math.hypot(back[0] - x, back[1] - z) > 1e-4) return false
  if (hidden(persp.position.x, persp.position.z, x, z)) return false
  if (!wanderTo(initialWander(), here, x, z, null)) return false
  if (wanderTo(initialWander(), here, x, z, view)) return false
  const len = Math.hypot(x - here.x, z - here.z)
  if (len <= WANDER.sightStep) return false
  const k = (len - WANDER.sightStep) / len
  if (!seenButLast(tripFrom(here), here.x, here.z, x, z, view)) return false
  return legSeen(tripFrom(here), here.x, here.z, here.x + (x - here.x) * k, here.z + (z - here.z) * k, view)
}

/**
 * `legSeen`'s own samples, the last left out, written here so a mutation of `legSeen` cannot move it (Codex r1 N1): with
 * the last sample dropped from the module, no point is both refused and seen but for the last, and the case fails.
 */
function seenButLast(s, ax, az, bx, bz, view) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / WANDER.sightStep))
  for (let k = 1; k < n; k++) {
    const x = ax + ((bx - ax) * k) / n
    const z = az + ((bz - az) * k) / n
    const pose = walkPose(followT(s, x, z), view.portrait)
    if (hidden(pose.position[0], pose.position[2], x, z) || !inFrame(pose, x, z, view.halfFovDeg)) return false
  }
  return true
}

/** the qualifying point on a 0.01 grid over `reach` of the slot, nearest the canvas centre, off the page's chrome */
function sightPoint(persp, size, box, view, t, onCanvas, reach = 1.6) {
  const here = slotAt(t)
  const cx = size.left + size.width / 2
  const cy = size.top + size.height / 2
  let best = null
  for (let dx = -reach; dx <= reach; dx += 0.01) {
    for (let dz = -reach; dz <= reach; dz += 0.01) {
      const x = here.x + dx
      const z = here.z + dz
      if (!standable(x, z) || !sightQualifies(persp, size, box, view, t, x, z)) continue
      const [px, py] = toClient(persp, size, [x, 0, z])
      if (!onCanvas(px, py)) continue
      const away = Math.hypot(px - cx, py - cy)
      if (!best || away < best.away) best = { x, z, px, py, away }
    }
  }
  return best
}

/**
 * A house's wall (Codex F4): a pixel on an 8 px grid whose ray meets a house's bare footprint below its eave before it
 * reaches the ground, found by sampling the ray in plan, not by the page's sight test. Its ground point must be one
 * `wanderTo` accepts with the view, so only the wall can refuse the tap. The pixel nearest the canvas centre.
 */
function wallPoint(persp, size, box, view, t, onCanvas) {
  const here = slotAt(t)
  const cx = size.left + size.width / 2
  const cy = size.top + size.height / 2
  const ex = persp.position.x
  const ey = persp.position.y
  const ez = persp.position.z
  const meetsWall = (x, z) => {
    for (let k = 1; k < 400; k++) {
      const f = k / 400
      const sx = ex + (x - ex) * f
      const sz = ez + (z - ez) * f
      for (const h of STREET_HOUSES) {
        const c = Math.cos(h.yaw)
        const s = Math.sin(h.yaw)
        const u = (sx - h.x) * c + (sz - h.z) * s
        const v = -(sx - h.x) * s + (sz - h.z) * c
        if (Math.abs(u) <= h.w / 2 && Math.abs(v) <= h.d / 2 && ey * (1 - f) < h.eave) return true
      }
    }
    return false
  }
  let best = null
  for (let py = size.top + 24; py <= size.top + size.height - 24; py += 8) {
    for (let px = size.left + 24; px <= size.left + size.width - 24; px += 8) {
      if (insideBox(box, px, py) || !onCanvas(px, py)) continue
      const hit = groundCast(persp, size, px, py)
      if (!hit || !meetsWall(hit[0], hit[1]) || !wanderTo(initialWander(), here, hit[0], hit[1], view)) continue
      const away = Math.hypot(px - cx, py - cy)
      if (!best || away < best.away) best = { px, py, hit, away }
    }
  }
  return best
}

// --- end of the wander's point choice ---

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

    // -------------------------------------------------------------
    // Case 8 (the wander, 2026-10-29): see the header. Points are chosen in node, with the page's own live camera, view and
    // box, from the same `wanderTo` the page runs. Every wait is on a condition, never a fixed sleep; every read of
    // `settled` is followed by ten frames in which the camera's matrix does not move.
    // -------------------------------------------------------------
    const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }
    const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
    const c8 = {
      fail: (msg) => {
        throw new Error(`Case 8 failed: ${msg}`)
      },
      until: async (expr, ms, what) => {
        const from = Date.now()
        for (;;) {
          if (await page.evaluate(`Boolean(${expr})`)) return Date.now() - from
          if (Date.now() - from > ms) c8.fail(`${what} not within ${ms} ms (${expr}); state ${JSON.stringify(await page.evaluate('window.__wander?.()'))}`)
          await sleep(40)
        }
      },
      open: async (vp, touch, station, mode) => {
        await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
        await page.send('Emulation.setDeviceMetricsOverride', vp)
        await page.send('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
        await page.send('Page.navigate', { url: `${origin}/?street=1&station=${station}&arrival=0&walkMode=${mode}` })
        await page.waitForStreetReady()
        await c8.until('window.__wander && window.__vincentBox && window.__streetCamera', 10000, 'the seams')
      },
      wander: () => page.evaluate('window.__wander()'),
      pose: () => page.evaluate('window.__vincentPose()'),
      cam: () => page.evaluate('window.__streetCamera()'),
      auto: () => page.evaluate('window.__streetWalk.auto'),
      t: () => page.evaluate('window.__streetWalk.t'),
      // his box as a tap reads it: at least `WALK.hitMin` square about its centre
      box: async () => {
        const b = await page.evaluate('window.__vincentBox()')
        const cx = (b.x0 + b.x1) / 2
        const cy = (b.y0 + b.y1) / 2
        const hw = Math.max((b.x1 - b.x0) / 2, WALK.hitMin / 2)
        const hh = Math.max((b.y1 - b.y0) / 2, WALK.hitMin / 2)
        return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh }
      },
      onCanvas: (px, py) => page.evaluate(`document.elementFromPoint(${px}, ${py}) === document.querySelector('canvas')`),
      // a synchronous canvas test for the point choice: the page's chrome (title, dock, placard) as boxes of a 12 px grid
      mask: async (vp) => {
        const blocked = await page.evaluate(`(() => { const out = []; const c = document.querySelector('canvas'); for (let y = 0; y < ${vp.height}; y += 12) for (let x = 0; x < ${vp.width}; x += 12) if (document.elementFromPoint(x + 6, y + 6) !== c) out.push([x, y]); return out })()`)
        const set = new Set(blocked.map(([x, y]) => `${x},${y}`))
        return (px, py) => !set.has(`${Math.floor(px / 12) * 12},${Math.floor(py / 12) * 12}`)
      },
      // the live scene as node sees it: camera, canvas rectangle, his box and the view a tap would use
      scene: async () => {
        const size = await page.evaluate(() => {
          const r = document.querySelector('canvas').getBoundingClientRect()
          return { left: r.left, top: r.top, width: r.width, height: r.height }
        })
        return { size, persp: liveCamera(await c8.cam(), size), box: await c8.box(), view: (await c8.wander()).view }
      },
      tap: async (touch, x, y) => {
        if (touch) {
          await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
          await sleep(50)
          await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        } else {
          await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
          await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
          await sleep(50)
          await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
        }
      },
      // down, out 60 px and back to 2 px from the press, up: about 120 ms, inside the tap's 300 ms (Codex F2)
      outAndBack: async (touch, x, y) => {
        if (touch) {
          await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
          await sleep(40)
          await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y, id: 0 }] })
          await sleep(40)
          await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 2, y, id: 0 }] })
          await sleep(40)
          await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        } else {
          await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
          await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
          await sleep(40)
          await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 60, y, button: 'left', buttons: 1 })
          await sleep(40)
          await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 2, y, button: 'left', buttons: 1 })
          await sleep(40)
          await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 2, y, button: 'left', buttons: 0, clickCount: 1 })
        }
      },
      // a mouse parked over the Pause control is off the canvas, so the hand stays off the grass; the control's label says its state
      pauseAt: () =>
        page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find((e) => /Pause|Play/.test(e.getAttribute('aria-label') ?? ''))
          if (!b) return null
          const r = b.getBoundingClientRect()
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), label: b.getAttribute('aria-label') }
        }),
      park: async (at) => page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none', buttons: 0 }),
      click: async (x, y) => {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
      },
      wheel: () => page.evaluate(`document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: 200, deltaMode: 0, bubbles: true, cancelable: true }))`),
      settle: async (what) => {
        await c8.until('window.__vincentForm().settled', 25000, `${what}: settled`)
        const run = await page.send('Runtime.evaluate', {
          awaitPromise: true,
          returnByValue: true,
          expression: `new Promise((resolve) => { const out = []; const step = () => { const c = window.__streetCamera(); out.push([...c.position, ...c.quaternion]); if (out.length >= 11) resolve(out); else requestAnimationFrame(step) }; requestAnimationFrame(step) })`,
        })
        const out = run.result.value
        const drift = Math.max(...out.slice(1).flatMap((f) => f.map((v, k) => Math.abs(v - out[0][k]))))
        if (drift > 1e-9) c8.fail(`${what}: settled, yet the camera's matrix moved by ${drift} over ten frames`)
      },
      // his position and the camera's matrix over `ms`: the largest change, and the wander's state after
      hold: async (what, ms) => {
        const a = { pose: (await c8.pose()).world, cam: await c8.cam() }
        await sleep(ms)
        const b = { pose: (await c8.pose()).world, cam: await c8.cam(), w: await c8.wander() }
        const gap = Math.max(...a.pose.map((v, i) => Math.abs(v - b.pose[i])), ...a.cam.position.map((v, i) => Math.abs(v - b.cam.position[i])), ...a.cam.quaternion.map((v, i) => Math.abs(v - b.cam.quaternion[i])))
        if (gap > 1e-9) c8.fail(`${what}: his position and the camera moved by ${gap} over ${ms} ms`)
        return b.w
      },
      // the seconds a trip of `len` may take: len over his speed, plus the slack
      bound: (len, slack) => (len / WANDER.speed) * 1000 + slack,
    }
    const slotXZ = (t) => {
      const p = vincentPlace(t)
      return [p.position[0], p.position[2]]
    }
    const away = (world, x, z) => Math.hypot(world[0] - x, world[2] - z)

    // ---- 8a. desktop, stop 1: a wall, a drag, a tap that sends him, his box, the trail, the wheel
    await c8.open(DESKTOP, false, 1, 'input')
    const t8 = STATION_T[1]
    if ((await c8.t()) !== t8) c8.fail(`the street opened at t ${await c8.t()}, not ${t8}`)
    if ((await c8.wander()).mode !== 'lane') c8.fail('he did not start on the lane')
    const [slotX, slotZ] = slotXZ(t8)
    let sc = await c8.scene()
    const maskD = await c8.mask(DESKTOP)

    // the wall: a tap on a house leaves him on the lane
    const wall = wallPoint(sc.persp, sc.size, sc.box, sc.view, t8, maskD)
    if (!wall) c8.fail('no house wall on the canvas at stop 1 whose ground the wander would accept')
    await c8.tap(false, wall.px, wall.py)
    await sleep(400)
    if ((await c8.wander()).mode !== 'lane') c8.fail(`a tap on a house's wall at [${wall.px.toFixed(0)}, ${wall.py.toFixed(0)}] (ground ${wall.hit.map((v) => v.toFixed(3))}) sent him: ${JSON.stringify(await c8.wander())}`)

    const spots = acceptedPoints(sc.persp, sc.size, sc.box, sc.view, t8, maskD)
    if (!spots.length) c8.fail('no accepted point 0.12 to 0.3 from his slot on the canvas at stop 1')
    const P = spots.find((p) => inFootprint(p.x, p.z))
    if (!P) c8.fail('no accepted point in the grass footprint')
    const trip = Math.hypot(P.x - slotX, P.z - slotZ)

    // a press and a drag from the same point never sends him
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P.px, y: P.py, button: 'none', buttons: 0 })
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: P.px, y: P.py, button: 'left', buttons: 1, clickCount: 1 })
    for (let i = 1; i <= 4; i++) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P.px + i * 12, y: P.py, button: 'left', buttons: 1 })
      await sleep(30)
    }
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: P.px + 48, y: P.py, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(400)
    if ((await c8.wander()).mode !== 'lane') c8.fail('a press and a drag of 48 px sent him')

    // a drag out 60 px and back to 2 px from the press, within the tap's 300 ms, never sends him (Codex F2)
    await c8.outAndBack(false, P.px, P.py)
    await sleep(400)
    if ((await c8.wander()).mode !== 'lane') c8.fail('a drag out 60 px and back to the press sent him')

    // the same drag folded into one move, as a browser may coalesce its samples (Codex r1): the move's own point is 2 px
    // from the press, its first coalesced sample 60 px
    await page.evaluate(`window.__pid = null; window.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId }, { once: true })`)
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P.px, y: P.py, button: 'none', buttons: 0 })
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: P.px, y: P.py, button: 'left', buttons: 1, clickCount: 1 })
    const folded = await page.evaluate(`(() => { const o = { pointerId: window.__pid, isPrimary: true, pointerType: 'mouse', buttons: 1, bubbles: true, clientY: ${P.py} }; const at = (x) => new PointerEvent('pointermove', { ...o, clientX: x }); const e = new PointerEvent('pointermove', { ...o, clientX: ${P.px + 2}, coalescedEvents: [at(${P.px + 60}), at(${P.px + 2})] }); window.dispatchEvent(e); return e.getCoalescedEvents().length })()`)
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: P.px + 2, y: P.py, button: 'left', buttons: 0, clickCount: 1 })
    await sleep(400)
    if (folded !== 2) c8.fail(`the folded move carried ${folded} coalesced samples, not 2`)
    if ((await c8.wander()).mode !== 'lane') c8.fail('a drag out 60 px and back folded into one move sent him')

    // the tap: he goes, and arrives within the trip's length over his speed, plus a second
    const park = await c8.pauseAt()
    if (!park) c8.fail('no Pause control on the page')
    const tapMs = Date.now()
    await c8.tap(false, P.px, P.py)
    await c8.park(park)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'a tap on an accepted point sending him')
    await c8.until('window.__wander().arrived > 0', c8.bound(trip, 1000), `him arriving at ${P.x.toFixed(3)}, ${P.z.toFixed(3)} (${trip.toFixed(3)} away at ${WANDER.speed.toFixed(3)} a second)`)
    const took = Date.now() - tapMs
    const here8 = (await c8.pose()).world
    if (away(here8, P.x, P.z) > 1e-6) c8.fail(`he arrived ${away(here8, P.x, P.z)} from his point`)
    const w8 = await c8.wander()
    if (w8.route.length !== 1 || Math.hypot(w8.route[0][0] - slotX, w8.route[0][1] - slotZ) > 1e-9) c8.fail(`route is ${JSON.stringify(w8.route)}, expected his slot`)
    await c8.until('window.__wander().turn === 1', 4000, 'the lantern raised at his point')
    await c8.settle('arrived at his point')
    // the camera stays on the rail, its aim turned toward him by at most the knob
    const rail8 = walkPose(await c8.t(), false).position
    const cam8 = await c8.cam()
    const railGap = Math.max(...rail8.map((v, i) => Math.abs(v - cam8.position[i])))
    const aim8 = (await c8.wander()).aimDeg
    if (railGap > 1e-9) c8.fail(`the camera is ${railGap} off the walk's rail`)
    if (Math.abs(aim8) > WANDER.aimMax + 1e-9) c8.fail(`the aim is ${aim8} degrees, over ${WANDER.aimMax}`)

    // the trail at his feet: at 6.5 s after the tap, none at his slot and some at his point; the hand stayed on the Pause control
    const spent = Date.now() - tapMs
    if (spent < 6500) await sleep(6500 - spent)
    const pushAt = (x, z) => page.evaluate(`window.__grassPushNear(${x}, ${z}, 0.03)`)
    const slotPush = await pushAt(slotX, slotZ)
    const herePush = await pushAt(P.x, P.z)
    if (!(herePush > 0)) c8.fail(`the trail at his point is ${herePush} at 6.5 s, expected over 0`)
    if (slotPush !== 0) c8.fail(`the trail at his old slot is ${slotPush} at 6.5 s, expected 0`)

    // his box follows him: a tap at its centre toggles the walk and leaves him there
    const box8 = await c8.box()
    const bx = Math.round((box8.x0 + box8.x1) / 2)
    const by = Math.round((box8.y0 + box8.y1) / 2)
    const auto0 = await c8.auto()
    await c8.tap(false, bx, by)
    await sleep(300)
    if ((await c8.auto()) === auto0) c8.fail('a tap on his figure off the lane did not toggle the walk')
    const stayed = await c8.hold('after the tap on his figure', 1000)
    if (stayed.mode !== 'going' || stayed.arrived <= 0) c8.fail(`a tap on his figure moved him: ${JSON.stringify(stayed)}`)
    await c8.tap(false, bx, by)
    await sleep(300)
    if ((await c8.auto()) !== auto0) c8.fail('a second tap on his figure did not toggle the walk back')
    await c8.park(park)

    // his old slot, off his figure: not a toggle, and it sends him back
    const live8 = await c8.scene()
    const [sx, sy] = toClient(live8.persp, live8.size, [slotX, 0, slotZ])
    if (!insideCanvas(live8.size, sx, sy, 24) || insideBox(live8.box, sx, sy) || !(await c8.onCanvas(sx, sy))) c8.fail(`his old slot at [${sx.toFixed(0)}, ${sy.toFixed(0)}] is not tappable (off the canvas or on his box)`)
    await c8.tap(false, sx, sy)
    await c8.until(`['returning', 'lane'].includes(window.__wander().mode)`, 1000, 'a tap on his old slot sending him back')
    if ((await c8.auto()) !== auto0) c8.fail('a tap on his old slot toggled the walk')
    await c8.until(`window.__wander().mode === 'lane'`, c8.bound(trip, 4000), 'him home on the lane')
    await sleep(100)
    const home8 = (await c8.pose()).world
    if (away(home8, slotX, slotZ) > 1e-6 || Math.abs((await c8.t()) - t8) > 1e-9) c8.fail(`home is ${away(home8, slotX, slotZ)} from his slot, t ${await c8.t()}`)
    // home, the aim eases back to the rail's: settled only once it has (n; Task 4's b03 survived without this)
    await c8.settle('home on the lane')

    // a wheel turn sends him back and is dropped; the next one walks
    await c8.tap(false, P.px, P.py)
    await c8.park(park)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'the second tap sending him')
    await c8.until('window.__wander().arrived > 0', c8.bound(trip, 1000), 'him arriving a second time')
    await c8.wheel()
    await c8.until(`window.__wander().mode === 'lane'`, c8.bound(trip, 4000), 'a wheel turn bringing him home')
    await sleep(100)
    if (Math.abs((await c8.t()) - t8) > 1e-9) c8.fail(`the wheel that sent him home moved t to ${await c8.t()}`)
    await c8.wheel()
    await sleep(800)
    if (!((await c8.t()) - t8 > 0.01 / L)) c8.fail(`the next wheel did not walk: t ${await c8.t()}`)
    console.log(`PASS: the wander, desktop stop 1: a wall at [${wall.px}, ${wall.py}] (ground ${wall.hit.map((v) => v.toFixed(3))}, accepted but for the wall), a 48 px drag and a 60 px drag out and back, apart and folded into one move, leave him; a tap at [${P.px.toFixed(0)}, ${P.py.toFixed(0)}] sends him ${trip.toFixed(3)} and he arrives in ${(took / 1000).toFixed(2)} s (bound ${(c8.bound(trip, 1000) / 1000).toFixed(2)} s), the camera on the rail, the aim ${aim8.toFixed(1)} degrees, the trail ${herePush.toFixed(2)} at his point and ${slotPush} at his slot; his box toggles the walk, his old slot and a wheel turn bring him home`)

    // ---- 8b. desktop, stop 2: the sight guard
    await c8.open(DESKTOP, false, 2, 'input')
    sc = await c8.scene()
    const codex = [0.5412437098392479, -1.4405122792319607]
    if (!sightQualifies(sc.persp, sc.size, sc.box, sc.view, STATION_T[2], codex[0], codex[1])) c8.fail(`Codex's point ${codex} does not qualify at stop 2 on the desktop`)
    const [cpx, cpy] = toClient(sc.persp, sc.size, [codex[0], 0, codex[1]])
    if (!(await c8.onCanvas(cpx, cpy))) c8.fail(`Codex's point at [${cpx.toFixed(0)}, ${cpy.toFixed(0)}] is under the page's chrome`)
    const auto2 = await c8.auto()
    await c8.tap(false, cpx, cpy)
    await sleep(500)
    if ((await c8.wander()).mode !== 'lane' || (await c8.auto()) !== auto2) c8.fail(`a tap on Codex's point sent him or toggled the walk: ${JSON.stringify(await c8.wander())}`)
    // the control: an accepted point at the same stop does send him
    const spots2 = acceptedPoints(sc.persp, sc.size, sc.box, sc.view, STATION_T[2], await c8.mask(DESKTOP))
    if (!spots2.length) c8.fail('no accepted point at stop 2 for the control')
    await c8.tap(false, spots2[0].px, spots2[0].py)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'the control tap at stop 2 sending him')
    console.log(`PASS: the sight guard, desktop stop 2: Codex's point ${codex.map((v) => v.toFixed(3))} qualifies, a real tap at [${cpx.toFixed(0)}, ${cpy.toFixed(0)}] leaves him on the lane and the walk alone, and an accepted point sends him`)

    // ---- 8c. desktop, stop 1: the Pause control, then reduced motion, with him walking off the lane
    await c8.open(DESKTOP, false, 1, 'input')
    sc = await c8.scene()
    const far = acceptedPoints(sc.persp, sc.size, sc.box, sc.view, t8, await c8.mask(DESKTOP), { min: 0.45, max: 0.8, reach: 0.8 })
    if (!far.length) c8.fail('no accepted point 0.45 to 0.8 from his slot at stop 1')
    const F = far[0]
    const farTrip = Math.hypot(F.x - slotX, F.z - slotZ)
    const park2 = await c8.pauseAt()
    const away0 = `Math.hypot(window.__vincentPose().world[0] - ${slotX}, window.__vincentPose().world[2] - ${slotZ}) > 0.05`
    await c8.tap(false, F.px, F.py)
    await c8.park(park2)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'the far tap sending him')
    await c8.until(away0, 3000, 'him walking away from his slot')
    await c8.click(park2.x, park2.y)
    await c8.until(`document.querySelector('button[aria-label="Play motion"]')`, 1000, 'the Pause control turning on')
    await sleep(120)
    const still0 = await c8.hold('Pause on', 1000)
    if (still0.arrived > 0) c8.fail('he arrived while Pause was on')
    await c8.click(park2.x, park2.y)
    await c8.until(`document.querySelector('button[aria-label="Pause motion"]')`, 1000, 'the Pause control turning off')
    await c8.until('window.__wander().arrived > 0', c8.bound(farTrip, 3000), 'him going on and arriving after Pause')
    if (away((await c8.pose()).world, F.x, F.z) > 1e-6) c8.fail('after Pause he did not arrive at his point')
    // home, then reduced motion turned on mid-walk
    await c8.wheel()
    await c8.until(`window.__wander().mode === 'lane'`, c8.bound(farTrip, 4000), 'him home before the reduced-motion leg')
    // the aim eases back for up to 3.3 s; F's pixel is the unturned camera's, so wait for it (round 2)
    await c8.settle('home before the reduced-motion leg')
    await c8.tap(false, F.px, F.py)
    await c8.park(park2)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'the second far tap sending him')
    await c8.until(away0, 3000, 'him walking away again')
    await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await sleep(250)
    const reduced0 = await c8.hold('reduced motion on', 1000)
    if (reduced0.arrived > 0) c8.fail('he arrived under reduced motion')
    // a tap does nothing under reduced motion: on his old slot, which would send him back, he stays `going`; else on another far point
    const liveR = await c8.scene()
    const [rsx, rsy] = toClient(liveR.persp, liveR.size, [slotX, 0, slotZ])
    const other = far.find((p) => Math.hypot(p.x - F.x, p.z - F.z) > 0.1)
    const slotTappable = insideCanvas(liveR.size, rsx, rsy, 24) && !insideBox(liveR.box, rsx, rsy) && (await c8.onCanvas(rsx, rsy))
    const tapR = slotTappable ? [rsx, rsy] : other ? [other.px, other.py] : null
    if (!tapR) c8.fail('no point to tap under reduced motion')
    await c8.tap(false, tapR[0], tapR[1])
    await sleep(300)
    const afterR = await c8.wander()
    if (afterR.mode !== 'going' || afterR.tx !== reduced0.tx || afterR.tz !== reduced0.tz || afterR.route.length !== reduced0.route.length) c8.fail(`a tap under reduced motion (${slotTappable ? 'on his old slot' : 'on another point'}) changed his trip: ${JSON.stringify(afterR)}`)
    await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
    await c8.until('window.__wander().arrived > 0', c8.bound(farTrip, 3000), 'him going on and arriving after reduced motion')
    console.log(`PASS: the Pause control and reduced motion hold his position and the camera's matrix over 1 s while he walks off the lane (${farTrip.toFixed(3)} trip), and he goes on and arrives when each ends; a tap under reduced motion changes nothing`)

    // ---- 8d. the phone, the automatic walk (p). With the walk stopped, he stays past the dwell's mark, and a finger on
    // him starts the walk and sends him home at once. With it on, a finger in stop 2's dwell sends him, the walk waits,
    // and he goes home by himself at the mark; the walk then goes on with no second dwell
    const mark = (PAUSE.dwell - PAUSE.endTurn) * 1000
    await c8.open(PHONE, true, 1, 'auto')
    if ((await c8.auto()) !== true) c8.fail('the phone did not open on the automatic walk')
    {
      const b = await c8.box()
      await c8.tap(true, Math.round((b.x0 + b.x1) / 2), Math.round((b.y0 + b.y1) / 2))
    }
    await c8.until('window.__streetWalk.auto === false', 1500, 'a finger on him stopping the walk')
    await sleep(300)
    const tPhone = await c8.t()
    sc = await c8.scene()
    const phoneSpots = acceptedPoints(sc.persp, sc.size, sc.box, sc.view, tPhone, await c8.mask(PHONE))
    if (!phoneSpots.length) c8.fail(`no accepted point on the phone at t ${tPhone}`)
    const Q = phoneSpots[0]
    const [phoneSlotX, phoneSlotZ] = slotXZ(tPhone)
    const phoneTrip = Math.hypot(Q.x - phoneSlotX, Q.z - phoneSlotZ)
    await c8.outAndBack(true, Q.px, Q.py)
    await sleep(400)
    if ((await c8.wander()).mode !== 'lane' || (await c8.auto()) !== false) c8.fail(`a finger's drag out 60 px and back sent him or toggled the walk: ${JSON.stringify(await c8.wander())}`)
    await c8.tap(true, Q.px, Q.py)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'a finger sending him')
    await c8.until('window.__wander().arrived > 0', c8.bound(phoneTrip, 1000), 'him arriving on the phone')
    await c8.until('window.__wander().turn === 1', 4000, 'the lantern raised on the phone')
    await c8.settle('arrived on the phone')
    await c8.until(`window.__wander().arrived > ${(mark + 1000) / 1000}`, mark + 3000, 'him a second past the mark with the walk stopped')
    const stayed8d = await c8.wander()
    if (stayed8d.mode !== 'going' || (await c8.auto()) !== false) c8.fail(`with the walk stopped he did not stay: ${JSON.stringify(stayed8d)}`)
    const bPhone = await c8.box()
    await c8.tap(true, Math.round((bPhone.x0 + bPhone.x1) / 2), Math.round((bPhone.y0 + bPhone.y1) / 2))
    await c8.until('window.__streetWalk.auto === true', 1500, 'a finger on his figure starting the walk')
    await c8.until(`window.__wander().mode !== 'going'`, 1000, 'him setting off home once the walk runs')
    await c8.until(`window.__wander().mode === 'lane'`, c8.bound(phoneTrip, 4000), 'him home on the phone')
    const tHome = await c8.t()
    if (tHome < tPhone - 1e-9 || tHome > tPhone + 0.02) c8.fail(`home on the phone at t ${tHome}, expected the trip's ${tPhone}`)
    await c8.until(`window.__streetWalk.t > ${tPhone} + 0.003`, 3000, 'the automatic walk going on after he is home')

    // the walk on throughout: the point is chosen from stop 2's camera in the input mode, the camera of stop 2's dwell
    await c8.open(PHONE, true, 2, 'input')
    await c8.settle('the phone at stop 2')
    sc = await c8.scene()
    const t2d = STATION_T[2]
    const spots2d = acceptedPoints(sc.persp, sc.size, sc.box, sc.view, t2d, await c8.mask(PHONE))
    if (!spots2d.length) c8.fail('no accepted point on the phone at stop 2')
    const R = spots2d[0]
    const [slot2x, slot2z] = slotXZ(t2d)
    const trip2d = Math.hypot(R.x - slot2x, R.z - slot2z)
    await c8.open(PHONE, true, 1, 'auto')
    await c8.until(`window.__vincentForm().dwell > 0 && window.__streetWalk.t === ${t2d}`, 8000, 'the automatic walk dwelling at stop 2')
    await c8.until('window.__vincentForm().turn === 1', 2000, 'the lantern raised in the dwell')
    const left = await page.evaluate('window.__vincentForm().dwell')
    if (left < 0.8) c8.fail(`only ${left} s of the dwell left for the tap`)
    await c8.tap(true, R.px, R.py)
    await c8.until(`window.__wander().mode === 'going'`, 1000, 'a finger in the dwell sending him')
    if ((await c8.auto()) !== true) c8.fail('a finger on the ground toggled the walk')
    await c8.until('window.__wander().arrived > 0', c8.bound(trip2d, 1000), 'him arriving with the walk on')
    const arrivedAt = Date.now()
    if (Math.abs((await c8.t()) - t2d) > 0.05) c8.fail(`the walk moved on while he was off the lane: t ${await c8.t()}`)
    await c8.until(`window.__wander().mode === 'returning'`, mark + 1500, 'him setting off home by himself')
    const waited = Date.now() - arrivedAt
    if (waited < mark - 300) c8.fail(`he set off home ${waited} ms after arriving, before the mark at ${mark} ms`)
    await c8.until(`window.__wander().mode === 'lane'`, c8.bound(trip2d, 4000), 'him home with the walk on')
    const tBack = await c8.t()
    if (tBack < t2d - 1e-9 || tBack > t2d + 0.02) c8.fail(`home with the walk on at t ${tBack}, expected ${t2d}`)
    await c8.until(`window.__streetWalk.t > ${t2d} + 0.003`, 3000, 'the walk going on from stop 2 with no second dwell')
    console.log(`PASS: the phone, the automatic walk (p): stopped, a finger at [${Q.px.toFixed(0)}, ${Q.py.toFixed(0)}] sends him ${phoneTrip.toFixed(3)}, he stays past the mark, and a finger on him starts the walk and brings him home; on, a finger in stop 2's dwell at [${R.px.toFixed(0)}, ${R.py.toFixed(0)}] sends him ${trip2d.toFixed(3)}, he sets off home ${(waited / 1000).toFixed(2)} s after arriving (mark ${(mark / 1000).toFixed(2)} s), and the walk goes on from t ${tBack}`)

    // ---- 8e. the phone: the sight guard. Stop 2, then 1 and 3, on a 0.01 grid; the first stop with a qualifying point
    let guard = null
    for (const stop of [2, 1, 3]) {
      await c8.open(PHONE, true, stop, 'input')
      sc = await c8.scene()
      const found = sightPoint(sc.persp, sc.size, sc.box, sc.view, STATION_T[stop], await c8.mask(PHONE))
      if (found) {
        guard = { stop, ...found }
        break
      }
    }
    if (!guard) c8.fail('no qualifying sight-guard point on the phone at stops 2, 1 or 3')
    console.log(`the phone's sight-guard point: stop ${guard.stop}, street [${guard.x.toFixed(4)}, ${guard.z.toFixed(4)}], client [${guard.px.toFixed(0)}, ${guard.py.toFixed(0)}]`)
    const autoG = await c8.auto()
    await c8.tap(true, guard.px, guard.py)
    await sleep(500)
    if ((await c8.wander()).mode !== 'lane' || (await c8.auto()) !== autoG) c8.fail(`a finger on the sight-guard point sent him or toggled the walk: ${JSON.stringify(await c8.wander())}`)
    console.log(`PASS: the sight guard, phone stop ${guard.stop}: a finger at [${guard.px.toFixed(0)}, ${guard.py.toFixed(0)}] leaves him on the lane and the walk alone`)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })

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
