import assert from 'node:assert/strict'
import test from 'node:test'
import { CYPRESS_FLAME_FINS, makeCypressFinOutline } from '../src/scene/cypressFlameGeometry.ts'

test('cypress flame fins are deterministic and front-arc bounded', () => {
  assert.equal(CYPRESS_FLAME_FINS.length, 5)
  for (const fin of CYPRESS_FLAME_FINS) {
    assert.ok(fin.yaw >= -0.42)
    assert.ok(fin.yaw <= 0.42)
    assert.ok(fin.height >= 2.2)
    assert.ok(fin.height <= 3.25)
  }
  assert.deepEqual(makeCypressFinOutline(0), makeCypressFinOutline(0))
})

test('cypress flame outline stays flame-shaped', () => {
  const outline = makeCypressFinOutline(0)
  const bottom = outline.filter((point) => point.y < 0.2)
  const top = outline.filter((point) => point.y > 0.82)
  const bottomWidth = Math.max(...bottom.map((point) => point.x)) - Math.min(...bottom.map((point) => point.x))
  const topWidth = Math.max(...top.map((point) => point.x)) - Math.min(...top.map((point) => point.x))
  assert.ok(bottomWidth > 0.42)
  assert.ok(topWidth < 0.18)
})
