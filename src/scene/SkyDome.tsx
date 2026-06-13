import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { mulberry32, sampleColour, sampleFlow } from './brush'

const DOME_R = 9 // gradient sky sphere
const STROKE_R = 7.6 // streamline shell (inside the dome)
const TILE = 1 // wrap the painting's flow once around the dome
const EL_MIN = -0.12
const EL_MAX = 1.5 // up to near the zenith
const POINTS = 18 // points traced per streamline
const STEP = 0.032 // integration step (radians)

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const skyFrag = /* glsl */ `
  varying vec3 vDir; uniform vec3 uTop; uniform vec3 uBottom;
  void main() { float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0); }
`

// Streamline ribbon: soft across, tapered ends, with paint flowing along its length over time.
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
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);                 // soft across the ribbon
    float taper = smoothstep(0.0, 0.14, vLen) * smoothstep(1.0, 0.85, vLen); // fade the ends
    float flow = 0.5 + 0.5 * sin(vLen * 7.0 - uTime * uSpeed + vPhase);   // paint flowing along the stroke
    vec3 col = vColor * (0.8 + 0.55 * flow);
    float a = edge * taper * 0.9;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`

type Props = { flow: ImageData2D; colourSrc: ImageData2D; count: number; speed?: number }

/**
 * Phase 1 (3D) — the sky as an enveloping dome of CHURNING SWIRLS. A gradient night sphere fills
 * every direction; over it, thousands of streamline ribbons trace the derived flow field's swirl
 * paths (so they read as Van Gogh's continuous brushstrokes, not dabs), with the paint flowing
 * along each stroke in the shader. GPU-animated — the main thread stays free for the orbit.
 */
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

  // Build all streamline ribbons into one geometry (once). Each streamline is integrated along the
  // flow field over the dome; a ribbon of triangles is laid along it, coloured from the painting.
  const geometry = useMemo(() => {
    const rng = mulberry32(0x5712a3)
    const positions: number[] = []
    const colors: number[] = []
    const aLen: number[] = []
    const aAcross: number[] = []
    const aPhase: number[] = []
    const indices: number[] = []
    let vbase = 0

    const uvOf = (az: number, el: number): [number, number] => [
      (((az / (Math.PI * 2)) * TILE) % 1 + 1) % 1,
      Math.min(1, Math.max(0, 1 - el / (Math.PI / 2))) * 0.6,
    ]
    const pt = (az: number, el: number): Vector3 => {
      const ce = Math.cos(el)
      return new Vector3(STROKE_R * ce * Math.sin(az), STROKE_R * Math.sin(el), STROKE_R * ce * Math.cos(az))
    }

    const t = new Vector3()
    const n = new Vector3()
    const perp = new Vector3()
    const edgeL = new Vector3()
    const edgeR = new Vector3()

    for (let i = 0; i < count; i++) {
      let az = rng() * Math.PI * 2
      let el = EL_MIN + rng() * (EL_MAX - EL_MIN)
      const sign = rng() < 0.5 ? -1 : 1
      const phase = rng() * Math.PI * 2
      const halfW = 0.045 + 0.05 * rng()

      const trail: { az: number; el: number }[] = []
      // carry a heading: the flow orientation is undirected (mod π), so without this the step can
      // flip 180° between samples and the streamline zigzags. Never reverse on the previous step.
      let hx = 0
      let hy = 0
      for (let k = 0; k < POINTS; k++) {
        trail.push({ az, el })
        const [u, v] = uvOf(az, el)
        const { theta } = sampleFlow(flow, u, v)
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
        az += (cx * STEP) / Math.max(0.25, Math.cos(el))
        el += cy * STEP
        if (el < EL_MIN - 0.15 || el > EL_MAX + 0.15) break
      }
      if (trail.length < 3) continue

      const P = trail.map((p) => pt(p.az, p.el))
      const M = P.length
      for (let k = 0; k < M; k++) {
        t.subVectors(P[Math.min(M - 1, k + 1)], P[Math.max(0, k - 1)]).normalize()
        n.copy(P[k]).multiplyScalar(-1).normalize() // inward
        perp.crossVectors(t, n).normalize()
        edgeL.copy(P[k]).addScaledVector(perp, halfW)
        edgeR.copy(P[k]).addScaledVector(perp, -halfW)
        const [u, v] = uvOf(trail[k].az, trail[k].el)
        const [r, g, b] = sampleColour(colourSrc, u, v)
        const lenN = k / (M - 1)
        positions.push(edgeL.x, edgeL.y, edgeL.z, edgeR.x, edgeR.y, edgeR.z)
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

  const meshRef = useRef<Mesh>(null)

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
        <sphereGeometry args={[DOME_R, 32, 24]} />
        <primitive object={gradient} attach="material" />
      </mesh>
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
