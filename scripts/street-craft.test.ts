/** The village's craft (K1 plan, tasks/2026-10-25-village-craft-k1-plan.md). */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, SRGBColorSpace } from 'three'
import { moonShade } from '../src/scene/brushForms.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildFlatPanel, buildStreet, KEPT_PAINT } from '../src/scene/streetGeometry.ts'
import { rectUnderpaint, sourceUnderpaint, STREET_MOON_LIFT } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

/** A 1600 × 1267 painting in the village's blues and greens, varied so every filter finds texels. */
function villagePainting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (x * 7 + y * 13) % 4
      data.set([[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [120, 140, 170, 255]][k], (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

test('the lightest share is the top of the sort', () => {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  const rect = [10, 10, 20, 20] as const
  let v = 10
  for (let y = 10; y < 20; y++) {
    for (let x = 10; x < 20; x++) {
      const idx = (y * width + x) * 4
      data[idx] = v
      data[idx + 1] = v
      data[idx + 2] = v
      data[idx + 3] = 255
      v += 2
    }
  }
  const painting: ImageData2D = { data, width, height }
  const share = 0.2
  // 100 texels in rect, count = 20
  const count = 20
  // Values: 10, 12, ..., 208 (100 values)
  // Darkest 20: 10 + 2*k for k=0..19 => mean = (10 + 48) / 2 = 29
  // Brightest 20: 10 + 2*k for k=80..99 => mean = (170 + 208) / 2 = 189
  const expectedDark = 29 / 255
  const expectedLight = 189 / 255

  const light = rectUnderpaint(painting, rect, share, true)
  const darkFlag = rectUnderpaint(painting, rect, share, false)
  const darkDefault = rectUnderpaint(painting, rect, share)

  for (let c = 0; c < 3; c++) {
    assert.ok(Math.abs(light[c] - expectedLight) < 1e-6, `channel ${c} light`)
    assert.ok(Math.abs(darkFlag[c] - expectedDark) < 1e-6, `channel ${c} darkFlag`)
    assert.ok(Math.abs(darkDefault[c] - expectedDark) < 1e-6, `channel ${c} darkDefault`)
  }
})

test("the kept paint is today's", () => {
  assert.deepEqual(KEPT_PAINT, { base: 0, light: 0.5, cover: 1 })
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  assert.ok(build)
  const houseFaces = build.report.faces.filter((f) => f.owner.startsWith('house-'))
  assert.ok(houseFaces.length > 0)
  for (const f of houseFaces) {
    const expected = new Color().setRGB(...sourceUnderpaint(painting, f.source, 1), SRGBColorSpace)
    assert.ok(Math.abs(f.base[0] - expected.r) <= 1e-12, `${f.owner}/${f.name} base r ${f.base[0]} vs ${expected.r}`)
    assert.ok(Math.abs(f.base[1] - expected.g) <= 1e-12, `${f.owner}/${f.name} base g ${f.base[1]} vs ${expected.g}`)
    assert.ok(Math.abs(f.base[2] - expected.b) <= 1e-12, `${f.owner}/${f.name} base b ${f.base[2]} vs ${expected.b}`)
    assert.equal(f.cover, 1, `${f.owner}/${f.name} cover`)
  }
  const flat = buildFlatPanel(painting, flow, masses)
  assert.ok(flat)
  for (const f of flat.report.faces) {
    assert.equal(f.cover, 1, `${f.owner}/${f.name} flat panel cover`)
  }
})

test('the church keeps its paint under any wall paint', () => {
  const painting = villagePainting()
  const buildA = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  const buildB = buildStreet(painting, flow, masses, { paint: { base: 1, light: 0.5, cover: 0.5 } })
  assert.ok(buildA && buildB)
  const isChurch = (owner: string) => owner === 'church' || owner === 'belfry' || owner === 'spire'
  const churchFacesA = buildA.report.faces.filter((f) => isChurch(f.owner))
  const churchFacesB = buildB.report.faces.filter((f) => isChurch(f.owner))
  assert.ok(churchFacesA.length > 0)
  assert.equal(churchFacesA.length, churchFacesB.length)
  for (let i = 0; i < churchFacesA.length; i++) {
    const a = churchFacesA[i]
    const b = churchFacesB[i]
    assert.equal(a.owner, b.owner)
    assert.equal(a.name, b.name)
    assert.equal(a.ribbons, b.ribbons, `${a.owner}/${a.name} ribbons`)
    assert.equal(a.density, b.density, `${a.owner}/${a.name} density`)
    assert.equal(a.cover, b.cover, `${a.owner}/${a.name} cover`)
    assert.deepEqual(a.base, b.base, `${a.owner}/${a.name} base`)
  }
})

test("the wall paint reaches the houses' walls and gables, not their roofs", () => {
  const painting = villagePainting()
  const paintB = { base: 1, light: 0.5, cover: 0.5 }
  const buildA = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  const buildB = buildStreet(painting, flow, masses, { paint: paintB })
  assert.ok(buildA && buildB)
  const facesA = buildA.report.faces.filter((f) => f.owner.startsWith('house-'))
  const facesB = buildB.report.faces.filter((f) => f.owner.startsWith('house-'))
  assert.equal(facesA.length, facesB.length)
  let wallRibbonsA = 0
  let wallRibbonsB = 0
  for (let i = 0; i < facesA.length; i++) {
    const a = facesA[i]
    const b = facesB[i]
    assert.equal(a.owner, b.owner)
    assert.equal(a.name, b.name)
    const isRoof = a.name.includes('roof')
    if (!isRoof) {
      assert.equal(b.cover, 0.5, `${b.owner}/${b.name} cover`)
      assert.equal(b.density, a.density, `${b.owner}/${b.name} density`)
      const mean = new Color().setRGB(...sourceUnderpaint(painting, b.source, 1), SRGBColorSpace)
      const lit = new Color().setRGB(...sourceUnderpaint(painting, b.source, paintB.light, true), SRGBColorSpace)
        .multiplyScalar(1 + STREET_MOON_LIFT * moonShade(b.normal))
      const expected = mean.lerp(lit, paintB.base)
      assert.ok(Math.abs(b.base[0] - expected.r) <= 1e-9, `${b.owner}/${b.name} base r`)
      assert.ok(Math.abs(b.base[1] - expected.g) <= 1e-9, `${b.owner}/${b.name} base g`)
      assert.ok(Math.abs(b.base[2] - expected.b) <= 1e-9, `${b.owner}/${b.name} base b`)
      wallRibbonsA += a.ribbons
      wallRibbonsB += b.ribbons
    } else {
      assert.equal(b.ribbons, a.ribbons, `${b.owner}/${b.name} ribbons`)
      assert.deepEqual(b.base, a.base, `${b.owner}/${b.name} base`)
      assert.equal(b.cover, 1, `${b.owner}/${b.name} cover`)
    }
  }
  assert.ok(wallRibbonsB < wallRibbonsA, `wall ribbons B (${wallRibbonsB}) < A (${wallRibbonsA})`)
})
