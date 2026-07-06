import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense, useMemo } from 'react'
import { CANOPY_CAMERA, CANOPY_ORBIT } from './canopyContract'
import { FrontCanopySky } from './FrontCanopySky'
import { CanopyForegroundMatte } from './CanopyForegroundMatte'

type Props = {
  clean?: boolean
  reduced?: boolean
}

type CanopyDebug = 'final' | 'nopost' | 'edges' | 'sky-only'

function queryValue(name: string) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function Scene({ reduced }: { reduced: boolean }) {
  const debug = (queryValue('debug') ?? 'final') as CanopyDebug
  const foreground = queryValue('foreground') ?? 'matte'
  const skyOnly = debug === 'sky-only' || foreground === 'none'
  const usePost = debug !== 'nopost' && debug !== 'edges'
  const background = useMemo(() => '#07132e', [])

  return (
    <>
      <color attach="background" args={[background]} />
      <PerspectiveCamera
        makeDefault
        position={[...CANOPY_CAMERA.position]}
        fov={CANOPY_CAMERA.fov}
        near={CANOPY_CAMERA.near}
        far={CANOPY_CAMERA.far}
      />
      <OrbitControls
        target={[...CANOPY_CAMERA.target]}
        minAzimuthAngle={CANOPY_ORBIT.minAzimuthAngle}
        maxAzimuthAngle={CANOPY_ORBIT.maxAzimuthAngle}
        minPolarAngle={CANOPY_ORBIT.minPolarAngle}
        maxPolarAngle={CANOPY_ORBIT.maxPolarAngle}
        enablePan={CANOPY_ORBIT.enablePan}
        enableDamping={CANOPY_ORBIT.enableDamping}
      />
      <Suspense fallback={null}>
        <FrontCanopySky paused={reduced} debug={debug} />
        <CanopyForegroundMatte hidden={skyOnly} />
      </Suspense>
      {usePost && (
        <EffectComposer>
          <Bloom intensity={0.58} luminanceThreshold={0.32} mipmapBlur radius={0.45} />
        </EffectComposer>
      )}
    </>
  )
}

export function CanopyExperience({ clean = false, reduced = false }: Props) {
  return (
    <main className={`visitor-shell canopy-shell${clean ? ' is-clean-capture' : ''}`}>
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
        <Scene reduced={reduced} />
      </Canvas>
    </main>
  )
}
