import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, MeshBasicMaterial, Vector3 } from 'three'
import { PALETTE } from './palette'
import { islandHeightAt } from './islandShape'
import { moonShade } from './brushForms'

/**
 * The village huddle and its pale slender-spired church — the painting's focal foreground, nestled
 * at the foot of the hills. Small massed forms with baked moon-lit modelling (consistent with the
 * other brush forms' unlit vertex-colour look) and warm emissive windows the bloom catches. The
 * church spire is the pale vertical that answers the cypress across the composition.
 */

type Arr = { positions: number[]; colors: number[]; indices: number[] }
const newArr = (): Arr => ({ positions: [], colors: [], indices: [] })

const HOUSE = new Color(PALETTE.house).multiplyScalar(1.15) // dark blue-violet walls
const ROOF = new Color(PALETTE.roof).multiplyScalar(1.2)
const CHURCH = new Color(PALETTE.steeple).multiplyScalar(1.5).lerp(new Color('#ffffff'), 0.16) // pale focal
const SPIRE = new Color(PALETTE.steeple).multiplyScalar(1.9).lerp(new Color('#ffffff'), 0.28)
const WINDOW = new Color('#f6c651')

const _n = new Vector3()
const _u = new Vector3()
const _v = new Vector3()

function litColor(base: Color, normal: Vector3, lo = 0.4): Color {
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

function rot(x: number, z: number, cx: number, cz: number, yaw: number): [number, number] {
  const dx = x - cx
  const dz = z - cz
  return [cx + dx * Math.cos(yaw) - dz * Math.sin(yaw), cz + dx * Math.sin(yaw) + dz * Math.cos(yaw)]
}

/** A gable-roofed house: four walls + a pitched roof, seated on the island, yawed by `yaw`. */
function pushHouse(arr: Arr, cx: number, cz: number, w: number, d: number, h: number, yaw: number): void {
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
  // gable roof: ridge along the depth axis
  const rf = corner(0, 1, ridge)
  const rb = corner(0, -1, ridge)
  pushQuad(arr, ftl, ftr, rf, rf, ROOF) // front gable (degenerate 4th → triangle)
  pushQuad(arr, btr, btl, rb, rb, ROOF) // back gable
  pushQuad(arr, ftl, rf, rb, btl, ROOF) // left roof pitch
  pushQuad(arr, ftr, btr, rb, rf, ROOF) // right roof pitch
}

/** The church: a taller pale nave + a slender tall spire — the focal vertical. */
function pushChurch(arr: Arr, cx: number, cz: number): { spireTip: Vector3 } {
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
  const rf = c(0, 1, y1 + 0.13)
  const rb = c(0, -1, y1 + 0.13)
  pushQuad(arr, ftl, ftr, rf, rf, ROOF)
  pushQuad(arr, btr, btl, rb, rb, ROOF)
  pushQuad(arr, ftl, rf, rb, btl, ROOF)
  pushQuad(arr, ftr, btr, rb, rf, ROOF)

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
  // spire: a thin pyramid
  const spireTip = new Vector3(tx, th + 0.5, tz)
  const sp = (sx: number, sz: number) => new Vector3(tx + sx * tw * 0.5, th, tz + sz * tw * 0.5)
  const sc = [sp(-1, 1), sp(1, 1), sp(1, -1), sp(-1, -1)]
  for (let k = 0; k < 4; k++) {
    const a = sc[k]
    const b = sc[(k + 1) % 4]
    pushQuad(arr, a, b, spireTip, spireTip, SPIRE)
  }
  return { spireTip }
}

function pushWindow(arr: Arr, cx: number, cz: number, y: number, size: number): void {
  const s = size / 2
  const a = new Vector3(cx - s, y - s, cz)
  const b = new Vector3(cx + s, y - s, cz)
  const c = new Vector3(cx + s, y + s, cz)
  const d = new Vector3(cx - s, y + s, cz)
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
  const { solid, windows } = useMemo(() => {
    const s = newArr()
    const w = newArr()
    for (const [cx, cz, hw, hd, hh, yaw] of HOUSES) pushHouse(s, cx, cz, hw, hd, hh, yaw)
    pushChurch(s, CHURCH_POS[0], CHURCH_POS[1])
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
    return { solid: build(s), windows: build(w) }
  }, [])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const windowMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])

  useEffect(() => () => solid.dispose(), [solid])
  useEffect(() => () => windows.dispose(), [windows])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => windowMat.dispose(), [windowMat])

  return (
    <group>
      <mesh geometry={solid} material={solidMat} renderOrder={2} />
      <mesh geometry={windows} material={windowMat} renderOrder={3} />
    </group>
  )
}
