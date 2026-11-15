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
 *    again, has built (the iPhone fix, 2026-10-28). The street's seams `__streetReady` and `__streetCounts`, set in the
 *    street, read as reset on the diorama (B7, H6). 3b: Escape while the entry's fade runs still
 *    fades the return from full, never down then up (Codex branch review F1).
 * 4. The dock's control does the same both ways.
 * 5. `?streetFail=painting` ends on the diorama at the saved pose, the portal still on. A failed chunk ends there too,
 *    with the portal off for the page's life (F7).
 * 6. Reduced motion: no flight, no pose between the two, the layer cut at `ready` with no fade. 6b: reduced motion
 *    turned on mid-flight ends the flight at once with no drift, and it pauses a held frame's drift (Codex F3).
 * 7. A tap on a house enters and adds no sky surge (a tap on the sky does: the control). A tap on a tree adds a land
 *    touch and does not enter. A drag over a house does not enter, nor one that goes out and comes back (Codex F2).
 *    A10, the one tap rule (tasks/2026-11-15-a10-tap-rule.md), each part on its own page after case 7. 7b: a mouse out
 *    and back on the sky adds no kick. 7c: one folded into one move over a house does not enter. 7d: after a mouse's
 *    lost release a tap on a house enters. 7e: after a lost release on a tree a tap on the sky kicks, its hold
 *    released. 7f: 7c's folded move on the sky adds no kick.
 *    12b: on a phone a two-finger tap kicks nothing and asks nothing. 12c: after a finger's lost release and a tab
 *    switch a tap on a house asks. 12d: after a finger's lost release on the sky a tap kicks. A part whose gesture spans
 *    more than the tap's 300 ms by the events' own times fails as invalid. `CASES=7b,12c` runs only the parts named.
 * 8. Escape, the dock and the seam during the flight change nothing.
 * 9. The street through the portal at stop 0 against `?street=1` at stop 0, clocks pinned: byte-identical.
 * 10. A rotation in the street: enter, resize to the other aspect, leave. The pose, the rotation and the lens are a
 *    fresh load's at the new aspect, the pose within 1e-6 (A11, 2026-11-15).
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
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countHeadlessChromes, debugPort, openPage, PORTS, startChrome } from './lib/chrome.mjs'
import { DIORAMA_CAMERAS, portraitFov } from '../src/scene/dioramaContract.ts'
import { vincentPlace } from '../src/scene/streetLayout.ts'
import { initialWander, wanderTo } from '../src/scene/streetWander.ts'
import { TOUCH_SURGE } from '../src/scene/touchSurge.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['check-portal'].app}/`
const origin = new URL(appUrl).origin
const here = dirname(fileURLToPath(import.meta.url))
const DESKTOP = { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
const BASE = '?portal=1&arrival=0&walkMode=input'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function newPage(port) {
  const page = await openPage(port, { domains: ['Page', 'Runtime', 'Network'] })
  page.touch = (type, x, y) =>
    page.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  page.mouse = (type, x, y, extra = {}) =>
    page.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons: type === 'mousePressed' ? 1 : 0,
      clickCount: 1,
      pointerType: 'mouse',
      ...extra,
    })
  page.tap = async (x, y) => {
    await page.mouse('mouseMoved', x, y)
    await page.mouse('mousePressed', x, y)
    await page.mouse('mouseReleased', x, y)
  }
  page.key = (key) => {
    const code = key === 'Escape' ? 27 : 0
    return Promise.all([
      page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code }),
      page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code }),
    ])
  }
  return page
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
  // A19: the hidden layer has let its frame go
  const held = await page.evaluate(`document.querySelector('.portal-layer').width`)
  if (held !== 0) throw new Error(`the hidden layer still holds a frame ${held} px wide (A19)`)
  return rec
}

// ---- A10, the one tap rule (tasks/2026-11-15-a10-tap-rule.md): case 7's and case 12's new parts, each on its own page.
// The next part's load clears a part's lost press: OrbitControls hears a cancel on its own element, where a fake
// pointer's cancel would reach `releasePointerCapture` (the read's finding 6)

/** Arms the record of the events' own times: a capture listener on window, kept for the page's life. */
const SPAN_ARM = `(() => { window.__span = []; if (window.__spanOn) return; window.__spanOn = true; for (const type of ['pointerdown', 'pointerup']) window.addEventListener(type, (e) => window.__span.push({ type, id: e.pointerId, ms: e.timeStamp }), { capture: true, passive: true }) })()`

/**
 * The gesture's span by its events: the first press after the arm, and the last release of its pointer. Today's rule
 * times the gesture too, so a part whose span is over the tap's time proves nothing and fails as invalid (the read's
 * finding 4: other agents' runs on this machine can slow the sends).
 */
async function quick(page, name) {
  const span = await page.evaluate('window.__span')
  const down = span.find((e) => e.type === 'pointerdown')
  const up = down && span.findLast((e) => e.type === 'pointerup' && e.id === down.id)
  if (!up) throw new Error(`${name}: invalid, the page saw no press and release of one pointer (${JSON.stringify(span)})`)
  const ms = up.ms - down.ms
  if (ms > TOUCH_SURGE.tapMs) throw new Error(`${name}: invalid, the gesture spanned ${ms.toFixed(0)} ms by its events, over the tap's ${TOUCH_SURGE.tapMs} ms`)
  return ms
}

/** A press whose release never comes, as a lost release leaves one: a synthetic pointerdown on the scene's canvas. */
const lostPress = (page, x, y, pointerType, pointerId) =>
  page.evaluate(`document.querySelector('canvas').dispatchEvent(new PointerEvent('pointerdown', { pointerId: ${pointerId}, pointerType: '${pointerType}', isPrimary: true, button: 0, buttons: 1, clientX: ${x}, clientY: ${y}, bubbles: true, cancelable: true, composed: true }))`)

/** The mouse's pointerId, read from the next real press (the read's finding 11). */
const MOUSE_ID = `window.__pid = null; window.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId }, { once: true })`

/**
 * A mouse out 60 px and back folded into one move, as a browser may coalesce its samples (Codex r1, the street's
 * recipe): the move's own point is 2 px from the press, its first coalesced sample 60 px. Returns the samples it carried.
 */
const foldedMove = (page, x, y) =>
  page.evaluate(
    `(() => { const o = { pointerId: window.__pid, isPrimary: true, pointerType: 'mouse', buttons: 1, bubbles: true, clientY: ${y} }; const at = (x) => new PointerEvent('pointermove', { ...o, clientX: x }); const e = new PointerEvent('pointermove', { ...o, clientX: ${x + 2}, coalescedEvents: [at(${x + 60}), at(${x + 2})] }); document.querySelector('canvas').dispatchEvent(e); return e.getCoalescedEvents().length })()`,
  )

/** The tab switch's stand-in: `document.hidden` true, then false, each with its `visibilitychange`, then the page's own again. */
const TAB_SWITCH = `(() => {
  const set = (hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  set(true)
  set(false)
  delete document.hidden
  delete document.visibilityState
  return document.hidden
})()`

/** A sky point on a phone: on the canvas, in the top of the view, and neither village nor land. */
const SKY_SPOT = `(() => { const c = document.querySelector('canvas'); for (let y = innerHeight * 0.12; y < innerHeight * 0.4; y += 12) for (let x = innerWidth * 0.3; x < innerWidth * 0.9; x += 12) if (document.elementFromPoint(x, y) === c && window.__portalPick(x, y) === null) return [Math.round(x), Math.round(y)]; return null })()`

const kicksOf = (page) => page.evaluate('window.__touchState().kicks.length')
const card = (page) => page.evaluate(`document.querySelector('.visitor-ask')?.textContent ?? ''`)
const stay = (page) => page.evaluate(`document.querySelector('button[aria-label="Stay with the painting"]').click()`)
const fingerTap = async (page, x, y) => {
  await page.touch('touchStart', x, y)
  await sleep(50)
  await page.touch('touchEnd')
}
/** Two fingers down and up within 100 ms: the second lands 20 px from the first, and one touchEnd lifts both. */
const twoFingerTap = async (page, x, y) => {
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }, { x: x + 20, y, id: 1 }] })
  await sleep(40)
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** A phone's page, opened after the touch emulation is on, since the page reads `phone` once at its mount (the read's finding 2). */
async function openPhone(page, name, maxTouchPoints) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints })
  await open(page, BASE, PHONE)
  if (!(await page.evaluate(`window.matchMedia('(hover: none) and (pointer: coarse)').matches`))) throw new Error(`${name}: invalid, the touch emulation does not read as a phone`)
}

const SKY7 = [DESKTOP.width * 0.75, DESKTOP.height * 0.15]

const A10 = {
  // 7b. a mouse out 24 px and back on the sky, within the tap's time, is a drag: no kick. A plain tap then adds one, so
  // the list was not full (the read's finding 8)
  '7b': async (page) => {
    await open(page, BASE)
    const [x, y] = SKY7
    const k0 = await kicksOf(page)
    await page.evaluate(SPAN_ARM)
    await page.mouse('mouseMoved', x, y)
    await page.mouse('mousePressed', x, y)
    await page.mouse('mouseMoved', x + 24, y, { buttons: 1 })
    await page.mouse('mouseMoved', x, y, { buttons: 1 })
    await page.mouse('mouseReleased', x, y)
    await sleep(200)
    const ms = await quick(page, 'case 7b')
    const k1 = await kicksOf(page)
    if (k1 !== k0) throw new Error(`case 7b: a mouse out 24 px and back on the sky in ${ms.toFixed(0)} ms took the kicks from ${k0} to ${k1}`)
    // the drag orbited the camera: the tap waits for the damping to settle
    await sleep(1500)
    await page.tap(x, y)
    await sleep(200)
    const k2 = await kicksOf(page)
    if (k2 !== k1 + 1) throw new Error(`case 7b: the follow-up failed, a plain tap on the sky took the kicks from ${k1} to ${k2}`)
    console.log(`PASS 7b: a mouse out 24 px and back on the sky (${ms.toFixed(0)} ms) adds no kick, and a plain tap then adds one`)
  },
  // 7c. a mouse out 60 px and back over a house folded into one move does not enter (Codex r1, the street's recipe). A
  // plain tap on a house then enters, so the portal was not off
  '7c': async (page) => {
    await open(page, BASE)
    const [x, y] = await page.evaluate(`window.__findPick('village', 16)`)
    await page.evaluate(SPAN_ARM)
    await page.evaluate(MOUSE_ID)
    await page.mouse('mouseMoved', x, y)
    await page.mouse('mousePressed', x, y)
    const folded = await foldedMove(page, x, y)
    await page.mouse('mouseReleased', x + 2, y)
    await sleep(300)
    const ms = await quick(page, 'case 7c')
    if (folded !== 2) throw new Error(`case 7c: invalid, the folded move carried ${folded} coalesced samples, not 2`)
    const place = await placeOf(page)
    if (place !== 'diorama') throw new Error(`case 7c: a mouse out 60 px and back over a house, folded into one move (${ms.toFixed(0)} ms), took the place to ${place}`)
    await sleep(1500)
    const [hx, hy] = await page.evaluate(`window.__findPick('village', 16)`)
    await page.tap(hx, hy)
    await sleep(300)
    if ((await placeOf(page)) === 'diorama') throw new Error('case 7c: the follow-up failed, a plain tap on a house did not enter')
    console.log(`PASS 7c: a mouse out 60 px and back over a house folded into one move (${ms.toFixed(0)} ms) does not enter, and a plain tap then does`)
  },
  // 7f. the same folded move on the sky adds no kick: the sky's latch reads every coalesced sample (7b's separate moves
  // would pass with the move's own point alone). A plain tap then adds one
  '7f': async (page) => {
    await open(page, BASE)
    const [x, y] = SKY7
    const k0 = await kicksOf(page)
    await page.evaluate(SPAN_ARM)
    await page.evaluate(MOUSE_ID)
    await page.mouse('mouseMoved', x, y)
    await page.mouse('mousePressed', x, y)
    const folded = await foldedMove(page, x, y)
    await page.mouse('mouseReleased', x + 2, y)
    await sleep(200)
    const ms = await quick(page, 'case 7f')
    if (folded !== 2) throw new Error(`case 7f: invalid, the folded move carried ${folded} coalesced samples, not 2`)
    const k1 = await kicksOf(page)
    if (k1 !== k0) throw new Error(`case 7f: a mouse out 60 px and back on the sky, folded into one move (${ms.toFixed(0)} ms), took the kicks from ${k0} to ${k1}`)
    await sleep(1500)
    await page.tap(x, y)
    await sleep(200)
    const k2 = await kicksOf(page)
    if (k2 !== k1 + 1) throw new Error(`case 7f: the follow-up failed, a plain tap on the sky took the kicks from ${k1} to ${k2}`)
    console.log(`PASS 7f: a mouse out 60 px and back on the sky folded into one move (${ms.toFixed(0)} ms) adds no kick, and a plain tap then adds one`)
  },
  // 7d. a mouse's lost release on a house, 400 ms, then a tap at the same point enters with no kick. The lost press is
  // made at the tap's own point, so the tap's first move is 0 px and OrbitControls, holding the lost press, turns nothing
  '7d': async (page) => {
    await open(page, BASE)
    const [x, y] = await page.evaluate(`window.__findPick('village', 16)`)
    await page.evaluate(MOUSE_ID)
    // the control, and the press that reads the mouse's pointerId: a tap on the sky adds one kick
    const k0 = await kicksOf(page)
    await page.tap(...SKY7)
    await sleep(200)
    const k1 = await kicksOf(page)
    const pid = await page.evaluate('window.__pid')
    if (k1 !== k0 + 1 || pid === null) throw new Error(`case 7d: the control failed, a tap on the sky took the kicks from ${k0} to ${k1} (pointerId ${pid})`)
    await lostPress(page, x, y, 'mouse', pid)
    await sleep(400)
    if ((await page.evaluate(`window.__portalPick(${x}, ${y})`)) !== 'village') throw new Error('case 7d: invalid, the lost press moved the camera off the house')
    await page.evaluate(SPAN_ARM)
    // the entry unmounts the touch hook and deletes its seam, so keep the getter to read the kicks after (as case 7 does)
    await page.evaluate('window.__touchGet = window.__touchState')
    await page.tap(x, y)
    await sleep(300)
    const ms = await quick(page, 'case 7d')
    const place = await placeOf(page)
    const k2 = await page.evaluate('window.__touchGet().kicks.length')
    if (place === 'diorama') throw new Error(`case 7d: after a mouse's lost release a tap on a house (${ms.toFixed(0)} ms) did not enter`)
    if (k2 !== k1) throw new Error(`case 7d: the tap that entered took the kicks from ${k1} to ${k2}`)
    await page.waitFor(`window.__portal().place === 'street' && window.__portal().layer === 0`, 20000, 'the street after the tap')
    console.log(`PASS 7d: after a mouse's lost release a tap on a house (${ms.toFixed(0)} ms) enters with no kick`)
  },
  // 7e. a mouse's lost release on a tree holds it; the next press, on the sky, releases that hold first, so its tap kicks
  // (the read's finding 7). The press and the release are synthetic with no move between: a real move off the tree
  // would release the hold by itself (`useTouchInput.ts`, the move)
  '7e': async (page) => {
    await open(page, BASE)
    await page.evaluate(MOUSE_ID)
    const k0 = await kicksOf(page)
    await page.tap(...SKY7)
    await sleep(200)
    const pid = await page.evaluate('window.__pid')
    if ((await kicksOf(page)) !== k0 + 1 || pid === null) throw new Error(`case 7e: the control failed, a tap on the sky added no kick (pointerId ${pid})`)
    const [tx, ty] = await page.evaluate(`window.__findPick('land', 16)`)
    await lostPress(page, tx, ty, 'mouse', pid)
    await sleep(100)
    if (!((await page.evaluate('window.__landState().heldIndex')) >= 0)) throw new Error('case 7e: invalid, the lost press on a tree holds no land touch')
    const k1 = await kicksOf(page)
    await page.evaluate(SPAN_ARM)
    const [x, y] = SKY7
    await page.evaluate(
      `(() => { const o = { pointerId: ${pid}, pointerType: 'mouse', isPrimary: true, button: 0, clientX: ${x}, clientY: ${y}, bubbles: true, cancelable: true, composed: true }; const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent('pointerdown', { ...o, buttons: 1 })); c.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })) })()`,
    )
    await sleep(200)
    const ms = await quick(page, 'case 7e')
    const k2 = await kicksOf(page)
    const held = await page.evaluate('window.__landState().heldIndex')
    if (k2 !== k1 + 1) throw new Error(`case 7e: after a lost release on a tree a tap on the sky (${ms.toFixed(0)} ms) took the kicks from ${k1} to ${k2}`)
    if (held >= 0) throw new Error(`case 7e: the tree's hold from the lost press is still held (${held})`)
    console.log(`PASS 7e: after a mouse's lost release on a tree, a tap on the sky (${ms.toFixed(0)} ms) releases the hold and adds one kick`)
  },
  // 12b. on a phone, a two-finger tap is a drag: no kick on the sky, and on a house no question and no entry. A plain tap
  // follows each part as its control: on the sky it adds a kick, on a house it asks (the read's findings 3 and 8)
  '12b': async (page) => {
    await openPhone(page, 'case 12b', 2)
    const sky = await page.evaluate(SKY_SPOT)
    if (!sky) throw new Error('case 12b: no sky point on the phone')
    const k0 = await kicksOf(page)
    await page.evaluate(SPAN_ARM)
    await twoFingerTap(page, ...sky)
    await sleep(300)
    const msSky = await quick(page, 'case 12b, the sky')
    const k1 = await kicksOf(page)
    if (k1 !== k0) throw new Error(`case 12b: a two-finger tap on the sky (${msSky.toFixed(0)} ms) took the kicks from ${k0} to ${k1}`)
    await sleep(800)
    await fingerTap(page, ...sky)
    await sleep(300)
    const k2 = await kicksOf(page)
    if (k2 !== k1 + 1) throw new Error(`case 12b: the follow-up failed, a finger's tap on the sky took the kicks from ${k1} to ${k2}`)
    const house = await page.evaluate(`window.__findPick('village', 8)`)
    await fingerTap(page, ...house)
    await sleep(500)
    const asked = await card(page)
    if (!asked.includes('computer') || (await placeOf(page)) !== 'diorama') throw new Error(`case 12b: the control failed, a finger's tap on a house showed "${asked}" with the place ${await placeOf(page)}`)
    await stay(page)
    await sleep(400)
    if (await card(page)) throw new Error('case 12b: "Stay with the painting" did not close the card')
    await page.evaluate(SPAN_ARM)
    await twoFingerTap(page, ...house)
    await sleep(500)
    const msHouse = await quick(page, 'case 12b, the house')
    const shown = await card(page)
    const place = await placeOf(page)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    if (shown || place !== 'diorama') throw new Error(`case 12b: a two-finger tap on a house (${msHouse.toFixed(0)} ms) showed "${shown}" with the place ${place}`)
    console.log(`PASS 12b: on a phone a two-finger tap adds no kick on the sky (${msSky.toFixed(0)} ms) and asks nothing on a house (${msHouse.toFixed(0)} ms); a plain tap kicks and asks`)
  },
  // 12c. on a phone, a finger's lost release on a house, the tab switch's stand-in, then a finger's tap there asks. The
  // stand-in does not show what a real browser does with the release
  '12c': async (page) => {
    await openPhone(page, 'case 12c', 1)
    const [x, y] = await page.evaluate(`window.__findPick('village', 8)`)
    await lostPress(page, x, y, 'touch', 50)
    if ((await page.evaluate(TAB_SWITCH)) !== false) throw new Error('case 12c: invalid, the stand-in left the page hidden')
    await sleep(200)
    await page.evaluate(SPAN_ARM)
    await fingerTap(page, x, y)
    await sleep(500)
    const ms = await quick(page, 'case 12c')
    const asked = await card(page)
    const place = await placeOf(page)
    if (asked) await stay(page)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    if (!asked.includes('computer') || place !== 'diorama') throw new Error(`case 12c: after a finger's lost release and a tab switch, a tap on a house (${ms.toFixed(0)} ms) showed "${asked}" with the place ${place}`)
    console.log(`PASS 12c: after a finger's lost release and a tab switch, a finger's tap on a house (${ms.toFixed(0)} ms) asks`)
  },
  // 12d. on a phone, a finger's lost release on the sky, with no stand-in, then a finger's tap there adds one kick
  '12d': async (page) => {
    await openPhone(page, 'case 12d', 1)
    const sky = await page.evaluate(SKY_SPOT)
    if (!sky) throw new Error('case 12d: no sky point on the phone')
    const k0 = await kicksOf(page)
    await fingerTap(page, ...sky)
    await sleep(300)
    const k1 = await kicksOf(page)
    if (k1 !== k0 + 1) throw new Error(`case 12d: the control failed, a finger's tap on the sky took the kicks from ${k0} to ${k1}`)
    await lostPress(page, sky[0], sky[1], 'touch', 50)
    await sleep(200)
    await page.evaluate(SPAN_ARM)
    await fingerTap(page, ...sky)
    await sleep(300)
    const ms = await quick(page, 'case 12d')
    const k2 = await kicksOf(page)
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    if (k2 !== k1 + 1) throw new Error(`case 12d: after a finger's lost release on the sky a finger's tap (${ms.toFixed(0)} ms) took the kicks from ${k1} to ${k2}`)
    console.log(`PASS 12d: after a finger's lost release on the sky a finger's tap (${ms.toFixed(0)} ms) adds one kick`)
  },
}

/** `CASES=7b,12c` runs those parts of A10 alone, so each can be seen to fail on a build without its fix. */
const only = (process.env.CASES ?? '').split(',').filter(Boolean)

async function main() {
  const chromesBefore = countHeadlessChromes()
  const port = debugPort('check-portal')
  const chrome = await startChrome({ port, prefix: 'starry-portal-' })
  try {
    const page = await newPage(port)
    try {

    if (only.length) {
      for (const name of only) {
        if (!A10[name]) throw new Error(`no part ${name}: CASES takes ${Object.keys(A10).join(', ')}`)
        await A10[name](page)
      }
      if (page.errors.length) throw new Error(`page errors:\n  ${page.errors.join('\n  ')}`)
      console.log(`PASS (CASES=${only.join(',')} only)`)
      return
    }

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
    // B7 (audit item 25, H6): the street's ready seams are set in the street and reset when it unmounts
    const seams3 = `({ ready: window.__streetReady, counts: window.__streetCounts ?? null })`
    const inStreet3 = await page.evaluate(seams3)
    if (inStreet3.ready !== true || !(inStreet3.counts?.triangles > 0)) throw new Error(`case 3: in the street the seams are not set: ${JSON.stringify(inStreet3)}`)
    const rec3 = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    const r3 = assertReturn(rec3, 'case 3', view2)
    for (let start = Date.now(); ; await sleep(100)) {
      const back3 = await page.evaluate(seams3)
      if (back3.ready !== true && back3.counts === null) break
      if (Date.now() - start > 2000) throw new Error(`case 3: back on the diorama the street's seams are not reset after 2000 ms: ${JSON.stringify(back3)}`)
    }
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

    // ---- A10's parts of cases 7 and 12, each on its own page
    for (const run of Object.values(A10)) await run(page)

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

    // ---- case 10: a rotation in the street. The way back reads as a fresh load at the new aspect, as a rotation in the
    // diorama does (A11, 2026-11-15): the rotation moves the saved pose to the new aspect's home
    const portrait10 = { ...DESKTOP, width: 900, height: 1600 }
    await open(page, BASE, portrait10)
    const fresh10 = await page.evaluate('window.__portal()')
    await open(page, BASE)
    await enterAndSettle(page, () => page.evaluate('window.__portalEnter()'))
    await page.send('Emulation.setDeviceMetricsOverride', portrait10)
    await sleep(800)
    const rec10 = await record(page, () => page.key('Escape'), `window.__portal().place === 'diorama'`)
    // a portrait aspect takes the portrait lens, fitted to that aspect (portraitFov, 2026-10-25)
    const r10 = assertReturn(rec10, 'case 10', fresh10.view, { ...DIORAMA_CAMERAS.mobile, fov: portraitFov(900 / 1600) })
    const home10 = poseGap(rec10.at(-1).pose, fresh10.pose)
    if (home10 > 1e-6) throw new Error(`case 10: the way back after a rotation is ${home10} from a fresh portrait load's pose`)
    console.log(`PASS 10: after a rotation in the street the return is a fresh load's pose (${r10.now}, ${r10.after}, ${home10}), its rotation and the portrait lens`)

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
    } finally {
      await page.close()
    }
  } finally {
    await chrome.close()
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
