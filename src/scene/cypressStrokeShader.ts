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
 * The material sets `alphaToCoverage`, so the shaped alpha written here dithers the edge across the canvas's
 * MSAA samples; three leaves `OPAQUE` undefined under alpha-to-coverage and `diffuseColor.a` reaches the output.
 * Plain `.ts` imports only: `scripts/sky-alive.test.ts` applies this to three's real basic shader under node.
 */
export const strokeGlsl: Omit<AliveInjection, 'key' | 'uniforms'> = {
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
    float r = pow(max(1.0 - pow(x, 2.5), 0.0), 0.4) * mix(1.0, 0.72, w) * (0.9 + 0.1 * cyNoise1(w * 9.0 + seed));
    float a = 1.0 - smoothstep(r - aa, r, y);
    // one coarse bristle lane along the stroke (the sky's fine octave is sub-pixel at this width), seeded per
    // stroke, drifting a little along it
    vec2 lane1 = cyNoise1d(side * 4.5 + seed + w * 0.8);
    float streak = lane1.x;
    float streakSlope = 4.5 * lane1.y;
    // dry brush at the tip only: the paint runs out over the last 15%
    if (streak < smoothstep(0.85, 1.0, w) * 0.6) discard;
    if (a < 0.02) discard;
    // raised paint under one raking light from the upper left, the same for every stroke: a flank is lit by how
    // far it slopes toward the light; half the sky's rake
    float facing = dot(g / max(length(g), 1e-6), vec2(-0.6, 0.8));
    float lit = (side - 0.12 * streakSlope) * facing;
    float rake = 1.0 + 0.25 * lit;
    float relief = (0.86 + 0.12 * (1.0 - y * y)) * rake;
    float bristle = mix(0.93, 1.03, streak);
    float rim = mix(0.72, 1.0, 1.0 - smoothstep(0.6, 0.95, y));
    vec3 col = diffuseColor.rgb * relief * bristle * rim;
    // wet paint: a soft sheen where a flank turns most toward the light, at a quarter of the sky's (a dark tree takes a grey cast)
    col += pow(max(lit, 0.0), 3.0) * 0.045;
    // the most loaded lanes carry a paler streak of the same paint, as in the painting's broken colour, gently
    col = mix(col, col * 1.1 + 0.015, smoothstep(0.75, 0.95, streak) * 0.3);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = clamp(mix(vec3(lum), col, 1.3), 0.0, 1.05);
    diffuseColor.a *= a;
  }`,
}
