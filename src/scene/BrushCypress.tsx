import { useEffect, useLayoutEffect, useMemo, type RefObject } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
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
import { injectAlive } from './aliveMaterial'
import { flickerGlsl, flickerUniformValues, flickerWeight, lobeHeight, pushFlicker } from './cypressFlicker'
import { ALIVE_DEFAULTS, type AliveTuning } from './skyAlive'

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

/** The row table's crop is `uv` of the painting (E1: the table is baked from the 3840 px scan, so no pixel origin). */
const rowTable = rowTableJson as unknown as CypressLobeRows & { uv: [number, number, number, number] }

/** A crop-normalised point as painting-normalised coordinates. */
function paintingPoint(px: number, py: number): [number, number] {
  const [u0, v0, u1, v1] = rowTable.uv
  return [u0 + px * (u1 - u0), v0 + py * (v1 - v0)]
}

function isCypressTexel(texel: CypressTexel) {
  const luminance = 0.299 * texel.r + 0.587 * texel.g + 0.114 * texel.b
  return luminance < 118 && texel.b < texel.g + 18
}

function sourceTexel(
  painting: ImageData2D,
  sample: Pick<CypressLobeStrokeSample, 'paintX' | 'sourceY' | 'heightFraction'>,
  main: CypressLobe,
): CypressTexel {
  const texel = sampleCypressImage(painting, ...paintingPoint(sample.paintX, sample.sourceY))
  if (isCypressTexel(texel)) return texel

  // Root bridges pass through rows where the source threshold has holes. Fall back to the main
  // cypress at the same height, never to blue sky; this is coloured underpaint, not invented bark.
  const mainSection = sampleCypressLobe(main, sample.heightFraction)
  if (!mainSection) return texel
  return sampleCypressImage(painting, ...paintingPoint(mainSection.sourceCenter, sample.sourceY))
}

/** Dev seam for the gate: the foreground's alive attribute counts, read by the capture step (second pass, F11). */
type AliveFoliageWindow = Window & { __aliveFoliage?: { flickerVertices?: number; glowMarks?: number; glowVertices?: number } }

/** The flicker's uniforms for one material; the frame loop writes uTime, the layout effect uFlicker. */
function flickerUniforms(solid: boolean) {
  const v = flickerUniformValues(ALIVE_DEFAULTS, solid)
  return {
    uTime: { value: 0 },
    uFlicker: { value: v.strength },
    uFlickerOmega: { value: v.omega },
    uFlickerK: { value: v.k },
    uFlickerAmp: { value: v.amplitudes },
    uFlickerTau: { value: v.tau },
  }
}

export function BrushCypress({
  clock,
  alive = false,
  tuning = ALIVE_DEFAULTS,
  ready: readyRef,
}: {
  /** The one sky clock (second pass, A3): pinned, advanced, or 0 while paused. */
  clock?: RefObject<number>
  /** Make-it-alive A: the flame-like flicker up the strokes (cypressFlicker.ts). Off = today's tree, bit for bit. */
  alive?: boolean
  tuning?: AliveTuning
  /** C (arrival): true once the tree has its geometry; the arrival waits for it. */
  ready?: RefObject<boolean>
} = {}) {
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
      solidUvs.push(...paintingPoint(compiled.sourceUvs[index], compiled.sourceUvs[index + 1]))
    }

    const solid = new BufferGeometry()
    solid.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(compiled.positions), 3),
    )
    solid.setAttribute('uv', new BufferAttribute(new Float32Array(solidUvs), 2))
    if (alive) {
      // the flicker's [w, h] per vertex: h is the stroke axis (the solid's source v is 1 − heightFraction), the
      // weight the tip term on the vertex's height within its own lobe; the body has no tongues (lateral 0)
      const solidFlicker: number[] = []
      const lobeRange = new Map(plan.lobes.map((lobe) => [lobe.id, [lobe.sections[0].heightFraction, lobe.sections[lobe.sections.length - 1].heightFraction] as const]))
      for (const range of compiled.lobeRanges) {
        const [start, end] = lobeRange.get(range.lobeId) ?? [0, 1]
        for (let i = range.firstVertex; i < range.firstVertex + range.vertexCount; i++) {
          const h = 1 - compiled.sourceUvs[i * 2 + 1]
          pushFlicker(solidFlicker, flickerWeight(lobeHeight(h, start, end), 0), h)
        }
      }
      if (solidFlicker.length !== compiled.positions.length / 3 * 2) throw new Error('cypress solid flicker attribute out of step with its vertices')
      solid.setAttribute('aFlicker', new BufferAttribute(new Float32Array(solidFlicker), 2))
    }
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
    // the flicker's [w, h] per stroke vertex, packed by the vertex count before and after each ribbon push, since
    // a push can return without pushing (review F10)
    const strokeFlicker: number[] = []
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
          const before = arrays.positions.length / 3
          pushBrushRibbon(
            arrays,
            points,
            normals,
            colours,
            stroke.scale === 'structural' ? STRUCTURAL_HALF_WIDTH : FILL_HALF_WIDTH,
            stroke.scale === 'structural' ? 0.9 : 0.92,
          )
          if (alive) {
            const pushed = arrays.positions.length / 3 - before
            if (pushed !== 0 && pushed !== points.length * 2) throw new Error('cypress ribbon pushed an unexpected vertex count')
            if (pushed > 0) {
              const lateral = Math.abs(stroke.samples.reduce((sum, sample) => sum + sample.lateral, 0) / stroke.samples.length)
              const lobeStart = lobe.sections[0].heightFraction
              const lobeEnd = lobe.sections[lobe.sections.length - 1].heightFraction
              // the ribbon packs two vertices (left, right) per sample, in sample order
              for (const sample of stroke.samples) {
                const w = flickerWeight(lobeHeight(sample.heightFraction, lobeStart, lobeEnd), lateral, !frontFacing)
                pushFlicker(strokeFlicker, w, sample.heightFraction)
                pushFlicker(strokeFlicker, w, sample.heightFraction)
              }
            }
          }
        }
      }
    }

    const strokes = new BufferGeometry()
    strokes.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(arrays.positions), 3),
    )
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
    if (alive) {
      if (strokeFlicker.length !== arrays.positions.length / 3 * 2) throw new Error('cypress stroke flicker attribute out of step with its vertices')
      strokes.setAttribute('aFlicker', new BufferAttribute(new Float32Array(strokeFlicker), 2))
    }
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
  }, [alive, paintingData])

  // With the flag on, the same materials take the flicker through onBeforeCompile (aliveMaterial.ts): three's
  // stock program with a multiply after the vertex-colour chunk. Off, they are untouched, today's bytes.
  const solidUniforms = useMemo(() => flickerUniforms(true), [])
  const strokeUniforms = useMemo(() => flickerUniforms(false), [])
  const solidMaterial = useMemo(() => {
    const material = new MeshBasicMaterial({
      color: CYPRESS_COLOUR_LIFT,
      map: cypressTexture,
      toneMapped: false,
      side: DoubleSide,
    })
    if (alive) injectAlive(material, { key: 'alive-flicker-solid', uniforms: solidUniforms, ...flickerGlsl })
    return material
  }, [alive, cypressTexture, solidUniforms])
  const strokeMaterial = useMemo(() => {
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide })
    if (alive) injectAlive(material, { key: 'alive-flicker-strokes', uniforms: strokeUniforms, ...flickerGlsl })
    return material
  }, [alive, strokeUniforms])

  // the knob, through the uniforms: a slider never rebuilds the tree
  useLayoutEffect(() => {
    if (!alive) return
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    solidUniforms.uFlicker.value = flickerUniformValues(tuning, true).strength
    strokeUniforms.uFlicker.value = flickerUniformValues(tuning, false).strength
    /* eslint-enable react-hooks/immutability */
  }, [alive, solidUniforms, strokeUniforms, tuning])

  // the sky clock as the sky's frame loop last wrote it (one frame behind, like the halos); 0 off or paused
  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: the time uniform */
  useFrame(() => {
    if (!alive) return
    const t = clock?.current ?? 0
    solidUniforms.uTime.value = t
    strokeUniforms.uTime.value = t
  })
  /* eslint-enable react-hooks/immutability */

  // the gate's dev seam: how many vertices carry the attribute
  useEffect(() => {
    if (!alive || !geometries) return
    const seam = (window as AliveFoliageWindow).__aliveFoliage ?? {}
    seam.flickerVertices = geometries.strokes.getAttribute('aFlicker').count + geometries.solid.getAttribute('aFlicker').count
    ;(window as AliveFoliageWindow).__aliveFoliage = seam
  }, [alive, geometries])

  // C: the arrival waits for the tree; its CPU image does not suspend, so the sky's own seam cannot cover it
  useLayoutEffect(() => {
    if (readyRef) readyRef.current = geometries !== null
  }, [readyRef, geometries])
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
