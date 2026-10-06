import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rolldown } from 'rolldown'

// Export the actual runtime geometry for Blender inspection; assertions also catch invalid buffers.
const directory = process.argv[2] || 'scratch/village-study-2026-10-05'
mkdirSync(directory, { recursive: true })
const file = resolve(directory, 'geometry.mjs')
const bundle = await rolldown({ input: 'src/scene/villageGeometry.ts', external: ['three'] })
await bundle.write({ file, format: 'es' })
await bundle.close()
const { buildVillage } = await import(pathToFileURL(file).href)
const meshes = buildVillage(), repeat = buildVillage(), output = {}
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
  if (name === 'foliage') {
    // Faces duplicate vertices for independent UVs: weld exact Float32 positions, then
    // require a closed triangle-edge incidence. This does not prove winding or seating.
    const positions = g.attributes.position.array, welded = [], ids = new Map(), edges = new Map()
    for (let i = 0; i < count; i++) {
      const key = Array.from(positions.slice(i * 3, i * 3 + 3)).join(',')
      if (!ids.has(key)) ids.set(key, ids.size)
      welded.push(ids.get(key))
    }
    const index = g.index.array
    for (let i = 0; i < index.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = welded[index[i + j]], b = welded[index[i + (j + 1) % 3]]
      assert.notEqual(a, b, 'foliage: collapsed edge')
      const key = a < b ? `${a},${b}` : `${b},${a}`
      edges.set(key, (edges.get(key) || 0) + 1)
    }
    assert([...edges.values()].every(n => n === 2), 'foliage: open or non-manifold edge')
    console.log(`foliage: ${ids.size} welded positions, ${edges.size} edges; closed edge incidence`)
  }
  g.computeBoundingBox()
  assert(g.boundingBox.min.y > -0.1 && g.boundingBox.max.y <= 1.126, `${name}: escaped authored height`)
  output[name] = {
    positions: Array.from(g.attributes.position.array), colours: Array.from(g.attributes.color.array),
    indices: Array.from(g.index.array), uv: g.attributes.uv ? Array.from(g.attributes.uv.array) : null,
    texture: name === 'skin' ? { path: 'public/reference/village-atlas.webp', flipY: true }
      : name === 'foliage' ? { path: 'public/reference/painting.jpg', flipY: false } : null,
    bounds: { min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() },
  }
  console.log(`${name}: ${count} vertices, ${g.index.count / 3} triangles; finite, bounded, deterministic`)
  g.dispose()
  repeat[name].dispose()
}
writeFileSync(`${directory}/runtime-model.json`, JSON.stringify(output))
