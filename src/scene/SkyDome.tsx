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
import { mulberry32, sampleColour, sampleFlow } from './brush'

// The sky as a full 360° dome of the painting's real swirls. The painting is mirror-tiled around
// the dome (each copy flips at its edge) so it wraps seamlessly — bold real composition in front,
// continuous swirls all the way around, no seam, no gap.
const CANOPY_R = 6
const TILES = 2 // painting copies around the dome (mirrored)
const FRONT_SPAN = (Math.PI * 2) / TILES // each copy spans this azimuth
const AZ_CENTER = Math.PI // the front copy faces -Z, toward the default camera at +Z
const EL_TOP = 0.92 // painting sky-top -> up
const EL_BOT = -0.18 // painting sky-bottom -> just below the horizon
const POINTS = 12
const STEP_UV = 0.013
const SKY_V = 0.58 // only the painting's sky band (above the hills)

const MOON_UV: [number, number] = [0.855, 0.16]
const STAR_UVS: [number, number][] = [
  [0.1, 0.06],
  [0.22, 0.06],
  [0.33, 0.08],
  [0.07, 0.18],
  [0.21, 0.3],
  [0.09, 0.45],
  [0.3, 0.69],
  [0.55, 0.09],
  [0.61, 0.17],
  [0.72, 0.34],
]

function azFor(u: number, tile: number): number {
  // even tiles run one way, odd tiles mirror — so adjacent copies meet at the same painting edge.
  return tile % 2 === 0 ? AZ_CENTER - (u - 0.5) * FRONT_SPAN : AZ_CENTER + Math.PI + (u - 0.5) * FRONT_SPAN
}
function elFor(v: number): number {
  return EL_TOP - (EL_TOP - EL_BOT) * Math.min(1, v / SKY_V)
}
function posFromAzEl(az: number, el: number, out = new Vector3()): Vector3 {
  const ce = Math.cos(el)
  return out.set(CANOPY_R * ce * Math.sin(az), CANOPY_R * Math.sin(el), CANOPY_R * ce * Math.cos(az))
}
const uvToArr = (uv: [number, number]): [number, number, number] => {
  const p = posFromAzEl(azFor(uv[0], 0), elFor(uv[1]))
  return [p.x, p.y, p.z]
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

export function SkyDome({ flow, colourSrc, count, speed = 0.05 }: Props) {
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
    const rng = mulberry32(0x5712a3)
    const positions: number[] = []
    const colors: number[] = []
    const aLen: number[] = []
    const aAcross: number[] = []
    const aPhase: number[] = []
    const indices: number[] = []
    let vbase = 0

    const t = new Vector3()
    const n = new Vector3()
    const perp = new Vector3()
    const eL = new Vector3()
    const eR = new Vector3()

    for (let i = 0; i < count; i++) {
      const tile = i % TILES
      let u = rng()
      let vv = rng() * SKY_V
      for (let a = 0; a < 8; a++) {
        const cc = sampleColour(colourSrc, u, vv)
        if (0.299 * cc[0] + 0.587 * cc[1] + 0.114 * cc[2] > 0.3) break // bright sky only, off the cypress
        u = rng()
        vv = rng() * SKY_V
      }
      const sign = rng() < 0.5 ? -1 : 1
      const phase = rng() * Math.PI * 2
      const halfW = 0.06 + 0.07 * rng()

      const trail: [number, number][] = []
      let hx = 0
      let hy = 0
      for (let k = 0; k < POINTS; k++) {
        trail.push([u, vv])
        const { theta } = sampleFlow(flow, u, vv)
        let cx = Math.cos(theta)
        let cy = Math.sin(theta)
        if (k === 0) {
          if (sign < 0) {
            cx = -cx
            cy = -cy
          }
        } else if (cx * hx + cy * hy < 0) {
          cx = -cx
          cy = -cy
        }
        hx = cx
        hy = cy
        u += cx * STEP_UV
        vv += cy * STEP_UV
        if (u < 0 || u > 1 || vv < 0 || vv > SKY_V) break
      }
      if (trail.length < 3) continue

      const P = trail.map(([tu, tvv]) => posFromAzEl(azFor(tu, tile), elFor(tvv), new Vector3()))
      const M = P.length
      for (let k = 0; k < M; k++) {
        const lenN = k / (M - 1)
        const w = halfW * (1 - 0.5 * lenN)
        t.subVectors(P[Math.min(M - 1, k + 1)], P[Math.max(0, k - 1)]).normalize()
        n.copy(P[k]).multiplyScalar(-1).normalize()
        perp.crossVectors(t, n).normalize()
        eL.copy(P[k]).addScaledVector(perp, w)
        eR.copy(P[k]).addScaledVector(perp, -w)
        const c = sampleColour(colourSrc, trail[k][0], trail[k][1])
        let r = c[0]
        let g = c[1]
        let b = c[2]
        if (b < r && b < g) {
          // foreground (cypress brown/green) leaked into the sky -> recolour to a sky tone so the
          // mirror lines disappear
          const l = 0.3 * r + 0.5 * g + 0.2 * b
          r = l * 0.82
          g = l * 0.9
          b = Math.min(1, l * 1.15 + 0.08)
        } else if (r > b) {
          // warm (the moon) -> pull toward blue so the tiling doesn't repeat yellow patches
          r = b + (r - b) * 0.45
          g = b + (g - b) * 0.7
        }
        positions.push(eL.x, eL.y, eL.z, eR.x, eR.y, eR.z)
        colors.push(r, g, b, r, g, b)
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
  }, [flow, colourSrc, count])

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

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[CANOPY_R + 4, 32, 24]} />
        <primitive object={gradient} attach="material" />
      </mesh>
      <mesh geometry={geometry} material={material} frustumCulled={false} />

      <mesh position={uvToArr(MOON_UV)}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#f2c233" emissive="#f2c233" emissiveIntensity={1.7} toneMapped={false} />
      </mesh>
      <pointLight position={uvToArr(MOON_UV)} intensity={20} distance={24} color="#f0d98a" />

      {STAR_UVS.map((uv, i) => (
        <mesh key={i} position={uvToArr(uv)}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#f6e08a" emissive="#f6e08a" emissiveIntensity={2.1} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
