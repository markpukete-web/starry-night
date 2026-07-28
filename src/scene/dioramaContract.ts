export type DioramaDebugMode = 'final' | 'nopost' | 'stage' | 'flow'
export type DioramaViewMode = 'design' | 'orbit'

export type OrbitPose = {
  target: readonly [number, number, number]
  azimuthDeg: number
  polarDeg: number
  distance: number
  fov: number
}

/**
 * Orbit parameters → a camera spec, in OrbitControls' spherical convention (polar from +Y,
 * azimuth about +Y from +Z).
 *
 * Stating a camera this way keeps it honest about DIORAMA_ORBIT. The portrait camera used to be
 * authored as a raw position at distance 9.18 against a 5.6 cap, so OrbitControls clamped it on
 * its first update() and the framing rendered a third closer than intended — losing the cypress
 * and clipping the moon on every modern phone aspect, while the record claimed it held the
 * cypress (measured 2026-07-28). An authored camera outside the envelope is a wish, not a setting.
 */
export function orbitPose(pose: OrbitPose) {
  const polar = (pose.polarDeg * Math.PI) / 180
  const azimuth = (pose.azimuthDeg * Math.PI) / 180
  const sp = Math.sin(polar)
  return {
    position: [
      pose.target[0] + pose.distance * sp * Math.sin(azimuth),
      pose.target[1] + pose.distance * Math.cos(polar),
      pose.target[2] + pose.distance * sp * Math.cos(azimuth),
    ] as [number, number, number],
    target: pose.target,
    fov: pose.fov,
    near: 0.08,
    far: 48,
    pose,
  }
}

export const DIORAMA_CAMERAS = {
  design: {
    position: [0.62, 1.18, 5.18] as const,
    target: [0.08, 1.03, 0.02] as const,
    fov: 50,
    near: 0.08,
    far: 48,
  },
  /**
   * Portrait home — Mark's pick, 2026-07-28 (pre-release checklist item 2): the WHOLE
   * composition, letterboxed. Holds all four anchors at once — moon, full-height cypress, the
   * central whorl and the steeple — at every phone aspect from 360x800 to 430x932.
   *
   * The accepted cost is a band of unpainted sky (~19%) at the top of the frame. A portrait frame
   * is taller than the painted world, and no pose in a ~30k search holds the moon without one:
   * the moon sits high enough that reaching it overruns the painting's top edge. The two
   * alternatives Mark weighed dropped an anchor to buy a filled frame — A the moon, B the cypress.
   * The dark below the island is not part of that cost; it is the gate-passed floating look.
   */
  mobile: orbitPose({
    target: [0.4, 0.8, 0.02],
    azimuthDeg: -15,
    polarDeg: 88.9,
    distance: 5.4,
    fov: 88,
  }),
  orbit: {
    position: [3.65, 1.55, 3.95] as const,
    target: [-0.08, 0.9, 0.08] as const,
    fov: 50,
    near: 0.08,
    far: 48,
  },
}

export const DIORAMA_CAMERA = DIORAMA_CAMERAS.design

export const DIORAMA_ORBIT = {
  minDistance: 3.25,
  maxDistance: 5.6,
  minAzimuthAngle: -Math.PI / 12,
  maxAzimuthAngle: Math.PI / 4,
  minPolarAngle: 0.58,
  maxPolarAngle: 1.62,
  enablePan: false,
  enableDamping: true,
}

export const DIORAMA_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5a77e1,
}

export const DIORAMA_VISUAL_CONTRACT = {
  subject: 'Starry Night as a physical front-arc orbitable floating diorama',
  rejects: [
    'flat or curved painting surface reads as the whole product',
    'placeholder geometry dominates the stage',
    'sky flow does not trace the source painting',
    'Bloom supplies the only readable form',
    'clean capture contains dev UI or title overlays',
    'camera exposes the unpainted rear of the cypress/source projection',
    'orbit controls allow panning or losing the authored composition',
  ],
} as const

export const DIORAMA_RECOVERY_CONTRACT = {
  preserveSourceSpaceRibbons: true,
  sourceAuthoredHalosRemainReadableWithoutBloom: true,
  rejectNativeDomeReplacement: true,
  frontArcOnlyForThisSlice: true,
  isolateCypressAndEdgeFixes: true,
  cameraLockedSourceSkyForFrontArc: true,
} as const
