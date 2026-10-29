#!/usr/bin/env node
/**
 * The portal's checks (tasks/2026-10-25-street-portal-plan.md, Task 6), against a running dev server:
 *   DIORAMA_CAPTURE_URL=http://127.0.0.1:5198/ node scripts/check-portal.mjs
 * 1. A hover over a house gives the hand and the hint and loads the street's chunk; a hover over the sky gives neither.
 * 2. A tap on a house goes flying, entering, street; the camera is at stop 0's pose; the diorama is unmounted in the
 *    street (its seams clear). On the phone, with the automatic walk, Vincent is still at stop 0 when the layer starts
 *    to fade (F4), and walks after.
 * 3. Escape goes back to the diorama, the pose the saved one within 1e-6 the frame after and 0.5 s later, the camera's
 *    rotation the one before the entry and its lens the aspect's default; the layer holds until the diorama, mounted
 *    again, has built (the iPhone fix, 2026-10-28). 3b: Escape while the entry's fade runs still
 *    fades the return from full, never down then up (Codex branch review F1).
 * 4. The dock's control does the same both ways.
 * 5. `?streetFail=painting` ends on the diorama at the saved pose, the portal still on. A failed chunk ends there too,
 *    with the portal off for the page's life (F7).
 * 6. Reduced motion: no flight, no pose between the two, the layer cut at `ready` with no fade. 6b: reduced motion
 *    turned on mid-flight ends the flight at once with no drift, and it pauses a held frame's drift (Codex F3).
 * 7. A tap on a house enters and adds no sky surge (a tap on the sky does: the control). A tap on a tree adds a land
 *    touch and does not enter. A drag over a house does not enter, nor one that goes out and comes back (Codex F2).
 * 8. Escape, the dock and the seam during the flight change nothing.
 * 9. The street through the portal at stop 0 against `?street=1` at stop 0, clocks pinned: byte-identical.
 * 10. A rotation in the street: enter, resize to the other aspect, leave; the pose is the saved one within 1e-6.
 * 11. Three round trips leave the renderer's geometries and textures where the first left them.
 * 12. On the phone, a finger pressed and dragged over a tree adds sky surges, no land touch and no land cast, and a
 *    finger's tap on a tree adds a kick and no land touch or cast. A mouse over a tree casts and adds one (the control).
 * 13. A touch phone (no hover, a coarse pointer) asks before its first entry: the pill shows the card and the place
 *    stays the diorama; "Stay with the painting" closes it; "Enter anyway" enters; the visit's next entry goes straight
 *    in (2026-10-28, the street alone ended the page on Mark's iPhone, and Mark wants phones to enter, told).
 * 14. wander-remount (2026-10-29): in the street, the capture seam `__wanderTo` sends Vincent off the lane (the control:
 *    `__wander().mode` is `going` and he has moved); Escape and a second entry start him on the lane (`mode` `lane`, no route).
 * Each case prints PASS or throws; the run exits 1 on the first failure.
 */
import { execFileSync, execSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIORAMA_CAMERAS, portraitFov } from '../src/scene/dioramaContract.ts'
import { vincentPlace } from '../src/scene/streetLayout.ts'
import { initialWander, wanderTo } from '../src/scene/streetWander.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5198/'
const origin = new URL(appUrl).origin
const here = dirname(fileURLToPath(import.meta.url))
const DESKTOP = { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
const BASE = '?portal=1&arrival=0&walkMode=input'

const chromePath =
  process.env.CHROME_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find((path) =>
    existsSync(path),
  )
if (!chromePath) {
  console.error('No Chrome-compatible browser found. Set CHROME_PATH.')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const countHeadlessChromes = () => {
  try {
    return parseInt(execSync("pgrep -fl 'Chrome.*headless' 2>/dev/null | wc -l", { encoding: 'utf8' }).trim(), 10) || 0
  } catch {
    return 0
  }
}

function startChrome(port) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-portal-'))
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
    cleanup() {
      child.kill()
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    },
  }
}

async function waitForChrome(port) {
  const start = Date.now()
  while (Date.now() - start < 20000) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return
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
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
      } else if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'runtime exception')
      }
    })
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('Network.enable')
  }
  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (res.exceptionDetails) throw new Error(`Evaluation failed: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`)
    return res.result?.value
  }
  async waitFor(expression, timeoutMs = 30000, what = expression) {
    const start = Date.now()
    for (;;) {
      if (await this.evaluate(`Boolean(${expression})`)) return
      if (Date.now() - start > timeoutMs) throw new Error(`timed out after ${timeoutMs} ms waiting for ${what}`)
      await sleep(100)
    }
  }
  touch(type, x, y) {
    return this.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  }
  mouse(type, x, y, extra = {}) {
    return this.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse', ...extra })
  }
  async tap(x, y) {
    await this.mouse('mouseMoved', x, y)
    await this.mouse('mousePressed', x, y)
    await this.mouse('mouseReleased', x, y)
  }
  key(key) {
    const code = key === 'Escape' ? 27 : 0
    return Promise.all([
      this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code }),
      this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code }),
    ])
  }
}

// In the page: the hit of a kind nearest the hits' centre, the recorder of every frame's place, layer and pose
const PAGE_HELPERS = `(() => {
  window.__findPick = (kind, step) => {
    const hits = []
    for (let y = innerHeight * 0.2; y < innerHeight * 0.95; y += step)
      for (let x = innerWidth * 0.05; x < innerWidth * 0.95; x += step) if (window.__portalPick(x, y) === kind) hits.push([x, y])
    if (!hits.length) return null
    const cx = hits.reduce((s, h) => s + h[0], 0) / hits.length, cy = hits.reduce((s, h) => s + h[1], 0) / hits.length
    return hits.reduce((best, h) => (Math.hypot(h[0] - cx, h[1] - cy) < Math.hypot(best[0] - cx, best[1] - cy) ? h : best))
  }
  window.__startRec = () => {
    window.__rec = []
    window.__recOn = true
    const tick = () => {
      if (!window.__recOn) return
      const s = window.__portal()
      window.__rec.push({ ms: performance.now(), place: s.place, layer: s.layer, pose: s.pose, saved: s.saved, view: s.view, walk: window.__streetWalk?.t ?? null, diorama: s.diorama })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  window.__stopRec = () => { window.__recOn = false; return window.__rec }
})()`

const poseGap = (a, b) => Math.max(...a.position.map((v, i) => Math.abs(v - b.position[i])), ...a.target.map((v, i) => Math.abs(v - b.target[i])))

async function open(page, query, viewport = DESKTOP, { reduced = false } = {}) {
  await page.send('Emulation.setDeviceMetricsOverride', viewport)
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] })
  await page.send('Page.navigate', { url: `${origin}/${query}` })
  await sleep(500)
  await page.waitFor('window.__skyReady && window.__portal && window.__portalPick', 30000, 'the sky and the portal')
  await page.evaluate(PAGE_HELPERS)
  // the village's meshes mount after their loads
  await page.waitFor(`window.__findPick('village', 24)`, 20000, 'a house on screen')
}

const placeOf = (page) => page.evaluate('window.__portal().place')

/** Records every frame from now until `until` holds, then 0.6 s more; returns the frames. Throws if it never holds in `ms`. */
async function record(page, action, until, ms = 20000) {
  await page.evaluate('window.__startRec()')
  await action()
  const start = Date.now()
  while (!(await page.evaluate(`Boolean(${until})`))) {
    if (Date.now() - start > ms) {
      const rec = await page.evaluate('window.__stopRec()')
      throw new Error(`timed out after ${ms} ms waiting for ${until}: [${placesOf(rec)}]`)
    }
    await sleep(50)
  }
  await sleep(600)
  return page.evaluate('window.__stopRec()')
}

/** The places in order, each once. */
const placesOf = (rec) => rec.map((f) => f.place).filter((p, i, a) => i === 0 || a[i - 1] !== p)

/** The rotation's gap, either sign of the quaternion. */
const turnGap = (a, b) => Math.min(Math.max(...a.map((v, i) => Math.abs(v - b[i]))), Math.max(...a.map((v, i) => Math.abs(v + b[i]))))

/**
 * Asserts a return: the frame after `left` and the frame 0.5 s later hold the saved pose, the camera's rotation before
 * the entry (`view`, read from `__portal().view` in the diorama) and `lens`, the aspect's default (Codex F4).
 */
function assertReturn(rec, name, view, lens = DIORAMA_CAMERAS.design) {
  const i = rec.findIndex((f, k) => k > 0 && f.place === 'diorama' && rec[k - 1].place === 'leaving')
  if (i < 0) throw new Error(`${name}: no return in [${placesOf(rec)}]`)
  const later = rec.find((f) => f.ms >= rec[i].ms + 500)
  if (!later) throw new Error(`${name}: no frame 0.5 s after the return`)
  const now = poseGap(rec[i].pose, rec[i].saved)
  const after = poseGap(later.pose, later.saved)
  if (now > 1e-6 || after > 1e-6) throw new Error(`${name}: the pose is ${now} from the saved one the frame after and ${after} 0.5 s later`)
  for (const [when, f] of [['the frame after', rec[i]], ['0.5 s later', later]]) {
    const turn = turnGap(f.view.quaternion, view.quaternion)
    if (turn > 1e-6) throw new Error(`${name}: ${when} the camera's rotation is ${turn} from the one before the entry`)
    if (f.view.lens.fov !== lens.fov || f.view.lens.near !== lens.near || f.view.lens.far !== lens.far)
      throw new Error(`${name}: ${when} the lens is ${JSON.stringify(f.view.lens)}, not the aspect's ${JSON.stringify({ fov: lens.fov, near: lens.near, far: lens.far })}`)
  }
  return { now, after }
}

const viewNow = (page) => page.evaluate('window.__portal().view')

async function enterAndSettle(page, action) {
  const rec = await record(page, action, `window.__portal().place === 'street' && window.__portal().layer === 0`)
  if (!rec.some((f) => f.place === 'street')) throw new Error(`no street within 20 s: [${placesOf(rec)}]`)
  return rec
}

async function main() {
  const chromesBefore = countHeadlessChromes()
  const port = 9600 + Math.floor(Math.random() * 300)
  const chrome = startChrome(port)
  try {
    await waitForChrome(port)
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()

    // stop 0's pose as `?street=1` places it, for case 2
    await page.send('Emulation.setDeviceMetricsOverride', DESKTOP)
    await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
    await sleep(500)
    await page.waitFor('window.__streetReady && window.__streetCamera', 30000, 'the street')
    const stop0 = await page.evaluate('window.__streetCamera()')

    // ---- case 0: the flag. On for every visitor (2026-10-28), off with `?portal=0`
    await open(page, '?arrival=0&walkMode=input')
    if (!(await page.evaluate('window.__portal().on'))) throw new Error('case 0: the portal is off on a plain visit')
    const villagePill = `[...document.querySelectorAll('.visitor-dock button')].some((b) => b.getAttribute('aria-label') === 'Enter the village')`
    if (!(await page.evaluate(villagePill))) throw new Error('case 0: no "Enter the village" in the dock on a plain visit')
    await page.send('Page.navigate', { url: `${origin}/?arrival=0&walkMode=input&portal=0` })
    await sleep(500)
    await page.waitFor('window.__skyReady', 30000, 'the sky with portal=0')
    await sleep(1000)
    if (await page.evaluate('Boolean(window.__portal)')) throw new Error('case 0: the portal is on with portal=0')
    if (await page.evaluate(villagePill)) throw new Error('case 0: "Enter the village" in the dock with portal=0')
    console.log('PASS 0: the portal is on with its pill on a plain visit, and off without its pill with portal=0')

    // ---- case 1: the hover
    await open(page, BASE)
    const house = await page.evaluate(`window.__findPick('village', 16)`)
    const chunk = `performance.getEntriesByType('resource').some((e) => /\\/Street\\.tsx|\\/Street-[\\w-]+\\.js/.test(e.name))`
    if (await page.evaluate(chunk)) throw new Error('case 1: the street chunk loaded before any hover')
    await page.mouse('mouseMoved', DESKTOP.width * 0.75, DESKTOP.height * 0.15)
    await sleep(300)
    const overSky = await page.evaluate(`({ cursor: document.querySelector('canvas').style.cursor, hint: document.querySelector('.portal-hint').style.visibility })`)
    if (overSky.cursor === 'pointer' || overSky.hint === 'visible') throw new Error(`case 1: over the sky the cursor is ${overSky.cursor} and the hint ${overSky.hint}`)
    if (await page.evaluate(chunk)) throw new Error('case 1: a hover over the sky loaded the street chunk')
    await page.mouse('mouseMoved', house[0], house[1])
    await sleep(400)
    const overHouse = await page.evaluate(`({ cursor: document.querySelector('canvas').style.cursor, hint: document.querySelector('.portal-hint').style.visibility })`)
    if (overHouse.cursor !== 'pointer' || overHouse.hint !== 'visible') throw new Error(`case 1: over a house the cursor is ${overHouse.cursor} and the hint ${overHouse.hint}`)
    await page.waitFor(chunk, 5000, 'the street chunk after the hover')
    console.log(`PASS 1: the hover at ${house.map(Math.round)} shows the hand and the hint and loads the chunk; the sky shows neither`)

    // ---- case 2: the tap, desktop
    const view2 = await viewNow(page)
    const rec2 = await enterAndSettle(page, () => page.tap(house[0], house[1]))
    const order2 = placesOf(rec2).join(',')
    if (order2 !== 'diorama,flying,entering,street' && order2 !== 'flying,entering,street') throw new Error(`case 2: the places ran ${order2}`)
    const cam2 = await page.evaluate('window.__streetCamera()')
    const camGap = Math.max(...cam2.position.map((v, i) => Math.abs(v - stop0.position[i])), ...cam2.quaternion.map((v, i) => Math.abs(v - stop0.quaternion[i])), Math.abs(cam2.fov - stop0.fov))
    if (camGap > 1e-9) throw new Error(`case 2: the camera is ${camGap} from stop 0's`)
    const tFlight = (rec2.find((f) => f.place === 'entering').ms - rec2.find((f) => f.place === 'flying').ms) / 1000
    // the iPhone fix (2026-10-28): the street builds with the diorama unmounted, so its seams are clear in the street
    const street2 = rec2.filter((f) => f.place === 'street')
    if (!street2.length || street2.some((f) => f.diorama)) throw new Error(`case 2: ${street2.filter((f) => f.diorama).length} of ${street2.length} street frames have the diorama mounted`)
    // the phone's memory (2026-10-28): R3F's initial internal keeps none of the unmounted diorama's frame callbacks
    const stale2 = await page.evaluate('window.__r3fInitialSubscribers?.() ?? -1')
    if (stale2 !== 0) throw new Error(`case 2: R3F's initial internal holds ${stale2} frame callbacks in the street`)
    console.log(`PASS 2: a tap goes ${order2}; the flight ${tFlight.toFixed(2)} s; the camera at stop 0's pose (gap ${camGap}); the diorama unmounted, its callbacks released`)

    // ---- case 3: Escape
    const rec3 = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    const r3 = assertReturn(rec3, 'case 3', view2)
    const fade3 = rec3.filter((f) => f.place === 'leaving' && f.layer > 0 && f.layer < 1).length
    if (!fade3) throw new Error('case 3: the return did not fade')
    // the layer holds the street's frame until the diorama, mounted again, has built: no fading frame shows it unbuilt
    const early3 = rec3.filter((f) => f.place === 'leaving' && f.layer < 1 && !f.diorama).length
    const held3 = rec3.filter((f) => f.place === 'leaving' && f.layer === 1).length
    if (early3) throw new Error(`case 3: ${early3} leaving frames fade with the diorama not built`)
    console.log(`PASS 3: Escape returns, the pose ${r3.now} then ${r3.after} from the saved one, its rotation and lens, ${held3} held and ${fade3} fade frames`)

    // ---- case 3b: Escape while the entry's fade runs (Codex F1)
    await page.evaluate('window.__portalEnter()')
    await page.waitFor(`window.__portal().place === 'street' && window.__portal().layer > 0 && window.__portal().layer < 0.7`, 20000, 'the entry fade under way')
    const rec3b = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    assertReturn(rec3b, 'case 3b', view2)
    const fade3b = rec3b.filter((f) => f.place === 'leaving').map((f) => f.layer)
    const rises = fade3b.filter((v, k) => k > 0 && v > fade3b[k - 1] + 1e-9).length
    // the bug's copy reads the entry fade's own value, under 0.7, before the return fade restarts it at 1
    if (fade3b[0] < 0.85 || rises || !fade3b.some((v) => v > 0 && v < 1)) throw new Error(`case 3b: the return's layer ran ${fade3b.map((v) => v.toFixed(2)).join(' ')}`)
    console.log(`PASS 3b: Escape during the entry's fade returns from full and fades down only (${fade3b.length} frames, from ${fade3b[0].toFixed(2)})`)

    // ---- case 4: the dock both ways, from an orbited pose
    await page.mouse('mouseMoved', 1300, 250)
    await page.mouse('mousePressed', 1300, 250)
    for (let i = 1; i <= 8; i++) {
      await page.mouse('mouseMoved', 1300 - i * 30, 250 + i * 5, { buttons: 1 })
      await sleep(16)
    }
    await page.mouse('mouseReleased', 1060, 290)
    if ((await placeOf(page)) !== 'diorama') throw new Error('case 4: the drag entered')
    // the drag's damping settles before the pose and the rotation are read
    await sleep(1500)
    const view4 = await viewNow(page)
    await enterAndSettle(page, () => page.evaluate(`document.querySelector('button[aria-label="Enter the village"]').click()`))
    const rec4 = await record(page, () => page.evaluate(`document.querySelector('button[aria-label="Back to the painting"]').click()`), `window.__portal().place === 'diorama'`)
    const r4 = assertReturn(rec4, 'case 4', view4)
    console.log(`PASS 4: the dock enters and returns, the pose ${r4.now} then ${r4.after} from the saved one`)

    // ---- case 4b: the dock's pill clicked where it is drawn, on the phones the bottom stack wraps (Codex plan review F2)
    const pillAt = (label) => page.evaluate(`(() => {
      const el = document.querySelector('button[aria-label="${label}"]')
      const b = el.getBoundingClientRect()
      const x = b.x + b.width / 2, y = b.y + b.height / 2
      const at = document.elementFromPoint(x, y)
      return { x, y, hit: Boolean(at && el.contains(at)) && !el.disabled && getComputedStyle(el).visibility === 'visible' }
    })()`)
    const sizes4b = [PHONE, { ...PHONE, width: 667, height: 375 }, { ...PHONE, width: 320, height: 568 }]
    for (const vp of sizes4b) {
      await open(page, BASE, vp)
      const enter = await pillAt('Enter the village')
      if (!enter.hit) throw new Error(`case 4b: at ${vp.width} × ${vp.height} "Enter the village" is not clickable at its centre`)
      await enterAndSettle(page, () => page.tap(enter.x, enter.y))
      const back = await pillAt('Back to the painting')
      if (!back.hit) throw new Error(`case 4b: at ${vp.width} × ${vp.height} "Back to the painting" is not clickable at its centre`)
      await record(page, () => page.tap(back.x, back.y), `window.__portal().place === 'diorama'`)
    }
    console.log(`PASS 4b: a click on the pill where it is drawn enters and returns at ${sizes4b.map((v) => `${v.width} × ${v.height}`).join(', ')}`)

    // ---- case 5: a street that fails, then a chunk that fails
    await open(page, `${BASE}&streetFail=painting`)
    const view5 = await viewNow(page)
    const rec5 = await record(page, () => page.evaluate('window.__portalEnter()'), `window.__portal().place === 'diorama' && window.__rec.some((f) => f.place === 'leaving')`)
    const order5 = placesOf(rec5).join(',')
    if (!order5.includes('entering,leaving,diorama') || order5.includes('street')) throw new Error(`case 5: the places ran ${order5}`)
    const r5 = assertReturn(rec5, 'case 5', view5)
    if (!(await page.evaluate('window.__portal().on'))) throw new Error('case 5: a failed asset turned the portal off')
    await page.send('Network.setBlockedURLs', { urls: ['*/src/scene/Street.tsx*', '*/assets/Street-*.js'] })
    await page.send('Network.setCacheDisabled', { cacheDisabled: true })
    await open(page, BASE)
    const view5b = await viewNow(page)
    const errorsBefore = page.errors.length
    const rec5b = await record(page, () => page.evaluate('window.__portalEnter()'), `window.__portal().place === 'diorama' && window.__rec.some((f) => f.place === 'leaving')`)
    await page.send('Network.setBlockedURLs', { urls: [] })
    await page.send('Network.setCacheDisabled', { cacheDisabled: false })
    assertReturn(rec5b, 'case 5, the chunk', view5b)
    // R3F's root reports an error its boundary caught through reportError (`onCaughtError`), so the injected failure
    // shows as a page error: exactly that one is expected here, and any other still fails the run
    const injected = page.errors.splice(errorsBefore)
    if (!injected.length || injected.some((e) => !/Failed to fetch dynamically imported module/.test(e))) throw new Error(`case 5: the chunk's errors ${JSON.stringify(injected)}`)
    const off5 = await page.evaluate(`({ on: window.__portal().on, dock: Boolean(document.querySelector('button[aria-label="Enter the village"]')), hint: Boolean(document.querySelector('.portal-hint')) })`)
    if (off5.on || off5.dock || off5.hint) throw new Error(`case 5: after a failed chunk the portal is ${JSON.stringify(off5)}`)
    console.log(`PASS 5: a failed street returns to the saved pose (${r5.now}) with the portal on; a failed chunk returns and turns it off`)

    // ---- case 6: reduced motion
    await open(page, BASE, DESKTOP, { reduced: true })
    const view6 = await viewNow(page)
    const rec6 = await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    if (rec6.some((f) => f.place === 'flying')) throw new Error('case 6: reduced motion flew')
    const saved6 = rec6[rec6.length - 1].saved
    const street6 = rec6[rec6.length - 1].pose
    const between = rec6.filter((f) => poseGap(f.pose, saved6) > 1e-9 && poseGap(f.pose, street6) > 1e-9)
    if (between.length) throw new Error(`case 6: ${between.length} frames hold a pose between the diorama's and the street's`)
    const partial = rec6.filter((f) => f.layer > 0 && f.layer < 1)
    if (partial.length) throw new Error(`case 6: ${partial.length} frames show the layer part faded`)
    const rec6b = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    assertReturn(rec6b, 'case 6', view6)
    if (rec6b.some((f) => f.layer > 0 && f.layer < 1)) throw new Error('case 6: the return faded')
    console.log(`PASS 6: reduced motion cuts both ways: no flight, no pose between, no part-faded layer (${rec6.length} + ${rec6b.length} frames)`)

    // ---- case 6b: reduced motion turned on during the flight, then while the frame is held (Codex F3)
    const reduceNow = () => page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await open(page, BASE)
    await page.evaluate('window.__portalEnter()')
    await sleep(600)
    if ((await placeOf(page)) !== 'flying') throw new Error(`case 6b: 0.6 s after the entry the place is ${await placeOf(page)}`)
    const turnedOn = Date.now()
    await reduceNow()
    await page.waitFor(`window.__portal().place !== 'flying'`, 1000, 'the flight to end under reduced motion')
    const cut6 = Date.now() - turnedOn
    const drift6 = await page.evaluate(`document.querySelector('.portal-layer').classList.contains('is-drifting')`)
    if (drift6) throw new Error('case 6b: the flight cut by reduced motion left the layer drifting')
    await page.waitFor(`window.__portal().place === 'street' && window.__portal().layer === 0`, 20000, 'the street under reduced motion')
    // the held frame: the street's build holds the main thread, so a read there races its ready. The rule itself is
    // read on the drifting class instead, under reduce and under no preference (the control)
    const driftState = `(() => { const l = document.querySelector('.portal-layer'); l.classList.add('is-drifting'); const state = getComputedStyle(l).animationPlayState; l.classList.remove('is-drifting'); return state })()`
    await open(page, BASE)
    const running6 = await page.evaluate(driftState)
    await reduceNow()
    const paused6 = await page.evaluate(driftState)
    if (running6 !== 'running' || paused6 !== 'paused') throw new Error(`case 6b: the drift reads ${running6} with no preference and ${paused6} under reduce`)
    console.log(`PASS 6b: reduced motion mid-flight ends the flight in ${cut6} ms with no drift; on a held frame the drift is ${paused6}`)

    // ---- case 7: touch
    await open(page, BASE)
    const house7 = await page.evaluate(`window.__findPick('village', 16)`)
    await page.evaluate(`window.__touchGet = window.__touchState; window.__landGet = window.__landState`)
    const kicks = `window.__touchGet().kicks.length`
    const k0 = await page.evaluate(kicks)
    await page.tap(DESKTOP.width * 0.75, DESKTOP.height * 0.15)
    await sleep(200)
    const kSky = await page.evaluate(kicks)
    if (kSky !== k0 + 1) throw new Error(`case 7: the control failed, a tap on the sky took the kicks from ${k0} to ${kSky}`)
    const tree = await page.evaluate(`window.__findPick('land', 16)`)
    const l0 = await page.evaluate(`window.__landGet().touches.length`)
    await page.tap(tree[0], tree[1])
    await sleep(300)
    const l1 = await page.evaluate(`window.__landGet().touches.length`)
    if (l1 !== l0 + 1 || (await placeOf(page)) !== 'diorama') throw new Error(`case 7: a tap on a tree took the land touches from ${l0} to ${l1} and the place to ${await placeOf(page)}`)
    await page.mouse('mouseMoved', house7[0], house7[1])
    await page.mouse('mousePressed', house7[0], house7[1])
    for (let i = 1; i <= 6; i++) {
      await page.mouse('mouseMoved', house7[0] + i * 8, house7[1], { buttons: 1 })
      await sleep(20)
    }
    await page.mouse('mouseReleased', house7[0] + 48, house7[1])
    await sleep(300)
    if ((await placeOf(page)) !== 'diorama') throw new Error('case 7: a drag over a house entered')
    // the drag orbited the camera: find a house again once the damping has settled, then drag out 24 px and back
    // within the tap's 300 ms (Codex F2)
    await sleep(1500)
    const house7a = await page.evaluate(`window.__findPick('village', 16)`)
    await page.mouse('mouseMoved', house7a[0], house7a[1])
    await page.mouse('mousePressed', house7a[0], house7a[1])
    await page.mouse('mouseMoved', house7a[0] + 24, house7a[1], { buttons: 1 })
    await page.mouse('mouseMoved', house7a[0], house7a[1], { buttons: 1 })
    await page.mouse('mouseReleased', house7a[0], house7a[1])
    await sleep(300)
    if ((await placeOf(page)) !== 'diorama') throw new Error('case 7: a drag out and back over a house entered')
    await sleep(1500)
    const house7b = await page.evaluate(`window.__findPick('village', 16)`)
    const k1 = await page.evaluate(kicks)
    await page.tap(house7b[0], house7b[1])
    await sleep(300)
    const k2 = await page.evaluate(kicks)
    const place7 = await placeOf(page)
    if (k2 !== k1 || place7 === 'diorama') throw new Error(`case 7: a tap on a house took the kicks from ${k1} to ${k2} and the place to ${place7}`)
    await page.waitFor(`window.__portal().place === 'street' && window.__portal().layer === 0`, 20000, 'the street after the tap')
    console.log(`PASS 7: a tap on a house enters with no surge (kicks ${k1} to ${k2}); a tree bends (${l0} to ${l1}) and does not enter; a drag does not enter, nor one out and back`)

    // ---- case 8: the flight ignores the way back
    await open(page, BASE)
    const rec8 = await record(
      page,
      async () => {
        await page.evaluate('window.__portalEnter()')
        await sleep(500)
        const disabled = await page.evaluate(`document.querySelector('.visitor-dock button').disabled`)
        if (!disabled) throw new Error('case 8: the dock control is enabled during the flight')
        await page.key('Escape')
        await page.evaluate('window.__portalLeave()')
        await page.evaluate(`document.querySelector('.visitor-dock button').click()`)
      },
      `window.__portal().place === 'street' && window.__portal().layer === 0`,
    )
    const order8 = placesOf(rec8).join(',')
    if (order8 !== 'diorama,flying,entering,street' && order8 !== 'flying,entering,street') throw new Error(`case 8: the places ran ${order8}`)
    console.log(`PASS 8: Escape, the seam and the disabled dock during the flight change nothing (${order8})`)

    // ---- case 10: a rotation in the street
    await open(page, BASE)
    const view10 = await viewNow(page)
    await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    await page.send('Emulation.setDeviceMetricsOverride', { ...DESKTOP, width: 900, height: 1600 })
    await sleep(800)
    const rec10 = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    // a portrait aspect takes the portrait lens, fitted to that aspect (portraitFov, 2026-10-25)
    const r10 = assertReturn(rec10, 'case 10', view10, { ...DIORAMA_CAMERAS.mobile, fov: portraitFov(900 / 1600) })
    console.log(`PASS 10: after a rotation in the street the return holds the saved pose (${r10.now}, ${r10.after}), its rotation and the portrait lens`)

    // ---- case 2, the phone: Vincent held at stop 0 under the layer, then walking
    await open(page, '?portal=1&arrival=0&walkMode=auto', PHONE)
    const recPhone = await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    // the hold is `entering`'s (Street's `hold`). The street's first frame is not: the walk may step in the canvas's frame
    // before this page's recorder reads it, so every `entering` frame that reads the walk must read 0
    const heldFrames = recPhone.filter((f) => f.place === 'entering' && f.walk !== null)
    if (!heldFrames.length) throw new Error(`case 2 (phone): no frame read the walk while entering: [${placesOf(recPhone)}]`)
    const moved = heldFrames.find((f) => Math.abs(f.walk) > 1e-9)
    if (moved) throw new Error(`case 2 (phone): the walk moved under the layer while entering (t ${moved.walk})`)
    await sleep(1500)
    const walked = await page.evaluate('window.__streetWalk.t')
    if (!(walked > 0)) throw new Error(`case 2 (phone): the automatic walk did not start after the layer (t ${walked})`)
    console.log(`PASS 2 (phone): Vincent at stop 0 in ${heldFrames.length} entering frames, walking after (t ${walked.toFixed(4)})`)
    // the flight and the way back keep the phone's fitted lens, with no zoom out at the start or snap at the end
    // (portraitFov, Codex PR #29 P2)
    const fitted = portraitFov(PHONE.width / PHONE.height)
    const recBack = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    // A frame under the whole layer cannot show its lens: the probe's own rAF can sample `leaving` after React's commit
    // and before the driver's first leaving frame has written the lens, with the street's still on the camera
    const offLens = [...recPhone.filter((f) => f.place === 'flying'), ...recBack.filter((f) => f.place === 'leaving' || f.place === 'diorama')]
      .filter((f) => !f.view || Math.abs(f.view.lens.fov - fitted) > 1e-9)
    const lensFaults = offLens.filter((f) => f.layer < 1)
    const flown = recPhone.filter((f) => f.place === 'flying').length
    const back = recBack.filter((f) => f.place === 'leaving').length
    if (!flown || !back || lensFaults.length) throw new Error(`case 2 (phone): ${lensFaults.length} of ${flown} flying and ${back} leaving frames off the fitted ${fitted.toFixed(2)}° with the scene in view (first ${lensFaults[0]?.place} ${lensFaults[0]?.view?.lens.fov}, layer ${lensFaults[0]?.layer})`)
    console.log(`PASS 2b (phone): ${flown} flying and ${back} leaving frames, and the return, at the fitted lens ${fitted.toFixed(2)}° wherever the scene shows (${offLens.length} under the whole layer)`)

    // ---- case 11: three round trips
    await open(page, `${BASE}&perf=1`)
    const counts = []
    for (let trip = 0; trip < 3; trip++) {
      await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
      await record(page, () => page.evaluate('window.__portalLeave()'), `window.__portal().place === 'diorama'`)
      await sleep(1500)
      counts.push(await page.evaluate('({ geometries: window.__perf.info.geometries, textures: window.__perf.info.textures })'))
    }
    if (counts.some((c) => c.geometries !== counts[0].geometries || c.textures !== counts[0].textures)) throw new Error(`case 11: the counts after each return ${JSON.stringify(counts)}`)
    console.log(`PASS 11: three round trips leave ${counts[0].geometries} geometries and ${counts[0].textures} textures each time`)

    // ---- case 12: a finger touches no land (2026-10-25: the land's cast under a finger cost Mark's phone its frame rate)
    await open(page, BASE, PHONE)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await page.evaluate(`window.__touchGet = window.__touchState; window.__landGet = window.__landState`)
    const tree12 = await page.evaluate(`window.__findPick('land', 8)`)
    if (!tree12) throw new Error('case 12: no tree on the phone')
    const surges12 = `window.__touchGet().surges.length`
    const land12 = `window.__landGet().touches.length`
    const casts12 = `window.__landGet().casts`
    const kicks12 = `window.__touchGet().kicks.length`
    const s12a = await page.evaluate(surges12)
    const l12a = await page.evaluate(land12)
    const c12a = await page.evaluate(casts12)
    await page.touch('touchStart', tree12[0], tree12[1])
    await sleep(100)
    for (let i = 1; i <= 8; i++) {
      await page.touch('touchMove', tree12[0] + i * 12, tree12[1])
      await sleep(80)
    }
    const l12held = await page.evaluate(land12)
    await page.touch('touchEnd')
    await sleep(300)
    const s12b = await page.evaluate(surges12)
    const l12b = await page.evaluate(land12)
    if (s12b <= s12a) throw new Error(`case 12: the control failed, the finger's drag took the surges from ${s12a} to ${s12b}`)
    if (l12held !== l12a || l12b !== l12a) throw new Error(`case 12: a finger on a tree took the land touches from ${l12a} to ${l12held} held and ${l12b} after`)
    // a finger's tap on a tree, once the drag's orbit has settled (the Consultant's F2): a kick, and no land touch
    await sleep(1500)
    const tree12t = await page.evaluate(`window.__findPick('land', 8)`)
    if (!tree12t) throw new Error('case 12: no tree on the phone after the drag')
    const k12a = await page.evaluate(kicks12)
    await page.touch('touchStart', tree12t[0], tree12t[1])
    await sleep(60)
    await page.touch('touchEnd')
    await sleep(300)
    const k12b = await page.evaluate(kicks12)
    const l12tap = await page.evaluate(land12)
    const c12b = await page.evaluate(casts12)
    if (k12b !== k12a + 1) throw new Error(`case 12: the control failed, a finger's tap took the kicks from ${k12a} to ${k12b}`)
    if (l12tap !== l12a) throw new Error(`case 12: a finger's tap on a tree took the land touches from ${l12a} to ${l12tap}`)
    if (c12b !== c12a) throw new Error(`case 12: a finger cast the land's ray ${c12b - c12a} times`)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await sleep(1500)
    const tree12b = await page.evaluate(`window.__findPick('land', 8)`)
    if (!tree12b) throw new Error('case 12: no tree on the phone for the mouse')
    await page.mouse('mouseMoved', tree12b[0], tree12b[1])
    await page.mouse('mousePressed', tree12b[0], tree12b[1])
    await sleep(200)
    const l12mouse = await page.evaluate(land12)
    const c12mouse = await page.evaluate(casts12)
    await page.mouse('mouseReleased', tree12b[0], tree12b[1])
    if (l12mouse <= l12tap || c12mouse <= c12b) throw new Error(`case 12: the control failed, a mouse over a tree took the land touches from ${l12tap} to ${l12mouse} and the casts from ${c12b} to ${c12mouse}`)
    console.log(`PASS 12: on the phone a finger's drag over a tree added ${s12b - s12a} sky surges and its tap a kick, with no land touch and no cast; a mouse over a tree cast ${c12mouse - c12b} times and added ${l12mouse - l12tap} touch`)

    // ---- case 13: a phone asks before its first entry, then enters as it chooses
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await open(page, BASE, PHONE)
    const coarse13 = await page.evaluate(`window.matchMedia('(hover: none) and (pointer: coarse)').matches`)
    if (!coarse13) throw new Error('case 13: the touch emulation does not read as a phone')
    const card13 = `document.querySelector('.visitor-ask')?.textContent ?? ''`
    const pill13 = (label) => page.evaluate(`document.querySelector('button[aria-label="${label}"]').click()`)
    if (await page.evaluate(card13)) throw new Error('case 13: the card shows before the tap')
    await pill13('Enter the village')
    await sleep(800)
    const shown13 = await page.evaluate(card13)
    if ((await placeOf(page)) !== 'diorama' || !shown13.includes('computer')) throw new Error(`case 13: the pill on a phone went to ${await placeOf(page)} with the card "${shown13}"`)
    await pill13('Stay with the painting')
    await sleep(400)
    if ((await page.evaluate(card13)) || (await placeOf(page)) !== 'diorama') throw new Error('case 13: "Stay with the painting" did not close the card on the painting')
    await pill13('Enter the village')
    await sleep(400)
    const rec13 = await enterAndSettle(page, () => pill13('Enter anyway'))
    if (!placesOf(rec13).includes('street') || (await page.evaluate(card13))) throw new Error(`case 13: "Enter anyway" ran ${placesOf(rec13)}`)
    await record(page, () => page.evaluate('window.__portalLeave()'), `window.__portal().place === 'diorama'`)
    const rec13b = await enterAndSettle(page, () => pill13('Enter the village'))
    if (!placesOf(rec13b).includes('street')) throw new Error(`case 13: the second entry ran ${placesOf(rec13b)}`)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    console.log(`PASS 13: a touch phone asks first ("${shown13}"), stays on "Stay", enters on "Enter anyway" (${placesOf(rec13).join(',')}), and the second entry goes straight in`)

    // ---- case 14, wander-remount: a second entry starts him on the lane, not where the first visit left him
    // street points read as world points: true under the default anchor B only, not with ?skyAnchor=A (Fable F3)
    await open(page, BASE, DESKTOP)
    await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    await page.waitFor('window.__wander && window.__wanderTo', 20000, 'the wander seams in the street')
    const slot14 = vincentPlace(0)
    const here14 = { x: slot14.position[0], z: slot14.position[2], yaw: slot14.yaw, t: 0 }
    let spot14 = null
    for (let dx = -0.4; dx <= 0.4 && !spot14; dx += 0.02) {
      for (let dz = -0.4; dz <= 0.4 && !spot14; dz += 0.02) {
        const x = here14.x + dx
        const z = here14.z + dz
        if (Math.hypot(dx, dz) >= 0.1 && wanderTo(initialWander(), here14, x, z, null)) spot14 = [x, z]
      }
    }
    if (!spot14) throw new Error('case 14: no point the wander accepts within 0.4 of his slot at stop 0')
    if ((await page.evaluate('window.__wander().mode')) !== 'lane') throw new Error('case 14: the first entry did not start him on the lane')
    if (!(await page.evaluate(`window.__wanderTo(${spot14[0]}, ${spot14[1]})`))) throw new Error(`case 14: __wanderTo refused ${spot14}`)
    await page.waitFor(`window.__wander().mode === 'going'`, 2000, 'him going')
    await page.waitFor(`Math.hypot(window.__wander().x - ${here14.x}, window.__wander().z - ${here14.z}) > 0.05`, 4000, 'him 0.05 off his slot')
    const off14 = await page.evaluate('window.__wander()')
    await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    await page.waitFor('window.__wander', 20000, 'the wander seam at the second entry')
    const second14 = await page.evaluate('window.__wander()')
    if (second14.mode !== 'lane' || second14.route.length !== 0) throw new Error(`case 14: at the second entry his mode is ${second14.mode} with route ${JSON.stringify(second14.route)}, expected lane and none`)
    console.log(`PASS 14: sent to ${spot14.map((v) => v.toFixed(3))} (${Math.hypot(off14.x - here14.x, off14.z - here14.z).toFixed(3)} off his slot before Escape), then Escape and a second entry: mode ${second14.mode}`)

    if (page.errors.length) throw new Error(`page errors:\n  ${page.errors.join('\n  ')}`)
    page.ws.close()
  } finally {
    chrome.cleanup()
  }

  // ---- case 9: the street through the portal against ?street=1, clocks pinned, by the capture script
  const dir = mkdtempSync(join(tmpdir(), 'starry-portal-frames-'))
  try {
    const capture = (query, prefix, waitFor, extra = []) =>
      execFileSync(
        'node',
        [join(here, 'capture-sky-frames.mjs'), dir, '--url', `${origin}/${query}`, '--times', '0', '--viewport', 'desktop', '--prefix', prefix, '--wait-for', waitFor, ...extra],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      )
    capture('?street=1&station=0&arrival=0&walkMode=input', 'url', 'window.__streetReady && window.__skyReady')
    capture(BASE, 'portal', 'window.__skyReady && window.__portal', [
      '--eval',
      `new Promise((resolve) => { window.__portalEnter(); const poll = () => { const s = window.__portal(); if (s.place === 'street' && s.layer === 0) resolve(s.place); else setTimeout(poll, 100) }; poll() })`,
    ])
    const a = readFileSync(join(dir, 'url-t0.png'))
    const b = readFileSync(join(dir, 'portal-t0.png'))
    if (!a.equals(b)) throw new Error(`case 9: the street through the portal differs from ?street=1 (${a.length} and ${b.length} bytes; frames kept in ${dir})`)
    console.log(`PASS 9: the street through the portal at stop 0 is byte-identical to ?street=1 (${a.length} bytes)`)
    rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    console.error(`frames: ${dir}`)
    throw error
  }

  const chromesAfter = countHeadlessChromes()
  if (chromesAfter > chromesBefore) throw new Error(`headless Chromes left open: ${chromesBefore} before, ${chromesAfter} after`)
  console.log('ALL PASS')
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
})
