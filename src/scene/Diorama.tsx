import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  Vector3,
} from 'three'
import { PALETTE } from './palette'
import { makeRidgeStones, makeTerrainBlades } from './dioramaLayout'
import { SourceCypress } from './SourceCypress'

/**
 * Phase 1 (3D) — the Starry Night diorama as real forms: a lathe cypress, gable-roofed village
 * with a church + steeple, rolling hills, on a floating island of earth. Surface colours are sourced
 * from the derived palette (palette.json, via PALETTE); the lit windows are emissive light, not
 * surface.
 */

const C = {
  ground: PALETTE.ground,
  hills: PALETTE.hills,
  house: PALETTE.house,
  roof: PALETTE.roof,
  steeple: PALETTE.steeple,
  window: '#f6c651', // lit window — emissive light, not a painted surface
  cypress: PALETTE.cypress,
}

// The church is the pale focal point of the village: the derived steeple blue (PALETTE.steeple
// #556c81) lifted toward moonlight so it stands out against the dark hills, as in the painting. A
// documented artistic lift, kept provably sampled from palette.json; the factors are fit to reproduce
// the prior hand-tuned hue (ΔE < 1), so this is provenance, not a retune.
const WHITE = new Color('#ffffff')
const CHURCH_PALE = new Color(PALETTE.steeple).multiplyScalar(1.45).lerp(WHITE, 0.14) // ≈ #8b9bad
const CHURCH_TIP = new Color(PALETTE.steeple).multiplyScalar(1.77).lerp(WHITE, 0.26) // ≈ #a6b4c4

type Vec3 = [number, number, number]

// --- deterministic value noise (stable across React rerenders; no Math.random) ---
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/**
 * The diorama's floating landmass. A radial-grid surface: an organic, gently rolling top (the ground
 * the village/cypress/hills stand on, rising toward the back) that wraps over an irregular coastline
 * and plunges into a rocky earthen root. Vertex colours fade the root to near-black so the island
 * reads as land dissolving into the night, not a slab hovering in a void. Earth tones are derived
 * from the palette (hills region).
 */
function FloatingIsland() {
  const geo = useMemo(() => {
    const SEG = 100 // segments around
    const RT = 12 // rings: centre → coast (top)
    const RS = 10 // rings: coast → root tip (side)
    const RX = 1.95 // footprint half-extent, x
    const RZ = 1.25 // footprint half-extent, z
    const DEPTH = 1.75 // root depth below the rim

    const rows = RT + RS + 1
    const cols = SEG + 1
    const pos = new Float32Array(rows * cols * 3)
    const col = new Float32Array(rows * cols * 3)

    // the whole island is the derived hills earth across a night range: shaded crevices, lifted
    // moonlit ridges, and a near-black root where it dissolves into the night. All × PALETTE.hills.
    const earth = new Color(PALETTE.hills) // #263041 — bluish moonlit earth
    const earthLow = earth.clone().multiplyScalar(0.45) // crevices
    const earthHi = earth.clone().multiplyScalar(2.33) // ridges catching moonlight ≈ #3a4a63
    const abyss = earth.clone().multiplyScalar(0.075) // root dissolving into night ≈ #05070d

    // organic elliptical coastline radius at a given angle
    const coastR = (ang: number) => {
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      const ell = (RX * RZ) / Math.sqrt((RZ * c) ** 2 + (RX * s) ** 2)
      const n =
        1 + 0.1 * Math.sin(3 * ang + 0.4) + 0.07 * Math.sin(6 * ang - 1.1) + 0.04 * Math.sin(11 * ang + 2)
      return ell * n
    }
    // gentle terrain height on the top surface (rises toward the back, −z)
    const terrainY = (x: number, z: number) => {
      const back = smooth(0.1, 1.3, -z)
      const bumps =
        (vnoise(x * 0.8 + 3, z * 0.8 + 7) - 0.5) * 0.2 + (vnoise(x * 1.7 + 9, z * 1.7 + 2) - 0.5) * 0.1
      return 0.26 * back + bumps
    }
    // per-angle height wobble at the coastline so the rim is a bushy, organic silhouette, not a
    // flat disc edge (the "floating plate" tell)
    // sampled on the circle (cos/sin), NOT raw ang, so it's continuous across the 0/2π seam
    const rimWobble = (ang: number) =>
      (vnoise(Math.cos(ang) * 1.9 + 4, Math.sin(ang) * 1.9 + 7) - 0.5) * 0.35

    const cc = new Color()
    let p = 0
    for (let r = 0; r < rows; r++) {
      for (let sIdx = 0; sIdx < cols; sIdx++) {
        const ang = (sIdx / SEG) * Math.PI * 2
        const edge = coastR(ang)
        let x: number
        let y: number
        let z: number
        let depth: number // 0 on top, → 1 at the root tip (for colour)
        if (r <= RT) {
          const fr = r / RT // 0 centre → 1 coast
          const rad = Math.max(0.02, fr * edge)
          x = Math.cos(ang) * rad
          z = Math.sin(ang) * rad
          y = terrainY(x, z) - 0.1 * smooth(0.7, 1, fr) + rimWobble(ang) * smooth(0.45, 1, fr)
          depth = 0
        } else {
          const k = (r - RT) / RS // 0 coast → 1 tip
          const taper = 1 - smooth(0, 1, k) * 0.78
          // circular angular sampling (continuous at the 0/2π seam); k rides on the y axis
          const rocky = 1 + (vnoise(Math.cos(ang) * 2.5 + 11, Math.sin(ang) * 2.5 + k * 4) - 0.5) * 0.4 * k
          const rad = Math.max(0.05, edge * taper * rocky)
          x = Math.cos(ang) * rad
          z = Math.sin(ang) * rad
          const rimY = terrainY(Math.cos(ang) * edge, Math.sin(ang) * edge) - 0.1 + rimWobble(ang)
          const drop = DEPTH * (k * k * 0.7 + k * 0.3) // ease-in plunge
          y = rimY - drop + (vnoise(Math.cos(ang) * 3 + 5, Math.sin(ang) * 3 + k * 5) - 0.5) * 0.18 * (1 - k)
          depth = k
        }
        pos[p] = x
        pos[p + 1] = y
        pos[p + 2] = z

        if (depth === 0) {
          const lift = vnoise(x + 20, z + 20)
          cc.copy(earthLow).lerp(earth, smooth(0.1, 0.6, lift))
          cc.lerp(earthHi, smooth(0.62, 1, lift) * 0.85)
        } else {
          cc.copy(earth).lerp(abyss, smooth(0.05, 0.85, depth))
        }
        col[p] = cc.r
        col[p + 1] = cc.g
        col[p + 2] = cc.b
        p += 3
      }
    }

    const idx: number[] = []
    for (let r = 0; r < rows - 1; r++) {
      for (let sIdx = 0; sIdx < SEG; sIdx++) {
        const a = r * cols + sIdx
        const b = a + 1
        const c = a + cols
        const d = c + 1
        idx.push(a, b, c, b, d, c) // winding gives upward/outward normals
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </mesh>
  )
}

/**
 * The painting's rolling blue-grey hills behind the village — a wavy heightfield band (not smooth
 * spheres) that swells and rolls across the back, rising taller on the right as in the painting.
 * Vertex colours band from dark troughs through the derived `hills` blue to a moonlit crest
 * (`#5c6872`), so the ridges read in the moonlight instead of vanishing into black.
 */
function RollingHills() {
  const geo = useMemo(() => {
    const X0 = -1.25
    const X1 = 1.25
    const Z0 = 0.7 // front (at the village's foot)
    const Z1 = -0.85 // back (kept inside the island footprint)
    const NX = 90
    const NZ = 46
    const MAXH = 1.3 // bolder: a taller rolling presence behind the village

    const cols = NX + 1
    const rows = NZ + 1
    const pos = new Float32Array(cols * rows * 3)
    const col = new Float32Array(cols * rows * 3)

    // the derived hills blue lifted BOLDER across a night range so the ridges read as luminous blue-grey
    // (Mark, 2026-06-15): troughs lifted off near-black, brighter mid-slopes, a bright moonlit crest from
    // the hills region's lightest swatch — kept just below the church pale (#8b9bad) so the church still
    // out-reads it as the focal point. Still derived from palette.json swatches × documented factors.
    const hillDark = new Color(PALETTE.hills).multiplyScalar(1.5) // troughs ≈ #303b50
    const hillMid = new Color(PALETTE.hills).multiplyScalar(3.5) // mid slopes ≈ #4a5b77
    const hillLit = new Color(PALETTE.hillsCrest).multiplyScalar(2.25) // moonlit crest ≈ #8797a5

    const hillH = (x: number, z: number) => {
      const b = Math.min(1, Math.max(0, (Z0 - z) / (Z0 - Z1))) // 0 front → 1 back
      const rightBias = 0.55 + 0.45 * smooth(-1.5, 1.3, x) // taller on the right
      const swell = 0.55 + 0.32 * Math.sin(x * 2 + 0.6) + 0.24 * Math.sin(x * 3.3 - z * 1.5 + 2)
      const n = (vnoise(x * 1.4 + 5, z * 1.4 + 9) - 0.5) * 0.4
      return Math.max(0, MAXH * smooth(0, 1, b) * rightBias * (swell + n))
    }

    const cc = new Color()
    let p = 0
    for (let j = 0; j < rows; j++) {
      const z = Z0 + (Z1 - Z0) * (j / NZ)
      for (let i = 0; i < cols; i++) {
        const x = X0 + (X1 - X0) * (i / NX)
        const h = hillH(x, z)
        pos[p] = x
        pos[p + 1] = h - 0.05 // bury the foot a touch so hills emerge from the ground, no seam
        pos[p + 2] = z
        const t = h / MAXH
        cc.copy(hillDark)
          .lerp(hillMid, smooth(0, 0.34, t))
          .lerp(hillLit, smooth(0.22, 0.82, t)) // wide lit band so the ridge flanks catch the moon, not just the crest
        col[p] = cc.r
        col[p + 1] = cc.g
        col[p + 2] = cc.b
        p += 3
      }
    }

    const idx: number[] = []
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * cols + i
        const b = a + 1
        const c = a + cols
        const d = c + 1
        idx.push(a, b, c, b, d, c) // upward normals
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </mesh>
  )
}

/** A triangular-prism gable roof: width w (x), ridge height h (y), depth d (z); ridge runs along z. */
function gableRoofGeo(w: number, h: number, d: number) {
  const hw = w / 2
  const hd = d / 2
  const v = new Float32Array([
    -hw, 0, hd, hw, 0, hd, 0, h, hd, // front cap 0,1,2
    -hw, 0, -hd, hw, 0, -hd, 0, h, -hd, // back cap 3,4,5
  ])
  const idx = [0, 1, 2, 5, 4, 3, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2]
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(v, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A small gable-roofed house. The warm window is emissive light (bloom catches it), not surface. */
function House({ position, w = 0.4, h = 0.3, d = 0.4, lit = false, rot = 0 }: { position: Vec3; w?: number; h?: number; d?: number; lit?: boolean; rot?: number }) {
  const roof = useMemo(() => gableRoofGeo(w * 1.06, h * 0.55, d * 1.06), [w, h, d])
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C.house} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={roof} position={[0, h, 0]}>
        <meshStandardMaterial color={C.roof} roughness={0.9} flatShading />
      </mesh>
      {lit && (
        <mesh position={[0, h * 0.42, d / 2 + 0.003]}>
          <planeGeometry args={[w * 0.24, h * 0.3]} />
          <meshBasicMaterial color={C.window} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/**
 * The village church — the pale, slender-spired focal point. A low nave with a gable roof, a slender
 * bell tower at the front and a thin pointed spire, in the lifted-pale steeple blue so it stands out
 * against the dark hills (echoing the cypress's vertical, as in the painting).
 */
function Church({ position }: { position: Vec3 }) {
  const naveRoof = useMemo(() => gableRoofGeo(0.5, 0.2, 0.64), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.46, 0.34, 0.6]} />
        <meshStandardMaterial color={CHURCH_PALE} roughness={0.85} flatShading />
      </mesh>
      <mesh geometry={naveRoof} position={[0, 0.34, 0]}>
        <meshStandardMaterial color={C.roof} roughness={0.9} flatShading />
      </mesh>
      {/* slender bell tower at the front */}
      <mesh position={[0, 0.42, 0.26]}>
        <boxGeometry args={[0.15, 0.84, 0.15]} />
        <meshStandardMaterial color={CHURCH_PALE} roughness={0.85} flatShading />
      </mesh>
      {/* the spire — thin and pointed */}
      <mesh position={[0, 1.04, 0.26]}>
        <coneGeometry args={[0.1, 0.42, 8]} />
        <meshStandardMaterial color={CHURCH_TIP} roughness={0.8} flatShading />
      </mesh>
      {/* a small lit belfry window */}
      <mesh position={[0, 0.5, 0.34]}>
        <planeGeometry args={[0.05, 0.09]} />
        <meshBasicMaterial color={C.window} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A small dark foreground shrub — a noise-displaced faceted clump in the cypress-green family, the
 *  dark bushes Van Gogh dotted along the painting's foreground. Procedural fill. */
function Bush({ position, r = 0.16, seed = 0 }: { position: Vec3; r?: number; seed?: number }) {
  const geo = useMemo(() => {
    const g = new IcosahedronGeometry(r, 1)
    const pos = g.attributes.position
    const v = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const n = vnoise(v.x * 6 + seed, v.z * 6 + seed)
      v.multiplyScalar(0.75 + 0.55 * n)
      v.y *= 0.82
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [r, seed])
  return (
    <mesh geometry={geo} position={position}>
      <meshStandardMaterial color={PALETTE.cypressShade} roughness={1} flatShading />
    </mesh>
  )
}

function TerrainStrokeField({ count }: { count: number }) {
  const geo = useMemo(() => {
    const blades = makeTerrainBlades(count)
    const positions: number[] = []
    const colours: number[] = []
    const indices: number[] = []
    const terrainColours = [
      new Color(PALETTE.cypressGreen).multiplyScalar(0.75),
      new Color(PALETTE.cypressShade).multiplyScalar(0.95),
      new Color(PALETTE.hillsCrest).multiplyScalar(1.02),
      new Color(PALETTE.hills).multiplyScalar(1.8),
    ]
    const tipLift = new Color('#f4ead3')

    for (const blade of blades) {
      const base = positions.length / 3
      const [x, y, z] = blade.position
      const half = blade.width * 0.5
      const rightX = Math.cos(blade.rotationY) * half
      const rightZ = Math.sin(blade.rotationY) * half
      const leanX = Math.sin(blade.rotationY + blade.lean) * blade.height * 0.2
      const leanZ = Math.cos(blade.rotationY + blade.lean) * blade.height * 0.2
      positions.push(
        x - rightX, y, z - rightZ,
        x + rightX, y, z + rightZ,
        x + leanX, y + blade.height, z + leanZ,
      )

      const baseColour = terrainColours[blade.colourIndex % terrainColours.length]
      const tipColour = baseColour.clone().lerp(tipLift, 0.16)
      colours.push(
        baseColour.r, baseColour.g, baseColour.b,
        baseColour.r, baseColour.g, baseColour.b,
        tipColour.r, tipColour.g, tipColour.b,
      )
      indices.push(base, base + 1, base + 2)
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [count])

  return (
    <mesh geometry={geo} renderOrder={2}>
      <meshStandardMaterial vertexColors roughness={0.98} side={DoubleSide} flatShading />
    </mesh>
  )
}

function RidgeStones() {
  const stones = useMemo(() => makeRidgeStones(), [])
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const colours = useMemo(
    () => [
      new Color(PALETTE.hills).multiplyScalar(1.45),
      new Color(PALETTE.hillsCrest).multiplyScalar(1.25),
      new Color(PALETTE.ground).multiplyScalar(2.2),
    ],
    [],
  )

  return (
    <group>
      {stones.map((stone, index) => (
        <mesh
          key={index}
          geometry={geo}
          position={stone.position}
          rotation={stone.rotation}
          scale={stone.scale}
        >
          <meshStandardMaterial color={colours[stone.colourIndex % colours.length]} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

type DioramaDebug = 'final' | 'stage'

export function Diorama({ debug = 'final' }: { debug?: DioramaDebug }) {
  const detailCount = debug === 'stage' ? 520 : 460
  return (
    <group>
      {/* moonlight: a cool key from the upper-right (the moon's corner) + deep-blue fill so the
          forms model in the dark instead of reading as flat black. The moon's own warm pointLight
          lives in SkyDome. */}
      <hemisphereLight args={['#54688f', '#080c14', debug === 'stage' ? 1.05 : 0.85]} />
      <ambientLight intensity={debug === 'stage' ? 0.42 : 0.3} color="#28324c" />
      <directionalLight position={[4, 6, 3]} intensity={debug === 'stage' ? 1.9 : 1.6} color="#cdd8f5" />

      {/* the floating island the village stands on */}
      <FloatingIsland />
      <TerrainStrokeField count={detailCount} />
      <RidgeStones />

      {/* rolling hills behind the village */}
      <RollingHills />

      {/* village — houses huddled around the church, at the foot of the hills */}
      <group position={[0, -0.02, 0]}>
        <House position={[-0.62, 0, 0.62]} w={0.4} h={0.28} d={0.38} lit rot={0.15} />
        <House position={[-0.3, 0, 0.74]} w={0.32} h={0.24} d={0.34} lit rot={-0.25} />
        <House position={[0.36, 0, 0.66]} w={0.34} h={0.24} d={0.34} rot={0.2} />
        <House position={[0.66, 0, 0.78]} w={0.3} h={0.22} d={0.3} lit rot={-0.15} />
        <House position={[0.95, 0, 0.62]} w={0.34} h={0.26} d={0.32} lit rot={0.3} />
        <House position={[0.5, 0, 0.45]} w={0.28} h={0.2} d={0.28} rot={-0.4} />
        <Church position={[0.02, 0, 0.5]} />
      </group>

      {/* cypress, front-left — the painting's own flame, source-projected into a world volume */}
      <SourceCypress />

      {/* dark foreground shrubs, dotted along the ground as in the painting */}
      <Bush position={[0.9, 0.05, 0.98]} r={0.17} seed={1} />
      <Bush position={[1.2, 0.05, 0.62]} r={0.14} seed={7} />
      <Bush position={[0.28, 0.04, 1.06]} r={0.11} seed={9} />
      <Bush position={[-0.72, 0.05, 1.02]} r={0.13} seed={4} />
      <Bush position={[1.45, 0.04, 0.05]} r={0.12} seed={5} />

    </group>
  )
}
