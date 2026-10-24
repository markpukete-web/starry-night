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
  /** the fork's height, plus `forkPerR` × R (pass 7: was 0.14 + 0.3 R, a bare pole under a ball; Simon's olive forks low) */
  fork: 0.08,
  forkPerR: 0.35,
  /** the fork's lean off the foot, fractions of R */
  lean: 0.2,
  /** limbs out of the fork, each splitting into two twigs to two clumps, and one clump on top: 2 × limbs + 1 clumps */
  limbs: 4,
  /** where a limb splits: out and up from the fork; its twigs' clumps: the outer out and level, the inner in and up */
  split: { out: 0.45, up: [0.4, 0.55] },
  outer: { out: 0.85, up: 0, turn: 0.35 },
  inner: { out: 0.35, up: 0.7, turn: -0.5 },
  /** the top clump's height over the fork, so the smallest crown still clears L4's eave of 0.3 */
  top: 1.6,
  /** a clump's radius over the crown's, then × 0.85–1.15 (pass 7: was 0.42, which merged seven clumps into one ball) */
  clump: 0.28,
  /** a clump is a dome, wider than tall, as Simon's olives' are (pass 7: a sphere read as topiary) */
  dome: [1.15, 0.8],
  /** curls per clump: 1,035 a tree, against pass 6's 1,050, so the trees cost no more triangles than before pass 7
   * (slice 3's grass counts on the headroom) */
  dabs: 115,
  /** a dab's arc length and half-width, fractions of the crown's radius, and the sweep of its crescent (radians) */
  dabLength: [0.3, 0.55],
  dabHalfWidth: [0.05, 0.08],
  curlSweep: [1.4, 2.4],
  /** radii, fractions of R: the trunk at its flared foot, above the flare and at the fork; a limb at the fork and at
   * its split; a twig at the split and at its clump (pass 7: the trunk was 0.09 to 0.06, the branches 0.035 to 0.015) */
  trunk: [0.2, 0.14, 0.1],
  flare: 0.15,
  limb: [0.08, 0.05],
  twig: [0.045, 0.025],
  /** ink strokes along the trunk, each ±0.5 rad round it, and how far the moon's side lifts toward the curls' middle */
  barkStrokes: 6,
  barkLight: 0.75,
  /** the canopy shades its own lower clumps: a clump's tone shifts by this × (its height in the crown − 0.5) */
  canopy: 0.2,
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

/** A tube along a polyline, its radius a function of the fraction along it, closed rings of `around` points. */
function pushTube(arr: BrushArrays, path: Vector3[], radius: (f: number) => number, colour: Color, around = 6): void {
  const base = arr.positions.length / 3
  for (let i = 0; i < path.length; i++) {
    const [side, up] = tubeFrame(path, i)
    const r = radius(i / (path.length - 1))
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

    // the trunk: from a flared foot to the fork, bent into an S across its lean
    const lean = rand() * Math.PI * 2
    const leanDir = new Vector3(Math.cos(lean), 0, Math.sin(lean))
    const twist = new Vector3(-leanDir.z, 0, leanDir.x)
    const foot = new Vector3(mass.x, 0, mass.z)
    const fork = foot.clone().addScaledVector(leanDir, T.lean * R).setY(forkY)
    const trunk = bezier(
      foot,
      foot.clone().addScaledVector(twist, 0.35 * R).setY(forkY * 0.35),
      fork.clone().addScaledVector(twist, -0.3 * R).setY(forkY * 0.7),
      fork,
      12,
    )
    const trunkRadius = (f: number) => R * (f < T.flare
      ? T.trunk[0] + (T.trunk[1] - T.trunk[0]) * (f / T.flare)
      : T.trunk[1] + (T.trunk[2] - T.trunk[1]) * ((f - T.flare) / (1 - T.flare)))
    pushTube(solid, trunk, trunkRadius, INK, 10)
    // the bark: ink strokes along the trunk, the moon's side lifted toward the curls' middle tone
    for (let k = 0; k < T.barkStrokes; k++) {
      const a0 = (k / T.barkStrokes) * Math.PI * 2 + (rand() - 0.5) * 0.4
      const steps = trunk.map((point, i) => {
        const [side, up] = tubeFrame(trunk, i)
        const r = trunkRadius(i / (trunk.length - 1)) * 1.12
        return Array.from({ length: COLUMNS }, (_, j) => {
          const a = a0 + 0.5 * (2 * (j / (COLUMNS - 1)) - 1)
          const p = point.clone().addScaledVector(side, r * Math.cos(a)).addScaledVector(up, r * Math.sin(a))
          return p.setY(Math.max(0, p.y))
        })
      })
      const [side, up] = tubeFrame(trunk, trunk.length >> 1)
      const facing = side.multiplyScalar(Math.cos(a0)).addScaledVector(up, Math.sin(a0))
      const lit = new Color().setRGB(mid[0], mid[1], mid[2], SRGBColorSpace)
      pushStroke(steps, INK.clone().lerp(lit, T.barkLight * Math.max(0, facing.dot(MOON_DIR))).multiplyScalar(between([0.9, 1.1])))
    }

    // the limbs: out of the fork and up to a split, each splitting into two twigs, an outer clump out and level and an
    // inner one in and up, so the clumps stand at three heights with the limbs showing between them; one clump on top
    const up = new Vector3(0, 1, 0)
    const turned = (dir: Vector3, by: number) => new Vector3(dir.x * Math.cos(by) - dir.z * Math.sin(by), 0, dir.x * Math.sin(by) + dir.z * Math.cos(by))
    const limbRadius = (f: number) => R * (T.limb[0] + (T.limb[1] - T.limb[0]) * f)
    const twigRadius = (f: number) => R * (T.twig[0] + (T.twig[1] - T.twig[0]) * f)
    const clumps: { centre: Vector3; r: number }[] = []
    const reachTo = (from: Vector3, to: Vector3, radius: (f: number) => number, around: number) => {
      const d = to.distanceTo(from)
      pushTube(solid, bezier(from, from.clone().addScaledVector(up, 0.3 * d), to.clone().lerp(from, 0.35), to, 6), radius, INK, around)
    }
    for (let k = 0; k < T.limbs; k++) {
      const dir = turned(leanDir, (k / T.limbs) * Math.PI * 2 + (rand() - 0.5) * 0.5)
      const split = fork.clone().addScaledVector(dir, T.split.out * R).addScaledVector(up, between(T.split.up) * R)
      reachTo(fork, split, limbRadius, 6)
      for (const twin of [T.outer, T.inner]) {
        const centre = fork.clone().addScaledVector(turned(dir, twin.turn), twin.out * R).setY(split.y + twin.up * R)
        reachTo(split, centre, twigRadius, 5)
        clumps.push({ centre, r: T.clump * R * between([0.85, 1.15]) })
      }
    }
    const topCentre = fork.clone().addScaledVector(leanDir, 0.1 * R).setY(forkY + T.top * R)
    reachTo(fork, topCentre, limbRadius, 6)
    clumps.push({ centre: topCentre, r: T.clump * R * between([0.85, 1.15]) })
    const crownCentre = fork.clone().setY(forkY + 0.75 * R)
    const lowest = Math.min(...clumps.map((c) => c.centre.y))
    const highest = Math.max(...clumps.map((c) => c.centre.y))

    counts[mass.id] = { front: 0, back: 0 }
    colour.setRGB(under[0], under[1], under[2], SRGBColorSpace)
    for (const clump of clumps) {
      pushDome(solid, { centre: clump.centre, rx: T.dome[0] * clump.r, ry: T.dome[1] * clump.r, rz: T.dome[0] * clump.r }, colour, 12, 8)
      const flatten = new Vector3(T.dome[0], T.dome[1], T.dome[0])
      const shade = T.canopy * ((clump.centre.y - lowest) / Math.max(1e-6, highest - lowest) - 0.5)
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
            return clump.centre.clone().add(
              m.clone().multiplyScalar(Math.cos(g)).addScaledVector(a, Math.sin(g) * Math.cos(alpha)).addScaledVector(b, Math.sin(g) * Math.sin(alpha))
                .multiplyScalar(radius).multiply(flatten),
            )
          }))
        }
        // the tone: the moon's light and the crown's outside take the pale pigments, its inside the dark
        // (the light term averages about 0.25 over a sphere, so doubled the crown's mean pigment sits near the curls'
        // median; pass 6's first trees took it to the power 1.3, about the 17th percentile, and came out dark)
        const tone = Math.min(1, Math.max(0, 2 * (0.6 * Math.max(0, n.dot(MOON_DIR)) + 0.4 * Math.max(0, n.dot(outward))) + shade + (rand() - 0.5) * 0.3))
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
