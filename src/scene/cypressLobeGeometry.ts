import {
  sampleCypressLobe,
  type CypressLobePlan,
  type CypressLobeSection,
} from './cypressLobes.ts'

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
  indices: number[]
  rings: CypressLobeRing[]
  lobeRanges: { lobeId: string; firstVertex: number; vertexCount: number }[]
}

const DEFAULTS: Omit<CypressLobeSolidOptions, 'bearing' | 'height' | 'sourceToWorld' | 'sourceAnchor'> = {
  radialSegments: 12,
  mainSections: 96,
  sectionsPerHeight: 72,
  depthRatio: 0.42,
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
  const indices: number[] = []
  const rings: CypressLobeRing[] = []
  const lobeRanges: CypressLobeSolid['lobeRanges'] = []
  const screenX = [-Math.sin(options.bearing), 0, Math.cos(options.bearing)] as const
  const viewDirection = [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const
  const ringSize = options.radialSegments + 1

  const pushPosition = (x: number, y: number, z: number) => {
    const index = positions.length / 3
    positions.push(x, y, z)
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
        pushPosition(...point)
      }
      if (!seam) throw new Error('cypress lobe ring has no seam vertex')
      pushPosition(...seam)
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
        pushPosition(x, y, z)
        centreX += x
        centreY += y
        centreZ += z
      }
      const centre = pushPosition(
        centreX / options.radialSegments,
        centreY / options.radialSegments,
        centreZ / options.radialSegments,
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

  return { positions, indices, rings, lobeRanges }
}
