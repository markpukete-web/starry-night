import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
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

function readPerfMode(): boolean {
  return queryValue('perf') === '1'
}

type PerfWindow = Window & {
  __perf?: {
    t: number[]
    info: {
      calls: number
      triangles: number
      points: number
      lines: number
      geometries: number
      textures: number
    } | null
  }
}

function setRendererInfoAutoReset(info: { autoReset: boolean }, autoReset: boolean) {
  info.autoReset = autoReset
}

/** Opt-in timing probe. `perf=1` leaves the selected presentation/debug pipeline untouched. */
function PerfProbe() {
  const { gl } = useThree()
  useEffect(() => {
    const previous = gl.info.autoReset
    // Accumulate every renderer pass, then reset once per measured frame.
    setRendererInfoAutoReset(gl.info, false)
    return () => {
      setRendererInfoAutoReset(gl.info, previous)
      gl.info.reset()
    }
  }, [gl])
  useFrame(() => {
    const browser = window as PerfWindow
    if (!browser.__perf) browser.__perf = { t: [], info: null }
    browser.__perf.t.push(performance.now())
    if (browser.__perf.t.length > 600) browser.__perf.t.shift()
    browser.__perf.info = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      points: gl.info.render.points,
      lines: gl.info.render.lines,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    }
    gl.info.reset()
  }, -1000)
  return null
}

function Scene({ reduced }: { reduced: boolean }) {
  const debug = readDebugMode()
  const view = readViewMode()
  const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  const camera = isPortrait && view === 'design' ? DIORAMA_CAMERAS.mobile : DIORAMA_CAMERAS[view]
  const background = useMemo(() => (debug === 'stage' ? '#071020' : '#06112a'), [debug])
  const measurePerformance = readPerfMode()

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
      {measurePerformance && <PerfProbe />}
      <Suspense fallback={null}>
        {debug !== 'flow' && <Diorama debug={debug === 'stage' ? 'stage' : 'final'} />}
        {debug !== 'stage' && <PaintingFlowSky3D paused={reduced} debug={debug === 'flow' ? 'flow' : 'final'} />}
      </Suspense>
      {/* Authored additive moon/star halos supply the glow. Full-frame bloom washes out the pale sky strokes. */}
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
