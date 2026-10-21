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
  liftToLobes,
  mapCypressLobeSurface,
  ringsByLobe,
  type CypressLobeSolidOptions,
} from '../src/scene/cypressLobeGeometry.ts'
import { rowSpanAt } from '../src/scene/cypressMapping.ts'
import { ribbonEdges, traceCypressRibbons, CYPRESS_RIBBON_CONFIG } from '../src/scene/cypressStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'

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

test('the lift is continuous across the real plan\'s frond-to-main switch (the offset is along the view, not a switching normal)', () => {
  const { plan, options, rings } = realAssets()
  const frond = plan.lobes.find((lobe) => lobe.kind === 'frond' && lobe.side === 'left')!
  for (const h of [0.35, 0.38]) {
    const interval = lobeIntervalsAt({ ...plan, lobes: [frond] }, h)[0]
    assert.ok(interval, `the left frond spans ${h}`)
    let previous: readonly [number, number, number] | null = null
    let worst = 0
    for (let px = interval.right - 0.01; px <= interval.right + 0.01; px += 1e-4) {
      const lift = liftToLobes(rings, px, h, options, true)
      assert.ok(lift, `a lift at ${px.toFixed(4)}`)
      if (previous) worst = Math.max(worst, Math.hypot(lift.position[0] - previous[0], lift.position[1] - previous[1], lift.position[2] - previous[2]))
      previous = lift.position
    }
    assert.ok(worst < 0.002, `the largest step across the switch at ${h} is ${worst.toFixed(5)}`)
  }
})

test('a draped strip clears the compiled solid across its whole width: no vertex behind a triangle, the overshoot\'s misses allowed', () => {
  const { rows, flow, options, solid, rings } = realAssets()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(solid.positions), 3))
  geometry.setIndex(solid.indices)
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }))
  mesh.updateMatrixWorld()
  const view = new Vector3(...viewOf(options))
  const painting: ImageData2D = { data: new Uint8ClampedArray([40, 60, 30, 255]), width: 1, height: 1 }
  const ribbons = traceCypressRibbons(flow, painting, rows, 24, 0xc1f3a11).slice(0, 20)
  const raycaster = new Raycaster()
  let checked = 0
  let misses = 0
  let worst = -Infinity
  for (const frontFacing of [true, false]) {
    const facing = frontFacing ? 1 : -1
    for (const ribbon of ribbons) {
      const draped = drapeRibbon(ribbon, ribbonEdges(ribbon, flow.width, flow.height, CYPRESS_RIBBON_CONFIG.taper), rings, options, frontFacing, 0.004)
      if (!draped) continue
      for (const vertex of [...draped.left, ...draped.right]) {
        // from far on the vertex's own side of the tree, toward it and on through the solid
        const origin = vertex.clone().addScaledVector(view, facing * 10)
        raycaster.set(origin, view.clone().multiplyScalar(-facing))
        const hit = raycaster.intersectObject(mesh, false)[0]
        checked++
        if (!hit) { misses++; continue }
        worst = Math.max(worst, 10 - hit.distance) // positive: the solid is in front of the vertex
      }
    }
  }
  assert.ok(checked > 2000, `${checked} vertices checked`)
  assert.ok(worst <= 1e-4, `a strip vertex sits ${worst.toFixed(5)} behind the solid`)
  assert.ok(misses < checked * 0.4, `${misses} of ${checked} rays miss the solid (tongues beyond the rim)`)
})
