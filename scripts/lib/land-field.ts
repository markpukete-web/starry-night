/** The land band's paint by colour (E2): the classes the derive labels and the gates count. */

export type LandClass = 'teal' | 'yellowGreen' | 'ground' | 'hill' | 'other'

/**
 * The band's paint by its colour, sRGB bytes. The teal curls are the trees and hedges (green with blue at or
 * above it), the olive curls (`yellowGreen`: green over both red and blue by a few levels) the bushes at the
 * cypress's foot, the dark navy-green the fields, the blue the hills; a house wall, a roof or a lit window is
 * `other`. Set on the authored boxes at a quarter of the 3840 scan (2026-10-21): the bushes' box averages
 * (44, 52, 47), green over blue by 4 at the median, so a rule written from the bright curls on the 1:1 crop
 * matched none of it.
 */
export function landClass(r: number, g: number, b: number): LandClass {
  const l = 0.299 * r + 0.587 * g + 0.114 * b
  if (g - r >= 3 && g - b >= 3 && l >= 35 && l < 130) return 'yellowGreen'
  if (g >= r && b >= g - 3 && l >= 35 && l < 110 && Math.abs(g - b) < 40) return 'teal'
  if (l < 45) return 'ground'
  if (b > g + 10 && b > r + 20) return 'hill'
  return 'other'
}

/** The foliage classes: a mass's share counts both, its dominant hue is its class. */
export const FOLIAGE: readonly LandClass[] = ['teal', 'yellowGreen']
