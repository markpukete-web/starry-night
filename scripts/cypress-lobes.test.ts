import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildCypressLobePlan,
  lobeIntervalsAt,
  type CypressLobeRows,
} from '../src/scene/cypressLobes.ts'
import { buildCypressLobeSolid } from '../src/scene/cypressLobeGeometry.ts'

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

  assert.ok(fronds.length >= 2 && fronds.length <= 4)
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
  const screenX = [-Math.sin(bearing), 0, Math.cos(bearing)] as const

  assert.ok(solid.positions.length > 0)
  assert.ok(solid.indices.length > 0)
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
