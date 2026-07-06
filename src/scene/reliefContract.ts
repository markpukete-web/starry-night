export type ReliefDebugMode = 'final' | 'sky' | 'layers'

export const RELIEF_POINTER = {
  maxX: 0.012,
  maxY: 0.008,
  response: 7.5,
} as const

export const RELIEF_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5712a3,
} as const

export const RELIEF_FRAMING = {
  desktop: { zoom: 1.04, center: [0.5, 0.5] as const },
  mobile: { zoom: 1.44, center: [0.525, 0.51] as const },
} as const

export const RELIEF_LAYERS = {
  cypress: { depth: 1.0, shadowDepth: 0.52, opacity: 0.58, shadowOpacity: 0.38 },
  foreground: { depth: 0.42, shadowDepth: 0.24, opacity: 0.36, shadowOpacity: 0.2 },
} as const

export const RELIEF_VISUAL_CONTRACT = {
  subject: 'The Starry Night as a living relief painting',
  rejects: [
    'the sky or base painting slides under pointer input',
    'the cypress becomes a black cone, blade, or faceted prop',
    'a finite sky card edge or rear void is visible',
    'the village or island reads as a toy stage before the painting reads',
    'the route depends on Bloom or post-processing to make the composition readable',
  ],
  invariants: [
    'front composition remains the original painting at rest',
    'source-space StreamlineSky remains the only sky-motion mechanism',
    'pointer input moves only masked foreground layers',
    'reduced motion freezes the sky while keeping a dignified still painting',
  ],
} as const
