import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three'
import type { BrushArrays } from './brushForms.ts'
import { type AliveInjection, concatInjections, injectAlive } from './aliveMaterial.ts'
import { FOG } from './streetFog.ts'

export function plainGeometry(a: BrushArrays, cls?: number[] | number): BufferGeometry {
  const g = new BufferGeometry()
  const vertices = a.positions.length / 3
  g.setAttribute('position', new BufferAttribute(new Float32Array(a.positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(a.colors), 3))
  if (cls !== undefined) {
    const clsArr = typeof cls === 'number' ? new Float32Array(vertices).fill(cls) : new Float32Array(cls)
    g.setAttribute('aClass', new BufferAttribute(clsArr, 1))
  }
  g.setIndex(a.indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

export const NO_INJECTION = { uniforms: {}, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }

export function idInjection(threshold = FOG.near + 0.6 * (FOG.far - FOG.near)): Omit<AliveInjection, 'key'> {
  return {
    uniforms: {
      uFogThreshold: { value: threshold },
    },
    vertexHead: 'attribute float aClass;\nvarying float vClass;',
    vertexBody: 'vClass = aClass;',
    fragmentHead: [
      'uniform float uFogThreshold;',
      'varying float vClass;',
    ].join('\n'),
    fragmentBody: [
      'if (diffuseColor.a < 0.5) discard;',
      'int c = int(vClass + 0.5);',
      'vec3 idCol = vec3(0.0);',
      'if (c == 0) idCol = vec3(1.0, 0.0, 0.0);',
      'else if (c == 1) idCol = vec3(0.0, 1.0, 0.0);',
      'else if (c == 2) idCol = vec3(0.0, 0.0, 1.0);',
      'else if (c == 3) idCol = vec3(1.0, 1.0, 0.0);',
      'else if (c == 4) idCol = vec3(0.0, 1.0, 1.0);',
      'else if (c == 5) idCol = vec3(1.0, 0.0, 1.0);',
      'else if (c == 6) idCol = vec3(1.0, 128.0 / 255.0, 0.0);',
      'else if (c == 7) idCol = vec3(128.0 / 255.0, 0.0, 1.0);',
      'else if (c == 8) idCol = vec3(128.0 / 255.0, 1.0, 0.0);',
      'else idCol = vec3(0.0, 0.0, 0.0);',
      'if (vFogDistance > uFogThreshold) {',
      '  idCol = vec3(1.0, 1.0, 1.0);',
      '}',
      'diffuseColor.rgb = idCol;',
      'diffuseColor.a = 1.0;',
    ].join('\n'),
  }
}

export function material(
  key: string,
  body: Omit<AliveInjection, 'key' | 'uniforms'> | null,
  fog: Omit<AliveInjection, 'key'>,
  stroke: boolean,
  ids: boolean,
  extra?: Omit<AliveInjection, 'key'>,
): MeshBasicMaterial {
  const m = new MeshBasicMaterial(
    stroke
      ? { vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 }
      : { vertexColors: true, toneMapped: false, side: DoubleSide },
  )
  const parts: Omit<AliveInjection, 'key'>[] = [body ? { uniforms: {}, ...body } : NO_INJECTION, fog]
  if (extra) parts.push(extra)
  if (ids) parts.push(idInjection())
  injectAlive(m, concatInjections(ids ? `${key}-ids` : key, ...parts))
  return m
}
