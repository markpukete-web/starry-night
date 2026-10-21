/** The island's geometry under node (E2): the root's cladding is banked and kept while the top changes. */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { buildIsland } from '../src/scene/islandGeometry.ts'

/**
 * The root cladding's positions as `main` builds them at `b54fd68` (2,800 dabs, 16,800 vertices), hashed on
 * 2026-10-21 before E2 touched the top. The root is the accepted floating look; the top's dabs go in E2 and the
 * root's random stream must still arrive at exactly these numbers (Codex, E2 plan review F14).
 */
const ROOT_SHA256 = '4a8d69930a02cfe24ce540e0c6ccda27afb44fc0bea35c23f5991af252b91fd8'

test('the island builds under node and its root cladding is byte for byte the banked one', () => {
  const island = buildIsland()
  const root = new Float32Array(island.strokes.positions.slice(island.rootStart * 3))
  assert.equal(root.length / 3, 16800, 'the root\'s 2,800 dabs, six vertices each')
  assert.equal(createHash('sha256').update(Buffer.from(root.buffer)).digest('hex'), ROOT_SHA256)
  assert.ok(island.solid.positions.length > 0 && island.solid.indices.length % 3 === 0)
  assert.ok(island.strokes.indices.every((i) => i >= 0 && i < island.strokes.positions.length / 3))
})
