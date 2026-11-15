#!/usr/bin/env node
/**
 * Task 4, Step 5: Walk checks for street mode.
 * Asserts the five cases from tasks/2026-10-24-street-s2-plan.md:
 * 0. The masses (audit item 15): the default street fetches no land-masses.json and draws, `?flat=1` fetches it and draws.
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
 *    dwell (decision (p)); at stop 4, a tap where he stood, off the lane's strip (Fable F1).
 * 9. The walk's end (tasks/2026-11-14-walk-end-plan.md): on the phone at stop 4, a finger on him turns him, and the
 *    automatic walk takes him back down the lane, facing it and striding.
 * 10. The wheel under reduced motion, off the lane (the audit's item 10): one wheel turn puts him home within two frames.
 * 11. The one tap rule (A10, tasks/2026-11-15-a10-tap-rule.md), each part on its own page. 11a: a mouse out 60 px and
 *     back on him, apart and folded into one move, does not toggle the walk. 11b: after a finger's lost release, a tap
 *     on him toggles it. 11c: a tap during a long frame toggles it. 11d: after a mouse's lost release on him, a press on
 *     the dock clears the gesture, so the hand moved onto the grass still touches it. A part whose gesture spans more
 *     than the tap's 300 ms by the events' own times fails as invalid.
 * Cases 8 and 10 read street points as world points: true under the default anchor B only (anchor A moves the street to
 * `STREET.originA`). Do not run them with `?skyAnchor=A` (Fable F3).
 * `CASES=9,10` runs only the cases named. Cases 9 and 10 set their own viewport and media, so each runs alone. An
 * earlier case may lean on the viewport the case before it set.
 */
import { countHeadlessChromes, debugPort, openPage, PORTS, startChrome } from './lib/chrome.mjs'
import { PerspectiveCamera, Vector3 } from 'three'
import { STATION_T, STREET_HOUSES, laneParam, vincentPlace, walkPose } from '../src/scene/streetLayout.ts'
import { inFootprint } from '../src/scene/streetGrass.ts'
import { PAUSE, WALK } from '../src/scene/streetWalk.ts'
import { WANDER, followT, hidden, inFrame, initialWander, legSeen, standable, tripFrom, wanderTo } from '../src/scene/streetWander.ts'
import { TOUCH_SURGE } from '../src/scene/touchSurge.ts'

const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['check-street-walk'].app}/`
const parsedUrl = new URL(appUrl)
const origin = parsedUrl.origin
const L = 2.3962

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function evaluate(page, fnOrExpr) {
  const expression = typeof fnOrExpr === 'function' ? `(${fnOrExpr.toString()})()` : fnOrExpr
  return page.evaluate(expression, { awaitPromise: false })
}

function waitForStreetReady(page, timeoutMs = 25000) {
  return page.waitFor('window.__streetReady', timeoutMs, '__streetReady', 150)
}

/**
 * `CASES=9,10` runs those cases alone, so each can be seen to fail on a build without its fix. Absent, every case runs.
 * A part has a letter: `CASES=11b` runs that part alone, and `CASES=11` runs every part of case 11.
 */
const only = (process.env.CASES ?? '').split(',').filter(Boolean)
const wanted = (name) => only.length === 0 || only.includes(String(name)) || only.includes(String(name).replace(/[a-z]+$/, ''))

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

async function main() {
  const chromesBefore = countHeadlessChromes()
  const port = debugPort('check-street-walk')
  const chrome = await startChrome({ port, prefix: 'starry-walk-' })

  try {
    const page = await openPage(port)
    try {

    if (wanted(0)) {
      // -------------------------------------------------------------
      // Case 0: the masses (audit item 15, slice B2). ?street=1&flat=1 still fetches land-masses.json and still draws,
      // the control that the fetch log records; then ?street=1&station=0&arrival=0 fetches no land-masses.json and still
      // draws. "Draws" is __streetCounts with triangles and ribbons above 0: the page sets it only when the build returned
      // a street, and a null build deletes it while __streetReady still goes true. The page's fetch calls are recorded,
      // not the network: index.html preloads the file for every visitor, so a request shows whatever the street does.
      // -------------------------------------------------------------
      await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
      const { identifier: fetchLog } = await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: 'window.__fetched = []; { const f = window.fetch; window.fetch = function (input, init) { window.__fetched.push(String(input instanceof Request ? input.url : input)); return f.call(this, input, init) } }',
      })
      for (const [query, fetches] of [['?street=1&flat=1&arrival=0', true], ['?street=1&station=0&arrival=0', false]]) {
        await page.send('Page.navigate', { url: `${origin}/${query}` })
        await waitForStreetReady(page)
        const c0 = await evaluate(page, () => ({ fetched: window.__fetched, counts: window.__streetCounts }))
        if (!Array.isArray(c0.fetched)) throw new Error(`Case 0 precondition failed: no fetch log on ${query}`)
        const masses = c0.fetched.filter((u) => u.includes('land-masses.json')).length
        if (fetches !== masses > 0) {
          throw new Error(`Case 0 failed: ${query} fetched land-masses.json ${masses} times, expected ${fetches ? 'at least once' : 'never'} (fetches: ${c0.fetched.join(', ') || 'none'})`)
        }
        if (!(c0.counts?.triangles > 0 && c0.counts?.ribbons > 0)) throw new Error(`Case 0 failed: ${query} drew no street (__streetCounts ${JSON.stringify(c0.counts)})`)
        console.log(`PASS: ${query} fetched land-masses.json ${masses} times and drew ${c0.counts.triangles} triangles, ${c0.counts.ribbons} ribbons`)
      }
      await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: fetchLog })
    }

    if (wanted(1)) {
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
      await waitForStreetReady(page)

      const c1Init = await evaluate(page, () => ({
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
        await evaluate(page, () => {
          const canvas = document.querySelector('canvas')
          canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, deltaMode: 0, bubbles: true, cancelable: true }))
        })
        await sleep(30)
      }
      await sleep(1000)

      const c1After = await evaluate(page, () => ({
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
    }

    if (wanted(2)) {
      // -------------------------------------------------------------
      // Case 2: Keys
      // ArrowUp held 1 s: Δt = 0.15 / L ± 25%. Then three wheel events of 300 px and ArrowUp down together
      // (precondition: target − t > 0.01 / L), a blur event, 0.5 s: t changes by < 0.002 / L after the blur.
      // -------------------------------------------------------------
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
      await waitForStreetReady(page)

      const c2T0 = await evaluate(page, () => window.__streetWalk?.t)
      if (typeof c2T0 !== 'number') throw new Error('Case 2 precondition failed: __streetWalk missing')

      await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
      await sleep(1000)
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })

      const c2T1 = await evaluate(page, () => window.__streetWalk?.t)
      const c2DeltaT = c2T1 - c2T0
      const c2Expected = 0.15 / L
      if (c2DeltaT < c2Expected * 0.75 || c2DeltaT > c2Expected * 1.25) {
        throw new Error(`Case 2 failed: ArrowUp deltaT was ${c2DeltaT.toFixed(4)}, expected within 25% of ${c2Expected.toFixed(4)}`)
      }

      // Now hold ArrowUp and fire three wheel events of 300 px
      await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
      for (let i = 0; i < 3; i++) {
        await evaluate(page, () => {
          const canvas = document.querySelector('canvas')
          canvas?.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, deltaMode: 0, bubbles: true, cancelable: true }))
        })
        await sleep(20)
      }

      const c2Pre = await evaluate(page, () => ({
        t: window.__streetWalk?.t,
        target: window.__streetWalk?.target,
      }))
      const c2Lead = c2Pre.target - c2Pre.t
      if (c2Lead <= 0.01 / L) {
        throw new Error(`Case 2 precondition failed: target - t is ${c2Lead.toFixed(4)}, expected > ${ (0.01 / L).toFixed(4) }`)
      }

      await evaluate(page, () => window.dispatchEvent(new Event('blur')))
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
      const c2TAfterBlur = await evaluate(page, () => window.__streetWalk?.t)
      await sleep(500)
      const c2TEnd = await evaluate(page, () => window.__streetWalk?.t)
      const c2ChangeAfterBlur = Math.abs(c2TEnd - c2TAfterBlur)
      if (c2ChangeAfterBlur >= 0.002 / L) {
        throw new Error(`Case 2 failed: t changed by ${c2ChangeAfterBlur.toFixed(5)} after blur, expected < ${ (0.002 / L).toFixed(5) }`)
      }
      console.log(`PASS: keys walk at speed (deltaT=${c2DeltaT.toFixed(4)} in range) and blur stops queued motion (drift=${c2ChangeAfterBlur.toFixed(5)})`)
    }

    if (wanted(3)) {
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
      await waitForStreetReady(page)

      const c3Init = await evaluate(page, () => ({
        t: window.__streetWalk?.t,
        auto: window.__streetWalk?.auto,
      }))
      if (c3Init.auto !== true) {
        throw new Error(`Case 3 precondition failed: auto is ${c3Init.auto}, expected true`)
      }

      await sleep(2000)
      const c3T1 = await evaluate(page, () => window.__streetWalk?.t)
      if (c3T1 <= c3Init.t + 0.02 / L) {
        throw new Error(`Case 3 precondition failed: t did not rise over 2 s (init=${c3Init.t}, after=${c3T1})`)
      }

      const box = await evaluate(page, () => window.__vincentBox?.())
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

      const c3Auto1 = await evaluate(page, () => window.__streetWalk?.auto)
      if (c3Auto1 !== false) {
        throw new Error(`Case 3 failed: tap on Vincent expected auto false, got ${c3Auto1}`)
      }

      const c3TStop1 = await evaluate(page, () => window.__streetWalk?.t)
      await sleep(1000)
      const c3TStop2 = await evaluate(page, () => window.__streetWalk?.t)
      if (c3TStop2 !== c3TStop1) {
        throw new Error(`Case 3 failed: t changed while stopped (drift: ${c3TStop2 - c3TStop1})`)
      }

      // Second tap on Vincent: auto true
      const box2 = await evaluate(page, () => window.__vincentBox?.())
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

      const c3Auto2 = await evaluate(page, () => window.__streetWalk?.auto)
      if (c3Auto2 !== true) {
        throw new Error(`Case 3 failed: second tap on Vincent expected auto true, got ${c3Auto2}`)
      }

      // Tap on Pause motion button
      const pausePos = await evaluate(page, () => {
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

      const c3TPause0 = await evaluate(page, () => window.__streetWalk?.t)
      const c3AutoPause0 = await evaluate(page, () => window.__streetWalk?.auto)
      if (!c3AutoPause0) throw new Error('Case 3 failed: auto should still be true after pause button tap')

      await sleep(1000)
      const c3TPause1 = await evaluate(page, () => window.__streetWalk?.t)
      const c3AutoPause1 = await evaluate(page, () => window.__streetWalk?.auto)
      if (c3TPause1 !== c3TPause0) {
        throw new Error(`Case 3 failed: t moved while paused (drift: ${c3TPause1 - c3TPause0})`)
      }
      if (!c3AutoPause1) throw new Error('Case 3 failed: auto should remain true while paused')

      // Resume motion by tapping Play motion
      const playPos = await evaluate(page, () => {
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
        const box = await evaluate(page, () => window.__vincentBox?.())
        if (!box) throw new Error(`Case 3 precondition failed: __vincentBox missing before ${name}`)
        const x = Math.round((box.x0 + box.x1) / 2)
        const y = Math.round((box.y0 + box.y1) / 2)

        const autoBefore = await evaluate(page, () => window.__streetWalk?.auto)
        await tapAt(x, y)
        const autoToggled = await evaluate(page, () => window.__streetWalk?.auto)
        if (autoToggled === autoBefore) {
          throw new Error(`Case 3 failed: positive control before ${name} did not toggle auto`)
        }

        await tapAt(x, y)
        const autoRestored = await evaluate(page, () => window.__streetWalk?.auto)
        if (autoRestored !== autoBefore) {
          throw new Error(`Case 3 failed: positive control before ${name} did not restore auto`)
        }

        return { x, y }
      }

      // Positive control before second touch
      const pt2 = await positiveControl('second touch')

      // Second touch while first touch is held
      const autoBefore2nd = await evaluate(page, () => window.__streetWalk?.auto)
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
      const autoAfter2nd = await evaluate(page, () => window.__streetWalk?.auto)
      if (autoAfter2nd !== autoBefore2nd) {
        throw new Error(`Case 3 failed: second touch changed auto (before=${autoBefore2nd}, after=${autoAfter2nd})`)
      }
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
      const autoAfter1stEnd = await evaluate(page, () => window.__streetWalk?.auto)
      if (autoAfter1stEnd !== autoBefore2nd) {
        throw new Error(`Case 3 failed: first touch ending after second touch changed auto (before=${autoBefore2nd}, after=${autoAfter1stEnd})`)
      }

      // Positive control before touchCancel
      const ptCancel = await positiveControl('touchCancel')

      // Touch ended by touchCancel: auto unchanged
      const autoBeforeCancel = await evaluate(page, () => window.__streetWalk?.auto)
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: ptCancel.x, y: ptCancel.y, id: 0 }],
      })
      await sleep(50)
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchCancel',
        touchPoints: [],
      })
      const autoAfterCancel = await evaluate(page, () => window.__streetWalk?.auto)
      if (autoAfterCancel !== autoBeforeCancel) {
        throw new Error('Case 3 failed: touchCancel changed auto')
      }

      // Positive control before drag
      const ptDrag = await positiveControl('drag')

      // Touch that moves 20 px: auto unchanged
      const autoBeforeMove = await evaluate(page, () => window.__streetWalk?.auto)
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
      const autoAfterMove = await evaluate(page, () => window.__streetWalk?.auto)
      if (autoAfterMove !== autoBeforeMove) {
        throw new Error('Case 3 failed: drag > 20px changed auto')
      }

      console.log('PASS: phone auto-walk, tap toggling, pause holds, multi-touch and drag rejected')
    }

    if (wanted(4)) {
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
      await waitForStreetReady(page)

      const c4T0 = await evaluate(page, () => window.__streetWalk?.t)
      if (c4T0 !== 0) throw new Error(`Case 4 precondition failed: t0 is ${c4T0}, expected 0`)

      await sleep(2000)
      const c4T1 = await evaluate(page, () => window.__streetWalk?.t)
      if (c4T1 !== 0) throw new Error(`Case 4 failed: t changed under reduced motion (drift: ${c4T1})`)

      const box4 = await evaluate(page, () => window.__vincentBox?.())
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

      const c4TapT = await evaluate(page, () => window.__streetWalk?.t)
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
    }

    if (wanted(5)) {
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
      await waitForStreetReady(page)
      await sleep(1000)

      const c5State = await evaluate(page, () => ({
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
    }

    if (wanted(6)) {
      // -------------------------------------------------------------
      // Case 6: Codex's review, K1–K4 (the Lead, 2026-10-24). Each event pair is dispatched in one evaluate, so no
      // frame runs between them, and each check has its positive control first.
      // -------------------------------------------------------------
      const tNow = () => evaluate(page, () => window.__streetWalk?.t)
      const wheelOnCanvas = `document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: 600, deltaMode: 0, bubbles: true, cancelable: true }))`

      // K1, blur: a wheel turned and a blur before the next frame leave him where he stands
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
      await waitForStreetReady(page)
      await sleep(500)
      const k1T0 = await tNow()
      await evaluate(page, wheelOnCanvas)
      await sleep(800)
      // he is still walking at the cap from the first wheel: read t in the same task as the pair, so no frame falls
      // between them (a frame there moved him 0.0035, the flake of 2026-10-26 and 10-29)
      const k1T1 = await evaluate(page, `(() => { const t = window.__streetWalk.t; ${wheelOnCanvas}; window.dispatchEvent(new Event('blur')); return t })()`)
      if (!(k1T1 - k1T0 > 0.01 / L)) throw new Error(`Case 6 precondition failed: a synthetic wheel did not walk (Δt ${k1T1 - k1T0})`)
      await sleep(800)
      const k1Drift = Math.abs((await tNow()) - k1T1)
      if (k1Drift >= 0.002 / L) throw new Error(`Case 6 failed (K1): a wheel before a blur moved him by ${k1Drift.toFixed(5)}`)

      // K1, tap: a wheel turned and a tap that stops the automatic walk, before the next frame, leave him where he stands
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=auto` })
      await waitForStreetReady(page)
      await sleep(800)
      const tapOnVincent = `(() => {
        const b = window.__vincentBox(); const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2
        const c = document.querySelector('canvas'), o = { pointerId: 1, isPrimary: true, clientX: x, clientY: y, bubbles: true }
        c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o))
      })()`
      await evaluate(page, tapOnVincent)
      await sleep(200)
      if ((await evaluate(page, () => window.__streetWalk?.auto)) !== false) throw new Error('Case 6 precondition failed: a synthetic tap on Vincent did not stop the walk')
      await evaluate(page, tapOnVincent)
      await sleep(800)
      if ((await evaluate(page, () => window.__streetWalk?.auto)) !== true) throw new Error('Case 6 precondition failed: a second synthetic tap did not restart the walk')
      await evaluate(page, `${wheelOnCanvas}; ${tapOnVincent}`)
      await sleep(800)
      const k1TapT1 = await tNow()
      await sleep(800)
      const k1TapDrift = Math.abs((await tNow()) - k1TapT1)
      if ((await evaluate(page, () => window.__streetWalk?.auto)) !== false) throw new Error('Case 6 failed (K1): the tap with a queued wheel did not stop the walk')
      if (k1TapDrift >= 0.002 / L) throw new Error(`Case 6 failed (K1): a wheel before a stopping tap moved him by ${k1TapDrift.toFixed(5)} after it`)

      // K2: a key held over the scene and released over an input stops him
      await page.send('Page.navigate', { url: `${origin}/?street=1&station=0&arrival=0&walkMode=input` })
      await waitForStreetReady(page)
      await sleep(500)
      const k2T0 = await tNow()
      await evaluate(page, () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' })))
      await sleep(500)
      const k2T1 = await tNow()
      if (!(k2T1 - k2T0 > 0.01 / L)) throw new Error(`Case 6 precondition failed: a synthetic keydown did not walk (Δt ${k2T1 - k2T0})`)
      await evaluate(page, () => {
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
        await waitForStreetReady(page)
        // V1: his box takes in his figure, which turns side-on after a rest. Read it once he has turned and the lantern
        // has settled (τ 0.15 s), not mid-turn, where two loads differ by the turn's timing
        for (let i = 0; i < 150 && !((await evaluate(page, () => window.__vincentForm?.()))?.turn >= 1); i++) await sleep(100)
        await sleep(1000)
        return evaluate(page, () => ({ pose: window.__vincentPose?.(), box: window.__vincentBox?.() }))
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
      await waitForStreetReady(page)
      await sleep(500)
      const k4Rest = await evaluate(page, () => window.__vincentPose?.())
      if (!k4Rest) throw new Error('Case 6 precondition failed: __vincentPose missing')
      await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
      let k4Roll = 0
      let k4Arm = 0
      for (let i = 0; i < 12; i++) {
        await sleep(100)
        const p = await evaluate(page, () => window.__vincentPose?.())
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
        k4Turn = (await evaluate(page, () => window.__vincentForm?.()))?.turn ?? 0
      }
      if (!(k4Turn >= 1 - 1e-9)) throw new Error(`Case 6 failed (K4): standing, his turn was ${k4Turn} after 15 s, expected 1`)
      const k4End = await evaluate(page, () => window.__vincentPose?.())
      if (Math.abs(k4End.roll) > 1e-6 || Math.abs(k4End.arm + 0.75) > 1e-6 || Math.abs(k4End.armRight) > 1e-6) {
        throw new Error(`Case 6 failed (K4): standing and turned, his roll ${k4End.roll}, left arm ${k4End.arm} and right arm ${k4End.armRight}, expected 0, -0.75 and 0`)
      }
      console.log(`PASS: the review's fixes: a queued wheel dies with a blur and a stopping tap (drift ${k1Drift.toFixed(5)}, ${k1TapDrift.toFixed(5)}), a key released over an input stops him (${k2Drift.toFixed(5)}), anchor A moves him by [${k3D.map((v) => v.toFixed(3))}] and his box by ${k3Box.toFixed(2)} px, his gait shows while he walks (roll ${k4Roll.toFixed(4)}, arm ${k4Arm.toFixed(4)}) and settles to a roll of 0 with the left arm raised at -0.75 and the right at 0`)
    }

    if (wanted(7)) {
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
      await waitForStreetReady(page)
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
      await waitForStreetReady(page)
      const waitFor = async (fn, ms) => {
        const from = Date.now()
        while (Date.now() - from < ms) {
          if (await evaluate(page, fn)) return true
          await sleep(50)
        }
        return false
      }
      if (!(await waitFor(() => window.__vincentForm?.().dwell > 0, 40000))) throw new Error('Case 7 failed: no dwell began within 40 s')
      const c7Tap = async () => {
        const b = await evaluate(page, () => window.__vincentBox?.())
        if (!b) throw new Error('Case 7 precondition failed: __vincentBox missing')
        const x = Math.round((b.x0 + b.x1) / 2)
        const y = Math.round((b.y0 + b.y1) / 2)
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
        await sleep(50)
        await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }
      await c7Tap()
      if (!(await waitFor(() => window.__vincentForm?.().dwell === 0 && window.__vincentForm?.().auto === false, 2000))) {
        throw new Error(`Case 7 failed: after a tap in the dwell, state is ${JSON.stringify(await evaluate(page, () => window.__vincentForm?.()))}, expected dwell 0 and auto false`)
      }
      await c7Tap()
      if (!(await waitFor(() => window.__vincentForm?.().auto === true, 2000))) throw new Error('Case 7 failed: a second tap did not start the walk again')
      if (!(await waitFor(() => window.__vincentForm?.().t > 0.23 + 1e-9, 5000))) throw new Error('Case 7 failed: after the second tap t did not rise above 0.23 within 5 s')
      console.log(`PASS: the dwell lasts ${c7Dwell.toFixed(3)} s on the form's clock, the turn peaks at ${c7Turn}, the lantern is 1 on ${c7Frames.length} frames, a tap in the dwell stops the walk and a second tap restarts it`)
    }

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
          if (await evaluate(page, `Boolean(${expr})`)) return Date.now() - from
          if (Date.now() - from > ms) c8.fail(`${what} not within ${ms} ms (${expr}); state ${JSON.stringify(await evaluate(page, 'window.__wander?.()'))}`)
          await sleep(40)
        }
      },
      open: async (vp, touch, station, mode) => {
        await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
        await page.send('Emulation.setDeviceMetricsOverride', vp)
        await page.send('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
        await page.send('Page.navigate', { url: `${origin}/?street=1&station=${station}&arrival=0&walkMode=${mode}` })
        await waitForStreetReady(page)
        await c8.until('window.__wander && window.__vincentBox && window.__streetCamera', 10000, 'the seams')
      },
      wander: () => evaluate(page, 'window.__wander()'),
      pose: () => evaluate(page, 'window.__vincentPose()'),
      cam: () => evaluate(page, 'window.__streetCamera()'),
      auto: () => evaluate(page, 'window.__streetWalk.auto'),
      t: () => evaluate(page, 'window.__streetWalk.t'),
      // his box as a tap reads it: at least `WALK.hitMin` square about its centre
      box: async () => {
        const b = await evaluate(page, 'window.__vincentBox()')
        const cx = (b.x0 + b.x1) / 2
        const cy = (b.y0 + b.y1) / 2
        const hw = Math.max((b.x1 - b.x0) / 2, WALK.hitMin / 2)
        const hh = Math.max((b.y1 - b.y0) / 2, WALK.hitMin / 2)
        return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh }
      },
      onCanvas: (px, py) => evaluate(page, `document.elementFromPoint(${px}, ${py}) === document.querySelector('canvas')`),
      // a synchronous canvas test for the point choice: the page's chrome (title, dock, placard) as boxes of a 12 px grid
      mask: async (vp) => {
        const blocked = await evaluate(page, `(() => { const out = []; const c = document.querySelector('canvas'); for (let y = 0; y < ${vp.height}; y += 12) for (let x = 0; x < ${vp.width}; x += 12) if (document.elementFromPoint(x + 6, y + 6) !== c) out.push([x, y]); return out })()`)
        const set = new Set(blocked.map(([x, y]) => `${x},${y}`))
        return (px, py) => !set.has(`${Math.floor(px / 12) * 12},${Math.floor(py / 12) * 12}`)
      },
      // the live scene as node sees it: camera, canvas rectangle, his box and the view a tap would use
      scene: async () => {
        const size = await evaluate(page, () => {
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
        evaluate(page, () => {
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
      wheel: () => evaluate(page, `document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: 200, deltaMode: 0, bubbles: true, cancelable: true }))`),
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

    if (wanted(8)) {
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
      await evaluate(page, `window.__pid = null; window.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId }, { once: true })`)
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P.px, y: P.py, button: 'none', buttons: 0 })
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: P.px, y: P.py, button: 'left', buttons: 1, clickCount: 1 })
      const folded = await evaluate(page, `(() => { const o = { pointerId: window.__pid, isPrimary: true, pointerType: 'mouse', buttons: 1, bubbles: true, clientY: ${P.py} }; const at = (x) => new PointerEvent('pointermove', { ...o, clientX: x }); const e = new PointerEvent('pointermove', { ...o, clientX: ${P.px + 2}, coalescedEvents: [at(${P.px + 60}), at(${P.px + 2})] }); window.dispatchEvent(e); return e.getCoalescedEvents().length })()`)
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
      const pushAt = (x, z) => evaluate(page, `window.__grassPushNear(${x}, ${z}, 0.03)`)
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
      const left = await evaluate(page, 'window.__vincentForm().dwell')
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

      // ---- 8f. desktop, stop 4: his slot is on the square, off the lane's strip, and a tap where he stood still brings
      // him home by the leg he walked, never out to his point first (Fable F1)
      await c8.open(DESKTOP, false, 4, 'input')
      const t8f = STATION_T[4]
      const [slotFX, slotFZ] = slotXZ(t8f)
      if (!standable(slotFX, slotFZ)) c8.fail('his slot at stop 4 is on the strip, so the case is gone')
      const scF = await c8.scene()
      const parkF = await c8.pauseAt()
      const PF = acceptedPoints(scF.persp, scF.size, scF.box, scF.view, t8f, await c8.mask(DESKTOP), { min: 0.2 })[0]
      if (!PF) c8.fail('no accepted point 0.2 to 0.3 from his slot at stop 4')
      const tripF = Math.hypot(PF.x - slotFX, PF.z - slotFZ)
      await c8.tap(false, PF.px, PF.py)
      await c8.park(parkF)
      await c8.until('window.__wander().arrived > 0', c8.bound(tripF, 1000), 'him arriving at stop 4')
      const liveF = await c8.scene()
      const [sfx, sfy] = toClient(liveF.persp, liveF.size, [slotFX, 0, slotFZ])
      if (!insideCanvas(liveF.size, sfx, sfy, 24) || insideBox(liveF.box, sfx, sfy) || !(await c8.onCanvas(sfx, sfy))) c8.fail(`his old slot at stop 4 at [${sfx.toFixed(0)}, ${sfy.toFixed(0)}] is not tappable`)
      await c8.tap(false, sfx, sfy)
      await c8.park(parkF)
      await c8.until(`window.__wander().mode === 'returning' && window.__wander().route.length === 1`, 1000, 'a tap where he stood at stop 4 turning him home')
      let farF = tripF
      const fromF = Date.now()
      for (let w = await c8.wander(); w.mode !== 'lane'; w = await c8.wander()) {
        const d = Math.hypot(w.x - slotFX, w.z - slotFZ)
        if (d > farF + 1e-6) c8.fail(`on his way home from stop 4's point he walked away from his slot: ${d} after ${farF}`)
        farF = d
        if (Date.now() - fromF > c8.bound(tripF, 4000)) c8.fail(`him home from stop 4's point not within ${c8.bound(tripF, 4000)} ms`)
        await sleep(40)
      }
      await sleep(100)
      if (away((await c8.pose()).world, slotFX, slotFZ) > 1e-6) c8.fail('home at stop 4 is not his slot')
      console.log(`PASS: stop 4, desktop: out ${tripF.toFixed(3)} to [${PF.px.toFixed(0)}, ${PF.py.toFixed(0)}], a tap where he stood at [${sfx.toFixed(0)}, ${sfy.toFixed(0)}], off the strip, brings him straight home in ${((Date.now() - fromF) / 1000).toFixed(2)} s`)
    }

    if (wanted(9)) {
      // -------------------------------------------------------------
      // Case 9 (the walk's end, tasks/2026-11-14-walk-end-plan.md): the phone's walk back. At 390 × 844 with a finger,
      // `walkT=0.9` and the automatic walk, a finger on his box's centre turns him. Within a capped poll `t` falls below
      // 0.85, and his body's world yaw is then within 0.2 rad of his slot's yaw plus π. While `t` falls from 0.85 to
      // 0.7 his roll is read every 100 ms: not 0 on most reads, and of both signs. So he strides, as a glide reads 0
      // -------------------------------------------------------------
      const c9 = (msg) => {
        throw new Error(`Case 9 failed: ${msg}`)
      }
      await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await page.send('Page.navigate', { url: `${origin}/?street=1&arrival=0&walkMode=auto&walkT=0.9` })
      await waitForStreetReady(page)
      const c9Init = await evaluate(page, () => ({ t: window.__streetWalk?.t, auto: window.__streetWalk?.auto }))
      if (c9Init.t !== 0.9 || c9Init.auto !== false) throw new Error(`Case 9 precondition failed: opened at ${JSON.stringify(c9Init)}, expected t 0.9 with the walk stopped`)
      const b9 = await evaluate(page, () => window.__vincentBox?.())
      if (!b9) throw new Error('Case 9 precondition failed: __vincentBox missing')
      const x9 = Math.round((b9.x0 + b9.x1) / 2)
      const y9 = Math.round((b9.y0 + b9.y1) / 2)
      if (!(await evaluate(page, `document.elementFromPoint(${x9}, ${y9}) === document.querySelector('canvas')`))) {
        throw new Error(`Case 9 precondition failed: his box's centre [${x9}, ${y9}] is not on the canvas`)
      }
      await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x9, y: y9, id: 0 }] })
      await sleep(50)
      await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      // `t` and his pose from one evaluate, so they are the same frame's
      const read9 = () => evaluate(page, () => ({ t: window.__streetWalk.t, pose: window.__vincentPose() }))
      const from9 = Date.now()
      let r9 = await read9()
      while (!(r9.t < 0.85)) {
        if (Date.now() - from9 > 8000) c9(`t is ${r9.t} 8 s after the tap, expected below 0.85`)
        await sleep(40)
        r9 = await read9()
      }
      const want9 = vincentPlace(r9.t).yaw + Math.PI
      const off9 = Math.abs(Math.atan2(Math.sin(r9.pose.yaw - want9), Math.cos(r9.pose.yaw - want9)))
      if (!(off9 <= 0.2)) c9(`at t ${r9.t} his yaw ${r9.pose.yaw} is ${off9} rad from his slot's yaw plus π, expected at most 0.2`)
      const rolls = []
      for (let r = r9; r.t > 0.7; r = await read9()) {
        if (Date.now() - from9 > 20000) c9(`t is ${r.t} 20 s after the tap, expected below 0.7`)
        rolls.push(r.pose.roll)
        await sleep(100)
      }
      const rolling = rolls.filter((v) => v !== 0).length
      if (!(rolling > rolls.length / 2 && rolls.some((v) => v > 0) && rolls.some((v) => v < 0))) {
        c9(`from t 0.85 to 0.7 his roll was not 0 on ${rolling} of ${rolls.length} reads, ${rolls.filter((v) => v > 0).length} above 0 and ${rolls.filter((v) => v < 0).length} below`)
      }
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      console.log(`PASS: the phone's walk back: a finger on him at stop 4 turns him, at t ${r9.t.toFixed(4)} he faces down the lane within ${off9.toFixed(4)} rad, and from 0.85 to 0.7 he strides (roll not 0 on ${rolling} of ${rolls.length} reads, both signs)`)
    }

    if (wanted(10)) {
      // -------------------------------------------------------------
      // Case 10 (the audit's item 10): on the desktop at stop 1, a tap on open ground sends him off the lane. Reduced
      // motion is turned on through CDP, and his position holds. One wheel turn on the canvas then puts him on the
      // lane, at his slot, within two frames
      // -------------------------------------------------------------
      const c10 = (msg) => {
        throw new Error(`Case 10 failed: ${msg}`)
      }
      await c8.open(DESKTOP, false, 1, 'input')
      const t10 = STATION_T[1]
      const [s10x, s10z] = slotXZ(t10)
      const sc10 = await c8.scene()
      const P10 = acceptedPoints(sc10.persp, sc10.size, sc10.box, sc10.view, t10, await c8.mask(DESKTOP), { min: 0.45, max: 0.8, reach: 0.8 })[0]
      if (!P10) c10('no accepted point 0.45 to 0.8 from his slot at stop 1')
      const park10 = await c8.pauseAt()
      await c8.tap(false, P10.px, P10.py)
      await c8.park(park10)
      await c8.until(`window.__wander().mode === 'going'`, 1000, 'case 10: the tap sending him')
      await c8.until(`Math.hypot(window.__vincentPose().world[0] - ${s10x}, window.__vincentPose().world[2] - ${s10z}) > 0.05`, 3000, 'case 10: him walking away from his slot')
      await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
      await sleep(250)
      const held10 = await c8.hold('case 10: reduced motion on, off the lane', 500)
      if (held10.mode !== 'going') c10(`under reduced motion he is ${held10.mode}, expected going`)
      const run10 = await page.send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `new Promise((resolve) => {
          document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: 200, deltaMode: 0, bubbles: true, cancelable: true }))
          const modes = []
          const step = () => {
            modes.push(window.__wander().mode)
            if (modes.length >= 2) resolve(modes)
            else requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        })`,
      })
      const modes10 = run10.result.value
      if (modes10[1] !== 'lane') c10(`after a wheel turn under reduced motion his mode over two frames was ${JSON.stringify(modes10)}, expected lane by the second`)
      const home10 = away((await c8.pose()).world, s10x, s10z)
      if (home10 > 1e-6) c10(`home under reduced motion he is ${home10} from his slot`)
      await page.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] })
      console.log(`PASS: the wheel under reduced motion, off the lane: one wheel turn puts him home (modes over two frames ${JSON.stringify(modes10)}, ${home10.toExponential(1)} from his slot)`)
    }

    // -------------------------------------------------------------
    // Case 11 (A10, the one tap rule): see the header. Each part opens its own page, so the next part's load clears a
    // lost press (the read's finding 6), and a finger's fake pointer is also cancelled at its part's end
    // -------------------------------------------------------------
    const c11 = {
      fail: (part, msg) => {
        throw new Error(`Case ${part} failed: ${msg}`)
      },
      // the events' own times, from a capture listener on window: the first press after `arm` and the last release of
      // its pointer. A part whose gesture spans more than the tap's time proves nothing, since today's rule times it too
      // (the read's finding 4)
      arm: () =>
        page.evaluate(`(() => { window.__span = []; if (window.__spanOn) return; window.__spanOn = true; for (const type of ['pointerdown', 'pointerup']) window.addEventListener(type, (e) => window.__span.push({ type, id: e.pointerId, ms: e.timeStamp }), { capture: true, passive: true }) })()`),
      quick: async (part) => {
        const span = await page.evaluate('window.__span')
        const down = span.find((e) => e.type === 'pointerdown')
        const up = down && span.findLast((e) => e.type === 'pointerup' && e.id === down.id)
        if (!up) c11.fail(part, `invalid: the page saw no press and release of one pointer (${JSON.stringify(span)})`)
        const ms = up.ms - down.ms
        if (ms > TOUCH_SURGE.tapMs) c11.fail(part, `invalid: the gesture spanned ${ms.toFixed(0)} ms by its events, over the tap's ${TOUCH_SURGE.tapMs} ms`)
        return ms
      },
      // a press whose release never comes, as a lost release leaves one: a synthetic pointerdown on the canvas
      lostPress: (x, y, pointerType, pointerId) =>
        page.evaluate(`document.querySelector('canvas').dispatchEvent(new PointerEvent('pointerdown', { pointerId: ${pointerId}, pointerType: '${pointerType}', isPrimary: true, button: 0, buttons: 1, clientX: ${x}, clientY: ${y}, bubbles: true, cancelable: true, composed: true }))`),
      cancel: (pointerId) => page.evaluate(`window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: ${pointerId}, pointerType: 'touch', isPrimary: true, bubbles: true }))`),
      centre: async () => {
        const b = await c8.box()
        return [Math.round((b.x0 + b.x1) / 2), Math.round((b.y0 + b.y1) / 2)]
      },
      // a part's control: a plain tap on his box toggles the walk, and a second toggles it back
      control: async (part, touch) => {
        const auto0 = await c8.auto()
        for (const want of [!auto0, auto0]) {
          const [x, y] = await c11.centre()
          await c8.tap(touch, x, y)
          await sleep(300)
          if ((await c8.auto()) !== want) c11.fail(part, `the control failed, a plain tap on his box left the walk's auto at ${!want}`)
        }
        return auto0
      },
      frames: () => page.send('Runtime.evaluate', { awaitPromise: true, expression: 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))' }),
    }

    if (wanted('11a')) {
      // 11a. desktop, stop 1: a mouse out 60 px and back on his box is a drag, as it is off him (Codex F2; the plan's 8e)
      await c8.open(DESKTOP, false, 1, 'input')
      const auto11a = await c11.control('11a', false)
      let [x, y] = await c11.centre()
      await c11.arm()
      await c8.outAndBack(false, x, y)
      await sleep(300)
      const apart = await c11.quick('11a')
      if ((await c8.auto()) !== auto11a) c11.fail('11a', 'a mouse out 60 px and back on his box toggled the walk')
      // the same folded into one move: its own point 2 px from the press, its first coalesced sample 60 px (Codex r1)
      ;[x, y] = await c11.centre()
      await c11.arm()
      await page.evaluate(`window.__pid = null; window.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId }, { once: true })`)
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 })
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
      const folded = await page.evaluate(`(() => { const o = { pointerId: window.__pid, isPrimary: true, pointerType: 'mouse', buttons: 1, bubbles: true, clientY: ${y} }; const at = (x) => new PointerEvent('pointermove', { ...o, clientX: x }); const e = new PointerEvent('pointermove', { ...o, clientX: ${x + 2}, coalescedEvents: [at(${x + 60}), at(${x + 2})] }); window.dispatchEvent(e); return e.getCoalescedEvents().length })()`)
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 2, y, button: 'left', buttons: 0, clickCount: 1 })
      await sleep(300)
      const foldedMs = await c11.quick('11a')
      if (folded !== 2) c11.fail('11a', `invalid: the folded move carried ${folded} coalesced samples, not 2`)
      if ((await c8.auto()) !== auto11a) c11.fail('11a', 'a mouse out 60 px and back on his box, folded into one move, toggled the walk')
      // the walk is not stuck: a plain tap still toggles it
      ;[x, y] = await c11.centre()
      await c8.tap(false, x, y)
      await sleep(300)
      if ((await c8.auto()) === auto11a) c11.fail('11a', 'after the two drags a plain tap on his box did not toggle the walk')
      console.log(`PASS 11a: a mouse out 60 px and back on his box, apart (${apart.toFixed(0)} ms) and folded into one move (${foldedMs.toFixed(0)} ms), leaves the walk alone, and a plain tap still toggles it`)
    }

    if (wanted('11b')) {
      // 11b. the phone, stop 1: after a finger's lost release, a tap on his box toggles the walk (the plan's 3b). The lost
      // press is on his box, where the grass takes no press (the read's finding 6), with a pointerId no CDP touch uses
      await c8.open(PHONE, true, 1, 'auto')
      const auto11b = await c11.control('11b', true)
      const [lx, ly] = await c11.centre()
      await c11.lostPress(lx, ly, 'touch', 50)
      await sleep(100)
      const [x, y] = await c11.centre()
      await c11.arm()
      await c8.tap(true, x, y)
      await sleep(300)
      const ms11b = await c11.quick('11b')
      const after11b = await c8.auto()
      await c11.cancel(50)
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      if (after11b === auto11b) c11.fail('11b', "after a finger's lost release a tap on his box did not toggle the walk")
      console.log(`PASS 11b: after a finger's lost release a tap on his box (${ms11b.toFixed(0)} ms) toggles the walk`)
    }

    if (wanted('11c')) {
      // 11c. desktop, stop 1: a tap during a long frame (the plan's 8f). A capture listener on window holds the main thread
      // 400 ms before the release's handler, once. It models a long frame before the handler, not a phone's real frame
      await c8.open(DESKTOP, false, 1, 'input')
      const auto11c = await c8.auto()
      const [x, y] = await c11.centre()
      // armed first, so its listener records the release before the hold
      await c11.arm()
      await page.evaluate(`window.__lag = null; window.addEventListener('pointerup', (e) => { const from = performance.now(); while (performance.now() - from < 400); window.__lag = performance.now() - e.timeStamp }, { capture: true, once: true })`)
      await c8.tap(false, x, y)
      await sleep(600)
      const lag = await page.evaluate('window.__lag')
      if (!(lag >= 400)) c11.fail('11c', `invalid: the release's handler ran ${lag} ms after its event, not 400`)
      const ms11c = await c11.quick('11c')
      if ((await c8.auto()) === auto11c) c11.fail('11c', `a tap on his box of ${ms11c.toFixed(0)} ms by its events, handled ${lag.toFixed(0)} ms after its release, did not toggle the walk`)
      console.log(`PASS 11c: a tap on his box of ${ms11c.toFixed(0)} ms by its events toggles the walk, its release handled ${lag.toFixed(0)} ms late`)
    }

    if (wanted('11d')) {
      // 11d. desktop, stop 1: after a mouse's lost release on him, a press on the dock clears his gesture before its target
      // test (the read's finding 1). The grass reads the street's gesture, and one standing on him keeps the mouse's hand
      // off the grass (`StreetGrass.tsx`, the move), so the hand moved onto the grass with the button down shows it
      await c8.open(DESKTOP, false, 1, 'input')
      const sc11 = await c8.scene()
      const G = acceptedPoints(sc11.persp, sc11.size, sc11.box, sc11.view, STATION_T[1], await c8.mask(DESKTOP)).find((p) => inFootprint(p.x, p.z))
      if (!G) c11.fail('11d', 'no accepted point in the grass footprint at stop 1')
      const dock = await c8.pauseAt()
      if (!dock) c11.fail('11d', 'no Pause control on the page')
      const hit = async () => {
        await c11.frames()
        return page.evaluate('window.__grassHit')
      }
      // the control: the mouse over the grass gives a hit, and over the dock none
      await c8.park({ x: G.px, y: G.py })
      if (!(await hit())) c11.fail('11d', `the control failed, the mouse over the grass at [${G.px.toFixed(0)}, ${G.py.toFixed(0)}] gave no hit`)
      await c8.park(dock)
      if (await hit()) c11.fail('11d', 'the control failed, the mouse over the dock left a hit on the grass')
      // the mouse's pointerId, from a middle press on the dock, which no listener takes as a gesture (the read's finding 11)
      await page.evaluate(`window.__pid = null; window.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId }, { once: true })`)
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dock.x, y: dock.y, button: 'middle', buttons: 4, clickCount: 1 })
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dock.x, y: dock.y, button: 'middle', buttons: 0, clickCount: 1 })
      const pid = await page.evaluate('window.__pid')
      if (pid === null) c11.fail('11d', "invalid: no pointerdown read the mouse's pointerId")
      const [bx, by] = await c11.centre()
      await c11.lostPress(bx, by, 'mouse', pid)
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dock.x, y: dock.y, button: 'left', buttons: 1, clickCount: 1 })
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: G.px, y: G.py, button: 'left', buttons: 1 })
      const held = await hit()
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: G.px, y: G.py, button: 'left', buttons: 0, clickCount: 1 })
      if (!held) c11.fail('11d', 'after a lost release on him a press on the dock left his gesture standing: the hand moved onto the grass gave no hit')
      console.log(`PASS 11d: after a mouse's lost release on him a press on the dock clears his gesture, and the hand moved onto the grass at [${G.px.toFixed(0)}, ${G.py.toFixed(0)}] touches it`)
    }

    } finally {
      await page.close()
    }
  } finally {
    await chrome.close()
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
