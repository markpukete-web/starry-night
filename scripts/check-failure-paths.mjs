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
 *    citation is; no button is left; the ready seams are true; the console holds the page's own message; every page
 *    error is R3F's report of the blocked load. A screenshot of each failed state is saved for the Lead.
 * 4. The control: nothing blocked, the same visits and sizes, and no fallback, no failed class and no page error.
 * 5. The diorama decodes `painting.jpg` once (slice B1, item 13). 6. With `painting.jpg` blocked the opening does not
 *    wait 15 s for the cypress (slice B1, item 7), against the same visit unblocked.
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
import { ARRIVAL_CUE, VINCENTS_CITE } from '../src/scene/arrival.ts'
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
/** `REDUCED=1` runs every case under `prefers-reduced-motion: reduce`: the failed page must show there too. */
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

async function open(page, query, viewport) {
  await page.send('Emulation.setDeviceMetricsOverride', viewport)
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: REDUCED ? 'reduce' : 'no-preference' }] })
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
      return {
        root: document.getElementById('root').childElementCount,
        paintings: paintings.map((img) => ({ width: img.naturalWidth, alt: img.alt })),
        bootAtLoad: window.__bootAtLoad,
        boot: Boolean(document.getElementById('boot')),
        cues: withText(${JSON.stringify(ARRIVAL_CUE)}).length,
        cites: withText(${JSON.stringify(VINCENTS_CITE)}).length,
        buttons: document.querySelectorAll('button').length,
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
    if (state.buttons !== 0) fail(`${state.buttons} buttons are left on a dead scene`)
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
    console.log(`PASS 3 (${name}, ${size}): the painting, its alt and the citation, no curtain, cue, button or canvas, seams true; ${page.errors.length} reported load error; ${file}`)
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
    const state = await page.evaluate(`({ fallback: Boolean(document.querySelector('.page-failed')), failedClass: document.documentElement.classList.contains('arrival-failed'), canvases: document.querySelectorAll('canvas').length })`)
    if (state.fallback || state.failedClass || state.canvases < 1 || page.errors.length || page.consoleErrors.some((text) => text.includes(OWN_MESSAGE)))
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
