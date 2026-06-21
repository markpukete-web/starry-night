import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, NoColorSpace, ShaderMaterial, Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { makeBrushTexture } from './brush'
import { PALETTE } from './palette'
import { DOME_R, buildVortices } from './skyMapping'
import { makeFlowField } from './flowField'
import { buildDabField } from './dabField'
import { buildDabGeometry, makeDabMaterial } from './dabGeometry'

// The sky as a full sphere of swirls grown NATIVELY on the dome — a flow field of vortices (the
// stars' halos and the central whorl), with streamlines flowing through it. Bold round Van Gogh
// swirls everywhere, organic, with no seam, no symmetry and no gaps. Stars sit at vortex centres.

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

// Each star is a radiant haloed orb, not a flat disc — a bright warm core easing through concentric
// cream falloff so Bloom blossoms it into the spiralling halo Van Gogh painted around every star. The
// glow budget moved here from the swirl eyes (P3, 2026-06-21). Additive, so it melts into the strokes.
function makeStarHaloTexture(): CanvasTexture {
  const s = 128
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,248,214,0.95)') // bright warm core
  g.addColorStop(0.18, 'rgba(250,232,150,0.55)')
  g.addColorStop(0.45, 'rgba(238,214,120,0.20)') // concentric falloff → ringed under Bloom
  g.addColorStop(0.75, 'rgba(228,210,150,0.05)')
  g.addColorStop(1, 'rgba(228,210,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

// The carved crescent — a bright gold disc with an offset disc erased out of it, so the lit belly
// sits lower-left and the concavity opens to the upper-right, as in the painting (the bite is taken
// from the upper-right). Earlier this was mirrored (bite lower-left) — Mark spotted the flip 2026-06-20.
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
  ctx.arc(cx + R * 0.5, cy - R * 0.5, R * 0.96, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}


const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const skyFrag = /* glsl */ `
  varying vec3 vDir; uniform vec3 uTop; uniform vec3 uBottom;
  void main() { float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0); }
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
  swirlTightness = 0.06,
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

  const brushTex = useMemo(() => {
    const t = makeBrushTexture()
    t.colorSpace = NoColorSpace // relief/alpha map, not colour — no sRGB decode on b.r/b.a
    return t
  }, [])
  const material = useMemo(() => makeDabMaterial(brushTex), [brushTex])

  const moonHaloTex = useMemo(() => makeMoonHalo(), [])
  const moonCrescentTex = useMemo(() => makeMoonCrescent(), [])
  const starHaloTex = useMemo(() => makeStarHaloTexture(), [])

  const geometry = useMemo(() => {
    const field = makeFlowField({ flow, vortices, swirlTightness: 0.45, flowBias })
    const dabs = buildDabField({ field, colourSrc, count })
    return buildDabGeometry(dabs)
  }, [flow, colourSrc, count, vortices, flowBias])

  // Advance the churn clock from the render loop — frozen when paused, so prefers-reduced-motion and
  // the pause button yield a still painting (no churn). An R3F render-target mutation that
  // intentionally sits outside React's immutable data flow, hence the scoped disable.
  useFrame((_, dt) => {
    if (paused) return
    // eslint-disable-next-line react-hooks/immutability -- R3F render-loop uniform write is intentional
    material.uniforms.uTime.value += dt
  })

  // Mirror the tuning props into the material uniforms via an effect (NOT useFrame) so they apply even
  // while paused. Otherwise an initial prefers-reduced-motion load — where useFrame early-returns every
  // frame — would keep the material defaults (width 1) and render a thinner, less-covered still than
  // the tuned scene. (uTime stays in useFrame so drift only advances when playing.)
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uWidth.value = strokeWidth
    material.uniforms.uSat.value = saturation
    material.uniforms.uDriftSpeed.value = speed * 4 // churn 0.05 → ~0.2 cycles/s; tunable
    material.uniforms.uDrift.value = swirlTightness // the repurposed 'drift (arc)' control
    /* eslint-enable react-hooks/immutability */
  }, [material, strokeWidth, saturation, speed, swirlTightness])

  // Freeze to a fully-covered still when paused (prefers-reduced-motion OR the visitor pause button):
  // uTime stops advancing AND uFreeze floors every dab's fade to full, so no birth/death holes appear.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uFreeze.value = paused ? 1 : 0
  }, [material, paused])

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
      brushTex.dispose()
      gradient.dispose()
      moonHaloTex.dispose()
      moonCrescentTex.dispose()
      starHaloTex.dispose()
    },
    [material, brushTex, gradient, moonHaloTex, moonCrescentTex, starHaloTex],
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

      {/* P3 (2026-06-21): each star is a radiant haloed orb — a big additive halo (sized by the star's
          own scale, so Venus reads as the single brightest after the moon) blossoming under Bloom around
          a small bright core, instead of the old flat gold disc. The 'glow' control now drives these. */}
      {stars.map((v, i) => {
        const p = v.dir.clone().multiplyScalar(DOME_R)
        const halo = v.scale * 15 // big radiant halo (Venus, scale 0.24, gets the largest → brightest star)
        const op = Math.min(1, glowIntensity * (0.35 + 0.6 * v.strength))
        return (
          <group key={i} position={p}>
            <sprite scale={[halo, halo, 1]} renderOrder={1}>
              <spriteMaterial map={starHaloTex} blending={AdditiveBlending} transparent opacity={op} depthWrite={false} toneMapped={false} />
            </sprite>
            {/* small bright core inside the big halo — the painting's stars are a tiny intense centre in a
                wide spiralling glow, not a solid gold ball. Bloom keeps the small core luminous. */}
            <mesh renderOrder={2}>
              <sphereGeometry args={[v.scale * 0.42, 16, 16]} />
              <meshStandardMaterial color="#fff4cf" emissive="#f6e08a" emissiveIntensity={starBright} toneMapped={false} />
            </mesh>
          </group>
        )
      })}

      {/* P2 (2026-06-21): the central whorl (and every flow swirl) no longer carries a luminous eye.
          The painting's swirl hearts are filled with flowing strokes, not light — the glow read as a
          dark-hole "eye". Dense, lengthened ribbons (P1) now fill the centre; the glow budget moves to
          the stars in P3. Only the moon keeps its halo. */}
    </group>
  )
}
