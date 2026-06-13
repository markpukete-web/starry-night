import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

type Props = {
  /** radians; ±yaw and ±pitch limits from composition centre (Tunables: 15°, 10°). */
  maxYaw?: number
  maxPitch?: number
  distance?: number
}

/**
 * Phase 1 · Slice 4 — constrained pan/tilt camera. Gently orbits the painting within ±yaw/±pitch
 * (free orbit is out of scope — the composition must always read as the painting), driven by the
 * pointer with a slow idle drift so it always breathes. With depth-separated layers this yields
 * parallax; on a flat plane it is simply a living viewpoint.
 */
export function CameraRig({ maxYaw = 0.26, maxPitch = 0.17, distance = 2 }: Props) {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const clock = useThree((s) => s.clock)
  const cur = useRef({ yaw: 0, pitch: 0 })

  useFrame((_, dt) => {
    const t = clock.elapsedTime
    const targetYaw = Math.sin(t * 0.13) * maxYaw * 0.35 + pointer.x * maxYaw * 0.7
    const targetPitch = Math.cos(t * 0.17) * maxPitch * 0.3 + pointer.y * maxPitch * 0.7
    const k = 1 - Math.pow(0.0015, Math.min(dt, 0.05)) // smoothing toward target
    cur.current.yaw += (targetYaw - cur.current.yaw) * k
    cur.current.pitch += (targetPitch - cur.current.pitch) * k
    const { yaw, pitch } = cur.current
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
  })

  return null
}
