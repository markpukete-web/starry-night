import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'

import rowTableJson from '../../public/reference/cypress-rows.json'
import { makeBrushArrays, moonShade, pushBrushRibbon } from './brushForms'
import {
  cypressViewBearing,
  paintingUToAngle,
  paintingUV,
  type RowTable,
} from './cypressMapping'
import { composedRadius, CYPRESS_LUM_MAX, makeCypressProfile, tongue } from './cypressProfile'
import {
  buildTendrilTracks,
  CYPRESS_STROKE_CONFIG,
  generateCypressStrokes,
  sampleCypressImage,
} from './cypressStrokes'
import { DIORAMA_CAMERAS } from './dioramaContract'
import { PALETTE } from './palette'
import { extractCypressSlices } from './paintingRegions'
import { useImageData } from './useImageData'

/**
 * The cypress remains a closed orbit-safe solid, but its visible identity now comes from long
 * source-locked ribbons. The solid is dark underpaint only; colour, stroke path and rim wisps come
 * from the painting-derived skin, field and detached runs.
 */

const HEIGHT = 2.7
const SEGMENTS = 72
const BASE = new Vector3(-1.5, 0.02, 0.72)
const MOON_LIFT = 0.14
const RIBBON_HALF_WIDTH = 0.012
const RIBBON_TAPER = 0.45

const UNDER_CORE = new Color(PALETTE.cypress).multiplyScalar(0.68)
const UNDER_GREEN = new Color(PALETTE.cypressGreen).multiplyScalar(0.95)

const rowTable = rowTableJson as unknown as RowTable & {
  satellites: { y: number; x0: number; x1: number }[]
}

export function BrushCypress() {
  const paintingData = useImageData('/reference/painting.jpg')
  const skinData = useImageData('/reference/cypress-skin.webp')
  const flowData = useImageData('/reference/cypress-flow.png')

  const geometries = useMemo(() => {
    if (!paintingData || !skinData || !flowData) return null
    const slices = extractCypressSlices(paintingData, { lumMax: CYPRESS_LUM_MAX })
    if (slices.length < 6) return null
    const profile = makeCypressProfile(
      [...slices]
        .reverse()
        .map((slice) => slice.halfWidth),
    )
    const rings = profile.slices.length
    const swayX = (heightFraction: number) =>
      Math.sin(heightFraction * Math.PI * 0.85) * 0.16 + heightFraction * 0.07
    const swayZ = (heightFraction: number) =>
      Math.sin(heightFraction * Math.PI * 1.25 + 1) * 0.06

    // Closed solid underpaint. Its radius law is the same shared function the ablation measures.
    const solidPositions: number[] = []
    const solidColours: number[] = []
    const solidIndices: number[] = []
    const columns = SEGMENTS + 1
    const colour = new Color()
    const normal = new Vector3()
    for (let ring = 0; ring < rings; ring++) {
      const heightFraction = ring / (rings - 1)
      const centreX = swayX(heightFraction)
      const centreZ = swayZ(heightFraction)
      for (let segment = 0; segment <= SEGMENTS; segment++) {
        const angle = (segment / SEGMENTS) * Math.PI * 2
        const radius = composedRadius(heightFraction, angle, profile)
        solidPositions.push(
          centreX + Math.cos(angle) * radius,
          heightFraction * HEIGHT,
          centreZ + Math.sin(angle) * radius,
        )
        normal.set(Math.cos(angle), 0.15, Math.sin(angle)).normalize()
        colour.copy(UNDER_CORE).lerp(UNDER_GREEN, 0.2 + 0.3 * moonShade(normal))
        solidColours.push(colour.r, colour.g, colour.b)
      }
    }
    for (let ring = 0; ring < rings - 1; ring++) {
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const a = ring * columns + segment
        const b = a + 1
        const c = a + columns
        const d = c + 1
        solidIndices.push(a, c, b, b, c, d)
      }
    }
    const baseCentre = solidPositions.length / 3
    solidPositions.push(swayX(0), 0, swayZ(0))
    colour.copy(UNDER_CORE).multiplyScalar(0.7)
    solidColours.push(colour.r, colour.g, colour.b)
    for (let segment = 0; segment < SEGMENTS; segment++) {
      solidIndices.push(baseCentre, segment + 1, segment)
    }

    const solid = new BufferGeometry()
    solid.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(solidPositions), 3),
    )
    solid.setAttribute('color', new BufferAttribute(new Float32Array(solidColours), 3))
    solid.setIndex(solidIndices)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

    // Complete source-mapped front pass plus an explicit sparser mirrored back continuation.
    const arrays = makeBrushArrays()
    const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [BASE.x, BASE.y, BASE.z])
    const front = generateCypressStrokes({
      skin: skinData,
      flow: flowData,
      rows: rowTable,
      count: CYPRESS_STROKE_CONFIG.frontCount,
      steps: CYPRESS_STROKE_CONFIG.steps,
      lengthFraction: CYPRESS_STROKE_CONFIG.lengthFraction,
      reliefSpread: CYPRESS_STROKE_CONFIG.reliefSpread,
      seed: 0x0cabba9e,
    })
    const back = generateCypressStrokes({
      skin: skinData,
      flow: flowData,
      rows: rowTable,
      count: Math.round(
        CYPRESS_STROKE_CONFIG.frontCount * CYPRESS_STROKE_CONFIG.backDensity,
      ),
      steps: CYPRESS_STROKE_CONFIG.steps,
      lengthFraction: CYPRESS_STROKE_CONFIG.lengthFraction,
      reliefSpread: CYPRESS_STROKE_CONFIG.reliefSpread,
      seed: 0x5eed1e55,
    })
    const strokeColour = new Color()
    for (const [frontFacing, strokes] of [
      [true, front],
      [false, back],
    ] as const) {
      for (const stroke of strokes) {
        const points: Vector3[] = []
        const normals: Vector3[] = []
        const colours: Color[] = []
        for (const sample of stroke.samples) {
          const heightFraction = sample.heightFraction
          const angle = paintingUToAngle(sample.u, bearing, frontFacing)
          const radius = composedRadius(heightFraction, angle, profile)
          const displacement = tongue(angle, heightFraction)
          normal.set(Math.cos(angle), 0.12, Math.sin(angle)).normalize()
          const lift = 0.01 + Math.max(0, displacement) * 0.015
          points.push(
            new Vector3(
              swayX(heightFraction) + Math.cos(angle) * radius + normal.x * lift,
              heightFraction * HEIGHT,
              swayZ(heightFraction) + Math.sin(angle) * radius + normal.z * lift,
            ),
          )
          normals.push(normal.clone())

          // ImageData is sRGB; Three's working colour is linear. Relief is constant along a
          // stroke, and moon response only lifts—it no longer supplies the tree's value structure.
          strokeColour.setRGB(sample.r, sample.g, sample.b, SRGBColorSpace)
          strokeColour.multiplyScalar(stroke.relief * (1 + MOON_LIFT * moonShade(normal)))
          colours.push(strokeColour.clone())
        }
        if (points.length >= 3) {
          pushBrushRibbon(
            arrays,
            points,
            normals,
            colours,
            RIBBON_HALF_WIDTH,
            RIBBON_TAPER,
          )
        }
      }
    }

    // Detached source runs become only a few coherent top-third tracks. Each starts on the mesh,
    // eases outward, and narrows at its far tip: a broken painted rim, never a uniform fur fringe.
    const tendrils = buildTendrilTracks(rowTable.satellites, {
      minRows: 12,
      maxTracks: 6,
      crop: { width: skinData.width, height: skinData.height },
      rows: rowTable,
    }).filter(
      (track) =>
        track.points.reduce((sum, point) => sum + point.heightFraction, 0) /
          track.points.length >
        0.66,
    )
    for (const track of tendrils) {
      const rimAngle =
        track.side === 'right' ? bearing - Math.PI / 2 : bearing + Math.PI / 2
      const points: Vector3[] = []
      const normals: Vector3[] = []
      const colours: Color[] = []
      const rootHeight = track.points[0].heightFraction
      const sourceSpan =
        track.points[track.points.length - 1].heightFraction - rootHeight
      const heightScale = sourceSpan > 1e-6 ? Math.max(1, 0.08 / sourceSpan) : 1
      for (let index = 0; index < track.points.length; index++) {
        const point = track.points[index]
        const heightFraction = Math.min(
          0.985,
          rootHeight + (point.heightFraction - rootHeight) * heightScale,
        )
        const solidRadius = composedRadius(heightFraction, rimAngle, profile)
        const along = index / Math.max(1, track.points.length - 1)
        const eased = along * along * (3 - 2 * along)
        // Compress extreme source distances logarithmically: detached runs near the narrow tip can
        // be tens of row half-widths away, but must still become a proportionate wisp, not a fork.
        const overshoot = Math.min(0.15, 0.05 + Math.log1p(point.rimDistance) * 0.03)
        const radius = solidRadius + eased * overshoot
        normal.set(Math.cos(rimAngle), 0.12, Math.sin(rimAngle)).normalize()
        points.push(
          new Vector3(
            swayX(heightFraction) + Math.cos(rimAngle) * radius,
            heightFraction * HEIGHT,
            swayZ(heightFraction) + Math.sin(rimAngle) * radius,
          ),
        )
        normals.push(normal.clone())
        const source = paintingUV(
          track.side === 'left' ? 0.2 : 0.8,
          point.heightFraction,
          rowTable,
        )
        const texel = sampleCypressImage(skinData, source.px, source.py)
        strokeColour.setRGB(texel.r / 255, texel.g / 255, texel.b / 255, SRGBColorSpace)
        strokeColour.multiplyScalar(1.25 + MOON_LIFT * moonShade(normal))
        colours.push(strokeColour.clone())
      }
      if (points.length >= 4) {
        pushBrushRibbon(arrays, points, normals, colours, 0.009, 0.05)
      }
    }

    const strokes = new BufferGeometry()
    strokes.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(arrays.positions), 3),
    )
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
    strokes.setIndex(arrays.indices)
    strokes.computeVertexNormals()
    strokes.computeBoundingSphere()
    strokes.userData = {
      frontStrokes: front.length,
      backStrokes: back.length,
      tendrils: tendrils.length,
      vertices: arrays.positions.length / 3,
      triangles: arrays.indices.length / 3,
    }

    return { solid, strokes }
  }, [paintingData, skinData, flowData])

  const solidMaterial = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    [],
  )
  const strokeMaterial = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )

  useEffect(() => () => geometries?.solid.dispose(), [geometries])
  useEffect(() => () => geometries?.strokes.dispose(), [geometries])
  useEffect(() => () => solidMaterial.dispose(), [solidMaterial])
  useEffect(() => () => strokeMaterial.dispose(), [strokeMaterial])

  if (!geometries) return null
  return (
    <group position={BASE}>
      <mesh geometry={geometries.solid} material={solidMaterial} renderOrder={2} />
      <mesh geometry={geometries.strokes} material={strokeMaterial} renderOrder={3} />
    </group>
  )
}
