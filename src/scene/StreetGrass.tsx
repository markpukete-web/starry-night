import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  ClampToEdgeWrapping,
  DataTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Plane,
  Raycaster,
  RGFormat,
  Sphere,
  UnsignedByteType,
  Vector2,
  Vector3,
} from 'three'
import { bladeTemplate, GRASS_BLADE } from './grassBlade.ts'
import { buildGrassMaterial } from './grassShader.ts'
import {
  grassChunks,
  grassDrawCount,
  grassRect,
  type GrassChunk,
} from './streetGrass.ts'
import { createTrail, stampSegment, stepTrail, TRAIL } from './grassTrail.ts'
import { STATION_T, vincentPlace } from './streetLayout.ts'
import type { StreetFlags } from './streetMode.ts'
import { admitGesture, streetGesture } from './streetWalk.ts'
import type { ImageData2D } from './useImageData.ts'

export type StreetGrassProps = {
  painting: ImageData2D
  flags: StreetFlags
  offset: [number, number, number]
  reduced: boolean
  still: boolean
}

export default function StreetGrass({
  painting,
  flags,
  offset,
  reduced,
  still,
}: StreetGrassProps) {
  const { camera, gl } = useThree()

  // 1. Chunks & Bounding Rect
  const chunks = useMemo<GrassChunk[]>(() => grassChunks(painting), [painting])
  const rect = useMemo(() => grassRect(chunks), [chunks])

  // 2. Trail Map & Texture
  const trail = useMemo(() => createTrail(rect), [rect])
  const texture = useMemo(() => {
    const tex = new DataTexture(
      trail.bytes,
      trail.size[0],
      trail.size[1],
      RGFormat,
      UnsignedByteType,
    )
    tex.minFilter = LinearFilter
    tex.magFilter = LinearFilter
    tex.wrapS = ClampToEdgeWrapping
    tex.wrapT = ClampToEdgeWrapping
    tex.generateMipmaps = false
    tex.needsUpdate = true
    return tex
  }, [trail])

  // 3. Grass Material
  const grassMat = useMemo(() => {
    return buildGrassMaterial(texture, rect, flags.ids === 1, flags.light && flags.ids === 0)
  }, [texture, rect, flags.ids, flags.light])

  useEffect(() => {
    return () => {
      grassMat.dispose()
      texture.dispose()
    }
  }, [grassMat, texture])

  // 4. Geometries per chunk
  const chunkGeometries = useMemo(() => {
    const tmpl = bladeTemplate()
    return chunks.map((chunk) => {
      const geom = new InstancedBufferGeometry()
      geom.instanceCount = chunk.blades.length
      geom.setIndex(tmpl.indices)
      geom.setAttribute(
        'position',
        new BufferAttribute(new Float32Array(tmpl.positions), 3),
      )
      geom.setAttribute(
        'aStroke',
        new BufferAttribute(new Float32Array(tmpl.stroke), 2),
      )
      geom.setAttribute(
        'color',
        new BufferAttribute(
          new Float32Array((tmpl.positions.length / 3) * 3).fill(1),
          3,
        ),
      )

      const n = chunk.blades.length
      const aRoot = new Float32Array(n * 2)
      const aYaw = new Float32Array(n)
      const aHeight = new Float32Array(n)
      const aHalfWidth = new Float32Array(n)
      const aLean = new Float32Array(n)
      const aCurl = new Float32Array(n)
      const aBladeColour = new Float32Array(n * 3)
      const aTopColour = new Float32Array(n * 3)
      const aSeed = new Float32Array(n)
      const aClass = new Float32Array(n).fill(9)

      for (let i = 0; i < n; i++) {
        const b = chunk.blades[i]
        aRoot[i * 2] = b.x
        aRoot[i * 2 + 1] = b.z
        aYaw[i] = b.yaw
        aHeight[i] = b.height
        aHalfWidth[i] = b.halfWidth
        aLean[i] = b.lean
        aCurl[i] = b.curl
        aBladeColour[i * 3] = b.colour[0]
        aBladeColour[i * 3 + 1] = b.colour[1]
        aBladeColour[i * 3 + 2] = b.colour[2]
        aTopColour.set(b.topColour, i * 3)
        aSeed[i] = b.seed
      }

      geom.setAttribute('aRoot', new InstancedBufferAttribute(aRoot, 2))
      geom.setAttribute('aYaw', new InstancedBufferAttribute(aYaw, 1))
      geom.setAttribute('aHeight', new InstancedBufferAttribute(aHeight, 1))
      geom.setAttribute('aHalfWidth', new InstancedBufferAttribute(aHalfWidth, 1))
      geom.setAttribute('aLean', new InstancedBufferAttribute(aLean, 1))
      geom.setAttribute('aCurl', new InstancedBufferAttribute(aCurl, 1))
      geom.setAttribute('aBladeColour', new InstancedBufferAttribute(aBladeColour, 3))
      geom.setAttribute('aTopColour', new InstancedBufferAttribute(aTopColour, 3))
      geom.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1))
      geom.setAttribute('aClass', new InstancedBufferAttribute(aClass, 1))

      geom.boundingSphere = new Sphere(
        new Vector3(...chunk.sphere.centre),
        chunk.sphere.radius,
      )
      return geom
    })
  }, [chunks])

  useEffect(() => {
    return () => {
      for (const g of chunkGeometries) g.dispose()
    }
  }, [chunkGeometries])

  // 5. Hand listeners & cursor
  const handRef = useRef<{
    client: [number, number] | null
    active: boolean
    isOverride: boolean
    /** the touch or pen that went down on the verge, for when the walk tracks no gesture (`?walk=0`) */
    pointerId: number | null
  }>({
    client: null,
    active: false,
    isOverride: false,
    pointerId: null,
  })

  /* eslint-disable react-hooks/immutability -- canvas cursor and pointer handlers */
  useEffect(() => {
    const canvas = gl.domElement
    const prevCursor = canvas.style.cursor
    canvas.style.cursor = 'grab'
    // a touch on the verge is the grass's, not a page pan, also with `?walk=0`, where the walk sets nothing (PR #22)
    const prevTouchAction = canvas.style.touchAction
    canvas.style.touchAction = 'none'

    const onPointerMove = (e: PointerEvent) => {
      if (handRef.current.isOverride) return
      const rect = canvas.getBoundingClientRect()
      const inside =
        e.target === canvas &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (e.pointerType === 'mouse') {
        if (streetGesture && streetGesture.vincent) {
          handRef.current.active = false
          return
        }
        handRef.current.active = inside
        if (inside) handRef.current.client = [e.clientX, e.clientY]
      } else {
        // the walk's gesture when the walk tracks one, else the grass's own down: with `?walk=0` nothing sets the
        // street gesture, and a touch-drag bent only its first spot (Codex, PR #22)
        const owner = streetGesture ? (streetGesture.vincent ? null : streetGesture.pointerId) : handRef.current.pointerId
        if (owner === e.pointerId) {
          handRef.current.active = inside
          if (inside) handRef.current.client = [e.clientX, e.clientY]
        }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (handRef.current.isOverride) return
      const rect = canvas.getBoundingClientRect()
      const inside =
        e.target === canvas &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (!inside || !e.isPrimary) {
        handRef.current.active = false
        handRef.current.pointerId = null
        return
      }

      const box =
        flags.vincent && (window as unknown as { __vincentBox?: () => { x0: number; x1: number; y0: number; y1: number } }).__vincentBox
          ? (window as unknown as { __vincentBox: () => { x0: number; x1: number; y0: number; y1: number } }).__vincentBox()
          : null
      const isVincent = admitGesture(box, e.clientX, e.clientY) === 'vincent'
      if (isVincent) {
        handRef.current.active = false
        handRef.current.pointerId = null
      } else {
        handRef.current.active = true
        handRef.current.client = [e.clientX, e.clientY]
        handRef.current.pointerId = e.pointerType === 'mouse' ? null : e.pointerId
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (handRef.current.isOverride) return
      if (e.pointerType !== 'mouse') {
        if (streetGesture === null || streetGesture.pointerId === e.pointerId) {
          handRef.current.active = false
          handRef.current.client = null
          handRef.current.pointerId = null
        }
      }
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (handRef.current.isOverride) return
      if (streetGesture === null || streetGesture.pointerId === e.pointerId) {
        handRef.current.active = false
        handRef.current.client = null
        handRef.current.pointerId = null
      }
    }

    const onMouseLeave = () => {
      if (handRef.current.isOverride) return
      if (handRef.current.active && !streetGesture) {
        handRef.current.active = false
      }
    }

    // a blur or a hidden page ends the real hand: its pointerup may never reach the page, and the last hit would keep
    // pressing the verge (Codex F01). The capture seam keeps its own state.
    const onBlurOrHidden = () => {
      if (handRef.current.isOverride) return
      handRef.current.active = false
      handRef.current.client = null
      handRef.current.pointerId = null
    }

    const onVisibilityChange = () => {
      if (document.hidden) onBlurOrHidden()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('blur', onBlurOrHidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.documentElement.addEventListener('pointerleave', onMouseLeave)

    return () => {
      canvas.style.cursor = prevCursor
      canvas.style.touchAction = prevTouchAction
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onBlurOrHidden)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.documentElement.removeEventListener('pointerleave', onMouseLeave)
    }
  }, [gl.domElement, flags.vincent])
  /* eslint-enable react-hooks/immutability */

  // 6. Capture seams
  const totalBlades = useMemo(
    () => chunks.reduce((acc, ch) => acc + ch.blades.length, 0),
    [chunks],
  )
  const stampsRef = useRef({ hand: 0, feet: 0 })

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__grassCount = totalBlades
    w.__grassStamps = stampsRef.current
    w.__grassPeak = 0
    w.__grassPushNear = (x: number, z: number, r: number): number => {
      let maxNear = 0
      const [x0, z0] = trail.rect
      const cols = trail.size[0]
      const rSq = r * r
      for (const [idx] of trail.live) {
        const c = idx % cols
        const row = Math.floor(idx / cols)
        const cx = x0 + (c + 0.5) * TRAIL.texel
        const cz = z0 + (row + 0.5) * TRAIL.texel
        const dx = cx - x
        const dz = cz - z
        if (dx * dx + dz * dz <= rSq) {
          const px = (trail.bytes[idx * 2] - 128) / 127
          const pz = (trail.bytes[idx * 2 + 1] - 128) / 127
          const mag = Math.hypot(px, pz)
          if (mag > maxNear) maxNear = mag
        }
      }
      return maxNear
    }
    w.__grassHandLive = 0
    w.__grassHit = null
    w.__grassHand = (x: number | null, y?: number) => {
      if (x === null || y === undefined) {
        handRef.current.isOverride = false
        handRef.current.active = false
        handRef.current.client = null
      } else {
        handRef.current.isOverride = true
        handRef.current.active = true
        handRef.current.client = [x, y]
      }
    }

    return () => {
      delete w.__grassCount
      delete w.__grassStamps
      delete w.__grassPeak
      delete w.__grassPushNear
      delete w.__grassHandLive
      delete w.__grassHit
      delete w.__grassHand
    }
  }, [totalBlades, trail])

  // 7. Raycaster & Planes
  const raycaster = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const castPlane = useMemo(
    () =>
      new Plane(
        new Vector3(0, 1, 0),
        -(offset[1] + GRASS_BLADE.height * 0.5),
      ),
    [offset],
  )
  const hitWorld = useMemo(() => new Vector3(), [])
  const lastHandHitRef = useRef<[number, number] | null>(null)
  const lastFeetHitRef = useRef<[number, number] | null>(null)
  const lastFeetTRef = useRef<number | null>(null)

  // 8. Frame loop (priority 0: after walk places camera)
  /* eslint-disable react-hooks/immutability -- R3F render loop mutations: instanceCount and trail bytes */
  useFrame((state) => {
    const now = state.clock.elapsedTime

    // Draw counts per chunk
    const camWorld = camera.position
    const camStreet: [number, number, number] = [
      camWorld.x - offset[0],
      camWorld.y - offset[1],
      camWorld.z - offset[2],
    ]
    for (let i = 0; i < chunks.length; i++) {
      chunkGeometries[i].instanceCount = grassDrawCount(chunks[i], camStreet)
    }

    // Motion & pause mode
    const isPaused = reduced && !still
    const mode: 'swing' | 'settle' | 'frozen' = isPaused
      ? 'frozen'
      : still
        ? 'settle'
        : 'swing'

    // Hand raycasting
    const w = window as unknown as Record<string, unknown>
    const streetWalk = w.__streetWalk as { t?: number } | undefined
    const walkT = streetWalk?.t ?? (flags.walkT ?? STATION_T[flags.station])

    let currentHandHit: [number, number] | null = null
    let hitRecorded: { x: number; z: number; t: number } | null = null

    if (handRef.current.active && handRef.current.client) {
      const [cx, cy] = handRef.current.client
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((cx - rect.left) / rect.width) * 2 - 1
      const ndcY = -((cy - rect.top) / rect.height) * 2 + 1

      ndc.set(ndcX, ndcY)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.ray.intersectPlane(castPlane, hitWorld)
      if (hit) {
        const hitStreetX = hit.x - offset[0]
        const hitStreetZ = hit.z - offset[2]
        const [x0, z0, rw, rd] = trail.rect
        if (
          hitStreetX >= x0 &&
          hitStreetX <= x0 + rw &&
          hitStreetZ >= z0 &&
          hitStreetZ <= z0 + rd
        ) {
          currentHandHit = [hitStreetX, hitStreetZ]
          hitRecorded = { x: hit.x, z: hit.z, t: walkT }
        }
      }
    }

    w.__grassHit = hitRecorded

    if (currentHandHit) {
      if (mode !== 'frozen') {
        stampSegment(
          trail,
          lastHandHitRef.current,
          currentHandHit,
          TRAIL.radius,
          now,
          'hand',
        )
        stampsRef.current.hand++
      }
      lastHandHitRef.current = currentHandHit
    } else {
      lastHandHitRef.current = null
    }

    // Vincent's feet
    if (flags.vincent && mode === 'swing') {
      const jumped =
        lastFeetTRef.current !== null &&
        Math.abs(walkT - lastFeetTRef.current) > 0.05

      if (jumped) {
        lastFeetHitRef.current = null
      }

      const { position: vPos } = vincentPlace(walkT)
      const feetPos: [number, number] = [vPos[0], vPos[2]]
      stampSegment(
        trail,
        lastFeetHitRef.current,
        feetPos,
        TRAIL.feet,
        now,
        'feet',
      )
      lastFeetHitRef.current = feetPos
      stampsRef.current.feet++
      lastFeetTRef.current = walkT
    } else {
      lastFeetHitRef.current = null
      lastFeetTRef.current = null
    }

    // Step trail
    const changed = stepTrail(trail, now, mode)
    if (changed) {
      texture.needsUpdate = true
    }

    // Update seams
    let peak = 0
    let handLive = 0
    for (const [idx, texel] of trail.live) {
      if (texel.source === 'hand') handLive++
      const px = (trail.bytes[idx * 2] - 128) / 127
      const pz = (trail.bytes[idx * 2 + 1] - 128) / 127
      const mag = Math.hypot(px, pz)
      if (mag > peak) peak = mag
    }

    w.__grassPeak = peak
    w.__grassHandLive = handLive
  }, 0)
  /* eslint-enable react-hooks/immutability */

  return (
    <group name="street-grass">
      {chunks.map((_, i) => (
        <mesh
          key={i}
          name={`street-grass-${i}`}
          geometry={chunkGeometries[i]}
          material={grassMat}
          renderOrder={2}
          frustumCulled={true}
        />
      ))}
    </group>
  )
}
