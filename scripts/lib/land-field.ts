/** The land band's paint by colour (E2): the classes the derive labels and the gates count. */

export type LandClass = 'teal' | 'yellowGreen' | 'ground' | 'hill' | 'other'

/**
 * The band's paint by its colour, sRGB bytes. The teal curls are the trees and hedges, the yellow-green curls the
 * bushes at the cypress's foot, the dark navy-green the fields, the blue the hills; a house wall, a roof or a lit
 * window is `other`. The rules were set on the 1:1 crops of the 3840 scan (2026-10-21).
 */
export function landClass(r: number, g: number, b: number): LandClass {
  const l = 0.299 * r + 0.587 * g + 0.114 * b
  if (g > r + 25 && g > b + 10 && l > 70) return 'yellowGreen'
  if (g >= r && b >= r && l >= 35 && l < 110 && Math.abs(g - b) < 40) return 'teal'
  if (l < 45) return 'ground'
  if (b > g + 10 && b > r + 20) return 'hill'
  return 'other'
}
