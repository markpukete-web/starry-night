import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense, useMemo } from 'react'
import { Diorama } from './Diorama'
import { PaintingFlowSky3D } from './PaintingFlowSky3D'
import {
  DIORAMA_CAMERAS,
  DIORAMA_ORBIT,
  type DioramaDebugMode,
  type DioramaViewMode,
} from './dioramaContract'

type Props = {
  clean?: boolean
  reduced?: boolean
}

function queryValue(name: string) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function readDebugMode(): DioramaDebugMode {
  const debug = queryValue('debug')
  return debug === 'nopost' || debug === 'stage' || debug === 'flow' ? debug : 'final'
}

function readViewMode(): DioramaViewMode {
  return queryValue('view') === 'orbit' ? 'orbit' : 'design'
}

function Scene({ reduced }: { reduced: boolean }) {
  const debug = readDebugMode()
  const view = readViewMode()
  const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  const camera = isPortrait && view === 'design' ? DIORAMA_CAMERAS.mobile : DIORAMA_CAMERAS[view]
  const background = useMemo(() => (debug === 'stage' ? '#071020' : '#06112a'), [debug])
  const usePost = debug === 'final'

  return (
    <>
      <color attach="background" args={[background]} />
      <PerspectiveCamera
        makeDefault
        position={[...camera.position]}
        fov={camera.fov}
        near={camera.near}
        far={camera.far}
      />
      <OrbitControls
        target={[...camera.target]}
        minDistance={DIORAMA_ORBIT.minDistance}
        maxDistance={DIORAMA_ORBIT.maxDistance}
        minAzimuthAngle={DIORAMA_ORBIT.minAzimuthAngle}
        maxAzimuthAngle={DIORAMA_ORBIT.maxAzimuthAngle}
        minPolarAngle={DIORAMA_ORBIT.minPolarAngle}
        maxPolarAngle={DIORAMA_ORBIT.maxPolarAngle}
        enablePan={DIORAMA_ORBIT.enablePan}
        enableDamping={DIORAMA_ORBIT.enableDamping}
      />
      <Suspense fallback={null}>
        {debug !== 'flow' && <Diorama debug={debug === 'stage' ? 'stage' : 'final'} />}
        {debug !== 'stage' && <PaintingFlowSky3D paused={reduced} debug={debug === 'flow' ? 'flow' : 'final'} />}
      </Suspense>
      {usePost && (
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.58} mipmapBlur radius={0.5} />
        </EffectComposer>
      )}
    </>
  )
}

export function DioramaExperience({ clean = false, reduced = false }: Props) {
  return (
    <main className={`visitor-shell diorama-shell${clean ? ' is-clean-capture' : ''}`}>
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Scene reduced={reduced} />
      </Canvas>
    </main>
  )
}
