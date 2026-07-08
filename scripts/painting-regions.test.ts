import assert from 'node:assert/strict'
import test from 'node:test'
import { extractCypressSlices, extractSkylineV } from '../src/scene/paintingRegions.ts'

function image(width: number, height: number, fill: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

test('extractCypressSlices finds a dark green bar and ignores dark blue sky', () => {
  // 200×200: dark GREEN bar centred at u=0.1 from v=0.1 down; a dark BLUE night band across the
  // top rows (v < 0.08) that must NOT read as cypress; bright elsewhere
  const img = image(200, 200, (x, y) => {
    const u = x / 200
    const v = y / 200
    const inBar = v > 0.1 && Math.abs(u - 0.1) < 0.03
    if (inBar) return [20, 25, 20]
    if (v < 0.08) return [22, 28, 58] // dark cobalt sky — low luminance but blue-dominant
    return [140, 150, 180]
  })
  const slices = extractCypressSlices(img)
  assert.ok(slices.length > 20, `slices ${slices.length}`)
  for (const s of slices) {
    assert.ok(Math.abs(s.uCentre - 0.1) < 0.02, `centre ${s.uCentre}`)
    assert.ok(s.halfWidth > 0.015 && s.halfWidth < 0.05, `halfWidth ${s.halfWidth}`)
    assert.ok(s.v > 0.09, `dark blue sky leaked into the silhouette at v=${s.v}`)
  }
  for (let i = 1; i < slices.length; i++) assert.ok(slices[i].v > slices[i - 1].v, 'ordered top → bottom')
})

test('extractCypressSlices drops dark blobs detached from the flame column', () => {
  const img = image(200, 200, (x, y) => {
    const u = x / 200
    const v = y / 200
    const inBar = v > 0.1 && Math.abs(u - 0.1) < 0.03
    const detachedBlob = v > 0.7 && Math.abs(u - 0.22) < 0.02 // a dark bush far right of the bar
    return inBar || detachedBlob ? [20, 25, 20] : [140, 150, 180]
  })
  const slices = extractCypressSlices(img)
  for (const s of slices) {
    assert.ok(s.uCentre < 0.16, `detached blob joined the silhouette: centre ${s.uCentre}`)
  }
})

test('extractSkylineV reads the sky mask boundary and clamps the cypress column', () => {
  // sky (255) above a slanted ground line; a full-height dark column at u<0.15 (the cypress)
  const mask = image(200, 200, (x, y) => {
    const u = x / 200
    const v = y / 200
    if (u < 0.15) return [0, 0, 0] // cypress punches through the sky
    const ground = v > 0.6 + 0.1 * u
    return ground ? [0, 0, 0] : [255, 255, 255]
  })
  const skyline = extractSkylineV(mask, 40)
  assert.equal(skyline.length, 40)
  const uAt = (i: number) => i / 39
  for (let i = 12; i < 40; i++) {
    assert.ok(Math.abs(skyline[i] - (0.6 + 0.1 * uAt(i))) < 0.04, `col ${i}: ${skyline[i]}`)
  }
  // cypress columns are clamped to the neighbouring hills line, not v≈0 or the frame bottom
  for (let i = 0; i < 6; i++) assert.ok(skyline[i] > 0.5 && skyline[i] < 0.75, `cypress col ${i}: ${skyline[i]}`)
})
