import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  LinearSRGBColorSpace,
  Matrix4,
  NoColorSpace,
  NormalBlending,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  type Group,
  type Sprite,
  type SpriteMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { tuned } from './tuning'
import { buildSourceStreamlineRibbons } from './streamlineGeometry'
import { arraysToGeometry, composite, ribbonsToArrays } from './skyRibbonArrays'
import type { MovingBuildReply, MovingBuildRequest } from './movingSky.worker'
import { DOME_R } from './skyMapping'
import {
  dioramaSourceEdgeFade,
  SIDE_BORDER_U,
  SIDE_EXTEND_U,
  uvToDioramaSkyPosition,
} from './dioramaSkyProjection'
import { ALIVE_DEFAULTS, gustGlsl, gustUniformValues, HALO_BREATH, haloPeriod, type AliveTuning } from './skyAlive'
import { flareShape, pruneFlares, pruneKicks, pruneSurges, surgeUniformValues, TOUCH_SURGE, touchGlsl, type TouchStore } from './touchSurge'
import { MOON_PAINTED_UV, STAR_ANCHORS } from './skyTargets'
import { PALETTE } from './palette'
import { DIORAMA_CAPTURE } from './dioramaContract'
import { skyTransform, type SkyAnchor } from './skyAnchor'

type PaintingFlowSkyDebug = 'final' | 'flow'

/**
 * The bodies `bodiesFrag` keeps: painting u, v and radius (isotropic scan px / 1600). Star centres are warm-pixel
 * centroids on the filled scan. Radii reach the last 6 px ring still 20% empty in three captures with a magenta
 * background, plus 12 px (scratch/sky-polish-2026-10-11/hole-radii.ts, 2026-10-11). The far-left star's
 * centre is its hole's, as its warm paint sits off-centre. The moon is MOON_PAINTED_UV and its painted disc.
 */
const MOVING_BODIES: readonly (readonly [u: number, v: number, r: number])[] = [
  [0.8987, 0.1697, 0.06], // moon
  [0.2374, 0.1723, 0.025],
  [0.7033, 0.2356, 0.043],
  [0.3501, 0.5274, 0.0385],
  [0.606, 0.0854, 0.043],
  [0.1306, 0.4836, 0.03],
  [0.04, 0.46, 0.017],
  [0.3267, 0.3288, 0.0166],
]

/** The visitor's sky: today's light travelling through fixed strokes, or strokes that travel. */
export type SkyStyle = 'light' | 'moving'

/**
 * The moving-stroke sky (Simon Lee's model, tested on spike/moving-sky 2026-10-11): short opaque
 * single-colour strokes slide along the source streamlines, with no painting copy under them. Only the
 * scan's own warm star and moon bodies stay, drawn over the strokes. Values from the spike's last pass;
 * tuned against the painting in the sky-choice tuning commit.
 */
const MOVING = {
  countScale: 8,
  widthScale: 1.8,
  // cut only reversals: near swirls 19,723 turns had cos < -0.5 (the V-kinks), elsewhere none; 0.5 also
  // cut 6,784 real curves near swirls and left holes at star halos and whorl eyes (tune p2)
  maxTurnCos: -0.5,
  // 9 → 5: where the flow reverses (round the whorl eye, between the two swirls) the cut leaves short paths,
  // and 9 dropped them, so the background showed through. The sky rect's background share 4.8% → 3.0%, and
  // 2.3% with the shorter fade below (scratch/sky-polish-2026-10-11/coverage-variants.py). The price: 12.6% of
  // paths are 5–8 points, so short oval dabs return, most visibly in the whorl eye (Fable review-v4). A stroke
  // length in path units, from a per-ribbon length attribute, would give them full strokes instead. Not built.
  minPoints: 5,
  speed: 0.06,
  period: 0.45,
  stroke: 0.7,
  opacity: 0.97,
  // the moon's additive glow; the light sky keeps 0.68. Opaque strokes ring the moon here, so the same glow read
  // brighter (Mark, 2026-10-11 evening: "dim the moon glow a bit more", then "slightly brighter"). Moon patch L:
  // 0.68 gave 85.0, 0.5 gave 80.4 against the light sky's 80.8, 0.4 gave 77.8 (scratch/sky-polish-2026-10-11/moon/)
  moonGlow: 0.58,
}

/**
 * Gradient behind the sky, as multipliers of the palette's two deepest sky colours. Light keeps today's
 * values, and with them today's colour-space slip: `Color.set(hex)` converts to linear and this raw
 * shader writes linear values, so the light gradient shows near the background navy, (8, 16, 43).
 * Barely any of it shows under the light sky's wash. The moving sky's gaps ARE this gradient, so there
 * it is the palette colour as displayed: the painting's darkest whorl paint averages (35, 53, 97) and
 * Simon Lee's gaps (38, 54, 90) (tune p3).
 */
type GradientEnd = { scale: number; asDisplayed: boolean }
const GRADIENT: Record<SkyStyle, { top: GradientEnd; bottom: GradientEnd }> = {
  light: { top: { scale: 0.58, asDisplayed: false }, bottom: { scale: 0.68, asDisplayed: false } },
  // the bottom keeps today's dark value, so the void around the island stays night (tune p4)
  moving: { top: { scale: 1, asDisplayed: true }, bottom: { scale: 0.68, asDisplayed: false } },
}

/** The gust clock's uniforms, the same for both ribbon materials; `uAlive` and the knobs are set in a layout effect. */
function gustUniforms() {
  const { omega, amplitudes, lift, shimmer } = gustUniformValues()
  return {
    uAlive: { value: 0 },
    uGustOmega: { value: new Vector3(...omega) },
    uGustAmp: { value: new Vector3(...amplitudes) },
    uGustLift: { value: lift },
    uGustShimmer: { value: shimmer },
  }
}

/** B's uniforms: the two lists as flat arrays mutated in place (review F12) and the constants from the table. */
function touchUniforms() {
  const c = surgeUniformValues()
  return {
    uSurgeCount: { value: 0 },
    uSurge: { value: new Float32Array(16 * 4) },
    uSurgeEnd: { value: new Float32Array(16) },
    uKickCount: { value: 0 },
    uKick: { value: new Float32Array(4 * 4) },
    uTouchSpeed: { value: c.speed },
    uTouchTau: { value: c.tau },
    uTouchRise: { value: c.rise },
    uTouchSigmaS: { value: c.sigmaS },
    uTouchSigmaA: { value: c.sigmaA },
    uTouchBloomAlong: { value: c.bloomAlong },
    uTouchBloomAcross: { value: c.bloomAcross },
    uTouchMaxLift: { value: c.maxLift },
    uTouchFadeOut: { value: c.fadeOut },
    uTouchKick: { value: c.kick },
    uTouchKickRise: { value: c.kickRise },
    uTouchKickDecay: { value: c.kickDecay },
    uTouchKickSigma: { value: c.kickSigma },
    uTouchSupport: { value: c.support },
    uTouchWindowStart: { value: c.windowStart },
    uTouchWindowEnd: { value: c.windowEnd },
    uTouchAspect: { value: c.aspect },
  }
}

/** Capture seam: a finite `window.__skyTime` pins both sky clocks, so motion can be captured frame-exact. */
type SkyClockWindow = Window & { __skyTime?: number }

type Props = {
  paused?: boolean
  debug?: PaintingFlowSkyDebug
  /**
   * The home camera the sky's composition is keyed to. The sky is rotation-locked to the camera,
   * so the painting sits wherever `q_camera(home)⁻¹` puts it and stays there through the orbit.
   * Derived from the active camera SPEC rather than latched from the first rendered frame: on a
   * device rotation the camera spec changes, and a frame-1 latch left the sky keyed to the
   * previous orientation — camera right, sky ~21° off, moon clipped (Codex, 2026-07-28).
   */
  home: { position: readonly [number, number, number]; target: readonly [number, number, number] }
  /** The visitor's sky choice. */
  sky?: SkyStyle
  /** System reduced motion: always the painted-light still, whatever the choice. */
  still?: boolean
  /** Make-it-alive A (`?alive=1`): the gust clock in both skies, halos breathing. Off = today's sky, bit for bit. */
  alive?: boolean
  /** The live knobs (skyAlive.ts `readAliveTuning`); applied through uniforms, no rebuild. */
  tuning?: AliveTuning
  /**
   * The one sky clock, owned by the scene so the foreground (the cypress flicker, the window glimmer) reads the
   * same pinned, advanced or paused time the halos do (second pass, A3). Without it the sky keeps its own ref.
   */
  clock?: RefObject<number>
  /** B (`?touch=1`, implies alive): surges of light along the ribbons from the pointer, kicks and flares (touchSurge.ts). */
  touch?: boolean
  /** The store the scene's input hook writes; read into the uniforms each frame. */
  touchStore?: RefObject<TouchStore>
  /**
   * C (`?arrival=1`, tasks/2026-10-20-arrival-c-plan.md): the seconds to advance the clock this frame while the
   * arrival runs (its rate times a bounded delta); null once the arrival is done, absent with the flag off: either
   * way the clock takes the frame's `dt`.
   */
  arrivalStep?: RefObject<number | null>
  /** C: true once the ribbons have a geometry to draw; the arrival waits for it (with the cypress and the scan). */
  ready?: RefObject<boolean>
  /** Street sky anchor: follow tracks camera translation, worldFixed locks rotation to world identity */
  anchor?: SkyAnchor
}

// The ALIVE define (make-it-alive A, the flag on) compiles the gust clock in; without it the shaders are main's:
// no gust attribute, uniforms or varyings (Codex, PR #8).
const ribbonVert = /* glsl */ `
  #ifdef ALIVE
  ${gustGlsl}
  uniform float uTime;
  attribute vec2 aGust;
  #endif
  #ifdef TOUCH
  ${touchGlsl}
  attribute vec4 aTouch;
  attribute vec4 aSeg;
  varying float vTouchLift;
  #endif
  attribute float aLen;
  attribute float aAcross;
  attribute float aPhase;
  attribute float aRate;
  attribute vec3 aColor;
  attribute float aEdgeFade;
  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vEdgeFade;
  #ifdef ALIVE
  // make-it-alive A: the ribbon's warped clock and its brightness lift this frame (skyAlive.ts). flat: a constant
  // interpolated across a triangle drifts in the last bits, and at t = 3.7 that drift moved one grey level on the
  // default light sky against main (gate 2, 2026-10-13); flat carries the provoking vertex's value exactly.
  flat varying float vGustTime;
  flat varying float vGustLift;
  #endif
  void main() {
    vLen = aLen;
    #ifdef ALIVE
    float kt = uTime;
    #ifdef TOUCH
    // B: the kick is one value per ribbon, from its centreline segment, so it can ride the flat clock without
    // laddering (review F2). It goes into the gust clock's argument, never on top of it: added on top, a settling
    // kick outran the gust's deepest lull and the strokes ran backwards (Codex, PR #10 P2; kickedGustTime, T27).
    // Guarded, so with no input kt is uTime and A's clock runs verbatim (review F9).
    if (uKickCount > 0) kt += touchKick(aSeg, uTime);
    #endif
    vGustTime = gustTime(kt, aGust);
    vGustLift = gustLift(uTime, aGust);
    #endif
    #ifdef TOUCH
    // B: the lift as a separate guarded statement after A's (review F9), per vertex, weighted by the ribbon's gust
    // weight (A's derivation).
    vTouchLift = 0.0;
    if (uSurgeCount > 0) vTouchLift = min(uTouchMaxLift, aGust.x * touchLift(aTouch, uTime));
    #endif
    vAcross = aAcross;
    vPhase = aPhase;
    vRate = aRate;
    vColor = aColor;
    vEdgeFade = aEdgeFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ribbonFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  #ifdef ALIVE
  uniform float uGustShimmer;
  #endif
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uPulseScale;
  uniform float uFreeze;
  uniform float uShimmerMix;
  uniform float uShimmerSpeed;
  uniform float uShimmerScale;
  uniform float uBristleFreq;
  uniform float uBristleAmp;
  uniform int uDebugMode;
  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vEdgeFade;
  #ifdef ALIVE
  flat varying float vGustTime;
  flat varying float vGustLift;
  #endif
  #ifdef TOUCH
  uniform int uSurgeCount;
  varying float vTouchLift;
  #endif

  void main() {
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
    float taper = smoothstep(0.0, 0.15, vLen) * smoothstep(1.0, 0.85, vLen);
    #ifdef ALIVE
    // make-it-alive A: the flow term takes the whole warp, the shimmer a share of it (it is the boil knob)
    float flowTime = mix(vGustTime, 0.0, uFreeze);
    float shimmerTime = mix(uTime + uGustShimmer * (vGustTime - uTime), 0.0, uFreeze);
    #else
    float flowTime = mix(uTime, 0.0, uFreeze);
    float shimmerTime = flowTime;
    #endif
    float flow = 0.5 + 0.5 * sin(vLen * uPulseScale - flowTime * uSpeed * vRate + vPhase);
    float shimmer = 0.5 + 0.5 * sin(vLen * (uPulseScale * uShimmerScale) - shimmerTime * (uSpeed * uShimmerSpeed) * vRate + vPhase * 2.7);
    float combinedFlow = mix(flow, shimmer, uShimmerMix);
    float bristle = (1.0 - uBristleAmp) + uBristleAmp * sin(vAcross * uBristleFreq + sin(vLen * 45.0) * 3.0);

    vec3 col = vColor;
    if (uDebugMode == 1) {
      col = mix(vec3(0.08, 0.22, 0.58), vec3(0.95, 0.78, 0.28), vLen);
    } else {
      float ridge = 0.82 + 0.36 * edge;
      col *= (0.52 + 0.40 * combinedFlow) * ridge * bristle;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = clamp(mix(vec3(lum), col, 1.45), 0.0, 1.05);
      // Highlight lift keyed on the SOURCE pixel's paleness: the painting's luminous swirl-band
      // strokes brighten, the cobalt floor is untouched. Post-bloom-removal the sky measured
      // mean 73 / luminous(>150) 4.6% vs the painting's 102 / 11.6% (2026-07-22, Mark's call:
      // lift the stars and swirl band, keep the deep night).
      float srcLum = dot(vColor, vec3(0.299, 0.587, 0.114));
      col *= 1.0 + 0.52 * smoothstep(0.32, 0.68, srcLum);
      #ifdef ALIVE
      // A: a surge brightens the band a few percent; the calm floor barely moves. After the clamp and the
      // source-lum lift, so the palette numbers are reproducible (review F14).
      col *= 1.0 + vGustLift;
      #endif
      #ifdef TOUCH
      // B: these strokes are glazes (alpha 0.61 × a soft edge, over the wash), so the lift reached the screen at
      // two thirds of the moving sky's: lit pixels +7.6% against +11.5% at the bloom's peak. × 1.8 matches it
      // (+11.6%), no pixel clipped. Mark, 2026-10-16: "in painted light, the cursor light is weaker".
      if (uSurgeCount > 0) col *= 1.0 + 1.8 * vTouchLift;
      #endif
    }

    float a = edge * taper * uOpacity * vEdgeFade;
    if (uDebugMode == 1) a = max(a, edge * taper * 0.42 * vEdgeFade);
    if (a < 0.012) discard;
    gl_FragColor = vec4(col, a);
  }
`

// The light sky's vertex shader with the ribbon's identity `flat`: interpolating a constant across a
// triangle drifts in the last bits, and the stroke hash below amplifies that into per-pixel speckle.
const movingVert = ribbonVert.replace('varying float vPhase;', 'flat varying float vPhase;')

const movingFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPeriod;
  uniform float uStroke;
  uniform float uOpacity;
  varying float vLen;
  varying float vAcross;
  flat varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vEdgeFade;
  #ifdef ALIVE
  flat varying float vGustTime;
  flat varying float vGustLift;
  #endif
  #ifdef TOUCH
  uniform int uSurgeCount;
  varying float vTouchLift;
  #endif

  float hash1(float n) { return fract(sin(n) * 43758.5453); }
  float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash1(i), hash1(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  // the same noise with its slope, so the bristle lanes can catch the light
  vec2 noise1d(float x) {
    float i = floor(x);
    float f = fract(x);
    float h0 = hash1(i);
    float h1 = hash1(i + 1.0);
    return vec2(mix(h0, h1, f * f * (3.0 - 2.0 * f)), (h1 - h0) * 6.0 * f * (1.0 - f));
  }

  void main() {
    // derivatives first: they need the whole pixel quad, so before any discard. vAcross is smooth, unlike y
    // below, whose kink at the centre line gives a false zero. g also points across the stroke on screen.
    vec2 g = vec2(dFdx(vAcross), dFdy(vAcross));
    float aa = max((abs(g.x) + abs(g.y)) * 1.5, 1e-4);
    #ifdef ALIVE
    // make-it-alive A: the ribbon's warped clock (skyAlive.ts)
    float t = vGustTime;
    #else
    float t = uTime;
    #endif
    // which sliding period this fragment is in (one stroke each) and where inside it
    float pos = (vLen - t * uSpeed * vRate) / uPeriod + vPhase / 6.2831853;
    float slot = floor(pos);
    float id = slot * 17.13 + floor(vPhase * 1000.0);
    // each stroke its own length, inside its period so neighbours never overlap
    float strokeLen = min(0.95, uStroke * mix(0.8, 1.25, hash1(id)));
    float s = pos - slot;
    if (s > strokeLen) discard;
    float w = s / strokeLen;
    // the stroke is born at the path's start and dies at its end
    float centre = vLen - (w - 0.5) * strokeLen * uPeriod;
    // edges always ascending: GLSL leaves smoothstep with edge0 > edge1 undefined (review R2)
    // fade 0.12 → 0.05 of the path: the long fades left each path's ends nearly bare (coverage, polish c3)
    float life = smoothstep(0.0, 0.05, centre) * (1.0 - smoothstep(0.95, 1.0, centre));
    float x = abs(w - 0.5) * 2.0;
    float y = abs(vAcross - 0.5) * 2.0;
    float side = vAcross * 2.0 - 1.0;
    // bristle lanes (below) run along the stroke: two octaves across it, seeded per stroke, drifting a
    // little along it so a lane can thin out or merge
    float seed = hash1(id + 3.1) * 40.0;
    // rounded, fuller head; the flanks wobble instead of a ruled edge
    float r = pow(max(1.0 - pow(x, 2.5), 0.0), 0.4) * mix(0.72, 1.0, w) * (0.9 + 0.1 * noise1(w * 9.0 + seed));
    float a = (1.0 - smoothstep(r - aa, r, y)) * life * uOpacity * vEdgeFade;
    if (a < 0.02) discard;
    // the lanes cost four hashes, so only for fragments inside the stroke's outline
    vec2 lane1 = noise1d(side * 4.5 + seed + w * 0.8);
    vec2 lane2 = noise1d(side * 11.0 + seed * 1.7 - w * 1.5);
    float streak = 0.62 * lane1.x + 0.38 * lane2.x;
    // the coarse lane's slope only: the fine lane runs about 11 cycles across a 10 px stroke, and lit it sparkled
    float streakSlope = 0.62 * 4.5 * lane1.y;
    // dry brush: toward the tail the paint runs out and the thin lanes break first
    if (streak < (1.0 - smoothstep(0.0, 0.3, w)) * 0.7) discard;
    // raised paint under one raking light from the upper left, the same for every stroke. Paint height across
    // the stroke is a ridge plus the lanes, h = 0.5 (1 - side^2) + 0.05 streak. A flank is lit by how far it
    // slopes toward the light: -dh/dside along g, the screen direction of rising side (window y is up).
    float facing = dot(g / max(length(g), 1e-6), vec2(-0.6, 0.8));
    float lit = (side - 0.12 * streakSlope) * facing;
    float rake = 1.0 + 0.5 * lit;
    float relief = (0.86 + 0.12 * (1.0 - y * y)) * rake;
    float bristle = mix(0.8, 1.1, streak);
    float rim = mix(0.72, 1.0, 1.0 - smoothstep(0.6, 0.95, y));
    vec3 col = vColor * relief * bristle * rim;
    // wet paint: a soft sheen where a flank turns most toward the light
    col += pow(max(lit, 0.0), 3.0) * 0.18;
    // the most loaded lanes carry a paler streak of the same paint, as in the painting's broken colour
    col = mix(col, col * 1.15 + 0.03, smoothstep(0.75, 0.95, streak) * 0.4);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, 1.3), 0.0, 1.05);
    float srcLum = dot(vColor, vec3(0.299, 0.587, 0.114));
    // a lighter lift than the light sky's 0.52: that one offsets translucent strokes over a dark wash,
    // and on opaque strokes it lifted the sky band to ΔE 10.57 (tune p1). 0.2 → 0.08 when the streaked
    // strokes covered more of the dark gaps and the sky read lighter, mean L 54.6 against 46.7 (polish p3)
    // × 0.93: once the strokes covered the dark gaps the sky read lighter, mean L 55.1 against the painting's
    // 46.7 (polish c1); now 52.4, dE76 6.96
    col *= 0.93 * (1.0 + 0.08 * smoothstep(0.32, 0.68, srcLum));
    #ifdef ALIVE
    // A: a surge brightens the band a few percent, after the 0.93 lift line above (review F14)
    col *= 1.0 + vGustLift;
    #endif
    #ifdef TOUCH
    if (uSurgeCount > 0) col *= 1.0 + vTouchLift;
    #endif
    gl_FragColor = vec4(col, a);
  }
`

/**
 * The painting at painting-space u with the S4 side strips, as GLSL. `bias` is an optional mip-bias argument
 * (", 1.0"). The wash passes '' and so compiles the same text it did before the moving sky's bodies existed.
 */
const paintedGlsl = (bias: string) => /* glsl */ `
  // The painting at painting-space u, with the S4 side strips past its edges.
  // Texture hand-off: bilinear cannot blend ACROSS textures, so a hard branch leaves a
  // dashed hairline where the regrown border meets the canvas — feather the switch instead.
  vec3 painted(float pu, float v) {
    float FEATHER = 0.006;
    float tL = 1.0 - smoothstep(uBorderU - FEATHER, uBorderU, pu);
    float tR = smoothstep(1.0 - uBorderU, 1.0 - uBorderU + FEATHER, pu);
    vec3 col = texture2D(uPainting, vec2(clamp(pu, 0.0, 1.0), v)${bias}).rgb;
    if (tL > 0.0) {
      vec3 left = texture2D(uExtendLeft, vec2((pu + uExtendU) / (uExtendU + uBorderU), v)${bias}).rgb;
      col = mix(col, left, tL);
    }
    if (tR > 0.0) {
      vec3 right = texture2D(uExtendRight, vec2((pu - (1.0 - uBorderU)) / (uExtendU + uBorderU), v)${bias}).rgb;
      col = mix(col, right, tR);
    }
    return col;
  }
`

const washVert = /* glsl */ `
  attribute float aEdgeFade;
  varying vec2 vUv;
  varying float vEdgeFade;
  void main() {
    vUv = uv;
    vEdgeFade = aEdgeFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const washFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  uniform sampler2D uMask;
  uniform sampler2D uExtendLeft;
  uniform sampler2D uExtendRight;
  uniform float uExtendU;
  uniform float uBorderU;
  uniform int uDebugMode;
  uniform int uMovingSky;
  varying vec2 vUv;
  varying float vEdgeFade;
${paintedGlsl('')}
  void main() {
    // vUv.x is PAINTING-space u and runs past [0,1] by uExtendU onto the S4 side strips
    // (sky-extend-{left,right}.png — the painting continued offline with its own sky patches,
    // docs/decisions/0003-inpaint-extend.md). Each strip also OWNS the scan's raw canvas-weave
    // border columns (uBorderU), regrown from real paint so no pale weave line splits the sky.
    float pu = vUv.x;
    // The mask term draws the painting's below-band horizon rows. Near the canvas edges the
    // skyline dips toward the corners and the mask's feathered skyline-edge texels hang over
    // the bare void (the island only covers the centre) — they rendered as a dotted arc
    // sweeping down-screen once the old side fade stopped multiplying them away (chased across
    // p2–p6: not ribbons, not the border sliver — the mask's own skyline feather). Side-gate
    // ONLY the mask term; the sky band (and the S4 strips) stays full-width.
    float maskSideGate = smoothstep(0.0, 0.1, pu) * smoothstep(1.0, 0.9, pu);
    float mask = (pu >= 0.0 && pu <= 1.0) ? texture2D(uMask, vec2(pu, vUv.y)).r * maskSideGate : 0.0;
    // This backdrop sits behind REAL 3D forms, so the mask's old 2D cypress cut-out is obsolete
    // here. uPainting is the OFFLINE-FILLED painting (painting-filled.png), so within the sky
    // band a plain sample IS the fill. Below the skyline the 3D island covers everything: discard.
    float skyBand = 1.0 - smoothstep(0.58, 0.7, vUv.y);
    float a = max(mask, skyBand) * vEdgeFade;
    if (uMovingSky == 1) {
      // Moving sky: no painting under the strokes. Keep the scan's own warm star and moon bodies
      // (drawn over the strokes) and the horizon rows below the stroke band.
      // decide from the colour this fragment will draw: clamping pu sampled the scan's pale weave
      // border into the side strips and painted them in (review F1)
      vec3 src = painted(pu, vUv.y);
      float srcL = dot(src, vec3(0.299, 0.587, 0.114));
      float body = smoothstep(0.04, 0.14, 0.5 * (src.r + src.g) - src.b) * smoothstep(0.42, 0.58, srcL);
      a = max(mask * smoothstep(0.62, 0.68, vUv.y), body * step(vUv.y, 0.6)) * vEdgeFade;
    }
    if (a < 0.02) discard;
    vec3 col = painted(pu, vUv.y);
    if (uDebugMode == 1) {
      col = mix(vec3(0.03, 0.08, 0.18), vec3(0.12, 0.38, 0.96), mask);
      gl_FragColor = vec4(col, a * 0.5);
      return;
    }
    // Night grade, softened from (0.67,0.79,1.0): that cool-down sank the whole band ~22%
    // before the highlight lift keyed on it, so the ramp barely engaged (night-lift p2 measured
    // +1.6 for a 37% gain notch). Key the lift on the TRUE source paleness instead.
    float srcLum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= vec3(0.74, 0.84, 1.0);
    col *= 1.0 + 0.52 * smoothstep(0.3, 0.62, srcLum);
    gl_FragColor = vec4(col, a * 0.68);
  }
`

/**
 * Moving sky only: the painted star and moon bodies, kept as the scan's own paint over the strokes. The flow
 * carries ribbons round a star's core, and the turn cut drops the short ones there, so each star showed a navy
 * disc, and the moon showed a third of the navy through its 68% wash (Codex review-v1, design D). Graded with
 * the wash's night grade but not its lift, so at full opacity a body reads as bright as the light sky's own.
 */
const bodiesFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  uniform sampler2D uExtendLeft;
  uniform sampler2D uExtendRight;
  uniform float uExtendU;
  uniform float uBorderU;
  uniform vec3 uBodies[${MOVING_BODIES.length}];
  varying vec2 vUv;
  varying float vEdgeFade;
${paintedGlsl('')}
  void main() {
    // radii are isotropic scan pixels: one unit of v is the scan's height, 1267 of its 1600 px width
    const float ASPECT = 1267.0 / 1600.0;
    float body = 0.0;
    for (int i = 0; i < ${MOVING_BODIES.length}; i++) {
      vec3 b = uBodies[i];
      float d = length(vec2(vUv.x - b.x, (vUv.y - b.y) * ASPECT));
      body = max(body, 1.0 - smoothstep(0.7 * b.z, b.z, d));
    }
    // sample before the discard: a mipmapped lookup takes implicit derivatives from the whole pixel quad, and
    // GLSL leaves them undefined after a discard that only some of the quad took (Codex review-v2 N1)
    vec3 col = painted(vUv.x, vUv.y);
    float a = body * vEdgeFade;
    if (a < 0.02) discard;
    // the wash's night grade without its highlight lift: the lift makes up for the wash's 0.68 opacity, and on
    // these opaque bodies it blew the moon to L 91.9 against the light sky's 80.8 (Mark, 2026-10-11 evening).
    // Without it the moon reads 85.0 and the stars within 4 of the light sky.
    col *= vec3(0.74, 0.84, 1.0);
    gl_FragColor = vec4(col, a);
  }
`

const gradientVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const gradientFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vDir;
  void main() {
    float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(mix(uBottom, uTop, pow(t, 0.85)), 1.0);
  }
`

function makeSkyWashGeometry(radius = DOME_R - 0.05) {
  // spans the S4 side strips too: paintU ∈ [−SIDE_EXTEND_U, 1 + SIDE_EXTEND_U], same mesh
  // density per unit of u as the pre-S4 112-column canvas-only wash
  const cols = 180
  const rows = 78
  const positions: number[] = []
  const uvs: number[] = []
  const edge: number[] = []
  const indices: number[] = []
  const p = new Vector3()

  for (let y = 0; y <= rows; y++) {
    const v = y / rows
    for (let x = 0; x <= cols; x++) {
      const u = -SIDE_EXTEND_U + (x / cols) * (1 + 2 * SIDE_EXTEND_U)
      uvToDioramaSkyPosition(u, v, p, radius)
      positions.push(p.x, p.y, p.z)
      uvs.push(u, v)
      edge.push(dioramaSourceEdgeFade(u, v))
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * (cols + 1) + x
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  g.setAttribute('aEdgeFade', new BufferAttribute(new Float32Array(edge), 1))
  g.setIndex(indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}


function makeMoonHaloTexture(): CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  // Soft core (0.98→0.5): the halo now sits ON the painted moon (MOON_PAINTED_UV) whose disc
  // the highlight lift already brightens — a hot additive core blew the crescent's gold out to
  // white. The painting keeps the crescent readable inside the glow; the halo's job is only the
  // outer radiance (2026-07-22 moon fix).
  g.addColorStop(0, 'rgba(255,242,187,0.5)')
  g.addColorStop(0.24, 'rgba(248,214,112,0.42)')
  g.addColorStop(0.52, 'rgba(229,184,84,0.22)')
  g.addColorStop(0.82, 'rgba(207,165,82,0.06)')
  g.addColorStop(1, 'rgba(207,165,82,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

function makeStarHaloTexture(): CanvasTexture {
  const s = 128
  const cnv = document.createElement('canvas')
  cnv.width = cnv.height = s
  const ctx = cnv.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  // Broadened falloff (2026-07-22): the painting gives every star a wide luminous orb — some
  // near moon-sized — and the old tight decay read as dim points once full-frame Bloom left.
  g.addColorStop(0, 'rgba(252,240,170,1)')
  g.addColorStop(0.2, 'rgba(244,221,120,0.75)')
  g.addColorStop(0.45, 'rgba(226,200,110,0.35)')
  g.addColorStop(0.7, 'rgba(205,185,120,0.12)')
  g.addColorStop(1, 'rgba(205,185,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new CanvasTexture(cnv)
  tex.needsUpdate = true
  return tex
}

function SourceOrbs({
  debug,
  moonGlow = 0.68,
  clock,
  alive,
  breath,
  touch = false,
  touchStore,
}: {
  debug: PaintingFlowSkyDebug
  moonGlow?: number
  /** The sky clock as the parent's frame loop last wrote it: pinned, advanced, or 0 while paused. */
  clock: RefObject<number>
  /** Make-it-alive A: halos breathe and the moon pulses; off, every write below is the base value. */
  alive: boolean
  /** The `breath` knob: a multiplier on every halo's swing. */
  breath: number
  /** B: a tapped star (or the moon) flares on its colour and scale; off, no write below touches them. */
  touch?: boolean
  touchStore?: RefObject<TouchStore>
}) {
  const moonHalo = useMemo(() => makeMoonHaloTexture(), [])
  const starHalo = useMemo(() => makeStarHaloTexture(), [])
  const moonPosition = useMemo(
    () => uvToDioramaSkyPosition(MOON_PAINTED_UV[0], MOON_PAINTED_UV[1], new Vector3(), DOME_R - 0.02),
    [],
  )
  const stars = useMemo(
    () =>
      STAR_ANCHORS.map(([u, v, sign, r], index) => ({
        position: uvToDioramaSkyPosition(u, v, new Vector3(), DOME_R - 0.01),
        scale: index === 0 ? 0.94 : 0.62 + r * 2.2,
        sign,
      })),
    [],
  )

  useEffect(
    () => () => {
      moonHalo.dispose()
      starHalo.dispose()
    },
    [moonHalo, starHalo],
  )

  const starBase = debug === 'flow' ? 0.72 : 0.9
  const moonBase = debug === 'flow' ? 0.72 : moonGlow
  const starMaterials = useRef<(SpriteMaterial | null)[]>([])
  const starSprites = useRef<(Sprite | null)[]>([])
  const moonMaterial = useRef<SpriteMaterial | null>(null)
  const moonSprite = useRef<Sprite | null>(null)
  // A2: each halo breathes at its own period, the moon slower and lower; every term is sin(ωt), 0 at t = 0, so
  // the paused still (clock 0) and the t = 0 frame equal today's. With the flag off amp is 0 and each write is
  // the base the JSX set, so the write is idempotent (plan review F1, F2). This frame loop subscribes before the
  // parent's and reads the previous frame's clock, which is harmless; a positive priority would switch R3F to
  // manual rendering (F9).
  // B: a tapped halo flares on its COLOUR (the texel, before the additive clamp; opacity clips at 1, review F8)
  // and its scale, a quick rise and a slow fall; the writes exist only with the flag on, so A's path is verbatim.
  const flareOf = (index: number, t: number): number => {
    let flare = 0
    for (const f of touchStore?.current?.flares ?? []) if (f.index === index) flare += flareShape(t - f.t0)
    return flare
  }
  useFrame(() => {
    const t = clock.current ?? 0
    const amp = alive ? breath : 0
    if (moonMaterial.current) {
      moonMaterial.current.opacity = moonBase * (1 + amp * HALO_BREATH.moonOpacity * Math.sin((2 * Math.PI * t) / HALO_BREATH.moonPeriod))
      if (touch && moonSprite.current) {
        const flare = flareOf(stars.length, t)
        moonMaterial.current.color.setScalar(1 + TOUCH_SURGE.flareColor * flare)
        const scale = 4.25 * (1 + TOUCH_SURGE.flareScale * flare)
        moonSprite.current.scale.set(scale, scale, 1)
      }
    }
    stars.forEach((star, index) => {
      const material = starMaterials.current[index]
      const sprite = starSprites.current[index]
      if (!material || !sprite) return
      const breath = Math.sin((2 * Math.PI * t) / haloPeriod(index))
      material.opacity = starBase * (1 + amp * HALO_BREATH.opacity * breath)
      let scale = star.scale * 1.85 * (1 + amp * HALO_BREATH.scale * breath)
      if (touch) {
        const flare = flareOf(index, t)
        material.color.setScalar(1 + TOUCH_SURGE.flareColor * flare)
        scale *= 1 + TOUCH_SURGE.flareScale * flare
      }
      sprite.scale.set(scale, scale, 1)
    })
  })

  return (
    <group>
      {/* The moon BODY is the painting's own pixels (crescent-in-disc, now lifted by the
          highlight gain); authored layers add only the additive glow paint cannot emit.
          The old flat crescent sprite doubled the source moon and is gone. */}
      <group position={moonPosition}>
        <sprite ref={moonSprite} scale={[4.25, 4.25, 1]} renderOrder={3}>
          <spriteMaterial
            ref={moonMaterial}
            map={moonHalo}
            blending={AdditiveBlending}
            transparent
            opacity={moonBase}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>
      <pointLight position={moonPosition} intensity={debug === 'flow' ? 12 : 18} distance={24} color="#f0d98a" />
      {stars.map((star, index) => (
        <group key={index} position={star.position}>
          <sprite
            ref={(sprite) => {
              starSprites.current[index] = sprite
            }}
            scale={[star.scale * 1.85, star.scale * 1.85, 1]}
            renderOrder={3}
          >
            <spriteMaterial
              ref={(material) => {
                starMaterials.current[index] = material
              }}
              map={starHalo}
              blending={AdditiveBlending}
              transparent
              opacity={starBase}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
          <mesh renderOrder={4}>
            <sphereGeometry args={[star.scale * 0.075, 12, 12]} />
            <meshBasicMaterial color="#f3df7d" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}



export function PaintingFlowSky3D({ paused = false, debug = 'final', home, sky = 'light', still = false, alive = false, tuning = ALIVE_DEFAULTS, clock: sharedClock, touch = false, touchStore, arrivalStep, ready: readyRef, anchor }: Props) {
  const skyRoot = useRef<Group>(null)
  // the sky clock as this frame wrote it, for the halos' breath (A2) and the foreground (A3): pinned, advanced,
  // or 0 while paused. The scene's ref when given, else this one.
  const ownClock = useRef(0)
  const clock = sharedClock ?? ownClock
  // Camera-convention lookAt (Matrix4.lookAt puts +Z from target back to eye, as three does for
  // isCamera objects), so this equals the live camera's quaternion at rest at the home pose —
  // provided the pose sits inside DIORAMA_ORBIT and so is never clamped. `diorama-layout.test.ts`
  // holds that invariant for every authored camera.
  const homeInverse = useMemo(() => {
    const eye = new Vector3(...home.position)
    const target = new Vector3(...home.target)
    const matrix = new Matrix4().lookAt(eye, target, new Vector3(0, 1, 0))
    return new Quaternion().setFromRotationMatrix(matrix).invert()
  }, [home])
  // The FILLED assets: the cypress cut-out replaced offline with the painting's own sky patches,
  // plus the S4 side strips continuing the painting past its L/R edges
  // (docs/decisions/0003-inpaint-extend.md). The 2D routes keep the unfilled originals.
  // A failed build, worker or source image releases `awaitingMoving` below, so a page opened on the moving sky (the
  // default since 2026-10-20) shows what the painted-light route would show, not an empty sky (Codex, PR #12 and
  // PR #13 P2s). Declared here because the loaders below report into it.
  const [movingFailed, setMovingFailed] = useState(false)
  const sourceFailed = () => setMovingFailed(true)
  const flowData = useImageData('/reference/signed-flow-filled.png', sourceFailed)
  const maskData = useImageData('/reference/sky-mask.png', sourceFailed)
  // The colour assets ship as lossless WebP (~40% under PNG on continuous-tone paint, pixels
  // byte-identical); the flow fields and mask stay PNG, where WebP is bigger. scripts/slim-
  // reference.ts owns that split — keep its WEBP_ASSETS list and these paths in step.
  const paintingData = useImageData('/reference/painting-filled.webp', sourceFailed)
  const extendLeftData = useImageData('/reference/sky-extend-left.webp', sourceFailed)
  const extendRightData = useImageData('/reference/sky-extend-right.webp', sourceFailed)
  const extendFlowLeftData = useImageData('/reference/sky-extend-flow-left.png', sourceFailed)
  const extendFlowRightData = useImageData('/reference/sky-extend-flow-right.png', sourceFailed)
  const [painting, mask, extendLeft, extendRight] = useTexture([
    '/reference/painting-filled.webp',
    '/reference/sky-mask.png',
    '/reference/sky-extend-left.webp',
    '/reference/sky-extend-right.webp',
  ])
  const isFlowDebug = debug === 'flow'
  // Reduced motion (and the flow debug view) always shows the painted-light sky.
  const wanted: SkyStyle = still || isFlowDebug ? 'light' : sky
  // One-way latch, set during render (lint-clean, unlike a setState in an effect): the moving sky is
  // built the first time it is wanted and then kept, so switching back and forth costs nothing.
  const [movingEver, setMovingEver] = useState(false)
  if (wanted === 'moving' && !movingEver) setMovingEver(true)

  useEffect(() => {
    for (const tex of [painting, mask, extendLeft, extendRight]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask, extendLeft, extendRight])

  const gradientMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(GRADIENT.light.top.scale) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(GRADIENT.light.bottom.scale) },
        },
        vertexShader: gradientVert,
        fragmentShader: gradientFrag,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const washGeometry = useMemo(() => makeSkyWashGeometry(), [])
  // the bodies sit at the strokes' radius, behind the authored star spheres (front at DOME_R − 0.056 or nearer).
  // At the wash's radius a sphere pokes half through, and full-opacity paint hid its top half (polish D1).
  const bodiesGeometry = useMemo(() => makeSkyWashGeometry(DOME_R), [])
  const washMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uExtendLeft: { value: extendLeft },
          uExtendRight: { value: extendRight },
          uExtendU: { value: SIDE_EXTEND_U },
          uBorderU: { value: SIDE_BORDER_U },
          uDebugMode: { value: isFlowDebug ? 1 : 0 },
          uMovingSky: { value: 0 },
        },
        vertexShader: washVert,
        fragmentShader: washFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    [extendLeft, extendRight, isFlowDebug, mask, painting],
  )

  const bodiesMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uExtendLeft: { value: extendLeft },
          uExtendRight: { value: extendRight },
          uExtendU: { value: SIDE_EXTEND_U },
          uBorderU: { value: SIDE_BORDER_U },
          uBodies: { value: MOVING_BODIES.map(([u, v, r]) => new Vector3(u, v, r)) },
        },
        vertexShader: washVert,
        fragmentShader: bodiesFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    [extendLeft, extendRight, painting],
  )

  // The seven source images, memoised on their identities so the geometry memos below see a stable input.
  const images = useMemo(
    () =>
      flowData && maskData && paintingData && extendLeftData && extendRightData && extendFlowLeftData && extendFlowRightData
        ? { flowData, maskData, paintingData, extendLeftData, extendRightData, extendFlowLeftData, extendFlowRightData }
        : null,
    [extendFlowLeftData, extendFlowRightData, extendLeftData, extendRightData, flowData, maskData, paintingData],
  )

  const geometry = useMemo(() => {
    if (!images) return null
    const sources = composite(images)
    const { compositePainting, compositeFlow, uPad } = sources
    const ribbons = buildSourceStreamlineRibbons({
      flowData: compositeFlow,
      maskData: sources.maskData,
      paintingData: compositePainting,
      count: Math.round((isFlowDebug ? 2300 : tuned('count', 2000)) * (1 + 2 * uPad)),
      strokeWidth: tuned('strokeWidth', 0.0032) * (isFlowDebug ? 1.55 : 1.18),
      points: tuned('points', 16),
      stepSize: tuned('stepSize', 0.012),
      seed: DIORAMA_CAPTURE.seed,
      // the offline-filled painting owns the obsolete 2D-cypress cut-out within the wash's sky
      // band (0.58–0.7); ribbons must churn across that fill too or it reads as a static patch
      openSkyBandV: 0.62,
      uPad,
      // trails stop where the wash's skyBand discard ends (washFrag smoothstep 0.58–0.7): below
      // it only the island covers them, and near the edges/strips stray trails read as dotted
      // arcs on the bare gradient
      trailMaxV: 0.7,
    })
    return arraysToGeometry(ribbonsToArrays(ribbons, { gust: alive, touch }))
  }, [alive, images, isFlowDebug, touch])

  // The moving sky's own, denser strokes: built on first use, one count for every orientation, so a resize never
  // rebuilds it (review F7). Same seed and streamline field as the light sky. Built in a worker: in the render it
  // froze the first switch for about 230 ms on an M5 Pro (Codex, PR #7). The light sky shows until it arrives.
  const [movingGeometry, setMovingGeometry] = useState<BufferGeometry | null>(null)
  useEffect(() => {
    if (!movingEver || !images) return
    const worker = new Worker(new URL('./movingSky.worker.ts', import.meta.url), { type: 'module' })
    let built: BufferGeometry | null = null
    const sent = performance.now()
    worker.onmessage = (event: MessageEvent<MovingBuildReply>) => {
      worker.terminate()
      if ('error' in event.data) {
        console.error('[sky] moving-stroke build failed; the sky stays painted light.', event.data.error)
        setMovingFailed(true)
        return
      }
      built = arraysToGeometry(event.data.arrays)
      if (import.meta.env.DEV) {
        console.info(`[sky] moving-stroke geometry: ${Math.round(event.data.ms)} ms in the worker, ${Math.round(performance.now() - sent)} ms round trip`)
      }
      setMovingGeometry(built)
    }
    worker.onerror = (event) => {
      console.error('[sky] moving-stroke worker failed; the sky stays painted light.', event.message)
      setMovingFailed(true)
    }
    const request: MovingBuildRequest = {
      images,
      countPerUnit: tuned('count', 2000) * MOVING.countScale,
      gust: alive,
      touch,
      options: {
        strokeWidth: tuned('strokeWidth', 0.0032) * 1.18 * MOVING.widthScale,
        points: tuned('points', 16),
        stepSize: tuned('stepSize', 0.012),
        seed: DIORAMA_CAPTURE.seed,
        openSkyBandV: 0.62,
        trailMaxV: 0.7,
        maxTurnCos: MOVING.maxTurnCos,
        minPoints: MOVING.minPoints,
        colourPerRibbon: true,
        smoothTrail: true,
      },
    }
    worker.postMessage(request)
    // a StrictMode remount or an unmount stops a build in flight, and frees a finished one
    return () => {
      worker.terminate()
      built?.dispose()
    }
  }, [alive, images, movingEver, touch])

  // Geometry is ready before the mode flips; the layout effect below switches wash and gradient in the same frame.
  const mode: SkyStyle = wanted === 'moving' && movingGeometry ? 'moving' : 'light'
  // Opened on ?sky=moving: until the worker's strokes land, draw no strokes rather than flash the light sky's for
  // about 0.3 s (Fable, plan-worker P2). After a click the light strokes stay until the swap, so nothing blanks.
  const [openedOnMoving] = useState(() => wanted === 'moving')
  const awaitingMoving = openedOnMoving && wanted === 'moving' && !movingGeometry && !movingFailed

  const ribbonMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: tuned('speed', 1.6) },
          uOpacity: { value: isFlowDebug ? 0.9 : Math.min(0.74, tuned('opacity', 0.45) * 1.36) },
          uPulseScale: { value: tuned('pulseScale', 7.5) },
          uFreeze: { value: paused ? 1 : 0 },
          uShimmerMix: { value: tuned('shimmerMix', 0.8) },
          uShimmerSpeed: { value: tuned('shimmerSpeed', 3) },
          uShimmerScale: { value: tuned('shimmerScale', 2.8) },
          uBristleFreq: { value: tuned('bristleFreq', 75) },
          uBristleAmp: { value: tuned('bristleAmp', 0.22) },
          uDebugMode: { value: isFlowDebug ? 1 : 0 },
          ...(alive ? gustUniforms() : {}),
          ...(touch ? touchUniforms() : {}),
        },
        defines: alive ? { ALIVE: 1, ...(touch ? { TOUCH: 1 } : {}) } : {},
        vertexShader: ribbonVert,
        fragmentShader: ribbonFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [alive, isFlowDebug, paused, touch],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    ribbonMaterial.uniforms.uFreeze.value = paused ? 1 : 0
    ribbonMaterial.uniforms.uDebugMode.value = isFlowDebug ? 1 : 0
    washMaterial.uniforms.uPainting.value = painting
    washMaterial.uniforms.uMask.value = mask
    washMaterial.uniforms.uExtendLeft.value = extendLeft
    washMaterial.uniforms.uExtendRight.value = extendRight
    washMaterial.uniforms.uDebugMode.value = isFlowDebug ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [extendLeft, extendRight, isFlowDebug, mask, painting, paused, ribbonMaterial, washMaterial])

  const movingMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: MOVING.speed },
          uPeriod: { value: MOVING.period },
          uStroke: { value: MOVING.stroke },
          uOpacity: { value: MOVING.opacity },
          ...(alive ? gustUniforms() : {}),
          ...(touch ? touchUniforms() : {}),
        },
        defines: alive ? { ALIVE: 1, ...(touch ? { TOUCH: 1 } : {}) } : {},
        vertexShader: movingVert,
        fragmentShader: movingFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [alive, touch],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    // The light material is rebuilt at t = 0 on every pause change; reset the moving clock to match.
    // Paused, useFrame writes nothing, so t = 0 is the still.
    if (paused) movingMaterial.uniforms.uTime.value = 0
    /* eslint-enable react-hooks/immutability */
  }, [movingMaterial, paused])

  // Layout effect: runs before paint in every update lane, so the strokes, wash and gradient switch in the
  // same frame. A passive effect could trail by one frame after a non-click update (review F4).
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    // the gust uniforms exist only on the ALIVE variant
    if (alive) {
      const knobs = gustUniformValues(tuning)
      for (const material of [ribbonMaterial, movingMaterial]) {
        material.uniforms.uAlive.value = 1
        material.uniforms.uGustAmp.value.set(...knobs.amplitudes)
        material.uniforms.uGustLift.value = knobs.lift
      }
      ribbonMaterial.uniforms.uGustShimmer.value = knobs.shimmer
    }
    washMaterial.uniforms.uMovingSky.value = mode === 'moving' ? 1 : 0
    // Set from the palette each time, never multiplied in place, so switching cannot drift.
    // LinearSRGBColorSpace = "these numbers are already working values": the hex reaches the screen unchanged
    const space = (end: GradientEnd) => (end.asDisplayed ? LinearSRGBColorSpace : SRGBColorSpace)
    const { top, bottom } = GRADIENT[mode]
    gradientMaterial.uniforms.uTop.value.setStyle(PALETTE.skyZenith, space(top)).multiplyScalar(top.scale)
    gradientMaterial.uniforms.uBottom.value.setStyle(PALETTE.skyHorizon, space(bottom)).multiplyScalar(bottom.scale)
    /* eslint-enable react-hooks/immutability */
  }, [alive, gradientMaterial, mode, movingMaterial, ribbonMaterial, tuning, washMaterial])

  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: camera-locked sky rotation + time uniform */
  useFrame(({ camera }, dt) => {
    if (skyRoot.current) {
      const transform = skyTransform(camera.quaternion, camera.position, homeInverse, anchor)
      skyRoot.current.quaternion.copy(transform.quaternion)
      skyRoot.current.position.copy(transform.position)
      if (typeof window !== 'undefined') {
        const w = window as Window & {
          __skyTransform?: () => {
            quaternion: [number, number, number, number] & { x: number; y: number; z: number; w: number }
            position: [number, number, number] & { x: number; y: number; z: number }
            camera: [number, number, number, number] & { x: number; y: number; z: number; w: number }
          }
        }
        w.__skyTransform = () => {
          const sq = skyRoot.current?.quaternion ?? transform.quaternion
          const sp = skyRoot.current?.position ?? transform.position
          const cq = camera.quaternion
          const qArr = [sq.x, sq.y, sq.z, sq.w] as [number, number, number, number] & { x: number; y: number; z: number; w: number }
          qArr.x = sq.x
          qArr.y = sq.y
          qArr.z = sq.z
          qArr.w = sq.w
          const pArr = [sp.x, sp.y, sp.z] as [number, number, number] & { x: number; y: number; z: number }
          pArr.x = sp.x
          pArr.y = sp.y
          pArr.z = sp.z
          const cArr = [cq.x, cq.y, cq.z, cq.w] as [number, number, number, number] & { x: number; y: number; z: number; w: number }
          cArr.x = cq.x
          cArr.y = cq.y
          cArr.z = cq.z
          cArr.w = cq.w
          return { quaternion: qArr, position: pArr, camera: cArr }
        }
      }
    }
    if (paused) {
      // the light material is rebuilt at t = 0 on a pause; the halos' still is the t = 0 state too. B: the
      // store is cleared, so no surge with a pre-pause t0 lies in wait for the clock to catch up (review F7)
      clock.current = 0
      if (touchStore?.current) {
        touchStore.current.surges = []
        touchStore.current.kicks = []
        touchStore.current.flares = []
      }
      return
    }
    const pinned = (window as SkyClockWindow).__skyTime
    if (typeof pinned === 'number' && Number.isFinite(pinned)) {
      ribbonMaterial.uniforms.uTime.value = pinned
      movingMaterial.uniforms.uTime.value = pinned
      clock.current = pinned
    } else {
      // C: during the arrival the step is the rate times a bounded delta; otherwise the frame's own
      const step = arrivalStep?.current ?? dt
      ribbonMaterial.uniforms.uTime.value += step
      // both clocks run whichever sky is shown, so switching never jumps either one
      movingMaterial.uniforms.uTime.value += step
      clock.current = ribbonMaterial.uniforms.uTime.value
    }
    // B: the store into the uniforms, pruned first so nothing leaves a list with a value in it (review F1)
    if (touch && touchStore?.current) {
      const store = touchStore.current
      const t = clock.current
      store.surges = pruneSurges(store.surges, t)
      store.kicks = pruneKicks(store.kicks, t)
      store.flares = pruneFlares(store.flares, t)
      for (const material of [ribbonMaterial, movingMaterial]) {
        const u = material.uniforms
        const surges = u.uSurge.value as Float32Array
        const ends = u.uSurgeEnd.value as Float32Array
        const n = Math.min(16, store.surges.length)
        for (let i = 0; i < n; i++) {
          const s = store.surges[i]
          surges[i * 4] = s.u
          surges[i * 4 + 1] = s.v
          surges[i * 4 + 2] = s.t0
          surges[i * 4 + 3] = s.amp
          ends[i] = s.end
        }
        u.uSurgeCount.value = n
        const kicks = u.uKick.value as Float32Array
        const m = Math.min(4, store.kicks.length)
        for (let i = 0; i < m; i++) {
          const k = store.kicks[i]
          kicks[i * 4] = k.u
          kicks[i * 4 + 1] = k.v
          kicks[i * 4 + 2] = k.t0
          kicks[i * 4 + 3] = k.amp
        }
        u.uKickCount.value = m
      }
    }
  })
  /* eslint-enable react-hooks/immutability */

  // One cleanup per resource, keyed on that resource alone: a combined effect disposed the stable
  // wash and gradient materials whenever the ribbon material was rebuilt on pause (review F7).
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => washGeometry.dispose(), [washGeometry])
  useEffect(() => () => bodiesGeometry.dispose(), [bodiesGeometry])
  useEffect(() => () => ribbonMaterial.dispose(), [ribbonMaterial])
  useEffect(() => () => movingMaterial.dispose(), [movingMaterial])
  useEffect(() => () => washMaterial.dispose(), [washMaterial])
  useEffect(() => () => bodiesMaterial.dispose(), [bodiesMaterial])
  useEffect(() => () => gradientMaterial.dispose(), [gradientMaterial])

  // One ribbon mesh; its geometry and material switch together. A swapped prop never unmounts the mesh.
  const ribbons = mode === 'moving' ? { geometry: movingGeometry, material: movingMaterial } : { geometry, material: ribbonMaterial }

  // C: the ready seam, written after commit so the mesh below draws on the frame the arrival first reads it
  useLayoutEffect(() => {
    if (readyRef) readyRef.current = Boolean(ribbons.geometry) && !awaitingMoving
  }, [readyRef, ribbons.geometry, awaitingMoving])

  return (
    <group ref={skyRoot}>
      <mesh renderOrder={-4}>
        <sphereGeometry args={[DOME_R + 4, 32, 24]} />
        <primitive object={gradientMaterial} attach="material" />
      </mesh>
      {/* SkyEdgeBackfill (the whisper wash) is deleted: the S4 side strips continue the real
          painting past the canvas edges and melt into the gradient via the side fade */}
      {/* moving sky: the wash keeps only the scan's star and moon bodies, drawn OVER the opaque strokes.
          Opened on the moving sky, the wash and the halos wait with the strokes: drawn alone they are the painting's
          own sky, and the moving strokes popping in over it read as "painted light for a second, then moving"
          (Mark, live, 2026-10-20). Until the worker lands the sky is the gradient alone, then it arrives whole. */}
      <mesh geometry={washGeometry} material={washMaterial} frustumCulled={false} renderOrder={mode === 'moving' ? 2.5 : -1} visible={!awaitingMoving} />
      <mesh geometry={bodiesGeometry} material={bodiesMaterial} frustumCulled={false} renderOrder={2.6} visible={mode === 'moving'} />
      {ribbons.geometry && !awaitingMoving && (
        <mesh geometry={ribbons.geometry} material={ribbons.material} frustumCulled={false} renderOrder={2} />
      )}
      <group visible={!awaitingMoving}>
        <SourceOrbs debug={debug} moonGlow={mode === 'moving' ? MOVING.moonGlow : undefined} clock={clock} alive={alive} breath={tuning.breath} touch={touch} touchStore={touchStore} />
      </group>
    </group>
  )
}
