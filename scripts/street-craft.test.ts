/** The village's craft (K1 plan, tasks/2026-10-25-village-craft-k1-plan.md). */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Color, SRGBColorSpace, Vector3 } from 'three'
import { moonShade } from '../src/scene/brushForms.ts'
import { frogPlace, FROGS } from '../src/scene/frog.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildFlatPanel, buildStreet, CRAFT, FRAME, KEPT_PAINT } from '../src/scene/streetGeometry.ts'
import { GRASS, grassChunks } from '../src/scene/streetGrass.ts'
import { doorOf, doorStepFoot, houseFrame, STREET_CHURCH, STREET_HOUSES } from '../src/scene/streetLayout.ts'
import { leanOf, lightOf, STREET_LIGHT, wallShade } from '../src/scene/streetLight.ts'
import { OUTLINE_FRACTION, rectUnderpaint, sourceUnderpaint, STREET_MOON_LIFT } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'
const paintingPng = skip ? null : decodePNG(readFileSync(workPainting))

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
