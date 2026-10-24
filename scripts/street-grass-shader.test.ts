import assert from 'node:assert/strict'
import test from 'node:test'
import { DataTexture, RGFormat, ShaderLib, type WebGLProgramParametersWithUniforms } from 'three'
import { buildGrassMaterial } from '../src/scene/grassShader.ts'

test('the grass fogs at the blade\'s own depth', () => {
  const texture = new DataTexture(new Uint8Array(2), 1, 1, RGFormat)
  const rect: [number, number, number, number] = [0, 0, 1, 1]
  const mat = buildGrassMaterial(texture, rect, false)

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
