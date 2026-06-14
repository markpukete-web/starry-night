import { useMemo } from 'react'
import { CatmullRomCurve3, LatheGeometry, Vector2, Vector3 } from 'three'
import { PALETTE } from './palette'

/**
 * Phase 1 (3D) — the Starry Night diorama as real forms: a lathe cypress, gable-roofed village
 * with a church + steeple, rolling hills, on a floating slab. Surface colours are sourced from the
 * derived palette (palette.json, via PALETTE); the lit windows are emissive light, not surface.
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
      <hemisphereLight args={['#6878a6', '#10161f', 1.05]} />
      <ambientLight intensity={0.4} color="#33466a" />
      <directionalLight position={[3, 5, 2.5]} intensity={1.3} color="#bcccf0" />

      {/* floating base slab */}
      <mesh position={[0, -0.32, 0]}>
        <boxGeometry args={[4.4, 0.64, 3.1]} />
        <meshStandardMaterial color={C.ground} roughness={1} flatShading />
      </mesh>

      {/* rolling hills along the back */}
      <Hill position={[-1.1, 0.05, -1.05]} scale={[1.7, 0.42, 0.7]} />
      <Hill position={[0.5, 0.02, -1.2]} scale={[1.5, 0.34, 0.65]} />
      <Hill position={[1.7, 0.0, -1.0]} scale={[1.3, 0.3, 0.6]} />

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
      <Cypress position={[-1.55, 0, 0.85]} height={2.8} rot={0.4} />
      <Cypress position={[-1.25, 0, 1.05]} height={1.7} rot={-0.5} scale={0.85} />

    </group>
  )
}
