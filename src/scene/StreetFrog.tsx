import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshBasicMaterial, Vector3, type Group } from 'three'
import { buildFrog, FROG, FROG_EYES, frogBlink, frogPlace, FROGS } from './frog.ts'
import { FOG, fogInjection } from './streetFog.ts'
import { lifeTime } from './streetLife.ts'
import { material, plainGeometry } from './streetMaterial.ts'
import type { StreetFlags } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import type { ImageData2D } from './useImageData.ts'
import { vincentMoon, vincentStrokeBody } from './vincent.ts'

type FrogWindow = Window & {
  __skyTime?: number
  __frog?: () => { shut: number; sink: number; scale: number }
  __frogsDrawn?: () => { camera: number[]; frogs: { stop: number; visible: boolean; at: number[] }[] }
}

/**
 * The frogs (S3b pass 5, `frog.ts`), one by each stop over one build: lit by the moon as Vincent is, their eyes sinking
 * on the sky's clock, which the captures pin, so a capture at time 0 has them open and a capture at a blink is exact.
 * Reduced motion keeps them open. A frog is drawn only within its `draw` of the camera, so the walk's tight stretch
 * draws one at most, and a second frog drawn is far enough that nobody sees the two blink together.
 */
export default function StreetFrog({ painting, flags, reduced }: { painting: ImageData2D; flags: StreetFlags; reduced: boolean }) {
  const build = useMemo(() => buildFrog(painting), [painting])
  const places = useMemo(() => FROGS.map((f) => frogPlace(f)), [])

  const materials = useMemo(() => {
    const ids = flags.ids > 0
    // Vincent's keys: the same sources as his (`StreetWalk.tsx`), so the street compiles them once (Consultant F9)
    return {
      strokes: material(flags.light ? 'vincent-lit' : 'vincent', vincentStrokeBody(flags.light), fogInjection(FOG.colour), true, ids),
      solid: material(flags.light ? 'vincent-solid-lit' : 'vincent-solid', vincentMoon(flags.light), fogInjection(FOG.colour), false, ids),
      // the glint is a point of light, so the moon does not shade it
      glint: material('frog-glint', null, fogInjection(FOG.colour), false, ids),
      shadow: new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }),
    }
  }, [flags.light, flags.ids])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])

  const geometries = useMemo(() => ({
    bodyUnder: plainGeometry(build.body.underpaint, build.body.underpaint.cls),
    bodyStrokes: strokeGeometry(build.body.strokes.arrays, build.body.strokes.stroke, build.body.strokes.seed, undefined, build.body.strokes.cls),
    eye: plainGeometry(build.eye, build.eye.cls),
    glints: [plainGeometry(build.glints.right, build.glints.right.cls), plainGeometry(build.glints.left, build.glints.left.cls)],
    shadow: plainGeometry(build.shadow),
  }), [build])
  useEffect(() => () => { for (const g of Object.values(geometries).flat()) g.dispose() }, [geometries])

  // each frog's two eyes, frog by frog in `FROGS`' order
  const eyeRefs = useRef<(Group | null)[]>([])
  const frogRefs = useRef<(Group | null)[]>([])
  const shutRef = useRef(0)
  const at = useMemo(() => new Vector3(), [])
  const camera = useThree((s) => s.camera)
  useFrame((state) => {
    const w = window as FrogWindow
    const shut = frogBlink(lifeTime(w.__skyTime, state.clock.elapsedTime, reduced))
    shutRef.current = shut
    eyeRefs.current.forEach((eye, i) => {
      if (!eye) return
      eye.position.y = FROG_EYES[i % 2][1] - FROG.blink.sink * FROG.eye.r * FROG.size * shut
      eye.scale.setScalar(1 - (1 - FROG.blink.shrink) * shut)
    })
    frogRefs.current.forEach((frog, k) => {
      if (frog) frog.visible = frog.getWorldPosition(at).distanceTo(state.camera.position) < FROGS[k].draw
    })
  })
  // the check's seam (`check-street-grass.mjs` case 17): how shut, and how far stop 0's right eye and its glint have sunk
  useEffect(() => {
    const w = window as FrogWindow
    w.__frog = () => {
      const eye = eyeRefs.current[0]
      return { shut: shutRef.current, sink: eye ? FROG_EYES[0][1] - eye.position.y : 0, scale: eye?.scale.x ?? 1 }
    }
    // case 18's seam: what the frame's cull left drawn, with each group's world place and the camera's, so the check
    // judges the cull by distances of its own (the frogs' branch review, Codex F1)
    w.__frogsDrawn = () => ({
      camera: camera.position.toArray(),
      frogs: frogRefs.current.map((g, k) => ({ stop: FROGS[k].stop, visible: g?.visible ?? false, at: g ? g.getWorldPosition(new Vector3()).toArray() : [] })),
    })
    return () => {
      delete w.__frog
      delete w.__frogsDrawn
    }
  }, [camera])

  return (
    <>
      {FROGS.map((f, k) => (
        <group
          key={f.stop}
          name={`street-frog-${f.stop}`}
          ref={(g) => { frogRefs.current[k] = g }}
          position={places[k].position}
          rotation={[0, places[k].yaw, 0]}
          scale={f.scale}
        >
          <mesh geometry={geometries.bodyUnder} material={materials.solid} renderOrder={4} />
          <mesh geometry={geometries.bodyStrokes} material={materials.strokes} renderOrder={5} />
          {FROG_EYES.map((centre, i) => (
            <group key={i} ref={(g) => { eyeRefs.current[2 * k + i] = g }} position={centre}>
              <mesh geometry={geometries.eye} material={materials.solid} renderOrder={4} />
              <mesh geometry={geometries.glints[i]} material={materials.glint} renderOrder={4} />
            </group>
          ))}
          {flags.light && flags.ids === 0 && <mesh geometry={geometries.shadow} material={materials.shadow} renderOrder={3} />}
        </group>
      ))}
    </>
  )
}
