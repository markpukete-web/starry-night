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
  mapCypressLobeSurface,
} from '../src/scene/cypressLobeGeometry.ts'
import { generateCypressLobeStrokes } from '../src/scene/cypressLobeStrokes.ts'

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

test('the real plan retains the strongest mid-height frond that the old top-third filter deleted', () => {
  const rows = JSON.parse(
    readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8'),
  ) as CypressLobeRows
  const plan = buildCypressLobePlan(rows)
  const fronds = plan.lobes.filter((lobe) => lobe.kind === 'frond')

  assert.equal(fronds.length, 2)
  assert.ok(
    fronds.some(
      (lobe) =>
        lobe.sourceHeightRange[0] < 0.36 && lobe.sourceHeightRange[1] > 0.5,
    ),
    'the 112-row mid-height source track must survive as geometry',
  )
  assert.ok(
    fronds.every((lobe) => lobe.sourceMaxRimDistance <= 3),
    'distant dark sky strokes must not become cypress geometry',
  )
  assert.ok(
    fronds.every(
      (lobe) => Math.max(...lobe.sections.map((section) => section.sourceHalfWidth)) >= 0.1,
    ),
    'major source fronds need a flame envelope, not needle-width run geometry',
  )
  const main = plan.lobes[0]
  const nearTip = lobeIntervalsAt({ ...plan, lobes: [main] }, 0.95)[0]
  const tip = lobeIntervalsAt({ ...plan, lobes: [main] }, 1)[0]
  assert.ok(tip.right - tip.left < (nearTip.right - nearTip.left) * 0.35)
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

test('frond geometry can broaden without sampling the surrounding blue sky', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })
  const frond = plan.lobes.find((lobe) => lobe.kind === 'frond')
  assert.ok(frond)
  const sourceHeight = 1 - 34 / 99
  const section = frond.sections.reduce((closest, candidate) =>
    Math.abs(candidate.heightFraction - sourceHeight) <
    Math.abs(closest.heightFraction - sourceHeight)
      ? candidate
      : closest,
  )

  assert.ok(
    section.sourceHalfWidth > section.paintHalfWidth,
    'the lobe envelope may be broad, but its texture domain must remain on source paint',
  )
  assert.ok(section.paintCenter - section.paintHalfWidth >= 75 / 99)
  assert.ok(section.paintCenter + section.paintHalfWidth <= 83 / 99)
})

test('multi-scale source strokes stay inside their owning lobe and paint every frond', () => {
  const plan = buildCypressLobePlan(fixtureRows(), {
    minTrackRows: 8,
    maxFronds: 3,
  })
  const options = {
    seed: 0xc1f3,
    structuralCount: 80,
    fillCount: 160,
    structuralLength: 0.3,
    fillLength: 0.14,
    structuralSteps: 19,
    fillSteps: 11,
    reliefSpread: 0.04,
  }
  const strokes = generateCypressLobeStrokes(plan, options)

  assert.deepEqual(strokes, generateCypressLobeStrokes(plan, options))
  assert.ok(plan.lobes.every((lobe) => strokes.some((stroke) => stroke.lobeId === lobe.id)))
  for (const stroke of strokes) {
    const lobe = plan.lobes.find((candidate) => candidate.id === stroke.lobeId)
    assert.ok(lobe)
    for (const sample of stroke.samples) {
      const interval = lobeIntervalsAt(
        { ...plan, lobes: [lobe] },
        sample.heightFraction,
      )[0]
      assert.ok(interval)
      assert.ok(sample.sourceX >= interval.left - 1e-6)
      assert.ok(sample.sourceX <= interval.right + 1e-6)
      const section = sampleCypressLobe(lobe, sample.heightFraction)
      assert.ok(section)
      assert.ok(sample.paintX >= section.paintCenter - section.paintHalfWidth - 1e-6)
      assert.ok(sample.paintX <= section.paintCenter + section.paintHalfWidth + 1e-6)
    }
  }
  const medianSpan = (scale: 'structural' | 'fill') => {
    const spans = strokes
      .filter((stroke) => stroke.scale === scale)
      .map(
        (stroke) =>
          stroke.samples[stroke.samples.length - 1].heightFraction -
          stroke.samples[0].heightFraction,
      )
      .sort((a, b) => a - b)
    return spans[Math.floor(spans.length / 2)]
  }
  assert.ok(medianSpan('structural') > medianSpan('fill') * 1.6)
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
  const front = mapCypressLobeSurface(lobe, sample, options, true)
  const back = mapCypressLobeSurface(lobe, sample, options, false)
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
