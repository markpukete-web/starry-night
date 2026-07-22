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
