import { useMemo } from 'react'

/**
 * Phase 1 (3D pivot) · Spike — a blocky 3D Starry Night diorama: the painting's landscape rebuilt
 * as real forms standing in space (cypress, village + steeple, hills, moon, stars). Rough on
 * purpose — this exists to react to the DIMENSIONALITY. Painterly materials come later.
 * Colours are seeded from the derived palette (public/reference/palette.json).
 */

const C = {
  base: '#0e1622',
  hills: '#1b2a3a',
  village: '#243a5e',
  steeple: '#9fb0c0',
  window: '#f2c84b',
  cypress: '#141d16',
  moon: '#e9d27a',
  star: '#f2e8c0',
}

type Vec3 = [number, number, number]

function House({ position, w = 0.3, h = 0.3, d = 0.3, lit = false }: { position: Vec3; w?: number; h?: number; d?: number; lit?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C.village} roughness={0.95} />
      </mesh>
      {lit && (
        <mesh position={[0, h * 0.45, d / 2 + 0.001]}>
          <planeGeometry args={[w * 0.28, h * 0.3]} />
          <meshBasicMaterial color={C.window} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

export function Diorama() {
  const stars = useMemo<Vec3[]>(
    () => [
      [-1.8, 2.4, -2.0],
      [-0.6, 2.9, -2.2],
      [0.4, 2.5, -2.0],
      [1.1, 2.9, -2.3],
      [-1.2, 1.9, -1.8],
      [0.8, 2.0, -1.9],
    ],
    [],
  )

  return (
    <group>
      <hemisphereLight args={['#4a5a82', '#0a0e18', 0.7]} />
      <ambientLight intensity={0.25} color="#2a3a5a" />
      <directionalLight position={[2.5, 4.5, 2]} intensity={0.8} color="#a9bbe6" />
      <pointLight position={[1.6, 2.2, -1.4]} intensity={14} distance={16} color="#f0d98a" />

      {/* floating base slab */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[4.2, 0.6, 3]} />
        <meshStandardMaterial color={C.base} roughness={1} />
      </mesh>

      {/* hills along the back */}
      <mesh position={[-0.6, 0.12, -1.0]} scale={[2.4, 0.5, 0.8]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={C.hills} roughness={1} />
      </mesh>
      <mesh position={[1.4, 0.08, -1.1]} scale={[1.6, 0.4, 0.7]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={C.hills} roughness={1} />
      </mesh>

      {/* village + church steeple */}
      <House position={[0.0, 0, 0.4]} w={0.45} h={0.3} d={0.4} lit />
      <House position={[0.5, 0, 0.6]} w={0.35} h={0.25} d={0.35} />
      <House position={[-0.5, 0, 0.5]} w={0.4} h={0.28} d={0.35} lit />
      <House position={[0.95, 0, 0.35]} w={0.3} h={0.22} d={0.3} />
      <group position={[0.2, 0, 0.5]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.16, 1.0, 0.16]} />
          <meshStandardMaterial color={C.steeple} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <coneGeometry args={[0.14, 0.32, 4]} />
          <meshStandardMaterial color={C.steeple} roughness={0.8} />
        </mesh>
      </group>

      {/* cypress, front-left */}
      <mesh position={[-1.5, 1.25, 0.8]} rotation={[0, 0, 0.05]}>
        <coneGeometry args={[0.42, 2.6, 12]} />
        <meshStandardMaterial color={C.cypress} roughness={1} />
      </mesh>

      {/* moon, upper right */}
      <mesh position={[1.6, 2.2, -1.4]}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color={C.moon} emissive={C.moon} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>

      {/* stars */}
      {stars.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={C.star} emissive={C.star} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
