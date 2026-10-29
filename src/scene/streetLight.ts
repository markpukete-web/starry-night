import { Vector3 } from 'three'
import { smooth, type BrushArrays } from './brushForms.ts'
import { MOON_UV, uvToFrontDir } from './skyMapping.ts'
import type { StreetFace } from './streetStrokes.ts'

/**
 * The street's light (S1b task 4, moved unchanged in value from the spike `2278cc5`, Mark: "Better"). The sky's moon,
 * world-fixed under G5, lights the walls and the roofs, and the side away from it falls to `ambient`. A wall darkens
 * toward the ground, at its corners and under its eaves. Each house leans a little its own way. `lit` false is the dev
 * flag `light=0`: the palette gate compares a source's mean to the painting's unlit mean, so its captures run unlit.
 */
export const STREET_LIGHT: StreetLight = { ambient: 0.4, key: 0.9 }
export const STREET_MOON: Vector3 = uvToFrontDir(MOON_UV[0], MOON_UV[1])

export type StreetLight = { ambient: number; key: number; max?: number }

/**
 * The church's walls (`tasks/2026-10-25-street-church-plan.md` (c)): the painting's church is its palest building, and
 * the street's light left its gable at 0.4 from stop 4, the stop built to look at it. The key is the street's, so its
 * faces keep their order. `max` keeps a moonlit face at its paint and no brighter. Its roofs keep the street's light.
 * Look pass 1: 0.7 → 0.8, the plaster's L p50 41 → 44 at stop 4 against the painting's 52. Above about 0.81 the
 * moonlit side reaches `max` and the two walls stop 4 sees lose their step.
 */
export const CHURCH_LIGHT: StreetLight = { ambient: 0.81, key: 0.9, max: 1 }

export function lightOf(face: StreetFace, lit = true, light: StreetLight = STREET_LIGHT): number {
  if (!lit || (face.kind !== 'wall' && face.kind !== 'roof')) return 1
  return Math.min(light.max ?? Infinity, light.ambient + light.key * Math.max(0, face.normal.dot(STREET_MOON)))
}

/** A wall's ambient shadow (Mark: "the house feels like a cardboard"). Walls standing on the ground only. */
export function wallShade(face: StreetFace, x: number, y: number, z: number, lit = true): number {
  if (!lit || face.kind !== 'wall' || face.shape !== 'quad' || face.origin.y > 0.01) return 1
  const rel = new Vector3(x, y, z).sub(face.origin)
  const s = rel.dot(face.u) / face.u.lengthSq()
  const t = rel.dot(face.v) / face.v.lengthSq()
  // church slice 1, look pass 4 (`scratch/church-animals-2026-10-29/t5/looks.md`, departure P7): the church's two tones
  // take no foot shadow. The painting's church has none, and with it the moonlit wall read L 42 against its source's
  // 50 after every lever the design names (the underpaint quad interpolates 0.5 to 0.75 of its mean). Every house keeps it
  const church = face.source === 'churchLit' || face.source === 'churchShade'
  const ground = church ? 1 : 0.5 + 0.5 * smooth(0, 0.5, t)
  const eaves = 1 - 0.25 * smooth(0.8, 1, t)
  // look pass 2: nor the corner term (the design's own lever, (e))
  const corner = church ? 1 : 0.78 + 0.22 * smooth(0, 0.14, Math.min(s, 1 - s))
  return ground * eaves * corner
}

/** Shade the vertices a face added from `from` on. */
export function shadeNew(arr: BrushArrays, from: number, face: StreetFace, lit = true): void {
  for (let i = from; i < arr.positions.length; i += 3) {
    const k = wallShade(face, arr.positions[i], arr.positions[i + 1], arr.positions[i + 2], lit)
    arr.colors[i] *= k
    arr.colors[i + 1] *= k
    arr.colors[i + 2] *= k
  }
}

/** The lean's range: a house shears by `leanOf(i) × y` along its width, at most about 2.6° either way. */
export const HOUSE_LEAN = 0.09

/** A house's lean; index 100 is the church, which stands straight. */
export function leanOf(index: number): number {
  return index === 100 ? 0 : (((index * 0.618 + 0.31) % 1) - 0.5) * HOUSE_LEAN
}
