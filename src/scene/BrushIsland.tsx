import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { PALETTE } from './palette'
import { makeBrushArrays, moonShade, pushBrush, smooth, vnoise } from './brushForms'

/**
 * The floating landmass the village and cypress stand on — a real closed, rooted solid (so it is
 * NEVER a hole from any orbit angle, unlike the projected relief's funnel) whose rolling top is
 * clad in horizontal contour brushstrokes: the painting's blue-grey hills rising to a moonlit ridge
 * at the back-right, dissolving to dark earth down the root. The dark solid underneath means gaps
 * between strokes read as shadowed ground.
 */

const RX = 2.05 // footprint half-extent, x
const RZ = 1.35 // footprint half-extent, z
const RIDGE = 1.15 // max top height (back-right ridge) — steep enough to face the front camera
const ROOT_DEPTH = 2.2 // how far the root plunges below the rim
const SEG = 120 // segments around
const RT = 16 // rings centre → coast
const RS = 12 // rings coast → root tip
const STROKES = 7200

function coastR(ang: number): number {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const ell = (RX * RZ) / Math.sqrt((RZ * c) ** 2 + (RX * s) ** 2)
  const wobble = 1 + 0.09 * Math.sin(3 * ang + 0.4) + 0.06 * Math.sin(6 * ang - 1.1) + 0.035 * Math.sin(11 * ang + 2)
  return ell * wobble
}

/**
 * Rolling top height: a low dark front apron (where the village sits) rising behind into steep
 * rounded hill humps — steep so their near faces present to the front camera and the cladding
 * reads (a gentle mound just foreshortens to smooth clay). Taller on the right, as in the painting.
 */
function topY(x: number, z: number): number {
  const back = smooth(0.55, -1.2, z) // 0 at the front apron → 1 at the back ridge
  const rightBias = 0.5 + 0.5 * smooth(-1.7, 1.5, x)
  const humps =
    0.95 * Math.exp(-((x - 0.85) ** 2) / 0.42) + // right hump (tallest)
    0.7 * Math.exp(-((x + 0.7) ** 2) / 0.5) + // centre-left hump
    0.5 * Math.exp(-((x + 1.55) ** 2) / 0.4) // far-left hump
  const n = (vnoise(x * 1.8 + 5, z * 1.8 + 9) - 0.5) * 0.35
  return Math.max(0, RIDGE * back * rightBias * (0.3 + 0.85 * humps + n))
}

export function BrushIsland() {
  const geometries = useMemo(() => {
    const earth = new Color(PALETTE.hills)
    const abyss = earth.clone().multiplyScalar(0.07) // root dissolving into night
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
          const taper = 1 - smooth(0, 1, k) * 0.82
          const rad = Math.max(0.04, edge * taper)
          x = Math.cos(ang) * rad
          z = Math.sin(ang) * rad
          const rimY = topY(Math.cos(ang) * edge, Math.sin(ang) * edge) * 0.55
          const drop = ROOT_DEPTH * (k * k * 0.7 + k * 0.3)
          y = rimY - drop + (vnoise(Math.cos(ang) * 3, Math.sin(ang) * 3 + k * 5) - 0.5) * 0.15 * (1 - k)
          depth = k
        }
        sPos.push(x, y, z)
        if (depth === 0) cc.copy(topBase)
        else cc.copy(earth).lerp(abyss, smooth(0.05, 0.85, depth))
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
      // strong per-stroke kick the field averages into smooth clay. Plus occasional bright crest
      // flecks and dark troughs, as he dabbed them.
      const val = 0.5 + 1.0 * rng()
      strokeCol.multiplyScalar(val)
      if (rng() < 0.1) strokeCol.lerp(hillLit, 0.6) // moonlit impasto fleck

      p.set(x, y, z).addScaledVector(nrm, 0.025)
      const halfLen = 0.11 + 0.08 * rng()
      const halfWid = 0.02 + 0.014 * rng()
      pushBrush(arr, p, tangent, nrm, halfLen, halfWid, strokeCol)
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
