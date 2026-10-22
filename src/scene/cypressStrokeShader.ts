import type { AliveInjection } from './aliveMaterial.ts'

/**
 * The cypress ribbons' stroke body (E1, tasks/2026-10-21-cypress-e1-plan.md, E1.6): the moving sky's stroke
 * fragment (`PaintingFlowSky3D.tsx`, `movingFrag`, 2026-10-11) copied as an injection for `MeshBasicMaterial`,
 * static. No sliding period, no life fade, no night lift, no `0.93` line: the ribbon is the stroke. The rounded
 * head and the drawn-out tip, the bristle lanes, the rake relief under one raking light from the upper left,
 * the rim, the dry tail. The sky's GLSL is not shared (it has byte-identity gates); the duplication is a named
 * follow-up. The functions are prefixed `cy` so a future shared chunk cannot collide.
 *
 * Retune 2 (2026-10-21): on screen a cypress ribbon is about 4 px wide against the sky's 10 and more, so the sky's
 * two bristle octaves (4.5 and 11 cycles across) and its dry tail became sub-pixel noise and the tree read as
 * grey fur (local contrast 12.0 against the painting's 6.45). One coarse lane at a third of the contrast, the
 * rake halved, the dry brush confined to the tip's last 15%.
 *
 * The material is opaque with `alphaTest` 0.5, so the shaped alpha written here is a hard cut at the rounded head
 * and tail (three's `<alphatest_fragment>` runs after this injection) and the flanks are the geometry's edges,
 * order-independent in one unsorted mesh (code review F2; a transparent material with depth written lost the
 * stroke behind a soft edge drawn first, alpha-to-coverage dithered every edge).
 * Plain `.ts` imports only: `scripts/sky-alive.test.ts` applies this to three's real basic shader under node.
 */
/**
 * E3 (the cypress's medium, E3.3): the body's relief constants. The land's strips take the defaults, which are
 * E1's and E2's literals, so their program text is unchanged; the cypress sets its own (CYPRESS_STROKE_BODY).
 */
export type StrokeBody = {
  /** the bristle lane's dark and light, mixed by the lane noise */
  laneLow: number
  laneHigh: number
  /** the raking light's strength on a flank that slopes toward it */
  rake: number
  /** a second, coarser lane across the stroke: its cycles across the stroke's full width (on vStroke.y, 0–1) and its share of the first lane's swing (0 off) */
  coarseCycles: number
  coarseShare: number
  /** the lane's edge: the smoothstep's two ends on the lane noise, so the bristles read as two tones with a hard edge (null: the noise as it is) */
  laneEdge: [number, number] | null
  /** the chroma boost on the lit colour (1 none); E1's 1.3 compensated the one-colour mean's desaturation, which E3's per-sample colours no longer have */
  saturation: number
  /** E4.1: rounded shading across the stroke ('rounded' keeps E1's expression; a number replaces it with a flat factor) */
  tube: 'rounded' | number
  /** E4.1: darkened rim at the stroke edge ('shaded' keeps E1's expression; a number replaces it with a flat factor) */
  rim: 'shaded' | number
  /** E4.1: wet highlight strength where a flank turns toward the light (0 omits the sheen line) */
  sheen: number
  /** E4.1: primary bristle lane frequency across the stroke */
  laneCycles: number
  /** E4.1: slow noise drift of the two-tone lane threshold along the stroke (0 omits the load declaration) */
  loadDrift: number
  /** E4.1: 40-cycle flank radius wobble amplitude (0 omits the fray factor) */
  fray: number
  /** E4.1: outer-flank bristle skipping on the shaped radius r (null omits the gap discard) */
  gaps: { band: number; below: number } | null
  /** E4.1: fraction along the stroke where the dry-brush tip begins to run out */
  dryFrom: number
  /** E4.1: across-stroke weight in the raking-light normal (1 emits `side` verbatim) */
  ridgeSide: number
  /** E4.1: bristle-lane slope weight in the raking-light normal */
  ridgeSlope: number
  /** E4.1: [lo, hi] clamp on the rake factor so shadow sides never go black (null: unclamped) */
  rakeClamp: [number, number] | null
}
export const STROKE_BODY_DEFAULTS: StrokeBody = {
  laneLow: 0.86,
  laneHigh: 1.08,
  rake: 0.35,
  coarseCycles: 2.2,
  coarseShare: 0,
  laneEdge: null,
  saturation: 1.3,
  tube: 'rounded',
  rim: 'shaded',
  sheen: 0.06,
  laneCycles: 4.5,
  loadDrift: 0,
  fray: 0,
  gaps: null,
  dryFrom: 0.75,
  ridgeSide: 1,
  ridgeSlope: 0.12,
  rakeClamp: null,
}
/**
 * the cypress's (E3.3, E4.1): dry, broken, ridged impasto paint — matte tube/rim, no wet sheen, 40-cycle frayed
 * flanks, outer-bristle gaps on the shaped radius, drifting two-tone bristle load, and raking ridge relief clamped
 */
export const CYPRESS_STROKE_BODY: StrokeBody = {
  laneLow: 0.78,
  laneHigh: 1.14,
  rake: 0.8,
  coarseCycles: 2.2,
  coarseShare: 0.33,
  laneEdge: [0.42, 0.58],
  saturation: 1.1,
  tube: 0.95,
  rim: 1.0,
  sheen: 0,
  laneCycles: 5.0,
  loadDrift: 0.15,
  fray: 0.16,
  gaps: { band: 0.7, below: 0.3 },
  dryFrom: 0.55,
  ridgeSide: 0.15,
  ridgeSlope: 0.5,
  rakeClamp: [0.4, 1.6],
}

const f = (n: number) => (Number.isInteger(n) ? `${n}.0` : `${n}`)

export function strokeGlslWith(body: StrokeBody = STROKE_BODY_DEFAULTS): Omit<AliveInjection, 'key' | 'uniforms'> {
  const coarse = body.coarseShare > 0 ? `\n    vec2 lane2 = cyNoise1d(vStroke.y * ${f(body.coarseCycles)} + seed * 0.7 + w * 0.5);\n    streak = mix(streak, lane2.x, ${f(body.coarseShare)});` : ''
  const frayFactor = body.fray > 0 ? ` * (${f(Number((1 - body.fray).toFixed(6)))} + ${f(body.fray)} * cyNoise1(w * 40.0 + seed * 3.0))` : ''
  const loadDecl = body.loadDrift > 0 ? '\n    float load = cyNoise1(w * 3.0 + seed * 1.3) - 0.5;' : ''
  const gapDiscard = body.gaps ? `\n    if (y > ${f(body.gaps.band)} * r && streak < ${f(body.gaps.below)}) discard;` : ''
  const sideTerm = body.ridgeSide === 1 ? 'side' : `side * ${f(body.ridgeSide)}`
  const rakeExpr = `1.0 + ${f(body.rake)} * lit`
  const rakeVal = body.rakeClamp ? `clamp(${rakeExpr}, ${f(body.rakeClamp[0])}, ${f(body.rakeClamp[1])})` : rakeExpr
  const tubeExpr = body.tube === 'rounded' ? '(0.86 + 0.12 * (1.0 - y * y))' : f(body.tube)
  const edgeExpr = body.laneEdge
    ? body.loadDrift > 0
      ? `smoothstep(${f(body.laneEdge[0])} + ${f(body.loadDrift)} * load, ${f(body.laneEdge[1])} + ${f(body.loadDrift)} * load, streak)`
      : `smoothstep(${f(body.laneEdge[0])}, ${f(body.laneEdge[1])}, streak)`
    : 'streak'
  const rimExpr = body.rim === 'shaded' ? 'mix(0.8, 1.0, 1.0 - smoothstep(0.6, 0.95, y))' : f(body.rim)
  const sheenLine = body.sheen > 0 ? `    col += pow(max(lit, 0.0), 3.0) * ${f(body.sheen)};\n` : ''
  return {
  vertexHead: /* glsl */ `
  attribute vec2 aStroke;
  attribute float aSeed;
  varying vec2 vStroke;
  flat varying float vSeed;`,
  vertexBody: /* glsl */ `
  vStroke = aStroke;
  vSeed = aSeed;`,
  fragmentHead: /* glsl */ `
  varying vec2 vStroke;
  flat varying float vSeed;
  float cyHash1(float n) { return fract(sin(n) * 43758.5453); }
  float cyNoise1(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(cyHash1(i), cyHash1(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  // the same noise with its slope, so the bristle lanes can catch the light
  vec2 cyNoise1d(float x) {
    float i = floor(x);
    float f = fract(x);
    float h0 = cyHash1(i);
    float h1 = cyHash1(i + 1.0);
    return vec2(mix(h0, h1, f * f * (3.0 - 2.0 * f)), (h1 - h0) * 6.0 * f * (1.0 - f));
  }`,
  fragmentBody: /* glsl */ `
  {
    // derivatives first: they need the whole pixel quad, so before any discard. g points across the stroke on screen.
    vec2 g = vec2(dFdx(vStroke.y), dFdy(vStroke.y));
    float aa = max((abs(g.x) + abs(g.y)) * 1.5, 1e-4);
    float w = vStroke.x;
    float x = abs(w - 0.5) * 2.0;
    float y = abs(vStroke.y - 0.5) * 2.0;
    float side = vStroke.y * 2.0 - 1.0;
    float seed = cyHash1(vSeed + 3.1) * 40.0;
    // a full base and a drawn-out tip: the painting's cypress strokes are flames; the flanks wobble instead of a ruled edge
    float r = pow(max(1.0 - pow(x, 2.5), 0.0), 0.4) * mix(1.0, 0.72, w) * (0.9 + 0.1 * cyNoise1(w * 9.0 + seed))${frayFactor};
    float a = 1.0 - smoothstep(r - aa, r, y);
    // one bristle lane along the stroke, seeded per stroke, drifting a little along it (retune 4: at 10–20 px on
    // screen the sky's fine octave, 11 cycles across, still aliased to a stipple)
    vec2 lane1 = cyNoise1d(side * ${f(body.laneCycles)} + seed + w * 0.8);
    float streak = lane1.x;${coarse}
    float streakSlope = ${f(body.laneCycles)} * lane1.y;${loadDecl}
    // dry brush at the tip: the paint runs out over the last quarter
    if (streak < smoothstep(${f(body.dryFrom)}, 1.0, w) * 0.6) discard;
    if (a < 0.02) discard;${gapDiscard}
    // raised paint under one raking light from the upper left, the same for every stroke: a flank is lit by how
    // far it slopes toward the light
    float facing = dot(g / max(length(g), 1e-6), vec2(-0.6, 0.8));
    float lit = (${sideTerm} - ${f(body.ridgeSlope)} * streakSlope) * facing;
    float rake = ${rakeVal};
    float relief = ${tubeExpr} * rake;
    float bristle = mix(${f(body.laneLow)}, ${f(body.laneHigh)}, ${edgeExpr});
    float rim = ${rimExpr};
    vec3 col = diffuseColor.rgb * relief * bristle * rim;
    // wet paint: a soft sheen where a flank turns most toward the light, at a quarter of the sky's (a dark tree takes a grey cast)
${sheenLine}    // the most loaded lanes carry a paler streak of the same paint, as in the painting's broken colour, gently
    col = mix(col, col * 1.1 + 0.015, smoothstep(0.75, 0.95, streak) * 0.3);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = clamp(mix(vec3(lum), col, ${f(body.saturation)}), 0.0, 1.05);
    diffuseColor.a *= a;
  }`,
  }
}

/** the land's body: the defaults, E1's and E2's text */
export const strokeGlsl: Omit<AliveInjection, 'key' | 'uniforms'> = strokeGlslWith()
