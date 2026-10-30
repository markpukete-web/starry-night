import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { buildCat, CAT, CAT_EYES, catBlink, catNeck, catPlace, catTail } from './cat.ts'
import { FROG } from './frog.ts'
import { easeLook, owlLook } from './owl.ts'
import { FOG, fogInjection } from './streetFog.ts'
import { lifeTime } from './streetLife.ts'
import { material, plainGeometry } from './streetMaterial.ts'
import type { StreetFlags } from './streetMode.ts'
import { vincentGround } from './streetWalk.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import type { ImageData2D } from './useImageData.ts'
import { vincentMoon, vincentStrokeBody, type VincentPart } from './vincent.ts'

type CatWindow = Window & {
  __skyTime?: number
  __cat?: () => {
    visible: boolean
    yaw: number
    pitch: number
    shut: number
    tail: number
    /** the head is at its target, or held under reduced motion */
    settled: boolean
  }
}

/**
 * The cat on wall W3 at stop 3 (`docs/superpowers/specs/2026-10-30-street-cat-design.md`): built and lit as the owl is
 * (`StreetOwl.tsx`), drawn within `CAT.draw` of the camera (stops 2 and 3), blinking on the sky's clock with its own
 * phase, its tail's free part swaying on that clock, and its head turning toward `vincentGround` by the owl's look with
 * the cat's wider cone. Reduced motion and Pause hold its eyes open, its tail still and its head pose in place.
 */
export default function StreetCat({ painting, flags, reduced }: { painting: ImageData2D; flags: StreetFlags; reduced: boolean }) {
  const build = useMemo(() => buildCat(painting), [painting])
  const { position: place, yaw } = useMemo(() => catPlace(), [])
  const neckStreet = useMemo(() => catNeck(), [])

  const materials = useMemo(() => {
    const ids = flags.ids > 0
    return {
      strokes: material(flags.light ? 'vincent-lit' : 'vincent', vincentStrokeBody(flags.light), fogInjection(FOG.colour), true, ids),
      solid: material(flags.light ? 'vincent-solid-lit' : 'vincent-solid', vincentMoon(flags.light), fogInjection(FOG.colour), false, ids),
    }
  }, [flags.light, flags.ids])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])

  const geometries = useMemo(() => {
    const pair = (part: VincentPart) => ({
      under: plainGeometry(part.underpaint, part.underpaint.cls),
      strokes: strokeGeometry(part.strokes.arrays, part.strokes.stroke, part.strokes.seed, undefined, part.strokes.cls),
    })
    return { body: pair(build.body), head: pair(build.head), tail: pair(build.tail), eye: plainGeometry(build.eye, build.eye.cls) }
  }, [build])
  useEffect(() => () => {
    for (const p of [geometries.body, geometries.head, geometries.tail]) { p.under.dispose(); p.strokes.dispose() }
    geometries.eye.dispose()
  }, [geometries])

  const catRef = useRef<Group | null>(null)
  const headRef = useRef<Group | null>(null)
  const tailRef = useRef<Group | null>(null)
  const eyeRefs = useRef<(Group | null)[]>([])
  const shutRef = useRef(0)
  const tailAngle = useRef(0)
  const visibleRef = useRef(false)
  const lookRef = useRef({ yaw: 0, pitch: 0, settled: true })
  const atRef = useRef(new Vector3())

  useFrame((state, delta) => {
    const w = window as CatWindow
    const time = lifeTime(w.__skyTime, state.clock.elapsedTime, reduced)
    const shut = catBlink(time)
    shutRef.current = shut
    eyeRefs.current.forEach((eye, i) => {
      if (!eye) return
      eye.position.y = CAT_EYES[i][1] - FROG.blink.sink * CAT.eye.r * CAT.size * shut
      eye.scale.setScalar(1 - (1 - FROG.blink.shrink) * shut)
    })
    tailAngle.current = catTail(time)
    if (tailRef.current) tailRef.current.rotation.y = tailAngle.current
    const cat = catRef.current
    if (cat) {
      const visible = cat.getWorldPosition(atRef.current).distanceTo(state.camera.position) < CAT.draw
      cat.visible = visible
      visibleRef.current = visible
    }
    if (!reduced) {
      const wanted = owlLook(neckStreet, yaw, vincentGround, CAT.look)
      lookRef.current.yaw = easeLook(lookRef.current.yaw, wanted.yaw, delta, CAT.look)
      lookRef.current.pitch = easeLook(lookRef.current.pitch, wanted.pitch, delta, CAT.look)
      lookRef.current.settled = lookRef.current.yaw === wanted.yaw && lookRef.current.pitch === wanted.pitch
      const head = headRef.current
      if (head) {
        head.rotation.order = 'YXZ'
        head.rotation.set(-lookRef.current.pitch, lookRef.current.yaw, 0)
      }
    }
  })

  useEffect(() => {
    const w = window as CatWindow
    w.__cat = () => ({
      visible: visibleRef.current,
      yaw: lookRef.current.yaw,
      pitch: lookRef.current.pitch,
      shut: shutRef.current,
      tail: tailAngle.current,
      settled: lookRef.current.settled,
    })
    return () => {
      delete w.__cat
    }
  }, [])

  return (
    <group ref={catRef} name="street-cat" position={place} rotation={[0, yaw, 0]}>
      <mesh geometry={geometries.body.under} material={materials.solid} renderOrder={4} />
      <mesh geometry={geometries.body.strokes} material={materials.strokes} renderOrder={5} />
      <group ref={tailRef} position={build.tailRoot}>
        <mesh geometry={geometries.tail.under} material={materials.solid} renderOrder={4} />
        <mesh geometry={geometries.tail.strokes} material={materials.strokes} renderOrder={5} />
      </group>
      <group ref={headRef} position={build.neck}>
        <mesh geometry={geometries.head.under} material={materials.solid} renderOrder={4} />
        <mesh geometry={geometries.head.strokes} material={materials.strokes} renderOrder={5} />
        {CAT_EYES.map((centre, i) => (
          <group key={i} ref={(g) => { eyeRefs.current[i] = g }} position={centre}>
            <mesh geometry={geometries.eye} material={materials.solid} renderOrder={4} />
          </group>
        ))}
      </group>
    </group>
  )
}
