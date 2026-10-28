// V1 task 4: Vincent's lantern on the ground, the grass's base and the grass. Lit, the term sits before the fog;
// unlit, the programs are the base's byte for byte (`tasks/2026-10-28-vincent-form-plan.md`, Decision (j)).
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { DataTexture, RGFormat, ShaderLib, type MeshBasicMaterial, type WebGLProgramParametersWithUniforms } from 'three'
import { grassBaseBody } from '../src/scene/grassBase.ts'
import { buildGrassMaterial } from '../src/scene/grassShader.ts'
import { FOG, fogInjection } from '../src/scene/streetFog.ts'
import { grassBaseMaterial, groundMaterial } from '../src/scene/streetLantern.ts'
import { lanternUniform } from '../src/scene/vincent.ts'

/** The probe's three paints (`scratch/vincent-form-2026-10-28/slice/probe/lead-v1-unlit-programs.mts`). */
const PAINT = [{ colour: [0.1, 0.12, 0.08], share: 0.5 }, { colour: [0.15, 0.1, 0.05], share: 0.3 }, { colour: [0.2, 0.2, 0.1], share: 0.2 }] as Parameters<typeof grassBaseBody>[0]

function compiled(m: MeshBasicMaterial): { hash: string; key: string; vertex: string; fragment: string; uniforms: Record<string, unknown> } {
  const shader: WebGLProgramParametersWithUniforms = { vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader, uniforms: {} }
  m.onBeforeCompile(shader, {} as never)
  const hash = createHash('sha256').update(`${shader.vertexShader}\n//--\n${shader.fragmentShader}`).digest('hex').slice(0, 16)
  return { hash, key: m.customProgramCacheKey(), vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms }
}

const fog = () => fogInjection(FOG.colour)
const grass = (lit: boolean) => buildGrassMaterial(new DataTexture(new Uint8Array(2), 1, 1, RGFormat), [0, 0, 1, 1], false, lit)

test('the lantern is not in the unlit programs', () => {
  // the base's programs at ed464c9, built as Street.tsx built them (lead-v1-unlit-programs.log)
  const pins = [
    { name: 'ground', m: (ids: boolean, lit: boolean) => groundMaterial(fog(), ids, lit), unlit: '8c785ab6d6495140', ids: '94d1b777fcef5990', key: 'street-ground' },
    { name: 'grass base', m: (ids: boolean, lit: boolean) => grassBaseMaterial(grassBaseBody(PAINT), fog(), ids, lit), unlit: 'd1fe6b0ed3fc628c', ids: 'bf524cfd151ff427', key: 'street-grass-base' },
  ]
  for (const p of pins) {
    const unlit = compiled(p.m(false, false))
    assert.equal(unlit.hash, p.unlit, `${p.name}, unlit`)
    assert.equal(unlit.key, p.key)
    assert.ok(!unlit.fragment.includes('uLantern') && !unlit.vertex.includes('uLantern'), `${p.name}: no lantern unlit`)
    // the ID view's program stays the base's, lit or not: it paints over the colour
    for (const lit of [false, true]) assert.equal(compiled(p.m(true, lit)).hash, p.ids, `${p.name}, IDs, lit ${lit}`)
  }
  assert.ok(!compiled(grass(false)).fragment.includes('uLantern'), 'grass: no lantern unlit')
})

test('the lantern lights before the fog', () => {
  const lit = [
    { name: 'ground', c: compiled(groundMaterial(fog(), false, true)), key: 'street-ground-lantern' },
    { name: 'grass base', c: compiled(grassBaseMaterial(grassBaseBody(PAINT), fog(), false, true)), key: 'street-grass-base-lantern' },
    { name: 'grass', c: compiled(grass(true)), key: '' },
  ]
  for (const { name, c, key } of lit) {
    const fs = c.fragment
    const term = fs.indexOf('lanternLift')
    assert.ok(term > fs.indexOf('#include <color_fragment>'), `${name}: the term after the body's colour`)
    assert.ok(term < fs.indexOf('mix(diffuseColor.rgb, uFogColour'), `${name}: the term before the fog's mix`)
    assert.equal(c.uniforms.uLantern, lanternUniform, `${name}: the one shared uniform`)
    if (key) assert.equal(c.key, key)
  }
})

test('no lantern without Vincent', () => {
  for (const c of [compiled(groundMaterial(fog(), false, true)), compiled(grassBaseMaterial(grassBaseBody(PAINT), fog(), false, true)), compiled(grass(true))]) {
    const line = c.fragment.split('\n').find((l) => l.includes('float lanternLift'))
    assert.ok(line && line.includes('uLantern.w'), `the term's strength is the uniform's w: ${line}`)
  }
})
