import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Camera, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { Diorama } from './Diorama'
import { PaintingFlowSky3D, type SkyStyle } from './PaintingFlowSky3D'
import type { AliveTuning } from './skyAlive'
import { emptyTouchStore, type TouchStore } from './touchSurge'
import { useTouchInput } from './useTouchInput'
import { emptyLandStore, type LandStore } from './landTouch'
import { ARRIVAL, ARRIVAL_CUE, ArrivalClock, CUE_FADE, VINCENTS_CITE, VINCENTS_LINE, arrivalCamera, arrivalFrame, boundedDt, rememberArrived } from './arrival'
import { dropBootCurtain, keepBootCurtain } from '../bootCurtain'
import { isStreetMode, streetIdsPass, streetSkyAnchor, touchEnabled } from './streetEntry'
import {
  controlsEnabled,
  dioramaVisible,
  flightPose,
  flightStep,
  PORTAL,
  portalStep,
  streetMounted,
  type PortalEvent,
  type PortalPlace,
  type Pose,
} from './portal'
import { usePortalPointer } from './usePortalPointer'
import { PortalContext, type PortalControl } from './portalContext'
// (ARRIVAL.reveal feeds the chrome's fade-in through a custom property; the clock owns every other constant)
import {
  DIORAMA_CAMERAS,
  DIORAMA_ORBIT,
  type DioramaDebugMode,
  type DioramaViewMode,
} from './dioramaContract'

const loadStreet = () => import('./Street')
const Street = lazy(loadStreet)

/**
 * A street chunk that fails to load leaves the sky alone, settled, as a failed asset does (`streetReadiness`), rather
 * than unmounting the page through the canvas (Fable R11). Through the portal, `onFailed` turns the portal off for the
 * page's life: `React.lazy` keeps the rejection, so every later entry would fail at once (plan review F7).
 */
class StreetBoundary extends Component<{ children: ReactNode; onFailed?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    ;(window as Window & { __streetReady?: boolean }).__streetReady = true
    this.props.onFailed?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

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
  /** The portal behind `?portal=1` (slice 4): the village enters the street, and the street returns. */
  portal?: boolean
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
  /** the loading cue under the citation */
  cueRef: RefObject<HTMLParagraphElement | null>
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
  cueRef,
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
  const cueLevelRef = useRef(1)
  useFrame((_, dt) => {
    const pinned = (window as ArrivalWindow).__arrivalTime
    const a = clock.tick({
      dt,
      ready: skyReadyRef.current && cypressReadyRef.current && landReadyRef.current && scanReadyRef.current,
      skipRequested: skipRequestedRef.current,
      // loaded, not failed: a painting that never drew credits nothing (the loading read's P3)
      shown: Boolean(scanRef.current?.complete && scanRef.current.naturalWidth > 0),
      pinned,
      reduced,
    })
    // the loading curtain: `#boot` stands in for this layer until the wait ends, then this layer holds and dissolves;
    // the cue fades over the clock's own seconds, and at once under a pin, so a capture is exact
    if (!clock.waiting) dropBootCurtain()
    cueLevelRef.current = clock.waiting ? 1 : Number.isFinite(pinned) ? 0 : Math.max(0, cueLevelRef.current - boundedDt(dt) / CUE_FADE)
    if (cueRef.current) cueRef.current.style.opacity = String(cueLevelRef.current)
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
      // never a half-loaded scan: after a timeout the curtain can open while it still draws in strips
      scanRef.current.style.opacity = String(scanReadyRef.current ? f.overlay : 0)
    }
    if (lineRef.current) lineRef.current.style.opacity = String(f.line)
    if (f.done) {
      finishedRef.current = true
      onDone()
    }
  }, -2)
  return null
}

type ControlsRef = RefObject<ComponentRef<typeof OrbitControls> | null>
type Lens = { fov: number; near: number; far: number }

/** The portal's state for one entry, written by the handlers and the driver; plain refs, so no render runs per frame. */
type PortalDrive = {
  /** the place the driver last ran in: a new place starts its clock and may send its one event again */
  seen: PortalPlace
  /** the flight's progress, 0 to 1 */
  s: number
  /** the pose the flight leaves from */
  from: Pose
  /** seconds in this place, at most `ARRIVAL.maxDt` from a frame */
  t: number
  /** frames run since the street reported ready */
  settled: number
  /** the street's report for this entry: null until it comes */
  ok: boolean | null
  /** this place's one event has been sent */
  sent: boolean
}

/** What the scene needs from the portal, given while `?portal=1` is on, even after a failed chunk turns it off. */
type ScenePortal = {
  /** the pointer, the hint and the sky's mask: off for the page's life after a failed chunk (plan review F7) */
  on: boolean
  send: (event: PortalEvent) => void
  drive: RefObject<PortalDrive>
  controlsRef: ControlsRef
  layerRef: RefObject<HTMLCanvasElement | null>
  hintRef: RefObject<HTMLDivElement | null>
  enter: () => void
  prefetch: () => void
  /** `drift` starts the layer's slow push-in: the flight's end only, never the cut or the way back */
  copyToLayer: (drift?: boolean) => void
  onStreetReady: (ok: boolean) => void
  onStreetFailed: () => void
}

function writeLens(camera: Camera, lens: Lens) {
  const c = camera as PerspectiveCameraImpl
  c.fov = lens.fov
  c.near = lens.near
  c.far = lens.far
  c.updateProjectionMatrix()
}

type CameraView = { quaternion: number[]; lens: Lens }
const viewOf = (c: PerspectiveCameraImpl): CameraView => ({ quaternion: c.quaternion.toArray(), lens: { fov: c.fov, near: c.near, far: c.far } })

/**
 * The portal (tasks/2026-10-25-street-portal-plan.md, decisions (c) to (f) and (k)). Flying, it moves the camera from
 * the saved pose to v2's and writes the default camera's lens every frame, since a rotation re-applies it through the
 * prop diff (plan review F3); at the end it copies the canvas into the layer and sends `flown`. Entering, it waits for
 * the street's report and two drawn frames, or the timeout. In the street it fades the layer. Leaving, it restores the
 * diorama's pose and lens before the first frame, fades the layer and sends `left`. Under system reduced motion
 * (`still`) there is no flight and every fade is a cut. Priority −2, as the arrival's driver: before drei's controls
 * (−1, off outside the diorama) and the sky (0).
 */
function PortalDriver({
  place,
  still,
  lens,
  portal: { send, drive, controlsRef, layerRef, copyToLayer },
}: {
  place: PortalPlace
  still: boolean
  lens: Lens
  portal: ScenePortal
}) {
  const { camera } = useThree()
  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: the camera, the controls, the layer's style */
  useFrame((_, dt) => {
    const d = drive.current
    if (d.seen !== place) {
      d.seen = place
      d.t = 0
      d.settled = 0
      d.sent = false
      if (place === 'leaving') {
        // with damping off, one update applies and clears the residual delta before the reset puts the pose back
        // (plan decision (f)); the reset recomputes the orbit from a pose inside the limits, so it holds
        const controls = controlsRef.current
        if (controls) {
          const damping = controls.enableDamping
          controls.enableDamping = false
          controls.update()
          controls.reset()
          controls.enableDamping = damping
        }
        writeLens(camera, lens)
      }
    } else {
      d.t += boundedDt(dt)
    }
    const layer = layerRef.current
    // true once the layer is gone
    const fade = (seconds: number) => {
      if (!layer || layer.style.visibility !== 'visible') return true
      const opacity = still ? 0 : Math.max(0, 1 - d.t / seconds)
      layer.style.opacity = String(opacity)
      if (opacity > 0) return false
      layer.style.visibility = 'hidden'
      layer.classList.remove('is-drifting')
      return true
    }
    if (place === 'flying') {
      if (!still) {
        // the capture seam: a finite `__portalFlight` pins the flight's progress, as `__arrivalTime` pins the arrival
        const pinned = (window as PortalWindow).__portalFlight
        d.s = pinned !== undefined && Number.isFinite(pinned) ? Math.min(1, Math.max(0, pinned)) : flightStep(d.s, dt)
        const pose = flightPose(d.from, PORTAL.flightEnd, d.s)
        camera.position.set(...pose.position)
        camera.lookAt(...pose.target)
        writeLens(camera, lens)
      }
      // the copy holds the frame drawn before this one, where the ease's slope is zero. System reduced motion turned
      // on mid-flight ends the flight here, on the frame on screen, with no drift (Codex branch review F3)
      if ((still || d.s >= 1) && !d.sent) {
        d.sent = true
        copyToLayer(!still)
        send('flown')
      }
    } else if (place === 'entering' && !d.sent) {
      if (d.ok === true && ++d.settled > PORTAL.settleFrames) {
        d.sent = true
        send('ready')
      } else if (d.ok === false) {
        d.sent = true
        send('failed')
      } else if (d.t > ARRIVAL.readyTimeout) {
        d.sent = true
        send('timeout')
      }
    } else if (place === 'street' && !d.sent) {
      // once only, and `leave` ends it: the canvas's root commits a new place a frame or more after the page's, so a
      // street frame that runs after the leave's copy must not fade it (Codex branch review F1)
      d.sent = fade(PORTAL.fadeIn)
    } else if (place === 'leaving' && !d.sent && fade(PORTAL.fadeOut)) {
      d.sent = true
      send('left')
    }
  }, -2)
  /* eslint-enable react-hooks/immutability */
  return null
}

const noop = () => {}

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
  place,
  portal,
  hintRef,
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
  place: PortalPlace
  portal?: ScenePortal
  hintRef: RefObject<HTMLDivElement | null>
}) {
  const streetMode = useMemo(() => isStreetMode(typeof window !== 'undefined' ? window.location.search : ''), [])
  const idsPass = useMemo(() => streetIdsPass(typeof window !== 'undefined' ? window.location.search : ''), [])
  // the street's sky anchor, the same whether the street opened from the URL or through the portal
  const streetAnchor = useMemo(() => streetSkyAnchor(typeof window !== 'undefined' ? window.location.search : '', true), [])
  const showStreet = streetMounted(place)
  const debug = readDebugMode()
  const view = readViewMode()
  // R3F's `size` is the canvas size and re-renders on resize. Reading window.inner* here instead
  // left the camera stale until reload, so rotating a device kept the previous orientation's
  // framing — landscape→portrait held the desktop close-up (Codex, 2026-07-28).
  const { size } = useThree()
  const isPortrait = size.height > size.width
  const defaultCamera = isPortrait && view === 'design' ? DIORAMA_CAMERAS.mobile : DIORAMA_CAMERAS[view]
  const skyHome = isPortrait ? DIORAMA_CAMERAS.mobile : DIORAMA_CAMERAS.design


  const background = useMemo(() => (idsPass ? '#000000' : debug === 'stage' ? '#071020' : '#06112a'), [idsPass, debug])
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
  // the portal's pointer: on the diorama once the arrival is done; its cast masks the sky's surge under a tap that enters
  const villageAt = usePortalPointer({
    enabled: Boolean(portal?.on) && place === 'diorama' && !arriving,
    onEnter: portal?.enter ?? noop,
    onFirstHover: portal?.prefetch ?? noop,
    hintRef,
  })
  // C: no touch until the arrival is done; a tap during it is the skip. The portal: only on the diorama (decision (a))
  useTouchInput({
    enabled: touchEnabled({ touch, reduced, arriving, street: streetMode }) && place === 'diorama',
    store: touchStore,
    clock: skyClock,
    home: streetMode ? skyHome : defaultCamera,
    knob: aliveTuning?.surge ?? 1,
    land: touch && !streetMode ? { store: landStore, bendGain } : undefined,
    skyMasked: portal?.on ? villageAt : undefined,
  })
  const landTouch = useMemo(() => (touch && !streetMode ? { store: landStore, clock: skyClock, bendGain } : undefined), [touch, streetMode, bendGain])

  return (
    <>
      <color attach="background" args={[background]} />
      <PerspectiveCamera
        makeDefault
        position={[...defaultCamera.position]}
        fov={defaultCamera.fov}
        near={defaultCamera.near}
        far={defaultCamera.far}
      />
      {!streetMode && (
        <OrbitControls
          ref={portal?.controlsRef}
          enabled={controlsEnabled(place) && !arriving}
          target={[...defaultCamera.target]}
          minDistance={DIORAMA_ORBIT.minDistance}
          maxDistance={DIORAMA_ORBIT.maxDistance}
          minAzimuthAngle={DIORAMA_ORBIT.minAzimuthAngle}
          maxAzimuthAngle={DIORAMA_ORBIT.maxAzimuthAngle}
          minPolarAngle={DIORAMA_ORBIT.minPolarAngle}
          maxPolarAngle={DIORAMA_ORBIT.maxPolarAngle}
          enablePan={DIORAMA_ORBIT.enablePan}
          enableDamping={DIORAMA_ORBIT.enableDamping}
        />
      )}
      {measurePerformance && <PerfProbe />}
      {!streetMode && arrival && <ArrivalDriver home={defaultCamera} reduced={still} onDone={onArrived} {...refs} />}
      {portal && <PortalDriver place={place} still={still} lens={defaultCamera} portal={portal} />}
      {showStreet && (
        // the street places the camera at its station itself, in its own chunk (the main bundle carries no layout); its
        // own Suspense, so a chunk still loading never hides the sky or the diorama (the portal's decision (e)). Through
        // the portal it holds Vincent while the layer covers it (F4) and reports per mount.
        <Suspense fallback={null}>
          <StreetBoundary onFailed={portal?.onStreetFailed}>
            <Street reduced={reduced} still={still} hold={place === 'entering'} onReady={portal?.onStreetReady} />
          </StreetBoundary>
        </Suspense>
      )}
      <Suspense fallback={null}>
        {/* the diorama stays mounted while the street shows, hidden, so the way back draws it at once */}
        {!streetMode && debug !== 'flow' && (
          <group visible={dioramaVisible(place)}>
            <Diorama
              debug={debug === 'stage' ? 'stage' : 'final'}
              clock={skyClock}
              alive={alive}
              tuning={aliveTuning}
              cypressReady={arrival ? refs.cypressReadyRef : undefined}
              landReady={arrival ? refs.landReadyRef : undefined}
              touch={landTouch}
            />
          </group>
        )}
        {debug !== 'stage' && !idsPass && (
          <PaintingFlowSky3D
            paused={reduced}
            sky={sky}
            still={still}
            alive={alive}
            tuning={aliveTuning}
            clock={skyClock}
            touch={touch && !streetMode}
            touchStore={touchStore}
            arrivalStep={!streetMode && arrival ? refs.arrivalStepRef : undefined}
            ready={!streetMode && arrival ? refs.skyReadyRef : undefined}
            debug={debug === 'flow' ? 'flow' : 'final'}
            /* a stable module constant, so the sky's home quaternion memo holds across renders */
            home={streetMode ? skyHome : defaultCamera}
            anchor={showStreet ? streetAnchor : undefined}
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
      <p className="arrival-line">{VINCENTS_LINE}</p>
      <p className="arrival-cite">{VINCENTS_CITE}</p>
    </>
  )
}

/** The portal's seams for the checks: the place, the layer's opacity and the saved pose; enter and leave as the dock does. */
type PortalWindow = Window & {
  /**
   * `pose` is the controls' orbit pose: during the flight the camera aims past its target, so `view` reads the camera
   * itself, its rotation and its lens (Codex branch review F4)
   */
  __portal?: () => { place: PortalPlace; on: boolean; layer: number; saved: Pose | null; pose: Pose | null; view: CameraView | null }
  __portalEnter?: () => void
  __portalLeave?: () => void
  __portalFlight?: number
}

export function DioramaExperience({ clean = false, reduced = false, sky = 'light', still = false, alive = false, aliveTuning, touch = false, arrival = false, portal = false, children }: Props) {
  const streetMode = useMemo(() => isStreetMode(typeof window !== 'undefined' ? window.location.search : ''), [])
  const effectiveArrival = !streetMode && arrival
  const [arrived, setArrived] = useState(false)
  const arriving = effectiveArrival && !arrived

  // The portal (tasks/2026-10-25-street-portal-plan.md). `?street=1` opens in the street for the page's life, as before.
  const portalFlag = portal && !streetMode
  const [place, setPlace] = useState<PortalPlace>(streetMode ? 'street' : 'diorama')
  const [portalFailed, setPortalFailed] = useState(false)
  const portalOn = portalFlag && !portalFailed
  const live = useRef({ place, still, arriving, portalOn })
  useLayoutEffect(() => {
    live.current = { place, still, arriving, portalOn }
  }, [place, still, arriving, portalOn])
  const controlsRef: ControlsRef = useRef(null)
  const glRef = useRef<HTMLCanvasElement | null>(null)
  const portalLayerRef = useRef<HTMLCanvasElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const drive = useRef<PortalDrive>({ seen: 'diorama', s: 0, from: PORTAL.flightEnd, t: 0, settled: 0, ok: null, sent: false })
  const send = useCallback((event: PortalEvent) => {
    setPlace((current) => portalStep(current, event, { still: live.current.still, arriving: live.current.arriving }))
  }, [])
  // a drawImage is synchronous, so the copy shows on the frame it is made (decision (d))
  // The drift is a CSS animation, so it runs on the compositor through the street's build, which holds the main
  // thread for about 1.5 s (look pass 1): the held frame keeps moving into the village instead of freezing.
  const copyToLayer = useCallback((drift = false) => {
    const source = glRef.current
    const layer = portalLayerRef.current
    if (!source || !layer) return
    if (layer.width !== source.width || layer.height !== source.height) {
      layer.width = source.width
      layer.height = source.height
    }
    layer.getContext('2d')?.drawImage(source, 0, 0)
    layer.style.opacity = '1'
    layer.style.visibility = 'visible'
    layer.classList.toggle('is-drifting', drift)
  }, [])
  // a failed prefetch is not reported here: the lazy import tries again at the mount, and its boundary reports
  const prefetch = useCallback(() => {
    loadStreet().catch(noop)
  }, [])
  const enter = useCallback(() => {
    const { place: current, still: cut, arriving: held, portalOn: on } = live.current
    const controls = controlsRef.current
    if (!on || !controls || portalStep(current, 'enter', { still: cut, arriving: held }) === current) return
    controls.saveState()
    const d = drive.current
    d.from = {
      position: [controls.object.position.x, controls.object.position.y, controls.object.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    }
    d.s = 0
    d.ok = null
    // under reduced motion there is no flight: the layer takes the frame on screen now
    if (cut) copyToLayer()
    prefetch()
    send('enter')
  }, [copyToLayer, prefetch, send])
  // the leave copies in the handler, before the place changes (decision (d)). It ends the street's fade first: the canvas
  // sees `leaving` a frame or more later, and its street frames in between must not touch the copy (Codex F1)
  const leave = useCallback(() => {
    if (live.current.place !== 'street') return
    drive.current.sent = true
    copyToLayer()
    send('leave')
  }, [copyToLayer, send])
  const onStreetReady = useCallback((ok: boolean) => {
    drive.current.ok = ok
  }, [])
  const onStreetFailed = useCallback(() => {
    drive.current.ok = false
    setPortalFailed(true)
  }, [])
  const scenePortal = useMemo<ScenePortal | undefined>(
    () =>
      portalFlag
        ? { on: portalOn, send, drive, controlsRef, layerRef: portalLayerRef, hintRef, enter, prefetch, copyToLayer, onStreetReady, onStreetFailed }
        : undefined,
    [portalFlag, portalOn, send, enter, prefetch, copyToLayer, onStreetReady, onStreetFailed],
  )
  const portalControl = useMemo<PortalControl | null>(() => (portalOn ? { place, enter, leave, prefetch } : null), [portalOn, place, enter, leave, prefetch])
  // Escape in the street goes back, as the dock's control does (decision (j))
  useEffect(() => {
    if (!portalFlag || place !== 'street') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [portalFlag, place, leave])
  useEffect(() => {
    if (!portalFlag) return
    const w = window as PortalWindow
    w.__portal = () => {
      const layer = portalLayerRef.current
      const controls = controlsRef.current
      return {
        place: live.current.place,
        on: live.current.portalOn,
        layer: layer && layer.style.visibility === 'visible' ? Number(layer.style.opacity) : 0,
        saved: controls
          ? { position: [controls.position0.x, controls.position0.y, controls.position0.z], target: [controls.target0.x, controls.target0.y, controls.target0.z] }
          : null,
        pose: controls
          ? { position: [controls.object.position.x, controls.object.position.y, controls.object.position.z], target: [controls.target.x, controls.target.y, controls.target.z] }
          : null,
        view: controls ? viewOf(controls.object as PerspectiveCameraImpl) : null,
      }
    }
    w.__portalEnter = enter
    w.__portalLeave = leave
    return () => {
      delete w.__portal
      delete w.__portalEnter
      delete w.__portalLeave
    }
  }, [portalFlag, enter, leave])
  // reduced motion: the line is a static caption with its own life, gone on the first pointer or key (review F1)
  const [captionShown, setCaptionShown] = useState(effectiveArrival && still)
  const layerRef = useRef<HTMLDivElement>(null)
  const scanRef = useRef<HTMLImageElement>(null)
  const lineRef = useRef<HTMLElement>(null)
  const cueRef = useRef<HTMLParagraphElement>(null)
  const skyReadyRef = useRef(false)
  const cypressReadyRef = useRef(false)
  const landReadyRef = useRef(false)
  const scanReadyRef = useRef(false)
  const skipRequestedRef = useRef(false)
  const arrivalStepRef = useRef<number | null>(null)
  const skip = () => {
    skipRequestedRef.current = true
  }
  // the loading curtain (`src/bootCurtain.ts`): kept while this page's opening waits; the driver drops it when the wait
  // ends. A layout effect, so it runs before App's passive effect drops a curtain nobody kept; no cleanup, so
  // StrictMode's second run cannot drop it early
  useLayoutEffect(() => {
    if (arriving && !still) keepBootCurtain()
  }, [arriving, still])
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
      <Canvas
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          glRef.current = gl.domElement
        }}
      >
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
          cueRef={cueRef}
          skyReadyRef={skyReadyRef}
          cypressReadyRef={cypressReadyRef}
          landReadyRef={landReadyRef}
          scanReadyRef={scanReadyRef}
          skipRequestedRef={skipRequestedRef}
          arrivalStepRef={arrivalStepRef}
          place={place}
          portal={scenePortal}
          hintRef={hintRef}
        />
      </Canvas>
      {/* the portal's layer comes after R3F's canvas, so every script's first canvas is still the WebGL one (F6); it
          stays after a failed chunk, since the return still fades through it */}
      {portalFlag && <canvas className="portal-layer" ref={portalLayerRef} aria-hidden="true" />}
      {portalOn && (
        <div className="portal-hint" ref={hintRef} aria-hidden="true">
          Enter the village
        </div>
      )}
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
              <p className="arrival-cue" ref={cueRef}>
                {ARRIVAL_CUE}
              </p>
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
      <PortalContext.Provider value={portalControl}>{children}</PortalContext.Provider>
    </main>
  )
}
