/** The diorama's builders under node (audit 2026-11-14, slice B1): the same geometry for less work. */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { foregroundReady, ownPaintingUrl, PAINTING_URL } from '../src/scene/foregroundLoad.ts'
import { buildVillage } from '../src/scene/villageGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

const sha = (array: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }) =>
  createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex')

/**
 * Every attribute's length and bytes as `buildVillage` built them at 5919748, the normal left out: its materials are
 * basic with no environment map, so three's program reads no normal, and the village must keep every other byte.
 */
const VILLAGE = {
  solid: {
    position: [20466, '9b9a6d52fafcd257275c7d6ff6b89af333e2c4342c73c7ba4652f7cd3f821629'],
    color: [20466, 'd9b290b8fccbac20c0b663701e99c17049d7d3f3321506ba821bf4343bf661d5'],
    index: [29898, '97afa5b607c13ca878bf9b3972a7b3af8bb0f551172ebb1d4fae51645392db8d'],
  },
  skin: {
    position: [20286, 'f066a9999e0e7053253efd3c5da9a8613ddf3c50c830d7353598c8e4f815142f'],
    color: [20286, 'ee095d3001b5c7843999dff277e6f052751232cfb8322585da675970f9eed746'],
    uv: [13524, 'f2b071e7fbae8f93fa37fab4f2b4b331f1e7132445957ceab24058c580ca625d'],
    index: [29808, '193933359031f3daaf9dfc59842c1f748129faef55455c3c570a91a72769d2ab'],
  },
  paint: {
    position: [3264, '0ac9b388c7567dae77be0c8ceedb6c2d75c10b6b00cd72ac0220854186c4b4ec'],
    color: [3264, '599437d5ac69d82c3f46d5ae430eeca2f3e108ccc11697fb68c2b411c527c3de'],
    index: [2418, '19183791d3b8ebb7d4f13998b98417c6d9609c8761021dc7147de47b8c82ea2d'],
  },
} as const
const GLOW: readonly [number, string] = [3264, 'd17a9c23da2eafaeafe38f6d3223e0b4b628ba4332071074c646e999580039ea']

for (const glow of [false, true]) {
  test(`the village builds no vertex normals, and keeps every other attribute byte for byte (glow ${glow})`, () => {
    const village = buildVillage({ glow })
    for (const name of ['solid', 'skin', 'paint'] as const) {
      const geometry = village[name]
      assert.equal(geometry.getAttribute('normal'), undefined, `${name}: no normal attribute`)
      const banked: Record<string, readonly [number, string]> = { ...VILLAGE[name] }
      if (glow && name === 'paint') banked.aGlow = GLOW
      const { index: bankedIndex, ...attributes } = banked
      assert.deepEqual(Object.keys(geometry.attributes).sort(), Object.keys(attributes).sort(), `${name}: the attribute set`)
      for (const [attribute, [length, hash]] of Object.entries(attributes)) {
        const array = geometry.getAttribute(attribute).array as Float32Array
        assert.equal(array.length, length, `${name}.${attribute}: length`)
        assert.equal(sha(array), hash, `${name}.${attribute}: bytes`)
      }
      const index = geometry.index!.array as Uint16Array
      assert.equal(index.length, bankedIndex[0], `${name}: index length`)
      assert.equal(sha(index), bankedIndex[1], `${name}: index bytes`)
      geometry.dispose()
    }
  })
}

test('the cypress loads its own painting only when no caller holds one', () => {
  const pixels: ImageData2D = { data: new Uint8ClampedArray(4), width: 1, height: 1 }
  assert.equal(ownPaintingUrl(undefined), PAINTING_URL, 'no caller: the tree loads its own')
  // the diorama owns the load and it has not arrived (or failed): a second load here would keep 8 MB for good
  assert.equal(ownPaintingUrl(null), null, 'the caller owns the load, still pending: the tree loads nothing')
  assert.equal(ownPaintingUrl(pixels), null, 'the caller handed the pixels over')
})

test('the diorama decodes the painting once and hands it to the island and the cypress', () => {
  // a source check: the pieces are .tsx, which node cannot run
  const read = (name: string) => readFileSync(new URL(`../src/scene/${name}`, import.meta.url), 'utf8')
  const diorama = read('Diorama.tsx'), island = read('BrushIsland.tsx'), cypress = read('BrushCypress.tsx')
  assert.equal(diorama.split('useImageData(PAINTING_URL').length - 1, 1, 'the diorama loads the painting once')
  assert.equal(diorama.split('painting={painting}').length - 1, 2, 'and gives it to both pieces')
  assert.ok(!island.includes('painting.jpg') && !island.includes('PAINTING_URL'), 'the island loads no painting of its own')
  assert.ok(cypress.includes('useImageData(ownPaintingUrl(painting)'), 'the cypress asks the rule above before it loads')
})

test('a foreground piece is ready once built, or once a load it waits on has failed', () => {
  // the arrival and the way back from the street wait on both pieces: a failed load never arrives, so without this
  // the opening held for ARRIVAL.readyTimeout, 15 s (audit 2026-11-14, item 7)
  assert.equal(foregroundReady(false, true), true, 'the painting failed: ready at once')
  assert.equal(foregroundReady(true, false), true, 'built')
  assert.equal(foregroundReady(false, false), false, 'still loading')
  const read = (name: string) => readFileSync(new URL(`../src/scene/${name}`, import.meta.url), 'utf8')
  for (const piece of ['BrushIsland.tsx', 'BrushCypress.tsx']) assert.ok(read(piece).includes('readyRef.current = foregroundReady('), `${piece} reports ready through the rule`)
})
