import { Vector3 } from 'three'
import {
  sampleCypressLobe,
  type CypressLobePlan,
  type CypressLobeSection,
} from './cypressLobes.ts'
import type { CypressRibbon, RibbonEdges } from './cypressStrokes.ts'

export type CypressLobeSolidOptions = {
  bearing: number
  height: number
  /** Converts one baked-crop horizontal unit into world units. */
  sourceToWorld: number
  /** Baked-crop coordinate that remains at the authored cypress base position. */
  sourceAnchor: number
  radialSegments: number
  mainSections: number
  sectionsPerHeight: number
  depthRatio: number
}

export type CypressLobeRing = {
  lobeId: string
  heightFraction: number
  vertexStart: number
  projectedLeft: number
  projectedRight: number
  source: CypressLobeSection
}

export type CypressLobeSolid = {
  positions: number[]
  /** Per-vertex baked-crop coordinates: x then top-origin y. */
  sourceUvs: number[]
  indices: number[]
  rings: CypressLobeRing[]
  lobeRanges: { lobeId: string; firstVertex: number; vertexCount: number }[]
}

export type CypressLobeSurfaceSample = {
  heightFraction: number
  lateral: number
  sourceX: number
}

export type CypressLobeSurfacePoint = {
  position: readonly [number, number, number]
  normal: readonly [number, number, number]
}

const DEFAULTS: Omit<CypressLobeSolidOptions, 'bearing' | 'height' | 'sourceToWorld' | 'sourceAnchor'> = {
  radialSegments: 12,
  mainSections: 96,
  sectionsPerHeight: 72,
  depthRatio: 0.42,
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * A point on a lobe section's ellipse at a lateral (−1..1 across the visible interval), or in the rim's plane
 * beyond it (|lateral| up to 1.6: the tongues). The normal blends to the design camera's direction from a
 * lateral of 0.7 to the rim, so a rim stroke faces the camera instead of turning edge on, and a tongue beyond
 * the rim is a flat flap facing it (E1). The normal shades only; the strip's frame and offset do not come from it.
 */
export function mapCypressLobeSurface(
  section: CypressLobeSection,
  sample: CypressLobeSurfaceSample,
  options: CypressLobeSolidOptions,
  frontFacing: boolean,
): CypressLobeSurfacePoint {
  const screenX = [Math.sin(options.bearing), 0, -Math.cos(options.bearing)] as const
  const viewDirection = [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const
  const projected = (sample.sourceX - options.sourceAnchor) * options.sourceToWorld
  const widthRadius = Math.max(0.002, section.sourceHalfWidth * options.sourceToWorld)
  const depthRadius = Math.max(0.002, widthRadius * options.depthRatio)
  const lateral = Math.min(1.6, Math.max(-1.6, sample.lateral))
  const depthUnit = Math.sqrt(Math.max(0, 1 - lateral * lateral))
  const facing = frontFacing ? 1 : -1
  const depth = depthUnit * depthRadius * facing
  const position = [
    screenX[0] * projected + viewDirection[0] * depth,
    sample.heightFraction * options.height,
    screenX[2] * projected + viewDirection[2] * depth,
  ] as const
  const normalAcross = lateral / widthRadius
  const normalDepth = (depthUnit * facing) / depthRadius
  const normalLength = Math.hypot(normalAcross, normalDepth) || 1
  const k = smoothstep(0.7, 1, Math.abs(lateral))
  const blendedX = ((screenX[0] * normalAcross + viewDirection[0] * normalDepth) / normalLength) * (1 - k) + viewDirection[0] * facing * k
  const blendedZ = ((screenX[2] * normalAcross + viewDirection[2] * normalDepth) / normalLength) * (1 - k) + viewDirection[2] * facing * k
  const blendedLength = Math.hypot(blendedX, blendedZ) || 1
  const normal = [blendedX / blendedLength, 0, blendedZ / blendedLength] as const
  return { position, normal }
}

/** The compiled rings grouped by lobe, in height order: the surface the solid's triangles span. */
export function ringsByLobe(solid: CypressLobeSolid): Map<string, CypressLobeRing[]> {
  const out = new Map<string, CypressLobeRing[]>()
  for (const ring of solid.rings) {
    const rings = out.get(ring.lobeId)
    if (rings) rings.push(ring)
    else out.set(ring.lobeId, [ring])
  }
  return out
}

/**
 * The section the compiled triangles interpolate at h: linear between the two rings that bracket it; null
 * outside the lobe's rings. The lift samples this, not the per-row section: between rings the solid is the
 * blend of its two ring ellipses, and a per-row section can be a notch narrower than that blend, which left a
 * strip "beyond the analytic rim" 0.029 under a compiled triangle (Codex F4, confirmation read).
 */
export function compiledSectionAt(rings: CypressLobeRing[], heightFraction: number): CypressLobeSection | null {
  if (rings.length === 0 || heightFraction < rings[0].heightFraction || heightFraction > rings[rings.length - 1].heightFraction) return null
  let low = 0
  let high = rings.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (rings[middle].heightFraction <= heightFraction) low = middle
    else high = middle
  }
  const a = rings[low].source
  const b = rings[high].source
  const span = rings[high].heightFraction - rings[low].heightFraction
  const t = span > 1e-9 ? (heightFraction - rings[low].heightFraction) / span : 0
  return {
    heightFraction,
    sourceCenter: a.sourceCenter + (b.sourceCenter - a.sourceCenter) * t,
    sourceHalfWidth: a.sourceHalfWidth + (b.sourceHalfWidth - a.sourceHalfWidth) * t,
    paintCenter: a.paintCenter + (b.paintCenter - a.paintCenter) * t,
    paintHalfWidth: a.paintHalfWidth + (b.paintHalfWidth - a.paintHalfWidth) * t,
  }
}

export type CypressLift = CypressLobeSurfacePoint & { lobeId: string; lateral: number }

/**
 * The frontmost compiled lobe surface under a crop point, or the nearest rim's plane within `maxOvershoot`
 * laterals beyond every lobe (the tongues), or null further out. A 2D path crossing from a frond into the main
 * takes the union's front surface, whose depth is continuous where the lobes overlap.
 */
export function liftToLobes(
  rings: Map<string, CypressLobeRing[]>,
  px: number,
  heightFraction: number,
  options: CypressLobeSolidOptions,
  frontFacing: boolean,
  maxOvershoot = 0.6,
): CypressLift | null {
  const viewDirection = [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const
  const facing = frontFacing ? 1 : -1
  let best: CypressLift | null = null
  let bestDepth = -Infinity
  let nearest: { lobeId: string; section: CypressLobeSection; lateral: number } | null = null
  let nearestOver = Infinity
  for (const [lobeId, lobeRings] of rings) {
    const section = compiledSectionAt(lobeRings, heightFraction)
    if (!section) continue
    const lateral = (px - section.sourceCenter) / Math.max(1e-6, section.sourceHalfWidth)
    if (Math.abs(lateral) <= 1) {
      const point = mapCypressLobeSurface(section, { heightFraction, lateral, sourceX: px }, options, frontFacing)
      const depth = facing * (point.position[0] * viewDirection[0] + point.position[2] * viewDirection[2])
      if (depth > bestDepth) {
        bestDepth = depth
        best = { ...point, lobeId, lateral }
      }
    } else if (Math.abs(lateral) - 1 < nearestOver) {
      nearestOver = Math.abs(lateral) - 1
      nearest = { lobeId, section, lateral }
    }
  }
  if (best) return best
  if (!nearest || nearestOver > maxOvershoot) return null
  const point = mapCypressLobeSurface(nearest.section, { heightFraction, lateral: nearest.lateral, sourceX: px }, options, frontFacing)
  return { ...point, lobeId: nearest.lobeId, lateral: nearest.lateral }
}

export type DrapedRibbon = {
  left: Vector3[]
  right: Vector3[]
  /** per kept sample: its height, the centre's |lateral| and lobe */
  kept: { h: number; lateral: number; lobeId: string }[]
}

/**
 * A ribbon's strip on the lobes' union: both edges and the centre lifted on their own per sample, offset toward
 * the camera along the view direction (continuous where the lift switches lobes; an offset along the normal
 * jumped 0.0026 there, Codex F5). The seed anchors the kept run: a sample that misses the lift below the seed
 * restarts the run, one above it ends it, so a strip is never joined across a gap. Null when fewer than three
 * samples survive.
 */
export function drapeRibbon(
  ribbon: CypressRibbon,
  edges: RibbonEdges,
  rings: Map<string, CypressLobeRing[]>,
  options: CypressLobeSolidOptions,
  frontFacing: boolean,
  offset: number,
): DrapedRibbon | null {
  const view = new Vector3(Math.cos(options.bearing), 0, Math.sin(options.bearing))
  const facing = frontFacing ? 1 : -1
  const seedIndex = ribbon.samples.indexOf(ribbon.seedSample)
  const left: Vector3[] = []
  const right: Vector3[] = []
  const kept: DrapedRibbon['kept'] = []
  for (let k = 0; k < ribbon.samples.length; k++) {
    const h = 1 - ribbon.samples[k].py
    const l = liftToLobes(rings, edges[k].left[0], 1 - edges[k].left[1], options, frontFacing)
    const r = liftToLobes(rings, edges[k].right[0], 1 - edges[k].right[1], options, frontFacing)
    const c = liftToLobes(rings, ribbon.samples[k].px, h, options, frontFacing)
    if (!l || !r || !c) {
      if (k < seedIndex) {
        left.length = 0
        right.length = 0
        kept.length = 0
        continue
      }
      break
    }
    left.push(new Vector3(...l.position).addScaledVector(view, facing * offset))
    right.push(new Vector3(...r.position).addScaledVector(view, facing * offset))
    kept.push({ h, lateral: Math.abs(c.lateral), lobeId: c.lobeId })
  }
  return kept.length >= 3 ? { left, right, kept } : null
}

/**
 * Compiles the source lobe hierarchy into one closed solid buffer.
 *
 * Each section is an ellipse in the design-camera frame: its screen-horizontal radius is the
 * source interval half-width, while its camera-depth radius is deliberately shallower. This makes
 * the design projection exact without falling back to a flat billboard. Lobes are closed and
 * overlap at their roots; they remain separate semantic ranges but batch into one BufferGeometry.
 */
export function buildCypressLobeSolid(
  plan: CypressLobePlan,
  provided: CypressLobeSolidOptions,
): CypressLobeSolid {
  const options = { ...DEFAULTS, ...provided }
  if (options.radialSegments < 4 || options.radialSegments % 2 !== 0) {
    throw new Error('cypress lobe radialSegments must be an even integer >= 4')
  }
  const positions: number[] = []
  const sourceUvs: number[] = []
  const indices: number[] = []
  const rings: CypressLobeRing[] = []
  const lobeRanges: CypressLobeSolid['lobeRanges'] = []
  const screenX = [Math.sin(options.bearing), 0, -Math.cos(options.bearing)] as const
  const viewDirection = [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const

  const pushPosition = (x: number, y: number, z: number, sourceU: number, sourceV: number) => {
    const index = positions.length / 3
    positions.push(x, y, z)
    sourceUvs.push(sourceU, sourceV)
    return index
  }

  for (const lobe of plan.lobes) {
    const firstVertex = positions.length / 3
    const startHeight = lobe.sections[0].heightFraction
    const endHeight = lobe.sections[lobe.sections.length - 1].heightFraction
    const sectionCount =
      lobe.kind === 'main'
        ? options.mainSections
        : Math.max(12, Math.ceil((endHeight - startHeight) * options.sectionsPerHeight))
    const lobeRings: CypressLobeRing[] = []

    for (let sectionIndex = 0; sectionIndex <= sectionCount; sectionIndex++) {
      const t = sectionIndex / sectionCount
      const heightFraction = startHeight + (endHeight - startHeight) * t
      const source = sampleCypressLobe(lobe, heightFraction)
      if (!source) throw new Error(`cypress lobe ${lobe.id} has a gap at ${heightFraction}`)
      const projectedCentre = (source.sourceCenter - options.sourceAnchor) * options.sourceToWorld
      const widthRadius = Math.max(0.002, source.sourceHalfWidth * options.sourceToWorld)
      const depthRadius = Math.max(0.002, widthRadius * options.depthRatio)
      const centreX = screenX[0] * projectedCentre
      const centreY = heightFraction * options.height
      const centreZ = screenX[2] * projectedCentre
      const vertexStart = positions.length / 3

      let seam: readonly [number, number, number] | null = null
      for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex++) {
        const angle = (radialIndex / options.radialSegments) * Math.PI * 2
        const across = Math.cos(angle) * widthRadius
        const depth = Math.sin(angle) * depthRadius
        const point = [
          centreX + screenX[0] * across + viewDirection[0] * depth,
          centreY,
          centreZ + screenX[2] * across + viewDirection[2] * depth,
        ] as const
        if (radialIndex === 0) seam = point
        const paintU = source.paintCenter + Math.cos(angle) * source.paintHalfWidth
        pushPosition(...point, paintU, 1 - heightFraction)
      }
      if (!seam) throw new Error('cypress lobe ring has no seam vertex')
      pushPosition(
        ...seam,
        source.paintCenter + source.paintHalfWidth,
        1 - heightFraction,
      )
      const ring = {
        lobeId: lobe.id,
        heightFraction,
        vertexStart,
        projectedLeft: projectedCentre - widthRadius,
        projectedRight: projectedCentre + widthRadius,
        source,
      }
      rings.push(ring)
      lobeRings.push(ring)
    }

    for (let ringIndex = 0; ringIndex < lobeRings.length - 1; ringIndex++) {
      const aStart = lobeRings[ringIndex].vertexStart
      const bStart = lobeRings[ringIndex + 1].vertexStart
      for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex++) {
        const a = aStart + radialIndex
        const b = a + 1
        const c = bStart + radialIndex
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    // Caps own duplicate rim vertices, so their normals do not smooth into the longitudinal skin.
    for (const [ring, top] of [
      [lobeRings[0], false],
      [lobeRings[lobeRings.length - 1], true],
    ] as const) {
      const duplicateStart = positions.length / 3
      let centreX = 0
      let centreY = 0
      let centreZ = 0
      for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex++) {
        const source = (ring.vertexStart + radialIndex) * 3
        const x = positions[source]
        const y = positions[source + 1]
        const z = positions[source + 2]
        const sourceUv = (ring.vertexStart + radialIndex) * 2
        pushPosition(x, y, z, sourceUvs[sourceUv], sourceUvs[sourceUv + 1])
        centreX += x
        centreY += y
        centreZ += z
      }
      const centre = pushPosition(
        centreX / options.radialSegments,
        centreY / options.radialSegments,
        centreZ / options.radialSegments,
        ring.source.paintCenter,
        1 - ring.heightFraction,
      )
      for (let radialIndex = 0; radialIndex < options.radialSegments; radialIndex++) {
        const current = duplicateStart + radialIndex
        const next = duplicateStart + ((radialIndex + 1) % options.radialSegments)
        if (top) indices.push(centre, current, next)
        else indices.push(centre, next, current)
      }
    }

    lobeRanges.push({
      lobeId: lobe.id,
      firstVertex,
      vertexCount: positions.length / 3 - firstVertex,
    })
  }

  return { positions, sourceUvs, indices, rings, lobeRanges }
}
