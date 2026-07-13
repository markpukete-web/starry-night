import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { PALETTE } from './palette'
import { makeBrushArrays, moonShade, pushBrush, smooth, vnoise } from './brushForms'
import { islandHeightAt } from './islandShape'

/**
 * Foreground dressing: the painting's dark green-black bushes, dotted around the village huddle
 * and along the ground band so the apron between the coast and the houses stops reading bare.
 * Procedural fill (classify rule) built with the shared brush kit: each bush is a small squashed
 * dark dome CLAD in short broad contour marks — broad from the start, because long slim marks
 * with stick-out read as fur at the silhouette (the cypress lesson). The rounded language keeps
 * them bushes; the pointed flame belongs to the hero cypress alone.
 */

// cx, cz, radius, squash (height = r × squash)
const BUSHES: [number, number, number, number][] = [
  [-1.15, 0.55, 0.16, 1.05], // between cypress and village-left
  [-1.26, 0.88, 0.21, 0.9], // clump at the cypress foot, front
  [-0.38, 0.95, 0.13, 0.95], // front of village-left
  [0.24, 0.98, 0.17, 0.85], // front-centre, before the church
  [0.7, 0.9, 0.12, 1.0], // front of village-right
  [1.25, 0.6, 0.18, 0.95], // right edge beyond the last house
  [1.48, 0.26, 0.13, 0.9], // far right toward the coast
  [-0.05, 0.7, 0.09, 1.0], // tucked between church and houses
]

const RINGS = 7
const SEG = 14

export function BrushShrubs() {
  const geometries = useMemo(() => {
    const rng = mulberry32(0x0b05_11e5)
    // the cypress recipe at bush scale: a near-black COOL mass (an all-olive mass reads as a dirt
    // mound against the blue night), olive only as sparse tongue accents, cool moonlit rim flecks
    const dark = new Color(PALETTE.cypress)
    const green = new Color(PALETTE.cypressGreen)
    const coolGreen = new Color(PALETTE.villageCool) // the reference band's bushes are blue-green, not pure olive
    const litRim = new Color(PALETTE.villageCool).multiplyScalar(1.25)
    const baseDark = dark.clone().multiplyScalar(0.4)

    const sPos: number[] = []
    const sCol: number[] = []
    const sIdx: number[] = []
    const arr = makeBrushArrays()
    const cc = new Color()
    const p = new Vector3()
    const nrm = new Vector3()
    const tangent = new Vector3()
    const up = new Vector3(0, 1, 0)
    const strokeCol = new Color()

    for (const [cx, cz, r, squash] of BUSHES) {
      const y0 = islandHeightAt(cx, cz) - 0.045 // seat into the ground, no floating rim
      // --- dark dome underpaint (gaps between strokes read as shadow, never void) ---
      const base = sPos.length / 3
      for (let ri = 0; ri <= RINGS; ri++) {
        const phi = (ri / RINGS) * (Math.PI / 2) // top → equator
        for (let j = 0; j <= SEG; j++) {
          const th = (j / SEG) * Math.PI * 2
          const wob = 1 + (vnoise(Math.cos(th) * 2 + cx * 7, Math.sin(th) * 2 + cz * 7 + ri) - 0.5) * 0.15
          const rad = Math.sin(phi) * r * wob
          const y = y0 + Math.cos(phi) * r * squash * wob
          sPos.push(cx + Math.cos(th) * rad, y, cz + Math.sin(th) * rad)
          cc.copy(dark).lerp(baseDark, smooth(0.15, 1, ri / RINGS))
          sCol.push(cc.r, cc.g, cc.b)
        }
      }
      for (let ri = 0; ri < RINGS; ri++) {
        for (let j = 0; j < SEG; j++) {
          const a = base + ri * (SEG + 1) + j
          const b = a + 1
          const c = a + SEG + 1
          const d = c + 1
          sIdx.push(a, b, c, b, d, c)
        }
      }

      // --- short broad contour marks over the dome ---
      const count = Math.round(140 * (r / 0.15) ** 2)
      for (let s = 0; s < count; s++) {
        const phi = Math.acos(1 - rng() * 0.92) // area-ish sample, top hemisphere, skip the buried skirt
        const th = rng() * Math.PI * 2
        const wob = 1 + (vnoise(Math.cos(th) * 2 + cx * 7, Math.sin(th) * 2 + cz * 7 + phi * 2.2) - 0.5) * 0.15
        nrm.set(Math.sin(phi) * Math.cos(th), Math.cos(phi) / Math.max(0.4, squash), Math.sin(phi) * Math.sin(th)).normalize()
        p.set(
          cx + Math.sin(phi) * Math.cos(th) * r * wob,
          y0 + Math.cos(phi) * r * squash * wob,
          cz + Math.sin(phi) * Math.sin(th) * r * wob,
        ).addScaledVector(nrm, 0.008)
        // rounded bush language: marks curl around the form (contour), a touch of upward drift
        tangent.crossVectors(nrm, up)
        if (tangent.lengthSq() < 1e-5) tangent.set(1, 0, 0)
        tangent.normalize().addScaledVector(up, 0.25 + (vnoise(th * 3 + 9, phi * 3 + cx) - 0.5) * 0.5)

        const exposure = Math.cos(phi) // crown catches the moon, skirt stays dark
        // sparse olive tongues through the near-black mass (per-STROKE, so the olive scatters
        // instead of tinting the whole form)
        const tongue = rng() < 0.35 ? 0.3 + 0.5 * rng() : 0.1 * rng()
        strokeCol
          .copy(dark)
          .lerp(rng() < 0.4 ? coolGreen : green, tongue * (0.3 + 0.7 * exposure))
          .multiplyScalar(0.85 + 0.9 * exposure * (0.45 + 0.55 * moonShade(nrm)))
        strokeCol.multiplyScalar(0.6 + 0.7 * rng()) // the per-stroke value kick — the brushwork read
        if (exposure > 0.55 && rng() < 0.05) strokeCol.lerp(litRim, 0.3) // sparse cool crown flecks

        const halfLen = (0.3 + 0.22 * rng()) * r
        const halfWid = (0.14 + 0.1 * rng()) * r
        pushBrush(arr, p, tangent, nrm, halfLen, halfWid, strokeCol)
      }
    }

    const solid = new BufferGeometry()
    solid.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3))
    solid.setAttribute('color', new BufferAttribute(new Float32Array(sCol), 3))
    solid.setIndex(sIdx)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

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
      <mesh geometry={geometries.solid} material={solidMat} renderOrder={1} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={2} />
    </group>
  )
}
