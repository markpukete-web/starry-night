import { Color, SRGBColorSpace } from 'three'
import { mulberry32 } from './brush.ts'
import { vnoise } from './brushForms.ts'
import { STREET_SOURCES } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The street's grass blade (S3 task 1). The painting's bushes at its lower right are arching strokes: each rises from
 * the clump, bends over and falls outward, 8–11 times as long as it is wide (measured at 8×), keeping its width until
 * a short tip, dark at the clump's centre and pale yellow-green at its edge. The blade is drawn fatter, about 5–7.5 times
 * along its arch, because the thinner pointed blade read as agave on the flat strip. The grass test's blades were
 * short straight spikes that tapered all along (`tasks/todo.md`, "Not yet Van Gogh"). A blade here is a ribbon in a
 * vertical plane that faces the camera, as a brushstroke faces its viewer, and bends within that plane: its angle from
 * the vertical grows from `lean` at the root by `curl` at the tip. Four segments, and no joint turns more than
 * `jointMax`: with three, a joint turned up to 38° and the near arches read as a V at 2× (S3b task 2; two segments
 * folded every arc into one kink, S3).
 */

/**
 * The painting's grass, in 1600 px coordinates: the field strip (the street's `field` source) and the bushes. The
 * bushes start below the hills' strokes (y 1155) and right of the yellow house (x 1445).
 */
export const GRASS_SOURCES = { field: STREET_SOURCES.field, bushes: [1445, 1155, 1600, 1267] } as const

export const GRASS_BLADE = {
  /** rows of the ribbon less one: 2 triangles each */
  segments: 4,
  /** the largest turn at a joint (radians, about 22°): six segments' 19° read as a curve at 4×, three's 38° as a V */
  jointMax: 0.38,
  /** a clump's blade length before the tuft rule (Task 2) and the per-blade factor 0.75–1.25 */
  height: 0.036,
  /** a blade's half-width at its widest: 5–7.5 times as long as wide, fatter than the painting's 8–11 (see above) */
  halfWidth: [0.0024, 0.0034],
  /** the width along the blade, as a share of the widest: blunt at the root, full from `full`, tapering from `taper` */
  profile: { root: 0.8, full: 0.15, taper: 0.7, tip: 0.4 },
  /** the bend from root to tip (radians), and the tip's largest angle from the vertical, so it arches over and falls */
  curve: [1.0, 2.0],
  tipMax: 1.8,
  /** blades a clump, the outermost blade's lean from the vertical (radians), and the roots' spread */
  clump: [5, 9],
  fan: 0.5,
  /** a clump's blades curl to its side (`clumpSide`), but this share of them the other way */
  against: 0.15,
  /** the side field's frequency per world unit: neighbours 0.03 apart mostly agree */
  sideScale: 5,
  spread: 0.012,
  /** how far a blade's plane turns off facing the camera, either way (radians) */
  turn: 0.5,
  /** the colour's multiplier at the root and at the tip */
  shade: [0.6, 1.05],
  /** the shader's largest push at the tip under the hand, its wind, and the distance from which it widens a blade */
  push: 0.03,
  wind: 0.0035,
  widenFrom: 0.3,
} as const

/**
 * The street's moon on the blade (S3b task 1). The painting's bush strokes are lit along their outer arch: a pale
 * grey-green edge on a dark body. A blade takes its top colour where its arch faces `STREET_MOON`, from `from` along it
 * to the tip, at most `top` of the way. `ambient` scales the pigment. The top colour is one of the lightest `topShare` of
 * the bushes' texels that `grassTopUsable` keeps.
 */
export const GRASS_LIGHT = { ambient: 1.0, top: 0.6, from: 0.4, topShare: 0.05 } as const

export type BladeSpec = {
  x: number
  z: number
  /** the plane's turn off facing the camera */
  yaw: number
  /** the length along the arch */
  height: number
  halfWidth: number
  /** the root's angle from the vertical, positive toward the camera's right; `curl` is added by the tip */
  lean: number
  curl: number
  /** linear RGB, one texel of a source */
  colour: [number, number, number]
  /** linear RGB, a lit texel of the bushes (`GRASS_LIGHT`) */
  topColour: [number, number, number]
  seed: number
}

/** The width along the blade, 0 at the root to 1 at the tip, as a share of its widest. */
export function bladeWidth(a: number): number {
  const p = GRASS_BLADE.profile
  if (a < p.full) return p.root + (1 - p.root) * (a / p.full)
  if (a <= p.taper) return 1
  return 1 - (1 - p.tip) * ((a - p.taper) / (1 - p.taper))
}

/**
 * The blade in its own space: x across (± the width profile), y along (0 at the root, 1 at the tip). The stroke runs
 * 0.5 → 1 from root to tip, so the stroke body shapes the tip only (the grass test's lesson).
 */
export function bladeTemplate(): { positions: number[]; stroke: number[]; indices: number[] } {
  const S = GRASS_BLADE.segments
  const positions: number[] = []
  const stroke: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= S; j++) {
    const a = j / S
    const w = bladeWidth(a)
    for (const side of [-1, 1]) {
      positions.push(side * w, a, 0)
      stroke.push(0.5 + 0.5 * a, side < 0 ? 0 : 1)
    }
    if (j < S) {
      const v = j * 2
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
    }
  }
  return { positions, stroke, indices }
}

/**
 * A point of the blade above its root's ground, at `a` along and `across` (± the width profile) across, in a plane
 * whose horizontal axis is the camera's right on the ground (`right`, unit) turned by the blade's `yaw`; `widen` is
 * the shader's widening with distance. `GRASS_BLADE_GLSL` is the same function for the shader.
 */
export function bladeVertex(spec: BladeSpec, a: number, across: number, right: readonly [number, number], widen = 1): [number, number, number] {
  const th = spec.lean + spec.curl * a
  const u = Math.abs(spec.curl) < 1e-6 ? a * Math.sin(spec.lean) : (Math.cos(spec.lean) - Math.cos(th)) / spec.curl
  const v = Math.abs(spec.curl) < 1e-6 ? a * Math.cos(spec.lean) : (Math.sin(th) - Math.sin(spec.lean)) / spec.curl
  const w = across * spec.halfWidth * widen
  const pu = spec.height * u + w * Math.cos(th)
  const pv = Math.max(0, spec.height * v - w * Math.sin(th))
  const c = Math.cos(spec.yaw)
  const s = Math.sin(spec.yaw)
  const ax = right[0] * c + right[1] * s
  const az = -right[0] * s + right[1] * c
  return [spec.x + ax * pu, pv, spec.z + az * pu]
}

/** `bladeVertex` in GLSL, for the grass's shader (Task 4): `right` is the camera's right on the ground, (x, z). */
export const GRASS_BLADE_GLSL = `
vec3 grassBladeVertex(vec3 root, float a, float across, float height, float halfWidth, float lean, float curl, float yaw, vec2 right, float widen) {
  float th = lean + curl * a;
  float u = abs(curl) < 1e-6 ? a * sin(lean) : (cos(lean) - cos(th)) / curl;
  float v = abs(curl) < 1e-6 ? a * cos(lean) : (sin(th) - sin(lean)) / curl;
  float w = across * halfWidth * widen;
  float pu = height * u + w * cos(th);
  float pv = max(0.0, height * v - w * sin(th));
  float c = cos(yaw);
  float s = sin(yaw);
  vec2 ax = vec2(right.x * c + right.y * s, -right.x * s + right.y * c);
  return root + vec3(ax.x * pu, pv, ax.y * pu);
}`

/**
 * How squarely the blade's outer arch at `a` faces `moon` (a unit world direction), 0 to 1. The arch's outer side is
 * away from its centre of curvature, so it turns with the curl. A straight blade takes its upper side. Every blade in
 * the street curls by at least 0.5 rad (its test), so the straight rule is for the formula only. `GRASS_MOON_GLSL` is
 * the same function for the shader.
 */
export function bladeMoonFacing(spec: BladeSpec, a: number, right: readonly [number, number], moon: readonly [number, number, number]): number {
  const th = spec.lean + spec.curl * a
  const side = Math.abs(spec.curl) < 1e-6 ? (th >= 0 ? 1 : -1) : Math.sign(spec.curl)
  const c = Math.cos(spec.yaw)
  const s = Math.sin(spec.yaw)
  const ax = right[0] * c + right[1] * s
  const az = -right[0] * s + right[1] * c
  return Math.max(0, side * (-Math.cos(th) * ax * moon[0] + Math.sin(th) * moon[1] - Math.cos(th) * az * moon[2]))
}

/**
 * `bladeMoonFacing` in GLSL. Its first ten arguments are `grassBladeVertex`'s, and the shader passes both one argument
 * string, so the facing cannot read a different yaw or `right` from the vertex (Codex R7).
 */
export const GRASS_MOON_GLSL = `
float grassMoonFacing(vec3 root, float a, float across, float height, float halfWidth, float lean, float curl, float yaw, vec2 right, float widen, vec3 moon) {
  float th = lean + curl * a;
  float side = abs(curl) < 1e-6 ? (th >= 0.0 ? 1.0 : -1.0) : sign(curl);
  float c = cos(yaw);
  float s = sin(yaw);
  vec2 ax = vec2(right.x * c + right.y * s, -right.x * s + right.y * c);
  return max(0.0, side * dot(vec3(-cos(th) * ax.x, sin(th), -cos(th) * ax.y), moon));
}`

/**
 * The farthest the shader can move any point of the blade from its root across the ground, with the camera at
 * `distance`: the arch and its width widened there, then the hand's full push and the wind at the tip. The plane is
 * vertical and holds the root, so the turn toward the camera does not change it. The shader's wind is a unit
 * direction times `wind` times a gust of at most 1.
 */
export function bladeReach(spec: BladeSpec, distance: number): number {
  const widen = Math.max(1, distance / GRASS_BLADE.widenFrom)
  let far = 0
  for (let k = 0; k <= 32; k++) {
    const a = k / 32
    const w = bladeWidth(a)
    for (const across of [-w, w]) far = Math.max(far, Math.abs(bladeVertex({ ...spec, x: 0, z: 0, yaw: 0 }, a, across, [1, 0], widen)[0]))
  }
  return far + GRASS_BLADE.push + GRASS_BLADE.wind
}

/**
 * A texel a blade may take: not a near-white, not the light grey and beige of the canvas showing through, not the
 * canvas's warm brown. The bushes are 39% blue-black, 28% yellow-olive, 19% blue and 7% green. The three refusals
 * are the other 8%.
 */
export function grassTexelUsable(r: number, g: number, b: number): boolean {
  const hi = Math.max(r, g, b)
  const lo = Math.min(r, g, b)
  return r + g + b < 520 && !(hi - lo < 40 && hi + lo > 230) && !(r > 1.05 * g && r > b)
}

/**
 * A texel the top colour may take: not a near-white, not the canvas's warm brown and beige. Unlike `grassTexelUsable`
 * it keeps the light grey, because the lit edges of the bush strokes are pale grey-green (`probe-usable.txt`, S3b).
 */
export function grassTopUsable(r: number, g: number, b: number): boolean {
  return r + g + b < 520 && !(r > 1.05 * g && r > b)
}

const topPools = new WeakMap<ImageData2D, [number, number, number][]>()

/** The bushes' lightest `topShare` of usable texels, in linear RGB, built once per painting. */
function topPool(painting: ImageData2D): [number, number, number][] {
  const cached = topPools.get(painting)
  if (cached) return cached
  const [x0, y0, x1, y1] = GRASS_SOURCES.bushes
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const texels: [number, number, number, number][] = []
  for (let y = Math.floor(y0 * sy); y < Math.floor(y1 * sy); y++) {
    for (let x = Math.floor(x0 * sx); x < Math.floor(x1 * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      if (grassTopUsable(r, g, b)) texels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  if (texels.length === 0) throw new Error('grassBlade: the bushes have no lit texel for the top colour')
  texels.sort((p, q) => q[0] - p[0])
  const pool = texels.slice(0, Math.ceil(GRASS_LIGHT.topShare * texels.length)).map(([, r, g, b]): [number, number, number] => {
    const c = new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
    return [c.r, c.g, c.b]
  })
  topPools.set(painting, pool)
  return pool
}

/** One texel's colour from a source, inner blades from its dark end and outer from its pale end (`out` 0 → 1). */
function pigment(rand: () => number, painting: ImageData2D, out: number): [number, number, number] {
  const [x0, y0, x1, y1] = rand() < 0.5 ? GRASS_SOURCES.field : GRASS_SOURCES.bushes
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const picks: [number, number, number, number][] = []
  for (let tries = 0; picks.length < 6 && tries < 64; tries++) {
    const i = (Math.floor((y0 + rand() * (y1 - y0)) * sy) * painting.width + Math.floor((x0 + rand() * (x1 - x0)) * sx)) * 4
    const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
    if (!grassTexelUsable(r, g, b)) continue
    picks.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
  }
  if (picks.length === 0) throw new Error('grassBlade: a grass source gave no usable texel in 64 tries')
  picks.sort((p, q) => p[0] - q[0])
  const [, r, g, b] = picks[Math.min(picks.length - 1, Math.round(out * (picks.length - 1)))]
  const c = new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
  return [c.r, c.g, c.b]
}

/**
 * Which way a clump at (x, z) curls, toward the camera's right (1) or its left (−1): a slow field along the verge, so
 * the painting's bush strokes, which curve together side by side, come in groups (S3b task 2).
 */
export function clumpSide(x: number, z: number): -1 | 1 {
  return vnoise(x * GRASS_BLADE.sideScale + 11.3, z * GRASS_BLADE.sideScale - 7.1) < 0.5 ? -1 : 1
}

/**
 * A clump at (x, z): blades fanned from upright at its centre to `fan` at its edge, all but `against` of them arching
 * to the clump's side, the outer ones bent furthest and pale, the inner dark. `height` is the clump's (Task 2's tuft rule); each blade takes 0.75–1.25
 * of it.
 */
export function clump(rand: () => number, painting: ImageData2D, x: number, z: number, height: number): BladeSpec[] {
  const T = GRASS_BLADE
  const tops = topPool(painting)
  const side = clumpSide(x, z)
  const n = T.clump[0] + Math.floor(rand() * (T.clump[1] - T.clump[0] + 1))
  const blades: BladeSpec[] = []
  for (let i = 0; i < n; i++) {
    // the seed first, and the paint from it: `pigment` refuses texels in a loop, so paint drawn from `rand` made the
    // layout depend on the image (S3b, Codex R6)
    const seed = rand() * 1000
    const paint = mulberry32(Math.floor(seed * 1e6))
    const f = Math.max(-1, Math.min(1, (i / (n - 1)) * 2 - 1 + (rand() - 0.5) / n))
    const lean = f * T.fan
    const dir = rand() < T.against ? -side : side
    const bend = (T.curve[0] + rand() * (T.curve[1] - T.curve[0])) * (0.7 + 0.3 * Math.abs(f))
    const curl = dir * Math.min(dir === Math.sign(lean) ? Math.min(bend, T.tipMax - Math.abs(lean)) : bend, T.jointMax * T.segments)
    blades.push({
      x: x + (rand() - 0.5) * T.spread,
      z: z + (rand() - 0.5) * T.spread,
      yaw: (rand() - 0.5) * 2 * T.turn,
      height: height * (0.75 + 0.5 * rand()),
      halfWidth: T.halfWidth[0] + rand() * (T.halfWidth[1] - T.halfWidth[0]),
      lean,
      curl,
      colour: pigment(paint, painting, Math.abs(f)),
      topColour: tops[Math.floor(paint() * tops.length)],
      seed,
    })
  }
  return blades
}
