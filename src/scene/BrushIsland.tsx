import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { PALETTE } from './palette'
import { makeBrushArrays, moonShade, pushBrush, smooth, vnoise } from './brushForms'
import { coastR, RIDGE, topY } from './islandShape'

/**
 * The floating landmass the village and cypress stand on — a real closed, rooted solid (so it is
 * NEVER a hole from any orbit angle, unlike the projected relief's funnel) whose rolling top is
 * clad in horizontal contour brushstrokes: the painting's blue-grey hills rising to a moonlit ridge
 * at the back-right, dissolving to dark earth down the root. The dark solid underneath means gaps
 * between strokes read as shadowed ground. Footprint + height maths live in ./islandShape.
 */

const ROOT_DEPTH = 2.2 // how far the root plunges below the rim
const SEG = 120 // segments around
const RT = 16 // rings centre → coast
const RS = 12 // rings coast → root tip
const STROKES = 7200
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

export function BrushIsland() {
  const geometries = useMemo(() => {
    const earth = new Color(PALETTE.hills)
    const abyss = earth.clone().multiplyScalar(0.07) // root dissolving into night
    const rootBase = earth.clone().multiplyScalar(0.62) // darker under-shell so stroke gaps read as shadow
    const topBase = new Color(PALETTE.hills).multiplyScalar(1.7) // mid base under the strokes — not black
    // Van Gogh hill palette pushed to contrast: deep trough blue, lit blue-grey crest, teal mid
    const hillDark = new Color('#233a55')
    const hillMid = new Color('#3f6a86')
    const hillLit = new Color(PALETTE.hillsCrest).multiplyScalar(2.5)

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

    const solid = new BufferGeometry()
    solid.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3))
    solid.setAttribute('color', new BufferAttribute(new Float32Array(sCol), 3))
    solid.setIndex(sIdx)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

    // --- contour brushstroke cladding over the top surface ---
    const rng = mulberry32(0x15_1a_9d)
    const arr = makeBrushArrays()
    const p = new Vector3()
    const nrm = new Vector3()
    const tangent = new Vector3()
    const up = new Vector3(0, 1, 0)
    const strokeCol = new Color()
    const groundGreen = new Color(PALETTE.cypressGreen).multiplyScalar(1.2)
    const eps = 0.05
    for (let s = 0; s < STROKES; s++) {
      // rejection-sample a point inside the coastline
      const ang = rng() * Math.PI * 2
      const rad = Math.sqrt(rng()) * coastR(ang) * 0.985
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad
      const y = topY(x, z) * smooth(1, 0.55, rad / coastR(ang))
      // surface normal from finite differences of the (flattened) top height
      const flatten = smooth(1, 0.55, rad / coastR(ang))
      const yE = topY(x + eps, z) * flatten
      const yN = topY(x, z + eps) * flatten
      nrm.set(-(yE - y) / eps, 1, -(yN - y) / eps).normalize()
      tangent.crossVectors(nrm, up) // horizontal contour direction
      if (tangent.lengthSq() < 1e-5) tangent.set(1, 0, 0)
      // a little coherent waviness along the contour
      tangent.addScaledVector(up, (vnoise(x * 2 + 3, z * 2 + 7) - 0.5) * 0.15)

      const t = y / RIDGE
      const front = smooth(0.2, 1.3, z) // +z is the near foreground
      const lit = moonShade(nrm)
      strokeCol
        .copy(hillDark)
        .lerp(hillMid, smooth(0.08, 0.55, t))
        .lerp(hillLit, smooth(0.45, 0.95, t) * (0.4 + 0.6 * lit))
        .lerp(groundGreen, front * 0.6)
      // Van Gogh's surfaces read because ADJACENT strokes contrast hard in value — without this
      // strong per-stroke kick the field averages into smooth clay. But the full ±50% spread
      // reads as salt-and-pepper mottle at composition distance; ±35% keeps the brushwork read
      // while letting the contours knit (top trimmed to 1.27: the brightest kicks caught bloom
      // and sparkled in the look-down — Mark's 2026-07-14 gate feedback). Sparse, gentler crest
      // flecks — 10% was confetti; and flecks belong to MOONLIT faces, not shadowed ground,
      // where they read as white scratches.
      const val = 0.65 + 0.62 * rng()
      strokeCol.multiplyScalar(val)
      if (rng() < 0.045 * (0.25 + 0.75 * lit)) strokeCol.lerp(hillLit, 0.32) // moonlit impasto fleck

      p.set(x, y, z).addScaledVector(nrm, 0.025)
      const halfLen = 0.135 + 0.09 * rng() // longer marks knit into contour lines, not grain
      const halfWid = 0.02 + 0.014 * rng()
      pushBrush(arr, p, tangent, nrm, halfLen, halfWid, strokeCol)
    }

    // --- root cladding: the underside was the one smooth unpainted surface (a grey-cone tell).
    // Downward-flowing marks in the same earth→night gradient as the shell, dense at the rim and
    // dissolving toward the keel so the island still melts into the dark. Strokes carry the full
    // earth value over the darkened shell — gaps read as shadow, the same recipe as every form.
    // Fur trap (cypress lesson): long slim marks with stick-out read as thorns at the silhouette.
    // Root marks are therefore SHORT and BROAD, hugging the surface, starting below the rim.
    const alongRing = new Vector3()
    const downRoot = new Vector3()
    const rockLit = earth.clone().multiplyScalar(1.25)
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
      strokeCol.multiplyScalar(0.65 + 0.7 * rng()) // the per-stroke value kick — the brushwork read
      if (k < 0.3 && rng() < 0.05) strokeCol.lerp(hillLit, 0.3 * (0.3 + 0.7 * moonShade(nrm))) // rim-only moon flecks

      p.addScaledVector(nrm, 0.012)
      const rootHalfLen = 0.09 + 0.07 * rng()
      const rootHalfWid = 0.03 + 0.025 * rng()
      pushBrush(arr, p, tangent, nrm, rootHalfLen, rootHalfWid, strokeCol)
    }

    const strokes = new BufferGeometry()
    strokes.setAttribute('position', new BufferAttribute(new Float32Array(arr.positions), 3))
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(arr.colors), 3))
    strokes.setIndex(arr.indices)
    strokes.computeVertexNormals()
    strokes.computeBoundingSphere()

    return { solid, strokes }
  }, [])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )

  useEffect(() => () => geometries.solid.dispose(), [geometries])
  useEffect(() => () => geometries.strokes.dispose(), [geometries])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])

  return (
    <group>
      <mesh geometry={geometries.solid} material={solidMat} renderOrder={0} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={1} />
    </group>
  )
}
