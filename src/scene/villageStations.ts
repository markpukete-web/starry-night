/**
 * The village's foliage rows as traced in the 1600 × 1267 source painting: per station `[x, crest, base]` in
 * painting pixels. A pure module with no imports, so the land's authored masses (`landMasses.ts`, E2) can derive
 * each row's painting box from the same stations the geometry is built from, under node as well as in the app
 * (Codex, E2 plan confirmation read F15: a guessed box reached 107 rows above the front row's crests).
 */

// Traced crest and lower edge of the dark front row in the 1600×1267 source painting.
// The rising lower edge on the right excludes the neighbouring pale roof.
export const FRONT_ROW = [
  [742, 1137, 1141], [745, 1128, 1142], [748, 1120, 1142], [753, 1113, 1142],
  [758, 1110, 1142], [765, 1108, 1142], [773, 1110, 1142], [779, 1115, 1142],
  [785, 1112, 1142], [792, 1108, 1142], [798, 1107, 1141], [804, 1109, 1140],
  [810, 1112, 1138], [817, 1111, 1134], [823, 1115, 1131], [829, 1121, 1127],
]

// Back crown row: four-pixel stations retain its pale curling crest.
export const BACK_ROW = [
  [1004, 991, 998], [1008, 983, 1000], [1012, 979, 1001], [1016, 977, 1001],
  [1020, 976, 1001], [1024, 974, 1002], [1028, 976, 1002], [1032, 974, 1002],
  [1036, 972, 1001], [1040, 972, 1001], [1044, 974, 1001], [1048, 977, 1000],
  [1052, 976, 1000], [1056, 978, 999], [1060, 975, 999], [1064, 975, 998],
  [1068, 972, 997], [1072, 970, 996], [1076, 972, 995], [1080, 968, 995],
  [1084, 964, 995], [1088, 962, 995], [1092, 962, 995], [1096, 959, 996],
  [1100, 957, 997], [1104, 954, 997], [1108, 955, 998], [1112, 955, 999],
  [1116, 956, 1000], [1120, 957, 1001], [1124, 960, 1002], [1128, 960, 1003],
  [1132, 963, 1003], [1136, 965, 1004], [1140, 969, 1005], [1144, 968, 1007],
  [1148, 970, 1008], [1152, 974, 1010], [1156, 974, 1011], [1160, 976, 1012],
  [1164, 975, 1013], [1168, 974, 1014], [1172, 972, 1015], [1176, 972, 1015],
  [1180, 972, 1016], [1184, 974, 1016], [1188, 976, 1016], [1192, 977, 1017],
  [1196, 977, 1017], [1200, 984, 1017], [1204, 993, 1017], [1208, 1003, 1017],
  [1212, 1011, 1017],
]

// C1 context rows, traced like BACK_ROW: the round mass in the right village and the teal curls
// between the cypress and the left houses. They replace the old procedural bushes 0, 1, 5, 6;
// LEFT stands where bush 1 fronted the cypress foot, clear of the lobe solid.
export const RIGHT_ROW = [
  [1182, 1136, 1170], [1186, 1129, 1170], [1190, 1126, 1170], [1195, 1123, 1170],
  [1200, 1121, 1170], [1205, 1120, 1170], [1210, 1119, 1170], [1215, 1119, 1170],
  [1220, 1118, 1170], [1225, 1118, 1170], [1230, 1119, 1170], [1235, 1121, 1170],
  [1240, 1124, 1170], [1245, 1128, 1170], [1250, 1132, 1170], [1255, 1135, 1170],
  [1260, 1138, 1170], [1265, 1141, 1170], [1270, 1144, 1170], [1275, 1150, 1170],
  [1279, 1158, 1170],
]
export const LEFT_ROW = [
  [685, 1098, 1118], [690, 1092, 1120], [695, 1089, 1124], [700, 1088, 1127],
  [705, 1088, 1128], [710, 1088, 1129], [715, 1089, 1130], [720, 1090, 1130],
  [725, 1091, 1130], [730, 1093, 1130], [735, 1096, 1130], [740, 1100, 1130],
  [745, 1105, 1130],
]

/** A row's painting box from its stations: the x range, the highest crest to the lowest base. */
export function stationBox(stations: readonly (readonly number[])[]): [number, number, number, number] {
  return [
    Math.min(...stations.map((s) => s[0])),
    Math.min(...stations.map((s) => s[1])),
    Math.max(...stations.map((s) => s[0])),
    Math.max(...stations.map((s) => s[2])),
  ]
}
