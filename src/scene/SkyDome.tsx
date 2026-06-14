import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  NormalBlending,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { mulberry32, sampleColour, sampleFlow } from './brush'
import { PALETTE } from './palette'

// The sky as a full sphere of swirls grown NATIVELY on the dome — a flow field of vortices (the
// stars' halos and the central whorl), with streamlines flowing through it. Bold round Van Gogh
// swirls everywhere, organic, with no seam, no symmetry and no gaps. Stars sit at vortex centres.
const DOME_R = 6
const POINTS = 13
const STEP = 0.05 // radians per integration step on the sphere
const HORIZON = -0.22 // strokes live above roughly the horizon

type Vortex = { dir: Vector3; strength: number; sign: number; radius: number; star: boolean; moon: boolean; scale: number; core: boolean }

function dirAzEl(az: number, el: number): Vector3 {
  const ce = Math.cos(el)
  return new Vector3(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))
}

// A soft warm radial glow — placed at a swirl's eye so the calm centre reads as light, not a hole.
// Bloom amplifies the bright core; additive blending lets it melt into the surrounding strokes.
function makeGlowTexture(): CanvasTexture {
  const s = 128
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,250,224,0.92)') // luminous but soft — a glowing heart, not a hard star
  g.addColorStop(0.28, 'rgba(248,237,184,0.5)')
  g.addColorStop(0.62, 'rgba(225,213,150,0.18)')
  g.addColorStop(1, 'rgba(225,213,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

// The moon's soft concentric halo — warm gold fading to nothing. Additive, so it blossoms under
// Bloom into the glowing orb Van Gogh wrapped around the crescent (palette moon: #c0b451 / #b0a84f).
function makeMoonHalo(): CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,240,182,0.95)')
  g.addColorStop(0.25, 'rgba(247,214,110,0.42)')
  g.addColorStop(0.55, 'rgba(228,188,86,0.15)')
  g.addColorStop(1, 'rgba(228,188,86,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

// The carved crescent — a bright gold disc with an offset disc erased out of it, so the lit sliver
// hugs the upper-right and its concavity faces down-left toward the composition, as in the painting.
function makeMoonCrescent(): CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const cx = s / 2
  const cy = s / 2
  const R = s * 0.32
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  g.addColorStop(0, 'rgba(255,247,206,1)')
  g.addColorStop(0.7, 'rgba(243,206,99,1)')
  g.addColorStop(1, 'rgba(230,184,74,1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(cx - R * 0.5, cy + R * 0.5, R * 0.96, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

// The painting's real sky, in painting UV (u: 0 left → 1 right, v: 0 top → 1 bottom).
// Venus — the big "morning star" with the wide halo, centre-left — is called out so it reads large.
const VENUS_UV: [number, number] = [0.27, 0.33]
// The moon sits top-right as in the painting, but pulled slightly down-and-in from the very corner
// so the crescent and its halo clear the default desktop frame instead of escaping the top edge.
const MOON_UV: [number, number] = [0.8, 0.2]
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

// Inverse of uvToFrontDir: recover a dome direction's painting UV (and the arc angles h, w).
// onArc is false off the painting, so the flow-field bias only ever touches the front composition.
function frontUV(p: Vector3): { u: number; v: number; h: number; w: number; onArc: boolean } {
  const w = Math.asin(Math.min(1, Math.max(-1, p.dot(TRUEUP))))
  const fwd = p.dot(FWD)
  const h = Math.atan2(p.dot(RIGHT), fwd)
  const u = 0.5 + h / SPAN_H
  const v = 0.5 - w / SPAN_V
  return { u, v, h, w, onArc: fwd > 0 && u >= 0 && u <= 1 && v >= 0 && v <= 1 }
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function buildVortices(): Vortex[] {
  const rng = mulberry32(0x5747a1)
  const V: Vortex[] = []
  const add = (dir: Vector3, strength: number, sign: number, radius: number, star = false, moon = false, scale = 0.15, core = false) =>
    V.push({ dir, strength, sign, radius, star, moon, scale, core })

  // FRONT — the painting itself. The central double-swirl dominates; Venus is the big morning star.
  add(uvToFrontDir(0.43, 0.34), 2.2, 1, 0.62, false, false, 0.15, true) // main roll of the iconic swirl (glowing eye)
  add(uvToFrontDir(0.58, 0.29), 1.4, -1, 0.46, false, false, 0.15, true) // its counter-roll (forms the S) — softened so the stagnation comma shrinks; glows too
  add(uvToFrontDir(VENUS_UV[0], VENUS_UV[1]), 1.0, -1, 0.32, true, false, 0.24) // Venus
  STAR_UVS.forEach((uv, i) =>
    add(uvToFrontDir(uv[0], uv[1]), 0.6 + 0.2 * rng(), i % 2 === 0 ? 1 : -1, 0.18 + 0.07 * rng(), true, false, 0.13 + 0.04 * rng()),
  )
  add(uvToFrontDir(MOON_UV[0], MOON_UV[1]), 1.1, 1, 0.4, false, true)

  // BACK — invented in the same hand to complete the 360°, centred opposite the front.
  // Each big swirl is a double (roll + counter-roll), like the front hero, so the flow sweeps
  // across the eye in a comma instead of leaving a hollow concentric drain.
  add(dirAzEl(BACK_AZ + 0.5, 0.34), 2.0, -1, 0.55, false, false, 0.15, true)
  add(dirAzEl(BACK_AZ + 0.78, 0.3), 1.5, 1, 0.42)
  add(dirAzEl(BACK_AZ - 0.7, 0.22), 1.7, 1, 0.46, false, false, 0.15, true)
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
  uniform float uTime; uniform float uSpeed; uniform float uSat;
  varying float vLen; varying float vAcross; varying float vPhase; varying vec3 vColor;
  void main() {
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
    float taper = smoothstep(0.0, 0.14, vLen) * smoothstep(1.0, 0.82, vLen);
    float flow = 0.5 + 0.5 * sin(vLen * 6.0 - uTime * uSpeed + vPhase);
    // relief across the stroke — a lit centre ridge falling to darker flanks, so each ribbon reads
    // as a crisp impasto mark rather than a soft smear (it stays defined under Bloom).
    float ridge = 0.82 + 0.36 * edge;
    vec3 col = vColor * (0.62 + 0.34 * flow) * ridge;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, uSat), 0.0, 2.0);
    float a = edge * taper * 0.95;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`

type Props = {
  // the derived flow field — sampled on the front arc to bias fine stroke orientation toward the
  // painting's real brushwork (coherence-weighted; the hybrid reconciliation of the locked bar).
  flow: ImageData2D
  colourSrc: ImageData2D
  count: number
  speed?: number
  strokeWidth?: number
  swirlTightness?: number
  saturation?: number
  skyTop?: string
  skyBottom?: string
  glowIntensity?: number
  moonBright?: number
  starBright?: number
  paused?: boolean
  flowBias?: number
}

export function SkyDome({
  flow,
  colourSrc,
  count,
  speed = 0.05,
  strokeWidth = 1,
  swirlTightness = 0.45,
  saturation = 1.3,
  skyTop = PALETTE.skyZenith,
  skyBottom = PALETTE.skyHorizon,
  glowIntensity = 1,
  moonBright = 1.7,
  starBright = 2.5,
  paused = false,
  flowBias = 0.6,
}: Props) {
  const vortices = useMemo(() => buildVortices(), [])

  const gradient = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTop: { value: new Color(PALETTE.skyZenith) }, uBottom: { value: new Color(PALETTE.skyHorizon) } },
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
        uniforms: { uTime: { value: 0 }, uSpeed: { value: 2 }, uSat: { value: 1.3 } },
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

  const glowTex = useMemo(() => makeGlowTexture(), [])
  const moonHaloTex = useMemo(() => makeMoonHalo(), [])
  const moonCrescentTex = useMemo(() => makeMoonCrescent(), [])

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
        out.addScaledVector(tin, swirlTightness * w)
      }
      out.addScaledVector(p, -out.dot(p)) // keep only the tangent component
      return out
    }

    // Hybrid reconciliation of the locked bar: on the front arc, bias the streamline orientation
    // toward the painting's DERIVED flow field (coherence-weighted) — strongest in the calm flow
    // BETWEEN swirls, fading to zero at the big-swirl eyes so the approved comma forms stand. The
    // vortices remain the macro composition + motion engine; this only refines fine orientation.
    const coreVorts = vortices.filter((v) => v.core)
    const eU = new Vector3()
    const eV = new Vector3()
    const fb = new Vector3()
    const flowBiasAt = (p: Vector3, ref: Vector3, out: Vector3): number => {
      if (flowBias <= 0) return 0
      const { u, v, h, w, onArc } = frontUV(p)
      if (!onArc) return 0
      const fade = smoothstep(0, 0.12, u) * smoothstep(1, 0.88, u) * smoothstep(0, 0.14, v) * smoothstep(1, 0.85, v)
      if (fade < 0.01) return 0
      const { theta, coh } = sampleFlow(flow, u, v)
      if (coh < 0.02) return 0
      // the painting's axes as orthonormal sphere tangents at p: eU = +u (right), eV = +v (down)
      const sh = Math.sin(h)
      const ch = Math.cos(h)
      eU.copy(RIGHT).multiplyScalar(ch).addScaledVector(FWD, -sh)
      eV.copy(FWD).multiplyScalar(ch).addScaledVector(RIGHT, sh).multiplyScalar(Math.sin(w)).addScaledVector(TRUEUP, -Math.cos(w))
      out.copy(eU).multiplyScalar(Math.cos(theta)).addScaledVector(eV, Math.sin(theta))
      out.addScaledVector(p, -out.dot(p))
      if (out.lengthSq() < 1e-8) return 0
      out.normalize()
      if (out.dot(ref) < 0) out.multiplyScalar(-1) // orientation is undirected — align to the heading
      // protect the swirl eyes: fade the bias out where a big "core" vortex dominates
      let nearEye = 0
      for (let i = 0; i < coreVorts.length; i++) {
        const cv = coreVorts[i]
        const ang = Math.acos(Math.min(1, Math.max(-1, p.dot(cv.dir))))
        const e = Math.exp(-(ang * ang) / (cv.radius * cv.radius))
        if (e > nearEye) nearEye = e
      }
      return Math.min(0.85, flowBias * coh * (1 - nearEye) * fade)
    }

    for (let i = 0; i < count; i++) {
      const seed = dirAzEl(rng() * Math.PI * 2, HORIZON + 0.04 + rng() * 1.5)
      const phase = rng() * Math.PI * 2
      const halfW = (0.055 + 0.06 * rng()) * strokeWidth
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
        // hybrid: nudge the heading toward the painting's derived flow on the front arc
        const b = flowBiasAt(p, f, fb)
        if (b > 0) {
          f.multiplyScalar(1 - b).addScaledVector(fb, b)
          f.addScaledVector(p, -f.dot(p))
          if (f.lengthSq() > 1e-8) f.normalize()
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
  }, [flow, colourSrc, count, vortices, strokeWidth, swirlTightness, flowBias])

  // Drive the churn from the render loop — frozen when paused, so prefers-reduced-motion yields a
  // still, lit painting (no churn). These write a memoised material's uniforms: R3F render-target
  // mutations that intentionally sit outside React's immutable data flow, hence the scoped disable.
  useFrame((_, dt) => {
    if (paused) return
    /* eslint-disable react-hooks/immutability -- R3F render-loop uniform writes are intentional mutations */
    material.uniforms.uTime.value += dt
    material.uniforms.uSpeed.value = speed * 40
    material.uniforms.uSat.value = saturation
    /* eslint-enable react-hooks/immutability */
  })

  // live-update the gradient colours from the controls
  useEffect(() => {
    gradient.uniforms.uTop.value.set(skyTop)
    gradient.uniforms.uBottom.value.set(skyBottom)
  }, [gradient, skyTop, skyBottom])

  // dispose geometry whenever it is rebuilt (count/width/tightness change) or on unmount;
  // the stable materials are disposed only on unmount.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(
    () => () => {
      material.dispose()
      gradient.dispose()
      glowTex.dispose()
      moonHaloTex.dispose()
      moonCrescentTex.dispose()
    },
    [material, gradient, glowTex, moonHaloTex, moonCrescentTex],
  )

  const moon = vortices.find((v) => v.moon)
  const moonPos = moon ? moon.dir.clone().multiplyScalar(DOME_R) : new Vector3(0, 4, -4)
  const stars = vortices.filter((v) => v.star)
  const cores = vortices.filter((v) => v.core)

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[DOME_R + 4, 32, 24]} />
        <primitive object={gradient} attach="material" />
      </mesh>
      <mesh geometry={geometry} material={material} frustumCulled={false} />

      {/* the moon — a glowing gold orb with a soft halo and a carved crescent, not a flat disc.
          Sprites face the eye from every orbit angle; Bloom blossoms the additive halo. */}
      <group position={moonPos}>
        <sprite scale={[4.2, 4.2, 1]} renderOrder={1}>
          <spriteMaterial map={moonHaloTex} blending={AdditiveBlending} transparent opacity={Math.min(1, 0.5 * moonBright)} depthWrite={false} toneMapped={false} />
        </sprite>
        <sprite scale={[1.9, 1.9, 1]} renderOrder={2}>
          <spriteMaterial map={moonCrescentTex} transparent opacity={1} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      <pointLight position={moonPos} intensity={20} distance={24} color="#f0d98a" />

      {stars.map((v, i) => {
        const p = v.dir.clone().multiplyScalar(DOME_R)
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[v.scale, 16, 16]} />
            <meshStandardMaterial color="#f6e08a" emissive="#f6e08a" emissiveIntensity={starBright} toneMapped={false} />
          </mesh>
        )
      })}

      {/* luminous core at each big swirl's eye — the calm centre reads as light, not a dark hole.
          The spiral inflow pushes the visual eye slightly "up-current" of the vortex centre, so
          nudge the glow toward world-up to land it on the dark crescent rather than haloing it. */}
      {cores.map((v, i) => {
        // the spiral's void sits up-current of the centre — up, and to one side set by the swirl's
        // rotation sign. Offset along up + sign·horizontal to land the glow on the dark comma.
        const upT = new Vector3(0, 1, 0).addScaledVector(v.dir, -v.dir.y).normalize()
        const horiz = new Vector3().crossVectors(v.dir, upT).normalize()
        const eye = v.dir.clone().addScaledVector(upT, 0.09).addScaledVector(horiz, -v.sign * 0.1).normalize()
        const p = eye.multiplyScalar(DOME_R - 0.15)
        const gs = 2.0 + v.radius * 1.8
        return (
          <sprite key={i} position={p} scale={[gs, gs, 1]} renderOrder={1}>
            <spriteMaterial map={glowTex} blending={AdditiveBlending} transparent opacity={glowIntensity} depthWrite={false} toneMapped={false} />
          </sprite>
        )
      })}
    </group>
  )
}
