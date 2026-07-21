import { Color, Vector3 } from 'three'

/**
 * Shared kit for authored Van-Gogh-brushstroke forms. Every foreground form is a real closed 3D
 * volume CLAD in oriented brush quads: coherent directional impasto strokes (not smooth mesh, which
 * reads as a toy), coloured from the derived palette, lit by the moon so the form models in the
 * night. The stroke DIRECTION is the whole game — coherent flow reads as brushwork; incoherent reads
 * as fur. See docs/superpowers/plans/2026-07-09-authored-brushstroke-forms.md.
 */

/** World direction to the moon (upper-right, toward camera-ish) — matches the painting's key light. */
export const MOON_DIR = new Vector3(4, 6, 3).normalize()

// deterministic value noise (stable across rerenders; never Math.random, or forms reshuffle on HMR)
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}
export function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/** How lit a surface normal is by the moon: 0 (facing away) → 1 (facing the moon). */
export function moonShade(normal: Vector3): number {
  return Math.max(0, normal.dot(MOON_DIR))
}

export type BrushArrays = { positions: number[]; colors: number[]; indices: number[] }

export function makeBrushArrays(): BrushArrays {
  return { positions: [], colors: [], indices: [] }
}

const _tan = new Vector3()
const _nrm = new Vector3()
const _bit = new Vector3()
const _corner = new Vector3()

// a tapered brush mark: pointed ends, full-width middle (a lens/leaf, not a rectangle — a rectangle
// reads as a tile/voxel; the taper reads as a brushstroke). Perimeter order, CCW:
//   0 near tip · 1 (-mid,+W) · 2 (+mid,+W) · 3 far tip · 4 (+mid,-W) · 5 (-mid,-W)
const _MID = 0.38 // fraction of the length at which the stroke reaches full width
const _ENDS = [-1, -_MID, _MID, 1, _MID, -_MID]
const _SIDES = [0, 1, 1, 0, -1, -1]

/**
 * Append one tapered brush mark. `tangent` is the stroke's long axis (its flow direction); `normal`
 * is the surface normal (also the direction the mark lifts proud of the surface). The far half is
 * darkened slightly so overlapping marks read as impasto ridges. `tangent`/`normal` need not be
 * pre-normalised or pre-orthogonal.
 */
export function pushBrush(
  arr: BrushArrays,
  center: Vector3,
  tangent: Vector3,
  normal: Vector3,
  halfLen: number,
  halfWid: number,
  color: Color,
): void {
  _nrm.copy(normal).normalize()
  _tan.copy(tangent).addScaledVector(_nrm, -_nrm.dot(tangent)).normalize() // flow projected to tangent plane
  if (_tan.lengthSq() < 1e-6) return
  _bit.crossVectors(_nrm, _tan).normalize()

  const base = arr.positions.length / 3
  const tip = new Color()
  for (let i = 0; i < 6; i++) {
    _corner
      .copy(center)
      .addScaledVector(_tan, _ENDS[i] * halfLen)
      .addScaledVector(_bit, _SIDES[i] * halfWid)
    arr.positions.push(_corner.x, _corner.y, _corner.z)
    tip.copy(color)
    if (_ENDS[i] > 0) tip.multiplyScalar(0.74) // darker far half → impasto relief between strokes
    arr.colors.push(tip.r, tip.g, tip.b)
  }
  // triangle fan from the near tip
  arr.indices.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 3, base + 4, base, base + 4, base + 5)
}

/**
 * Append a tapered quad strip swept along a surface polyline.
 *
 * Unlike `pushBrush`, a ribbon can follow a long, curved painted stroke. Its width frame is carried
 * forward and sign-aligned so a stroke wrapping around a tube cannot flip its bitangent and cross
 * a quad. Colours are emitted exactly as supplied: relief is a per-stroke caller decision, never a
 * fade along one mark.
 */
export function pushBrushRibbon(
  arr: BrushArrays,
  points: Vector3[],
  normals: Vector3[],
  colors: Color[],
  halfWid: number,
  taper = 1,
): void {
  if (points.length < 2 || normals.length !== points.length || colors.length !== points.length) return
  if (halfWid <= 0 || taper < 0) return

  let hasLength = false
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceToSquared(points[i - 1]) > 1e-12) {
      hasLength = true
      break
    }
  }
  if (!hasLength) return

  const bitangents: Vector3[] = []
  const previous = new Vector3()
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)]
    const after = points[Math.min(points.length - 1, i + 1)]
    const tangent = after.clone().sub(before)
    const normal = normals[i].clone().normalize()
    if (tangent.lengthSq() < 1e-12 || normal.lengthSq() < 1e-12) return
    tangent.addScaledVector(normal, -normal.dot(tangent))
    if (tangent.lengthSq() < 1e-12) return
    tangent.normalize()

    const bitangent = new Vector3().crossVectors(normal, tangent).normalize()
    if (i > 0 && bitangent.dot(previous) < 0) bitangent.negate()
    bitangents.push(bitangent)
    previous.copy(bitangent)
  }

  const base = arr.positions.length / 3
  const endScale = Math.max(0, taper)
  for (let i = 0; i < points.length; i++) {
    const t = i / (points.length - 1)
    const width = halfWid * (1 + (endScale - 1) * t)
    const side = bitangents[i]
    const left = points[i].clone().addScaledVector(side, width)
    const right = points[i].clone().addScaledVector(side, -width)
    arr.positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    const colour = colors[i]
    arr.colors.push(colour.r, colour.g, colour.b, colour.r, colour.g, colour.b)
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = base + i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    arr.indices.push(a, b, c, b, d, c)
  }
}
