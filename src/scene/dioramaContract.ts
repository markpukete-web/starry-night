export type DioramaDebugMode = 'final' | 'nopost' | 'stage' | 'flow'
export type DioramaViewMode = 'design' | 'orbit'

export const DIORAMA_CAMERAS = {
  design: {
    position: [0.62, 1.18, 5.18] as const,
    target: [0.08, 1.03, 0.02] as const,
    fov: 50,
    near: 0.08,
    far: 48,
  },
  mobile: {
    position: [0.72, 1.18, 9.2] as const,
    target: [0.9, 1.0, 0.02] as const,
    fov: 86,
    near: 0.08,
    far: 48,
  },
  orbit: {
    position: [3.65, 1.55, 3.95] as const,
    target: [-0.08, 0.9, 0.08] as const,
    fov: 50,
    near: 0.08,
    far: 48,
  },
} as const

export const DIORAMA_CAMERA = DIORAMA_CAMERAS.design

/**
 * Pre-release checklist item 2 — portrait framing candidates for Mark's composition call.
 * Driven by `?portrait=a|b|c`; with no param the shipped default (DIORAMA_CAMERAS.mobile) is
 * unchanged, so this adds a review affordance and decides nothing.
 *
 * Expressed as ORBIT parameters rather than a raw position, because OrbitControls clamps the
 * authored offset into DIORAMA_ORBIT on its first update — the shipped `mobile` spec asks for
 * distance 9.18 and silently renders at 5.6. Stating azimuth/polar/distance keeps a candidate
 * honest about living inside the locked envelope.
 *
 * The painting is landscape (1.26:1) and a phone is 0.46:1, so a portrait frame CANNOT hold the
 * whole composition and stay filled — something is always given up. These three are the honest
 * poles of that choice, all measured at the worst phone aspect (360x800):
 *
 *   - the cypress and the moon are the composition's two anchors, at opposite ends. A portrait
 *     crop reaches one or the other, not both, unless it pulls back far enough to letterbox.
 *   - including the MOON costs a flat band of unpainted sky at the top — zero poses in the search
 *     hold the moon without one, because the moon sits high enough that reaching it pushes the
 *     frame past the painting's top edge.
 *   - the dark area BELOW the island is not a defect: it is the gate-passed floating-island look
 *     (see the desktop capture). Only the flat band ABOVE the sky is unpainted background.
 */
export type PortraitCandidate = {
  label: string
  note: string
  target: readonly [number, number, number]
  azimuthDeg: number
  polarDeg: number
  distance: number
  fov: number
}

export const DIORAMA_PORTRAIT_CANDIDATES: Record<string, PortraitCandidate> = {
  a: {
    label: 'Cypress side — no moon',
    note:
      'the cypress full height as the moon\'s counterweight, whorl + village + steeple with it. ' +
      'Sky fills the frame edge to edge — NO unpainted band anywhere. Biggest paint. Cost: the moon ' +
      'is off-frame until you orbit right. fov 62 is also closest to the desktop lens (50)',
    target: [-0.4, 0.9, 0.02],
    azimuthDeg: 27.5,
    polarDeg: 88.9,
    distance: 5.2,
    fov: 62,
  },
  b: {
    label: 'Moon side — no cypress',
    note:
      'the moon, whorl, the WHOLE village and the steeple, paint larger than C. Cost: the cypress ' +
      'is off-frame, and a ~13% flat band of unpainted sky at the top — the least any moon-holding ' +
      'pose can do (no pose in the search holds the moon without one)',
    target: [0.6, 0.6, 0.02],
    azimuthDeg: -15,
    polarDeg: 88.9,
    distance: 5.0,
    fov: 84,
  },
  c: {
    label: 'Whole composition — letterboxed',
    note:
      'everything held at once: moon, full cypress, whorl, steeple. Cost: a ~19% flat band at the ' +
      'top and the paint reads ~30% smaller than A or B. The safe-but-smallest option',
    target: [0.4, 0.8, 0.02],
    azimuthDeg: -15,
    polarDeg: 88.9,
    distance: 5.4,
    fov: 88,
  },
}

/** Orbit parameters → world position, matching OrbitControls' spherical convention. */
export function portraitCandidateCamera(c: PortraitCandidate) {
  const polar = (c.polarDeg * Math.PI) / 180
  const azimuth = (c.azimuthDeg * Math.PI) / 180
  const sp = Math.sin(polar)
  return {
    position: [
      c.target[0] + c.distance * sp * Math.sin(azimuth),
      c.target[1] + c.distance * Math.cos(polar),
      c.target[2] + c.distance * sp * Math.cos(azimuth),
    ] as [number, number, number],
    target: c.target,
    fov: c.fov,
    near: 0.08,
    far: 48,
  }
}

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
