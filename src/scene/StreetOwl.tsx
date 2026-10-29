import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { FROG } from './frog.ts'
import { buildOwl, easeLook, OWL, OWL_EYES, owlBlink, owlLook, owlPerch } from './owl.ts'
import { FOG, fogInjection } from './streetFog.ts'
import { lifeTime } from './streetLife.ts'
import { material, plainGeometry } from './streetMaterial.ts'
import type { StreetFlags } from './streetMode.ts'
import { vincentGround } from './streetWalk.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import type { ImageData2D } from './useImageData.ts'
import { vincentMoon, vincentStrokeBody } from './vincent.ts'

type OwlWindow = Window & {
  __skyTime?: number
  __owl?: () => {
    visible: boolean
    yaw: number
    pitch: number
    shut: number
    target: [number, number] | null
  }
}

/**
 * The barn owl on the church nave's ridge (`tasks/2026-10-29-church-owl-plan.md`, Task 1): built and lit as the frogs
 * are (`StreetFrog.tsx`), drawn within `OWL.draw` of the camera (stops 3 and 4), blinking on the sky's clock with its
 * own phase, and turning its head toward `vincentGround` when Vincent is within `OWL.look.reach` and `OWL.look.yaw`.
 * Reduced motion and Pause hold its eyes open and freeze its head pose in place.
 */
export default function StreetOwl({ painting, flags, reduced }: { painting: ImageData2D; flags: StreetFlags; reduced: boolean }) {
  const build = useMemo(() => buildOwl(painting), [painting])
  const { position: perch, yaw } = useMemo(() => owlPerch(), [])
  const neckStreet = useMemo<[number, number, number]>(
    () => [
      perch[0] + build.neck[0] * Math.cos(yaw) + build.neck[2] * Math.sin(yaw),
      perch[1] + build.neck[1],
      perch[2] - build.neck[0] * Math.sin(yaw) + build.neck[2] * Math.cos(yaw),
    ],
    [perch, yaw, build.neck],
  )

  const materials = useMemo(() => {
    const ids = flags.ids > 0
    return {
      strokes: material(flags.light ? 'vincent-lit' : 'vincent', vincentStrokeBody(flags.light), fogInjection(FOG.colour), true, ids),
      solid: material(flags.light ? 'vincent-solid-lit' : 'vincent-solid', vincentMoon(flags.light), fogInjection(FOG.colour), false, ids),
    }
  }, [flags.light, flags.ids])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])

  const geometries = useMemo(() => ({
    bodyUnder: plainGeometry(build.body.underpaint, build.body.underpaint.cls),
    bodyStrokes: strokeGeometry(build.body.strokes.arrays, build.body.strokes.stroke, build.body.strokes.seed, undefined, build.body.strokes.cls),
    headUnder: plainGeometry(build.head.underpaint, build.head.underpaint.cls),
    headStrokes: strokeGeometry(build.head.strokes.arrays, build.head.strokes.stroke, build.head.strokes.seed, undefined, build.head.strokes.cls),
    eye: plainGeometry(build.eye, build.eye.cls),
  }), [build])
  useEffect(() => () => { for (const g of Object.values(geometries)) g.dispose() }, [geometries])

  const owlRef = useRef<Group | null>(null)
  const headRef = useRef<Group | null>(null)
  const eyeRefs = useRef<(Group | null)[]>([])
  const shutRef = useRef(0)
  const visibleRef = useRef(false)
  const lookRef = useRef({ yaw: 0, pitch: 0 })
  const atRef = useRef(new Vector3())

  useFrame((state, delta) => {
    const w = window as OwlWindow
    const shut = owlBlink(lifeTime(w.__skyTime, state.clock.elapsedTime, reduced))
    shutRef.current = shut
    eyeRefs.current.forEach((eye, i) => {
      if (!eye) return
      eye.position.y = OWL_EYES[i][1] - FROG.blink.sink * OWL.eye.r * OWL.size * shut
      eye.scale.setScalar(1 - (1 - FROG.blink.shrink) * shut)
    })
    const owl = owlRef.current
    if (owl) {
      const visible = owl.getWorldPosition(atRef.current).distanceTo(state.camera.position) < OWL.draw
      owl.visible = visible
      visibleRef.current = visible
    }
    if (!reduced) {
      const wanted = owlLook(neckStreet, yaw, vincentGround)
      lookRef.current.yaw = easeLook(lookRef.current.yaw, wanted.yaw, delta)
      lookRef.current.pitch = easeLook(lookRef.current.pitch, wanted.pitch, delta)
      const head = headRef.current
      if (head) {
        head.rotation.order = 'YXZ'
        head.rotation.set(-lookRef.current.pitch, lookRef.current.yaw, 0)
      }
    }
  })

  useEffect(() => {
    const w = window as OwlWindow
    w.__owl = () => ({
      visible: visibleRef.current,
      yaw: lookRef.current.yaw,
      pitch: lookRef.current.pitch,
      shut: shutRef.current,
      target: vincentGround ? [vincentGround[0], vincentGround[1]] : null,
    })
    return () => {
      delete w.__owl
    }
  }, [])

  return (
    <group ref={owlRef} name="street-owl" position={perch} rotation={[0, yaw, 0]}>
      <mesh geometry={geometries.bodyUnder} material={materials.solid} renderOrder={4} />
      <mesh geometry={geometries.bodyStrokes} material={materials.strokes} renderOrder={5} />
      <group ref={headRef} position={build.neck}>
        <mesh geometry={geometries.headUnder} material={materials.solid} renderOrder={4} />
        <mesh geometry={geometries.headStrokes} material={materials.strokes} renderOrder={5} />
        {OWL_EYES.map((centre, i) => (
          <group key={i} ref={(g) => { eyeRefs.current[i] = g }} position={centre}>
            <mesh geometry={geometries.eye} material={materials.solid} renderOrder={4} />
          </group>
        ))}
      </group>
    </group>
  )
}
