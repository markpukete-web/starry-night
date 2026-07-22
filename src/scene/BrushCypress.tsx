import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
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
  buildCypressLobeSolid,
  mapCypressLobeSurface,
  type CypressLobeSolidOptions,
} from './cypressLobeGeometry'
import {
  buildCypressLobePlan,
  sampleCypressLobe,
  type CypressLobe,
  type CypressLobeRows,
} from './cypressLobes'
import {
  CYPRESS_LOBE_STROKE_CONFIG,
  generateCypressLobeStrokes,
  type CypressLobeStrokeSample,
} from './cypressLobeStrokes'
import { cypressViewBearing } from './cypressMapping'
import { sampleCypressImage, type CypressTexel } from './cypressStrokes'
import { DIORAMA_CAMERAS } from './dioramaContract'
import { useImageData, type ImageData2D } from './useImageData'

/**
 * Source-derived compound cypress. The painting's persistent row runs own the topology: one main
 * continuation plus a few connected side flames. Every lobe is a closed shallow 3D volume and all
 * lobes batch into one underpaint mesh and one multi-scale ribbon mesh.
 */

const HEIGHT = 2.7
const BASE = new Vector3(-1.5, 0.02, 0.72)
const SOURCE_STROKE_LIFT = 1.08
const MOON_LIFT = 0.04
const STRUCTURAL_HALF_WIDTH = 0.0035
const FILL_HALF_WIDTH = 0.0032
const CYPRESS_COLOUR_LIFT = new Color().setRGB(1.14, 1.1, 1.06)

const rowTable = rowTableJson as unknown as CypressLobeRows & { x0: number; y0: number }

function isCypressTexel(texel: CypressTexel) {
  const luminance = 0.299 * texel.r + 0.587 * texel.g + 0.114 * texel.b
  return luminance < 118 && texel.b < texel.g + 18
}

function sourceTexel(
  painting: ImageData2D,
  sample: Pick<CypressLobeStrokeSample, 'paintX' | 'sourceY' | 'heightFraction'>,
  main: CypressLobe,
): CypressTexel {
  const sourceX = rowTable.x0 + sample.paintX * (rowTable.width - 1)
  const sourceY = rowTable.y0 + sample.sourceY * (rowTable.height - 1)
  const texel = sampleCypressImage(
    painting,
    sourceX / Math.max(1, painting.width - 1),
    sourceY / Math.max(1, painting.height - 1),
  )
  if (isCypressTexel(texel)) return texel

  // Root bridges pass through rows where the source threshold has holes. Fall back to the main
  // cypress at the same height, never to blue sky; this is coloured underpaint, not invented bark.
  const mainSection = sampleCypressLobe(main, sample.heightFraction)
  if (!mainSection) return texel
  const fallbackX = rowTable.x0 + mainSection.sourceCenter * (rowTable.width - 1)
  return sampleCypressImage(
    painting,
    fallbackX / Math.max(1, painting.width - 1),
    sourceY / Math.max(1, painting.height - 1),
  )
}

export function BrushCypress() {
  const paintingData = useImageData('/reference/painting.jpg')
  const paintingTexture = useTexture('/reference/painting.jpg')
  const cypressTexture = useMemo(() => {
    const texture = paintingTexture.clone()
    texture.colorSpace = SRGBColorSpace
    texture.flipY = false
    texture.needsUpdate = true
    return texture
  }, [paintingTexture])

  const geometries = useMemo(() => {
    if (!paintingData) return null
    const plan = buildCypressLobePlan(rowTable)
    const main = plan.lobes[0]
    const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [BASE.x, BASE.y, BASE.z])
    const anchor = sampleCypressLobe(main, 0.08)?.sourceCenter ?? 0.5
    const geometryOptions: CypressLobeSolidOptions = {
      bearing,
      height: HEIGHT,
      // Preserve the baked crop's pixel aspect. The previous viewport-scale constant squeezed the
      // tree about 30% horizontally, turning source fronds into gothic needles.
      sourceToWorld: (HEIGHT * rowTable.width) / rowTable.height,
      sourceAnchor: anchor,
      radialSegments: 12,
      mainSections: 96,
      sectionsPerHeight: 72,
      depthRatio: 0.42,
    }
    const compiled = buildCypressLobeSolid(plan, geometryOptions)
    const solidUvs: number[] = []
    for (let index = 0; index < compiled.sourceUvs.length; index += 2) {
      const sourceX = rowTable.x0 + compiled.sourceUvs[index] * (rowTable.width - 1)
      const sourceY = rowTable.y0 + compiled.sourceUvs[index + 1] * (rowTable.height - 1)
      solidUvs.push(
        sourceX / Math.max(1, paintingData.width - 1),
        sourceY / Math.max(1, paintingData.height - 1),
      )
    }

    const solid = new BufferGeometry()
    solid.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(compiled.positions), 3),
    )
    solid.setAttribute('uv', new BufferAttribute(new Float32Array(solidUvs), 2))
    solid.setIndex(compiled.indices)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

    const front = generateCypressLobeStrokes(plan, {
      ...CYPRESS_LOBE_STROKE_CONFIG,
      seed: 0xc1f3a11,
    })
    const back = generateCypressLobeStrokes(plan, {
      ...CYPRESS_LOBE_STROKE_CONFIG,
      structuralCount: Math.round(
        CYPRESS_LOBE_STROKE_CONFIG.structuralCount * CYPRESS_LOBE_STROKE_CONFIG.backDensity,
      ),
      fillCount: Math.round(
        CYPRESS_LOBE_STROKE_CONFIG.fillCount * CYPRESS_LOBE_STROKE_CONFIG.backDensity,
      ),
      seed: 0xbacc51de,
    })
    const lobeById = new Map(plan.lobes.map((lobe) => [lobe.id, lobe]))
    const arrays = makeBrushArrays()
    const point = new Vector3()
    const normal = new Vector3()
    const strokeColour = new Color()
    for (const [frontFacing, strokes] of [
      [true, front],
      [false, back],
    ] as const) {
      for (const stroke of strokes) {
        const lobe = lobeById.get(stroke.lobeId)
        if (!lobe) continue
        const points: Vector3[] = []
        const normals: Vector3[] = []
        const colours: Color[] = []
        const texels: CypressTexel[] = []
        for (const sample of stroke.samples) {
          const surface = mapCypressLobeSurface(lobe, sample, geometryOptions, frontFacing)
          normal.set(...surface.normal)
          point
            .set(...surface.position)
            .addScaledVector(normal, stroke.scale === 'structural' ? 0.004 : 0.003)
          points.push(point.clone())
          normals.push(normal.clone())
          texels.push(sourceTexel(paintingData, sample, main))
        }
        // One source pigment per ribbon. Averaging the whole path collapses umber/green families
        // into a dark sheet; sampling every vertex creates tiled bark. The centre texel keeps each
        // mark coherent while deterministic seeding varies pigment between neighbouring marks.
        const pigment = texels[Math.floor(texels.length / 2)]
        for (const surfaceNormal of normals) {
          strokeColour
            .setRGB(pigment.r / 255, pigment.g / 255, pigment.b / 255, SRGBColorSpace)
            .multiplyScalar(
              stroke.relief * SOURCE_STROKE_LIFT * (1 + MOON_LIFT * moonShade(surfaceNormal)),
            )
          colours.push(strokeColour.clone())
        }
        if (points.length >= 3) {
          pushBrushRibbon(
            arrays,
            points,
            normals,
            colours,
            stroke.scale === 'structural' ? STRUCTURAL_HALF_WIDTH : FILL_HALF_WIDTH,
            stroke.scale === 'structural' ? 0.9 : 0.92,
          )
        }
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
      lobes: plan.lobes.length,
      frontStrokes: front.length,
      backStrokes: back.length,
      solidVertices: compiled.positions.length / 3,
      solidTriangles: compiled.indices.length / 3,
      strokeVertices: arrays.positions.length / 3,
      strokeTriangles: arrays.indices.length / 3,
    }

    return { solid, strokes }
  }, [paintingData])

  const solidMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: CYPRESS_COLOUR_LIFT,
        map: cypressTexture,
        toneMapped: false,
        side: DoubleSide,
      }),
    [cypressTexture],
  )
  const strokeMaterial = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )

  useEffect(() => () => geometries?.solid.dispose(), [geometries])
  useEffect(() => () => geometries?.strokes.dispose(), [geometries])
  useEffect(() => () => cypressTexture.dispose(), [cypressTexture])
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
