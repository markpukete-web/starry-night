import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, Vector3 } from 'three'
import { PALETTE } from './palette'
import { islandHeightAt } from './islandShape'
import { mulberry32 } from './brush.ts'
import { type BrushArrays, makeBrushArrays, moonShade, pushBrush } from './brushForms'

/**
 * The village huddle and its pale slender-spired church — the painting's focal foreground, nestled
 * at the foot of the hills. Small massed forms with baked moon-lit modelling (consistent with the
 * other brush forms' unlit vertex-colour look), each face lightly clad in brush marks so the
 * village sits inside the impasto world rather than reading as crisp CAD boxes, and warm emissive
 * windows the bloom catches. The church spire is the pale vertical that answers the cypress across
 * the composition — its thin spire stays unclad so the focal accent keeps a clean edge.
 */

type Arr = { positions: number[]; colors: number[]; indices: number[] }
const newArr = (): Arr => ({ positions: [], colors: [], indices: [] })

const HOUSE = new Color(PALETTE.house).multiplyScalar(1.28) // dark blue-violet walls
const ROOF = new Color(PALETTE.roof).multiplyScalar(1.32)
const CHURCH = new Color(PALETTE.steeple).multiplyScalar(1.65).lerp(new Color('#ffffff'), 0.18) // pale focal
const SPIRE = new Color(PALETTE.steeple).multiplyScalar(2.05).lerp(new Color('#ffffff'), 0.30)
const WINDOW = new Color('#f6c651')
const INK = new Color(PALETTE.villageInk) // warm-dark drawing ink — the cloisonnist contour

const _n = new Vector3()
const _u = new Vector3()
const _v = new Vector3()

function litColor(base: Color, normal: Vector3, lo = 0.44): Color {
  return base.clone().multiplyScalar(lo + (1 - lo) * moonShade(normal))
}

/** Append a flat quad (two triangles) with one baked colour derived from its normal. */
function pushQuad(arr: Arr, a: Vector3, b: Vector3, c: Vector3, d: Vector3, base: Color): void {
  _u.subVectors(b, a)
  _v.subVectors(d, a)
  _n.crossVectors(_u, _v).normalize()
  const col = litColor(base, _n)
  const i = arr.positions.length / 3
  for (const p of [a, b, c, d]) {
    arr.positions.push(p.x, p.y, p.z)
    arr.colors.push(col.r, col.g, col.b)
  }
  arr.indices.push(i, i + 1, i + 2, i, i + 2, i + 3)
}

/** Outward unit normal of the quad a-b-·-d, the exact `pushQuad` cross-product convention. */
function faceNormal(a: Vector3, b: Vector3, d: Vector3): Vector3 {
  return new Vector3().subVectors(b, a).cross(new Vector3().subVectors(d, a)).normalize()
}

const _edgeDir = new Vector3()
const _edgeSide = new Vector3()
const _edgeOff = new Vector3()
const _edgePos = new Vector3()

/**
 * Van Gogh's drawn contour: 2–4 slightly-jittered dark ink marks along the edge a→b, lifted
 * proud along the mean of the two adjacent face normals. CONTRACT (plan 2026-07-22): `a`/`b`
 * are the SAME corner vectors the adjacent quads were built from — never recomputed; `nLeft`/
 * `nRight` are those faces' unit normals via `faceNormal`; every edge is emitted by exactly ONE
 * call site (ownership by construction, no de-duplication pass).
 */
function contourEdge(
  brush: BrushArrays,
  rng: () => number,
  a: Vector3,
  b: Vector3,
  nLeft: Vector3,
  nRight: Vector3,
  halfWid = 0.0055,
): void {
  _edgeDir.subVectors(b, a)
  const len = _edgeDir.length()
  if (len < 1e-5) return
  _edgeDir.divideScalar(len)
  _edgeOff.addVectors(nLeft, nRight).normalize()
  _edgeSide.crossVectors(_edgeDir, _edgeOff).normalize()
  // segments scale with edge length — a short edge gets ONE mark, or its taper reads as a
  // dot-chain (the belfry band read as buttons at 2–4 fixed segments, s1 retune pass 2)
  const segs = Math.max(1, Math.min(4, Math.round(len / 0.11 + rng() * 0.6)))
  const col = new Color()
  for (let s = 0; s < segs; s++) {
    const t = (s + 0.5) / segs + (rng() - 0.5) * 0.06
    const halfLen = (len / segs) * (0.55 + 0.15 * rng()) // marks overlap ~10–40%, no dashed gaps
    _edgePos
      .copy(a)
      .addScaledVector(_edgeDir, t * len)
      .addScaledVector(_edgeOff, 0.006 + 0.003 * rng())
      .addScaledVector(_edgeSide, (rng() - 0.5) * 0.005)
    col.copy(INK).multiplyScalar(0.85 + 0.3 * rng())
    pushBrush(brush, _edgePos, _edgeDir, _edgeOff, halfLen, halfWid * (0.8 + 0.4 * rng()), col)
  }
}

function rot(x: number, z: number, cx: number, cz: number, yaw: number): [number, number] {
  const dx = x - cx
  const dz = z - cz
  return [cx + dx * Math.cos(yaw) - dz * Math.sin(yaw), cz + dx * Math.sin(yaw) + dz * Math.cos(yaw)]
}

const STROKES_PER_AREA = 230 // light cladding — the base face must stay visible between marks
const WALL_FLECK = new Color(PALETTE.hillsCrest).multiplyScalar(1.6) // pale moonlit stroke accents
const _pa = new Vector3()
const _pb = new Vector3()
const _pos = new Vector3()
const _tanAB = new Vector3()

/**
 * Scatter a light layer of brush marks over the (planar) quad a-b-c-d. Strokes run along the a→b
 * edge — the bottom edge for walls (horizontal dabs) and the up-slope edge for roof pitches — and
 * take the face's moon-lit colour with a per-stroke value kick (`kickLo..kickLo+kickSpan`) so the
 * marks read as brushwork, not a tint. Sampling stays inside the face margin and the marks are
 * small, so the gable silhouette survives.
 */
function cladQuad(
  brush: BrushArrays,
  rng: () => number,
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
  base: Color,
  kickLo = 0.72,
  kickSpan = 0.52,
  strokeAlong: 'ab' | 'ad' = 'ab',
  fleckP = 0,
): void {
  _u.subVectors(b, a)
  _v.subVectors(d, a)
  _n.crossVectors(_u, _v)
  const area = _n.length()
  if (area < 1e-6) return
  _n.normalize()
  _tanAB.copy(strokeAlong === 'ab' ? _u : _v).normalize()
  const lit = litColor(base, _n)
  const n = Math.max(3, Math.round(area * STROKES_PER_AREA * (0.85 + 0.3 * rng())))
  const col = new Color()
  for (let i = 0; i < n; i++) {
    const s = 0.12 + 0.76 * rng()
    const t = 0.12 + 0.76 * rng()
    _pa.copy(a).lerp(b, s)
    _pb.copy(d).lerp(c, s)
    _pos.copy(_pa).lerp(_pb, t).addScaledVector(_n, 0.006 + 0.005 * rng())
    col.copy(lit).multiplyScalar(kickLo + kickSpan * rng())
    if (fleckP > 0 && rng() < fleckP) col.lerp(WALL_FLECK, 0.45 + 0.25 * rng())
    const halfLen = 0.042 + 0.032 * rng()
    const halfWid = 0.011 + 0.008 * rng()
    pushBrush(brush, _pos, _tanAB, _n, halfLen, halfWid, col)
  }
}

/** A gable-roofed house: four walls + a pitched roof, seated on the island, yawed by `yaw`. */
function pushHouse(
  arr: Arr,
  brush: BrushArrays,
  rng: () => number,
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  yaw: number,
): void {
  const y0 = islandHeightAt(cx, cz) - 0.02
  const y1 = y0 + h
  const ridge = y1 + Math.min(w, d) * 0.55
  const hw = w / 2
  const hd = d / 2
  const corner = (sx: number, sz: number, y: number) => {
    const [x, z] = rot(cx + sx * hw, cz + sz * hd, cx, cz, yaw)
    return new Vector3(x, y, z)
  }
  const fbl = corner(-1, 1, y0)
  const fbr = corner(1, 1, y0)
  const ftr = corner(1, 1, y1)
  const ftl = corner(-1, 1, y1)
  const bbl = corner(-1, -1, y0)
  const bbr = corner(1, -1, y0)
  const btr = corner(1, -1, y1)
  const btl = corner(-1, -1, y1)
  pushQuad(arr, fbl, fbr, ftr, ftl, HOUSE) // front
  pushQuad(arr, bbr, bbl, btl, btr, HOUSE) // back
  pushQuad(arr, bbl, fbl, ftl, btl, HOUSE) // left
  pushQuad(arr, fbr, bbr, btr, ftr, HOUSE) // right
  // walls want harder value contrast + occasional pale flecks or they stay flat CAD blue
  cladQuad(brush, rng, fbl, fbr, ftr, ftl, HOUSE, 0.65, 0.8, 'ab', 0.12)
  cladQuad(brush, rng, bbr, bbl, btl, btr, HOUSE, 0.65, 0.8, 'ab', 0.12)
  cladQuad(brush, rng, bbl, fbl, ftl, btl, HOUSE, 0.65, 0.8, 'ab', 0.12)
  cladQuad(brush, rng, fbr, bbr, btr, ftr, HOUSE, 0.65, 0.8, 'ab', 0.12)
  // gable roof: ridge along the depth axis
  const rf = corner(0, 1, ridge)
  const rb = corner(0, -1, ridge)
  pushQuad(arr, ftl, ftr, rf, rf, ROOF) // front gable (degenerate 4th → triangle)
  pushQuad(arr, btr, btl, rb, rb, ROOF) // back gable
  pushQuad(arr, ftl, rf, rb, btl, ROOF) // left roof pitch
  pushQuad(arr, ftr, btr, rb, rf, ROOF) // right roof pitch
  cladQuad(brush, rng, ftl, ftr, rf, rf, ROOF)
  cladQuad(brush, rng, btr, btl, rb, rb, ROOF)
  cladQuad(brush, rng, ftl, rf, rb, btl, ROOF) // strokes run up the pitch
  cladQuad(brush, rng, ftr, btr, rb, rf, ROOF, 0.76, 0.54, 'ad') // up the pitch (the a→d edge here)

  // the drawn contour — each edge owned here, exactly once, using the corners above
  const nFront = faceNormal(fbl, fbr, ftl)
  const nBack = faceNormal(bbr, bbl, btr)
  const nLeft = faceNormal(bbl, fbl, btl)
  const nRight = faceNormal(fbr, bbr, ftr)
  const nGableF = faceNormal(ftl, ftr, rf)
  const nGableB = faceNormal(btr, btl, rb)
  const nPitchL = faceNormal(ftl, rf, btl)
  const nPitchR = faceNormal(ftr, btr, rf)
  contourEdge(brush, rng, fbl, ftl, nFront, nLeft) // wall corners
  contourEdge(brush, rng, fbr, ftr, nFront, nRight)
  contourEdge(brush, rng, bbr, btr, nBack, nRight)
  contourEdge(brush, rng, bbl, btl, nBack, nLeft)
  contourEdge(brush, rng, ftl, btl, nLeft, nPitchL) // eaves
  contourEdge(brush, rng, ftr, btr, nRight, nPitchR)
  contourEdge(brush, rng, ftl, rf, nGableF, nPitchL) // gable rakes
  contourEdge(brush, rng, ftr, rf, nGableF, nPitchR)
  contourEdge(brush, rng, btl, rb, nGableB, nPitchL)
  contourEdge(brush, rng, btr, rb, nGableB, nPitchR)
  contourEdge(brush, rng, rf, rb, nPitchL, nPitchR, 0.007) // ridge, a touch bolder
}

/** The church: a taller pale nave + a slender tall spire — the focal vertical. */
function pushChurch(arr: Arr, brush: BrushArrays, rng: () => number, cx: number, cz: number): { spireTip: Vector3 } {
  const y0 = islandHeightAt(cx, cz) - 0.02
  const w = 0.34
  const d = 0.5
  const h = 0.42
  const hw = w / 2
  const hd = d / 2
  const y1 = y0 + h
  const c = (sx: number, sz: number, y: number) => new Vector3(cx + sx * hw, y, cz + sz * hd)
  const fbl = c(-1, 1, y0)
  const fbr = c(1, 1, y0)
  const ftr = c(1, 1, y1)
  const ftl = c(-1, 1, y1)
  const bbl = c(-1, -1, y0)
  const bbr = c(1, -1, y0)
  const btr = c(1, -1, y1)
  const btl = c(-1, -1, y1)
  pushQuad(arr, fbl, fbr, ftr, ftl, CHURCH)
  pushQuad(arr, bbr, bbl, btl, btr, CHURCH)
  pushQuad(arr, bbl, fbl, ftl, btl, CHURCH)
  pushQuad(arr, fbr, bbr, btr, ftr, CHURCH)
  // pale focal form: clad with a narrower, brighter value spread so it stays the clean accent
  cladQuad(brush, rng, fbl, fbr, ftr, ftl, CHURCH, 0.86, 0.3)
  cladQuad(brush, rng, bbr, bbl, btl, btr, CHURCH, 0.86, 0.3)
  cladQuad(brush, rng, bbl, fbl, ftl, btl, CHURCH, 0.86, 0.3)
  cladQuad(brush, rng, fbr, bbr, btr, ftr, CHURCH, 0.86, 0.3)
  const rf = c(0, 1, y1 + 0.13)
  const rb = c(0, -1, y1 + 0.13)
  pushQuad(arr, ftl, ftr, rf, rf, ROOF)
  pushQuad(arr, btr, btl, rb, rb, ROOF)
  pushQuad(arr, ftl, rf, rb, btl, ROOF)
  pushQuad(arr, ftr, btr, rb, rf, ROOF)
  cladQuad(brush, rng, ftl, rf, rb, btl, ROOF)
  cladQuad(brush, rng, ftr, btr, rb, rf, ROOF, 0.72, 0.52, 'ad')

  // slender bell tower at the front, then a tall thin spire
  const tw = 0.12
  const tx = cx
  const tz = cz + hd - 0.08
  const th = y0 + 0.62
  const t = (sx: number, sz: number, y: number) => new Vector3(tx + sx * tw * 0.5, y, tz + sz * tw * 0.5)
  const t0 = [t(-1, 1, y0), t(1, 1, y0), t(1, 1, th), t(-1, 1, th)] as const
  const t1 = [t(-1, -1, y0), t(1, -1, y0), t(1, -1, th), t(-1, -1, th)] as const
  pushQuad(arr, t0[0], t0[1], t0[2], t0[3], CHURCH)
  pushQuad(arr, t1[1], t1[0], t1[3], t1[2], CHURCH)
  pushQuad(arr, t1[0], t0[0], t0[3], t1[3], CHURCH)
  pushQuad(arr, t0[1], t1[1], t1[2], t0[2], CHURCH)
  // tower: a few sparse pale marks; the thin spire itself stays unclad for a clean focal edge
  cladQuad(brush, rng, t0[0], t0[1], t0[2], t0[3], CHURCH, 0.88, 0.26)
  cladQuad(brush, rng, t1[0], t0[0], t0[3], t1[3], CHURCH, 0.88, 0.26)
  // spire: a thin pyramid
  const spireTip = new Vector3(tx, th + 0.5, tz)
  const sp = (sx: number, sz: number) => new Vector3(tx + sx * tw * 0.5, th, tz + sz * tw * 0.5)
  const sc = [sp(-1, 1), sp(1, 1), sp(1, -1), sp(-1, -1)]
  for (let k = 0; k < 4; k++) {
    const a = sc[k]
    const b = sc[(k + 1) % 4]
    pushQuad(arr, a, b, spireTip, spireTip, SPIRE)
  }

  // the drawn contour — nave edges as the houses, then tower corners, belfry band, spire edges.
  // The spire faces stay clean; its EDGES carry the drawing (the painting separates the pale
  // spire from the pale sky by outline, not value — tasks/2026-07-22-village-look.md).
  const nNaveF = faceNormal(fbl, fbr, ftl)
  const nNaveB = faceNormal(bbr, bbl, btr)
  const nNaveL = faceNormal(bbl, fbl, btl)
  const nNaveR = faceNormal(fbr, bbr, ftr)
  const nNaveGF = faceNormal(ftl, ftr, rf)
  const nNaveGB = faceNormal(btr, btl, rb)
  const nNavePL = faceNormal(ftl, rf, btl)
  const nNavePR = faceNormal(ftr, btr, rf)
  contourEdge(brush, rng, fbl, ftl, nNaveF, nNaveL)
  contourEdge(brush, rng, fbr, ftr, nNaveF, nNaveR)
  contourEdge(brush, rng, bbr, btr, nNaveB, nNaveR)
  contourEdge(brush, rng, bbl, btl, nNaveB, nNaveL)
  contourEdge(brush, rng, ftl, btl, nNaveL, nNavePL)
  contourEdge(brush, rng, ftr, btr, nNaveR, nNavePR)
  contourEdge(brush, rng, ftl, rf, nNaveGF, nNavePL)
  contourEdge(brush, rng, ftr, rf, nNaveGF, nNavePR)
  contourEdge(brush, rng, btl, rb, nNaveGB, nNavePL)
  contourEdge(brush, rng, btr, rb, nNaveGB, nNavePR)
  contourEdge(brush, rng, rf, rb, nNavePL, nNavePR, 0.007)

  const nTowerF = faceNormal(t0[0], t0[1], t0[3])
  const nTowerB = faceNormal(t1[1], t1[0], t1[2])
  const nTowerL = faceNormal(t1[0], t0[0], t1[3])
  const nTowerR = faceNormal(t0[1], t1[1], t0[2])
  contourEdge(brush, rng, t0[0], t0[3], nTowerF, nTowerL, 0.005) // tower corners
  contourEdge(brush, rng, t0[1], t0[2], nTowerF, nTowerR, 0.005)
  contourEdge(brush, rng, t1[1], t1[2], nTowerB, nTowerR, 0.005)
  contourEdge(brush, rng, t1[0], t1[3], nTowerB, nTowerL, 0.005)

  const nSpire = [0, 1, 2, 3].map((k) => faceNormal(sc[k], sc[(k + 1) % 4], spireTip))
  // belfry band: the dark ring the painting paints under the spire — tower top edges, bolder
  contourEdge(brush, rng, t0[3], t0[2], nTowerF, nSpire[0], 0.009)
  contourEdge(brush, rng, t0[2], t1[2], nTowerR, nSpire[1], 0.009)
  contourEdge(brush, rng, t1[2], t1[3], nTowerB, nSpire[2], 0.009)
  contourEdge(brush, rng, t1[3], t0[3], nTowerL, nSpire[3], 0.009)
  for (let k = 0; k < 4; k++) {
    contourEdge(brush, rng, sc[k], spireTip, nSpire[(k + 3) % 4], nSpire[k], 0.0045)
  }
  return { spireTip }
}

function pushWindow(arr: Arr, cx: number, cz: number, y: number, size: number): void {
  const s = size / 2
  const zw = cz + 0.016 // proud of the wall face so the brush cladding never covers the glow
  const a = new Vector3(cx - s, y - s, zw)
  const b = new Vector3(cx + s, y - s, zw)
  const c = new Vector3(cx + s, y + s, zw)
  const d = new Vector3(cx - s, y + s, zw)
  const i = arr.positions.length / 3
  for (const p of [a, b, c, d]) {
    arr.positions.push(p.x, p.y, p.z)
    arr.colors.push(WINDOW.r, WINDOW.g, WINDOW.b)
  }
  arr.indices.push(i, i + 1, i + 2, i, i + 2, i + 3)
}

// deterministic village layout at the hills' foot (front-centre of the island)
const HOUSES: [number, number, number, number, number, number][] = [
  // cx, cz, w, d, h, yaw
  [-0.55, 0.62, 0.34, 0.3, 0.24, 0.2],
  [-0.2, 0.72, 0.28, 0.26, 0.2, -0.25],
  [0.5, 0.66, 0.32, 0.28, 0.22, 0.18],
  [0.82, 0.56, 0.28, 0.26, 0.2, -0.3],
  [1.05, 0.44, 0.3, 0.26, 0.22, 0.32],
  [0.42, 0.4, 0.26, 0.24, 0.18, -0.4],
  [-0.8, 0.48, 0.3, 0.26, 0.2, 0.1],
]
const CHURCH_POS: [number, number] = [0.08, 0.46]
const WINDOWS: [number, number, number, number][] = [
  // cx, cz, yHeight-above-base, size
  [-0.55, 0.77, 0.1, 0.05],
  [-0.2, 0.85, 0.09, 0.045],
  [0.5, 0.8, 0.1, 0.05],
  [1.05, 0.57, 0.1, 0.045],
  [-0.8, 0.61, 0.09, 0.045],
]

export function BrushVillage() {
  const { solid, strokes, windows } = useMemo(() => {
    const s = newArr()
    const brush = makeBrushArrays()
    const w = newArr()
    const rng = mulberry32(0x0b11a6e)
    for (const [cx, cz, hw, hd, hh, yaw] of HOUSES) pushHouse(s, brush, rng, cx, cz, hw, hd, hh, yaw)
    pushChurch(s, brush, rng, CHURCH_POS[0], CHURCH_POS[1])
    for (const [cx, cz, yh, size] of WINDOWS) {
      pushWindow(w, cx, cz, islandHeightAt(cx, cz) + yh, size)
    }
    // belfry window on the church tower
    pushWindow(w, CHURCH_POS[0], CHURCH_POS[1] + 0.17, islandHeightAt(...CHURCH_POS) + 0.4, 0.04)

    const build = (a: Arr) => {
      const g = new BufferGeometry()
      g.setAttribute('position', new BufferAttribute(new Float32Array(a.positions), 3))
      g.setAttribute('color', new BufferAttribute(new Float32Array(a.colors), 3))
      g.setIndex(a.indices)
      g.computeVertexNormals()
      g.computeBoundingSphere()
      return g
    }
    return { solid: build(s), strokes: build(brush), windows: build(w) }
  }, [])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )
  const windowMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])

  useEffect(() => () => solid.dispose(), [solid])
  useEffect(() => () => strokes.dispose(), [strokes])
  useEffect(() => () => windows.dispose(), [windows])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])
  useEffect(() => () => windowMat.dispose(), [windowMat])

  return (
    <group>
      <mesh geometry={solid} material={solidMat} renderOrder={2} />
      <mesh geometry={strokes} material={strokeMat} renderOrder={3} />
      <mesh geometry={windows} material={windowMat} renderOrder={4} />
    </group>
  )
}
