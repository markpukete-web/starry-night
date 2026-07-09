import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { extractCypressSlices } from './paintingRegions'
import { mulberry32 } from './brush.ts'
import { PALETTE } from './palette'
import { makeBrushArrays, moonShade, pushBrush, smooth, vnoise } from './brushForms'

/**
 * The cypress — Van Gogh's dark flame, as an authored 3D volume. Its silhouette is the painting's
 * own (extractCypressSlices), displaced into licking tongues; it is a real closed solid so it
 * survives any orbit; and its surface is CLAD in vertical licking brushstrokes coloured from the
 * palette cypress greens, lit on the moon side. The dark solid underneath means gaps between
 * strokes read as deep-shadow cypress, never sky-void. Van Gogh brushwork given three dimensions.
 */

const HEIGHT = 2.7
const WIDTH_SCALE = 4.6 // painting halfWidth (UV) → world radius
const SEG = 34
const STROKES = 3600
const BASE = new Vector3(-1.5, 0.02, 0.72) // stands front-left, on the island

// palette cypress family: the painting's cypress is near-black green — dark dominates, with only
// sparse olive/emerald tongues and a faint moonlit rim (never khaki-pale overall)
const CORE = new Color(PALETTE.cypress).multiplyScalar(0.62)
const GREEN = new Color(PALETTE.cypressGreen).multiplyScalar(0.85)
const OLIVE = new Color('#57632f')
const LIT = new Color(PALETTE.hillsCrest).multiplyScalar(1.25)

/** Licking-tongue displacement of the flame radius: coherent angular noise drifting up the height. */
function tongue(a: number, hf: number): number {
  const ridge = vnoise(Math.cos(a) * 2.3 + 10, Math.sin(a) * 2.3 + hf * 5.5 + 4)
  const fine = vnoise(Math.cos(a) * 5 + 2, Math.sin(a) * 5 + hf * 9 + 7)
  let bump = (ridge - 0.5) * 1.0 + (fine - 0.5) * 0.4
  bump = bump > 0 ? bump * 1.5 : bump * 0.55 // sharpen outward licks, shallow troughs
  return bump
}

export function BrushCypress() {
  const paintingData = useImageData('/reference/painting.jpg')

  const geometries = useMemo(() => {
    if (!paintingData) return null
    const slicesTopDown = extractCypressSlices(paintingData, { lumMax: 90 })
    if (slicesTopDown.length < 6) return null
    const prof = [...slicesTopDown].reverse() // base (widest, bottom) → tip
    const n = prof.length

    const radiusAt = (i: number) => {
      const hf = i / (n - 1)
      const taper = 1 - smooth(0.84, 1, hf) * 0.82
      return Math.max(0.02, prof[i].halfWidth * WIDTH_SCALE * taper)
    }
    const swayX = (hf: number) => Math.sin(hf * Math.PI * 0.85) * 0.16 + hf * 0.07
    const swayZ = (hf: number) => Math.sin(hf * Math.PI * 1.25 + 1) * 0.06
    const sampleR = (hf: number) => {
      const f = Math.min(n - 1, Math.max(0, hf * (n - 1)))
      const i0 = Math.floor(f)
      const t = f - i0
      return radiusAt(i0) * (1 - t) + radiusAt(Math.min(n - 1, i0 + 1)) * t
    }

    // --- solid flame with a licking silhouette (dark underpaint) ---
    const sPos: number[] = []
    const sCol: number[] = []
    const sIdx: number[] = []
    const cols = SEG + 1
    const cc = new Color()
    const nrm = new Vector3()
    for (let i = 0; i < n; i++) {
      const hf = i / (n - 1)
      const base = radiusAt(i)
      const cx = swayX(hf)
      const cz = swayZ(hf)
      const y = hf * HEIGHT
      const tipTaper = 0.35 + 0.65 * (1 - smooth(0.6, 1, hf))
      for (let j = 0; j <= SEG; j++) {
        const a = (j / SEG) * Math.PI * 2
        const r = Math.max(0.015, base * (1 + tongue(a, hf) * 0.5 * tipTaper))
        sPos.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)
        nrm.set(Math.cos(a), 0.15, Math.sin(a)).normalize()
        cc.copy(CORE).lerp(GREEN, 0.2 + 0.3 * moonShade(nrm))
        sCol.push(cc.r, cc.g, cc.b)
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * cols + j
        const b = a + 1
        const c = a + cols
        const d = c + 1
        sIdx.push(a, c, b, b, c, d)
      }
    }
    const baseCentre = sPos.length / 3
    sPos.push(swayX(0), 0, swayZ(0))
    cc.copy(CORE).multiplyScalar(0.7)
    sCol.push(cc.r, cc.g, cc.b)
    for (let j = 0; j < SEG; j++) sIdx.push(baseCentre, j + 1, j)

    const solid = new BufferGeometry()
    solid.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3))
    solid.setAttribute('color', new BufferAttribute(new Float32Array(sCol), 3))
    solid.setIndex(sIdx)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

    // --- brushstroke cladding: vertical licking strokes, sticking out along the tongues ---
    const rng = mulberry32(0x0cabba9e)
    const arr = makeBrushArrays()
    const p = new Vector3()
    const flow = new Vector3()
    const radial = new Vector3()
    const swirl = new Vector3()
    const strokeCol = new Color()
    for (let s = 0; s < STROKES; s++) {
      const hf = Math.pow(rng(), 0.78) // slight bias toward the fuller base
      const a = rng() * Math.PI * 2
      const bump = tongue(a, hf)
      const tipTaper = 0.35 + 0.65 * (1 - smooth(0.6, 1, hf))
      const r = Math.max(0.015, sampleR(hf) * (1 + bump * 0.5 * tipTaper))
      const stickOut = 0.02 + Math.max(0, bump) * 0.09 * tipTaper // licks reach past the surface
      radial.set(Math.cos(a), 0, Math.sin(a))
      const px = swayX(hf) + Math.cos(a) * r
      const pz = swayZ(hf) + Math.sin(a) * r
      const py = hf * HEIGHT
      nrm.set(Math.cos(a), 0.12, Math.sin(a)).normalize()

      // licking flow: up, plus a tangential swirl (twist) and outward reach
      swirl.set(-Math.sin(a), 0, Math.cos(a))
      const twist = (vnoise(Math.cos(a) * 2.4, Math.sin(a) * 2.4 + hf * 5) - 0.5) * 1.1
      flow
        .set(0, 1, 0)
        .addScaledVector(swirl, twist * 0.45)
        .addScaledVector(radial, 0.25 + Math.max(0, bump) * 0.5)

      const exposure = smooth(-0.1, 0.45, bump)
      const lit = moonShade(nrm)
      const shadeNoise = 0.6 + 0.7 * rng() // strong per-stroke value contrast — the Van Gogh read
      strokeCol
        .copy(CORE)
        .lerp(GREEN, smooth(0.2, 0.85, exposure) * 0.7)
        .lerp(OLIVE, smooth(0.55, 1, exposure) * 0.35)
        .lerp(LIT, lit * smooth(0.4, 1, exposure) * (0.2 + 0.4 * hf))
        .multiplyScalar(shadeNoise)

      p.set(px, py, pz).addScaledVector(nrm, stickOut)
      const halfLen = 0.075 + 0.05 * rng() + 0.025 * (1 - hf)
      const halfWid = 0.015 + 0.011 * rng()
      pushBrush(arr, p, flow, nrm, halfLen, halfWid, strokeCol)
    }

    const strokes = new BufferGeometry()
    strokes.setAttribute('position', new BufferAttribute(new Float32Array(arr.positions), 3))
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(arr.colors), 3))
    strokes.setIndex(arr.indices)
    strokes.computeVertexNormals()
    strokes.computeBoundingSphere()

    return { solid, strokes }
  }, [paintingData])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )

  useEffect(() => () => geometries?.solid.dispose(), [geometries])
  useEffect(() => () => geometries?.strokes.dispose(), [geometries])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])

  if (!geometries) return null
  return (
    <group position={BASE}>
      <mesh geometry={geometries.solid} material={solidMat} renderOrder={2} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={3} />
    </group>
  )
}
