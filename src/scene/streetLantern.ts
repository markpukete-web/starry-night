import { Color, type MeshBasicMaterial } from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { CYPRESS_STROKE_BODY, strokeGlslWith, type StrokeBody } from './cypressStrokeShader.ts'
import { LIFE } from './streetLife.ts'
import { material } from './streetMaterial.ts'
import { lanternUniform } from './vincent.ts'

/**
 * The ground's and the path's body (pass 4): the cypress's (E4) without its gap discards, with soft lanes, the dry brush
 * only in the last 15% and half the fray. It was aimed at the path's rectangles close to the camera, which turned out
 * to be z-fighting, fixed by the lift levels (`734903f`); whether the ground returns to E4's body is Mark's call.
 */
export const STREET_GROUND_BODY: StrokeBody = { ...CYPRESS_STROKE_BODY, gaps: null, laneEdge: null, dryFrom: 0.85, fray: 0.08 }

/** Vincent's lantern on the street's paint (V1 task 4): the lamps' glow, `gain` at the glass, falling off over `reach`. */
export const LANTERN_GROUND = { reach: 0.05, gain: 1.5 }

type Body = Omit<AliveInjection, 'key' | 'uniforms'>
const glsl = (v: number) => v.toFixed(6)

/**
 * `body` with the lantern's warm lift after its colour, so the fog `material()` adds next takes it as it takes the paint
 * (Decision (j)). `at` is the vertex's place in its model's frame: `position` on the street's meshes, the blade's root
 * and height on the grass. Its strength is `uLantern.w`, 0 until a frame has Vincent.
 */
export function withLantern(body: Body, at = 'position'): Body & Pick<AliveInjection, 'uniforms'> {
  const g = new Color(LIFE.glow).multiplyScalar(LANTERN_GROUND.gain)
  return {
    ...body,
    uniforms: { uLantern: lanternUniform },
    vertexHead: `${body.vertexHead}\nvarying vec3 vLanternAt;`,
    vertexBody: `${body.vertexBody}\nvLanternAt = (modelMatrix * vec4(${at}, 1.0)).xyz;`,
    fragmentHead: `${body.fragmentHead}\nuniform vec4 uLantern;\nvarying vec3 vLanternAt;`,
    fragmentBody: `${body.fragmentBody}
{
  vec3 lanternTo = vLanternAt - uLantern.xyz;
  float lanternLift = uLantern.w * exp(-dot(lanternTo, lanternTo) / ${glsl(LANTERN_GROUND.reach * LANTERN_GROUND.reach)});
  diffuseColor.rgb *= 1.0 + vec3(${glsl(g.r)}, ${glsl(g.g)}, ${glsl(g.b)}) * lanternLift;
}`,
  }
}

/** The ground's strokes. Lit, and not the ID view, they take the lantern. Otherwise the base's program. */
export function groundMaterial(fog: Omit<AliveInjection, 'key'>, ids: boolean, lit: boolean): MeshBasicMaterial {
  const body = strokeGlslWith(STREET_GROUND_BODY)
  return lit && !ids ? material('street-ground-lantern', withLantern(body), fog, true, ids) : material('street-ground', body, fog, true, ids)
}

/** The base under the grass, painted with the bushes' dark dabs (S3b pass 5), with the lantern as the ground has it. */
export function grassBaseMaterial(body: Body, fog: Omit<AliveInjection, 'key'>, ids: boolean, lit: boolean): MeshBasicMaterial {
  return lit && !ids ? material('street-grass-base-lantern', withLantern(body), fog, false, ids) : material('street-grass-base', body, fog, false, ids)
}
