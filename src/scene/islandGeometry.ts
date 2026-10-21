import { Color, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { PALETTE } from './palette.ts'
import { makeBrushArrays, moonShade, pushBrush, smooth, vnoise, type BrushArrays } from './brushForms.ts'
import { coastR, topY } from './islandShape.ts'

/**
 * The floating landmass's geometry, pure (E2 moved it out of `BrushIsland.tsx` so the root's cladding can be
 * hashed under node and kept byte for byte when the top's cladding changes): a real closed, rooted solid, its top
 * the dark ground under the painting's own strokes (landStrokes.ts), dissolving to dark earth down the root.
 * Footprint and height maths live in ./islandShape. Plain `.ts` imports only.
 */

const ROOT_DEPTH = 2.2 // how far the root plunges below the rim
const SEG = 120 // segments around
const RT = 16 // rings centre → coast
const RS = 12 // rings coast → root tip
const STROKES = 7200 // the top's former dab count: the root's stream still skips their draws
const ROOT_STROKES = 2800

/** A point on the root surface (coast rim k=0 → keel k=1) — shared by the solid rings and the
 *  root cladding so the strokes hug the exact same surface. */
function rootPoint(ang: number, k: number, out: Vector3): Vector3 {
  const edge = coastR(ang)
  const taper = 1 - smooth(0, 1, k) * 0.82
  const rad = Math.max(0.04, edge * taper)
  const cx = Math.cos(ang)
  const sz = Math.sin(ang)
  const rimY = topY(cx * edge, sz * edge) * 0.55
  const drop = ROOT_DEPTH * (k * k * 0.7 + k * 0.3)
  const y = rimY - drop + (vnoise(cx * 3, sz * 3 + k * 5) - 0.5) * 0.15 * (1 - k)
  return out.set(cx * rad, y, sz * rad)
}

export type IslandArrays = {
  solid: { positions: number[]; colors: number[]; indices: number[] }
  /** the root's dabs (the top's went in E2); `rootStart` is the root's first vertex, 0 since */
  strokes: BrushArrays
  rootStart: number
}

export function buildIsland(): IslandArrays {
    const earth = new Color(PALETTE.hills)
    const abyss = earth.clone().multiplyScalar(0.07) // root dissolving into night
    const rootBase = earth.clone().multiplyScalar(0.70) // darker under-shell so stroke gaps read as shadow
    // Darker ground than the July values (top 1.88, #284260/#477594, crest 2.72): the 2026-10-05
    // village study lowered them so the pale church and houses separate from the hill, and Mark
    // approved the village on these values (R5, F2, C1 — tasks/2026-10-06-village-context.md).
    // E2: the top is the dark ground the strokes' gaps show: hills × 0.3 in linear light (≈ 0.58 in sRGB, L 28,
    // under the darkest strokes' L 23–30; at 0.55 the gaps sat at L 36, lighter than a quarter of the strokes,
    // and the apron flattened, capture 1). The dabs' 1.15 read as bare clay.
    const topBase = new Color(PALETTE.hills).multiplyScalar(0.3)
    const hillLit = new Color(PALETTE.hillsCrest).multiplyScalar(1.3)

    // --- closed rooted solid (dark base) ---
    const rows = RT + RS + 1
    const cols = SEG + 1
    const sPos: number[] = []
    const sCol: number[] = []
    const sIdx: number[] = []
    const cc = new Color()
    const rp = new Vector3()
    for (let r = 0; r < rows; r++) {
      for (let j = 0; j < cols; j++) {
        const ang = (j / SEG) * Math.PI * 2
        const edge = coastR(ang)
        let x: number
        let y: number
        let z: number
        let depth: number
        if (r <= RT) {
          const fr = r / RT
          const rad = fr * edge
          x = Math.cos(ang) * rad
          z = Math.sin(ang) * rad
          y = topY(x, z) * smooth(1, 0.55, fr) // flatten toward the rim so forms sit level-ish
          depth = 0
        } else {
          const k = (r - RT) / RS
          rootPoint(ang, k, rp)
          x = rp.x
          y = rp.y
          z = rp.z
          depth = k
        }
        sPos.push(x, y, z)
        if (depth === 0) cc.copy(topBase)
        else cc.copy(rootBase).lerp(abyss, smooth(0.05, 0.85, depth))
        sCol.push(cc.r, cc.g, cc.b)
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let j = 0; j < SEG; j++) {
        const a = r * cols + j
        const b = a + 1
        const c = a + cols
        const d = c + 1
        sIdx.push(a, b, c, b, d, c)
      }
    }
    // close the root to a single keel point (never an open bottom)
    const keel = sPos.length / 3
    sPos.push(0, -ROOT_DEPTH - 0.2, 0)
    cc.copy(abyss)
    sCol.push(cc.r, cc.g, cc.b)
    const lastRing = (rows - 1) * cols
    for (let j = 0; j < SEG; j++) sIdx.push(keel, lastRing + j, lastRing + j + 1)


    // --- the top: no dabs since E2 (the ground strokes, landStrokes.ts, clad it from the painting's own field).
    // The root's random stream is advanced past the top's 7,200 dabs, six draws each, so its every choice is the
    // one main built at b54fd68 (the hash in scripts/island-geometry.test.ts; Codex, E2 plan review F14).
    const rng = mulberry32(0x15_1a_9d)
    for (let s = 0; s < STROKES * 6; s++) rng()
    const arr = makeBrushArrays()
    const p = new Vector3()
    const nrm = new Vector3()
    const tangent = new Vector3()
    const strokeCol = new Color()

    const rootStart = arr.positions.length / 3
    // --- root cladding: the underside was the one smooth unpainted surface (a grey-cone tell).
    // Downward-flowing marks in the same earth→night gradient as the shell, dense at the rim and
    // dissolving toward the keel so the island still melts into the dark. Strokes carry the full
    // earth value over the darkened shell — gaps read as shadow, the same recipe as every form.
    // Fur trap (cypress lesson): long slim marks with stick-out read as thorns at the silhouette.
    // Root marks are therefore SHORT and BROAD, hugging the surface, starting below the rim.
    const alongRing = new Vector3()
    const downRoot = new Vector3()
    const rockLit = earth.clone().multiplyScalar(1.38)
    for (let s = 0; s < ROOT_STROKES; s++) {
      const ang = rng() * Math.PI * 2
      const k = 0.07 + Math.pow(rng(), 1.35) * 0.75 // below the rim; never the keel pinch
      rootPoint(ang, k, p)
      rootPoint(ang + 0.03, k, alongRing).sub(p)
      rootPoint(ang, k + 0.03, downRoot).sub(p)
      nrm.crossVectors(alongRing, downRoot).normalize() // outward-down, matching the solid winding
      tangent
        .copy(downRoot)
        .normalize()
        .addScaledVector(alongRing.normalize(), (vnoise(Math.cos(ang) * 4 + 11, k * 6 + 3) - 0.5) * 0.45)

      // painted rock near the rim melting to night by mid-root — the strokes carry the light
      strokeCol.copy(rockLit).lerp(abyss, smooth(0.12, 0.75, k))
      strokeCol.multiplyScalar(0.72 + 0.7 * rng()) // the per-stroke value kick — the brushwork read
      if (k < 0.3 && rng() < 0.05) strokeCol.lerp(hillLit, 0.3 * (0.3 + 0.7 * moonShade(nrm))) // rim-only moon flecks

      p.addScaledVector(nrm, 0.012)
      const rootHalfLen = 0.09 + 0.07 * rng()
      const rootHalfWid = 0.03 + 0.025 * rng()
      pushBrush(arr, p, tangent, nrm, rootHalfLen, rootHalfWid, strokeCol)
    }

    return { solid: { positions: sPos, colors: sCol, indices: sIdx }, strokes: arr, rootStart }
}
