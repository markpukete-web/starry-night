import { Color, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { ellipsoid, frogBlink } from './frog.ts'
import { OWL, type Look } from './owl.ts'
import { PALETTE } from './palette.ts'
import { laneAt, STREET_WALL } from './streetLayout.ts'
import { STREET_SOURCES, STROKE_LIFT } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'
import { clad, emptyPart, solid, sphere, triangles, tube, underpaintColour, VINCENT_CLASS, type VincentPart } from './vincent.ts'

/**
 * The cat on wall W3 at stop 3 (`docs/superpowers/specs/2026-10-30-street-cat-design.md`): sitting upright on the
 * wall's top stones where Vincent turns at the stop, built as the owl is (`owl.ts`), its coat `roofSienna` and its bib
 * `churchLit`, split at the neck so the head turns toward Vincent, and at the tail's free part so it sways.
 */

export const CAT = {
  /** feet to ear tips, world units: about 30 cm beside Vincent's 0.085 for 1.7 m (the design's (c)). A cat's true
   * sitting height is about 25 cm, 0.0125. A look pass may take it up to 0.018, past that is Mark's call. */
  size: 0.015,
  trueSize: 0.0125,
  /** drawn within this of the camera: stop 2 (0.81) and stop 3 (0.46), not before walk `t` 0.403 */
  draw: 0.9,
  /** the place: W3's top at this `t` and lateral (the middle of its 0.03), the feet on the top's stones */
  t: 0.81,
  lateral: -(STREET_WALL.inner + STREET_WALL.thickness / 2),
  contact: 0.0003,
  lift: 0.0002,
  /** the rest in cat lengths (size 1 = feet to ear tips), +z the way it faces. Every ellipsoid takes `pitch` π/2, so
   * `radii` is [across, front-to-back, feet-to-crown] and `a` 0.75 is the front (`owl.ts`'s note) */
  haunches: { centre: [0, 0.2, -0.07], radii: [0.21, 0.27, 0.2], pitch: Math.PI / 2 },
  chest: { centre: [0, 0.4, 0.06], radii: [0.15, 0.13, 0.3], pitch: Math.PI / 2 },
  leg: { top: [0.055, 0.32, 0.13], foot: [0.06, 0.035, 0.16], r: [0.045, 0.035] },
  neck: [0, 0.66, 0.07],
  head: { centre: [0, 0.1, 0.03], radii: [0.15, 0.13, 0.12], pitch: Math.PI / 2 },
  muzzle: { centre: [0, 0.05, 0.13], radii: [0.07, 0.05, 0.05], pitch: Math.PI / 2 },
  ear: { base: [0.085, 0.17, 0.02], tip: [0.115, 0.34, 0.0], r: [0.05, 0.004] },
  eye: { centre: [0.055, 0.12, 0.145], r: 0.022 },
  /** the tail round the left side to the front paws, lying on the stones; its last part (from `free`) sways. The left
   * (−x) faces back along the lane, toward the camera at stops 2 and 3 (look pass 1: on the right it never showed) */
  tail: {
    root: [-0.1, 0.045, -0.3],
    bend: [-0.26, 0.04, -0.05],
    free: [-0.18, 0.035, 0.18],
    tip: [0.02, 0.09, 0.27],
    r: [0.045, 0.04, 0.035, 0.02],
    /** the sway about the vertical at `free`, on the sky's clock */
    sway: 0.45,
    period: 3.1,
    phase: 0.7,
  },
  /** the bib's band in `a` (round) and `s` (feet to crown) on the chest */
  bib: { around: [0.62, 0.88] as [number, number], along: [0.3, 0.95] as [number, number], strokes: 4 },
  /** the owl's look with a wider cone: from stop 2 Vincent is about 98° off the cat's facing (the design's (e)) */
  look: { ...OWL.look, yaw: 1.75 } as Look,
  /** the frogs' blink table, this many seconds ahead of them */
  blink: { phase: 2.9 },
} as const

type Vec3 = readonly [number, number, number]
/** cat lengths to world units */
const m = (a: Vec3): [number, number, number] => [a[0] * CAT.size, a[1] * CAT.size, a[2] * CAT.size]
const v = (a: Vec3) => new Vector3(...m(a))
const mirror = (a: Vec3): Vec3 => [-a[0], a[1], a[2]]

/** The eyes' centres about the neck, in world units, right (+x) then left (−x). */
export const CAT_EYES: readonly [Vec3, Vec3] = [m(CAT.eye.centre), m(mirror(CAT.eye.centre))]

export type CatBuild = {
  body: VincentPart
  head: VincentPart
  tail: VincentPart
  eye: BrushArrays & { cls: number[]; src: number[] }
  neck: [number, number, number]
  tailRoot: [number, number, number]
  triangles: number
}

export function buildCat(painting: ImageData2D): CatBuild {
  const rand = mulberry32(0xca7)
  const cls = VINCENT_CLASS.none
  const lift = CAT.lift
  const shape = (p: { centre: Vec3; radii: Vec3; pitch: number }) => ellipsoid(m(p.centre), m(p.radii), p.pitch)
  const coat = STREET_SOURCES.roofSienna
  const pale = STREET_SOURCES.churchLit
  const under = underpaintColour(painting, coat, 0.4)
  const paleUnder = underpaintColour(painting, pale, 1)

  const body = emptyPart()
  const haunches = shape(CAT.haunches)
  solid(body.underpaint, haunches, 8, 5, under, cls)
  clad(body, haunches, 9, 4, painting, coat, cls, rand, [0, 1], [0.05, 0.95], lift)
  const chest = shape(CAT.chest)
  solid(body.underpaint, chest, 8, 5, under, cls)
  clad(body, chest, CAT.bib.strokes, 4, painting, pale, cls, rand, CAT.bib.around, CAT.bib.along, lift)
  clad(body, chest, 6, 4, painting, coat, cls, rand, [CAT.bib.around[1] + 0.02, CAT.bib.around[0] + 0.98], [0.05, 0.95], lift)
  for (const side of [1, -1]) {
    const leg = tube(v([side * CAT.leg.top[0], CAT.leg.top[1], CAT.leg.top[2]]), v([side * CAT.leg.foot[0], CAT.leg.foot[1], CAT.leg.foot[2]]), CAT.leg.r[0] * CAT.size, CAT.leg.r[1] * CAT.size)
    solid(body.underpaint, leg, 6, 2, under, cls)
    clad(body, leg, 2, 3, painting, coat, cls, rand, [0, 1], [0.05, 0.95], lift)
  }
  const [root, bend, free] = [v(CAT.tail.root), v(CAT.tail.bend), v(CAT.tail.free)]
  const [r0, r1, r2, r3] = CAT.tail.r.map((r) => r * CAT.size)
  for (const seg of [tube(root, bend, r0, r1), tube(bend, free, r1, r2)]) {
    solid(body.underpaint, seg, 6, 2, under, cls)
    clad(body, seg, 2, 3, painting, coat, cls, rand, [0, 1], [0, 1], lift)
  }

  // the tail's free part about its pivot at `free`, so the component turns it there
  const tail = emptyPart()
  const tip = tube(new Vector3(), v(CAT.tail.tip).sub(free), r2, r3)
  solid(tail.underpaint, tip, 6, 2, under, cls)
  clad(tail, tip, 2, 3, painting, coat, cls, rand, [0, 1], [0, 1], lift)

  const head = emptyPart()
  const skull = shape(CAT.head)
  solid(head.underpaint, skull, 8, 5, under, cls)
  clad(head, skull, 7, 4, painting, coat, cls, rand, [0, 1], [0.05, 0.95], lift)
  const muzzle = shape(CAT.muzzle)
  solid(head.underpaint, muzzle, 6, 3, paleUnder, cls)
  clad(head, muzzle, 3, 3, painting, pale, cls, rand, [0.5, 1.0], [0.05, 0.95], lift)
  for (const side of [1, -1]) {
    const ear = tube(v([side * CAT.ear.base[0], CAT.ear.base[1], CAT.ear.base[2]]), v([side * CAT.ear.tip[0], CAT.ear.tip[1], CAT.ear.tip[2]]), CAT.ear.r[0] * CAT.size, CAT.ear.r[1] * CAT.size)
    solid(head.underpaint, ear, 6, 2, under, cls)
    clad(head, ear, 2, 3, painting, coat, cls, rand, [0, 1], [0, 0.9], lift)
  }

  const eye = Object.assign(makeBrushArrays(), { cls: [] as number[], src: [] as number[] })
  solid(eye, sphere(new Vector3(), CAT.eye.r * CAT.size), 5, 3, new Color(PALETTE.ground), cls)

  return {
    body,
    head,
    tail,
    eye,
    neck: m(CAT.neck),
    tailRoot: m(CAT.tail.free),
    triangles: triangles(body) + triangles(head) + triangles(tail) + (2 * eye.indices.length) / 3,
  }
}

/** Where the cat sits, in the street's frame, and its yaw (its +z turned toward the lane). */
export function catPlace(): { position: [number, number, number]; yaw: number } {
  const at = laneAt(CAT.t, CAT.lateral)
  return {
    position: [at.x, STREET_WALL.height + STROKE_LIFT + CAT.contact, at.z],
    yaw: Math.atan2(at.nx, at.nz),
  }
}

/** The neck's pivot in the street's frame, where the look is measured from. */
export function catNeck(): [number, number, number] {
  const { position: p, yaw } = catPlace()
  const [nx, ny, nz] = m(CAT.neck)
  return [p[0] + nx * Math.cos(yaw) + nz * Math.sin(yaw), p[1] + ny, p[2] - nx * Math.sin(yaw) + nz * Math.cos(yaw)]
}

export function catBlink(t: number): number {
  return t > 0 ? frogBlink(t + CAT.blink.phase) : 0
}

/** The tail's sway about its pivot, radians, on the sky's clock: 0 at time 0 and under reduced motion. */
export function catTail(t: number): number {
  return t > 0 ? CAT.tail.sway * Math.sin((2 * Math.PI * t) / CAT.tail.period + CAT.tail.phase) - CAT.tail.sway * Math.sin(CAT.tail.phase) : 0
}
