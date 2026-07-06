export const CANOPY_CAMERA = {
  position: [0.6, 1.05, 5.05] as const,
  target: [0.0, 1.05, 0.0] as const,
  fov: 50,
  near: 0.08,
  far: 40,
}

export const CANOPY_ORBIT = {
  minAzimuthAngle: -0.34,
  maxAzimuthAngle: 0.34,
  minPolarAngle: 1.28,
  maxPolarAngle: 1.72,
  enablePan: false,
  enableDamping: true,
}

export const CANOPY_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5712a3,
}

export const CANOPY_VISUAL_CONTRACT = {
  subject: 'source-space Van Gogh streamlines projected onto a curved front canopy',
  rejects: [
    'visible rectangular sky card',
    'old faceted diorama dominates the frame',
    'dev UI visible in review capture',
    'title or FPS overlaps the canvas',
    'canopy only works because Bloom hides the structure',
  ],
} as const
