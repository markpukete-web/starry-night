import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, SRGBColorSpace, Vector3 } from 'three'

import rowTableJson from '../../public/reference/cypress-rows.json'
import { makeBrushArrays, moonShade, pushDrapedRibbon } from './brushForms'
import { buildCypressLobeSolid, drapeRibbon, liftToLobes, ringsByLobe, type CypressLobeSolidOptions } from './cypressLobeGeometry'
import { buildCypressLobePlan, sampleCypressLobe, type CypressLobeRows } from './cypressLobes'
import { CYPRESS_RIBBON_CONFIG, ribbonEdges, traceCypressRibbons } from './cypressStrokes'
import { cypressViewBearing } from './cypressMapping'
import { DIORAMA_CAMERAS } from './dioramaContract'
import { useImageData } from './useImageData'
import { concatInjections, injectAlive } from './aliveMaterial'
import { flickerGlsl, flickerUniformValues, flickerWeight, lobeHeight, pushFlicker, ribbonFlicker } from './cypressFlicker'
import { strokeGlsl } from './cypressStrokeShader'
import { ALIVE_DEFAULTS, type AliveTuning } from './skyAlive'

/**
 * Source-derived compound cypress (E1, tasks/2026-10-21-cypress-e1-plan.md). The painting's persistent row runs
 * own the topology: one main column plus the flames beside it, each a closed shallow volume, batched into one
 * underpaint solid. The cladding is Van Gogh's strokes: streamlines traced in the cypress's own orientation
 * field, draped on the lobes' union as thick tapered ribbons, lit by the moving sky's stroke body, over a dark
 * underpaint that reads as the painting's separations between strokes.
 */

const HEIGHT = 2.7
const BASE = new Vector3(-1.5, 0.02, 0.72)
/** no lift on the pigment (retune 2: with 1.08 and the lane rule the render was 8–14 L lighter than the painting) */
const SOURCE_STROKE_LIFT = 1
const MOON_LIFT = 0.04
/** the painting's darkest cypress colour (palette.json, L 9.6): the gaps between strokes */
const CYPRESS_UNDERPAINT = new Color('#151c1b')
/** world units the ribbons sit toward the camera from the solid */
const RIBBON_LIFT = 0.004

/** The row table's crop is `uv` of the painting (E1: the table is baked from the 3840 px scan, so no pixel origin). */
const rowTable = rowTableJson as unknown as CypressLobeRows & { uv: [number, number, number, number] }

/** Dev seam for the gate: the foreground's alive attribute counts, read by the capture step (second pass, F11). */
type AliveFoliageWindow = Window & { __aliveFoliage?: { flickerVertices?: number; glowMarks?: number; glowVertices?: number }; __cypressBuildMs?: number }

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
  /** Make-it-alive A: the flame-like flicker up the strokes (cypressFlicker.ts). */
  alive?: boolean
  tuning?: AliveTuning
  /** C (arrival): true once the tree has its geometry; the arrival waits for it. */
  ready?: RefObject<boolean>
} = {}) {
  const paintingData = useImageData('/reference/painting.jpg')
  // the flow field's failure path (Codex F11): the tree still draws its underpaint, and the arrival goes on
  const [flowFailed, setFlowFailed] = useState(false)
  const onFlowError = useCallback(() => {
    console.error('[cypress] the flow field failed to load; the tree draws its underpaint only')
    setFlowFailed(true)
  }, [])
  const flowData = useImageData('/reference/cypress-flow.png', onFlowError)

  const geometries = useMemo(() => {
    if (!paintingData || (!flowData && !flowFailed)) return null
    // the build's duration is a gate seam (G9); the memo is deterministic in its inputs, the clock read is the one impurity
    // eslint-disable-next-line react-hooks/purity -- a timing seam for the gate
    const started = performance.now()
    const plan = buildCypressLobePlan(rowTable)
    const main = plan.lobes[0]
    const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [BASE.x, BASE.y, BASE.z])
    const anchor = sampleCypressLobe(main, 0.08)?.sourceCenter ?? 0.5
    const geometryOptions: CypressLobeSolidOptions = {
      bearing,
      height: HEIGHT,
      // the baked crop's pixel aspect, so one crop width is HEIGHT × width / height world units
      sourceToWorld: (HEIGHT * rowTable.width) / rowTable.height,
      sourceAnchor: anchor,
      radialSegments: 12,
      mainSections: 96,
      sectionsPerHeight: 72,
      depthRatio: 0.42,
    }
    const compiled = buildCypressLobeSolid(plan, geometryOptions)

    const solid = new BufferGeometry()
    solid.setAttribute('position', new BufferAttribute(new Float32Array(compiled.positions), 3))
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
      if (solidFlicker.length !== (compiled.positions.length / 3) * 2) throw new Error('cypress solid flicker attribute out of step with its vertices')
      solid.setAttribute('aFlicker', new BufferAttribute(new Float32Array(solidFlicker), 2))
    }
    solid.setIndex(compiled.indices)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()

    // the ribbons: traced in the crop, draped on the compiled lobes
    const rings = ringsByLobe(compiled)
    const lobeRange = new Map(plan.lobes.map((lobe) => [lobe.id, [lobe.sections[0].heightFraction, lobe.sections[lobe.sections.length - 1].heightFraction] as const]))
    const arrays = makeBrushArrays()
    const strokeAttr: number[] = []
    const seedAttr: number[] = []
    const strokeFlicker: number[] = []
    const strokeColour = new Color()
    const normal = new Vector3()
    let frontCount = 0
    let backCount = 0
    if (flowData) {
      const front = traceCypressRibbons(flowData, paintingData, rowTable, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11)
      const back = traceCypressRibbons(flowData, paintingData, rowTable, Math.round(CYPRESS_RIBBON_CONFIG.frontCount * CYPRESS_RIBBON_CONFIG.backShare), 0xbacc51de)
      for (const [frontFacing, ribbons] of [[true, front], [false, back]] as const) {
        for (const ribbon of ribbons) {
          const edges = ribbonEdges(ribbon, flowData.width, flowData.height, CYPRESS_RIBBON_CONFIG.taper)
          const draped = drapeRibbon(ribbon, edges, rings, geometryOptions, frontFacing, RIBBON_LIFT)
          if (!draped) continue
          const seedLift = liftToLobes(rings, ribbon.seedSample.px, 1 - ribbon.seedSample.py, geometryOptions, frontFacing)
          const shade = seedLift ? 1 + MOON_LIFT * moonShade(normal.set(...seedLift.normal)) : 1
          // one source pigment per ribbon: the middle sample's, with the moon's shade from the seed's normal
          const colour = strokeColour
            .setRGB(ribbon.colour[0], ribbon.colour[1], ribbon.colour[2], SRGBColorSpace)
            .multiplyScalar(ribbon.relief * SOURCE_STROKE_LIFT * shade)
            .clone()
          const before = arrays.positions.length / 3
          pushDrapedRibbon(arrays, draped.left, draped.right, draped.kept.map(() => colour))
          const pushed = arrays.positions.length / 3 - before
          if (pushed !== draped.kept.length * 2) throw new Error('cypress ribbon pushed an unexpected vertex count')
          const lobe = draped.kept[Math.floor(draped.kept.length / 2)].lobeId
          const flicker = ribbonFlicker(draped.kept, lobeRange.get(lobe) ?? [0, 1], !frontFacing)
          for (let k = 0; k < draped.kept.length; k++) {
            const len = k / (draped.kept.length - 1)
            // the draped strip packs left then right per step
            for (const across of [0, 1]) {
              strokeAttr.push(len, across)
              seedAttr.push(ribbon.seed)
              if (alive) pushFlicker(strokeFlicker, flicker[k][0], flicker[k][1])
            }
          }
          if (frontFacing) frontCount++
          else backCount++
        }
      }
    }

    const strokes = new BufferGeometry()
    strokes.setAttribute('position', new BufferAttribute(new Float32Array(arrays.positions), 3))
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
    strokes.setAttribute('aStroke', new BufferAttribute(new Float32Array(strokeAttr), 2))
    strokes.setAttribute('aSeed', new BufferAttribute(new Float32Array(seedAttr), 1))
    if (alive) {
      if (strokeFlicker.length !== (arrays.positions.length / 3) * 2) throw new Error('cypress stroke flicker attribute out of step with its vertices')
      strokes.setAttribute('aFlicker', new BufferAttribute(new Float32Array(strokeFlicker), 2))
    }
    strokes.setIndex(arrays.indices)
    strokes.computeVertexNormals()
    strokes.computeBoundingSphere()
    strokes.userData = {
      lobes: plan.lobes.length,
      frontStrokes: frontCount,
      backStrokes: backCount,
      solidVertices: compiled.positions.length / 3,
      solidTriangles: compiled.indices.length / 3,
      strokeVertices: arrays.positions.length / 3,
      strokeTriangles: arrays.indices.length / 3,
    }

    /* eslint-disable react-hooks/purity, react-hooks/immutability -- the timing seam, written once per build */
    const buildMs = performance.now() - started
    ;(window as AliveFoliageWindow).__cypressBuildMs = buildMs
    /* eslint-enable react-hooks/purity, react-hooks/immutability */
    if (import.meta.env.DEV) console.info(`[cypress] built in ${buildMs.toFixed(0)} ms: ${frontCount} front and ${backCount} back ribbons, ${arrays.indices.length / 3} triangles`)
    return { solid, strokes }
  }, [alive, paintingData, flowData, flowFailed])

  // the materials: three's stock MeshBasicMaterial with injections (aliveMaterial.ts). The solid is the flat
  // underpaint, the strokes carry the sky's stroke body; with `alive` the flicker multiplies after it
  const solidUniforms = useMemo(() => flickerUniforms(true), [])
  const strokeUniforms = useMemo(() => flickerUniforms(false), [])
  const solidMaterial = useMemo(() => {
    const material = new MeshBasicMaterial({ color: CYPRESS_UNDERPAINT, toneMapped: false, side: DoubleSide })
    if (alive) injectAlive(material, { key: 'alive-flicker-solid', uniforms: solidUniforms, ...flickerGlsl })
    return material
  }, [alive, solidUniforms])
  const strokeMaterial = useMemo(() => {
    // alpha-to-coverage dithers the stroke's shaped edge across the canvas's MSAA samples, no sorting needed
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide, alphaToCoverage: true })
    const body = { uniforms: {}, ...strokeGlsl }
    injectAlive(material, alive ? concatInjections('cypress-strokes-flicker', body, { uniforms: strokeUniforms, ...flickerGlsl }) : concatInjections('cypress-strokes', body))
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

  // C: the arrival waits for the tree; its CPU images do not suspend, so the sky's own seam cannot cover it
  useLayoutEffect(() => {
    if (readyRef) readyRef.current = geometries !== null
  }, [readyRef, geometries])
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
