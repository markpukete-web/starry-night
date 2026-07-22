import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildCypressLobePlan,
  lobeIntervalsAt,
  type CypressLobeRows,
} from '../src/scene/cypressLobes.ts'

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
