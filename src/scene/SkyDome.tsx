import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  NormalBlending,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { mulberry32, sampleColour } from './brush'

// The sky as a full sphere of swirls grown NATIVELY on the dome — a flow field of vortices (the
// stars' halos and the central whorl), with streamlines flowing through it. Bold round Van Gogh
// swirls everywhere, organic, with no seam, no symmetry and no gaps. Stars sit at vortex centres.
const DOME_R = 6
const POINTS = 13
const STEP = 0.05 // radians per integration step on the sphere
const HORIZON = -0.22 // strokes live above roughly the horizon

type Vortex = { dir: Vector3; strength: number; sign: number; radius: number; star: boolean; moon: boolean; scale: number }

function dirAzEl(az: number, el: number): Vector3 {
  const ce = Math.cos(el)
  return new Vector3(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))
}

// The painting's real sky, in painting UV (u: 0 left → 1 right, v: 0 top → 1 bottom).
// Venus — the big "morning star" with the wide halo, centre-left — is called out so it reads large.
const VENUS_UV: [number, number] = [0.27, 0.33]
const MOON_UV: [number, number] = [0.84, 0.15]
const STAR_UVS: [number, number][] = [
  [0.13, 0.13],
  [0.2, 0.065],
  [0.31, 0.13],
  [0.4, 0.1],
  [0.1, 0.42],
  [0.52, 0.2],
  [0.59, 0.095],
  [0.66, 0.27],
  [0.72, 0.175],
]

// Front anchor — the painting faces the camera's default look direction, so it reads centred on load.
// Build an orthonormal basis (fwd, right, up) at that bearing and lay the painting onto a gentle arc,
// so its swirls keep the painting's relative positions instead of being stretched flat across 180°.
const CAM_POS = new Vector3(2.2, 1.5, 4.6)
const CAM_TARGET = new Vector3(0, 1.05, 0)
const FRONT_AZ = Math.atan2(CAM_TARGET.x - CAM_POS.x, CAM_TARGET.z - CAM_POS.z)
const FRONT_EL = 0.2 // lift the composition centre a touch above the horizon
const FWD = dirAzEl(FRONT_AZ, FRONT_EL)
const RIGHT = new Vector3().crossVectors(FWD, new Vector3(0, 1, 0)).normalize()
const TRUEUP = new Vector3().crossVectors(RIGHT, FWD).normalize()
const BACK_AZ = FRONT_AZ - Math.PI
const SPAN_H = 2.15 // ~123° of front arc carries the painting's width (was 180° — too stretched)
const SPAN_V = SPAN_H / 1.26 // keep the painting's aspect (~3840×3041)

// Map a painting UV onto the front arc, preserving the composition's relative geometry.
function uvToFrontDir(u: number, v: number): Vector3 {
  const h = (u - 0.5) * SPAN_H
  const w = (0.5 - v) * SPAN_V
  const cw = Math.cos(w)
  return new Vector3()
    .addScaledVector(FWD, cw * Math.cos(h))
    .addScaledVector(RIGHT, cw * Math.sin(h))
    .addScaledVector(TRUEUP, Math.sin(w))
    .normalize()
}

function buildVortices(): Vortex[] {
  const rng = mulberry32(0x5747a1)
  const V: Vortex[] = []
  const add = (dir: Vector3, strength: number, sign: number, radius: number, star = false, moon = false, scale = 0.15) =>
    V.push({ dir, strength, sign, radius, star, moon, scale })

  // FRONT — the painting itself. The central double-swirl dominates; Venus is the big morning star.
  add(uvToFrontDir(0.43, 0.34), 2.2, 1, 0.62) // main roll of the iconic swirl
  add(uvToFrontDir(0.57, 0.3), 1.7, -1, 0.46) // its counter-roll (forms the S)
  add(uvToFrontDir(VENUS_UV[0], VENUS_UV[1]), 1.0, -1, 0.32, true, false, 0.24) // Venus
  STAR_UVS.forEach((uv, i) =>
    add(uvToFrontDir(uv[0], uv[1]), 0.6 + 0.2 * rng(), i % 2 === 0 ? 1 : -1, 0.18 + 0.07 * rng(), true, false, 0.13 + 0.04 * rng()),
  )
  add(uvToFrontDir(MOON_UV[0], MOON_UV[1]), 1.1, 1, 0.4, false, true)

  // BACK — invented in the same hand to complete the 360°, centred opposite the front.
  // Each big swirl is a double (roll + counter-roll), like the front hero, so the flow sweeps
  // across the eye in a comma instead of leaving a hollow concentric drain.
  add(dirAzEl(BACK_AZ + 0.5, 0.34), 2.0, -1, 0.55)
  add(dirAzEl(BACK_AZ + 0.78, 0.3), 1.5, 1, 0.42)
  add(dirAzEl(BACK_AZ - 0.7, 0.22), 1.7, 1, 0.46)
  add(dirAzEl(BACK_AZ - 0.98, 0.18), 1.3, -1, 0.4)
  for (let i = 0; i < 10; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 3.6, -0.05 + rng() * 1.3), 0.6 + 0.3 * rng(), rng() < 0.5 ? -1 : 1, 0.18 + 0.08 * rng(), true, false, 0.12 + 0.04 * rng())
  }
  for (let i = 0; i < 16; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 4.0, -0.1 + rng() * 1.5), 0.5 + 0.4 * rng(), rng() < 0.5 ? -1 : 1, 0.28 + 0.16 * rng())
  }
  return V
}

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const skyFrag = /* glsl */ `
  varying vec3 vDir; uniform vec3 uTop; uniform vec3 uBottom;
  void main() { float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0); }
`
const strokeVert = /* glsl */ `
  attribute float aLen; attribute float aAcross; attribute float aPhase; attribute vec3 aColor;
  varying float vLen; varying float vAcross; varying float vPhase; varying vec3 vColor;
  void main() {
    vLen = aLen; vAcross = aAcross; vPhase = aPhase; vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const strokeFrag = /* glsl */ `
  precision highp float;
  uniform float uTime; uniform float uSpeed;
  varying float vLen; varying float vAcross; varying float vPhase; varying vec3 vColor;
  void main() {
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
    float taper = smoothstep(0.0, 0.14, vLen) * smoothstep(1.0, 0.82, vLen);
    float flow = 0.5 + 0.5 * sin(vLen * 6.0 - uTime * uSpeed + vPhase);
    vec3 col = vColor * (0.62 + 0.34 * flow);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, 1.3), 0.0, 2.0);
    float a = edge * taper * 0.95;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`

type Props = { flow: ImageData2D; colourSrc: ImageData2D; count: number; speed?: number }

export function SkyDome({ colourSrc, count, speed = 0.05 }: Props) {
  const vortices = useMemo(() => buildVortices(), [])

  const gradient = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTop: { value: new Color('#16294f') }, uBottom: { value: new Color('#2c4d88') } },
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSpeed: { value: 2 } },
        vertexShader: strokeVert,
        fragmentShader: strokeFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
        blending: NormalBlending,
      }),
    [],
  )

  const geometry = useMemo(() => {
    const rng = mulberry32(0x13ade7)
    const positions: number[] = []
    const colors: number[] = []
    const aLen: number[] = []
    const aAcross: number[] = []
    const aPhase: number[] = []
    const indices: number[] = []
    let vbase = 0

    const f = new Vector3()
    const cross = new Vector3()
    const t = new Vector3()
    const n = new Vector3()
    const perp = new Vector3()
    const eL = new Vector3()
    const eR = new Vector3()
    const tin = new Vector3()

    // tangent flow direction (circulation summed over vortices) at a point p on the unit sphere
    const flowAt = (p: Vector3, out: Vector3) => {
      out.set(0, 0, 0)
      for (let i = 0; i < vortices.length; i++) {
        const v = vortices[i]
        const cosA = Math.min(1, Math.max(-1, p.dot(v.dir)))
        const ang = Math.acos(cosA)
        const w = v.strength * Math.exp(-(ang * ang) / (v.radius * v.radius))
        if (w < 0.001) continue
        cross.crossVectors(p, v.dir).multiplyScalar(v.sign * w) // tangent, circulating around v.dir
        out.add(cross)
        // spiral inflow — winds streamlines toward the eye so the swirl fills (Van Gogh's swirls
        // are logarithmic spirals, not hollow circles); vanishes at the exact centre, so no singularity
        tin.copy(v.dir).addScaledVector(p, -p.dot(v.dir)) // tangent at p pointing toward the eye
        out.addScaledVector(tin, 0.45 * w)
      }
      out.addScaledVector(p, -out.dot(p)) // keep only the tangent component
      return out
    }

    for (let i = 0; i < count; i++) {
      const seed = dirAzEl(rng() * Math.PI * 2, HORIZON + 0.04 + rng() * 1.5)
      const phase = rng() * Math.PI * 2
      const halfW = 0.055 + 0.06 * rng()
      const [cr, cg, cb] = sampleColour(colourSrc, 0.05 + rng() * 0.9, rng() * 0.5) // a Van Gogh sky colour

      const P: Vector3[] = []
      const p = seed.clone()
      const dir = new Vector3()
      let have = false
      for (let k = 0; k < POINTS; k++) {
        P.push(p.clone())
        flowAt(p, f)
        if (f.lengthSq() < 1e-8) {
          if (!have) break
          f.copy(dir)
        } else {
          f.normalize()
          if (have && f.dot(dir) < 0) f.multiplyScalar(-1)
        }
        dir.copy(f)
        have = true
        p.addScaledVector(f, STEP).normalize()
        if (p.y < HORIZON) break
      }
      if (P.length < 3) continue

      const M = P.length
      for (let k = 0; k < M; k++) {
        const lenN = k / (M - 1)
        const w = halfW * (1 - 0.5 * lenN)
        t.subVectors(P[Math.min(M - 1, k + 1)], P[Math.max(0, k - 1)]).normalize()
        n.copy(P[k]).multiplyScalar(-1).normalize()
        perp.crossVectors(t, n).normalize()
        eL.copy(P[k]).multiplyScalar(DOME_R).addScaledVector(perp, w)
        eR.copy(P[k]).multiplyScalar(DOME_R).addScaledVector(perp, -w)
        positions.push(eL.x, eL.y, eL.z, eR.x, eR.y, eR.z)
        colors.push(cr, cg, cb, cr, cg, cb)
        aLen.push(lenN, lenN)
        aAcross.push(0, 1)
        aPhase.push(phase, phase)
        if (k < M - 1) {
          const v0 = vbase + k * 2
          indices.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
        }
      }
      vbase += M * 2
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3))
    geo.setAttribute('aLen', new BufferAttribute(new Float32Array(aLen), 1))
    geo.setAttribute('aAcross', new BufferAttribute(new Float32Array(aAcross), 1))
    geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(aPhase), 1))
    geo.setIndex(indices)
    return geo
  }, [colourSrc, count, vortices])

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt
    material.uniforms.uSpeed.value = speed * 40
  })

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      gradient.dispose()
    },
    [geometry, material, gradient],
  )

  const moon = vortices.find((v) => v.moon)
  const moonPos = moon ? moon.dir.clone().multiplyScalar(DOME_R) : new Vector3(0, 4, -4)
  const stars = vortices.filter((v) => v.star)

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[DOME_R + 4, 32, 24]} />
        <primitive object={gradient} attach="material" />
      </mesh>
      <mesh geometry={geometry} material={material} frustumCulled={false} />

      <mesh position={moonPos}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#f2c233" emissive="#f2c233" emissiveIntensity={1.7} toneMapped={false} />
      </mesh>
      <pointLight position={moonPos} intensity={20} distance={24} color="#f0d98a" />

      {stars.map((v, i) => {
        const p = v.dir.clone().multiplyScalar(DOME_R)
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[v.scale, 16, 16]} />
            <meshStandardMaterial color="#f6e08a" emissive="#f6e08a" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}
