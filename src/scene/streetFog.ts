import { Color } from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { PALETTE } from './palette.ts'

/** pass 3: near 0.6 and far 1.6 turned the far ground into a flat band of fog at the horizon */
export const FOG = {
  colour: PALETTE.skyHorizon,
  near: 0.8,
  far: 3.5,
} as const

export function fogInjection(
  colour: string = FOG.colour,
  near: number = FOG.near,
  far: number = FOG.far,
): Omit<AliveInjection, 'key'> {
  return {
    uniforms: {
      uFogColour: { value: new Color(colour) },
      uFogNear: { value: near },
      uFogFar: { value: far },
    },
    vertexHead: 'varying float vFogDistance;',
    vertexBody: 'vFogDistance = -(modelViewMatrix * vec4(position, 1.0)).z;',
    fragmentHead: [
      'uniform vec3 uFogColour;',
      'uniform float uFogNear;',
      'uniform float uFogFar;',
      'varying float vFogDistance;',
    ].join('\n'),
    fragmentBody:
      'diffuseColor.rgb = mix(diffuseColor.rgb, uFogColour, smoothstep(uFogNear, uFogFar, vFogDistance));',
  }
}
