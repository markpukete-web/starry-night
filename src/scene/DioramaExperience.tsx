import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Diorama } from './Diorama'
import { PaintingFlowSky3D, type SkyStyle } from './PaintingFlowSky3D'
import type { AliveTuning } from './skyAlive'
import { emptyTouchStore, type TouchStore } from './touchSurge'
import { useTouchInput } from './useTouchInput'
import { emptyLandStore, type LandStore } from './landTouch'
import { ARRIVAL, ArrivalClock, arrivalCamera, arrivalFrame, rememberArrived } from './arrival'
// (ARRIVAL.reveal feeds the chrome's fade-in through a custom property; the clock owns every other constant)
import {
  DIORAMA_CAMERAS,
  DIORAMA_ORBIT,
  type DioramaDebugMode,
  type DioramaViewMode,
} from './dioramaContract'

type Props = {
  clean?: boolean
  reduced?: boolean
  /** The visitor's sky choice. */
  sky?: SkyStyle
  /** System reduced motion: forces the painted-light still whatever the choice. */
  still?: boolean
  /** Make-it-alive A behind `?alive=1`: the gust clock and breathing halos. */
  alive?: boolean
  /** The live knobs for A (`?gust=&lift=&shimmer=&breath=`). */
  aliveTuning?: AliveTuning
  /** B behind `?touch=1` (implies alive): surges of light from the pointer, kicks and flares. */
  touch?: boolean
  /** C behind `?arrival=1` (implies nothing): the painting, Vincent's line, the dissolve, the push (arrival.ts). */
  arrival?: boolean
  /** Visitor chrome (attribution, original placard, control dock) — rendered over the canvas. */
  children?: ReactNode
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

/**
 * `?perf=1` on screen: the frame rate over the probe's last 60 frames, so a phone can be read without a cable
 * (the locked bar is 30 fps on a mid-tier phone). DOM, outside the canvas, so no capture sees it.
 */
function PerfReadout() {
  const [text, setText] = useState('…')
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = (window as PerfWindow).__perf?.t ?? []
      const recent = t.slice(-60)
      if (recent.length < 2) return
      const fps = ((recent.length - 1) * 1000) / (recent[recent.length - 1] - recent[0])
      setText(`${fps.toFixed(0)} fps · ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}`)
    }, 500)
    return () => window.clearInterval(id)
  }, [])
  return <div className="perf-readout">{text}</div>
}

/** Capture seam: a finite `window.__arrivalTime` pins the arrival clock (with `__skyTime` in the same evaluation). */
type ArrivalWindow = Window & { __arrivalTime?: number }

/** C: the refs the scene, the driver and the layer share; plain refs, so no render runs per frame. */
type ArrivalRefs = {
  layerRef: RefObject<HTMLDivElement | null>
  scanRef: RefObject<HTMLImageElement | null>
  lineRef: RefObject<HTMLElement | null>
  skyReadyRef: RefObject<boolean>
  cypressReadyRef: RefObject<boolean>
  /** E2: the ground's strokes, which wait on the land's flow */
  landReadyRef: RefObject<boolean>
  /** the scan has loaded, or failed: either way the opening goes on */
  scanReadyRef: RefObject<boolean>
  /** a tap, click or key has asked to move on */
  skipRequestedRef: RefObject<boolean>
  /** the sky's step this frame while the arrival runs; null once done */
  arrivalStepRef: RefObject<number | null>
}

/**
 * C: runs the arrival clock and writes every frame's values: the camera along the home's axis, the sky's step,
 * the layer's styles. Priority −2: before drei's controls (−1, off during the arrival, so their update does not run)
 * and before the sky (0), which reads the camera's quaternion after this. The camera is pointed with the same
 * `lookAt` the controls' own update ends with, so the camera-locked sky stays at identity along the path.
 */
function ArrivalDriver({
  home,
  reduced,
  onDone,
  layerRef,
  scanRef,
  lineRef,
  skyReadyRef,
  cypressReadyRef,
  landReadyRef,
  scanReadyRef,
  skipRequestedRef,
  arrivalStepRef,
}: ArrivalRefs & {
  home: (typeof DIORAMA_CAMERAS)[keyof typeof DIORAMA_CAMERAS]
  reduced: boolean
  onDone: () => void
}) {
  const { camera } = useThree()
  const [clock] = useState(() => new ArrivalClock())
  const finishedRef = useRef(false)
  useFrame((_, dt) => {
    const a = clock.tick({
      dt,
      ready: skyReadyRef.current && cypressReadyRef.current && landReadyRef.current && scanReadyRef.current,
      skipRequested: skipRequestedRef.current,
      pinned: (window as ArrivalWindow).__arrivalTime,
      reduced,
    })
    // every frame, done included: the clock keeps the bounded step through the frame that ends the arrival and
    // hands the sky its own `dt` back from the frame after (code review F12)
    arrivalStepRef.current = clock.step
    if (finishedRef.current) return
    const f = arrivalFrame(a, reduced)
    camera.position.set(...arrivalCamera(home, f.push))
    camera.lookAt(home.target[0], home.target[1], home.target[2])
    const layer = layerRef.current
    if (layer) {
      // the ground and the scan fade apart: the sky shows around the painting before the painting melts into it
      layer.style.backgroundColor = `rgba(6, 17, 42, ${f.ground})`
      layer.style.visibility = f.overlay > 0 || f.ground > 0 ? 'visible' : 'hidden'
    }
    if (scanRef.current) {
      scanRef.current.style.transform = `scale(${f.scale})`
      scanRef.current.style.opacity = String(f.overlay)
    }
    if (lineRef.current) lineRef.current.style.opacity = String(f.line)
    if (f.done) {
      finishedRef.current = true
      onDone()
    }
  }, -2)
  return null
}

function Scene({
  reduced,
  sky,
  still,
  alive,
  aliveTuning,
  touch,
  arrival,
  arriving,
  onArrived,
  ...refs
}: ArrivalRefs & {
  reduced: boolean
  sky: SkyStyle
  still: boolean
  alive: boolean
  aliveTuning?: AliveTuning
  touch: boolean
  arrival: boolean
  arriving: boolean
  onArrived: () => void
}) {
  const debug = readDebugMode()
  const view = readViewMode()
  // R3F's `size` is the canvas size and re-renders on resize. Reading window.inner* here instead
  // left the camera stale until reload, so rotating a device kept the previous orientation's
  // framing — landscape→portrait held the desktop close-up (Codex, 2026-07-28).
  const { size } = useThree()
  const isPortrait = size.height > size.width
  const camera = isPortrait && view === 'design' ? DIORAMA_CAMERAS.mobile : DIORAMA_CAMERAS[view]
  const background = useMemo(() => (debug === 'stage' ? '#071020' : '#06112a'), [debug])
  const measurePerformance = readPerfMode()
  // The one sky clock (make-it-alive A, second pass): the sky's frame loop writes it (pinned, advanced, or 0 while
  // paused) and the foreground reads it, so the cypress and the windows keep the sky's time. With no sky
  // (`?debug=stage`) it stays 0 and the foreground stands still.
  const skyClock = useRef(0)
  // B: the touch store the input hook writes and the sky reads; off while paused (the sky clears it too)
  const touchStore = useRef<TouchStore>(emptyTouchStore())
  // D1: the land-touch store the hook writes and prunes; the cypress and the trees read it
  const landStore = useRef<LandStore>(emptyLandStore())
  const bendGain = aliveTuning?.bend ?? 1
  // C: no touch until the arrival is done; a tap during it is the skip
  useTouchInput({ enabled: touch && !reduced && !arriving, store: touchStore, clock: skyClock, home: camera, knob: aliveTuning?.surge ?? 1, land: touch ? { store: landStore, bendGain } : undefined })
  const landTouch = useMemo(() => (touch ? { store: landStore, clock: skyClock, bendGain } : undefined), [touch, bendGain])

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
        enabled={!arriving}
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
      {arrival && <ArrivalDriver home={camera} reduced={still} onDone={onArrived} {...refs} />}
      <Suspense fallback={null}>
        {debug !== 'flow' && <Diorama debug={debug === 'stage' ? 'stage' : 'final'} clock={skyClock} alive={alive} tuning={aliveTuning} cypressReady={arrival ? refs.cypressReadyRef : undefined} landReady={arrival ? refs.landReadyRef : undefined} touch={landTouch} />}
        {debug !== 'stage' && (
          <PaintingFlowSky3D
            paused={reduced}
            sky={sky}
            still={still}
            alive={alive}
            tuning={aliveTuning}
            clock={skyClock}
            touch={touch}
            touchStore={touchStore}
            arrivalStep={arrival ? refs.arrivalStepRef : undefined}
            ready={arrival ? refs.skyReadyRef : undefined}
            debug={debug === 'flow' ? 'flow' : 'final'}
            /* a stable module constant, so the sky's home quaternion memo holds across renders */
            home={camera}
          />
        )}
      </Suspense>
      {/* Authored additive moon/star halos supply the glow. Full-frame bloom washes out the pale sky strokes. */}
    </>
  )
}

/**
 * Vincent to Theo, Saint-Rémy, letter 777 (vangoghletters.org/vg/letters/let777/letter.html), between about
 * 31 May and 6 June 1889: "Ce matin j’ai vu la campagne de ma fenêtre longtemps avant le lever du soleil avec
 * rien que l’etoile du matin laquelle paraissait tres grande." The French is public domain; the English below
 * is this project's own rendering of it, not the edition's (© 2009 Van Gogh Museum / Huygens ING).
 */
function VincentsLine() {
  return (
    <>
      <p className="arrival-line">
        “This morning, long before sunrise, I looked out at the countryside from my window, with nothing but the
        morning star, which seemed very large.”
      </p>
      <p className="arrival-cite">Vincent to Theo, Saint-Rémy, June 1889 · letter 777</p>
    </>
  )
}

export function DioramaExperience({ clean = false, reduced = false, sky = 'light', still = false, alive = false, aliveTuning, touch = false, arrival = false, children }: Props) {
  const [arrived, setArrived] = useState(false)
  const arriving = arrival && !arrived
  // reduced motion: the line is a static caption with its own life, gone on the first pointer or key (review F1)
  const [captionShown, setCaptionShown] = useState(arrival && still)
  const layerRef = useRef<HTMLDivElement>(null)
  const scanRef = useRef<HTMLImageElement>(null)
  const lineRef = useRef<HTMLElement>(null)
  const skyReadyRef = useRef(false)
  const cypressReadyRef = useRef(false)
  const landReadyRef = useRef(false)
  const scanReadyRef = useRef(false)
  const skipRequestedRef = useRef(false)
  const arrivalStepRef = useRef<number | null>(null)
  const skip = () => {
    skipRequestedRef.current = true
  }
  useEffect(() => {
    if (!arriving || still) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        skipRequestedRef.current = true
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [arriving, still])
  useEffect(() => {
    if (!captionShown) return
    const dismiss = () => setCaptionShown(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') dismiss()
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', onKey)
    }
  }, [captionShown])
  const shellClass = `visitor-shell diorama-shell${clean ? ' is-clean-capture' : ''}${arrival ? ' has-arrival' : ''}${arriving ? ' is-arriving' : ''}`
  return (
    <main
      className={shellClass}
      style={arrival ? ({ '--arrival-reveal': `${ARRIVAL.reveal}ms` } as CSSProperties) : undefined}
      onPointerDown={arriving && !still ? skip : undefined}
    >
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Scene
          reduced={reduced}
          sky={sky}
          still={still}
          alive={alive}
          aliveTuning={aliveTuning}
          touch={touch}
          arrival={arrival}
          arriving={arriving}
          onArrived={() => {
            setArrived(true)
            rememberArrived()
          }}
          layerRef={layerRef}
          scanRef={scanRef}
          lineRef={lineRef}
          skyReadyRef={skyReadyRef}
          cypressReadyRef={cypressReadyRef}
          landReadyRef={landReadyRef}
          scanReadyRef={scanReadyRef}
          skipRequestedRef={skipRequestedRef}
          arrivalStepRef={arrivalStepRef}
        />
      </Canvas>
      {/* the layer lives exactly as long as the arrival: mounted later (a reduced-motion toggle after the end) it
          would be a fresh opaque curtain with no driver to fade it (code review F11) */}
      {arriving && !still && (
        <div className="arrival" ref={layerRef}>
          <figure className="arrival-painting">
            <img
              ref={scanRef}
              src="/reference/painting.jpg"
              alt="The Starry Night, Vincent van Gogh, 1889"
              draggable={false}
              onLoad={() => {
                scanReadyRef.current = true
              }}
              onError={() => {
                scanReadyRef.current = true
              }}
            />
            <figcaption ref={lineRef}>
              <VincentsLine />
            </figcaption>
          </figure>
        </div>
      )}
      {captionShown && still && (
        <div className="arrival-caption">
          <VincentsLine />
        </div>
      )}
      {readPerfMode() && <PerfReadout />}
      {children}
    </main>
  )
}
