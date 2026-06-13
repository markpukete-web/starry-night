import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { makeBrushTexture, mulberry32, sampleColour, sampleFlow } from './brush'

type Props = {
  flow: ImageData2D
  colourSrc: ImageData2D
  aspect: number
  count: number
  /** strokes seed over the sky: v in [0, skyV] from the top down. */
  skyV?: number
  /** advection rate, in UV units per second. */
  speed?: number
  animate?: boolean
}

/**
 * Phase 1 · Slice 3 — the brushstroke sky. A field of instanced dabs over the sky, each oriented
 * by the derived flow field and coloured from the painting, advecting along the flow so the sky
 * churns the way Van Gogh painted it. Strokes have finite lives and fade in/out on respawn.
 */
export function BrushstrokeSky({ flow, colourSrc, aspect, count, skyV = 0.66, speed = 0.05, animate = true }: Props) {
  const brushTex = useMemo(() => makeBrushTexture(), [])

  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1)
    const mat = new MeshBasicMaterial({
      map: brushTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      blending: NormalBlending,
    })
    return new InstancedMesh(geo, mat, count)
  }, [count, brushTex])

  // Per-stroke simulation state. Strokes seed only where the painting is light enough to be sky
  // (keeps them off the near-black cypress and the dark hills).
  const sim = useMemo(() => {
    const u = new Float32Array(count)
    const v = new Float32Array(count)
    const sign = new Float32Array(count)
    const age = new Float32Array(count)
    const life = new Float32Array(count)
    const len = new Float32Array(count)
    const wr = new Float32Array(count)
    const rng = mulberry32(0x57a99e)
    const lumAt = (uu: number, vv: number) => {
      const [r, g, b] = sampleColour(colourSrc, uu, vv)
      return 0.299 * r + 0.587 * g + 0.114 * b
    }
    const seed = (i: number) => {
      let uu = rng()
      let vv = rng() * skyV
      for (let a = 0; a < 10 && lumAt(uu, vv) < 0.2; a++) {
        uu = rng()
        vv = rng() * skyV
      }
      u[i] = uu
      v[i] = vv
      sign[i] = rng() < 0.5 ? -1 : 1
      life[i] = 3 + rng() * 5
      age[i] = rng() * life[i]
      len[i] = 0.02 + 0.022 * rng()
      wr[i] = 0.26 + 0.16 * rng()
    }
    for (let i = 0; i < count; i++) seed(i)
    return { u, v, sign, age, life, len, wr, seed }
  }, [flow, colourSrc, count, skyV])

  // Recompose every instance from current state (matrix + colour). Called each animated frame.
  const writeAll = useMemo(() => {
    const m = new Matrix4()
    const pos = new Vector3()
    const quat = new Quaternion()
    const zAxis = new Vector3(0, 0, 1)
    const scl = new Vector3()
    const col = new Color()
    return () => {
      const { u, v, age, life, len, wr } = sim
      for (let i = 0; i < count; i++) {
        const uu = u[i]
        const vv = v[i]
        const { theta } = sampleFlow(flow, uu, vv)
        const t = age[i] / life[i]
        const fade = Math.sin(Math.PI * (t < 0 ? 0 : t > 1 ? 1 : t)) // 0 -> 1 -> 0 over life
        const L = len[i] * (0.25 + 0.75 * fade)
        pos.set((uu - 0.5) * aspect, 0.5 - vv, 0.02)
        quat.setFromAxisAngle(zAxis, -theta)
        scl.set(L, L * wr[i], 1)
        m.compose(pos, quat, scl)
        mesh.setMatrixAt(i, m)
        const [r, g, b] = sampleColour(colourSrc, uu, vv)
        col.setRGB(r, g, b)
        mesh.setColorAt(i, col)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [mesh, sim, flow, colourSrc, aspect, count])

  useEffect(() => {
    writeAll()
  }, [writeAll])

  useFrame((_, dt) => {
    if (!animate) return
    const d = Math.min(dt, 0.05)
    const { u, v, sign, age, life, seed } = sim
    for (let i = 0; i < count; i++) {
      age[i] += d
      const { theta } = sampleFlow(flow, u[i], v[i])
      u[i] += Math.cos(theta) * sign[i] * speed * d
      v[i] += Math.sin(theta) * sign[i] * speed * d
      if (age[i] >= life[i] || u[i] < 0 || u[i] > 1 || v[i] < 0 || v[i] > skyV) {
        seed(i)
        age[i] = 0
      }
    }
    writeAll()
  })

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as MeshBasicMaterial).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  return <primitive object={mesh} />
}
