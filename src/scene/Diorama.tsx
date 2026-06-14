import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  LatheGeometry,
  Vector2,
  Vector3,
} from 'three'
import { PALETTE } from './palette'

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

    const earth = new Color(PALETTE.hills) // #263041 — bluish moonlit earth
    const earthLow = earth.clone().multiplyScalar(0.45) // crevices
    const earthHi = new Color('#3a4a63') // ridges catching moonlight (toward hills' #5c6872)
    const abyss = new Color('#05070d')

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
    const rimWobble = (ang: number) => (vnoise(ang * 1.9 + 4, 7) - 0.5) * 0.35

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
          const rocky = 1 + (vnoise(ang * 2.5, k * 4 + 11) - 0.5) * 0.4 * k
          const rad = Math.max(0.05, edge * taper * rocky)
          x = Math.cos(ang) * rad
          z = Math.sin(ang) * rad
          const rimY = terrainY(Math.cos(ang) * edge, Math.sin(ang) * edge) - 0.1 + rimWobble(ang)
          const drop = DEPTH * (k * k * 0.7 + k * 0.3) // ease-in plunge
          y = rimY - drop + (vnoise(ang * 3, k * 5 + 5) - 0.5) * 0.18 * (1 - k)
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

/** A flame-shaped cypress as a surface of revolution with an organic, bulging profile. */
function Cypress({ position, height = 2.8, rot = 0, scale = 1 }: { position: Vec3; height?: number; rot?: number; scale?: number }) {
  const geo = useMemo(() => {
    const base: [number, number][] = [
      [0.12, 0.0],
      [0.26, 0.03],
      [0.36, 0.09],
      [0.42, 0.17],
      [0.38, 0.26],
      [0.32, 0.35],
      [0.35, 0.44],
      [0.33, 0.54],
      [0.27, 0.63],
      [0.25, 0.72],
      [0.19, 0.81],
      [0.12, 0.89],
      [0.06, 0.95],
      [0.0, 1.0],
    ]
    // Resample the silhouette through a centripetal spline (no overshoot) so the lathe reads as a
    // smooth licking flame rather than a stack of facets between sparse profile points.
    const curve = new CatmullRomCurve3(
      base.map(([r, y]) => new Vector3(r, y, 0)),
      false,
      'centripetal',
    )
    const pts = curve.getPoints(64).map((p) => new Vector2(Math.max(0, p.x), p.y * height))
    return new LatheGeometry(pts, 48)
  }, [height])
  return (
    <mesh geometry={geo} position={position} rotation={[0, rot, 0]} scale={scale}>
      <meshStandardMaterial color={C.cypress} roughness={1} />
    </mesh>
  )
}

function House({ position, w = 0.4, h = 0.3, d = 0.4, lit = false, rot = 0 }: { position: Vec3; w?: number; h?: number; d?: number; lit?: boolean; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C.house} roughness={0.9} />
      </mesh>
      <mesh position={[0, h + h * 0.26, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[w * 0.78, h * 0.55, 4]} />
        <meshStandardMaterial color={C.roof} roughness={0.9} />
      </mesh>
      {lit && (
        <mesh position={[0, h * 0.45, d / 2 + 0.002]}>
          <planeGeometry args={[w * 0.26, h * 0.3]} />
          <meshBasicMaterial color={C.window} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

function Hill({ position, scale }: { position: Vec3; scale: Vec3 }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 28, 18]} />
      <meshStandardMaterial color={C.hills} roughness={1} flatShading />
    </mesh>
  )
}

export function Diorama() {
  return (
    <group>
      {/* moonlight: a cool key from the upper-right (the moon's corner) + deep-blue fill so the
          forms model in the dark instead of reading as flat black. The moon's own warm pointLight
          lives in SkyDome. */}
      <hemisphereLight args={['#54688f', '#080c14', 0.85]} />
      <ambientLight intensity={0.3} color="#28324c" />
      <directionalLight position={[4, 6, 3]} intensity={1.6} color="#cdd8f5" />

      {/* the floating island the village stands on */}
      <FloatingIsland />

      {/* rolling hills along the back (sit on the island's back-rise) */}
      <Hill position={[-1.1, 0.16, -1.05]} scale={[1.7, 0.42, 0.7]} />
      <Hill position={[0.5, 0.15, -1.2]} scale={[1.5, 0.34, 0.65]} />
      <Hill position={[1.45, 0.13, -0.95]} scale={[1.3, 0.3, 0.6]} />

      {/* village + church */}
      <House position={[-0.55, 0, 0.55]} w={0.42} h={0.3} d={0.4} lit />
      <House position={[0.0, 0, 0.7]} w={0.36} h={0.26} d={0.36} lit rot={0.3} />
      <House position={[0.55, 0, 0.5]} w={0.34} h={0.24} d={0.34} />
      <House position={[1.0, 0, 0.7]} w={0.3} h={0.22} d={0.3} lit rot={-0.2} />
      <group position={[0.25, 0, 0.4]}>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.34, 0.44, 0.5]} />
          <meshStandardMaterial color={C.house} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.17, 0.7, 0.17]} />
          <meshStandardMaterial color={C.steeple} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.07, 0]}>
          <coneGeometry args={[0.15, 0.34, 4]} />
          <meshStandardMaterial color={C.steeple} roughness={0.8} />
        </mesh>
      </group>

      {/* cypress, front-left (two flames) */}
      <Cypress position={[-1.4, 0, 0.8]} height={2.8} rot={0.4} />
      <Cypress position={[-1.15, 0, 1.0]} height={1.7} rot={-0.5} scale={0.85} />

    </group>
  )
}
