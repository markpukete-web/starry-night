import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { makeBrushArrays, pushBrushRibbon, type BrushArrays } from './brushForms'
import { islandHeightAt } from './islandShape'
import { PALETTE } from './palette'
import atlas from './village-study-atlas.json'
import { VILLAGE_STUDY_PATCHES, type VillagePatchName } from './villageStudyPatches'

// The church and four neighbours are authored as one knot. Axes and relative heights come
// from painting.jpg's full lower village, not the old crop ending halfway through the town.
// This is a DEV study, not a replacement for the accepted foreground.
type Face = readonly [Vector3, Vector3, Vector3, Vector3]
type Pigment = 'wall' | 'pale' | 'roof' | 'sienna' | 'striped'
type SkinArrays = BrushArrays & { uv: number[] }
type Building = {
  x: number; z: number; w: number; d: number; eave: number; pitch: number; yaw: number
  wall: Pigment; roof: Pigment; window?: 'front' | 'side'; door?: boolean; chimney?: boolean
  wallPatch: VillagePatchName; roofPatch: VillagePatchName
}

const INK = new Color(PALETTE.ground)
const BLUE = new Color(PALETTE.house)
const PALE = new Color(PALETTE.steeple)
const GREEN = new Color(PALETTE.villageCool)
const OCHRE = new Color(PALETTE.windowOchre)
const SIENNA = new Color(PALETTE.roofSienna)
const ROOF = new Color(PALETTE.roof)

const NEIGHBOURS: Building[] = [
  { x: -0.34, z: 0.42, w: 0.21, d: 0.27, eave: 0.18, pitch: 0.14, yaw: 0.58,
    wall: 'pale', roof: 'roof', wallPatch: 'paleLeft', roofPatch: 'quietRoof', door: true },
  { x: -0.66, z: 0.65, w: 0.28, d: 0.34, eave: 0.14, pitch: 0.115, yaw: 1.28,
    wall: 'wall', roof: 'sienna', wallPatch: 'blueWallA', roofPatch: 'siennaRoof', window: 'side' },
  { x: 0.39, z: 0.90, w: 0.31, d: 0.46, eave: 0.15, pitch: 0.155, yaw: 1.44,
    wall: 'wall', roof: 'striped', wallPatch: 'blueWallB', roofPatch: 'stripedRoof', window: 'side' },
  { x: 0.38, z: 0.43, w: 0.22, d: 0.29, eave: 0.22, pitch: 0.14, yaw: -0.26,
    wall: 'wall', roof: 'roof', wallPatch: 'blueWallC', roofPatch: 'blueRoof', chimney: true, window: 'front' },
]

function geometry(a: BrushArrays | SkinArrays): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(a.positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(a.colors), 3))
  if ('uv' in a) g.setAttribute('uv', new BufferAttribute(new Float32Array(a.uv), 2))
  g.setIndex(a.indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

function normal(f: Face): Vector3 {
  return f[1].clone().sub(f[0]).cross(f[3].clone().sub(f[0])).normalize()
}

function point(f: Face, u: number, v: number, lift = 0): Vector3 {
  return f[0].clone().lerp(f[1], u).lerp(f[3].clone().lerp(f[2], u), v)
    .addScaledVector(normal(f), lift)
}

function polygon(a: BrushArrays, vertices: Vector3[], colour: Color): void {
  const start = a.positions.length / 3
  for (const p of vertices) {
    a.positions.push(p.x, p.y, p.z)
    a.colors.push(colour.r, colour.g, colour.b)
  }
  for (let i = 1; i < vertices.length - 1; i++) a.indices.push(start, start + i, start + i + 1)
}

function pigment(kind: Pigment): Color {
  if (kind === 'pale') return PALE.clone().multiplyScalar(0.96)
  if (kind === 'sienna') return SIENNA.clone().multiplyScalar(1.22)
  if (kind === 'roof' || kind === 'striped') return ROOF.clone().lerp(BLUE, 0.22)
  return BLUE.clone().lerp(INK, 0.27)
}

// Paint a narrow, imperfect strip in the FACE'S coordinates. Both edges are mapped through
// the same bilinear face, so even a triangular gable cannot sprout marks outside its silhouette.
// Constant pigment down each mark avoids the repeated dark-tipped scales of pushBrush.
function mark(
  arr: BrushArrays, f: Face, along: 'u' | 'v', from: number, to: number,
  across: number, halfWidth: number, col: Color, bend = 0, lift = 0.0025,
): void {
  const start = arr.positions.length / 3
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const s = from + (to - from) * t
    const offset = bend * Math.sin(t * Math.PI)
    const taper = i === 0 || i === steps ? 0.52 : 1
    for (const side of [-1, 1]) {
      const cross = Math.max(0.012, Math.min(0.988, across + offset + side * halfWidth * taper))
      const p = along === 'u' ? point(f, s, cross, lift) : point(f, cross, s, lift)
      arr.positions.push(p.x, p.y, p.z)
      arr.colors.push(col.r, col.g, col.b)
    }
  }
  for (let i = 0; i < steps; i++) {
    const j = start + i * 2
    arr.indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2)
  }
}

function paintFace(solid: BrushArrays, skin: SkinArrays,
  face: Face, kind: Pigment, patch: VillagePatchName, shade = 1): void {
  const base = pigment(kind).multiplyScalar(shade)
  const pixels = VILLAGE_STUDY_PATCHES[patch]
  const sourceWidth = Math.hypot(pixels[1][0] - pixels[0][0], pixels[1][1] - pixels[0][1])
  // These narrow plaster/roof samples otherwise stretch each dab 4–6 times along an eave.
  // The locked home camera gives about 189 px/unit. Alternate mirrored tiles at that paint scale.
  const repeats = ['churchRoof', 'churchPlaster', 'paleLeft'].includes(patch)
    ? Math.max(1, Math.round(face[0].distanceTo(face[1]) * 189 / sourceWidth)) : 1
  for (let tile = 0; tile < repeats; tile++) {
    const left = tile / repeats, right = (tile + 1) / repeats
    const f: Face = [point(face, left, 0), point(face, right, 0), point(face, right, 1), point(face, left, 1)]
    const corners = atlas.patches[patch].map(p => [...p])
    if (tile % 2) [corners[0], corners[1], corners[2], corners[3]] = [corners[1], corners[0], corners[3], corners[2]]
    if (f[2].distanceToSquared(f[3]) < 1e-10) {
      corners[2] = [(corners[2][0] + corners[3][0]) / 2, (corners[2][1] + corners[3][1]) / 2]
      corners[3] = corners[2]
    }
    // Bilinear subdivision keeps skewed source quads from creasing along a two-triangle diagonal.
    const start = skin.positions.length / 3, solidStart = solid.positions.length / 3, steps = 6
    for (let row = 0; row <= steps; row++) for (let col = 0; col <= steps; col++) {
      const u = col / steps, v = row / steps
      const p = point(f, u, v, 0.0012)
      // The underpaint must use this same bilinear grid. Two flat triangles can pierce a
      // slightly twisted authored roof even when the textured surface is lifted above it.
      const under = point(f, u, v)
      solid.positions.push(under.x, under.y, under.z)
      solid.colors.push(base.r, base.g, base.b)
      skin.positions.push(p.x, p.y, p.z)
      skin.colors.push(shade, shade, shade)
      for (let axis = 0; axis < 2; axis++) {
        const lower = corners[0][axis] * (1 - u) + corners[1][axis] * u
        const upper = corners[3][axis] * (1 - u) + corners[2][axis] * u
        skin.uv.push(lower * (1 - v) + upper * v)
      }
    }
    for (let row = 0; row < steps; row++) for (let col = 0; col < steps; col++) {
      const a = start + row * (steps + 1) + col, b = a + steps + 1
      skin.indices.push(a, a + 1, b + 1, a, b + 1, b)
      const sa = solidStart + row * (steps + 1) + col, sb = sa + steps + 1
      solid.indices.push(sa, sa + 1, sb + 1, sa, sb + 1, sb)
    }
  }
}

function edge(paint: BrushArrays, a: Vector3, b: Vector3, n: Vector3, width = 0.008): void {
  const p = [0.02, 0.33, 0.67, 0.98].map(t => a.clone().lerp(b, t).addScaledVector(n, 0.004))
  pushBrushRibbon(paint, p, p.map(() => n), p.map(() => INK), width, 0.25)
}

function opening(paint: BrushArrays, f: Face, u: number, v: number, width: number, height: number, lit = false): void {
  const coords = [
    [u - width / 2, v - height / 2], [u + width / 2, v - height / 2],
    [u + width / 2, v + height * 0.3], [u, v + height / 2], [u - width / 2, v + height * 0.3],
  ]
  polygon(paint, coords.map(([s, t]) => point(f, s, t, 0.007)), INK.clone().multiplyScalar(0.7))
  if (lit) {
    mark(paint, f, 'v', v - height * 0.37, v + height * 0.28, u - width * 0.1, width * 0.22,
      OCHRE.clone().multiplyScalar(1.25), 0, 0.009)
  }
}

function building(solid: BrushArrays, skin: SkinArrays, paint: BrushArrays, b: Building): void {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw)
  const corner = (x: number, z: number, y: number) => new Vector3(b.x + x * c - z * s, y, b.z + x * s + z * c)
  const footprint = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) => corner(x * b.w / 2, z * b.d / 2, 0))
  const floor = Math.min(...footprint.map(p => islandHeightAt(p.x, p.z))) - 0.025
  const eave = Math.max(floor + b.eave, ...footprint.map(p => islandHeightAt(p.x, p.z) + 0.08))
  const bottom = footprint.map(p => p.clone().setY(floor))
  const top = footprint.map(p => p.clone().setY(eave))
  const ridgeFront = corner(-b.w * 0.035, b.d / 2, eave + b.pitch)
  const ridgeBack = corner(b.w * 0.025, -b.d / 2, eave + b.pitch * 0.96)
  const walls: Face[] = [
    [bottom[0], bottom[1], top[1], top[0]], [bottom[1], bottom[2], top[2], top[1]],
    [bottom[2], bottom[3], top[3], top[2]], [bottom[3], bottom[0], top[0], top[3]],
  ]
  walls.forEach((f, i) => paintFace(solid, skin, f, b.wall, b.wallPatch, [1, 0.88, 0.78, 0.86][i]))
  polygon(solid, [bottom[3], bottom[2], bottom[1], bottom[0]], INK)
  const front: Face = [top[0], top[1], ridgeFront, ridgeFront]
  const back: Face = [top[2], top[3], ridgeBack, ridgeBack]
  paintFace(solid, skin, front, b.wall, b.wallPatch)
  paintFace(solid, skin, back, b.wall, b.wallPatch, 0.78)
  const left: Face = [top[3], top[0], ridgeFront, ridgeBack]
  const right: Face = [top[1], top[2], ridgeBack, ridgeFront]
  paintFace(solid, skin, left, b.roof, b.roofPatch, 0.92)
  paintFace(solid, skin, right, b.roof, b.roofPatch)
  for (let i = 0; i < 4; i++) {
    edge(paint, top[i], top[(i + 1) % 4], normal(walls[i]), 0.006)
    edge(paint, bottom[i], top[i], normal(walls[i]), 0.004)
  }
  edge(paint, top[0], ridgeFront, normal(front))
  edge(paint, top[1], ridgeFront, normal(front))
  edge(paint, top[2], ridgeBack, normal(back))
  edge(paint, top[3], ridgeBack, normal(back))
  edge(paint, ridgeFront, ridgeBack, new Vector3(0, 1, 0), 0.008)
  if (b.door) opening(paint, walls[0], 0.49, 0.38, 0.18, 0.7)
  if (b.window) {
    const f = walls[b.window === 'front' ? 0 : 1]
    opening(paint, f, 0.32, 0.57, 0.12, 0.3, true)
    opening(paint, f, 0.7, 0.56, 0.09, 0.26, b.roof === 'striped')
  }
  if (b.chimney) {
    const p = corner(b.w * 0.18, -b.d * 0.22, eave + b.pitch * 0.68)
    const f: Face = [p, p.clone().add(new Vector3(0.035, 0, 0)), p.clone().add(new Vector3(0.035, 0.1, 0)), p.clone().add(new Vector3(0, 0.096, 0))]
    // A real small box, not a camera-facing chimney card.
    const backFace = f.map(v => v.clone().add(new Vector3(0, 0, -0.038))) as unknown as Face
    polygon(solid, [...f], INK)
    polygon(solid, [...backFace].reverse(), INK)
    for (let i = 0; i < 4; i++) polygon(solid, [f[i], backFace[i], backFace[(i + 1) % 4], f[(i + 1) % 4]], INK)
  }
}

function church(solid: BrushArrays, skin: SkinArrays, paint: BrushArrays): void {
  building(solid, skin, paint, {
    x: -0.036, z: 0.37, w: 0.26, d: 0.31, eave: 0.24, pitch: 0.185, yaw: 0.65,
    wall: 'pale', roof: 'roof', wallPatch: 'churchPlaster', roofPatch: 'churchRoof', door: true,
  })
  // The belfry sits at the far end of the nave, to the right in the design view.
  const cx = 0.066, cz = 0.235, width = 0.09, yaw = 0.65
  const floor = islandHeightAt(cx, cz) - 0.035
  const topY = 0.445
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) =>
    new Vector3(cx + (x * Math.cos(yaw) - z * Math.sin(yaw)) * width / 2, floor,
      cz + (x * Math.sin(yaw) + z * Math.cos(yaw)) * width / 2))
  const top = corners.map(p => p.clone().setY(topY))
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    const f: Face = [corners[i], corners[j], top[j], top[i]]
    paintFace(solid, skin, f, 'pale', 'churchPlaster', i === 1 ? 0.82 : 1)
    opening(paint, f, 0.5, 0.82, 0.32, 0.2)
    edge(paint, top[i], top[j], normal(f), 0.008)
    edge(paint, corners[i], top[i], normal(f), 0.004)
  }
  polygon(solid, [...corners].reverse(), INK)
  const tip = new Vector3(cx - 0.012, 1.125, cz - 0.008)
  for (let i = 0; i < 4; i++) {
    const f: Face = [top[i], top[(i + 1) % 4], tip, tip]
    paintFace(solid, skin, f, 'pale', 'spire', i === 1 ? 0.82 : 1)
    edge(paint, top[i], tip, normal(f), 0.004)
  }
}

// Retain the back band. Mark rejected the front mass on 2026-10-05: its raised,
// pale canopy read as a hill and hid the church base. Leave that space open for this study.
const TREES = [
  { x: 0.31, z: 0.12, rx: 0.55, rz: 0.20, h: 0.25 },
]

function trees(solid: BrushArrays, paint: BrushArrays, rng: () => number): void {
  for (const tree of TREES) {
    const { x, z, rx, rz, h } = tree
    const surface = (radius: number, theta: number) => {
      const boundary = 1 + 0.09 * Math.sin(theta * 3 + x) + 0.055 * Math.sin(theta * 7)
      const dx = Math.cos(theta) * radius * rx * boundary
      const dz = Math.sin(theta) * radius * rz * boundary
      const crest = 0.85 + 0.12 * Math.cos(dx / rx * 4.5 + 0.4) + 0.1 * Math.sin(theta * 2) * radius
      // The whole skirt follows the actual terrain; centre-only seating left the downhill rim aloft.
      const ground = islandHeightAt(x + dx, z + dz) - 0.025
      return new Vector3(x + dx, ground + h * Math.pow(Math.max(0, 1 - radius * radius), 0.62) * crest, z + dz)
    }
    const nrm = (radius: number, theta: number) => {
      const p = surface(radius, theta)
      const out = surface(radius + 0.002, theta).sub(p)
      const around = surface(radius, theta + 0.002).sub(p)
      return around.cross(out).normalize()
    }
    for (let r = 0; r < 32; r++) for (let s = 0; s < 80; s++) {
      const a = r / 32, b = (r + 1) / 32
      const u = s / 80 * Math.PI * 2, v = (s + 1) / 80 * Math.PI * 2
      polygon(solid, [surface(a, u), surface(b, u), surface(b, v), surface(a, v)], GREEN.clone().lerp(BLUE, 0.1).lerp(INK, 0.12 + a * 0.38))
    }
    // Close the buried skirt so the object stays a solid from a low orbit.
    polygon(solid, Array.from({ length: 80 }, (_, i) => surface(1, -i / 80 * Math.PI * 2)), INK)
    for (let i = 0; i < 180; i++) {
      const theta = rng() * Math.PI * 2
      const radius = 0.30 + Math.sqrt(rng()) * 0.62
      const arc = 0.3 + rng() * 0.3
      const col = GREEN.clone().lerp(BLUE, 0.08 + rng() * 0.15).multiplyScalar(1.1 + rng() * 0.55)
      // Pale tree paint uses the same swatch, lifted 2.2× in sRGB to match the reference crescents.
      if (i % 4 === 1) col.copy(BLUE).multiplyScalar(1.9) // distinct ultramarine, derived swatch × linear lift
      else if (i % 5 === 0) col.copy(GREEN).convertLinearToSRGB().multiplyScalar(2.2).convertSRGBToLinear()
      else if (i % 7 === 0) col.copy(INK)
      const width = 0.035 + rng() * 0.015
      const lift = 0.006 + rng() * 0.004 // broad overlapping marks need separate, deterministic paint layers
      const start = paint.positions.length / 3, steps = 12
      for (let j = 0; j <= steps; j++) {
        const t = j / steps
        const q = radius - 0.095 * Math.sin(t * Math.PI)
        const angle = theta + (t - 0.5) * arc
        const radialScale = surface(q + 0.002, angle).distanceTo(surface(q - 0.002, angle)) / 0.004
        const halfWidth = width * (0.28 + 0.22 * Math.sin(t * Math.PI)) / radialScale
        for (const side of [-1, 1]) {
          const r = Math.max(0.03, Math.min(0.97, q + side * halfWidth))
          // Both width edges follow the curved surface; a tangent-plane ribbon cuts into troughs.
          const p = surface(r, angle).addScaledVector(nrm(r, angle), lift)
          paint.positions.push(p.x, p.y, p.z)
          paint.colors.push(col.r, col.g, col.b)
        }
      }
      for (let j = 0; j < steps; j++) {
        const a = start + j * 2
        paint.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
}

export function buildVillageStudy() {
  const solid = makeBrushArrays(), paint = makeBrushArrays()
  const skin: SkinArrays = { ...makeBrushArrays(), uv: [] }
  const rng = mulberry32(0x1005_1889)
  NEIGHBOURS.forEach(b => building(solid, skin, paint, b))
  church(solid, skin, paint)
  trees(solid, paint, rng)
  return { solid: geometry(solid), paint: geometry(paint), skin: geometry(skin) }
}
