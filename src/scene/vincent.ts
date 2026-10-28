import { Color, SRGBColorSpace, Vector3, Vector4 } from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, pushDrapedRibbon, type BrushArrays } from './brushForms.ts'
import { CYPRESS_STROKE_BODY, strokeGlslWith } from './cypressStrokeShader.ts'
import { PALETTE } from './palette.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { LIFE } from './streetLife.ts'
import { STREET_LIGHT, STREET_MOON } from './streetLight.ts'
import { rectUnderpaint, STREET_SOURCES } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * Vincent (S2 task 3, `tasks/2026-10-24-street-s2-plan.md`, "Vincent's construction"; his form V1 task 1,
 * `tasks/2026-10-28-vincent-form-plan.md`): a few shapes clad in the painting's strokes, seen small and from behind. His
 * form is Van Gogh's "Painter on the Road to Tarascon" (1888), Mark's call of 2026-10-28: a straw hat, an easel, a camp
 * stool and a paint box on his back, a rolled canvas, legs that stride, a lantern in the left hand, no cane. The forms
 * are the 1888 painting's and every colour is the Starry Night scan's. His own frame: feet at the origin, `+y` up, `+z`
 * the way he faces, so `−x` is his right (three's handedness). Built once; the frame loop places and poses him.
 */

/** His paint, in the painting's pixels (1600 × 1267). The smock is the blue hill behind the church, inside the palette's
 * `village` rectangle, 4.3 from its ultramarine swatch `#2a3f6f` (look pass 4, Codex T1: pass 3's patch at the right
 * edge was 18.8 from it, past the bar of 10). Its chroma is 35, where the first source, the hills' grey-blue, was 23
 * (Mark: "vincent's cloth is similar to the ground"). `hat` is S2's, the cottages' thatch; the Tarascon hat is the
 * moon's yellow, `FORM.tarascon.hat`. */
export const VINCENT_SOURCES = {
  smock: [1176, 840, 1208, 872],
  hat: STREET_SOURCES.thatch,
  hair: STREET_SOURCES.roofSienna,
  canvas: STREET_SOURCES.plaster,
} as const

/** The ID classes the palette gate reads (`check-street-colour.ts`): the smock and his sleeves, the hat. */
export const VINCENT_CLASS = { smock: 7, hat: 8, none: 255 } as const

export type Rect = readonly [number, number, number, number]
export type Point = { p: Vector3; n: Vector3 }
/** A surface by two coordinates in 0..1: `a` round it (or across), `s` along it. */
export type Surface = (a: number, s: number) => Point

export type VincentStrokes = { arrays: BrushArrays; stroke: number[]; seed: number[]; cls: number[] }
export type VincentPart = { strokes: VincentStrokes; underpaint: BrushArraysWithCls }
export type Pivoted = VincentPart & { pivot: [number, number, number] }
/** The figure's parts. `head`, the arms and the legs are each about their joint (the neck, a shoulder, a hip), so the
 * frame loop turns them without rewriting a vertex. The lantern's `pivot` is the left hand, in the left arm's frame. */
export type VincentBuild = {
  body: VincentPart
  head: Pivoted
  armLeft: Pivoted
  armRight: Pivoted
  legs: [Pivoted, Pivoted]
  lantern: { glass: BrushArraysWithCls; ink: BrushArraysWithCls; pivot: [number, number, number] }
  shadow: BrushArrays
  triangles: number
}

/**
 * The form's sizes (V1, from the form spike `70acd5b`, `scratch/vincent-form-2026-10-28/consult-fable.md`): the hem
 * raised to the calf over two legs in pale trousers and ink boots, a head of its own about the neck, a lantern in the
 * left hand. Tarascon: the yellow straw hat from the moon's body, the easel and the paint box strapped to his back.
 */
export const FORM = {
  hem: [[0.028, 0.0145], [0.034, 0.0135]] as [number, number][],
  neck: 0.066,
  hip: [0.006, 0.034] as const,
  ankle: 0.004,
  leg: [0.004, 0.003] as const,
  boot: { r: 0.0038, ry: 0.0022, rz: 0.0055, forward: 0.0015 },
  /** look pass 3 of the spike: the moon's body mixed 0.35 toward the roofs' sienna, an ochre. The big swirl's pale ring
   * (L 72, Fable's pick) read as a pale mask under the moon, and the thatch as the hair */
  face: [1376, 216, 1408, 248] as Rect,
  faceShade: 0.35,
  /** the hat's shadow over the face's top 40% */
  shade: 0.45,
  lantern: { handle: 0.008, cap: 0.003, r: 0.0035, h: 0.01 },
  tarascon: {
    hat: [1376, 216, 1408, 248] as Rect,
    back: -0.0115,
  },
}
const INK = new Color(PALETTE.ground)

/** The smock's profile: [y, radius], hem to neck, the shoulders a dome; x : z = 1.2 : 0.8 round it. */
const SMOCK: readonly [number, number][] = [...FORM.hem, [0.04, 0.0121], [0.056, 0.0109], [0.062, 0.0105], [0.0645, 0.0085], [0.066, 0.004]]
const SMOCK_SCALE = { x: 1.2, z: 0.8 }
const HEAD = { y: 0.071, r: 0.0065 }
/** Van Gogh's own straw hat, from "The Painter on the Road to Tarascon" (1888) and the Met's "Self-Portrait with a Straw
 * Hat" (1887): a rounded crown about half as tall as it is wide, and a broad brim flat off the crown that curls up toward
 * its edge, highest on his right (Mark, 2026-10-28: the dome over a drooping brim "looks like a fishing man"; look pass
 * 1 of V1: a straight 0.0068 crown under a 0.0145 brim read as a top hat). The crown's top is 0.082, a constant of its
 * own apart from the rig's height (Decision (d)). */
const CROWN = { y0: 0.0745, y1: 0.082, r: 0.0072 }
/** `curl` all round and `lift` toward `side` (his right, −x) at the edge, so the far side dips by `lift − curl`. */
const BRIM = { y: 0.0745, r: 0.017, curl: 0.0012, lift: 0.0026, side: Math.PI }
/** The arms hang outside the smock: at the plan's (±0.0135, 0.034) the hands sat inside it (the hem is 0.0155 × 1.2). */
const ARM = { shoulder: [0.0125, 0.059] as const, hand: [0.0185, 0.032] as const, r: 0.0032, rHand: 0.0026 }
/** The rolled canvas stands up his back beside the easel. */
const CANVAS = { r: 0.0035 }
const SHADOW = { across: 0.022, along: 0.016, y: 0.001, segments: 24 }
/** How far a stroke stands proud of its underpaint. */
const LIFT = 0.0004

function revolve(profile: readonly [number, number][], sx: number, sz: number): Surface {
  const lengths = [0]
  for (let i = 1; i < profile.length; i++) lengths.push(lengths[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
  const total = lengths[lengths.length - 1]
  return (a, s) => {
    const d = Math.min(1, Math.max(0, s)) * total
    let i = 1
    while (i < profile.length - 1 && lengths[i] < d) i++
    const k = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1)
    const y = profile[i - 1][0] + (profile[i][0] - profile[i - 1][0]) * k
    const r = profile[i - 1][1] + (profile[i][1] - profile[i - 1][1]) * k
    const dy = profile[i][0] - profile[i - 1][0]
    const dr = profile[i][1] - profile[i - 1][1]
    const th = a * Math.PI * 2
    const [c, sn] = [Math.cos(th), Math.sin(th)]
    // the outward normal of a scaled surface of revolution: the profile's normal (dy, −dr), scaled by 1/s round it
    const n = new Vector3((c * dy) / sx, -dr, (sn * dy) / sz).normalize()
    return { p: new Vector3(c * r * sx, y, sn * r * sz), n }
  }
}

export function sphere(centre: Vector3, r: number): Surface {
  return (a, s) => {
    const th = a * Math.PI * 2
    const ph = Math.PI * (1 - s) // s 0 at the bottom, 1 at the top
    const n = new Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))
    return { p: centre.clone().addScaledVector(n, r), n }
  }
}

/** A tapered tube from `from` to `to`; `s` runs along it, `a` round it. */
export function tube(from: Vector3, to: Vector3, r0: number, r1: number): Surface {
  const axis = to.clone().sub(from)
  const u = new Vector3(1, 0, 0).cross(axis).lengthSq() > 1e-9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const e1 = u.clone().addScaledVector(axis, -u.dot(axis) / axis.lengthSq()).normalize()
  const e2 = new Vector3().crossVectors(axis, e1).normalize()
  return (a, s) => {
    const th = a * Math.PI * 2
    const n = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th))
    return { p: from.clone().addScaledVector(axis, s).addScaledVector(n, r0 + (r1 - r0) * s), n }
  }
}

/** The hat's brim: `a` round it, `s` from the crown out to the edge. The normal is the surface's, by differences. */
function brim(): Surface {
  const at = (th: number, s: number) => {
    const r = CROWN.r + (BRIM.r - CROWN.r) * s
    return new Vector3(Math.cos(th) * r, BRIM.y + s * s * (BRIM.curl + BRIM.lift * Math.cos(th - BRIM.side)), Math.sin(th) * r)
  }
  return (a, s) => {
    const th = a * Math.PI * 2
    const e = 1e-3
    const n = new Vector3().crossVectors(at(th + e, s).sub(at(th - e, s)), at(th, s + e).sub(at(th, s - e))).normalize()
    return { p: at(th, s), n }
  }
}

export function texel(painting: ImageData2D, rect: Rect, rand: () => number): Color {
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const x = Math.min(painting.width - 1, Math.floor((rect[0] + rand() * (rect[2] - rect[0])) * sx))
  const y = Math.min(painting.height - 1, Math.floor((rect[1] + rand() * (rect[3] - rect[1])) * sy))
  const i = (y * painting.width + x) * 4
  return new Color().setRGB(painting.data[i] / 255, painting.data[i + 1] / 255, painting.data[i + 2] / 255, SRGBColorSpace)
}

export function underpaintColour(painting: ImageData2D, rect: Rect, share = 0.4): Color {
  return new Color().setRGB(...rectUnderpaint(painting, rect, share), SRGBColorSpace)
}

export function emptyPart(): VincentPart {
  return { strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] }, underpaint: { ...makeBrushArrays(), cls: [], src: [] } }
}

const COLUMNS = 3

/** One stroke draped on a surface over [a0, a1] × [s0, s1], `steps` along it, lifted off the surface. */
export function stroke(into: VincentStrokes, surface: Surface, a0: number, a1: number, s0: number, s1: number, steps: number, colour: Color, cls: number, seed: number, lift = LIFT): void {
  const rows: Vector3[][] = []
  for (let k = 0; k < steps; k++) {
    const s = s0 + ((s1 - s0) * k) / (steps - 1)
    const row: Vector3[] = []
    for (let j = 0; j < COLUMNS; j++) {
      const { p, n } = surface(a0 + ((a1 - a0) * j) / (COLUMNS - 1), s)
      row.push(p.addScaledVector(n, lift))
    }
    rows.push(row)
  }
  pushDrapedRibbon(into.arrays, rows, rows.map(() => colour))
  for (let k = 0; k < steps; k++) {
    for (let j = 0; j < COLUMNS; j++) {
      into.stroke.push(k / (steps - 1), j / (COLUMNS - 1))
      into.seed.push(seed)
      into.cls.push(cls)
    }
  }
}

/** A closed grid over the surface, `na` round and `ns` along, in one colour. */
export function solid(into: BrushArraysWithCls, surface: Surface, na: number, ns: number, colour: Color, cls: number, s0 = 0, s1 = 1): void {
  const base = into.positions.length / 3
  for (let k = 0; k <= ns; k++) {
    for (let j = 0; j <= na; j++) {
      const { p } = surface(j / na, s0 + ((s1 - s0) * k) / ns)
      into.positions.push(p.x, p.y, p.z)
      into.colors.push(colour.r, colour.g, colour.b)
      into.cls.push(cls)
      into.src.push(cls)
    }
  }
  for (let k = 0; k < ns; k++) {
    for (let j = 0; j < na; j++) {
      const a = base + k * (na + 1) + j
      const b = a + 1
      const c = a + na + 1
      const d = c + 1
      into.indices.push(a, c, b, b, c, d)
    }
  }
}

/** Strokes round a surface: `count` of them, each a little wider than its share so the underpaint shows only between.
 * Each takes a texel of `paint`, a rectangle of the painting, or the colour a picker gives (the frog's, S3b pass 5). */
export function clad(part: VincentPart, surface: Surface, count: number, steps: number, painting: ImageData2D, paint: Rect | (() => Color), cls: number, rand: () => number, around: [number, number] = [0, 1], along: [number, number] = [0, 1], lift = LIFT): void {
  const span = (around[1] - around[0]) / count
  for (let i = 0; i < count; i++) {
    const centre = around[0] + span * (i + 0.5 + (rand() - 0.5) * 0.3)
    const half = span * (0.6 + rand() * 0.15)
    const s0 = along[0] + rand() * 0.06 * (along[1] - along[0])
    const s1 = along[1] - rand() * 0.06 * (along[1] - along[0])
    stroke(part.strokes, surface, centre - half, centre + half, s0, s1, steps, typeof paint === 'function' ? paint() : texel(painting, paint, rand), cls, rand(), lift)
  }
}

export function triangles(part: VincentPart): number {
  return (part.strokes.arrays.indices.length + part.underpaint.indices.length) / 3
}

/** A surface moved up by `dy`: the head's parts in the frame of its pivot at the neck. */
function shifted(f: Surface, dy: number): Surface {
  return (a, s) => {
    const q = f(a, s)
    q.p.y += dy
    return q
  }
}

/** A surface's `a` range [a0, a1] stretched over 0..1, for a patch round part of it. */
function arc(f: Surface, a0: number, a1: number): Surface {
  return (a, s) => f(a0 + (a1 - a0) * a, s)
}

function ellipsoid(centre: Vector3, rx: number, ry: number, rz: number): Surface {
  const unit = sphere(new Vector3(), 1)
  return (a, s) => {
    const { n } = unit(a, s)
    return { p: new Vector3(centre.x + n.x * rx, centre.y + n.y * ry, centre.z + n.z * rz), n: new Vector3(n.x / rx, n.y / ry, n.z / rz).normalize() }
  }
}

/** A flat-faced box from its eight corners' half sizes, each face one colour. */
function box(into: BrushArraysWithCls, centre: Vector3, half: Vector3, colour: Color): void {
  const c = (x: number, y: number, z: number) => new Vector3(centre.x + x * half.x, centre.y + y * half.y, centre.z + z * half.z)
  const faces = [
    [c(-1, -1, -1), c(1, -1, -1), c(1, 1, -1), c(-1, 1, -1)],
    [c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)],
    [c(-1, -1, -1), c(-1, 1, -1), c(-1, 1, 1), c(-1, -1, 1)],
    [c(1, -1, -1), c(1, 1, -1), c(1, 1, 1), c(1, -1, 1)],
    [c(-1, 1, -1), c(1, 1, -1), c(1, 1, 1), c(-1, 1, 1)],
    [c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1), c(-1, -1, 1)],
  ]
  for (const f of faces) {
    const base = into.positions.length / 3
    for (const p of f) {
      into.positions.push(p.x, p.y, p.z)
      into.colors.push(colour.r, colour.g, colour.b)
      into.cls.push(VINCENT_CLASS.none)
      into.src.push(VINCENT_CLASS.none)
    }
    into.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
}

export function buildVincent(painting: ImageData2D): VincentBuild {
  const rand = mulberry32(0x5a7e)
  const body = emptyPart()
  const smockCls = VINCENT_CLASS.smock
  const smock = revolve(SMOCK, SMOCK_SCALE.x, SMOCK_SCALE.z)
  // the smock's base is its source's mean, as the street's walls are (S1b look passes 1 and 2): on its darkest 40% the
  // gaps between strokes held the smock at ΔE 10.5–11.6 from the village's blues, with the source itself at 0.4
  const smockBase = underpaintColour(painting, VINCENT_SOURCES.smock, 1)
  solid(body.underpaint, smock, 16, 8, smockBase, smockCls)
  // two tiers of strokes, hem to waist and waist over the shoulders, overlapping, so no one stroke runs his full height
  clad(body, smock, 18, 6, painting, VINCENT_SOURCES.smock, smockCls, rand, [0, 1], [0, 0.56])
  clad(body, smock, 16, 6, painting, VINCENT_SOURCES.smock, smockCls, rand, [0.03, 1.03], [0.44, 1])

  // the head is its own part about the neck, so it turns past the body without rewriting a vertex
  const headPart = emptyPart()
  const dy = -FORM.neck
  const head = shifted(sphere(new Vector3(0, HEAD.y, 0), HEAD.r), dy)
  solid(headPart.underpaint, head, 12, 8, underpaintColour(painting, VINCENT_SOURCES.hair), VINCENT_CLASS.none)
  // the hair over the back of his head (−z, the side the camera sees), crown to nape
  clad(headPart, head, 6, 6, painting, VINCENT_SOURCES.hair, VINCENT_CLASS.none, rand, [0.5, 1], [0.15, 0.95])
  // the face (+z): a pale patch between the hat's shadow and the beard, no eyes (two pixels of eye read as a mask)
  const face = arc(shifted(sphere(new Vector3(0, HEAD.y, 0), HEAD.r * 1.03), dy), 0.12, 0.38)
  const faceColour = underpaintColour(painting, FORM.face, 1).lerp(underpaintColour(painting, VINCENT_SOURCES.hair, 1), FORM.faceShade)
  // spike look pass 1: a beard to s 0.45 left the face a 3 px band under the brim; the beard now stops at the mouth
  solid(headPart.underpaint, face, 6, 4, faceColour, VINCENT_CLASS.none, 0.28, 0.6)
  solid(headPart.underpaint, face, 6, 2, faceColour.clone().multiplyScalar(FORM.shade), VINCENT_CLASS.none, 0.6, 0.72)
  // spike look pass 2: a flat face turned to the camera read as a mask, so the profile gets a silhouette, a nose and a
  // beard that stands off the jaw
  const hc = new Vector3(0, HEAD.y + dy, 0)
  solid(headPart.underpaint, ellipsoid(hc.clone().add(new Vector3(0, -0.0004, HEAD.r * 0.98)), 0.0011, 0.0016, 0.0019), 6, 4, faceColour.clone().multiplyScalar(0.85), VINCENT_CLASS.none)
  const beard = ellipsoid(hc.clone().add(new Vector3(0, -HEAD.r * 0.55, HEAD.r * 0.45)), HEAD.r * 0.72, HEAD.r * 0.5, HEAD.r * 0.62)
  solid(headPart.underpaint, beard, 8, 5, underpaintColour(painting, VINCENT_SOURCES.hair), VINCENT_CLASS.none)
  clad(headPart, beard, 5, 4, painting, VINCENT_SOURCES.hair, VINCENT_CLASS.none, rand, [0, 0.5], [0.05, 0.75])
  // the beard: the hair's paint, the warmest dark note in the painting (the scan has no red), chin and jaw
  clad(headPart, head, 5, 4, painting, VINCENT_SOURCES.hair, VINCENT_CLASS.none, rand, [0.06, 0.44], [0.1, 0.32])

  const crown = shifted(revolve([[CROWN.y0, CROWN.r], [CROWN.y1 - 0.005, CROWN.r * 0.98], [CROWN.y1 - 0.0022, CROWN.r * 0.88], [CROWN.y1 - 0.0008, CROWN.r * 0.68], [CROWN.y1 - 0.0002, CROWN.r * 0.38], [CROWN.y1, 0]], 1, 1), dy)
  const hatColour = underpaintColour(painting, FORM.tarascon.hat)
  solid(headPart.underpaint, crown, 16, 4, hatColour, VINCENT_CLASS.hat)
  clad(headPart, crown, 8, 4, painting, FORM.tarascon.hat, VINCENT_CLASS.hat, rand, [0, 1], [0, 0.75])
  const hatBrim = shifted(brim(), dy)
  solid(headPart.underpaint, hatBrim, 24, 3, hatColour, VINCENT_CLASS.hat)
  clad(headPart, hatBrim, 12, 4, painting, FORM.tarascon.hat, VINCENT_CLASS.hat, rand)

  // the rolled canvas stands up his back beside the easel (spike look pass 6: laid across it, it stuck out sideways
  // like a pole once he turned side-on)
  const b = FORM.tarascon.back
  const roll = tube(new Vector3(0.007, 0.03, b - CANVAS.r), new Vector3(0.007, 0.068, b - CANVAS.r), CANVAS.r, CANVAS.r)
  solid(body.underpaint, roll, 10, 2, underpaintColour(painting, VINCENT_SOURCES.canvas), VINCENT_CLASS.none)
  clad(body, roll, 3, 4, painting, VINCENT_SOURCES.canvas, VINCENT_CLASS.none, rand)
  // the easel strapped flat on his back: three legs in the ink, shoulder to below the hip, splayed
  for (const [x0, x1] of [[-0.004, -0.009], [0.004, 0.009], [0, 0]] as const) {
    solid(body.underpaint, tube(new Vector3(x0, 0.072, b - 0.001), new Vector3(x1, 0.018, b - 0.003), 0.0011, 0.0011), 4, 1, INK, VINCENT_CLASS.none)
  }
  // the camp stool folded over the easel, and the paint box at the small of his back, in the village's warm dark
  box(body.underpaint, new Vector3(0, 0.044, b - 0.004), new Vector3(0.008, 0.007, 0.002), underpaintColour(painting, [920, 1160, 944, 1184], 1))

  // each arm is its own part about its shoulder, so the frame loop swings it without rewriting a vertex; the right is
  // the left with x negated (Decision (b))
  const hand = [ARM.hand[0] - ARM.shoulder[0], ARM.hand[1] - ARM.shoulder[1]] as const
  const armLeft = emptyPart()
  const leftArm = tube(new Vector3(0, 0, 0), new Vector3(hand[0], hand[1], 0), ARM.r, ARM.rHand)
  solid(armLeft.underpaint, leftArm, 8, 4, smockBase, smockCls)
  clad(armLeft, leftArm, 3, 5, painting, VINCENT_SOURCES.smock, smockCls, rand)
  const armRight = emptyPart()
  const rightArm = tube(new Vector3(0, 0, 0), new Vector3(-hand[0], hand[1], 0), ARM.r, ARM.rHand)
  solid(armRight.underpaint, rightArm, 8, 4, smockBase, smockCls)
  clad(armRight, rightArm, 3, 5, painting, VINCENT_SOURCES.smock, smockCls, rand)

  const shadow = makeBrushArrays()
  shadow.positions.push(0, SHADOW.y, 0)
  shadow.colors.push(0, 0, 0)
  for (let i = 0; i < SHADOW.segments; i++) {
    const th = (i / SHADOW.segments) * Math.PI * 2
    shadow.positions.push(Math.cos(th) * SHADOW.across, SHADOW.y, Math.sin(th) * SHADOW.along)
    shadow.colors.push(0, 0, 0)
    shadow.indices.push(0, 1 + ((i + 1) % SHADOW.segments), 1 + i)
  }

  // the legs below the raised hem, each about its hip; pale trousers, so the step reads where a leg is one pixel wide
  const trousers = underpaintColour(painting, STREET_SOURCES.plaster)
  const legs = ([1, -1] as const).map((side): Pivoted => {
    const part = emptyPart()
    const foot = new Vector3(0, FORM.ankle - FORM.hip[1], 0)
    const leg = tube(new Vector3(0, 0, 0), foot, FORM.leg[0], FORM.leg[1])
    solid(part.underpaint, leg, 8, 4, trousers, VINCENT_CLASS.none)
    clad(part, leg, 4, 5, painting, STREET_SOURCES.plaster, VINCENT_CLASS.none, rand)
    solid(part.underpaint, ellipsoid(foot.clone().setZ(FORM.boot.forward), FORM.boot.r, FORM.boot.ry, FORM.boot.rz), 6, 3, INK, VINCENT_CLASS.none)
    return { ...part, pivot: [side * FORM.hip[0], FORM.hip[1], 0] }
  }) as [Pivoted, Pivoted]

  // the lantern hangs from the left hand: a handle and a cap in the ink, the glass in the lamps' own light
  const L = FORM.lantern
  const glass = { ...makeBrushArrays(), cls: [] as number[], src: [] as number[] }
  const ink = { ...makeBrushArrays(), cls: [] as number[], src: [] as number[] }
  const top = -L.handle - L.cap
  solid(ink, tube(new Vector3(0, 0, 0), new Vector3(0, -L.handle, 0), 0.0006, 0.0006), 4, 1, INK, VINCENT_CLASS.none)
  solid(ink, tube(new Vector3(0, -L.handle, 0), new Vector3(0, top, 0), 0.0006, L.r * 1.2), 8, 1, INK, VINCENT_CLASS.none)
  solid(glass, tube(new Vector3(0, top, 0), new Vector3(0, top - L.h, 0), L.r, L.r), 8, 2, new Color(LIFE.glow), VINCENT_CLASS.none)
  solid(ink, tube(new Vector3(0, top - L.h, 0), new Vector3(0, top - L.h - 0.0012, 0), L.r * 1.15, L.r * 1.15), 8, 1, INK, VINCENT_CLASS.none)
  const lantern = { glass, ink, pivot: [hand[0], hand[1], 0] as [number, number, number] }

  const count =
    triangles(body) +
    triangles(headPart) +
    triangles(armLeft) +
    triangles(armRight) +
    legs.reduce((n, leg) => n + triangles(leg), 0) +
    (glass.indices.length + ink.indices.length) / 3 +
    shadow.indices.length / 3
  return {
    body,
    head: { ...headPart, pivot: [0, FORM.neck, 0] },
    armLeft: { ...armLeft, pivot: [ARM.shoulder[0], ARM.shoulder[1], 0] },
    armRight: { ...armRight, pivot: [-ARM.shoulder[0], ARM.shoulder[1], 0] },
    legs,
    lantern,
    shadow,
    triangles: count,
  }
}

const glsl = (v: number) => v.toFixed(6)

/** The moon on his own normals, in the shader, because he turns as he walks: S1b's `STREET_LIGHT` ambient and key on
 * `STREET_MOON`, constants written as literals, nothing under `light=0`. The normal is flipped to the side drawn. With
 * `lantern`, his lantern's light as well (V1). */
export function vincentMoon(lit: boolean, lantern = false): Omit<AliveInjection, 'key' | 'uniforms'> {
  if (!lit) return { vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }
  const m = STREET_MOON.clone().normalize()
  if (lantern) return lanternMoon(m)
  return {
    vertexHead: 'varying vec3 vMoonNormal;',
    vertexBody: 'vMoonNormal = normalize(mat3(modelMatrix) * normal);',
    fragmentHead: 'varying vec3 vMoonNormal;',
    fragmentBody: `diffuseColor.rgb *= ${glsl(STREET_LIGHT.ambient)} + ${glsl(STREET_LIGHT.key)} * max(0.0, dot(normalize(vMoonNormal) * (gl_FrontFacing ? 1.0 : -1.0), vec3(${glsl(m.x)}, ${glsl(m.y)}, ${glsl(m.z)})));`,
  }
}

/** His lantern: the glass's world position in xyz and the strength in w, written each frame (`StreetWalk.tsx`). w is 0
 * until a frame has the figure, and again once he unmounts, so nothing reads a light that is not there (Decision (j)). */
export const lanternUniform = { value: new Vector4(0, 0, 0, 0) }
/** The lantern's light on his own strokes, Fable's consult Q2: the lamps' glow, falling off over r 0.03. Warm 0.4 (spike
 * look pass 3: Fable's 0.6 greyed the smock's blue with the lantern raised beside it). */
export const LANTERN_LIFT = { warm: 0.4, r: 0.03 }
/** The uniform's registration, for `material()`'s `extra` part. */
export const lanternExtra: Omit<AliveInjection, 'key'> = { uniforms: { uLantern: lanternUniform }, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }

function lanternMoon(m: Vector3): Omit<AliveInjection, 'key' | 'uniforms'> {
  const g = new Color(LIFE.glow).multiplyScalar(LANTERN_LIFT.warm)
  const glowVec = `vec3(${glsl(g.r)}, ${glsl(g.g)}, ${glsl(g.b)})`
  return {
    vertexHead: 'varying vec3 vMoonNormal;\nvarying vec3 vVinWorld;',
    vertexBody: 'vMoonNormal = normalize(mat3(modelMatrix) * normal);\nvVinWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
    fragmentHead: 'varying vec3 vMoonNormal;\nvarying vec3 vVinWorld;\nuniform vec4 uLantern;',
    fragmentBody: `{
      vec3 vinN = normalize(vMoonNormal) * (gl_FrontFacing ? 1.0 : -1.0);
      vec3 vinToL = uLantern.xyz - vVinWorld;
      float vinD = length(vinToL);
      float vinK = max(0.0, dot(vinN, vinToL / max(vinD, 1e-5))) / (1.0 + vinD * vinD / ${glsl(LANTERN_LIFT.r * LANTERN_LIFT.r)});
      diffuseColor.rgb *= vec3(${glsl(STREET_LIGHT.ambient)} + ${glsl(STREET_LIGHT.key)} * max(0.0, dot(vinN, vec3(${glsl(m.x)}, ${glsl(m.y)}, ${glsl(m.z)})))) + ${glowVec} * vinK * uLantern.w;
    }`,
  }
}

/** The cypress's stroke body (as the street's faces), then the moon: before the fog's mix in `material()`'s order. */
export function vincentStrokeBody(lit: boolean, lantern = false): Omit<AliveInjection, 'key' | 'uniforms'> {
  const body = strokeGlslWith(CYPRESS_STROKE_BODY)
  const moon = vincentMoon(lit, lantern)
  return {
    vertexHead: [body.vertexHead, moon.vertexHead].join('\n'),
    vertexBody: [body.vertexBody, moon.vertexBody].join('\n'),
    fragmentHead: [body.fragmentHead, moon.fragmentHead].join('\n'),
    fragmentBody: [body.fragmentBody, moon.fragmentBody].join('\n'),
  }
}
