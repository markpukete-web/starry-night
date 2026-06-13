import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BackSide,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { makeBrushTexture, mulberry32, sampleColour, sampleFlow } from './brush'

const DOME_R = 9 // gradient sky sphere
const STROKE_R = 7.5 // brushstroke shell (inside the dome)
const TILE = 1 // wrap the painting's flow once around the dome (less scrambling)
const EL_MIN = -0.12
const EL_MAX = 1.45 // leave a small cap at the zenith

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const skyFrag = /* glsl */ `
  varying vec3 vDir; uniform vec3 uTop; uniform vec3 uBottom;
  void main() { float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0); }
`

type Props = { flow: ImageData2D; colourSrc: ImageData2D; count: number; speed?: number }

/**
 * Phase 1 (3D) — the sky as an enveloping DOME, not a flat panel. A gradient night-sky sphere
 * fills every direction (no void, no flat edge), and the churning brushstrokes are distributed
 * across its interior, oriented by the derived flow wrapped onto the dome. Orbit freely; you are
 * always under Van Gogh's sky.
 */
export function SkyDome({ flow, colourSrc, count, speed = 0.05 }: Props) {
  const brushTex = useMemo(() => makeBrushTexture(), [])

  const gradient = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTop: { value: new Color('#0b1736') }, uBottom: { value: new Color('#21386c') } },
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1)
    const mat = new MeshBasicMaterial({
      map: brushTex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      blending: NormalBlending,
    })
    const im = new InstancedMesh(geo, mat, count)
    im.frustumCulled = false // instances are spread over a radius-12 dome, not the origin
    return im
  }, [count, brushTex])

  // Per-stroke state in (azimuth, elevation) over the dome interior.
  const sim = useMemo(() => {
    const az = new Float32Array(count)
    const el = new Float32Array(count)
    const sign = new Float32Array(count)
    const age = new Float32Array(count)
    const life = new Float32Array(count)
    const len = new Float32Array(count)
    const wr = new Float32Array(count)
    const rng = mulberry32(0x1d0e57)
    const seed = (i: number) => {
      az[i] = rng() * Math.PI * 2
      el[i] = EL_MIN + rng() * (EL_MAX - EL_MIN)
      sign[i] = rng() < 0.5 ? -1 : 1
      life[i] = 3 + rng() * 5
      age[i] = rng() * life[i]
      len[i] = 0.16 + 0.22 * rng()
      wr[i] = 0.26 + 0.16 * rng()
    }
    for (let i = 0; i < count; i++) seed(i)
    return { az, el, sign, age, life, len, wr, seed }
  }, [flow, colourSrc, count])

  const writeAll = useMemo(() => {
    const m = new Matrix4()
    const P = new Vector3()
    const E = new Vector3()
    const N = new Vector3()
    const Nin = new Vector3()
    const axis = new Vector3()
    const perp = new Vector3()
    const scl = new Vector3()
    const col = new Color()
    return () => {
      const { az, el, age, life, len, wr } = sim
      for (let i = 0; i < count; i++) {
        const a = az[i]
        const e = el[i]
        const ce = Math.cos(e)
        const se = Math.sin(e)
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const u = (((a / (Math.PI * 2)) * TILE) % 1 + 1) % 1
        const v = Math.min(1, Math.max(0, 1 - e / (Math.PI / 2))) * 0.6
        const { theta } = sampleFlow(flow, u, v)
        const t = age[i] / life[i]
        const fade = Math.sin(Math.PI * (t < 0 ? 0 : t > 1 ? 1 : t))
        const L = len[i] * (0.25 + 0.75 * fade)
        P.set(STROKE_R * ce * sa, STROKE_R * se, STROKE_R * ce * ca)
        E.set(ca, 0, -sa) // east tangent
        N.set(-se * sa, ce, -se * ca) // north tangent
        Nin.set(-ce * sa, -se, -ce * ca) // inward normal (faces the centre)
        axis.copy(E).multiplyScalar(Math.cos(theta)).addScaledVector(N, Math.sin(theta))
        // perp negated so the basis is right-handed with the inward normal -> single-sided (FrontSide)
        perp.copy(E).multiplyScalar(Math.sin(theta)).addScaledVector(N, -Math.cos(theta))
        m.makeBasis(axis, perp, Nin)
        scl.set(L, L * wr[i], 1)
        m.scale(scl)
        m.setPosition(P)
        mesh.setMatrixAt(i, m)
        const [r, g, b] = sampleColour(colourSrc, u, v)
        col.setRGB(r, g, b)
        mesh.setColorAt(i, col)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [mesh, sim, flow, colourSrc, count])

  useEffect(() => {
    writeAll()
  }, [writeAll])

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const { az, el, sign, age, life, seed } = sim
    for (let i = 0; i < count; i++) {
      age[i] += d
      const a = az[i]
      const e = el[i]
      const u = (((a / (Math.PI * 2)) * TILE) % 1 + 1) % 1
      const v = Math.min(1, Math.max(0, 1 - e / (Math.PI / 2))) * 0.6
      const { theta } = sampleFlow(flow, u, v)
      az[i] += (Math.cos(theta) * sign[i] * speed * d) / Math.max(0.2, Math.cos(e))
      el[i] += Math.sin(theta) * sign[i] * speed * d
      if (age[i] >= life[i] || e < EL_MIN || e > EL_MAX) {
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
      gradient.dispose()
    },
    [mesh, gradient],
  )

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[DOME_R, 32, 24]} />
        <primitive object={gradient} attach="material" />
      </mesh>
      <primitive object={mesh} />
    </group>
  )
}
