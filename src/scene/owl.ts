import { Color, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { ellipsoid, frogBlink } from './frog.ts'
import { PALETTE } from './palette.ts'
import { churchFront, STREET_CHURCH } from './streetLayout.ts'
import { OUTLINE_LIFT, STREET_SOURCES } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'
import { clad, emptyPart, solid, sphere, triangles, underpaintColour, VINCENT_CLASS, type VincentPart } from './vincent.ts'

/**
 * The barn owl on the church nave's ridge (`tasks/2026-10-29-church-owl-plan.md`, Task 1): upright ellipsoids clad in
 * the painting's strokes (`churchLit` on its face and chest, `thatch` on its back and wings, `PALETTE.ground` for its
 * eyes), split at the neck so the head turns and pitches smoothly toward Vincent when he is near.
 */

export const OWL = {
  /** feet to crown, world units. Mark's call 3: 0.024 (a large bird, 48 cm beside Vincent's 0.085 for 1.7 m), so the
   * phone finds it; a barn owl's true scale is 0.018 (36 cm). A look pass may bring it back toward 0.018. */
  size: 0.024,
  trueSize: 0.018,
  /** drawn within this of the camera: stops 3 (1.383) and 4 (0.877), not stop 2 (1.715) */
  draw: 1.5,
  /** the perch: this far back from the front gable's peak along the ridge, standing on the ridge's ink. Look pass 4
   * (was 0.08): the ridge's ink lies flat, 0.034 wide, and from stop 4's camera it hides the owl's lower half. From
   * 0.03 to 0.05 the owl's outline shows 60 to 62% (51% at 0.08), and 0.03 clips the head's edge
   * (`C/owl/t3/occlusion.log`) */
  back: 0.04,
  lift: 0.0002,
  /** the rest in owl lengths (size 1 = feet to crown), +z the way the body faces: an upright barn owl. Every
   * ellipsoid takes `pitch` π/2, so `ellipsoid`'s polar axis (z, `frog.ts:84-96`) stands up: `s` runs feet to
   * crown and the strokes with it, and `a` 0.75 is the front (+z), 0.25 the back (Codex F2, the builder's A2).
   * Under that pitch `radii` is [across, front-to-back, feet-to-crown]: `radii[2]` is the vertical half-height and
   * `radii[1]` the depth (revision 2, Argon's blocker 1) */
  body: { centre: [0, 0.40, 0], radii: [0.21, 0.19, 0.40], pitch: Math.PI / 2 },
  neck: [0, 0.66, 0.02],
  head: { centre: [0, 0.16, 0.0], radii: [0.21, 0.19, 0.18], pitch: Math.PI / 2 },
  /** the heart face: a flattened cap proud of the head's front by 0.03 (its tip at z 0.22 against the head's
   * 0.19, the builder's A3), pale */
  face: { centre: [0, 0.14, 0.16], radii: [0.17, 0.06, 0.16], pitch: Math.PI / 2 },
  eye: { centre: [0.075, 0.17, 0.19], r: 0.045 },
  /** the paint's bands in `a` (round) and `s` (feet to crown): the chest pale, the back and wings the thatch's */
  chest: { around: [0.62, 0.88] as [number, number], along: [0.05, 0.95] as [number, number] },
  wing: { around: [0.05, 0.45] as [number, number], along: [0.05, 0.95] as [number, number] },
  /** the head toward Vincent: within `reach` of the perch and within `yaw` of the body's facing, eased over `tau`, and
   * snapped to the target within `snap` rad so it settles, as the walk does (Codex, PR #39 P2: the capture tool's
   * pinned-clock check failed on a head still easing by 2e-5 rad) */
  look: { reach: 0.6, yaw: 1.2217, pitch: 0.7, tau: 0.6, targetY: 0.07, snap: 1e-4 },
  /** the frogs' blink table, this many seconds ahead of them (`frogBlink(phase)` is 0: the eyes open at time 0) */
  blink: { phase: 1.3 },
} as const

type Vec3 = readonly [number, number, number]
/** A head's look: the owl's, and the cat's with its own cone (`cat.ts`) */
export type Look = { reach: number; yaw: number; pitch: number; tau: number; targetY: number; snap: number }
/** owl lengths to world units */
const m = (a: Vec3): [number, number, number] => [a[0] * OWL.size, a[1] * OWL.size, a[2] * OWL.size]
const mirror = (a: Vec3): Vec3 => [-a[0], a[1], a[2]]

/** The eyes' centres about the neck, in world units, right (+x) then left (−x). */
export const OWL_EYES: readonly [Vec3, Vec3] = [m(OWL.eye.centre), m(mirror(OWL.eye.centre))]

export type OwlBuild = {
  body: VincentPart
  head: VincentPart
  eye: BrushArrays & { cls: number[]; src: number[] }
  neck: [number, number, number]
  triangles: number
}

export function buildOwl(painting: ImageData2D): OwlBuild {
  const rand = mulberry32(0x0a1)
  const cls = VINCENT_CLASS.none
  const lift = OWL.lift
  const shape = (centre: Vec3, radii: Vec3, pitch = 0) => ellipsoid(m(centre), m(radii), pitch)
  const under = underpaintColour(painting, STREET_SOURCES.thatch, 0.4)

  const body = emptyPart()
  const bodySurface = shape(OWL.body.centre, OWL.body.radii, OWL.body.pitch)
  solid(body.underpaint, bodySurface, 8, 5, under, cls)
  clad(body, bodySurface, 6, 4, painting, STREET_SOURCES.churchLit, cls, rand, OWL.chest.around, OWL.chest.along, lift)
  clad(body, bodySurface, 8, 4, painting, STREET_SOURCES.thatch, cls, rand, OWL.wing.around, OWL.wing.along, lift)

  const head = emptyPart()
  const headSurface = shape(OWL.head.centre, OWL.head.radii, OWL.head.pitch)
  solid(head.underpaint, headSurface, 8, 5, under, cls)
  clad(head, headSurface, 8, 4, painting, STREET_SOURCES.thatch, cls, rand, OWL.wing.around, OWL.wing.along, lift)
  const faceSurface = shape(OWL.face.centre, OWL.face.radii, OWL.face.pitch)
  solid(head.underpaint, faceSurface, 6, 3, underpaintColour(painting, STREET_SOURCES.churchLit, 1), cls)
  clad(head, faceSurface, 3, 3, painting, STREET_SOURCES.churchLit, cls, rand, [0.5, 1.0], [0.05, 0.95], lift)

  const eye = Object.assign(makeBrushArrays(), { cls: [] as number[], src: [] as number[] })
  solid(eye, sphere(new Vector3(), OWL.eye.r * OWL.size), 5, 3, new Color(PALETTE.ground), cls)

  return {
    body,
    head,
    eye,
    neck: m(OWL.neck),
    triangles: triangles(body) + triangles(head) + (2 * eye.indices.length) / 3,
  }
}

export function owlPerch(): { position: [number, number, number]; yaw: number } {
  const nave = STREET_CHURCH.nave
  const toPathX = -Math.sin(nave.yaw)
  const toPathZ = Math.cos(nave.yaw)
  const front = churchFront()
  return {
    position: [front.x - toPathX * OWL.back, nave.eave + nave.pitch + OUTLINE_LIFT, front.z - toPathZ * OWL.back],
    yaw: Math.atan2(toPathX, toPathZ),
  }
}

export function owlLook(
  neck: [number, number, number],
  bodyYaw: number,
  target: [number, number] | null,
  look: Look = OWL.look,
): { yaw: number; pitch: number } {
  if (!target) return { yaw: 0, pitch: 0 }
  const dx = target[0] - neck[0]
  const dz = target[1] - neck[2]
  const horizontal = Math.hypot(dx, dz)
  if (horizontal > look.reach) return { yaw: 0, pitch: 0 }
  const bearing = Math.atan2(dx, dz)
  let yaw = Math.atan2(Math.sin(bearing - bodyYaw), Math.cos(bearing - bodyYaw))
  if (yaw <= -Math.PI) yaw += Math.PI * 2
  if (Math.abs(yaw) > look.yaw) return { yaw: 0, pitch: 0 }
  const rawPitch = Math.atan2(look.targetY - neck[1], horizontal)
  const pitch = Math.max(-look.pitch, Math.min(look.pitch, rawPitch))
  return { yaw: yaw || 0, pitch: pitch || 0 }
}

export function easeLook(current: number, wanted: number, dt: number, look: Look = OWL.look): number {
  const clamped = Math.max(0, Math.min(0.1, dt))
  const next = current + (wanted - current) * (1 - Math.exp(-clamped / look.tau))
  return Math.abs(wanted - next) < look.snap ? wanted : next
}

export function owlBlink(t: number): number {
  return t > 0 ? frogBlink(t + OWL.blink.phase) : 0
}
