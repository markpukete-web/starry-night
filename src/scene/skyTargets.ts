import { MOON_R, MOON_UV, SWIRLS } from './skySwirls.ts'
import { TOUCH_SURGE, type StarPoint } from './touchSurge.ts'

// The PAINTED moon's centre — bright-warm pixel centroid of the scan's moon corner (lum>170,
// r+g>2.2b over 360x330+1230+30; ring-verified 2026-07-22). NOT the same as skySwirls' MOON_UV
// (0.85,0.16), which anchors the moon's VORTEX — same trap as the star guards (lessons 07-16):
// the SWIRLS table cannot supply painted-body positions. The authored crescent sprite used to
// sit at the vortex anchor, doubling the source's own moon 78px away (Mark: "mismatched").
export const MOON_PAINTED_UV: [number, number] = [0.8987, 0.1697]

/** The star halos' anchors, in the halos' order: SWIRLS minus the moon, the whorls and the cypress. */
export const STAR_ANCHORS = SWIRLS.filter(([u, v, , r]) => {
  const isMoon = Math.hypot(u - MOON_UV[0], v - MOON_UV[1]) < MOON_R * 1.5
  const isWhorl = r > 0.071
  const onCypress = u < 0.18 && v > 0.34
  return !isMoon && !isWhorl && !onCypress
})

/**
 * B (touch): what a tap can flare, in the halos' order, the moon last at its PAINTED centre (review F8). The
 * index the hit test returns is the halo's index; the moon is `touchTargets().length − 1`. Its own module, so
 * the component file keeps exporting components alone (fast refresh).
 */
export function touchTargets(): StarPoint[] {
  return [
    ...STAR_ANCHORS.map(([u, v]) => ({ u, v, radius: TOUCH_SURGE.starRadius })),
    { u: MOON_PAINTED_UV[0], v: MOON_PAINTED_UV[1], radius: TOUCH_SURGE.moonRadius },
  ]
}
