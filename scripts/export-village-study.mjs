import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rolldown } from 'rolldown'

// Export the actual runtime geometry for Blender inspection; assertions also catch invalid buffers.
const directory = 'scratch/village-study-2026-10-05'
mkdirSync(directory, { recursive: true })
const file = resolve(directory, 'geometry.mjs')
const bundle = await rolldown({ input: 'src/scene/villageStudyGeometry.ts', external: ['three'] })
await bundle.write({ file, format: 'es' })
await bundle.close()
const { buildVillageStudy } = await import(pathToFileURL(file).href)
const meshes = buildVillageStudy(), repeat = buildVillageStudy(), output = {}
for (const [name, g] of Object.entries(meshes)) {
  const count = g.attributes.position.count
  assert(count > 0 && g.index.count > 0 && g.index.count % 3 === 0, `${name}: empty/invalid triangles`)
  assert.equal(g.attributes.color.count, count, `${name}: missing vertex colour`)
  for (const [attribute, buffer] of Object.entries(g.attributes)) {
    assert(buffer.array.every(Number.isFinite), `${name}.${attribute}: non-finite values`)
    assert.deepEqual(buffer.array, repeat[name].attributes[attribute].array, `${name}: non-deterministic paint`)
  }
  assert(g.index.array.every(i => i >= 0 && i < count), `${name}: index outside vertex buffer`)
  if (g.attributes.uv) {
    assert.equal(g.attributes.uv.count, count, `${name}: incomplete UVs`)
    assert(g.attributes.uv.array.every(v => v >= 0 && v <= 1), `${name}: UV outside atlas`)
  }
  g.computeBoundingBox()
  assert(g.boundingBox.min.y > -0.1 && g.boundingBox.max.y <= 1.126, `${name}: escaped authored height`)
  output[name] = {
    positions: Array.from(g.attributes.position.array), colours: Array.from(g.attributes.color.array),
    indices: Array.from(g.index.array), uv: g.attributes.uv ? Array.from(g.attributes.uv.array) : null,
    bounds: { min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() },
  }
  console.log(`${name}: ${count} vertices, ${g.index.count / 3} triangles; finite, bounded, deterministic`)
  g.dispose()
  repeat[name].dispose()
}
writeFileSync(`${directory}/runtime-model.json`, JSON.stringify(output))
