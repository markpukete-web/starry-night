import { Color, SRGBColorSpace, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { baseHue } from './grassBase.ts'
import { GRASS_SOURCES, grassTexelUsable } from './grassBlade.ts'
import { PALETTE } from './palette.ts'
import { GRASS } from './streetGrass.ts'
import { LIFT_LEVELS, LIFT_STEP, STREET_SOURCES, STROKE_LIFT } from './streetStrokes.ts'
import { pathPoint, pathTangent, STATION_T, walkPose } from './streetLayout.ts'
import type { ImageData2D } from './useImageData.ts'
import {
  clad,
  emptyPart,
  solid,
  sphere,
  stroke,
  triangles,
  tube,
  underpaintColour,
  VINCENT_CLASS,
  type Surface,
  type VincentPart,
} from './vincent.ts'

/**
 * The frog at the lane's edge (S3b pass 5, `tasks/2026-10-25-street-s3b-plan.md` Task 6), rebuilt to read as a frog
 * (Mark: "the frog doesn't seem like a frog") and drawn by each stop (`FROGS`). Built as Vincent is, a few shapes clad in the painting's strokes. Its own
 * frame: feet at the origin, `+y` up, `+z` the way it faces. The shape is set out in frog lengths (`size`, snout to
 * vent) as a frog sits: the back sloping up from the rump on the ground to a flat head, the front legs propping the
 * chest, each back leg folded beside the body with the knee forward and out and the long foot flat on the ground.
 */
export const FROG = {
  /** no blade root lies within this (times its scale) of a frog in the grass: its spot is a gap the grass leaves,
   * ringed by blades, and `street-frog.test.ts` fails if a change to the grass fills it */
  clear: 0.008,
  /**
   * A frog is drawn only within this of the camera, so the walk draws one at most: at 0.55 stop 2's would be drawn at
   * `t` 0.33, 475 triangles under the ceiling, and its 1,212 would break it (`tasks/2026-10-25-street-frogs-plan.md`,
   * Fact 9). Every stop's own frog is 0.25 to 0.40 from its camera.
   */
  draw: 0.5,
  /** snout to vent, in world units (Vincent is 0.085 tall, so a frog of about 17 cm) */
  size: 0.0086,
  /** a stroke stands this far proud of its shape (Vincent's 0.0004 would thicken a leg to twice its width) */
  lift: 0.00012,
  /** the rest in frog lengths: ellipsoids by centre, radii (x, y, z) and the nose raised by `pitch` radians */
  torso: { centre: [0, 0.22, -0.1], radii: [0.24, 0.17, 0.33], pitch: 0.42 },
  head: { centre: [0, 0.37, 0.28], radii: [0.27, 0.14, 0.27], pitch: -0.2 },
  /** the pale throat under the jaw */
  throat: { centre: [0, 0.28, 0.29], radii: [0.22, 0.08, 0.22], pitch: -0.2 },
  /** the back leg, folded: hip to knee forward and out, knee to heel back, heel to toes forward on the ground */
  hip: [0.15, 0.17, -0.3],
  knee: [0.35, 0.2, 0.06],
  heel: [0.3, 0.05, -0.36],
  toe: [0.42, 0.035, 0.1],
  thighR: [0.11, 0.07],
  shinR: [0.065, 0.04],
  footR: [0.04, 0.03],
  /** three toes fanned from the foot's end, each this long */
  toes: { spread: 0.5, length: 0.16, r: [0.022, 0.012] },
  /** the front leg: shoulder to the elbow out and back, elbow to the hand on the ground ahead */
  shoulder: [0.16, 0.25, 0.18],
  elbow: [0.25, 0.13, 0.12],
  hand: [0.23, 0.035, 0.3],
  upperArmR: [0.05, 0.04],
  forearmR: [0.04, 0.03],
  /** the eyes stand proud of the head in their sockets; the socket is the body's paint, a little lower */
  eye: { centre: [0.14, 0.48, 0.3], r: 0.075 },
  socket: { drop: 0.035, r: 0.08 },
  /** a wet eye's glint, toward the camera and up */
  glint: { r: 0.025, toward: [0.25, 0.7, 0.67] },
  shadow: { across: 0.55, along: 0.62, z: 0.02, y: 0.0004, segments: 12 },
  /**
   * A frog blinks by pulling its eyes into its head: each eye shrinks to `shrink` of its size and sinks `sink` of its
   * radius into its socket, both together, `down` s going, `hold` s shut, `up` s coming back (look pass 1: an eye that
   * only sank 0.8 of its radius showed below its socket). The gaps between blinks come from a fixed hash
   * sequence of `cycle` gaps, each `gap` s long, and one blink in five is a double, its second `doubleAfter` s after
   * the first. The first blink is `first` s in, so the eyes are open at time 0.
   */
  blink: { shrink: 0.3, sink: 0.6, down: 0.06, hold: 0.06, up: 0.1, gap: [2.5, 6], double: 0.2, doubleAfter: 0.35, first: 1.7, cycle: 32 },
} as const

type Vec3 = readonly [number, number, number]
const v3 = (a: Vec3) => new Vector3(a[0], a[1], a[2])
/** frog lengths to world units */
const m = (a: Vec3): Vec3 => [a[0] * FROG.size, a[1] * FROG.size, a[2] * FROG.size]

/** An ellipsoid round its own length (z): `a` round it from the right side over the top, `s` from the tail to the nose. */
function ellipsoid(centre: Vec3, radii: Vec3, pitch = 0): Surface {
  const [rx, ry, rz] = radii
  const c = v3(centre)
  const [cp, sp] = [Math.cos(-pitch), Math.sin(-pitch)]
  const turn = (v: Vector3) => new Vector3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp)
  return (a, s) => {
    const th = Math.PI * Math.min(1, Math.max(0, s))
    const ph = a * Math.PI * 2
    const local = new Vector3(rx * Math.sin(th) * Math.cos(ph), ry * Math.sin(th) * Math.sin(ph), -rz * Math.cos(th))
    const n = turn(new Vector3(local.x / (rx * rx), local.y / (ry * ry), local.z / (rz * rz))).normalize()
    return { p: turn(local).add(c), n }
  }
}

const mirror = (a: Vec3): Vec3 => [-a[0], a[1], a[2]]

/** The bushes' olive and green paint, light to dark sorted by luma, in sRGB bytes. */
function greens(painting: ImageData2D): [number, number, number][] {
  const [x0, y0, x1, y1] = GRASS_SOURCES.bushes
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const texels: [number, number, number, number][] = []
  for (let y = Math.floor(y0 * sy); y < Math.floor(y1 * sy); y++) {
    for (let x = Math.floor(x0 * sx); x < Math.floor(x1 * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      const hue = baseHue(r, g, b)
      if (grassTexelUsable(r, g, b) && (hue === 'olive' || hue === 'green')) texels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  if (texels.length === 0) throw new Error('frog: the bushes have no olive or green texel')
  return texels.sort((p, q) => p[0] - q[0]).map(([, r, g, b]) => [r, g, b])
}

const srgb = ([r, g, b]: readonly number[]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
function mean(texels: [number, number, number][]): Color {
  return srgb([0, 1, 2].map((c) => texels.reduce((sum, t) => sum + t[c], 0) / texels.length))
}

export type FrogBuild = {
  body: VincentPart
  /** one eye and the glint of each, about the eye's centre, so an eye shrinks into its socket in place */
  eye: BrushArrays & { cls: number[]; src: number[] }
  glints: { right: BrushArrays & { cls: number[]; src: number[] }; left: BrushArrays & { cls: number[]; src: number[] } }
  shadow: BrushArrays
  triangles: number
}

/** The eyes' centres in the frog's frame, its right (+x) then its left, in world units. */
export const FROG_EYES: readonly [Vec3, Vec3] = [m(FROG.eye.centre), m(mirror(FROG.eye.centre))]

export function buildFrog(painting: ImageData2D): FrogBuild {
  const rand = mulberry32(0xf20c)
  const cls = VINCENT_CLASS.none
  const k = FROG.size
  const lift = FROG.lift
  const pool = greens(painting)
  const band = (lo: number, hi: number) => pool.slice(Math.floor(lo * pool.length), Math.max(Math.floor(lo * pool.length) + 1, Math.floor(hi * pool.length)))
  const skin = band(0.45, 0.95)
  const pick = (from: [number, number, number][]) => () => srgb(from[Math.floor(rand() * from.length)])
  const under = mean(band(0.3, 0.7))
  const dark = band(0.02, 0.2)
  const ridge = mean(band(0.9, 1))
  // its belly and lip: the painting's pale plaster, warmed toward the lightest green
  const pale = underpaintColour(painting, STREET_SOURCES.plaster, 1).lerp(ridge, 0.35)
  const shape = (centre: Vec3, radii: Vec3, pitch = 0) => ellipsoid(m(centre), m(radii), pitch)
  const limb = (from: Vec3, to: Vec3, r: readonly [number, number]) => tube(v3(m(from)), v3(m(to)), r[0] * k, r[1] * k)

  const body = emptyPart()
  const torso = shape(FROG.torso.centre, FROG.torso.radii, FROG.torso.pitch)
  const head = shape(FROG.head.centre, FROG.head.radii, FROG.head.pitch)
  solid(body.underpaint, torso, 8, 5, under, cls)
  solid(body.underpaint, head, 8, 5, under, cls)
  solid(body.underpaint, shape(FROG.throat.centre, FROG.throat.radii, FROG.throat.pitch), 6, 3, pale, cls)
  // strokes along its length over the back and down the flanks, the belly pale
  clad(body, torso, 6, 4, painting, pick(skin), cls, rand, [-0.04, 0.54], [0.06, 0.96], lift)
  clad(body, torso, 3, 3, painting, () => pale, cls, rand, [0.6, 0.9], [0.15, 0.85], lift)
  clad(body, head, 5, 4, painting, pick(skin), cls, rand, [0.02, 0.48], [0.05, 0.97], lift)
  // two pale ridges either side of the spine, from behind the eyes to the rump
  for (const a of [0.17, 0.33]) stroke(body.strokes, torso, a - 0.018, a + 0.018, 0.2, 0.9, 4, ridge, cls, rand(), lift)
  // dark spots on the back
  for (let i = 0; i < 5; i++) {
    const a = 0.08 + rand() * 0.34
    const s0 = 0.15 + rand() * 0.6
    stroke(body.strokes, torso, a - 0.025, a + 0.025, s0, s0 + 0.09, 2, pick(dark)(), cls, rand(), lift * 1.6)
  }

  for (const side of [1, -1]) {
    const at = (p: Vec3) => (side > 0 ? p : mirror(p))
    // the lip: a dark line along the jaw and the pale stripe above it, snout to the jaw's hinge
    const lip = (a0: number, a1: number) => (side > 0 ? [a0, a1] : [0.5 - a1, 0.5 - a0])
    const [m0, m1] = lip(-0.02, 0.004)
    stroke(body.strokes, head, m0, m1, 0.3, 0.97, 4, pick(dark)(), cls, rand(), lift * 1.6)
    const [p0, p1] = lip(0.006, 0.05)
    stroke(body.strokes, head, p0, p1, 0.25, 0.92, 4, pale, cls, rand(), lift * 1.3)

    const thigh = limb(at(FROG.hip), at(FROG.knee), FROG.thighR)
    const shin = limb(at(FROG.knee), at(FROG.heel), FROG.shinR)
    const foot = limb(at(FROG.heel), at(FROG.toe), FROG.footR)
    const upper = limb(at(FROG.shoulder), at(FROG.elbow), FROG.upperArmR)
    const fore = limb(at(FROG.elbow), at(FROG.hand), FROG.forearmR)
    for (const [part, na, ns, count, steps] of [[thigh, 6, 3, 2, 3], [shin, 5, 3, 2, 3], [foot, 4, 2, 1, 2], [upper, 4, 2, 1, 2], [fore, 4, 2, 1, 2]] as const) {
      solid(body.underpaint, part, na, ns, under, cls)
      clad(body, part, count, steps, painting, pick(skin), cls, rand, [0, 1], [0, 1], lift)
    }
    // round joints at the knee and the heel, so neither tube shows its cut end (the arm's ends are under a pixel)
    for (const [p, r] of [[FROG.knee, FROG.thighR[1]], [FROG.heel, FROG.shinR[1]]] as const) {
      solid(body.underpaint, sphere(v3(m(at(p))), r * k), 5, 3, under, cls)
    }
    // dark bands across the thigh and the shin
    for (const [part, at0] of [[thigh, 0.5], [shin, 0.45]] as const) {
      for (const a0 of [0, 0.5]) stroke(body.strokes, part, a0, a0 + 0.5, at0, at0 + 0.13, 3, pick(dark)(), cls, rand(), lift * 1.6)
    }
    // the toes fan out from the foot's end
    const fan = (from: Vec3, back: Vec3, d: { spread: number; length: number; r: readonly [number, number] }) => {
      const root = v3(from)
      const along = root.clone().sub(v3(back)).setY(0).normalize()
      for (const f of [-1, 0, 1]) {
        const dir = along.clone().applyAxisAngle(new Vector3(0, 1, 0), f * d.spread * 0.5)
        const tip = root.clone().addScaledVector(dir, d.length).setY(0.008)
        solid(body.underpaint, tube(root.clone().multiplyScalar(k), tip.multiplyScalar(k), d.r[0] * k, d.r[1] * k), 3, 1, under, cls)
      }
    }
    fan(at(FROG.toe), at(FROG.heel), FROG.toes)
    const socket = v3(m(at(FROG.eye.centre))).add(new Vector3(0, -FROG.socket.drop * k, 0))
    solid(body.underpaint, sphere(socket, FROG.socket.r * k), 5, 3, under, cls)
  }

  const arrays = () => Object.assign(makeBrushArrays(), { cls: [] as number[], src: [] as number[] })
  const eye = arrays()
  solid(eye, sphere(new Vector3(), FROG.eye.r * k), 8, 4, underpaintColour(painting, GRASS_SOURCES.bushes, 0.15), cls)
  const toward = v3(FROG.glint.toward).normalize()
  const glint = (side: number) => {
    const into = arrays()
    solid(into, sphere(new Vector3(side * toward.x, toward.y, toward.z).multiplyScalar(FROG.eye.r * k * 0.9), FROG.glint.r * k), 4, 2, new Color(PALETTE.star), cls)
    return into
  }
  const glints = { right: glint(1), left: glint(-1) }

  const shadow = makeBrushArrays()
  const S = FROG.shadow
  shadow.positions.push(0, S.y, S.z * k)
  shadow.colors.push(0, 0, 0)
  for (let i = 0; i < S.segments; i++) {
    const th = (i / S.segments) * Math.PI * 2
    shadow.positions.push(Math.cos(th) * S.across * k, S.y, (S.z + Math.sin(th) * S.along) * k)
    shadow.colors.push(0, 0, 0)
    shadow.indices.push(0, 1 + ((i + 1) % S.segments), 1 + i)
  }

  return { body, eye, glints, shadow, triangles: triangles(body) + (2 * eye.indices.length + glints.right.indices.length + glints.left.indices.length + shadow.indices.length) / 3 }
}

/**
 * One frog: its stop, its spot on the lane (`t`, lateral, positive to the walker's right) and the height of its feet,
 * which way its nose turns from its stop's camera (to the lane's centre or away), how much of its face shows (`face`
 * radians short of a quarter turn) and its size (its group's uniform scale: a non-uniform one would bend the lit
 * material's normals).
 */
export type FrogSpec = {
  stop: 0 | 1 | 2 | 3 | 4
  t: number
  lateral: number
  y: number
  toward: 'lane' | 'away'
  face: number
  scale: number
}

/** The square's strokes reach this high: its face at 0.002 (`streetGeometry.ts`), the strokes' top level over it. */
const SQUARE_TOP = 0.002 + STROKE_LIFT + (LIFT_LEVELS - 1) * LIFT_STEP

/**
 * One frog by each stop, from the spots measured in the render (`tasks/2026-10-25-street-frogs-plan.md` Task 2). Stop 1's
 * sits on the right verge, where the phone's frame finds no gap on the left. Stop 4's sits on the square's edge past
 * the grass's end (Mark's choice), on the square's strokes.
 */
export const FROGS: readonly FrogSpec[] = [
  { stop: 0, t: 0.035, lateral: -0.086, y: GRASS.baseY, toward: 'lane', face: 0.35, scale: 1.0 },
  { stop: 1, t: 0.283, lateral: 0.086, y: GRASS.baseY, toward: 'away', face: 0.3, scale: 0.94 },
  { stop: 2, t: 0.466, lateral: -0.098, y: GRASS.baseY, toward: 'lane', face: 0.4, scale: 1.06 },
  { stop: 3, t: 0.677, lateral: -0.098, y: GRASS.baseY, toward: 'away', face: 0.3, scale: 0.97 },
  { stop: 4, t: 0.975, lateral: -0.08, y: SQUARE_TOP + 0.00025, toward: 'lane', face: 0.35, scale: 1.02 },
]

/** Where a frog sits, in the street's frame, and its yaw (its +z turned to `(sin yaw, cos yaw)`). */
export function frogPlace(spec: FrogSpec): { position: [number, number, number]; yaw: number } {
  const [px, , pz] = pathPoint(spec.t)
  const [tx, , tz] = pathTangent(spec.t)
  const n = Math.hypot(tx, tz)
  const [nx, nz] = [-tz / n, tx / n]
  const [x, z] = [px + spec.lateral * nx, pz + spec.lateral * nz]
  const camera = walkPose(STATION_T[spec.stop], false).position
  // facing its camera, which is behind it on the lane, a turn against its own side points its nose to the lane's centre
  const sign = (spec.toward === 'lane' ? -1 : 1) * Math.sign(spec.lateral)
  return { position: [x, spec.y, z], yaw: Math.atan2(camera[0] - x, camera[2] - z) + sign * (Math.PI / 2 - spec.face) }
}

const BLINKS = (() => {
  const B = FROG.blink
  const rand = mulberry32(0xb11c)
  const starts: number[] = []
  const doubles: boolean[] = []
  let t = 0
  for (let k = 0; k < B.cycle; k++) {
    starts.push(t)
    doubles.push(rand() < B.double)
    t += B.gap[0] + (B.gap[1] - B.gap[0]) * rand()
  }
  return { starts, doubles, length: t }
})()

function ease(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** One blink `s` seconds after it starts: 0 open, 1 shut. */
function shut(s: number): number {
  const B = FROG.blink
  if (s <= 0) return 0
  if (s < B.down) return ease(s / B.down)
  if (s < B.down + B.hold) return 1
  return 1 - ease((s - B.down - B.hold) / B.up)
}

/** How shut the eyes are at time `t` (0 open, 1 shut). Open at 0, and at any time that is not a positive number. */
export function frogBlink(t: number): number {
  if (!(t > 0)) return 0
  const u = (((t - FROG.blink.first) % BLINKS.length) + BLINKS.length) % BLINKS.length
  let k = BLINKS.starts.length - 1
  while (k > 0 && BLINKS.starts[k] > u) k--
  const since = u - BLINKS.starts[k]
  return Math.max(shut(since), BLINKS.doubles[k] ? shut(since - FROG.blink.doubleAfter) : 0)
}
