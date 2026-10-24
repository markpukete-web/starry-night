import { Color, SRGBColorSpace, Vector3 } from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, pushDrapedRibbon, type BrushArrays } from './brushForms.ts'
import { CYPRESS_STROKE_BODY, strokeGlslWith } from './cypressStrokeShader.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { VINCENT_RIG } from './streetLayout.ts'
import { STREET_LIGHT, STREET_MOON } from './streetLight.ts'
import { rectUnderpaint, STREET_SOURCES } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * Vincent (S2 task 3, `tasks/2026-10-24-street-s2-plan.md`, "Vincent's construction"): a few shapes clad in the
 * painting's strokes, seen small and from behind. His own frame: feet at the origin, `+y` up, `+z` the way he faces,
 * so `−x` is his right (three's handedness). Built once; Task 4 places and sways him.
 */

/** His paint, in the painting's pixels (1600 × 1267). The smock is the blue hills behind the village, 0.3 from the
 * village's blues (the Lead's scan); the hat is the cottages' thatch, 9.2 from `villageWarm`, near the bar of 10. */
export const VINCENT_SOURCES = {
  smock: [796, 868, 828, 900],
  hat: STREET_SOURCES.thatch,
  hair: STREET_SOURCES.roofSienna,
  canvas: STREET_SOURCES.plaster,
} as const

/** The ID classes the palette gate reads (`check-street-colour.ts`): the smock and his sleeves, the hat. */
export const VINCENT_CLASS = { smock: 7, hat: 8, none: 255 } as const

type Rect = readonly [number, number, number, number]
type Point = { p: Vector3; n: Vector3 }
/** A surface by two coordinates in 0..1: `a` round it (or across), `s` along it. */
type Surface = (a: number, s: number) => Point

export type VincentStrokes = { arrays: BrushArrays; stroke: number[]; seed: number[]; cls: number[] }
export type VincentPart = { strokes: VincentStrokes; underpaint: BrushArraysWithCls }
export type VincentBuild = { body: VincentPart; armLeft: VincentPart & { pivot: [number, number, number] }; shadow: BrushArrays; triangles: number }

/** The smock's profile: [y, radius], hem to neck, the shoulders a dome; x : z = 1.2 : 0.8 round it. */
const SMOCK: readonly [number, number][] = [[0.001, 0.0155], [0.02, 0.0138], [0.04, 0.0121], [0.056, 0.0109], [0.062, 0.0105], [0.0645, 0.0085], [0.066, 0.004]]
const SMOCK_SCALE = { x: 1.2, z: 0.8 }
const HEAD = { y: 0.071, r: 0.0065 }
const CROWN = { y0: 0.0745, y1: VINCENT_RIG.height, r: 0.0068 }
const BRIM = { y: 0.0745, r: 0.0145, droop: 0.0015 }
/** The arms hang outside the smock: at the plan's (±0.0135, 0.034) the hands sat inside it (the hem is 0.0155 × 1.2). */
const ARM = { shoulder: [0.0125, 0.059] as const, hand: [0.0185, 0.032] as const, r: 0.0032, rHand: 0.0026 }
/** The rolled canvas under his right arm: 0.032 long (the plan's 0.034 put its ends past the 0.02 depth bound). */
const CANVAS = { centre: new Vector3(-0.017, 0.049, 0), length: 0.032, r: 0.0035, turn: (10 * Math.PI) / 180 }
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

function sphere(centre: Vector3, r: number): Surface {
  return (a, s) => {
    const th = a * Math.PI * 2
    const ph = Math.PI * (1 - s) // s 0 at the bottom, 1 at the top
    const n = new Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))
    return { p: centre.clone().addScaledVector(n, r), n }
  }
}

/** A tapered tube from `from` to `to`; `s` runs along it, `a` round it. */
function tube(from: Vector3, to: Vector3, r0: number, r1: number): Surface {
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

/** The hat's brim: `a` round it, `s` from the crown out to the drooping edge. */
function brim(): Surface {
  const slope = new Vector3(BRIM.r - CROWN.r, -BRIM.droop, 0)
  return (a, s) => {
    const th = a * Math.PI * 2
    const r = CROWN.r + (BRIM.r - CROWN.r) * s
    const n = new Vector3(BRIM.droop * Math.cos(th), slope.x, BRIM.droop * Math.sin(th)).normalize()
    return { p: new Vector3(Math.cos(th) * r, BRIM.y - BRIM.droop * s * s, Math.sin(th) * r), n }
  }
}

function texel(painting: ImageData2D, rect: Rect, rand: () => number): Color {
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const x = Math.min(painting.width - 1, Math.floor((rect[0] + rand() * (rect[2] - rect[0])) * sx))
  const y = Math.min(painting.height - 1, Math.floor((rect[1] + rand() * (rect[3] - rect[1])) * sy))
  const i = (y * painting.width + x) * 4
  return new Color().setRGB(painting.data[i] / 255, painting.data[i + 1] / 255, painting.data[i + 2] / 255, SRGBColorSpace)
}

function underpaintColour(painting: ImageData2D, rect: Rect): Color {
  return new Color().setRGB(...rectUnderpaint(painting, rect, 0.4), SRGBColorSpace)
}

function emptyPart(): VincentPart {
  return { strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] }, underpaint: { ...makeBrushArrays(), cls: [], src: [] } }
}

const COLUMNS = 3

/** One stroke draped on a surface over [a0, a1] × [s0, s1], `steps` along it, lifted off the surface. */
function stroke(into: VincentStrokes, surface: Surface, a0: number, a1: number, s0: number, s1: number, steps: number, colour: Color, cls: number, seed: number): void {
  const rows: Vector3[][] = []
  for (let k = 0; k < steps; k++) {
    const s = s0 + ((s1 - s0) * k) / (steps - 1)
    const row: Vector3[] = []
    for (let j = 0; j < COLUMNS; j++) {
      const { p, n } = surface(a0 + ((a1 - a0) * j) / (COLUMNS - 1), s)
      row.push(p.addScaledVector(n, LIFT))
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
function solid(into: BrushArraysWithCls, surface: Surface, na: number, ns: number, colour: Color, cls: number, s0 = 0, s1 = 1): void {
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

/** Strokes round a surface: `count` of them, each a little wider than its share so the underpaint shows only between. */
function clad(part: VincentPart, surface: Surface, count: number, steps: number, painting: ImageData2D, rect: Rect, cls: number, rand: () => number, around: [number, number] = [0, 1], along: [number, number] = [0, 1]): void {
  const span = (around[1] - around[0]) / count
  for (let i = 0; i < count; i++) {
    const centre = around[0] + span * (i + 0.5 + (rand() - 0.5) * 0.3)
    const half = span * (0.6 + rand() * 0.15)
    const s0 = along[0] + rand() * 0.06 * (along[1] - along[0])
    const s1 = along[1] - rand() * 0.06 * (along[1] - along[0])
    stroke(part.strokes, surface, centre - half, centre + half, s0, s1, steps, texel(painting, rect, rand), cls, rand())
  }
}

function triangles(part: VincentPart): number {
  return (part.strokes.arrays.indices.length + part.underpaint.indices.length) / 3
}

export function buildVincent(painting: ImageData2D): VincentBuild {
  const rand = mulberry32(0x5a7e)
  const body = emptyPart()
  const smockCls = VINCENT_CLASS.smock
  const smock = revolve(SMOCK, SMOCK_SCALE.x, SMOCK_SCALE.z)
  solid(body.underpaint, smock, 16, 8, underpaintColour(painting, VINCENT_SOURCES.smock), smockCls)
  // two tiers of strokes, hem to waist and waist over the shoulders, overlapping, so no one stroke runs his full height
  clad(body, smock, 18, 6, painting, VINCENT_SOURCES.smock, smockCls, rand, [0, 1], [0, 0.56])
  clad(body, smock, 16, 6, painting, VINCENT_SOURCES.smock, smockCls, rand, [0.03, 1.03], [0.44, 1])

  const head = sphere(new Vector3(0, HEAD.y, 0), HEAD.r)
  solid(body.underpaint, head, 12, 8, underpaintColour(painting, VINCENT_SOURCES.hair), VINCENT_CLASS.none)
  // the hair over the back of his head (−z, the side the camera sees), crown to nape
  clad(body, head, 6, 6, painting, VINCENT_SOURCES.hair, VINCENT_CLASS.none, rand, [0.5, 1], [0.15, 0.95])

  const crown = revolve([[CROWN.y0, CROWN.r], [CROWN.y1 - 0.0012, CROWN.r * 0.96], [CROWN.y1, CROWN.r * 0.6], [CROWN.y1, 0]], 1, 1)
  const hatColour = underpaintColour(painting, VINCENT_SOURCES.hat)
  solid(body.underpaint, crown, 16, 4, hatColour, VINCENT_CLASS.hat)
  clad(body, crown, 8, 4, painting, VINCENT_SOURCES.hat, VINCENT_CLASS.hat, rand, [0, 1], [0, 0.75])
  const hatBrim = brim()
  solid(body.underpaint, hatBrim, 24, 3, hatColour, VINCENT_CLASS.hat)
  clad(body, hatBrim, 12, 4, painting, VINCENT_SOURCES.hat, VINCENT_CLASS.hat, rand)

  // the right arm (−x) holds the canvas against him; it does not swing
  const rightArm = tube(new Vector3(-ARM.shoulder[0], ARM.shoulder[1], 0), new Vector3(-ARM.hand[0], ARM.hand[1], 0.004), ARM.r, ARM.rHand)
  solid(body.underpaint, rightArm, 8, 4, underpaintColour(painting, VINCENT_SOURCES.smock), smockCls)
  clad(body, rightArm, 3, 5, painting, VINCENT_SOURCES.smock, smockCls, rand)

  const roll = tube(
    CANVAS.centre.clone().add(new Vector3(Math.sin(CANVAS.turn), 0, Math.cos(CANVAS.turn)).multiplyScalar(-CANVAS.length / 2)),
    CANVAS.centre.clone().add(new Vector3(Math.sin(CANVAS.turn), 0, Math.cos(CANVAS.turn)).multiplyScalar(CANVAS.length / 2)),
    CANVAS.r,
    CANVAS.r,
  )
  solid(body.underpaint, roll, 10, 2, underpaintColour(painting, VINCENT_SOURCES.canvas), VINCENT_CLASS.none)
  clad(body, roll, 3, 4, painting, VINCENT_SOURCES.canvas, VINCENT_CLASS.none, rand)

  // the left arm (+x) is its own part about its shoulder, so Task 4 swings it without rewriting a vertex
  const pivot: [number, number, number] = [ARM.shoulder[0], ARM.shoulder[1], 0]
  const armLeft = emptyPart()
  const leftArm = tube(new Vector3(0, 0, 0), new Vector3(ARM.hand[0] - ARM.shoulder[0], ARM.hand[1] - ARM.shoulder[1], 0), ARM.r, ARM.rHand)
  solid(armLeft.underpaint, leftArm, 8, 4, underpaintColour(painting, VINCENT_SOURCES.smock), smockCls)
  clad(armLeft, leftArm, 3, 5, painting, VINCENT_SOURCES.smock, smockCls, rand)

  const shadow = makeBrushArrays()
  shadow.positions.push(0, SHADOW.y, 0)
  shadow.colors.push(0, 0, 0)
  for (let i = 0; i < SHADOW.segments; i++) {
    const th = (i / SHADOW.segments) * Math.PI * 2
    shadow.positions.push(Math.cos(th) * SHADOW.across, SHADOW.y, Math.sin(th) * SHADOW.along)
    shadow.colors.push(0, 0, 0)
    shadow.indices.push(0, 1 + ((i + 1) % SHADOW.segments), 1 + i)
  }

  return { body, armLeft: { ...armLeft, pivot }, shadow, triangles: triangles(body) + triangles(armLeft) + shadow.indices.length / 3 }
}

const glsl = (v: number) => v.toFixed(6)

/** The moon on his own normals, in the shader, because he turns as he walks: S1b's `STREET_LIGHT` ambient and key on
 * `STREET_MOON`, constants written as literals, nothing under `light=0`. The normal is flipped to the side drawn. */
export function vincentMoon(lit: boolean): Omit<AliveInjection, 'key' | 'uniforms'> {
  if (!lit) return { vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }
  const m = STREET_MOON.clone().normalize()
  return {
    vertexHead: 'varying vec3 vMoonNormal;',
    vertexBody: 'vMoonNormal = normalize(mat3(modelMatrix) * normal);',
    fragmentHead: 'varying vec3 vMoonNormal;',
    fragmentBody: `diffuseColor.rgb *= ${glsl(STREET_LIGHT.ambient)} + ${glsl(STREET_LIGHT.key)} * max(0.0, dot(normalize(vMoonNormal) * (gl_FrontFacing ? 1.0 : -1.0), vec3(${glsl(m.x)}, ${glsl(m.y)}, ${glsl(m.z)})));`,
  }
}

/** The cypress's stroke body (as the street's faces), then the moon: before the fog's mix in `material()`'s order. */
export function vincentStrokeBody(lit: boolean): Omit<AliveInjection, 'key' | 'uniforms'> {
  const body = strokeGlslWith(CYPRESS_STROKE_BODY)
  const moon = vincentMoon(lit)
  return {
    vertexHead: [body.vertexHead, moon.vertexHead].join('\n'),
    vertexBody: [body.vertexBody, moon.vertexBody].join('\n'),
    fragmentHead: [body.fragmentHead, moon.fragmentHead].join('\n'),
    fragmentBody: [body.fragmentBody, moon.fragmentBody].join('\n'),
  }
}
