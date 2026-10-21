import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildCypressLobePlan,
  lobeIntervalsAt,
  sampleCypressLobe,
  type CypressLobeRows,
} from '../src/scene/cypressLobes.ts'
import {
  buildCypressLobeSolid,
  compiledSectionAt,
  drapeRibbon,
  stepColours,
  liftToLobes,
  mapCypressLobeSurface,
  RIBBON_LIFT,
  ringsByLobe,
  STRIP_COLUMNS,
  type CypressLobeSolidOptions,
} from '../src/scene/cypressLobeGeometry.ts'
import { rowSpanAt } from '../src/scene/cypressMapping.ts'
import { ribbonColumns, traceCypressRibbons, CYPRESS_RIBBON_CONFIG, type CypressRibbon } from '../src/scene/cypressStrokes.ts'
import { makeBrushArrays, pushDrapedRibbon } from '../src/scene/brushForms.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'

function fixtureRows(): CypressLobeRows {
  const satellites = []
  for (let y = 20; y <= 48; y++) satellites.push({ y, x0: 76, x1: 82 })
  return {
    width: 100,
    height: 100,
    spans: [
      [0, 0.44, 0.56],
      [1, 0.25, 0.75],
    ],
    satellites,
  }
}

test('persistent detached paint becomes a connected frond instead of an upper-rim decoration', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })

  assert.equal(plan.lobes[0].kind, 'main')
  assert.equal(plan.lobes.filter((lobe) => lobe.kind === 'frond').length, 1)

  const sourceHeight = 1 - 34 / 99
  const intervals = lobeIntervalsAt(plan, sourceHeight)
  assert.equal(intervals.length, 2)
  assert.ok(
    intervals.some((interval) => interval.left <= 76 / 99 && interval.right >= 82 / 99),
    'the projected lobe plan must contain the detached source interval',
  )

  const frond = plan.lobes.find((lobe) => lobe.kind === 'frond')
  assert.ok(frond)
  assert.ok(
    frond.sections[0].heightFraction < 1 - 48 / 99,
    'the frond must connect below its first detached source row',
  )
})

test('the real plan: two fronds where the painting has them, the painting\'s own extent, the tip\'s club', () => {
  const rows = JSON.parse(
    readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8'),
  ) as CypressLobeRows
  const plan = buildCypressLobePlan(rows)
  const fronds = plan.lobes.filter((lobe) => lobe.kind === 'frond')

  assert.equal(fronds.length, 2)
  // the left flame: 0.38–0.54 of the height on the 3840 px table (E1; it separates from the main column at 0.38
  // there, 0.35 on the 1600 px table whose coarser rows merged later)
  assert.ok(
    fronds.some(
      (lobe) =>
        lobe.sourceHeightRange[0] < 0.4 && lobe.sourceHeightRange[1] > 0.5,
    ),
    'the left flame\'s source track must survive as geometry',
  )
  assert.ok(
    fronds.every((lobe) => lobe.sourceMaxRimDistance <= 3),
    'distant dark sky strokes must not become cypress geometry',
  )

  // the painting's own extent per row: the main span and the satellite runs on it; the plan's union of lobe
  // intervals may not stray beyond it (E1: the old flame envelope put a wedge 13–18 px outside the painting)
  const denominator = Math.max(1, rows.width - 1)
  const satellitesByRow = new Map<number, { x0: number; x1: number }[]>()
  for (const run of rows.satellites) {
    const row = satellitesByRow.get(run.y)
    if (row) row.push(run)
    else satellitesByRow.set(run.y, [run])
  }
  let worst = 0
  for (let k = 1; k < 40; k++) {
    const h = k / 40
    const y = Math.round((1 - h) * (rows.height - 1))
    const span = rows.spans.find(([py]) => Math.round(py * (rows.height - 1)) === y)
    if (!span) continue
    let left = span[1]
    let right = span[2]
    for (const run of satellitesByRow.get(y) ?? []) {
      left = Math.min(left, run.x0 / denominator)
      right = Math.max(right, run.x1 / denominator)
    }
    const intervals = lobeIntervalsAt(plan, h)
    const planLeft = Math.min(...intervals.map((interval) => interval.left))
    const planRight = Math.max(...intervals.map((interval) => interval.right))
    worst = Math.max(worst, left - planLeft, planRight - right)
  }
  assert.ok(worst <= 0.025, `the plan strays ${worst.toFixed(4)} crop widths beyond the painting's extent`)

  // the tip is the spans' own club: no factor narrows the main above 0.9 (the old taper made a 22 px needle of a
  // 36 px club; the source's own top row is narrow, so the bar is the spans, not a ratio)
  const main = plan.lobes[0]
  for (const h of [0.9, 0.93, 0.96, 0.99]) {
    const section = sampleCypressLobe(main, h)
    assert.ok(section)
    const { left, right } = rowSpanAt(1 - h, rows)
    const sourceHalf = Math.max(0.0035, (right - left) / 2)
    assert.ok(
      Math.abs(section.sourceHalfWidth - sourceHalf) <= 0.15 * sourceHalf + 0.002,
      `at ${h} the main is ${section.sourceHalfWidth.toFixed(4)} half-wide against the spans' ${sourceHalf.toFixed(4)}`,
    )
  }
})

test('closed lobe rings project to their source intervals from the design bearing', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })
  const bearing = Math.PI * 0.36
  const solid = buildCypressLobeSolid(plan, {
    bearing,
    height: 2.7,
    sourceToWorld: 0.5,
    sourceAnchor: 0.5,
    radialSegments: 12,
    mainSections: 40,
    sectionsPerHeight: 48,
    depthRatio: 0.42,
  })
  const screenX = [Math.sin(bearing), 0, -Math.cos(bearing)] as const

  assert.ok(solid.positions.length > 0)
  assert.ok(solid.indices.length > 0)
  assert.equal(solid.sourceUvs.length, (solid.positions.length / 3) * 2)
  for (const ring of solid.rings) {
    const projected: number[] = []
    for (let vertex = 0; vertex <= 12; vertex++) {
      const offset = (ring.vertexStart + vertex) * 3
      projected.push(
        solid.positions[offset] * screenX[0] +
          solid.positions[offset + 1] * screenX[1] +
          solid.positions[offset + 2] * screenX[2],
      )
    }
    assert.ok(Math.abs(Math.min(...projected) - ring.projectedLeft) < 1e-6)
    assert.ok(Math.abs(Math.max(...projected) - ring.projectedRight) < 1e-6)
    const first = ring.vertexStart * 3
    const seam = (ring.vertexStart + 12) * 3
    assert.deepEqual(
      solid.positions.slice(first, first + 3),
      solid.positions.slice(seam, seam + 3),
    )
    const rightUv = ring.vertexStart * 2
    const frontUv = (ring.vertexStart + 3) * 2
    const leftUv = (ring.vertexStart + 6) * 2
    assert.ok(
      Math.abs(
        solid.sourceUvs[rightUv] -
          (ring.source.paintCenter + ring.source.paintHalfWidth)
      ) < 1e-6,
    )
    assert.ok(Math.abs(solid.sourceUvs[frontUv] - ring.source.paintCenter) < 1e-6)
    assert.ok(
      Math.abs(
        solid.sourceUvs[leftUv] -
          (ring.source.paintCenter - ring.source.paintHalfWidth)
      ) < 1e-6,
    )
    assert.ok(Math.abs(solid.sourceUvs[rightUv + 1] - (1 - ring.heightFraction)) < 1e-6)
  }
  assert.ok(
    solid.indices.every((index) => index >= 0 && index < solid.positions.length / 3),
  )
  for (let index = 0; index < solid.indices.length; index += 3) {
    const a = solid.indices[index] * 3
    const b = solid.indices[index + 1] * 3
    const c = solid.indices[index + 2] * 3
    const ab = [
      solid.positions[b] - solid.positions[a],
      solid.positions[b + 1] - solid.positions[a + 1],
      solid.positions[b + 2] - solid.positions[a + 2],
    ]
    const ac = [
      solid.positions[c] - solid.positions[a],
      solid.positions[c + 1] - solid.positions[a + 1],
      solid.positions[c + 2] - solid.positions[a + 2],
    ]
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    assert.ok(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2 > 1e-16)
  }
})

test('a frond\'s paint domain is its source domain: no envelope beyond the painting\'s runs', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })
  const frond = plan.lobes.find((lobe) => lobe.kind === 'frond')
  assert.ok(frond)
  const runHalfWidth = (82 - 76 + 1) / 2 / 99
  const chainBase = 1 - 48 / 99
  for (const section of frond.sections) {
    if (section.heightFraction < chainBase - 1e-9) continue
    assert.ok(
      Math.abs(section.paintHalfWidth - section.sourceHalfWidth) < 1e-9 &&
        Math.abs(section.paintCenter - section.sourceCenter) < 1e-9,
      `above the bridge the paint domain equals the source domain at ${section.heightFraction.toFixed(3)}`,
    )
    assert.ok(section.sourceHalfWidth <= runHalfWidth + 0.0035, `no envelope: ${section.sourceHalfWidth.toFixed(4)} half-wide against the runs' ${runHalfWidth.toFixed(4)}`)
    assert.ok(section.paintCenter - section.paintHalfWidth >= 75 / 99 - 1e-9)
    assert.ok(section.paintCenter + section.paintHalfWidth <= 83 / 99 + 1e-9)
  }
})

test('front and back lobe surfaces preserve source x while carrying real camera depth', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })
  const lobe = plan.lobes[1]
  const bearing = Math.PI * 0.36
  const options = {
    bearing,
    height: 2.7,
    sourceToWorld: 0.5,
    sourceAnchor: 0.5,
    radialSegments: 12,
    mainSections: 40,
    sectionsPerHeight: 48,
    depthRatio: 0.42,
  }
  const sample = {
    heightFraction: 0.64,
    lateral: 0.35,
    sourceX: 0,
    sourceY: 0.36,
  }
  const section = lobeIntervalsAt({ ...plan, lobes: [lobe] }, sample.heightFraction)[0]
  assert.ok(section)
  sample.sourceX = section.left + (section.right - section.left) * 0.675
  const front = mapCypressLobeSurface(sampleCypressLobe(lobe, sample.heightFraction)!, sample, options, true)
  const back = mapCypressLobeSurface(sampleCypressLobe(lobe, sample.heightFraction)!, sample, options, false)
  const screenX = [Math.sin(bearing), 0, -Math.cos(bearing)] as const
  const view = [Math.cos(bearing), 0, Math.sin(bearing)] as const
  const project = (point: readonly [number, number, number], axis: typeof screenX) =>
    point[0] * axis[0] + point[1] * axis[1] + point[2] * axis[2]
  const expected = (sample.sourceX - options.sourceAnchor) * options.sourceToWorld

  assert.ok(Math.abs(project(front.position, screenX) - expected) < 1e-6)
  assert.ok(Math.abs(project(back.position, screenX) - expected) < 1e-6)
  assert.ok(project(front.position, view) > 0)
  assert.ok(project(back.position, view) < 0)
})

const FIXTURE_OPTIONS: CypressLobeSolidOptions = {
  bearing: Math.PI * 0.36,
  height: 2.7,
  sourceToWorld: 0.5,
  sourceAnchor: 0.5,
  radialSegments: 12,
  mainSections: 40,
  sectionsPerHeight: 48,
  depthRatio: 0.42,
}
const viewOf = (options: CypressLobeSolidOptions) => [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const
const depthOf = (position: readonly [number, number, number], options: CypressLobeSolidOptions) => {
  const view = viewOf(options)
  return position[0] * view[0] + position[2] * view[2]
}

test('compiledSectionAt is the ring at a ring height, the linear blend between rings, and null outside them', () => {
  const plan = buildCypressLobePlan(fixtureRows(), { minTrackRows: 8, maxFronds: 3 })
  const solid = buildCypressLobeSolid(plan, FIXTURE_OPTIONS)
  const rings = ringsByLobe(solid).get('main')!
  assert.ok(rings.length === FIXTURE_OPTIONS.mainSections + 1)
  const at = compiledSectionAt(rings, rings[5].heightFraction)!
  assert.ok(Math.abs(at.sourceCenter - rings[5].source.sourceCenter) < 1e-12 && Math.abs(at.sourceHalfWidth - rings[5].source.sourceHalfWidth) < 1e-12)
  const mid = (rings[5].heightFraction + rings[6].heightFraction) / 2
  const between = compiledSectionAt(rings, mid)!
  assert.ok(Math.abs(between.sourceHalfWidth - (rings[5].source.sourceHalfWidth + rings[6].source.sourceHalfWidth) / 2) < 1e-12, 'the blend the triangles span')
  assert.equal(compiledSectionAt(rings, rings[rings.length - 1].heightFraction + 0.01), null)
  const frond = ringsByLobe(solid).get('frond-1')!
  assert.equal(compiledSectionAt(frond, frond[0].heightFraction - 0.01), null)
})

test('liftToLobes: on the ellipse inside, the frontmost under two lobes, the rim plane beyond, null past the overshoot, the back mirrored', () => {
  const plan = buildCypressLobePlan(fixtureRows(), { minTrackRows: 8, maxFronds: 3 })
  const solid = buildCypressLobeSolid(plan, FIXTURE_OPTIONS)
  const rings = ringsByLobe(solid)
  const main = rings.get('main')!
  // a height below the frond's root, so the main is the only lobe there and the rim tests read the main's rim
  const h = 0.2
  const section = compiledSectionAt(main, h)!
  const centre = liftToLobes(rings, section.sourceCenter, h, FIXTURE_OPTIONS, true)!
  assert.equal(centre.lobeId, 'main')
  assert.ok(Math.abs(centre.lateral) < 1e-9)
  assert.ok(depthOf(centre.position, FIXTURE_OPTIONS) > 0.01, 'the front of the ellipse comes toward the camera')
  const back = liftToLobes(rings, section.sourceCenter, h, FIXTURE_OPTIONS, false)!
  assert.ok(Math.abs(depthOf(back.position, FIXTURE_OPTIONS) + depthOf(centre.position, FIXTURE_OPTIONS)) < 1e-9, 'the back mirrors the front')
  // beyond the rim within the overshoot: the rim plane (depth 0), the normal toward the camera
  const beyond = liftToLobes(rings, section.sourceCenter + section.sourceHalfWidth * 1.3, h, FIXTURE_OPTIONS, true)!
  assert.ok(Math.abs(depthOf(beyond.position, FIXTURE_OPTIONS)) < 1e-9, 'a tongue lies in the rim plane')
  const view = viewOf(FIXTURE_OPTIONS)
  assert.ok(beyond.normal[0] * view[0] + beyond.normal[2] * view[2] > 0.999, 'and faces the camera')
  assert.ok(Math.abs(beyond.lateral - 1.3) < 1e-9)
  assert.equal(liftToLobes(rings, section.sourceCenter + section.sourceHalfWidth * 1.7, h, FIXTURE_OPTIONS, true), null)
  // under two lobes: the frond's bridge sits inside the main; the lift takes the frontmost of the two
  const frond = rings.get('frond-1')!
  const bridgeH = frond[0].heightFraction + (frond[1].heightFraction - frond[0].heightFraction) * 0.5
  const frondSection = compiledSectionAt(frond, bridgeH)!
  const under = liftToLobes(rings, frondSection.sourceCenter, bridgeH, FIXTURE_OPTIONS, true)!
  const mainPoint = mapCypressLobeSurface(compiledSectionAt(main, bridgeH)!, { heightFraction: bridgeH, lateral: (frondSection.sourceCenter - compiledSectionAt(main, bridgeH)!.sourceCenter) / compiledSectionAt(main, bridgeH)!.sourceHalfWidth, sourceX: frondSection.sourceCenter }, FIXTURE_OPTIONS, true)
  const frondPoint = mapCypressLobeSurface(frondSection, { heightFraction: bridgeH, lateral: 0, sourceX: frondSection.sourceCenter }, FIXTURE_OPTIONS, true)
  assert.ok(depthOf(under.position, FIXTURE_OPTIONS) >= Math.max(depthOf(mainPoint.position, FIXTURE_OPTIONS), depthOf(frondPoint.position, FIXTURE_OPTIONS)) - 1e-9, 'the union\'s front surface')
})

test('treeComponent returns an empty mask for a crop with no tree, not a full one (code review F11)', async () => {
  const { treeComponent: component } = await import('./lib/silhouette.ts')
  const w = 30
  const h = 60
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = 70; rgba[i * 4 + 1] = 90; rgba[i * 4 + 2] = 180; rgba[i * 4 + 3] = 255 }
  const mask = component(rgba, w, 0, 0, w, h, 1)
  assert.equal(mask.data.reduce((sum, v) => sum + v, 0), 0)
})

function realAssets() {
  const rows = JSON.parse(readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8')) as CypressLobeRows & { uv: [number, number, number, number] }
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/cypress-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const plan = buildCypressLobePlan(rows)
  const options: CypressLobeSolidOptions = {
    bearing: Math.PI * 0.36,
    height: 2.7,
    sourceToWorld: (2.7 * rows.width) / rows.height,
    sourceAnchor: sampleCypressLobe(plan.lobes[0], 0.08)?.sourceCenter ?? 0.5,
    radialSegments: 12,
    mainSections: 96,
    sectionsPerHeight: 72,
    depthRatio: 0.42,
  }
  const solid = buildCypressLobeSolid(plan, options)
  return { rows, flow, plan, options, solid, rings: ringsByLobe(solid) }
}

test('at a frond-to-main surface crossing the view offset does not jump and the old offset along the switching normal does', () => {
  const { plan, options, rings } = realAssets()
  const frond = plan.lobes.find((lobe) => lobe.kind === 'frond' && lobe.side === 'left')!
  const distance = (p: readonly number[], q: readonly number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
  let crossings = 0
  for (const h of [0.33, 0.35, 0.37, 0.39, 0.41, 0.44]) {
    const interval = lobeIntervalsAt({ ...plan, lobes: [frond] }, h)[0]
    if (!interval) continue
    // the first lobe switch within the frond's reach, then the crossing bisected to 1e-12
    let previous = ''
    let switchAt: number | null = null
    for (let px = interval.left - 0.05; px <= interval.right + 0.05; px += 1e-3) {
      const lift = liftToLobes(rings, px, h, options, true)
      if (!lift) continue
      if (previous && lift.lobeId !== previous) { switchAt = px; break }
      previous = lift.lobeId
    }
    if (switchAt === null) continue
    let a = switchAt - 1e-3
    let b = switchAt
    const lobeA = liftToLobes(rings, a, h, options, true)!.lobeId
    const lobeB = liftToLobes(rings, b, h, options, true)!.lobeId
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2
      if (liftToLobes(rings, m, h, options, true)!.lobeId === lobeA) a = m
      else b = m
    }
    const onA = liftToLobes(new Map([[lobeA, rings.get(lobeA)!]]), a, h, options, true)!
    const onB = liftToLobes(new Map([[lobeB, rings.get(lobeB)!]]), a, h, options, true)!
    // only a crossing of two surfaces counts: beyond both rims the lift is the rim plane either way and the normals agree
    if (Math.abs(onA.lateral) > 1 || Math.abs(onB.lateral) > 1) continue
    crossings++
    // the runtime path: a ribbon whose samples straddle the crossing, draped by `drapeRibbon` itself; its emitted
    // centre column must not step more than the samples' own spacing across the switch
    const epsilon = 2e-5
    const straddle: CypressRibbon = {
      samples: [-2, -1, 0, 1, 2].map((k) => ({ px: a + k * epsilon, py: 1 - h, inside: true })),
      seedSample: null as unknown as CypressRibbon['seedSample'],
      colour: [0, 0, 0],
      halfWidth: 0.004,
      relief: 1,
      seed: 1,
    }
    straddle.seedSample = straddle.samples[2]
    const draped = drapeRibbon(straddle, ribbonColumns(straddle, 1000, 1000, 1, STRIP_COLUMNS), rings, options, true, RIBBON_LIFT)
    assert.ok(draped && draped.kept.length === 5, 'the straddling ribbon drapes whole')
    const centre = (STRIP_COLUMNS - 1) / 2
    let worstEmitted = 0
    for (let k = 1; k < draped.steps.length; k++) worstEmitted = Math.max(worstEmitted, draped.steps[k][centre].distanceTo(draped.steps[k - 1][centre]))
    assert.ok(worstEmitted < epsilon * options.sourceToWorld * 2 + 1e-6, `the drape's emitted centre steps ${worstEmitted.toExponential(2)} across the crossing at ${h}`)
    // the control, computed as the old runtime did: the same two surfaces offset along their own normals jump
    const oldJump = distance(onA.position.map((v, i) => v + onA.normal[i] * RIBBON_LIFT), onB.position.map((v, i) => v + onB.normal[i] * RIBBON_LIFT))
    assert.ok(oldJump > 1e-3, `the control: the normal offset jumps ${oldJump.toExponential(2)} at the crossing at ${h}`)
  }
  assert.ok(crossings >= 1, 'at least one surface crossing of the left frond and the main on the shipped plan')
})

/** The emitted triangles' centroids (the corners sit on the lifted surface by construction; the interiors are the question). */
function stripTriangles(draped: { steps: Vector3[][]; kept: unknown[] }) {
  const arr = makeBrushArrays()
  pushDrapedRibbon(arr, draped.steps, draped.kept.map(() => new Color(1, 1, 1)))
  const points: Vector3[] = []
  for (let i = 0; i < arr.indices.length; i += 3) {
    const corner = (n: number) => new Vector3(arr.positions[arr.indices[i + n] * 3], arr.positions[arr.indices[i + n] * 3 + 1], arr.positions[arr.indices[i + n] * 3 + 2])
    points.push(corner(0).add(corner(1)).add(corner(2)).multiplyScalar(1 / 3))
  }
  return points
}

test('a draped strip clears the compiled solid across its whole width on both batches, vertices and triangle centroids, and a flat two-column strip does not', () => {
  const { rows, flow, options, solid, rings } = realAssets()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(solid.positions), 3))
  geometry.setIndex(solid.indices)
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }))
  mesh.updateMatrixWorld()
  const view = new Vector3(...viewOf(options))
  const painting: ImageData2D = { data: new Uint8ClampedArray([40, 60, 30, 255]), width: 1, height: 1 }
  const front = traceCypressRibbons(flow, painting, rows, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11)
  const back = traceCypressRibbons(flow, painting, rows, Math.round(CYPRESS_RIBBON_CONFIG.frontCount * CYPRESS_RIBBON_CONFIG.backShare), 0xbacc51de)
  // every sixth ribbon of each batch, plus the two the confirmation read named as the worst (front 244, back 66)
  const pick = (batch: CypressRibbon[], named: number) => batch.filter((_, i) => i % 6 === 0 || i === named)
  const raycaster = new Raycaster()
  const probe = (columns: number, lift: number) => {
    let checked = 0
    let misses = 0
    let worst = -Infinity
    for (const [frontFacing, ribbons] of [[true, pick(front, 244)], [false, pick(back, 66)]] as const) {
      const facing = frontFacing ? 1 : -1
      for (const ribbon of ribbons) {
        const draped = drapeRibbon(ribbon, ribbonColumns(ribbon, flow.width, flow.height, CYPRESS_RIBBON_CONFIG.taper, columns), rings, options, frontFacing, lift)
        if (!draped) continue
        for (const point of stripTriangles(draped)) {
          const origin = point.clone().addScaledVector(view, facing * 10)
          raycaster.set(origin, view.clone().multiplyScalar(-facing))
          const hit = raycaster.intersectObject(mesh, false)[0]
          checked++
          if (!hit) { misses++; continue }
          worst = Math.max(worst, 10 - hit.distance) // positive: the solid is in front of the point
        }
      }
    }
    return { checked, misses, worst }
  }
  // the bar: half a pixel at the design camera (the tree's 2.7 world units span 578 px there, 0.0047 per px)
  const halfPixel = 0.0023
  const runtime = probe(STRIP_COLUMNS, RIBBON_LIFT)
  assert.ok(runtime.checked > 30000, `${runtime.checked} centroids checked`)
  assert.ok(runtime.worst <= halfPixel, `a triangle centroid sits ${runtime.worst.toFixed(5)} behind the solid with ${STRIP_COLUMNS} columns and the rim lift`)
  assert.ok(runtime.misses < runtime.checked * 0.4, `${runtime.misses} of ${runtime.checked} rays miss the solid (tongues beyond the rim)`)
  // the control: a flat strip between two lifted edges has triangle interiors inside the curved lobe
  const two = probe(2, RIBBON_LIFT)
  assert.ok(two.worst > 0.003, `the control: a two-column strip's worst point is ${two.worst.toFixed(5)} behind the solid`)
})

test('drapeRibbon: a seed that fails the lift yields no run, a sample failing above the seed ends it, one failing below restarts it', () => {
  const { flow, options, rings } = realAssets()
  const main = rings.get('main')!
  const top = main[main.length - 1].heightFraction
  const section = compiledSectionAt(main, top - 0.02)!
  const sample = (h: number, px: number) => ({ px, py: 1 - h, inside: true })
  // a seed above the rings' top: no lift for the seed, no run, although the samples below it would lift
  const seedless: CypressRibbon = {
    samples: [sample(top - 0.03, section.sourceCenter), sample(top - 0.015, section.sourceCenter), sample(top + 0.01, section.sourceCenter), sample(top + 0.02, section.sourceCenter)],
    seedSample: null as unknown as CypressRibbon['seedSample'],
    colour: [0, 0, 0],
    colours: [],
    halfWidth: 0.01,
    relief: 1,
    seed: 1,
  }
  seedless.seedSample = seedless.samples[2]
  assert.equal(drapeRibbon(seedless, ribbonColumns(seedless, flow.width, flow.height, 1, 5), rings, options, true, 0.004), null)
  // a seed inside, samples above it running out: the run ends at the last lift
  const ending: CypressRibbon = { ...seedless, samples: [sample(top - 0.04, section.sourceCenter), sample(top - 0.03, section.sourceCenter), sample(top - 0.02, section.sourceCenter), sample(top + 0.01, section.sourceCenter), sample(top + 0.02, section.sourceCenter)], seedSample: null as unknown as CypressRibbon['seedSample'] }
  ending.seedSample = ending.samples[1]
  const endingRun = drapeRibbon(ending, ribbonColumns(ending, flow.width, flow.height, 1, 5), rings, options, true, 0.004)
  assert.ok(endingRun && endingRun.kept.length === 3, 'three samples kept, the seed among them')
  // a sample failing below the seed restarts the run at the seed
  const restarting: CypressRibbon = { ...seedless, samples: [sample(top + 0.02, section.sourceCenter), sample(top - 0.04, section.sourceCenter), sample(top - 0.03, section.sourceCenter), sample(top - 0.02, section.sourceCenter)], seedSample: null as unknown as CypressRibbon['seedSample'] }
  restarting.seedSample = restarting.samples[2]
  const restarted = drapeRibbon(restarting, ribbonColumns(restarting, flow.width, flow.height, 1, 5), rings, options, true, 0.004)
  assert.ok(restarted && restarted.kept.length === 3 && Math.abs(restarted.kept[0].h - (top - 0.04)) < 1e-9, 'the run restarts at the first lift after the failure and holds the seed')
})

test('E3: the drape names the kept run\'s first sample, and stepColours lines the per-sample colours up with the steps through a prefix reset and a suffix trim (Codex E3 F2)', () => {
  const { flow, options, rings } = realAssets()
  const main = rings.get('main')!
  const top = main[main.length - 1].heightFraction
  const section = compiledSectionAt(main, top - 0.02)!
  const sample = (h: number, px: number) => ({ px, py: 1 - h, inside: true })
  const distinct = (n: number): [number, number, number][] => Array.from({ length: n }, (_, k) => [(k + 1) / 10, (k + 1) / 20, (k + 1) / 30])
  // a prefix of two samples above the rings' top fails and resets the run, the seed and two more lift, two more above fail (a suffix trim)
  const ribbon: CypressRibbon = {
    samples: [sample(top + 0.02, section.sourceCenter), sample(top + 0.01, section.sourceCenter), sample(top - 0.05, section.sourceCenter), sample(top - 0.04, section.sourceCenter), sample(top - 0.03, section.sourceCenter), sample(top + 0.01, section.sourceCenter), sample(top + 0.02, section.sourceCenter)],
    seedSample: null as unknown as CypressRibbon['seedSample'],
    colour: [0, 0, 0],
    colours: distinct(7),
    halfWidth: 0.01,
    relief: 1,
    seed: 1,
  }
  ribbon.seedSample = ribbon.samples[3]
  const draped = drapeRibbon(ribbon, ribbonColumns(ribbon, flow.width, flow.height, 1, 5), rings, options, true, 0.004)!
  assert.ok(draped, 'a run')
  assert.equal(draped.firstSample, 2, 'the run starts after the failed prefix')
  assert.equal(draped.kept.length, 3, 'the seed and its two neighbours, the suffix trimmed')
  assert.deepEqual(stepColours(ribbon, draped), ribbon.colours.slice(2, 5), 'the colours of exactly the kept samples, in order')
  // the emitted vertices carry them per step
  const arrays = makeBrushArrays()
  pushDrapedRibbon(arrays, draped.steps, stepColours(ribbon, draped).map(([r, g, b]) => new Color(r, g, b)))
  const columns = draped.steps[0].length
  for (let step = 0; step < 3; step++) {
    for (let j = 0; j < columns; j++) {
      const v = (step * columns + j) * 3
      assert.ok(Math.abs(arrays.colors[v] - ribbon.colours[2 + step][0]) < 1e-6, `step ${step} column ${j} carries sample ${2 + step}'s colour`)
    }
  }
})
