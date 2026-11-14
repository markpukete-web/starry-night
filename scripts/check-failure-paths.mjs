#!/usr/bin/env node
/**
 * The input and page-failure checks (the audit of 2026-11-14, items 5 and 6), against a running dev server:
 *   DIORAMA_CAPTURE_URL=http://127.0.0.1:5197/ node scripts/check-failure-paths.mjs [screenshot folder]
 * 1. In the street at stop 1 with a mouse: a right click and a middle click on open ground leave Vincent where he is,
 *    and a left click at the same point sends him (the control). A right click on him leaves the walk as it was, and a
 *    left click on him starts it (the control).
 * 2. On the diorama: a right click on the sky adds no kick to the touch store, and a left click there adds one (the
 *    control).
 * 3. `/reference/sky-mask.png` blocked (CDP `Network.setBlockedURLs`, the cache off), on a plain visit and with
 *    `?arrival=0`, at 1600 × 900 and 390 × 844: `#root` holds the fallback; one painting is visible, loaded, with its
 *    alt text; the loading curtain is gone (on the plain visit it was up at load); the cue is not visible and the
 *    citation is; one retry button (`RETRY_LABEL`) sits in a 12 px `.arrival-retry` paragraph (`FAILED_LINE + ' ' +
 *    RETRY_LABEL`) below the citation, its drawn centre hits the button, and on the 1600 × 900 plain visit clicking
 *    it reloads the page into the failed state again; the ready seams are true; the console holds the page's own
 *    message; every page error is R3F's report of the blocked load. A screenshot of each failed state is saved for the
 *    Lead.
 * 4. The control: nothing blocked, the same visits and sizes, and no fallback, no failed class and no page error.
 * 5. The diorama decodes `painting.jpg` once (slice B1, item 13). 6. With `painting.jpg` blocked the opening does not
 *    wait 15 s for the cypress (slice B1, item 7), against the same visit unblocked.
 * The light sky's ribbons are built on first use (item 16), read through `__skyLightBuilt`, each case in its own tab:
 * 7. The default route (`?arrival=0`, 1600 × 900) builds no light sky, at ready and 2 s later.
 * 8. A click at the drawn centre of "Switch sky to painted light" builds it, and the button then reads "Sky: painted
 *    light". The longest frame gap after the click is printed with no threshold, then again in a fresh tab with the CPU
 *    throttled 4×.
 * 9. Reduced motion builds it, and the sky is ready.
 * 10. The moving sky's worker fails (each request for it failed through the CDP `Fetch` domain), so the light sky is
 *    built and the sky is ready. The console holds the worker's failure, the sky button reads "Sky: painted light" and
 *    is disabled, and a screenshot is saved for the Lead.
 * The street's failures each log one `[street]` line that names what failed (B6 and C-09, H6), each in its own tab:
 * 11. `?streetFail=painting`, 12. `?streetFail=flow`, 13. the flat panel's `?streetFail=masses`, 14. the flat panel's
 *    `land-masses.json` answered with `null`, so the build returns nothing, 15. `painting.jpg` answered with a red PNG,
 *    so `grassBlade.ts` throws and the street's boundary catches it, 16. the street's chunk blocked. Each settles the
 *    street with nothing drawn and the sky up. 17. The control: nothing failed, a street drawn and no `[street]` line.
 * Cases 7 to 10 run against the production build (`vite preview`) as well as the dev server.
 * `CASES=3,5` runs those cases alone.
 * Each case prints PASS or throws; the run exits 1 on the first failure. The Chrome launcher and the CDP page are
 * copied from `check-portal.mjs`, which exports neither. The screenshots go to the folder named, by default
 * `output/failure-paths`.
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PerspectiveCamera, Vector3 } from 'three'
import { encodePNG } from './lib/png.ts'
import { ARRIVAL_CUE, FAILED_LINE, RETRY_LABEL, VINCENTS_CITE } from '../src/scene/arrival.ts'
import { vincentPlace } from '../src/scene/streetLayout.ts'
import { WALK } from '../src/scene/streetWalk.ts'
import { hidden, initialWander, standable, wanderTo } from '../src/scene/streetWander.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || 'http://127.0.0.1:5197/'
const origin = new URL(appUrl).origin
const DESKTOP = { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
const outDir = process.argv[2] || 'output/failure-paths'
const BLOCKED = '*/reference/sky-mask.png*'
/** the page's own message, from `failPage` in `src/bootCurtain.ts` */
const OWN_MESSAGE = 'failed to draw its scene'
/**
 * `REDUCED=1` runs the cases under `prefers-reduced-motion: reduce`: the failed page must show there too. Run it with
 * `CASES=3,4`: reduced motion stops the walk, so case 1 cannot pass under it.
 */
const REDUCED = Boolean(process.env.REDUCED)

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
  const userDataDir = mkdtempSync(join(tmpdir(), 'starry-failure-'))
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
    // every console.error's text, for the failed page's own message
    this.consoleErrors = []
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
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.consoleErrors.push(message.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
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
  /** a press and a release of one mouse button at a point, 50 ms apart: a tap's timing */
  async click(x, y, button = 'left') {
    const buttons = { left: 1, right: 2, middle: 4 }[button]
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons, clickCount: 1 })
    await sleep(50)
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1 })
  }
}

async function newPage(port) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const page = new CdpPage(target.webSocketDebuggerUrl)
  await page.connect()
  // one live tab at a time: a tab left open keeps its scene drawing under the next case
  page.close = async () => {
    page.ws.close()
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`)
  }
  return page
}

/** `reduced`, when given, overrides `REDUCED` for this visit */
async function open(page, query, viewport, { reduced = REDUCED } = {}) {
  await page.send('Emulation.setDeviceMetricsOverride', viewport)
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] })
  const url = new URL(origin)
  for (const [key, value] of new URLSearchParams(query)) url.searchParams.set(key, value)
  await page.send('Page.navigate', { url: url.href })
  await sleep(500)
  const loaded = await page.evaluate('location.search')
  if (loaded !== url.search) throw new Error(`loaded ${loaded}, not ${url.search}`)
}

// --- the street's point choice, as check-street-walk.mjs makes it ---

/** the camera the page draws, from `__streetCamera()` */
function liveCamera(cam, size) {
  const persp = new PerspectiveCamera(cam.fov, size.width / size.height, cam.near, cam.far)
  persp.position.fromArray(cam.position)
  persp.quaternion.fromArray(cam.quaternion)
  persp.updateMatrixWorld()
  persp.updateProjectionMatrix()
  return persp
}

/** a street point in client pixels */
function toClient(persp, size, [x, y, z]) {
  const v = new Vector3(x, y, z).project(persp)
  return [size.left + ((v.x + 1) / 2) * size.width, size.top + ((1 - v.y) / 2) * size.height]
}

/** his tap box as the page reads it: at least `WALK.hitMin` square about its centre */
function tapBox(b) {
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  const hw = Math.max((b.x1 - b.x0) / 2, WALK.hitMin / 2)
  const hh = Math.max((b.y1 - b.y0) / 2, WALK.hitMin / 2)
  return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh }
}

const insideBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
const insideCanvas = (size, x, y, margin) => x >= size.left + margin && x <= size.left + size.width - margin && y >= size.top + margin && y <= size.top + size.height - margin

/** a ground point 0.12 to 0.3 from his slot that `wanderTo` accepts with the page's view, on the canvas, off his box */
async function openGround(page, t, view) {
  const size = await page.evaluate(`(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height } })()`)
  const persp = liveCamera(await page.evaluate('window.__streetCamera()'), size)
  const box = tapBox(await page.evaluate('window.__vincentBox()'))
  const slot = vincentPlace(t)
  const here = { x: slot.position[0], z: slot.position[2], yaw: slot.yaw, t }
  for (let dx = -0.3; dx <= 0.3; dx += 0.01) {
    for (let dz = -0.3; dz <= 0.3; dz += 0.01) {
      const x = here.x + dx
      const z = here.z + dz
      const d = Math.hypot(dx, dz)
      if (d < 0.12 || d > 0.3 || !standable(x, z) || hidden(persp.position.x, persp.position.z, x, z)) continue
      if (!wanderTo(initialWander(), here, x, z, view)) continue
      const [px, py] = toClient(persp, size, [x, 0, z])
      if (!insideCanvas(size, px, py, 40) || insideBox(box, px, py)) continue
      if (!(await page.evaluate(`document.elementFromPoint(${px}, ${py}) === document.querySelector('canvas')`))) continue
      return { x, z, px, py, box }
    }
  }
  throw new Error('no open ground the wander accepts on the canvas within 0.3 of his slot')
}

// --- the cases ---

async function caseStreetButtons(page) {
  const query = '?street=1&station=1&arrival=0&walkMode=input'
  await open(page, query, DESKTOP)
  await page.waitFor('window.__streetReady && window.__wander && window.__vincentBox && window.__streetCamera && window.__streetWalk', 30000, 'the street and its seams')
  const before = await page.evaluate('window.__wander()')
  if (before.mode !== 'lane') throw new Error(`case 1: he starts ${before.mode}, not on the lane`)
  const P = await openGround(page, await page.evaluate('window.__streetWalk.t'), before.view)
  for (const button of ['right', 'middle']) {
    await page.click(P.px, P.py, button)
    await sleep(400)
    const after = await page.evaluate('window.__wander()')
    if (after.mode !== 'lane' || after.x !== before.x || after.z !== before.z)
      throw new Error(`case 1: a ${button} click on open ground at [${P.px.toFixed(0)}, ${P.py.toFixed(0)}] moved him: ${JSON.stringify(after)}`)
  }
  await page.click(P.px, P.py, 'left')
  await page.waitFor(`window.__wander().mode === 'going'`, 3000, 'the left click to send him (the control)')
  await page.waitFor(`Math.hypot(window.__wander().x - ${before.x}, window.__wander().z - ${before.z}) > 0.01`, 4000, 'him 0.01 off his slot')

  // on him: a fresh load, since the control sent him off
  await open(page, query, DESKTOP)
  await page.waitFor('window.__streetReady && window.__vincentBox && window.__streetWalk', 30000, 'the street again')
  const box = tapBox(await page.evaluate('window.__vincentBox()'))
  const cx = (box.x0 + box.x1) / 2
  const cy = (box.y0 + box.y1) / 2
  if (!(await page.evaluate(`document.elementFromPoint(${cx}, ${cy}) === document.querySelector('canvas')`))) throw new Error('case 1: his box centre is not on the canvas')
  const auto = await page.evaluate('window.__streetWalk.auto')
  await page.click(cx, cy, 'right')
  await sleep(400)
  if ((await page.evaluate('window.__streetWalk.auto')) !== auto) throw new Error('case 1: a right click on him toggled the walk')
  await page.click(cx, cy, 'left')
  await page.waitFor(`window.__streetWalk.auto === ${!auto}`, 2000, 'the left click on him to toggle the walk (the control)')
  console.log(`PASS 1: in the street, a right and a middle click at [${P.px.toFixed(0)}, ${P.py.toFixed(0)}] left him on the lane and a left click sent him; a right click on him left the walk and a left click toggled it`)
}

async function caseDioramaButtons(page) {
  await open(page, '?arrival=0&portal=0', DESKTOP)
  await page.waitFor('window.__skyReady && window.__touchState', 30000, 'the sky and the touch seam')
  const x = DESKTOP.width * 0.75
  const y = DESKTOP.height * 0.15
  if (!(await page.evaluate(`document.elementFromPoint(${x}, ${y}) === document.querySelector('canvas')`))) throw new Error('case 2: the sky point is not on the canvas')
  const kicks = () => page.evaluate('window.__touchState().kicks.length')
  const k0 = await kicks()
  await page.click(x, y, 'right')
  await sleep(300)
  const k1 = await kicks()
  if (k1 !== k0) throw new Error(`case 2: a right click on the sky added a kick (${k0} to ${k1})`)
  await page.click(x, y, 'left')
  await sleep(300)
  const k2 = await kicks()
  if (k2 !== k1 + 1) throw new Error(`case 2: a left click on the sky added ${k2 - k1} kicks, not 1 (the control)`)
  console.log(`PASS 2: on the diorama, a right click on the sky added no kick and a left click added one (${k1} to ${k2})`)
}

// in the page: whether an element is drawn, its own style and its ancestors' opacity included
const VISIBLE = `((el) => {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const s = getComputedStyle(e)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
  }
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth
})`

/**
 * A fresh tab for one visit: no `starry-night:arrived` in its session, so a plain visit plays the opening, and a note of
 * whether `#boot` stood once the document had parsed (the bundle's render commits after that).
 */
async function visitPage(port, blocked) {
  const page = await newPage(port)
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { sessionStorage.removeItem('starry-night:arrived') } catch (e) {}
      document.addEventListener('DOMContentLoaded', () => { window.__bootAtLoad = Boolean(document.getElementById('boot')) })`,
  })
  await page.send('Network.setBlockedURLs', { urls: blocked ? [BLOCKED] : [] })
  await page.send('Network.setCacheDisabled', { cacheDisabled: blocked })
  return page
}

const VISITS = [
  ['plain', ''],
  ['arrival0', '?arrival=0'],
]

async function caseFailed(port, name, query, viewport) {
  const size = `${viewport.width} × ${viewport.height}`
  const page = await visitPage(port, true)
  try {
    await open(page, query, viewport)
    await page.waitFor(`document.querySelector('#root .page-failed')`, 30000, `the fallback (${name}, ${size})`)
    await page.waitFor(`[...document.querySelectorAll('img')].every((img) => img.complete)`, 10000, 'the painting to load')
    const state = await page.evaluate(`(() => {
      const visible = ${VISIBLE}
      const paintings = [...document.querySelectorAll('img')].filter((img) => /painting\\.jpg/.test(img.src) && visible(img))
      const withText = (text) => [...document.querySelectorAll('p')].filter((p) => p.textContent === text && visible(p))
      const cite = withText(${JSON.stringify(VINCENTS_CITE)})[0] ?? null
      const buttons = [...document.querySelectorAll('button')]
      const button = buttons[0] ?? null
      const retry = button?.closest('p.arrival-retry') ?? document.querySelector('p.arrival-retry')
      const br = button && visible(button) ? button.getBoundingClientRect() : null
      const rr = retry && visible(retry) ? retry.getBoundingClientRect() : null
      const cr = cite ? cite.getBoundingClientRect() : null
      const bx = br ? br.left + br.width / 2 : null
      const by = br ? br.top + br.height / 2 : null
      return {
        root: document.getElementById('root').childElementCount,
        paintings: paintings.map((img) => ({ width: img.naturalWidth, alt: img.alt })),
        bootAtLoad: window.__bootAtLoad,
        boot: Boolean(document.getElementById('boot')),
        cues: withText(${JSON.stringify(ARRIVAL_CUE)}).length,
        cites: withText(${JSON.stringify(VINCENTS_CITE)}).length,
        buttons: buttons.length,
        buttonText: button?.textContent ?? null,
        buttonVisible: button ? visible(button) : false,
        retryText: retry?.textContent ?? null,
        retryVisible: retry ? visible(retry) : false,
        retryFontSize: retry ? getComputedStyle(retry).fontSize : null,
        retryTop: rr?.top ?? null,
        citeBottom: cr?.bottom ?? null,
        buttonCentre: bx !== null && by !== null ? { x: bx, y: by } : null,
        elementAtCentreIsButton: bx !== null && by !== null ? document.elementFromPoint(bx, by) === button : false,
        canvases: document.querySelectorAll('canvas').length,
        failedClass: document.documentElement.classList.contains('arrival-failed'),
        seams: [window.__skyReady, window.__streetReady],
      }
    })()`)
    const fail = (what) => {
      throw new Error(`case 3 (${name}, ${size}): ${what}; state ${JSON.stringify(state)}`)
    }
    if (state.root < 1) fail('#root is empty')
    if (state.paintings.length !== 1) fail(`${state.paintings.length} paintings are visible, not 1`)
    if (!(state.paintings[0].width > 0)) fail('the painting did not load')
    if (state.paintings[0].alt !== 'The Starry Night, Vincent van Gogh, 1889') fail('the painting lost its alt text')
    // under reduced motion `index.html` removes the curtain before the document has parsed
    if (name === 'plain' && !REDUCED && state.bootAtLoad !== true) fail('the loading curtain was not up at load, so the plain visit tested nothing')
    if (state.boot) fail('the loading curtain is still up')
    if (state.cues !== 0) fail('the cue is visible')
    if (state.cites !== 1) fail(`${state.cites} citations are visible, not 1`)
    if (state.buttons !== 1) fail(`${state.buttons} buttons on the failed page, expected 1`)
    if (!state.buttonVisible || state.buttonText !== RETRY_LABEL) fail(`retry button text is ${JSON.stringify(state.buttonText)}, expected ${JSON.stringify(RETRY_LABEL)}`)
    if (!state.retryVisible || state.retryText !== `${FAILED_LINE} ${RETRY_LABEL}`) fail(`retry paragraph text is ${JSON.stringify(state.retryText)}`)
    if (state.retryFontSize !== '12px') fail(`retry fontSize is ${state.retryFontSize}, expected 12px`)
    if (!(state.retryTop !== null && state.citeBottom !== null && state.retryTop > state.citeBottom))
      fail(`retry top (${state.retryTop}) is not below citation bottom (${state.citeBottom})`)
    if (!state.buttonCentre || !state.elementAtCentreIsButton) fail('elementFromPoint at the button centre is not the button')
    if (state.canvases !== 0) fail(`${state.canvases} canvases are left`)
    if (!state.failedClass) fail('no arrival-failed class')
    if (state.seams[0] !== true || state.seams[1] !== true) fail('a ready seam is not true')
    if (!page.consoleErrors.some((text) => text.includes(OWN_MESSAGE))) fail(`the console lacks "${OWN_MESSAGE}": ${JSON.stringify(page.consoleErrors)}`)
    // R3F's root reports the error its boundary caught through reportError, so the blocked load shows as a page error:
    // that one is expected, and any other fails the case
    if (!page.errors.length || page.errors.some((e) => !/sky-mask\.png/.test(e))) fail(`page errors ${JSON.stringify(page.errors)}`)
    const shot = await page.send('Page.captureScreenshot', { format: 'png' })
    const file = join(outDir, `failed-${name}-${viewport.width}x${viewport.height}.png`)
    writeFileSync(file, Buffer.from(shot.data, 'base64'))
    let reloadNote = ''
    if (name === 'plain' && viewport.width === DESKTOP.width && viewport.height === DESKTOP.height) {
      const prevErrors = page.errors.length
      const prevConsoleErrors = page.consoleErrors.length
      await page.evaluate('window.__beforeReload = true')
      const loaded = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          page.ws.removeEventListener('message', onMsg)
          reject(new Error(`case 3 (${name}, ${size}): timed out waiting for reload after clicking retry`))
        }, 10000)
        function onMsg(event) {
          const msg = JSON.parse(event.data)
          if (msg.method === 'Page.loadEventFired') {
            clearTimeout(timer)
            page.ws.removeEventListener('message', onMsg)
            resolve()
          }
        }
        page.ws.addEventListener('message', onMsg)
      })
      await page.click(state.buttonCentre.x, state.buttonCentre.y, 'left')
      await loaded
      await page.waitFor(
        `!window.__beforeReload && performance.getEntriesByType('navigation')[0]?.type === 'reload' && document.querySelector('#root .page-failed')`,
        30000,
        'the reloaded fallback',
      )
      await page.waitFor(`[...document.querySelectorAll('img')].every((img) => img.complete)`, 10000, 'the reloaded painting to load')
      const reloaded = await page.evaluate(`({
        navType: performance.getEntriesByType('navigation')[0]?.type ?? null,
        failedClass: document.documentElement.classList.contains('arrival-failed'),
        buttons: document.querySelectorAll('button').length,
        boot: Boolean(document.getElementById('boot')),
      })`)
      if (reloaded.navType !== 'reload') fail(`after retry click, navigation type is ${reloaded.navType}, not 'reload'`)
      if (!reloaded.failedClass || reloaded.boot || reloaded.buttons !== 1) fail(`after reload, failed state is incomplete: ${JSON.stringify(reloaded)}`)
      if (!page.consoleErrors.slice(prevConsoleErrors).some((text) => text.includes(OWN_MESSAGE)))
        fail(`after reload, console lacks "${OWN_MESSAGE}"`)
      if (page.errors.slice(prevErrors).some((e) => !/sky-mask\.png/.test(e)))
        fail(`after reload, unexpected page errors: ${JSON.stringify(page.errors.slice(prevErrors))}`)
      reloadNote = '; clicked retry -> reloaded into failed state'
    }
    console.log(`PASS 3 (${name}, ${size}): the painting, its alt, citation and retry button, no curtain, cue or canvas, seams true; ${page.errors.length} reported load error${reloadNote}; ${file}`)
  } finally {
    await page.close()
  }
}

async function caseControl(port, name, query, viewport) {
  const size = `${viewport.width} × ${viewport.height}`
  const page = await visitPage(port, false)
  try {
    await open(page, query, viewport)
    await page.waitFor('window.__skyReady', 30000, `the sky (${name}, ${size})`)
    await sleep(1000)
    const state = await page.evaluate(`({ fallback: Boolean(document.querySelector('.page-failed')), retry: Boolean(document.querySelector('.arrival-retry')), failedClass: document.documentElement.classList.contains('arrival-failed'), canvases: document.querySelectorAll('canvas').length })`)
    if (state.fallback || state.retry || state.failedClass || state.canvases < 1 || page.errors.length || page.consoleErrors.some((text) => text.includes(OWN_MESSAGE)))
      throw new Error(`case 4 (${name}, ${size}): with nothing blocked ${JSON.stringify({ ...state, errors: page.errors })}`)
    console.log(`PASS 4 (${name}, ${size}): with nothing blocked, the scene and no fallback`)
  } finally {
    await page.close()
  }
}

/** Is this Vite's dev server? There StrictMode runs each effect twice, so the diorama decodes the painting twice. */
const IS_DEV = `Boolean(document.querySelector('script[src*="@vite/client"]'))`

/**
 * Case 5 (the audit's item 13): the diorama decodes `painting.jpg` once for the island and the cypress. Each decode is
 * one `drawImage` of that image (`useImageData.ts` `readPixels`, the only draw of an image in `src`), so the count is 1 on
 * a production build and 2 under the dev server's StrictMode. Before the fix it was 2 and 4.
 */
async function caseOneDecode(port) {
  const page = await visitPage(port, false)
  try {
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__paintingDraws = 0
        const draw = CanvasRenderingContext2D.prototype.drawImage
        CanvasRenderingContext2D.prototype.drawImage = function (image, ...rest) {
          if (image instanceof HTMLImageElement && /\\/reference\\/painting\\.jpg$/.test(new URL(image.src).pathname)) window.__paintingDraws++
          return draw.call(this, image, ...rest)
        }`,
    })
    await open(page, '?arrival=0', DESKTOP)
    await page.waitFor('window.__skyReady && window.__portal && window.__portal().diorama', 60000, 'the sky, the cypress and the land')
    await sleep(1000)
    const { draws, dev } = await page.evaluate(`({ draws: window.__paintingDraws, dev: ${IS_DEV} })`)
    const expected = dev ? 2 : 1
    if (draws !== expected) throw new Error(`case 5: painting.jpg was decoded ${draws} times, expected ${expected} (${dev ? 'dev server, StrictMode' : 'production build'})`)
    if (page.errors.length) throw new Error(`case 5: page errors\n  ${page.errors.join('\n  ')}`)
    console.log(`PASS 5: the diorama decoded painting.jpg ${draws} time${draws === 1 ? '' : 's'} (${dev ? 'dev server, StrictMode doubles it' : 'production build'})`)
  } finally {
    await page.close()
  }
}

/** How long a plain visit takes from its navigation to the curtain's removal, with the cypress's and the land's seams read then. */
async function openingMs(port, blockPainting) {
  const page = await visitPage(port, false)
  try {
    if (blockPainting) {
      await page.send('Network.setBlockedURLs', { urls: ['*/reference/painting.jpg*'] })
      await page.send('Network.setCacheDisabled', { cacheDisabled: true })
    }
    const start = Date.now()
    await open(page, '?arrival=1', DESKTOP)
    await page.waitFor(`window.__bootAtLoad === true && !document.getElementById('boot')`, 60000, `the curtain's removal (${blockPainting ? 'painting blocked' : 'nothing blocked'})`)
    const ms = Date.now() - start
    const state = await page.evaluate(`({ diorama: Boolean(window.__portal && window.__portal().diorama), fallback: Boolean(document.querySelector('.page-failed')), canvases: document.querySelectorAll('canvas').length })`)
    return { ms, ...state, consoleErrors: page.consoleErrors.slice(), errors: page.errors.slice() }
  } finally {
    await page.close()
  }
}

/**
 * Case 6 (the audit's item 7): with `painting.jpg` blocked, the cypress and the land report ready, so the opening does
 * not wait out `ARRIVAL.readyTimeout` (15 s). The control is the same visit with nothing blocked, on this machine. The
 * page keeps its scene (no fallback: the sky reads other files), and the diorama logs the failure once.
 */
async function casePaintingFails(port) {
  const control = await openingMs(port, false)
  const blocked = await openingMs(port, true)
  const dioramaLogs = blocked.consoleErrors.filter((text) => text.includes('[diorama] /reference/painting.jpg failed to load')).length
  const cypressLogs = blocked.consoleErrors.filter((text) => text.includes('[cypress] /reference/painting.jpg failed to load')).length
  const summary = JSON.stringify({ controlMs: control.ms, blockedMs: blocked.ms, diorama: blocked.diorama, fallback: blocked.fallback, canvases: blocked.canvases, dioramaLogs, cypressLogs, errors: blocked.errors })
  if (!control.diorama) throw new Error(`case 6: the control's cypress and land were not ready at the curtain's removal ${JSON.stringify(control)}`)
  if (!blocked.diorama) throw new Error(`case 6: with the painting blocked the cypress or the land never reported ready ${summary}`)
  if (blocked.ms > control.ms + 6000) throw new Error(`case 6: with the painting blocked the opening took ${blocked.ms} ms against ${control.ms} ms: it waited ${summary}`)
  if (blocked.fallback || blocked.canvases < 1) throw new Error(`case 6: a failed painting must leave the scene up ${summary}`)
  // one log per failure, or two under the dev server's StrictMode, and never the cypress's own: the diorama owns the load
  if (dioramaLogs < 1 || dioramaLogs > 2 || cypressLogs !== 0) throw new Error(`case 6: the failure's log ${summary}`)
  if (blocked.errors.length) throw new Error(`case 6: page errors ${summary}`)
  console.log(`PASS 6: with painting.jpg blocked the opening took ${blocked.ms} ms against ${control.ms} ms unblocked, the cypress and the land ready, the scene up, ${dioramaLogs} log from the diorama`)
}

// --- the light sky is built on first use (the audit's item 16) ---

/** the two sky seams, read at once */
const SKY_SEAMS = `({ ready: window.__skyReady, lightBuilt: window.__skyLightBuilt })`

/** Poll the sky seams until both are true, or fail with the case's own message and both values. */
async function waitSkyLight(page, n, what, timeoutMs = 30000) {
  const start = Date.now()
  for (;;) {
    const seams = await page.evaluate(SKY_SEAMS)
    if (seams.ready === true && seams.lightBuilt === true) return seams
    if (Date.now() - start > timeoutMs)
      throw new Error(`case ${n}: ${what}: after ${timeoutMs} ms __skyReady is ${seams.ready} and __skyLightBuilt is ${seams.lightBuilt}`)
    await sleep(100)
  }
}

/** Poll `__skyReady` alone, with the case's own message. */
async function waitSkyReady(page, n, timeoutMs) {
  const start = Date.now()
  while ((await page.evaluate('window.__skyReady')) !== true) {
    if (Date.now() - start > timeoutMs) throw new Error(`case ${n}: the sky was not ready after ${timeoutMs} ms`)
    await sleep(100)
  }
}

/** Case 7: the default route opens on the moving sky and builds no light sky, at once and 2 s later. */
async function caseNoLightSky(port) {
  const page = await newPage(port)
  try {
    await open(page, '?arrival=0', DESKTOP, { reduced: false })
    await waitSkyReady(page, 7, 30000)
    const first = await page.evaluate('window.__skyLightBuilt')
    await sleep(2000)
    const later = await page.evaluate('window.__skyLightBuilt')
    if (first !== false || later !== false) throw new Error(`case 7: the default route built the light sky: __skyLightBuilt was ${first} at ready and ${later} 2 s later`)
    console.log('PASS 7: the default route built no light sky, at ready and 2 s later')
  } finally {
    await page.close()
  }
}

/**
 * One switch to painted light in a fresh tab. A loop in the page records the longest gap between animation frames. It
 * is reset just before the click, so the gap read is the switch's alone, and the longest gap before it is kept apart.
 */
async function switchGap(port, throttle) {
  const page = await newPage(port)
  try {
    if (throttle) await page.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    await open(page, '?arrival=0', DESKTOP, { reduced: false })
    await waitSkyReady(page, 8, throttle ? 120000 : 30000)
    await page.evaluate(`(() => {
      window.__gapMax = 0
      let last = performance.now()
      // the callback's own clock: the frame's timestamp can read a late frame as on time
      const tick = () => {
        const now = performance.now()
        window.__gapMax = Math.max(window.__gapMax, now - last)
        last = now
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })()`)
    await sleep(1000)
    const target = await page.evaluate(`(() => {
      const btn = document.querySelector('button[aria-label="Switch sky to painted light"]')
      if (!btn) return null
      const r = btn.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      window.__skyButton = btn
      return { cx, cy, hit: btn.contains(document.elementFromPoint(cx, cy)) }
    })()`)
    if (!target) throw new Error('case 8: no button with the aria-label "Switch sky to painted light"')
    if (!target.hit) throw new Error(`case 8: the button's drawn centre [${target.cx}, ${target.cy}] is not inside it`)
    const before = await page.evaluate('(() => { const max = window.__gapMax; window.__gapMax = 0; return max })()')
    await page.click(target.cx, target.cy)
    const start = Date.now()
    let state
    for (;;) {
      state = await page.evaluate(`(() => {
        const btn = window.__skyButton
        return { lightBuilt: window.__skyLightBuilt, label: btn?.querySelector('.visitor-control-label')?.textContent ?? null, aria: btn?.getAttribute('aria-label') ?? null }
      })()`)
      if (state.lightBuilt === true && state.label === 'Sky: painted light' && state.aria === 'Switch sky to moving strokes') break
      if (Date.now() - start > (throttle ? 30000 : 10000)) throw new Error(`case 8: after the click ${JSON.stringify(state)}`)
      await sleep(100)
    }
    // the build runs inside the click's task, so the gap closes only on a later frame
    const gap = await page.evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__gapMax))))')
    return { gap, before }
  } finally {
    await page.close()
  }
}

/** Case 8: a click on the sky button builds the light sky. The longest frame gap is printed with no threshold. */
async function caseSwitchBuilds(port) {
  const { gap, before } = await switchGap(port, 0)
  console.log(`PASS 8: the switch built the light sky and the button reads "Sky: painted light"; longest frame gap ${gap.toFixed(1)} ms after the click (${before.toFixed(1)} ms before it)`)
  const slow = await switchGap(port, 4)
  console.log(`PASS 8 (CPU throttled 4×): longest frame gap ${slow.gap.toFixed(1)} ms after the click (${slow.before.toFixed(1)} ms before it)`)
}

/** Case 9: reduced motion shows the painted-light sky, so it builds it. */
async function caseReducedBuilds(port) {
  const page = await newPage(port)
  try {
    await open(page, '?arrival=0', DESKTOP, { reduced: true })
    await waitSkyLight(page, 9, 'reduced motion did not build the light sky')
    console.log('PASS 9: under reduced motion the light sky is built and the sky is ready')
  } finally {
    await page.close()
  }
}

/**
 * Case 10: the moving sky's worker fails to load, so the light sky is built and draws. `Network.setBlockedURLs` does not
 * stop a dedicated worker's script, so each request for it is paused by the `Fetch` domain and failed. With the moving
 * sky failed the ribbons drawn are the light sky's, and `__skyReady` is true only when they exist.
 */
async function caseWorkerFails(port) {
  const page = await newPage(port)
  let paused = 0
  const onPaused = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method !== 'Fetch.requestPaused') return
    paused++
    page.send('Fetch.failRequest', { requestId: msg.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {})
  }
  page.ws.addEventListener('message', onPaused)
  try {
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*movingSky.worker*' }] })
    await open(page, '?arrival=0', DESKTOP, { reduced: false })
    try {
      await waitSkyLight(page, 10, 'a failed worker did not build the light sky')
    } catch (error) {
      throw new Error(`${error.message}; ${paused} worker request${paused === 1 ? '' : 's'} paused`)
    }
    if (!page.consoleErrors.some((text) => text.includes('[sky] moving-stroke worker failed')))
      throw new Error(`case 10: the console lacks "[sky] moving-stroke worker failed" (${paused} worker requests paused): ${JSON.stringify(page.consoleErrors)}`)
    const deadline = Date.now() + 5000
    let button = null
    for (;;) {
      button = await page.evaluate(`(() => {
        const btn = document.querySelector('button.visitor-control[aria-label="Sky is painted light: moving strokes could not load"]')
        if (!btn) return null
        return {
          text: btn.querySelector('.visitor-control-label')?.textContent ?? null,
          disabled: btn.disabled,
          ariaPressed: btn.getAttribute('aria-pressed'),
        }
      })()`)
      if (button || Date.now() >= deadline) break
      await sleep(100)
    }
    if (!button)
      throw new Error('case 10: no button.visitor-control with aria-label "Sky is painted light: moving strokes could not load"')
    if (button.text !== 'Sky: painted light')
      throw new Error(`case 10: sky button .visitor-control-label text was ${JSON.stringify(button.text)}, expected "Sky: painted light"`)
    if (button.disabled !== true)
      throw new Error(`case 10: sky button disabled was ${JSON.stringify(button.disabled)}, expected true`)
    if (button.ariaPressed !== 'false')
      throw new Error(`case 10: sky button aria-pressed was ${JSON.stringify(button.ariaPressed)}, expected "false"`)
    const shot = await page.send('Page.captureScreenshot', { format: 'png' })
    const file = join(outDir, 'worker-failed-1600x900.png')
    writeFileSync(file, Buffer.from(shot.data, 'base64'))
    console.log(`PASS 10: with the worker failed (${paused} request${paused === 1 ? '' : 's'} paused) the light sky is built, the sky is ready, and the button reads "${button.text}"; ${file}`)
  } finally {
    page.ws.removeEventListener('message', onPaused)
    await page.close()
  }
}

// --- the street's failures log by name (B6 and C-09, audit item 25, H6) ---

/** the console.error lines with the street's prefix */
const streetLines = (page) => page.consoleErrors.filter((text) => text.startsWith('[street]'))

/**
 * A red 160 × 127 PNG, the painting's aspect: every texel is red (`r > 1.05 g` and `r > b`), so the grass finds no usable
 * texel and `grassBlade.ts` throws. A black one trips `frog.ts` first: black is usable grass paint, and not olive or green.
 */
const RED_PNG = encodePNG(160, 127, new Uint8Array(160 * 127 * 4).map((_, i) => [200, 30, 30, 255][i % 4])).toString('base64')

/**
 * One street visit with one failure. `fulfil` answers each request matching its pattern through the CDP `Fetch` domain,
 * `blocked` blocks URLs with the cache off. The street must settle (`__streetReady` true), the sky stay with no fallback,
 * and the console hold exactly one `[street]` line (two under the dev server's StrictMode) that matches `line`.
 */
async function caseStreetFails(port, n, what, query, line, { fulfil, blocked } = {}) {
  const page = await newPage(port)
  let answered = 0
  const onPaused = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method !== 'Fetch.requestPaused') return
    answered++
    page.send('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: fulfil.type }], body: fulfil.body }).catch(() => {})
  }
  page.ws.addEventListener('message', onPaused)
  try {
    if (fulfil) await page.send('Fetch.enable', { patterns: [{ urlPattern: fulfil.pattern }] })
    if (blocked) {
      await page.send('Network.setBlockedURLs', { urls: blocked })
      await page.send('Network.setCacheDisabled', { cacheDisabled: true })
    }
    await open(page, query, DESKTOP, { reduced: false })
    await page.waitFor('window.__streetReady === true', 30000, `case ${n}: the street to settle (${what})`)
    await sleep(500)
    const state = await page.evaluate(`({ ready: window.__streetReady, counts: window.__streetCounts ?? null, fallback: Boolean(document.querySelector('.page-failed')), canvases: document.querySelectorAll('canvas').length, dev: ${IS_DEV} })`)
    const lines = streetLines(page)
    const summary = JSON.stringify({ ...state, answered, lines, consoleErrors: page.consoleErrors })
    if (fulfil && answered === 0) throw new Error(`case ${n}: no request matched ${fulfil.pattern} ${summary}`)
    if (state.fallback || state.canvases < 1) throw new Error(`case ${n}: ${what} must leave the sky up with no fallback ${summary}`)
    if (state.ready !== true) throw new Error(`case ${n}: ${what}: __streetReady fell back to ${state.ready} after it settled ${summary}`)
    if (state.counts !== null) throw new Error(`case ${n}: ${what} drew a street ${summary}`)
    if (lines.length < 1 || lines.length > (state.dev ? 2 : 1) || !lines.every((text) => line.test(text)))
      throw new Error(`case ${n}: ${what}: the console holds ${lines.length} [street] lines, not one matching ${line} ${summary}`)
    console.log(`PASS ${n}: ${what} logs ${JSON.stringify(lines[0].slice(0, 160))}, the street settled with nothing drawn and the sky up`)
  } finally {
    page.ws.removeEventListener('message', onPaused)
    await page.close()
  }
}

const STREET_QUERY = '?street=1&arrival=0&walkMode=input'

/** Cases 11 to 16: each failure path of the street, one visit each. */
async function caseStreetFailures(port) {
  if (wanted(11)) await caseStreetFails(port, 11, 'a failed painting', `${STREET_QUERY}&streetFail=painting`, /^\[street\] the painting \(\/reference\/missing\.png\) failed to load/)
  if (wanted(12)) await caseStreetFails(port, 12, "a failed land's flow", `${STREET_QUERY}&streetFail=flow`, /^\[street\] the land's flow \(\/reference\/missing\.png\) failed to load/)
  if (wanted(13)) await caseStreetFails(port, 13, "the flat panel's failed masses", `${STREET_QUERY}&flat=1&streetFail=masses`, /^\[street\] the baked masses \(\/reference\/missing\.png\) failed to load/)
  // `land-masses.json` answered with `null`: the fetch succeeds, and `buildFlatPanel` returns no build
  if (wanted(14))
    await caseStreetFails(port, 14, 'a build that returns nothing', `${STREET_QUERY}&flat=1`, /^\[street\] the build returned no street/, {
      fulfil: { pattern: '*/reference/land-masses.json*', type: 'application/json', body: Buffer.from('null').toString('base64') },
    })
  // the street's boundary catches the throw and sets `__streetReady` after the street's own unmount reset (B7)
  if (wanted(15))
    await caseStreetFails(port, 15, 'a build that throws', STREET_QUERY, /^\[street\] .*grassBlade: /, {
      fulfil: { pattern: '*/reference/painting.jpg*', type: 'image/png', body: RED_PNG },
    })
  if (wanted(16))
    await caseStreetFails(port, 16, "a failed street's chunk", STREET_QUERY, /^\[street\] .*Street/, { blocked: ['*/src/scene/Street.tsx*', '*/assets/Street-*.js'] })
}

/** Case 17, the control: the street with nothing failed draws and logs no `[street]` line. */
async function caseStreetControl(port) {
  const page = await newPage(port)
  try {
    await open(page, STREET_QUERY, DESKTOP, { reduced: false })
    await page.waitFor('window.__streetReady === true && window.__streetCounts', 30000, 'case 17: the street')
    await sleep(500)
    const counts = await page.evaluate('window.__streetCounts')
    if (!(counts.triangles > 0) || streetLines(page).length) throw new Error(`case 17: ${JSON.stringify({ counts, lines: streetLines(page) })}`)
    console.log(`PASS 17: the street with nothing failed drew ${counts.triangles} triangles and logged no [street] line`)
  } finally {
    await page.close()
  }
}

/** `CASES=3,5` runs those cases alone, so each can be seen to fail on a build without its fix. Absent, every case runs. */
const only = (process.env.CASES ?? '').split(',').filter(Boolean).map(Number)
const wanted = (n) => only.length === 0 || only.includes(n)

async function main() {
  mkdirSync(outDir, { recursive: true })
  const chromesBefore = countHeadlessChromes()
  const port = 9300 + Math.floor(Math.random() * 300)
  const chrome = startChrome(port)
  try {
    await waitForChrome(port)
    const page = await newPage(port)
    if (wanted(1)) await caseStreetButtons(page)
    if (wanted(2)) await caseDioramaButtons(page)
    if (page.errors.length) throw new Error(`page errors in cases 1 and 2:\n  ${page.errors.join('\n  ')}`)
    await page.close()
    for (const viewport of [DESKTOP, PHONE]) {
      for (const [name, query] of VISITS) {
        if (wanted(3)) await caseFailed(port, name, query, viewport)
        if (wanted(4)) await caseControl(port, name, query, viewport)
      }
    }
    if (wanted(5)) await caseOneDecode(port)
    if (wanted(6)) await casePaintingFails(port)
    if (wanted(7)) await caseNoLightSky(port)
    if (wanted(8)) await caseSwitchBuilds(port)
    if (wanted(9)) await caseReducedBuilds(port)
    if (wanted(10)) await caseWorkerFails(port)
    await caseStreetFailures(port)
    if (wanted(17)) await caseStreetControl(port)
  } finally {
    chrome.cleanup()
  }
  await sleep(500)
  const chromesAfter = countHeadlessChromes()
  if (chromesAfter > chromesBefore) throw new Error(`headless Chromes left open: ${chromesBefore} before, ${chromesAfter} after`)
  console.log(only.length ? `PASS: cases ${only.join(', ')} only` : 'ALL PASS')
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
})
