import { Color, Vector3 } from 'three'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { buildLandTrees, type BakedMass, type LandTrees } from './landDomes.ts'
import { PALETTE } from './palette.ts'
import { STREET_HOUSES, STREET_TREES, streetGroundAt } from './streetLayout.ts'
import type { ImageData2D } from './useImageData.ts'

export type StreetCounts = {
  ribbons: number
  triangles: number
  builds: number
}

export type StreetBuild = {
  underpaint: BrushArrays
  strokes: { arrays: BrushArrays; stroke: number[]; seed: number[] }
  outlines: { arrays: BrushArrays; stroke: number[]; seed: number[] }
  windows: BrushArrays
  trees: LandTrees
  counts: StreetCounts
}

let buildCounter = 0

function polygon(a: BrushArrays, vertices: Vector3[], colour: Color): void {
  const start = a.positions.length / 3
  for (const p of vertices) {
    a.positions.push(p.x, p.y, p.z)
    a.colors.push(colour.r, colour.g, colour.b)
  }
  for (let i = 1; i < vertices.length - 1; i++) {
    a.indices.push(start, start + i, start + i + 1)
  }
}

/**
 * Builds the street geometry. Stub for Task 4: houses as plain underpaint boxes.
 * Task 5 replaces the body with stroked faces, outlines and underpaint.
 */
export function buildStreet(
  painting: ImageData2D | null,
  flow: ImageData2D | null,
  masses: BakedMass[] | null,
): StreetBuild | null {
  if (!painting || !flow || !masses) return null

  buildCounter++
  const underpaint = makeBrushArrays()
  const wallColour = new Color(PALETTE.house)
  const roofColour = new Color(PALETTE.roof)

  for (const house of STREET_HOUSES) {
    const c = Math.cos(house.yaw)
    const s = Math.sin(house.yaw)
    const corner = (x: number, z: number, y: number) =>
      new Vector3(house.x + x * c - z * s, y, house.z + x * s + z * c)

    const floor = 0
    const eave = house.eave
    const ridgeY = eave + house.pitch

    const bottom = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) =>
      corner((x * house.w) / 2, (z * house.d) / 2, floor),
    )
    const top = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) =>
      corner((x * house.w) / 2, (z * house.d) / 2, eave),
    )
    const ridgeFront = corner(0, house.d / 2, ridgeY)
    const ridgeBack = corner(0, -house.d / 2, ridgeY)

    // 4 walls
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      polygon(underpaint, [bottom[i], bottom[j], top[j], top[i]], wallColour)
    }
    // Gables
    polygon(underpaint, [top[0], top[1], ridgeFront], wallColour)
    polygon(underpaint, [top[2], top[3], ridgeBack], wallColour)
    // Roof pitches
    polygon(underpaint, [top[3], top[0], ridgeFront, ridgeBack], roofColour)
    polygon(underpaint, [top[1], top[2], ridgeBack, ridgeFront], roofColour)
  }

  const trees = buildLandTrees(flow, painting, masses, 0x7ee5, STREET_TREES, streetGroundAt)
  const strokes = { arrays: makeBrushArrays(), stroke: [], seed: [] }
  const outlines = { arrays: makeBrushArrays(), stroke: [], seed: [] }
  const windows = makeBrushArrays()

  const treeTriangles =
    trees.solid.indices.length / 3 + trees.strokes.indices.length / 3
  const triangles = underpaint.indices.length / 3 + treeTriangles

  return {
    underpaint,
    strokes,
    outlines,
    windows,
    trees,
    counts: {
      ribbons: 0,
      triangles,
      builds: buildCounter,
    },
  }
}
