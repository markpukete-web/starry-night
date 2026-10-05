/** Pixel corners in public/reference/painting.jpg (1600 × 1267), ordered like a face:
 * bottom-left, bottom-right, top-right, top-left. Patches are paint samples, not cutout buildings.
 * Geometric contours/openings own the drawing. See the labelled patch map in the study evidence.
 */
export const VILLAGE_STUDY_PATCHES = {
  paleLeft: [[797, 1098], [808, 1098], [808, 1071], [797, 1071]],
  churchPlaster: [[884, 1110], [896, 1108], [896, 1082], [884, 1087]],
  blueWallA: [[756, 1201], [839, 1201], [839, 1178], [756, 1178]],
  blueWallB: [[1260, 1148], [1360, 1148], [1360, 1120], [1260, 1120]],
  blueWallC: [[946, 1106], [980, 1106], [980, 1076], [946, 1076]],
  blueRoof: [[1094, 1074], [1150, 1074], [1159, 1043], [1108, 1043]],
  quietRoof: [[665, 1036], [701, 1036], [714, 1027], [678, 1027]],
  siennaRoof: [[694, 1067], [726, 1067], [738, 1044], [706, 1044]],
  stripedRoof: [[981, 1225], [1083, 1222], [1113, 1179], [1019, 1182]],
  churchRoof: [[869, 1054], [879, 1038], [855, 1019], [852, 1024]],
  spire: [[902, 995], [916, 995], [906, 819], [906, 819]],
} as const

export type VillagePatchName = keyof typeof VILLAGE_STUDY_PATCHES
