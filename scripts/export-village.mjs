import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rolldown } from 'rolldown'

// Export the actual runtime geometry for Blender inspection; assertions also catch invalid buffers.
// E2 (Codex, plan review F11): the geometry entries are named (`buildVillage` also returns `litMarks`, a number,
// which crashed the old loop). Closure is asserted where it holds (the foliage rows while they exist); the
// village's solid is not a closed volume (its boxes meet the ground open: 240 degenerate triangles and 732
// open edges on 2026-10-21), so it is guarded by those banked counts, which may not grow, and the skin and the
// paint are open cladding by design. `EXPORT_VILLAGE_CONTROL=open-solid` drops one triangle from the solid before
// the checks so the guard is seen to fail.
const directory = process.argv[2] || 'scratch/village-study-2026-10-05'
const control = process.env.EXPORT_VILLAGE_CONTROL || ''
mkdirSync(directory, { recursive: true })
const file = resolve(directory, 'geometry.mjs')
const bundle = await rolldown({ input: 'src/scene/villageGeometry.ts', external: ['three'] })
await bundle.write({ file, format: 'es' })
await bundle.close()
const { buildVillage } = await import(pathToFileURL(file).href)
const meshes = buildVillage(), repeat = buildVillage(), output = {}
const GEOMETRIES = ['solid', 'skin', 'paint', 'foliage']
const CLOSED = ['foliage']
/** the solid's banked edge facts on `main` at b54fd68: a change that opens it fails here */
const BANKED = { solid: { degenerate: 240, open: 732 } }

function edgeFacts(g) {
  const positions = g.attributes.position.array, count = g.attributes.position.count, welded = [], ids = new Map(), edges = new Map()
  for (let i = 0; i < count; i++) {
    const key = Array.from(positions.slice(i * 3, i * 3 + 3)).join(',')
    if (!ids.has(key)) ids.set(key, ids.size)
    welded.push(ids.get(key))
  }
  const index = g.index.array
  let degenerate = 0
  for (let i = 0; i < index.length; i += 3) {
    const a = welded[index[i]], b = welded[index[i + 1]], c = welded[index[i + 2]]
    if (a === b || b === c || a === c) { degenerate++; continue }
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const key = p < q ? `${p},${q}` : `${q},${p}`
      edges.set(key, (edges.get(key) || 0) + 1)
    }
  }
  const open = [...edges.values()].filter(n => n === 1).length
  const nonManifold = [...edges.values()].filter(n => n > 2).length
  return { welded: ids.size, edges: edges.size, degenerate, open, nonManifold }
}

function closedEdges(g, name) {
  // Faces duplicate vertices for independent UVs: weld exact Float32 positions, then require a closed
  // triangle-edge incidence. This does not prove winding or seating.
  const positions = g.attributes.position.array, count = g.attributes.position.count, welded = [], ids = new Map(), edges = new Map()
  for (let i = 0; i < count; i++) {
    const key = Array.from(positions.slice(i * 3, i * 3 + 3)).join(',')
    if (!ids.has(key)) ids.set(key, ids.size)
    welded.push(ids.get(key))
  }
  const index = g.index.array
  for (let i = 0; i < index.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = welded[index[i + j]], b = welded[index[i + (j + 1) % 3]]
    assert.notEqual(a, b, `${name}: collapsed edge`)
    const key = a < b ? `${a},${b}` : `${b},${a}`
    edges.set(key, (edges.get(key) || 0) + 1)
  }
  const open = [...edges.values()].filter(n => n !== 2).length
  assert.equal(open, 0, `${name}: ${open} open or non-manifold edges`)
  console.log(`${name}: ${ids.size} welded positions, ${edges.size} edges; closed edge incidence`)
}

for (const name of GEOMETRIES) {
  const g = meshes[name]
  if (!g) continue
  assert(g.attributes && g.attributes.position, `${name}: not a geometry`)
  if (control === 'open-solid' && name === 'solid') {
    // the control: one triangle gone, the closure check must fail
    const index = g.index.array
    g.setIndex(Array.from(index.slice(0, index.length - 3)))
    console.log('control: one triangle removed from the solid')
  }
  const count = g.attributes.position.count
  assert(count > 0 && g.index.count > 0 && g.index.count % 3 === 0, `${name}: empty/invalid triangles`)
  assert.equal(g.attributes.color.count, count, `${name}: missing vertex colour`)
  for (const [attribute, buffer] of Object.entries(g.attributes)) {
    assert(buffer.array.every(Number.isFinite), `${name}.${attribute}: non-finite values`)
    if (control !== 'open-solid' || name !== 'solid') assert.deepEqual(buffer.array, repeat[name].attributes[attribute].array, `${name}: non-deterministic paint`)
  }
  assert(g.index.array.every(i => i >= 0 && i < count), `${name}: index outside vertex buffer`)
  if (g.attributes.uv) {
    assert.equal(g.attributes.uv.count, count, `${name}: incomplete UVs`)
    assert(g.attributes.uv.array.every(v => v >= 0 && v <= 1), `${name}: UV outside atlas`)
  }
  if (CLOSED.includes(name)) closedEdges(g, name)
  if (BANKED[name]) {
    const facts = edgeFacts(g)
    assert(facts.degenerate <= BANKED[name].degenerate && facts.open <= BANKED[name].open && facts.nonManifold === 0,
      `${name}: ${facts.degenerate} degenerate triangles and ${facts.open} open edges against the banked ${BANKED[name].degenerate} and ${BANKED[name].open}`)
    console.log(`${name}: ${facts.welded} welded positions, ${facts.open} open edges, ${facts.degenerate} degenerate triangles; within the banked counts`)
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
assert.equal(typeof meshes.litMarks, 'number', 'litMarks is the lit window marks count, not a geometry')
writeFileSync(`${directory}/runtime-model.json`, JSON.stringify(output))
