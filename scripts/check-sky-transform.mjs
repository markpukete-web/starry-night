#!/usr/bin/env node
/**
 * Task 6, Step 4b: Verify the component applies the transform live in the browser.
 * On capture-diorama.mjs's CDP setup and drag:
 * - Load ?mode=diorama&clean=1&arrival=0
 * - Drag canvas 240 px right, wait 1.5 s, read __skyTransform()
 * - In node, compute home quaternion from DIORAMA_CAMERAS.design (lookAt position to target)
 *   and expected camera × home⁻¹
 * - Assert sky's quaternion within 1e-6 of expected, position at origin (< 1e-6)
 * - Assert camera moved off home by at least 5°
 * - Repeat with &sky=light and under prefers-reduced-motion: reduce
 * - Exit 1 otherwise.
 */
import assert from 'node:assert/strict'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import { debugPort, openPage, PORTS, startChrome } from './lib/chrome.mjs'

const appUrl = process.env.DIORAMA_CAPTURE_URL || `http://127.0.0.1:${PORTS['check-sky-transform'].app}/`
const origin = new URL(appUrl).origin

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function dragCanvas(page, dx, dy = 0) {
  const result = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const r = document.querySelector('canvas').getBoundingClientRect()
      return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.52 }
    })()`,
    returnByValue: true,
  })
  const { x, y } = result.result.value
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  for (let i = 1; i <= 24; i++) {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: x + (dx * i) / 24,
      y: y + (dy * i) / 24,
      button: 'left',
      buttons: 1,
    })
  }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: 'left', clickCount: 1 })
}

// Compute home quaternion from DIORAMA_CAMERAS.design
const eye = new Vector3(...DIORAMA_CAMERAS.design.position)
const target = new Vector3(...DIORAMA_CAMERAS.design.target)
const homeMatrix = new Matrix4().lookAt(eye, target, new Vector3(0, 1, 0))
const homeQ = new Quaternion().setFromRotationMatrix(homeMatrix)
const homeInverse = homeQ.clone().invert()

const cases = [
  { name: 'moving sky', url: `${origin}/?mode=diorama&clean=1&arrival=0`, reducedMotion: false },
  { name: 'painted light', url: `${origin}/?mode=diorama&clean=1&arrival=0&sky=light`, reducedMotion: false },
  { name: 'reduced motion', url: `${origin}/?mode=diorama&clean=1&arrival=0`, reducedMotion: true },
]

async function runCase(port, { name, url, reducedMotion }) {
  const page = await openPage(port)

  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
    if (reducedMotion) {
      await page.send('Emulation.setEmulatedMedia', {
        media: '',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
    }

    await page.send('Page.navigate', { url })

    // Wait for canvas
    await page.waitFor("document.querySelector('canvas') && typeof window.__skyTransform === 'function'", 25000, `canvas and __skyTransform at ${url}`, 250)

    // Drag canvas 240 px right
    await dragCanvas(page, 240, 0)

    // Wait 1.5 s
    await sleep(1500)

    // Read __skyTransform()
    const read = await page.send('Runtime.evaluate', {
      expression: `window.__skyTransform()`,
      returnByValue: true,
    })

    const val = read.result?.value
    if (!val) throw new Error(`No value returned from __skyTransform() in ${name}`)

    const sqRaw = val.quaternion
    const spRaw = val.position
    const cqRaw = val.camera

    const sq = new Quaternion(sqRaw[0] ?? sqRaw.x, sqRaw[1] ?? sqRaw.y, sqRaw[2] ?? sqRaw.z, sqRaw[3] ?? sqRaw.w)
    const sp = new Vector3(spRaw[0] ?? spRaw.x, spRaw[1] ?? spRaw.y, spRaw[2] ?? spRaw.z)
    const cq = new Quaternion(cqRaw[0] ?? cqRaw.x, cqRaw[1] ?? cqRaw.y, cqRaw[2] ?? cqRaw.z, cqRaw[3] ?? cqRaw.w)

    // 1. Camera moved off home by at least 5 degrees
    const cosAngle = Math.min(1, Math.max(-1, Math.abs(cq.dot(homeQ))))
    const angleDeg = 2 * Math.acos(cosAngle) * (180 / Math.PI)
    assert.ok(angleDeg >= 5, `${name}: camera angle ${angleDeg.toFixed(2)}° must be >= 5° off home`)

    // 2. Expected sky quaternion: camera × home⁻¹
    const expectedSkyQ = cq.clone().multiply(homeInverse)
    const d1 = Math.hypot(sq.x - expectedSkyQ.x, sq.y - expectedSkyQ.y, sq.z - expectedSkyQ.z, sq.w - expectedSkyQ.w)
    const d2 = Math.hypot(sq.x + expectedSkyQ.x, sq.y + expectedSkyQ.y, sq.z + expectedSkyQ.z, sq.w + expectedSkyQ.w)
    const quatDiff = Math.min(d1, d2)
    assert.ok(quatDiff < 1e-6, `${name}: sky quaternion difference ${quatDiff.toExponential(3)} must be < 1e-6`)

    // 3. Sky position at origin (< 1e-6)
    const posDist = sp.length()
    assert.ok(posDist < 1e-6, `${name}: sky position distance ${posDist.toExponential(3)} must be at origin (< 1e-6)`)

    console.log(`PASS [${name}]: camera moved ${angleDeg.toFixed(2)}° off home, sky quat diff ${quatDiff.toExponential(3)}, pos distance ${posDist.toExponential(3)}`)
  } finally {
    await page.close()
  }
}

async function main() {
  const port = debugPort('check-sky-transform')
  const chrome = await startChrome({ port, prefix: 'starry-sky-transform-' })
  try {
    for (const c of cases) {
      await runCase(port, c)
    }
    console.log('ALL SKY TRANSFORM CHECKS PASSED')
  } finally {
    await chrome.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
