import assert from 'node:assert/strict'
import test from 'node:test'
import { DataTexture, RGFormat, ShaderLib, type WebGLProgramParametersWithUniforms } from 'three'
import { bladeTemplate, bladeVertex } from '../src/scene/grassBlade.ts'
import { buildGrassMaterial, GRASS_BLADE_ARGS } from '../src/scene/grassShader.ts'
import { STREET_MOON } from '../src/scene/streetLight.ts'

test('the grass fogs at the blade\'s own depth', () => {
  const texture = new DataTexture(new Uint8Array(2), 1, 1, RGFormat)
  const rect: [number, number, number, number] = [0, 0, 1, 1]
  const mat = buildGrassMaterial(texture, rect, false, true)

  const shader: WebGLProgramParametersWithUniforms = {
    vertexShader: ShaderLib.basic.vertexShader,
    fragmentShader: ShaderLib.basic.fragmentShader,
    uniforms: {},
  }

  mat.onBeforeCompile(shader, {} as never)

  const vs = shader.vertexShader

  // 1. Exactly one match of /vFogDistance\s*=/
  const fogMatches = Array.from(vs.matchAll(/vFogDistance\s*=/g))
  assert.equal(fogMatches.length, 1, `expected exactly one vFogDistance =, got ${fogMatches.length}`)

  const fogIdx = fogMatches[0].index!
  // Find the line containing vFogDistance =
  const lineStart = vs.lastIndexOf('\n', fogIdx) + 1
  const lineEndIdx = vs.indexOf('\n', fogIdx)
  const lineEnd = lineEndIdx === -1 ? vs.length : lineEndIdx
  const fogLine = vs.slice(lineStart, lineEnd)

  // 2. That line contains transformed
  assert.ok(fogLine.includes('transformed'), `expected fog line to contain 'transformed', got: ${fogLine}`)

  // 3. That line comes after every match of /\btransformed(\.[xyz]+)?\s*[-+*/]?=(?!=)/g
  const assignRegex = /\btransformed(\.[xyz]+)?\s*[-+*/]?=(?!=)/g
  const assignments = Array.from(vs.matchAll(assignRegex))
  assert.ok(assignments.length > 0, 'expected at least one transformed assignment in vertex shader')
  for (const m of assignments) {
    assert.ok(
      fogIdx > m.index!,
      `expected vFogDistance = (index ${fogIdx}) to come after transformed assignment (index ${m.index!}): ${m[0]}`,
    )
  }
})

test('the unlit grass compiles to main\'s program, and the moon gets a cache key of its own (S3b)', async () => {
  const { createHash } = await import('node:crypto')
  const texture = new DataTexture(new Uint8Array(2), 1, 1, RGFormat)
  const rect: [number, number, number, number] = [0, 0, 1, 1]
  const compiled = (ids: boolean, lit: boolean) => {
    const mat = buildGrassMaterial(texture, rect, ids, lit)
    const shader: WebGLProgramParametersWithUniforms = { vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader, uniforms: {} }
    mat.onBeforeCompile(shader, {} as never)
    return { hash: createHash('sha256').update(`${shader.vertexShader}\n//--\n${shader.fragmentShader}`).digest('hex').slice(0, 16), key: mat.customProgramCacheKey() }
  }
  // main 5817279's program, hashed before S3b changed the shader (scratch/hash-grass.ts)
  assert.equal(compiled(false, false).hash, '4b0b48f47e712dbb')
  assert.equal(compiled(true, false).hash, '8c42ee526742c477')
  const lit = compiled(false, true)
  assert.notEqual(lit.hash, '4b0b48f47e712dbb')
  assert.notEqual(lit.key, compiled(false, false).key)
})

test("the moon reads the blade's own arguments: both calls take one argument text (Codex R7)", () => {
  const mat = buildGrassMaterial(new DataTexture(new Uint8Array(2), 1, 1, RGFormat), [0, 0, 1, 1], false, true)
  const shader: WebGLProgramParametersWithUniforms = { vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader, uniforms: {} }
  mat.onBeforeCompile(shader, {} as never)
  const calls = (name: string) => Array.from(shader.vertexShader.matchAll(new RegExp(`\\b${name}\\(([^;]*?)\\)( \\*|;)`, 'g'))).map((m) => m[1])
  assert.deepEqual(calls('grassBladeVertex'), [GRASS_BLADE_ARGS])
  assert.deepEqual(calls('grassMoonFacing'), [`${GRASS_BLADE_ARGS}, uMoon`])
  assert.equal(shader.uniforms.uMoon?.value, STREET_MOON)
})

test("the moon's fragment lights the arch's outer edge, before the stroke body (Codex B3, B4)", () => {
  const mat = buildGrassMaterial(new DataTexture(new Uint8Array(2), 1, 1, RGFormat), [0, 0, 1, 1], false, true)
  const shader: WebGLProgramParametersWithUniforms = { vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader, uniforms: {} }
  mat.onBeforeCompile(shader, {} as never)
  const fs = shader.fragmentShader
  const mixAt = fs.indexOf('diffuseColor.rgb = mix(diffuseColor.rgb, vTopColour')
  assert.ok(mixAt > 0, 'the moon mixes in the fragment')
  assert.ok(mixAt < fs.indexOf('vec3 col = diffuseColor.rgb * relief'), 'before the stroke body, so the bristles shade it')
  // the two selectors as compiled: the GLSL expressions read as JavaScript with abs and sign
  const sideText = shader.vertexShader.match(/vMoonSide = (.*);/)?.[1]
  const outerText = fs.match(/float moonOuter = (.*);/)?.[1]
  assert.ok(sideText && outerText)
  const sideOf = new Function('aCurl', 'aLean', 'position', 'abs', 'sign', `return ${sideText}`)
  const outerOf = new Function('vMoonSide', 'vStroke', `return ${outerText}`)
  const T = bladeTemplate()
  // vStroke.y at each across, from the template the shader draws
  const yAt = (across: -1 | 1) => T.stroke[2 * T.positions.findIndex((_, k) => k % 3 === 0 && T.positions[k] * across > 0) / 3 + 1]
  for (const curl of [1.5, -1.5, 0.6, -0.6, 0]) {
    for (const lean of [0.3, -0.3]) {
      const spec = { x: 0, z: 0, yaw: 0, height: 0.036, halfWidth: 0.003, lean, curl }
      const a = 0.75
      const at = (across: number, t = a) => bladeVertex(spec as never, t, across, [1, 0])
      // the outer edge, found from the geometry alone: away from the arch's turn, or the upper edge of a straight blade
      const [c0, c1, c2] = [at(0, a - 0.01), at(0, a), at(0, a + 0.01)]
      const turn = [c2[0] - 2 * c1[0] + c0[0], c2[1] - 2 * c1[1] + c0[1]]
      const away = (e: number[]) => (curl === 0 ? e[1] - c1[1] : -((e[0] - c1[0]) * turn[0] + (e[1] - c1[1]) * turn[1]))
      const outer: -1 | 1 = away(at(1)) > away(at(-1)) ? 1 : -1
      const side = sideOf(curl, lean, { y: a }, Math.abs, Math.sign)
      assert.equal(outerOf(side, { y: yAt(outer) }), 1, `curl ${curl}, lean ${lean}: the outer edge is lit`)
      assert.equal(outerOf(side, { y: yAt(outer === 1 ? -1 : 1) }), 0, `curl ${curl}, lean ${lean}: the inner edge is not`)
    }
  }
})
