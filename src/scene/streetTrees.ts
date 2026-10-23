import { Color, SRGBColorSpace, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, MOON_DIR, pushDrapedRibbon, type BrushArrays } from './brushForms.ts'
import { pushDome, type LandTrees } from './landDomes.ts'
import type { LandMass } from './landMasses.ts'
import { PALETTE } from './palette.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The street's trees (pass 6, the design's "trees take Simon's structure"): a dark twisting trunk with branches in the
 * houses' ink, carrying round clumps. Each clump is a sphere in the curls' darkest tenth under curled dabs that wrap
 * around it, in the painting's own tree curls (`TREE_CURLS`): the moonward and outer dabs take the pale crests, the
 * inner and lower the dark. Sizes are fractions of the crown's radius R. The dabs' scale is the village
 * trees' curls at 1:1 (task 1 on `orchard-lower`: arcs 15–25 px wide and 60–120 px long in a 240 px tall box, so
 * 0.5–1.0 R long and 0.12–0.2 R wide). The dabs run 0.4–0.8 R, so a curl stays on its clump. Each dab is a crescent
 * turned its own way, as the painting's curls are.
 */
export const STREET_TREE = {
  /** the crown's radius: half the mass's width, clamped */
  crown: [0.12, 0.17],
  /** the fork's height, plus `forkPerR` × R */
  fork: 0.14,
  forkPerR: 0.3,
  clumps: 7,
  /** a clump's radius over the crown's, then × 0.85–1.15 */
  clump: 0.42,
  dabs: 150,
  /** a dab's arc length and half-width, fractions of the crown's radius, and the sweep of its crescent (radians) */
  dabLength: [0.4, 0.8],
  dabHalfWidth: [0.06, 0.1],
  curlSweep: [1.4, 2.4],
  /** the trunk's radius at the ground and at the fork, a branch's at the fork and at its clump, fractions of R */
  trunk: [0.09, 0.06],
  branch: [0.035, 0.015],
  /** ink strokes along the trunk, each ±0.5 rad round it */
  barkStrokes: 4,
} as const

/**
 * The painting's tree curls, in 1600 px coordinates: the middle of the curled tree right of the church, every texel a
 * curl, pale cyan crests to blue-black. Pass 6: the masses' boxes hold walls, roofs, a field and a window, and the
 * foliage filter that keeps those out dropped the pale crests too, so the crowns came out dark.
 */
export const TREE_CURLS = [1000, 995, 1072, 1039] as const

const INK = new Color(PALETTE.ground)
const STEPS = 9
const COLUMNS = 3
const LIFT_LEVELS = 16

type Pigment = [number, number, number]

/** Every texel of `TREE_CURLS`, darkest first (sRGB 0..1). */
function curlPigments(painting: ImageData2D): Pigment[] {
  const out: [number, Pigment][] = []
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  for (let y = Math.floor(TREE_CURLS[1] * sy); y < Math.ceil(TREE_CURLS[3] * sy); y++) {
    for (let x = Math.floor(TREE_CURLS[0] * sx); x < Math.ceil(TREE_CURLS[2] * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      out.push([0.299 * r + 0.587 * g + 0.114 * b, [r / 255, g / 255, b / 255]])
    }
  }
  return out.sort((a, b) => a[0] - b[0]).map((o) => o[1])
}

/** The tube's frame at point i: two unit vectors across the path's tangent. */
function tubeFrame(path: Vector3[], i: number): [Vector3, Vector3] {
  const tangent = path[Math.min(i + 1, path.length - 1)].clone().sub(path[Math.max(i - 1, 0)]).normalize()
  const side = new Vector3(0, 1, 0).cross(tangent)
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
  side.normalize()
  return [side, tangent.clone().cross(side).normalize()]
}

/** A tapering tube along a polyline, closed rings of `around` points, appended to the solid. */
function pushTube(arr: BrushArrays, path: Vector3[], r0: number, r1: number, colour: Color, around = 6): void {
  const base = arr.positions.length / 3
  for (let i = 0; i < path.length; i++) {
    const [side, up] = tubeFrame(path, i)
    const r = r0 + (r1 - r0) * (i / (path.length - 1))
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2
      const p = path[i].clone().addScaledVector(side, r * Math.cos(a)).addScaledVector(up, r * Math.sin(a))
      // the leaning foot's ring would dip under the ground
      arr.positions.push(p.x, Math.max(0, p.y), p.z)
      arr.colors.push(colour.r, colour.g, colour.b)
    }
  }
  for (let i = 0; i < path.length - 1; i++) {
    for (let k = 0; k < around; k++) {
      const a = base + i * around + k
      const b = base + i * around + ((k + 1) % around)
      arr.indices.push(a, b, a + around, b, b + around, a + around)
    }
  }
}

/** Points along a cubic Bézier. */
function bezier(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, n: number): Vector3[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const u = 1 - t
    return p0.clone().multiplyScalar(u * u * u)
      .addScaledVector(p1, 3 * u * u * t)
      .addScaledVector(p2, 3 * u * t * t)
      .addScaledVector(p3, t * t * t)
  })
}

/** The street's trees as the land's trees' buffers, so the street's meshes and the ID pass take them unchanged. */
export function buildStreetTrees(painting: ImageData2D, masses: readonly LandMass[], seed = 0x7ee5): LandTrees {
  const solid = makeBrushArrays()
  const strokes = makeBrushArrays()
  const stroke: number[] = []
  const seeds: number[] = []
  const counts: LandTrees['counts'] = {}
  const T = STREET_TREE
  const colour = new Color()
  const palette = curlPigments(painting)
  const dark = palette.slice(0, Math.max(1, Math.floor(palette.length / 10)))
  const under = [0, 1, 2].map((c) => dark.reduce((sum, p) => sum + p[c], 0) / dark.length)
  const mid = palette[Math.floor(palette.length / 2)]

  masses.forEach((mass, index) => {
    const rand = mulberry32(seed + index * 7919)
    const between = (range: readonly [number, number]) => range[0] + (range[1] - range[0]) * rand()
    const pushStroke = (steps: Vector3[][], tint: Color) => {
      pushDrapedRibbon(strokes, steps, steps.map(() => tint))
      // the ribbons' seed range (`cypressStrokes.ts`), which the stroke body hashes
      const strokeSeed = rand() * 1000
      for (let i = 0; i < steps.length; i++) {
        for (let j = 0; j < steps[i].length; j++) {
          stroke.push(i / (steps.length - 1), j / (steps[i].length - 1))
          seeds.push(strokeSeed)
        }
      }
    }
    const R = Math.min(T.crown[1], Math.max(T.crown[0], mass.width / 2))
    const forkY = T.fork + T.forkPerR * R

    // the trunk: from the ground to the fork, leaning and twisting
    const lean = rand() * Math.PI * 2
    const leanDir = new Vector3(Math.cos(lean), 0, Math.sin(lean))
    const twist = new Vector3(-leanDir.z, 0, leanDir.x)
    const foot = new Vector3(mass.x, 0, mass.z)
    const fork = foot.clone().addScaledVector(leanDir, 0.25 * R).setY(forkY)
    const trunk = bezier(
      foot,
      foot.clone().addScaledVector(twist, 0.2 * R).setY(forkY * 0.35),
      fork.clone().addScaledVector(twist, -0.15 * R).setY(forkY * 0.7),
      fork,
      8,
    )
    pushTube(solid, trunk, T.trunk[0] * R, T.trunk[1] * R, INK)
    // the bark: ink strokes along the trunk, the moon's side lifted toward the curls' middle tone
    for (let k = 0; k < T.barkStrokes; k++) {
      const a0 = (k / T.barkStrokes) * Math.PI * 2 + (rand() - 0.5) * 0.4
      const steps = trunk.map((point, i) => {
        const [side, up] = tubeFrame(trunk, i)
        const r = (T.trunk[0] + (T.trunk[1] - T.trunk[0]) * (i / (trunk.length - 1))) * R * 1.12
        return Array.from({ length: COLUMNS }, (_, j) => {
          const a = a0 + 0.5 * (2 * (j / (COLUMNS - 1)) - 1)
          const p = point.clone().addScaledVector(side, r * Math.cos(a)).addScaledVector(up, r * Math.sin(a))
          return p.setY(Math.max(0, p.y))
        })
      })
      const [side, up] = tubeFrame(trunk, trunk.length >> 1)
      const facing = side.multiplyScalar(Math.cos(a0)).addScaledVector(up, Math.sin(a0))
      const lit = new Color().setRGB(mid[0], mid[1], mid[2], SRGBColorSpace)
      pushStroke(steps, INK.clone().lerp(lit, 0.5 * Math.max(0, facing.dot(MOON_DIR))).multiplyScalar(between([0.9, 1.1])))
    }

    // the clumps: one on top, the rest in a ring about the crown's centre
    const crownCentre = fork.clone().setY(forkY + 0.5 * R)
    const clumps: { centre: Vector3; r: number }[] = []
    for (let k = 0; k < T.clumps; k++) {
      const r = T.clump * R * between([0.85, 1.15])
      if (k === 0) {
        clumps.push({ centre: crownCentre.clone().setY(crownCentre.y + 0.5 * R), r })
        continue
      }
      const a = ((k - 1) / (T.clumps - 1)) * Math.PI * 2 + (rand() - 0.5) * 0.5
      const reach = (R - 0.6 * r) * between([0.85, 1])
      const dy = (k % 2 ? -0.2 : 0.15) * R
      clumps.push({ centre: crownCentre.clone().add(new Vector3(Math.cos(a) * reach, dy, Math.sin(a) * reach)), r })
    }

    // the branches: from the fork to each clump, rising, ending inside it
    for (const clump of clumps) {
      const reach = clump.centre.distanceTo(fork)
      const path = bezier(fork, fork.clone().setY(fork.y + 0.3 * reach), clump.centre.clone().lerp(fork, 0.4), clump.centre, 6)
      pushTube(solid, path, T.branch[0] * R, T.branch[1] * R, INK, 5)
    }

    counts[mass.id] = { front: 0, back: 0 }
    colour.setRGB(under[0], under[1], under[2], SRGBColorSpace)
    for (const clump of clumps) {
      pushDome(solid, { centre: clump.centre, rx: clump.r, ry: clump.r, rz: clump.r }, colour, 16, 10)
      const outward = clump.centre.clone().sub(crownCentre)
      if (outward.lengthSq() > 1e-8) outward.normalize()
      for (let d = 0; d < T.dabs; d++) {
        // a crescent curl: an arc of a small circle on the clump's sphere through a random point n, turned a random
        // way, its angular radius β from the curl's radius (the arc's length over its sweep)
        const z = 2 * rand() - 1
        const lon = rand() * Math.PI * 2
        const n = new Vector3(Math.sqrt(1 - z * z) * Math.cos(lon), z, Math.sqrt(1 - z * z) * Math.sin(lon))
        const ref = Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
        const u0 = ref.cross(n).normalize()
        const v0 = n.clone().cross(u0)
        const turn = rand() * Math.PI * 2
        const v = u0.clone().multiplyScalar(Math.cos(turn)).addScaledVector(v0, Math.sin(turn))
        const radius = clump.r * (1.02 + 0.003 * (d % LIFT_LEVELS))
        const length = between(T.dabLength) * R
        const halfWidth = between(T.dabHalfWidth) * R
        const beta = Math.asin(Math.min(0.95, length / between(T.curlSweep) / radius))
        const sweep = Math.min(2.6, length / (radius * Math.sin(beta)))
        const m = n.clone().multiplyScalar(Math.cos(beta)).addScaledVector(v, Math.sin(beta))
        const a = n.clone().addScaledVector(m, -Math.cos(beta)).normalize()
        const b = m.clone().cross(a)
        const steps: Vector3[][] = []
        for (let i = 0; i < STEPS; i++) {
          const t = i / (STEPS - 1)
          const alpha = (t - 0.5) * sweep
          const half = (halfWidth / radius) * (0.35 + 0.65 * Math.sin(Math.PI * t))
          steps.push(Array.from({ length: COLUMNS }, (_, j) => {
            const g = beta + half * (2 * (j / (COLUMNS - 1)) - 1)
            return clump.centre.clone().addScaledVector(
              m.clone().multiplyScalar(Math.cos(g)).addScaledVector(a, Math.sin(g) * Math.cos(alpha)).addScaledVector(b, Math.sin(g) * Math.sin(alpha)),
              radius,
            )
          }))
        }
        // the tone: the moon's light and the crown's outside take the pale pigments, its inside the dark
        // (the light term averages about 0.25 over a sphere, so doubled the crown's mean pigment sits near the curls'
        // median; pass 6's first trees took it to the power 1.3, about the 17th percentile, and came out dark)
        const tone = Math.min(1, Math.max(0, 2 * (0.6 * Math.max(0, n.dot(MOON_DIR)) + 0.4 * Math.max(0, n.dot(outward))) + (rand() - 0.5) * 0.3))
        const pigment = palette[Math.floor(tone * (palette.length - 1))]
        const tint = new Color().setRGB(pigment[0], pigment[1], pigment[2], SRGBColorSpace).multiplyScalar(between([0.965, 1.035]))
        pushStroke(steps, tint)
        counts[mass.id].front++
      }
    }
  })

  // the street does not bend its trees (touch is off in street mode): the weights are zero
  return { solid, strokes, stroke, seed: seeds, counts, bend: new Array(strokes.positions.length / 3).fill(0), solidBend: new Array(solid.positions.length / 3).fill(0) }
}
