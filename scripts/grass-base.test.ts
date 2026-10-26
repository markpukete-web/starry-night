// The paint under the grass (S3b pass 5): its palette, its GLSL chain and the dab's reach (Consultant F4, F5).
import assert from 'node:assert/strict'
import test from 'node:test'
import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three'
import { GRASS_BASE, grassBaseBody, grassBasePalette } from '../src/scene/grassBase.ts'
import { fogInjection } from '../src/scene/streetFog.ts'
import { material } from '../src/scene/streetMaterial.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

// four dark swatches, one per hue: blue, olive, green, neutral
function fourHues(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  const swatches = [[30, 40, 90, 255], [60, 90, 40, 255], [40, 90, 60, 255], [50, 50, 50, 255]]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(swatches[(x + y) % 4], (y * width + x) * 4)
  return { data, width, height }
}

const ifs = (s: string) => (s.match(/if \(h\.z/g) ?? []).length

test('the palette holds every hue once, its shares sum to 1, every channel in 0..1', () => {
  const palette = grassBasePalette(fourHues())
  assert.equal(palette.length, 4)
  assert.ok(Math.abs(palette.reduce((s, p) => s + p.share, 0) - 1) < 1e-9)
  assert.ok(palette.every((p) => p.colour.every((c) => c >= 0 && c <= 1)))
})

test('the paint chain: one paint is a bare assignment, three are two ifs and one else', () => {
  const one = grassBaseBody([{ colour: [0.1, 0.1, 0.1], share: 1 }]).fragmentBody!
  assert.equal(ifs(one), 0)
  const three = grassBaseBody([
    { colour: [0.1, 0.1, 0.2], share: 0.5 },
    { colour: [0.1, 0.2, 0.1], share: 0.3 },
    { colour: [0.2, 0.2, 0.1], share: 0.2 },
  ]).fragmentBody!
  assert.equal(ifs(three), 2)
  assert.equal((three.match(/else paint/g) ?? []).length, 1)
})

test('the dabs land after the vertex colour and under the ID view', () => {
  const m = material('test-grass-base', grassBaseBody(grassBasePalette(fourHues())), fogInjection('#000000'), false, true)
  const shader: WebGLProgramParametersWithUniforms = {
    vertexShader: ShaderLib.basic.vertexShader,
    fragmentShader: ShaderLib.basic.fragmentShader,
    uniforms: {},
  }
  m.onBeforeCompile(shader, {} as never)
  const fs = shader.fragmentShader
  const dab = fs.indexOf('diffuseColor.rgb = dab')
  assert.equal(fs.split('diffuseColor.rgb = dab').length, 2, 'the dab is set once')
  assert.ok(fs.indexOf('#include <color_fragment>') < dab, 'after the vertex colour')
  assert.ok(dab < fs.indexOf('vec3 idCol'), 'before the ID view overwrites it')
})

test("a dab's farthest point stays inside the 3 × 3 block the fragment visits", () => {
  const B = GRASS_BASE
  assert.ok(0.8 * B.cell + Math.hypot(B.halfLength, B.bend * B.halfWidth) <= 2 * B.cell)
})
