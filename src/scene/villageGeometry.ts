import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { makeBrushArrays, pushBrushRibbon, type BrushArrays } from './brushForms'
import { islandHeightAt } from './islandShape'
import { PALETTE } from './palette'
import atlas from './village-atlas.json'
import { VILLAGE_PATCHES, type VillagePatchName } from './villagePatches'

// The church and four neighbours are authored as one knot. Axes and relative heights come
// from painting.jpg's full lower village, not the old crop ending halfway through the town.
// Three context houses and four foliage rows complete the village in the same medium.
// Developed as a DEV study (tasks/2026-10-05-village-*.md, 2026-10-06-village-context.md).
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

// The three houses that stayed procedural beside the knot until C1 (old BrushVillage houses 3, 4, 6),
// painted from the matching part of the painting's village. The old footprints interpenetrated
// their neighbours behind uniform dark paint, so each moved to clear every footprint by ≥0.02
// (scratch/village-context-2026-10-06/clearance). Built after the church so the approved R5/F2
// buffers stay an exact prefix.
const CONTEXT: Building[] = [
  { x: 0.77, z: 0.585, w: 0.28, d: 0.26, eave: 0.2, pitch: 0.14, yaw: -0.3,
    wall: 'wall', roof: 'roof', wallPatch: 'blueWallD', roofPatch: 'navyRoofRight', window: 'front' },
  { x: 1.1, z: 0.415, w: 0.3, d: 0.26, eave: 0.22, pitch: 0.14, yaw: 0.32,
    wall: 'pale', roof: 'roof', wallPatch: 'paleLeft', roofPatch: 'brownRoof', window: 'front' },
  { x: -0.86, z: 0.35, w: 0.3, d: 0.26, eave: 0.2, pitch: 0.14, yaw: 0.1,
    wall: 'wall', roof: 'roof', wallPatch: 'blueWallLeft', roofPatch: 'blueRoofLeft', window: 'front' },
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
  const pixels = VILLAGE_PATCHES[patch]
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

// Traced crest and lower edge of the dark front row in the 1600×1267 source painting.
// The rising lower edge on the right excludes the neighbouring pale roof.
const FRONT_ROW = [
  [742, 1137, 1141], [745, 1128, 1142], [748, 1120, 1142], [753, 1113, 1142],
  [758, 1110, 1142], [765, 1108, 1142], [773, 1110, 1142], [779, 1115, 1142],
  [785, 1112, 1142], [792, 1108, 1142], [798, 1107, 1141], [804, 1109, 1140],
  [810, 1112, 1138], [817, 1111, 1134], [823, 1115, 1131], [829, 1121, 1127],
]

// Back crown row: four-pixel stations retain its pale curling crest.
const BACK_ROW = [
  [1004, 991, 998], [1008, 983, 1000], [1012, 979, 1001], [1016, 977, 1001],
  [1020, 976, 1001], [1024, 974, 1002], [1028, 976, 1002], [1032, 974, 1002],
  [1036, 972, 1001], [1040, 972, 1001], [1044, 974, 1001], [1048, 977, 1000],
  [1052, 976, 1000], [1056, 978, 999], [1060, 975, 999], [1064, 975, 998],
  [1068, 972, 997], [1072, 970, 996], [1076, 972, 995], [1080, 968, 995],
  [1084, 964, 995], [1088, 962, 995], [1092, 962, 995], [1096, 959, 996],
  [1100, 957, 997], [1104, 954, 997], [1108, 955, 998], [1112, 955, 999],
  [1116, 956, 1000], [1120, 957, 1001], [1124, 960, 1002], [1128, 960, 1003],
  [1132, 963, 1003], [1136, 965, 1004], [1140, 969, 1005], [1144, 968, 1007],
  [1148, 970, 1008], [1152, 974, 1010], [1156, 974, 1011], [1160, 976, 1012],
  [1164, 975, 1013], [1168, 974, 1014], [1172, 972, 1015], [1176, 972, 1015],
  [1180, 972, 1016], [1184, 974, 1016], [1188, 976, 1016], [1192, 977, 1017],
  [1196, 977, 1017], [1200, 984, 1017], [1204, 993, 1017], [1208, 1003, 1017],
  [1212, 1011, 1017],
]

// C1 context rows, traced like BACK_ROW: the round mass in the right village and the teal curls
// between the cypress and the left houses. They replace the old procedural bushes 0, 1, 5, 6;
// LEFT stands where bush 1 fronted the cypress foot, clear of the lobe solid.
const RIGHT_ROW = [
  [1182, 1136, 1170], [1186, 1129, 1170], [1190, 1126, 1170], [1195, 1123, 1170],
  [1200, 1121, 1170], [1205, 1120, 1170], [1210, 1119, 1170], [1215, 1119, 1170],
  [1220, 1118, 1170], [1225, 1118, 1170], [1230, 1119, 1170], [1235, 1121, 1170],
  [1240, 1124, 1170], [1245, 1128, 1170], [1250, 1132, 1170], [1255, 1135, 1170],
  [1260, 1138, 1170], [1265, 1141, 1170], [1270, 1144, 1170], [1275, 1150, 1170],
  [1279, 1158, 1170],
]
const LEFT_ROW = [
  [685, 1098, 1118], [690, 1092, 1120], [695, 1089, 1124], [700, 1088, 1127],
  [705, 1088, 1128], [710, 1088, 1129], [715, 1089, 1130], [720, 1090, 1130],
  [725, 1091, 1130], [730, 1093, 1130], [735, 1096, 1130], [740, 1100, 1130],
  [745, 1105, 1130],
]

// Source span (sx0, sw) maps to world x0 + xw·u; the front face bows forward by `bow`.
// FRONT keeps F1's literal, non-isotropic values and back-face UVs so its buffers stay exact.
type Row = {
  stations: number[][]; sx0: number; sw: number; x0: number; xw: number; z0: number; bow: number
  scale: number; maxHeight: number; legacyFrontUV?: boolean
}
const ROWS: Row[] = [
  { stations: FRONT_ROW, sx0: 742, sw: 87, x0: -0.57, xw: 0.44, z0: 0.94, bow: 0.015,
    scale: 0.0038, maxHeight: 0.1292, legacyFrontUV: true },
  { stations: BACK_ROW, sx0: 1004, sw: 208, x0: -0.18, xw: 1.2, z0: 0.22, bow: 0.02,
    scale: 1.2 / 208, maxHeight: 44 * (1.2 / 208) },
  { stations: RIGHT_ROW, sx0: 1182, sw: 97, x0: 1.32, xw: 97 * 0.0036, z0: 0.5, bow: 0.015,
    scale: 0.0036, maxHeight: 52 * 0.0036 },
  { stations: LEFT_ROW, sx0: 685, sw: 60, x0: -1.36, xw: 60 * 0.0045, z0: 0.95, bow: 0.015,
    scale: 0.0045, maxHeight: 42 * 0.0045 },
]

function foliageRow(foliage: SkinArrays, row: Row): void {
  const { scale, maxHeight } = row
  const face = (vertices: Vector3[], pixels: number[][], shade: number) => {
    polygon(foliage, vertices, new Color(shade, shade, shade))
    // Match Cypress: pixel indices, flipY=false; no second V inversion.
    for (const [x, y] of pixels) foliage.uv.push(x / 1599, y / 1266)
  }
  const stations = row.stations.map(([sx, crest, base]) => {
    const u = (sx - row.sx0) / row.sw
    const x = row.x0 + row.xw * u
    const z = row.z0 + row.bow * Math.sin(Math.PI * u)
    const ground = islandHeightAt(x, z), h = (base - crest) * scale, depth = h / maxHeight * 0.10
    const topZ = z - h * Math.tan(Math.PI / 12), backGround = islandHeightAt(x, z - depth)
    return {
      sx, crest, base, u, h, depth,
      bf: new Vector3(x, ground - 0.018, z),
      tf: new Vector3(x, ground + h, topZ),
      bb: new Vector3(x, backGround - 0.018, z - depth),
      tb: new Vector3(x, Math.max(backGround - 0.016, ground + h - 0.008), topZ - depth),
    }
  })
  const backUV = (s: typeof stations[number], top: boolean) =>
    row.legacyFrontUV ? [681 + 59 * s.u, 1140 - (top ? s.h / 0.1292 * 32 : 0)]
      : [s.sx, s.crest + (s.base - s.crest) * (top ? 0.30 : 0.95)]
  const [topFrom, topTo] = row.legacyFrontUV ? [0.25, 0.75] : [0.30, 0.70]
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i], b = stations[i + 1]
    face([a.bf, b.bf, b.tf, a.tf],
      [[a.sx, a.base], [b.sx, b.base], [b.sx, b.crest], [a.sx, a.crest]], 1)
    // Short, separately sampled top strip; the front image never wraps over the crest.
    const topUV = (s: typeof a, t: number) => [s.sx, s.crest + (s.base - s.crest) * t]
    face([a.tf, b.tf, b.tb, a.tb], [topUV(a, topFrom), topUV(b, topFrom), topUV(b, topTo), topUV(a, topTo)], 0.88)
    face([b.bb, a.bb, a.tb, b.tb], [backUV(b, false), backUV(a, false), backUV(a, true), backUV(b, true)], 0.75)
    face([a.bb, b.bb, b.bf, a.bf], [topUV(a, 0.6), topUV(b, 0.6), topUV(b, 0.8), topUV(a, 0.8)], 0.7)
  }
  const endUV = (s: typeof stations[number]) => {
    const right = 760 + 18 * s.depth / 0.10, top = 1140 - 26 * s.h / maxHeight
    return [[760, 1140], [760, top], [right, top], [right, 1140]]
  }
  const left = stations[0], right = stations[stations.length - 1]
  face([left.bf, left.tf, left.tb, left.bb], endUV(left), 0.82)
  const rightUV = endUV(right)
  face([right.bf, right.bb, right.tb, right.tf], [rightUV[0], rightUV[3], rightUV[2], rightUV[1]], 0.82)
}

export function buildVillage() {
  const solid = makeBrushArrays(), paint = makeBrushArrays()
  const skin: SkinArrays = { ...makeBrushArrays(), uv: [] }
  const foliage: SkinArrays = { ...makeBrushArrays(), uv: [] }
  NEIGHBOURS.forEach(b => building(solid, skin, paint, b))
  church(solid, skin, paint)
  CONTEXT.forEach(b => building(solid, skin, paint, b))
  ROWS.forEach(row => foliageRow(foliage, row))
  return { solid: geometry(solid), paint: geometry(paint), skin: geometry(skin), foliage: geometry(foliage) }
}
