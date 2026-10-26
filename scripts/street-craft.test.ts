/** The village's craft (K1 plan, tasks/2026-10-25-village-craft-k1-plan.md). */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, SRGBColorSpace, Vector3 } from 'three'
import { moonShade } from '../src/scene/brushForms.ts'
import { frogPlace, FROGS } from '../src/scene/frog.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildFlatPanel, buildStreet, CRAFT, craftShape, FRAME, houseRoofEdges, houseSoffits, KEPT_PAINT, OVERHANG } from '../src/scene/streetGeometry.ts'
import { GRASS, grassChunks } from '../src/scene/streetGrass.ts'
import { doorOf, doorStepFoot, houseFrame, STREET_CHURCH, STREET_HOUSES } from '../src/scene/streetLayout.ts'
import { leanOf, lightOf, STREET_LIGHT, wallShade } from '../src/scene/streetLight.ts'
import { LIFT_STEP, OUTLINE_FRACTION, OUTLINE_LIFT, outlineFace, rectUnderpaint, sourceUnderpaint, STREET_MOON_LIFT, STROKE_LIFT, type StreetFace } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'
const paintingPng = skip ? null : decodePNG(readFileSync(workPainting))

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps

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

test("every painting house's door is set into its wall", () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  assert.ok(build)
  const area = (c: Vector3[]) => c[1].clone().sub(c[0]).cross(c[3].clone().sub(c[0])).length()

  STREET_HOUSES.forEach((h, index) => {
    if (h.type !== 'painting') return
    const craft = build.report.craft.find((c) => c.index === index)
    assert.ok(craft, `house ${index} has craft report`)
    const door = craft.door
    assert.ok(door, `house ${index} reports door`)
    const { origin, normal } = door.plane
    const depth = (p: Vector3) => p.clone().sub(origin).dot(normal)
    for (const p of door.panel) {
      assert.ok(Math.abs(depth(p) + CRAFT.door.recess) < 1e-9, `house ${index} panel at ${depth(p)}`)
    }
    for (const quad of [...door.jambs, door.lintel]) {
      const depths = quad.map(depth)
      assert.ok(
        Math.abs(Math.max(...depths)) < 1e-9 && Math.abs(Math.min(...depths) + CRAFT.door.recess) < 1e-9,
        `house ${index} reveal spans wall to panel`,
      )
    }

    const doorPart = craft.parts.find((p) => p.name === 'door')
    assert.ok(doorPart, `house ${index} has door part`)
    assert.equal(doorPart.buffer, 'windows')
    const { along } = houseFrame(h)
    const lean = leanOf(index)
    const unleanedPanelVertices: Vector3[] = []
    for (let v = doorPart.from; v < doorPart.to; v++) {
      const vx = build.windows.positions[v * 3]
      const vy = build.windows.positions[v * 3 + 1]
      const vz = build.windows.positions[v * 3 + 2]
      unleanedPanelVertices.push(new Vector3(vx - along.x * lean * vy, vy, vz - along.z * lean * vy))
    }
    assert.equal(unleanedPanelVertices.length, door.panel.length)
    for (let k = 0; k < door.panel.length; k++) {
      assert.ok(
        unleanedPanelVertices[k].distanceTo(door.panel[k]) < 1e-9,
        `house ${index} door panel corner ${k} matches`,
      )
    }

    const frontFaces = build.report.faces.filter(
      (f) => f.owner === `house-${index}` && f.name.startsWith('front ') && f.name !== 'front gable',
    )
    assert.equal(frontFaces.length, 3, `house ${index} has 3 front faces`)
    const centre = door.panel
      .reduce((s, p) => s.add(p), new Vector3())
      .divideScalar(4)
      .addScaledVector(normal, CRAFT.door.recess)
    for (const f of frontFaces) {
      const [a, b, , d] = f.corners
      const [u, v] = [b.clone().sub(a), d.clone().sub(a)]
      const s = centre.clone().sub(a).dot(u) / u.lengthSq()
      const t = centre.clone().sub(a).dot(v) / v.lengthSq()
      assert.ok(!(s > 0 && s < 1 && t > 0 && t < 1), `${f.name} covers the door`)
    }
    const wall = h.w * h.eave
    const hole = area(door.panel)
    assert.ok(Math.abs(frontFaces.reduce((s, f) => s + area(f.corners), 0) - (wall - hole)) < 1e-9)
  })
})

test("a door's ink is the opening's, the church's the wall's", () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  assert.ok(build)
  const pos = build.outlines.arrays.positions

  STREET_HOUSES.forEach((h, index) => {
    const craft = build.report.craft.find((c) => c.index === index)
    assert.ok(craft, `house ${index} has craft report`)
    assert.ok(Math.abs(craft.inkRef - FRAME * h.eave) < 1e-9, `house ${index} inkRef`)
    const doorInk = craft.parts.find((p) => p.name === 'door ink')
    assert.ok(doorInk, `house ${index} has door ink part`)
    assert.equal(doorInk.buffer, 'outlines')
    const { along } = houseFrame(h)
    const lean = leanOf(index)
    let maxWidth = 0
    for (let v = doorInk.from; v < doorInk.to; v += 3) {
      const p1 = new Vector3(
        pos[v * 3] - along.x * lean * pos[v * 3 + 1],
        pos[v * 3 + 1],
        pos[v * 3 + 2] - along.z * lean * pos[v * 3 + 1],
      )
      const p3 = new Vector3(
        pos[(v + 2) * 3] - along.x * lean * pos[(v + 2) * 3 + 1],
        pos[(v + 2) * 3 + 1],
        pos[(v + 2) * 3 + 2] - along.z * lean * pos[(v + 2) * 3 + 1],
      )
      maxWidth = Math.max(maxWidth, p1.distanceTo(p3))
    }
    const expectedWidth = OUTLINE_FRACTION * FRAME * h.eave
    assert.ok(
      Math.abs(maxWidth - expectedWidth) < 1e-9,
      `house ${index} door ink width ${maxWidth} vs ${expectedWidth}`,
    )
  })

  const churchDoor = build.report.church.door
  assert.ok(churchDoor)
  let churchMaxWidth = 0
  for (let v = churchDoor.ink[0]; v < churchDoor.ink[1]; v += 3) {
    const p1 = new Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
    const p3 = new Vector3(pos[(v + 2) * 3], pos[(v + 2) * 3 + 1], pos[(v + 2) * 3 + 2])
    churchMaxWidth = Math.max(churchMaxWidth, p1.distanceTo(p3))
  }
  const churchExpectedWidth = OUTLINE_FRACTION * STREET_CHURCH.nave.eave
  assert.ok(
    Math.abs(churchMaxWidth - churchExpectedWidth) < 1e-9,
    `church door ink width ${churchMaxWidth} vs ${churchExpectedWidth}`,
  )
})

test('a frame band round every door', () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  assert.ok(build)
  const pos = build.underpaint.positions
  const col = build.underpaint.colors

  STREET_HOUSES.forEach((h, index) => {
    const craft = build.report.craft.find((c) => c.index === index)
    assert.ok(craft, `house ${index} has craft report`)
    const front = craft.front
    const { along } = houseFrame(h)
    const lean = leanOf(index)
    const door = doorOf(h, index)
    const s0 = door.cu - door.w / 2
    const s1 = door.cu + door.w / 2
    const b = CRAFT.door.band * door.w
    const bt = (b * front.u.length()) / front.v.length()
    const t1 = Math.min(1, door.h + bt)

    const plasterMean = new Color().setRGB(...sourceUnderpaint(painting, 'plaster', 1), SRGBColorSpace)
    const expectedBandColour =
      front.source === 'plaster'
        ? plasterMean.multiplyScalar(0.7)
        : plasterMean
    assert.ok(
      Math.abs(craft.bandColour[0] - expectedBandColour.r) < 1e-9 &&
      Math.abs(craft.bandColour[1] - expectedBandColour.g) < 1e-9 &&
      Math.abs(craft.bandColour[2] - expectedBandColour.b) < 1e-9,
      `house ${index} bandColour`,
    )

    const expectedSpans: Record<string, { s: [number, number]; t: [number, number] }> = {
      'band left': { s: [Math.max(0, s0 - b), s0], t: [0, t1] },
      'band right': { s: [s1, Math.min(1, s1 + b)], t: [0, t1] },
      'band over': { s: [s0, s1], t: [door.h, t1] },
    }

    for (const [partName, expectedSpan] of Object.entries(expectedSpans)) {
      const part = craft.parts.find((p) => p.name === partName)
      assert.ok(part, `house ${index} has part ${partName}`)
      assert.equal(part.buffer, 'underpaint')
      let minS = Infinity
      let maxS = -Infinity
      let minT = Infinity
      let maxT = -Infinity
      for (let v = part.from; v < part.to; v++) {
        const vx = pos[v * 3]
        const vy = pos[v * 3 + 1]
        const vz = pos[v * 3 + 2]
        const pUnleaned = new Vector3(vx - along.x * lean * vy, vy, vz - along.z * lean * vy)
        const lift = pUnleaned.clone().sub(front.origin).dot(front.normal)
        assert.ok(Math.abs(lift - CRAFT.door.lift) < 1e-9, `house ${index} ${partName} vertex lift ${lift}`)

        const rel = pUnleaned.clone().sub(front.origin).addScaledVector(front.normal, -CRAFT.door.lift)
        const s = rel.dot(front.u) / front.u.lengthSq()
        const t = rel.dot(front.v) / front.v.lengthSq()
        assert.ok(s >= -1e-9 && s <= 1 + 1e-9 && t >= -1e-9 && t <= 1 + 1e-9, `house ${index} inside [0, 1]²`)
        minS = Math.min(minS, s)
        maxS = Math.max(maxS, s)
        minT = Math.min(minT, t)
        maxT = Math.max(maxT, t)
      }
      assert.ok(Math.abs(minS - expectedSpan.s[0]) < 1e-9, `house ${index} ${partName} minS`)
      assert.ok(Math.abs(maxS - expectedSpan.s[1]) < 1e-9, `house ${index} ${partName} maxS`)
      assert.ok(Math.abs(minT - expectedSpan.t[0]) < 1e-9, `house ${index} ${partName} minT`)
      assert.ok(Math.abs(maxT - expectedSpan.t[1]) < 1e-9, `house ${index} ${partName} maxT`)
    }

    const bandLeft = craft.parts.find((p) => p.name === 'band left')!
    const v0 = bandLeft.from
    const v0x = pos[v0 * 3]
    const v0y = pos[v0 * 3 + 1]
    const v0z = pos[v0 * 3 + 2]
    const unleanedV0 = new Vector3(v0x - along.x * lean * v0y, v0y, v0z - along.z * lean * v0y)
    const expectedK = lightOf(front, true, STREET_LIGHT) * wallShade(front, unleanedV0.x, unleanedV0.y, unleanedV0.z, true)
    const expectedC = [
      craft.bandColour[0] * expectedK,
      craft.bandColour[1] * expectedK,
      craft.bandColour[2] * expectedK,
    ]
    for (let c = 0; c < 3; c++) {
      assert.ok(
        Math.abs(col[v0 * 3 + c] - expectedC[c]) < 1e-9,
        `house ${index} band first vertex color channel ${c} ${col[v0 * 3 + c]} vs ${expectedC[c]}`,
      )
    }
  })
})

test("a step at every door's foot, on the door's side", () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  assert.ok(build)
  const pos = build.underpaint.positions

  STREET_HOUSES.forEach((h, index) => {
    const craft = build.report.craft.find((c) => c.index === index)
    assert.ok(craft, `house ${index} has craft report`)
    const front = craft.front
    const { along } = houseFrame(h)
    const lean = leanOf(index)
    const stepPart = craft.parts.find((p) => p.name === 'step')
    assert.ok(stepPart, `house ${index} has step part`)
    assert.equal(stepPart.buffer, 'underpaint')

    const vertices: Vector3[] = []
    for (let v = stepPart.from; v < stepPart.to; v++) {
      const vx = pos[v * 3]
      const vy = pos[v * 3 + 1]
      const vz = pos[v * 3 + 2]
      vertices.push(new Vector3(vx - along.x * lean * vy, vy, vz - along.z * lean * vy))
    }

    const top = Math.max(...vertices.map((p) => p.y))
    assert.ok(top <= 0.015, `house ${index} step top ${top} <= 0.015`)

    const outDistances = vertices.map((p) => p.clone().sub(front.origin).dot(front.normal))
    const maxOut = Math.max(...outDistances)
    assert.ok(maxOut >= 0.02 && maxOut <= 0.04, `house ${index} step front ${maxOut} in [0.02, 0.04]`)

    const sCoords = vertices.map((p) => p.clone().sub(front.origin).dot(front.u) / front.u.lengthSq())
    const width = (Math.max(...sCoords) - Math.min(...sCoords)) * front.u.length()
    const door = doorOf(h, index)
    const expectedWidth = door.w * front.u.length()
    assert.ok(Math.abs(width - expectedWidth) < 1e-9, `house ${index} step width ${width} vs ${expectedWidth}`)

    const groundPts: [number, number][] = []
    for (const p of vertices) {
      if (Math.abs(p.y) < 1e-6) {
        if (!groundPts.some(([gx, gz]) => Math.hypot(gx - p.x, gz - p.z) < 1e-6)) {
          groundPts.push([p.x, p.z])
        }
      }
    }
    assert.equal(groundPts.length, 4, `house ${index} has 4 distinct ground corners`)
    const expectedCorners = doorStepFoot(h, index)
    for (const ec of expectedCorners) {
      const matched = groundPts.some(([gx, gz]) => Math.hypot(gx - ec[0], gz - ec[1]) < 1e-9)
      assert.ok(matched, `house ${index} ground corner (${ec[0]}, ${ec[1]}) matched`)
    }
  })
})

test('no blade and no frog on a step', { skip }, () => {
  assert.ok(paintingPng)
  const realPainting: ImageData2D = {
    data: new Uint8ClampedArray(paintingPng.rgba),
    width: paintingPng.width,
    height: paintingPng.height,
  }
  const chunks = grassChunks(realPainting)
  const stepFeet = STREET_HOUSES.map((h, i) => doorStepFoot(h, i))

  function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
    const dx = bx - ax
    const dz = bz - az
    const lenSq = dx * dx + dz * dz
    if (lenSq < 1e-12) return Math.hypot(px - ax, pz - az)
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq))
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
  }

  function insideQuad(px: number, pz: number, foot: [number, number][]): boolean {
    let sign = 0
    for (let i = 0; i < 4; i++) {
      const [ax, az] = foot[i]
      const [bx, bz] = foot[(i + 1) % 4]
      const cross = (bx - ax) * (pz - az) - (bz - az) * (px - ax)
      if (Math.abs(cross) < 1e-12) continue
      if (sign === 0) sign = cross > 0 ? 1 : -1
      else if ((cross > 0 ? 1 : -1) !== sign) return false
    }
    return true
  }

  function distToFoot(px: number, pz: number, foot: [number, number][]): number {
    if (insideQuad(px, pz, foot)) return 0
    let minD = Infinity
    for (let i = 0; i < 4; i++) {
      const [ax, az] = foot[i]
      const [bx, bz] = foot[(i + 1) % 4]
      minD = Math.min(minD, distToSegment(px, pz, ax, az, bx, bz))
    }
    return minD
  }

  for (const chunk of chunks) {
    for (const b of chunk.blades) {
      for (let s = 0; s < stepFeet.length; s++) {
        const d = distToFoot(b.x, b.z, stepFeet[s])
        assert.ok(d >= GRASS.house - 1e-9, `blade at (${b.x}, ${b.z}) too close to step ${s}: ${d} < ${GRASS.house}`)
      }
      assert.ok(b.x >= chunk.box.min[0] && b.x <= chunk.box.max[0], `blade x inside chunk box`)
      assert.ok(b.z >= chunk.box.min[2] && b.z <= chunk.box.max[2], `blade z inside chunk box`)
    }
  }

  for (const spec of FROGS) {
    const [fx, , fz] = frogPlace(spec).position
    for (let s = 0; s < stepFeet.length; s++) {
      const d = distToFoot(fx, fz, stepFeet[s])
      assert.ok(d >= GRASS.house - 1e-9, `frog ${spec.name} too close to step ${s}: ${d} < ${GRASS.house}`)
    }
  }
})

test('two open leaves beside every front window', () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  const craft = build.report.craft
  const leafParts = craft.flatMap((c) => c.parts.filter((p) => p.name.startsWith('leaf ') && !p.name.endsWith('ink')))
  assert.equal(leafParts.length, 22, '22 leaf parts across the village')

  for (const c of craft) {
    const h = STREET_HOUSES[c.index]
    const along = houseFrame(h).along
    const lean = leanOf(c.index)
    const front = c.front
    const storeys = h.storeys

    const windowSpecs: { k: number; cu: number; cv: number; w: number; h: number }[] = []
    if (h.type === 'painting') {
      windowSpecs.push({
        k: 0,
        cu: c.index % 2 ? 0.2 : 0.8,
        cv: 0.62 / storeys,
        w: 0.12,
        h: 0.2 / storeys,
      })
      if (storeys === 2) {
        windowSpecs.push({
          k: 1,
          cu: c.index % 2 ? 0.2 : 0.8,
          cv: (1 + 0.62) / storeys,
          w: 0.12,
          h: 0.2 / storeys,
        })
      }
    } else {
      windowSpecs.push({
        k: 0,
        cu: c.index % 2 ? 0.74 : 0.26,
        cv: 0.55,
        w: 0.12,
        h: 0.3,
      })
    }

    for (const win of windowSpecs) {
      for (const side of ['left', 'right'] as const) {
        const part = c.parts.find((p) => p.name === `leaf ${win.k} ${side}`)
        assert.ok(part, `${c.owner}: missing leaf ${win.k} ${side}`)
        assert.equal(part.buffer, 'underpaint')
        const [s0Exp, s1Exp] = side === 'left' ? [win.cu - win.w, win.cu - win.w / 2] : [win.cu + win.w / 2, win.cu + win.w]
        const [t0Exp, t1Exp] = [win.cv - win.h / 2, win.cv + win.h / 2]

        let minS = Infinity, maxS = -Infinity
        let minT = Infinity, maxT = -Infinity
        for (let i = part.from; i < part.to; i++) {
          const vx = build.underpaint.positions[i * 3]
          const vy = build.underpaint.positions[i * 3 + 1]
          const vz = build.underpaint.positions[i * 3 + 2]
          const pUnleaned = new Vector3(
            vx - along.x * lean * vy,
            vy,
            vz - along.z * lean * vy,
          )
          const lift = pUnleaned.clone().sub(front.origin).dot(front.normal)
          assert.ok(close(lift, CRAFT.shutter.lift, 1e-9), `${c.owner} leaf ${win.k} ${side}: lift ${lift} vs ${CRAFT.shutter.lift}`)
          const diff = pUnleaned.clone().sub(front.origin)
          const s = diff.dot(front.u) / front.u.lengthSq()
          const t = diff.dot(front.v) / front.v.lengthSq()
          minS = Math.min(minS, s)
          maxS = Math.max(maxS, s)
          minT = Math.min(minT, t)
          maxT = Math.max(maxT, t)
        }
        assert.ok(close(minS, s0Exp, 1e-9), `${c.owner} leaf ${win.k} ${side} minS ${minS} vs ${s0Exp}`)
        assert.ok(close(maxS, s1Exp, 1e-9), `${c.owner} leaf ${win.k} ${side} maxS ${maxS} vs ${s1Exp}`)
        assert.ok(close(minT, t0Exp, 1e-9), `${c.owner} leaf ${win.k} ${side} minT ${minT} vs ${t0Exp}`)
        assert.ok(close(maxT, t1Exp, 1e-9), `${c.owner} leaf ${win.k} ${side} maxT ${maxT} vs ${t1Exp}`)
        assert.ok(minS >= 0 && maxS <= 1 && minT >= 0 && maxT <= 1, `${c.owner} leaf ${win.k} ${side} inside [0, 1]²`)
      }
    }
  }
})

test('the parts keep apart on every front', () => {
  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  for (const c of build.report.craft) {
    const h = STREET_HOUSES[c.index]
    const along = houseFrame(h).along
    const lean = leanOf(c.index)
    const front = c.front

    type FrontRect = { name: string; s0: number; s1: number; t0: number; t1: number }
    const rects: FrontRect[] = []

    const relevantParts = c.parts.filter(
      (p) =>
        p.name === 'door' ||
        p.name.startsWith('band ') ||
        p.name.startsWith('window ') ||
        (p.name.startsWith('leaf ') && !p.name.endsWith('ink')),
    )

    for (const part of relevantParts) {
      const pos = part.buffer === 'windows' ? build.windows.positions : build.underpaint.positions
      let minS = Infinity, maxS = -Infinity
      let minT = Infinity, maxT = -Infinity
      for (let i = part.from; i < part.to; i++) {
        const vx = pos[i * 3]
        const vy = pos[i * 3 + 1]
        const vz = pos[i * 3 + 2]
        const pUnleaned = new Vector3(
          vx - along.x * lean * vy,
          vy,
          vz - along.z * lean * vy,
        )
        const diff = pUnleaned.clone().sub(front.origin)
        const s = diff.dot(front.u) / front.u.lengthSq()
        const t = diff.dot(front.v) / front.v.lengthSq()
        minS = Math.min(minS, s)
        maxS = Math.max(maxS, s)
        minT = Math.min(minT, t)
        maxT = Math.max(maxT, t)
      }
      rects.push({ name: part.name, s0: minS, s1: maxS, t0: minT, t1: maxT })
    }

    const uLen = front.u.length()
    const vLen = front.v.length()
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const ds = Math.max(0, Math.min(a.s1, b.s1) - Math.max(a.s0, b.s0))
        const dt = Math.max(0, Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0))
        const overlap = ds * uLen * dt * vLen
        assert.ok(overlap <= 1e-9, `${c.owner}: overlap between ${a.name} and ${b.name}: ${overlap} > 1e-9`)
      }
    }
  }
})

test('the levels keep their order', () => {
  assert.ok(STROKE_LIFT + 15 * LIFT_STEP < CRAFT.door.lift, 'strokes below door lift')
  assert.ok(CRAFT.door.lift < OUTLINE_LIFT, 'door lift below outline lift')
  assert.ok(0.0055 < CRAFT.shutter.lift, 'pane below shutter lift')

  const gap1 = CRAFT.door.lift - (STROKE_LIFT + 15 * LIFT_STEP)
  const gap2 = OUTLINE_LIFT - CRAFT.door.lift
  const gap3 = CRAFT.shutter.lift - 0.0055
  assert.ok(gap1 >= 2 * LIFT_STEP, `gap 1 ${gap1} >= ${2 * LIFT_STEP}`)
  assert.ok(gap2 >= 2 * LIFT_STEP, `gap 2 ${gap2} >= ${2 * LIFT_STEP}`)
  assert.ok(gap3 >= 2 * LIFT_STEP, `gap 3 ${gap3} >= ${2 * LIFT_STEP}`)

  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  for (const c of build.report.craft) {
    const h = STREET_HOUSES[c.index]
    const along = houseFrame(h).along
    const lean = leanOf(c.index)
    const front = c.front

    const inkParts = c.parts.filter((p) => p.name.startsWith('leaf ') && p.name.endsWith('ink'))
    for (const part of inkParts) {
      assert.equal(part.buffer, 'outlines')
      for (let i = part.from; i < part.to; i++) {
        const vx = build.outlines.arrays.positions[i * 3]
        const vy = build.outlines.arrays.positions[i * 3 + 1]
        const vz = build.outlines.arrays.positions[i * 3 + 2]
        const pUnleaned = new Vector3(
          vx - along.x * lean * vy,
          vy,
          vz - along.z * lean * vy,
        )
        const lift = pUnleaned.clone().sub(front.origin).dot(front.normal)
        assert.ok(close(lift, CRAFT.shutter.lift + OUTLINE_LIFT, 1e-9), `${c.owner} ${part.name}: vertex ${i} lift ${lift} vs ${CRAFT.shutter.lift + OUTLINE_LIFT}`)
      }
    }

    if (h.type === 'painting') {
      const doorInk = c.parts.find((p) => p.name === 'door ink')
      assert.ok(doorInk, `${c.owner} missing door ink`)
      assert.equal(doorInk.buffer, 'outlines')
      for (let i = doorInk.from; i < doorInk.to; i++) {
        const vx = build.outlines.arrays.positions[i * 3]
        const vy = build.outlines.arrays.positions[i * 3 + 1]
        const vz = build.outlines.arrays.positions[i * 3 + 2]
        const pUnleaned = new Vector3(
          vx - along.x * lean * vy,
          vy,
          vz - along.z * lean * vy,
        )
        const lift = pUnleaned.clone().sub(front.origin).dot(front.normal)
        assert.ok(close(lift, OUTLINE_LIFT, 1e-9), `${c.owner} door ink: vertex ${i} lift ${lift} vs ${OUTLINE_LIFT}`)
      }
    }
  }
})

test("a leaf's ink is cheap", () => {
  const face: StreetFace = {
    origin: new Vector3(0, 0, 0),
    u: new Vector3(1, 0, 0),
    v: new Vector3(0, 1, 0),
    normal: new Vector3(0, 0, 1),
    shape: 'quad',
    kind: 'wall',
    source: 'wallA',
    refHeight: 0.0018 / OUTLINE_FRACTION,
    seed: 1,
    mirror: false,
  }
  const edges: [Vector3, Vector3][] = [[new Vector3(0, 0, 0), new Vector3(0.036, 0, 0)]]
  const ink = new Color(0, 0, 0)
  const capped = outlineFace(face, edges, ink, 42, 5)
  assert.equal(capped.arrays.positions.length / 3, 15, 'five samples x three columns = 15 vertices')
  const uncapped = outlineFace(face, edges, ink, 42)
  assert.ok(uncapped.arrays.positions.length / 3 > 15, `without cap: ${uncapped.arrays.positions.length / 3} > 15`)
})

test("a painting house's eaves overhang 0.03, its rakes 0.015, the church's both 0.015", () => {
  const frame = { centre: new Vector3(0, 0, 0), along: new Vector3(1, 0, 0), toPath: new Vector3(0, 0, 1) }
  const paintingHouses = STREET_HOUSES.filter((h) => h.type === 'painting')
  for (const h of paintingHouses) {
    const craftedEdges = houseRoofEdges(craftShape(h), frame.centre, frame.along, frame.toPath)
    for (const edge of craftedEdges) {
      if (edge.name.endsWith('eave')) {
        for (const p of [edge.corners[0], edge.corners[1]]) {
          assert.ok(close(Math.abs(p.x), h.w / 2 + 0.03, 1e-9), `${h.id} ${edge.name}: |x| ${Math.abs(p.x)} vs ${h.w / 2 + 0.03}`)
        }
      }
      if (edge.name.endsWith('rake')) {
        for (const p of [edge.corners[0], edge.corners[1]]) {
          assert.ok(close(Math.abs(p.z), h.d / 2 + 0.015, 1e-9), `${h.id} ${edge.name}: |z| ${Math.abs(p.z)} vs ${h.d / 2 + 0.015}`)
        }
      }
    }

    const plainEdges = houseRoofEdges({ ...h }, frame.centre, frame.along, frame.toPath)
    for (const edge of plainEdges) {
      if (edge.name.endsWith('eave')) {
        for (const p of [edge.corners[0], edge.corners[1]]) {
          assert.ok(close(Math.abs(p.x), h.w / 2 + 0.015, 1e-9), `${h.id} plain ${edge.name}: |x| ${Math.abs(p.x)} vs ${h.w / 2 + 0.015}`)
        }
      }
      if (edge.name.endsWith('rake')) {
        for (const p of [edge.corners[0], edge.corners[1]]) {
          assert.ok(close(Math.abs(p.z), h.d / 2 + 0.015, 1e-9), `${h.id} plain ${edge.name}: |z| ${Math.abs(p.z)} vs ${h.d / 2 + 0.015}`)
        }
      }
    }
  }

  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  for (let idx = 0; idx < STREET_HOUSES.length; idx++) {
    const h = STREET_HOUSES[idx]
    if (h.type !== 'painting') continue
    const { along } = houseFrame(h)
    const alongUnit = along.clone().normalize()
    const centre = new Vector3(h.x, 0, h.z)
    for (const side of ['left', 'right']) {
      const roof = build.report.faces.find((f) => f.owner === `house-${idx}` && f.name === `${side} roof`)
      assert.ok(roof, `house-${idx} missing ${side} roof`)
      for (const cornerIdx of [0, 1]) {
        const p = roof.corners[cornerIdx]
        const dist = Math.abs(p.clone().sub(centre).dot(alongUnit))
        assert.ok(close(dist, h.w / 2 + 0.03, 1e-9), `house-${idx} ${side} roof corner ${cornerIdx}: dist ${dist} vs ${h.w / 2 + 0.03}`)
      }
    }
  }

  // Church nave
  const cNaveAlong = new Vector3(Math.cos(STREET_CHURCH.nave.yaw), 0, Math.sin(STREET_CHURCH.nave.yaw)).normalize()
  const cNaveCentre = new Vector3(STREET_CHURCH.nave.x, 0, STREET_CHURCH.nave.z)
  for (const side of ['left', 'right']) {
    const roof = build.report.faces.find((f) => f.owner === 'church' && f.name === `${side} roof`)
    assert.ok(roof, `church missing ${side} roof`)
    for (const cornerIdx of [0, 1]) {
      const p = roof.corners[cornerIdx]
      const dist = Math.abs(p.clone().sub(cNaveCentre).dot(cNaveAlong))
      assert.ok(close(dist, STREET_CHURCH.nave.w / 2 + 0.015, 1e-9), `church ${side} roof corner ${cornerIdx}: dist ${dist} vs ${STREET_CHURCH.nave.w / 2 + 0.015}`)
    }
  }
})

test('a soffit under each eave', () => {
  const frame = { centre: new Vector3(0, 0, 0), along: new Vector3(1, 0, 0), toPath: new Vector3(0, 0, 1) }
  const paintingHouses = STREET_HOUSES.filter((h) => h.type === 'painting')
  for (const h of paintingHouses) {
    const soffits = houseSoffits(craftShape(h), frame.centre, frame.along, frame.toPath)
    assert.equal(soffits.length, 2, `${h.id}: two soffits`)
    const edges = houseRoofEdges(craftShape(h), frame.centre, frame.along, frame.toPath)
    for (const soffit of soffits) {
      assert.equal(soffit.kind, 'underside')
      const [c0, c1, c2, c3] = soffit.corners
      assert.ok(close(c0.y, h.eave, 1e-12) && close(c1.y, h.eave, 1e-12), `${h.id} ${soffit.name}: y is eave`)
      assert.ok(close(Math.abs(c0.x), h.w / 2, 1e-12) && close(Math.abs(c1.x), h.w / 2, 1e-12), `${h.id} ${soffit.name}: |x| is w/2`)
      assert.ok(close(Math.abs(c0.z), h.d / 2 + OVERHANG, 1e-12) && close(Math.abs(c1.z), h.d / 2 + OVERHANG, 1e-12), `${h.id} ${soffit.name}: |z| is d/2 + OVERHANG`)
      const side = soffit.name.startsWith('left') ? 'left' : 'right'
      const eaveBand = edges.find((b) => b.name === `${side} eave`)!
      assert.ok(eaveBand, `${h.id}: missing ${side} eave band`)
      assert.ok(c2.distanceTo(eaveBand.corners[2]) < 1e-12, `${h.id} ${soffit.name}: corner 2 matches eave band`)
      assert.ok(c3.distanceTo(eaveBand.corners[3]) < 1e-12, `${h.id} ${soffit.name}: corner 3 matches eave band`)
    }
  }

  const cottages = STREET_HOUSES.filter((h) => h.type === 'cottage')
  for (const h of cottages) {
    const soffits = houseSoffits(craftShape(h), frame.centre, frame.along, frame.toPath)
    assert.equal(soffits.length, 0, `${h.id}: cottage has no soffits`)
  }

  const painting = villagePainting()
  const build = buildStreet(painting, flow, masses, { paint: KEPT_PAINT })
  for (const c of build.report.craft) {
    const h = STREET_HOUSES[c.index]
    if (h.type !== 'painting') continue
    const { along, toPath } = houseFrame(h)
    const centre = new Vector3(h.x, 0, h.z)
    const lean = leanOf(c.index)
    const pureSoffits = houseSoffits(craftShape(h), centre, along, toPath)
    const soffitParts = c.parts.filter((p) => p.name.startsWith('soffit'))
    assert.equal(soffitParts.length, 2, `${c.owner}: two soffit parts`)
    for (const part of soffitParts) {
      assert.equal(part.buffer, 'underpaint')
      const pure = pureSoffits.find((s) => (part.name.endsWith('left') ? s.name.startsWith('left') : s.name.startsWith('right')))!
      assert.ok(pure, `${c.owner} matching pure soffit for ${part.name}`)
      const unleanedCorners: Vector3[] = []
      for (let i = part.from; i < part.to; i++) {
        const vx = build.underpaint.positions[i * 3]
        const vy = build.underpaint.positions[i * 3 + 1]
        const vz = build.underpaint.positions[i * 3 + 2]
        unleanedCorners.push(new Vector3(
          vx - along.x * lean * vy,
          vy,
          vz - along.z * lean * vy,
        ))
      }
      assert.equal(unleanedCorners.length, 4, `${c.owner} ${part.name} 4 vertices`)
      for (let k = 0; k < 4; k++) {
        assert.ok(unleanedCorners[k].distanceTo(pure.corners[k]) < 1e-9, `${c.owner} ${part.name} corner ${k} matches pure`)
      }
    }
  }
})
