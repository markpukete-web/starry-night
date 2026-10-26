import { Color, SRGBColorSpace, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { baseHue } from './grassBase.ts'
import { GRASS_SOURCES, grassTexelUsable } from './grassBlade.ts'
import { PALETTE } from './palette.ts'
import { pathPoint, pathTangent, STOP0_CAMERA } from './streetLayout.ts'
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
 * A frog at the lane's edge (S3b pass 5, `tasks/2026-10-25-street-s3b-plan.md` Task 6). Mark: "put the frog with
 * blinking eyes so it looks more real". Built as Vincent is, a few shapes clad in the painting's strokes. Its own frame:
 * feet at the origin, `+y` up, `+z` the way it faces. It sits in the grass at the verge's inner edge, across the lane
 * from Vincent (Mark: "Why not under the grass"; look pass 3 had it on the pale path so a dark frog would show). The
 * verge's blades are short, so they hide its feet and flanks and leave its back and eyes in the moonlight.
 */
export const FROG = {
  place: {
    /** along the lane, and its lateral: the left verge, across from Vincent's +0.03, its edge past the path's 0.06,
     * as deep in the grass as the phone's frame allows (look pass 4: at -0.068 the path showed beside it) */
    t: 0.022,
    lateral: -0.076,
    /** it faces stop 0's camera, turned this much toward the lane's centre (look pass 1: 0.6 showed its side) */
    across: 0.2,
  },
  /** its feet on the base under the grass (`GRASS.baseY`) */
  y: 0.001,
  /** no blade root lies within this of its centre: its spot is a gap the grass leaves, ringed by 13 blades that arch
   * over its flanks (look pass 4), and `street-frog.test.ts` fails if a change to the grass fills it */
  clear: 0.008,
  /** an ellipsoid round its length: centre, radii (x, y, z), the nose raised by `pitch` radians, as a frog sits */
  body: { centre: [0, 0.003, -0.0002], radii: [0.004, 0.0027, 0.0043], pitch: 0.3 },
  haunch: { centre: [0.004, 0.0018, -0.0026], radii: [0.0022, 0.0018, 0.0028] },
  arm: { shoulder: [0.0026, 0.0022, 0.0028], hand: [0.0034, 0.0003, 0.004], r: [0.0007, 0.00055] },
  throat: { centre: [0, 0.0017, 0.0038], radii: [0.0025, 0.0011, 0.0015] },
  /** the eyes stand proud of the head in their sockets; the socket is the body's paint, a little lower */
  eye: { centre: [0.0022, 0.0054, 0.0026], r: 0.0012 },
  socket: { drop: 0.0006, r: 0.00125 },
  /** a wet eye's glint, toward the camera and up */
  glint: { r: 0.0003, toward: [0.25, 0.7, 0.67] },
  shadow: { across: 0.0055, along: 0.0075, y: 0.0004, segments: 20 },
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

/** The eyes' centres in the frog's frame, its right (+x) then its left. */
export const FROG_EYES: readonly [Vec3, Vec3] = [FROG.eye.centre, mirror(FROG.eye.centre)]

export function buildFrog(painting: ImageData2D): FrogBuild {
  const rand = mulberry32(0xf20c)
  const cls = VINCENT_CLASS.none
  const pool = greens(painting)
  const band = (lo: number, hi: number) => pool.slice(Math.floor(lo * pool.length), Math.max(Math.floor(lo * pool.length) + 1, Math.floor(hi * pool.length)))
  const skin = band(0.3, 0.85)
  const pick = (from: [number, number, number][]) => () => srgb(from[Math.floor(rand() * from.length)])
  const under = mean(band(0.15, 0.6))
  const ridge = mean(band(0.88, 1))

  const body = emptyPart()
  const trunk = ellipsoid(FROG.body.centre, FROG.body.radii, FROG.body.pitch)
  solid(body.underpaint, trunk, 16, 10, under, cls)
  // strokes along its length over the back and down the flanks; two pale ridges either side of the spine
  clad(body, trunk, 10, 6, painting, pick(skin), cls, rand, [0.02, 0.48], [0.06, 0.96])
  clad(body, trunk, 6, 5, painting, pick(band(0.15, 0.6)), cls, rand, [0.52, 0.98], [0.1, 0.9])
  for (const a of [0.17, 0.33]) stroke(body.strokes, trunk, a - 0.02, a + 0.02, 0.2, 0.85, 6, ridge, cls, rand())

  for (const side of [1, -1]) {
    const at = (p: Vec3) => (side > 0 ? p : mirror(p))
    const haunch = ellipsoid(at(FROG.haunch.centre), FROG.haunch.radii)
    solid(body.underpaint, haunch, 12, 6, under, cls)
    clad(body, haunch, 4, 5, painting, pick(skin), cls, rand, [0.02, 0.48], [0.1, 0.9])
    const arm = tube(v3(at(FROG.arm.shoulder)), v3(at(FROG.arm.hand)), FROG.arm.r[0], FROG.arm.r[1])
    solid(body.underpaint, arm, 8, 4, under, cls)
    clad(body, arm, 2, 4, painting, pick(skin), cls, rand)
    const socket = v3(at(FROG.eye.centre)).add(new Vector3(0, -FROG.socket.drop, 0))
    solid(body.underpaint, sphere(socket, FROG.socket.r), 10, 6, under, cls)
  }
  const pale = mean(pool.slice(Math.floor(0.95 * pool.length)))
  solid(body.underpaint, ellipsoid(FROG.throat.centre, FROG.throat.radii), 10, 5, pale, cls)

  const arrays = () => Object.assign(makeBrushArrays(), { cls: [] as number[], src: [] as number[] })
  const eye = arrays()
  solid(eye, sphere(new Vector3(), FROG.eye.r), 10, 6, underpaintColour(painting, GRASS_SOURCES.bushes, 0.15), cls)
  const toward = v3(FROG.glint.toward).normalize()
  const glint = (side: number) => {
    const into = arrays()
    solid(into, sphere(new Vector3(side * toward.x, toward.y, toward.z).multiplyScalar(FROG.eye.r * 0.9), FROG.glint.r), 6, 4, new Color(PALETTE.star), cls)
    return into
  }
  const glints = { right: glint(1), left: glint(-1) }

  const shadow = makeBrushArrays()
  const S = FROG.shadow
  shadow.positions.push(0, S.y, 0)
  shadow.colors.push(0, 0, 0)
  for (let i = 0; i < S.segments; i++) {
    const th = (i / S.segments) * Math.PI * 2
    shadow.positions.push(Math.cos(th) * S.across, S.y, Math.sin(th) * S.along)
    shadow.colors.push(0, 0, 0)
    shadow.indices.push(0, 1 + ((i + 1) % S.segments), 1 + i)
  }

  return { body, eye, glints, shadow, triangles: triangles(body) + (2 * eye.indices.length + glints.right.indices.length + glints.left.indices.length + shadow.indices.length) / 3 }
}

/** Where it sits, in the street's frame, and its yaw (its +z turned to `(sin yaw, cos yaw)`). */
export function frogPlace(): { position: [number, number, number]; yaw: number } {
  const P = FROG.place
  const [px, , pz] = pathPoint(P.t)
  const [tx, , tz] = pathTangent(P.t)
  const n = Math.hypot(tx, tz)
  const [nx, nz] = [-tz / n, tx / n]
  const [x, z] = [px + P.lateral * nx, pz + P.lateral * nz]
  const [cx, cz] = [STOP0_CAMERA[0] - x, STOP0_CAMERA[2] - z]
  const c = Math.hypot(cx, cz)
  const toLane = -Math.sign(P.lateral)
  const [fx, fz] = [cx / c + P.across * toLane * nx, cz / c + P.across * toLane * nz]
  return { position: [x, FROG.y, z], yaw: Math.atan2(fx, fz) }
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
