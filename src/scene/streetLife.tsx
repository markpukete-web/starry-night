import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MirroredRepeatWrapping,
  PerspectiveCamera,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { injectAlive } from './aliveMaterial.ts'
import { mulberry32 } from './brush.ts'
import type { BrushArraysWithCls } from './streetGeometry.ts'
import { FOG, fogInjection } from './streetFog.ts'
import type { ImageData2D } from './useImageData.ts'
import { pathPoint, pathTangent, STREET_CHURCH, STREET_HOUSES, STREET_TREES } from './streetLayout.ts'
import { HILL_PAINT, LIFE, lifeTimeUniform, lifeTime, litWindows, hillsGeometry, LAMP_LIGHT, haloScaleOf } from './streetLife.ts'

/** The life's builds, each counted once: StrictMode runs a mount's effect twice in development on the same `parts`, and a
 * real rebuild is a new object. A count deleted in the effect's cleanup read 1 after any number of rebuilds (Fable C1). */
const countedBuilds = new WeakSet<object>()

function radialTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  return t
}

/** A soft-edged dark rectangle: the ground's shadow under a house (the footprint fills the middle 0.53). */
const FOOT_FILL = 68 / 128
function footprintTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  g.filter = 'blur(12px)'
  g.fillStyle = 'rgba(0,0,0,1)'
  g.fillRect(30, 30, 68, 68)
  return new CanvasTexture(canvas)
}

/** The hill paint as a texture, read from the loaded painting. */
function hillTexture(painting: ImageData2D): CanvasTexture {
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const x0 = Math.floor(HILL_PAINT[0] * sx)
  const y0 = Math.floor(HILL_PAINT[1] * sy)
  const w = Math.floor((HILL_PAINT[2] - HILL_PAINT[0]) * sx)
  const h = Math.floor((HILL_PAINT[3] - HILL_PAINT[1]) * sy)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * painting.width + x0 + x) * 4
      img.data.set([painting.data[i], painting.data[i + 1], painting.data[i + 2], 255], (y * w + x) * 4)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.wrapS = MirroredRepeatWrapping
  t.wrapT = MirroredRepeatWrapping
  return t
}

const FIREFLY_VERTEX = `
  uniform float uAliveTime;
  uniform float uScale;
  attribute float aPhase;
  varying float vBright;
  void main() {
    vec3 p = position;
    p.x += 0.05 * sin(uAliveTime * 0.29 + aPhase);
    p.y += 0.02 * sin(uAliveTime * 0.53 + aPhase * 1.7);
    p.z += 0.05 * cos(uAliveTime * 0.23 + aPhase * 0.6);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vBright = pow(max(0.0, sin(uAliveTime * 0.8 + aPhase * 2.3)), 4.0);
    gl_PointSize = uScale * (0.010 + 0.010 * vBright) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`
const FIREFLY_FRAGMENT = `
  uniform vec3 uColour;
  varying float vBright;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = exp(-r * r * 7.0) * (0.12 + 0.88 * vBright);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColour * a, a);
  }`

/** The street's living parts: fireflies over the path, a warm glow at each lit window and on the ground below it, the hills. */
export function StreetLife({
  windows,
  painting,
  reduced = false,
  lamps = [],
}: {
  windows: BrushArraysWithCls
  painting: ImageData2D
  reduced?: boolean
  lamps?: readonly { foot: Vector3; lantern: Vector3 }[]
}) {
  const haloRefs = useRef<(Sprite | null)[]>([])

  useFrame((state) => {
    // the sky's capture seam pins this clock too, so a capture is frame-exact
    const pinned = (window as Window & { __skyTime?: number }).__skyTime
    lifeTimeUniform.value = lifeTime(pinned, state.clock.elapsedTime, reduced)

    if (lamps.length > 0) {
      state.camera.updateMatrixWorld()
      const cam = state.camera as PerspectiveCamera
      for (let i = 0; i < lamps.length; i++) {
        const sprite = haloRefs.current[i]
        if (!sprite) continue
        const s = haloScaleOf(sprite, cam)
        sprite.scale.set(s, s, s)
      }
    }
  })

  const parts = useMemo(() => {
    const rand = mulberry32(0xf1f1)
    const n = LIFE.fireflies
    const pos = new Float32Array(n * 3)
    const phase = new Float32Array(n)
    const [tMin, tMax] = LIFE.fireflyT
    for (let i = 0; i < n; i++) {
      const t = tMin + rand() * (tMax - tMin)
      const [px, , pz] = pathPoint(t)
      const [tx, , tz] = pathTangent(t)
      const lateral = (rand() * 2 - 1) * 0.75
      pos.set([px - tz * lateral, 0.02 + rand() * rand() * 0.3, pz + tx * lateral], i * 3)
      phase[i] = rand() * 100
    }
    const flyGeometry = new BufferGeometry()
    flyGeometry.setAttribute('position', new BufferAttribute(pos, 3))
    flyGeometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
    const flyMaterial = new ShaderMaterial({
      uniforms: { uAliveTime: lifeTimeUniform, uScale: { value: 1400 }, uColour: { value: new Color(LIFE.glow) } },
      vertexShader: FIREFLY_VERTEX,
      fragmentShader: FIREFLY_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const texture = radialTexture()
    const glowMaterial = (strength: number) =>
      new MeshBasicMaterial({ map: texture, color: new Color(LIFE.glow).multiplyScalar(strength), transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false })
    const lampHalo = new SpriteMaterial({
      map: texture,
      color: new Color(LIFE.glow).multiplyScalar(LIFE.halo[1]),
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      toneMapped: false,
    })
    const hillPaint = hillTexture(painting)
    const hills = new MeshBasicMaterial({ map: hillPaint, vertexColors: true, side: DoubleSide, toneMapped: false })
    // the air between: the street's fog colour, reached far beyond the street's own fog
    injectAlive(hills, { key: 'street-hills', ...fogInjection(FOG.colour, 1.5, 10) })
    // the ground's contact shadow under each house and tree (Mark: "the house feels like a cardboard")
    const footTexture = footprintTexture()
    const foot = new MeshBasicMaterial({ map: footTexture, color: new Color(0, 0, 0), transparent: true, opacity: 0.65, depthWrite: false, toneMapped: false })
    const blob = new MeshBasicMaterial({ map: texture, color: new Color(0, 0, 0), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false })
    return { flyGeometry, flyMaterial, texture, pool: glowMaterial(LIFE.pool[1]), halo: glowMaterial(LIFE.halo[1]), lampHalo, hillsGeometry: hillsGeometry(), hills, hillPaint, footTexture, foot, blob }
  }, [painting])
  useEffect(() => () => {
    parts.flyGeometry.dispose()
    parts.flyMaterial.dispose()
    parts.texture.dispose()
    parts.pool.dispose()
    parts.halo.dispose()
    parts.lampHalo.dispose()
    parts.hillsGeometry.dispose()
    parts.hills.dispose()
    parts.hillPaint.dispose()
    parts.footTexture.dispose()
    parts.foot.dispose()
    parts.blob.dispose()
  }, [parts])

  useEffect(() => {
    if (countedBuilds.has(parts)) return
    countedBuilds.add(parts)
    const w = window as Window & { __streetLifeBuilds?: number }
    w.__streetLifeBuilds = (w.__streetLifeBuilds ?? 0) + 1
  }, [parts])

  const lit = useMemo(() => litWindows(windows), [windows])

  return (
    <group name="street-alive">
      <mesh name="street-hills" geometry={parts.hillsGeometry} material={parts.hills} renderOrder={-1} />
      {[...STREET_HOUSES, STREET_CHURCH.nave].map((h, i) => (
        <group key={`foot-${i}`} position={[h.x, 0.006, h.z]} rotation={[0, -h.yaw, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={parts.foot} renderOrder={3}>
            <planeGeometry args={[h.w / FOOT_FILL, h.d / FOOT_FILL]} />
          </mesh>
        </group>
      ))}
      {STREET_TREES.map((t, i) => (
        <mesh key={`blob-${i}`} position={[t.x, 0.006, t.z]} rotation={[-Math.PI / 2, 0, 0]} material={parts.blob} renderOrder={3}>
          <planeGeometry args={[0.5, 0.5]} />
        </mesh>
      ))}
      {lit.map((w, i) => {
        const pool = w.centre.clone().addScaledVector(w.normal, LIFE.pool[0] * 0.6).setY(0.003)
        const halo = w.centre.clone().addScaledVector(w.normal, 0.008)
        const yaw = Math.atan2(w.normal.x, w.normal.z)
        return (
          <group key={i}>
            <mesh position={pool.toArray()} rotation={[-Math.PI / 2, 0, 0]} material={parts.pool} renderOrder={4}>
              <planeGeometry args={[LIFE.pool[0] * 2, LIFE.pool[0] * 2]} />
            </mesh>
            <mesh position={halo.toArray()} rotation={[0, yaw, 0]} material={parts.halo} renderOrder={4}>
              <planeGeometry args={[LIFE.halo[0] * 2 + w.width, LIFE.halo[0] * 2 + w.width]} />
            </mesh>
          </group>
        )
      })}
      {lamps.map((lamp, i) => (
        <group key={`lamp-${i}`}>
          <mesh position={[lamp.foot.x, LAMP_LIGHT.poolY, lamp.foot.z]} rotation={[-Math.PI / 2, 0, 0]} material={parts.pool} renderOrder={4}>
            <planeGeometry args={[LIFE.pool[0] * 2, LIFE.pool[0] * 2]} />
          </mesh>
          <sprite
            ref={(el) => {
              haloRefs.current[i] = el
            }}
            position={lamp.lantern.toArray()}
            material={parts.lampHalo}
            renderOrder={4}
          />
        </group>
      ))}
      <points name="street-fireflies" geometry={parts.flyGeometry} material={parts.flyMaterial} renderOrder={5} />
    </group>
  )
}

export default StreetLife
