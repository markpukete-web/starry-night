import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  type Texture,
} from 'three'
import type { ImageData2D } from './useImageData.ts'
import { mulberry32 } from './brush.ts'
import { IMG_TO_CLIP_GLSL, TEX_ASPECT } from './skyFraming.ts'
import { HALO_SWIRLS, MOON_UV, MOON_R } from './skySwirls.ts'

// Brush-dab churn: instanced strokes cut from the painting itself, drifting along the derived SIGNED flow
// over the real-painting base, so the brushwork lifts and churns without flattening into a translucent fog.
// Image-space convention (y-down) shared with LivingPainting via skyFraming → exact registration.

export type Dab2D = {
  home: [number, number]
  tangent: [number, number]
  scale: number
  phase: number
  len: number
  orbitCentre: [number, number]
  orbitWeight: number
  orbitSign: number
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Halo orbit anchor for a dab at painting-UV (u,v): the dominant HALO_SWIRL it belongs to, an ANNULAR
 * 0..1 weight, and that swirl's rotation sign. The weight peaks in the swirl's RING band (≈0 at the
 * centre — where rel→0 so orbit is invisible anyway — and ≈0 past the halo edge). The annulus is the
 * point: it concentrates the spin where the bright rotating ring should read, instead of a centre-peaked
 * blob that barely moves and smears motion broadly (Mark P1/P2). The shader keeps the angular speed
 * CONSTANT and uses this weight only to blend orbit-vs-drift, so the ring turns rigidly (v = ωR, strongest
 * at the ring radius). Open sky → 0 (pure drift). The painted moon crescent (within MOON_R) → 0 so only
 * the ring around it turns. Centres/signs come from skySwirls.ts (the SAME table the mask bake uses).
 */
export function haloOrbit(u: number, v: number): { centre: [number, number]; weight: number; sign: number } {
  let best = 0
  let cx = u
  let cy = v
  let sign = 0
  for (const [sx, sy, s, r] of HALO_SWIRLS) {
    const d = Math.hypot(u - sx, v - sy)
    const w = smoothstep(0, 0.55 * r, d) * (1 - smoothstep(0.9 * r, 1.35 * r, d)) // ring band, peak ≈ 0.7r
    if (w > best) {
      best = w
      cx = sx
      cy = sy
      sign = s
    }
  }
  // the painted moon disc stays crisp and still — only its halo ring orbits
  if (Math.hypot(u - MOON_UV[0], v - MOON_UV[1]) < MOON_R) return { centre: [u, v], weight: 0, sign: 0 }
  if (best < 0.05) return { centre: [u, v], weight: 0, sign: 0 }
  return { centre: [cx, cy], weight: best, sign }
}

function sampleRGB(img: ImageData2D, u: number, v: number): [number, number, number] {
  const x = Math.min(img.width - 1, Math.max(0, Math.round(u * img.width)))
  const y = Math.min(img.height - 1, Math.max(0, Math.round(v * img.height)))
  const i = (y * img.width + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}

/** Seed dabs only where the sky-mask is set; tangent = the baked signed-flow direction (image y-down). */
export function buildDabField2D({
  flow,
  mask,
  count,
  seed = 0x2b1a7f,
}: {
  flow: ImageData2D
  mask: ImageData2D
  count: number
  seed?: number
}): Dab2D[] {
  const rng = mulberry32(seed)
  const dabs: Dab2D[] = []
  let guard = 0
  while (dabs.length < count && guard < count * 40) {
    guard++
    const u = rng()
    const v = rng()
    if (sampleRGB(mask, u, v)[0] < 128) continue // sky only — no dabs on cypress/village/moon
    const [fr, fg] = sampleRGB(flow, u, v)
    let dx = (fr / 255) * 2 - 1
    let dy = (fg / 255) * 2 - 1 // image y-down directed flow (getImageData is image-space — no negation)
    const m = Math.hypot(dx, dy) || 1
    dx /= m
    dy /= m
    const orbit = haloOrbit(u, v)
    dabs.push({
      home: [u, v],
      tangent: [dx, dy],
      scale: 0.006 + 0.006 * rng(),
      phase: rng(),
      len: 0.018 + 0.014 * rng(), // drift distance (image-UV) — capped short to bound colour transport
      orbitCentre: orbit.centre,
      orbitWeight: orbit.weight,
      orbitSign: orbit.sign,
    })
  }
  return dabs
}

export function brushDabGeometry(dabs: Dab2D[]): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, -1, 0.5, 0]), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  const n = dabs.length
  const home = new Float32Array(n * 2)
  const tan = new Float32Array(n * 2)
  const sca = new Float32Array(n)
  const pha = new Float32Array(n)
  const len = new Float32Array(n)
  const orbC = new Float32Array(n * 2)
  const orbW = new Float32Array(n)
  const orbS = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const d = dabs[k]
    home[k * 2] = d.home[0]
    home[k * 2 + 1] = d.home[1]
    tan[k * 2] = d.tangent[0]
    tan[k * 2 + 1] = d.tangent[1]
    sca[k] = d.scale
    pha[k] = d.phase
    len[k] = d.len
    orbC[k * 2] = d.orbitCentre[0]
    orbC[k * 2 + 1] = d.orbitCentre[1]
    orbW[k] = d.orbitWeight
    orbS[k] = d.orbitSign
  }
  g.setAttribute('aHome', new InstancedBufferAttribute(home, 2))
  g.setAttribute('aTangent', new InstancedBufferAttribute(tan, 2))
  g.setAttribute('aScale', new InstancedBufferAttribute(sca, 1))
  g.setAttribute('aPhase', new InstancedBufferAttribute(pha, 1))
  g.setAttribute('aLen', new InstancedBufferAttribute(len, 1))
  g.setAttribute('aOrbitCentre', new InstancedBufferAttribute(orbC, 2))
  g.setAttribute('aOrbitWeight', new InstancedBufferAttribute(orbW, 1))
  g.setAttribute('aOrbitSign', new InstancedBufferAttribute(orbS, 1))
  g.instanceCount = n
  return g
}

const dabVert = /* glsl */ `
  attribute vec2 aHome;
  attribute vec2 aTangent;
  attribute float aScale;
  attribute float aPhase;
  attribute float aLen;
  attribute vec2 aOrbitCentre;
  attribute float aOrbitWeight;
  attribute float aOrbitSign;
  uniform float uTime, uSpeed, uViewA, uTexA, uFreeze, uSize, uDrift, uOmega;
  varying vec2 vUv;
  varying vec2 vImg;
  varying vec2 vHome;
  varying vec2 vSourceImg;
  varying float vFade;
  ${IMG_TO_CLIP_GLSL}
  void main() {
    float t = fract(aPhase + uTime * uSpeed);
    vec2 straight = aHome + aTangent * (aLen * uDrift) * t;   // open sky: drift along the flow
    // halo rings: orbit the dab's POSITION around its swirl centre. Angular speed is CONSTANT (decoupled
    // from the weight) so the ring turns RIGIDLY — v = ωR, strongest at the ring radius where rel is large,
    // which is exactly where the bright annulus should read (Mark P1). aOrbitWeight (annular) only blends
    // orbit-vs-drift, concentrating the spin in the ring band. Orientation stays = aTangent (below) so
    // neighbours still point different ways → dabby brushwork, not a smooth 'water' vortex. aOrbitSign
    // matches the baked circulation so it turns the right way.
    float ang = uOmega * aOrbitSign * t;
    float ca = cos(ang), sa = sin(ang);
    vec2 rel = aHome - aOrbitCentre;
    vec2 orbited = aOrbitCentre + vec2(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y);
    vec2 center = mix(straight, orbited, aOrbitWeight);
    vec2 along = aTangent;
    vec2 across = vec2(-along.y, along.x);
    float halfLen = aScale * uSize * 2.2;                     // elongated impasto stroke (length > width)
    float halfWid = aScale * uSize * 0.7;
    vec2 footprint = position.x * halfLen * along + position.y * (halfWid * 2.0) * across;
    vec2 imgPos = center + footprint;
    vec2 sourceImg = aHome + footprint;
    gl_Position = vec4(imgToClip(imgPos, uViewA, uTexA), 0.0, 1.0);
    vUv = uv;
    vImg = imgPos;                                            // this fragment's painting-UV (footprint mask)
    vHome = aHome;
    vSourceImg = sourceImg;                                    // same brush footprint, sampled at the home patch
    vFade = sin(3.14159265 * t) * (1.0 - uFreeze);            // born→peak→die; frozen → 0 (base only)
  }
`

const dabFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting, uMask;
  uniform float uOpacity, uPatchStrokes;
  varying vec2 vUv;
  varying vec2 vImg;
  varying vec2 vHome;
  varying vec2 vSourceImg;
  varying float vFade;
  void main() {
    vec2 q = vUv * 2.0 - 1.0;                                 // local stroke coords [-1,1]
    float brush = smoothstep(1.0, 0.15, length(q));           // soft elongated impasto mark
    vec2 dstUv = clamp(vImg, vec2(0.0), vec2(1.0));
    vec2 patchUv = clamp(vSourceImg, vec2(0.0), vec2(1.0));
    float dstMask = texture2D(uMask, dstUv).r;                 // per-fragment footprint mask: dab edge that
                                                             // laps onto cypress/village/moon fades to nothing
    float srcMask = mix(1.0, texture2D(uMask, patchUv).r, uPatchStrokes);
    float a = brush * vFade * dstMask * srcMask * uOpacity;
    if (a < 0.02) discard;
    vec2 paintUv = mix(vHome, patchUv, uPatchStrokes);
    vec3 col = texture2D(uPainting, paintUv).rgb;             // patch mode carries the painting's actual detail
    gl_FragColor = vec4(col, a);
  }
`

export function makeBrushDabMaterial(painting: Texture, mask: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uPainting: { value: painting },
      uMask: { value: mask },
      uTime: { value: 0 },
      uSpeed: { value: 0.1 },
      uViewA: { value: 1.6 },
      uTexA: { value: TEX_ASPECT },
      uFreeze: { value: 0 },
      uSize: { value: 0.5 }, // crisp default (Mark); the leva 'dab size' control overrides live
      uDrift: { value: 0.45 },
      uOmega: { value: 0.5 }, // halo-orbit sweep (rad over a dab's life); leva 'halo spin' overrides live
      uOpacity: { value: 0.42 },
      uPatchStrokes: { value: 1 },
    },
    vertexShader: dabVert,
    fragmentShader: dabFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
    side: DoubleSide, // imgToClip flips Y → quad winding reverses; without this FrontSide culls every dab
  })
}
