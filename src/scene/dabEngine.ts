import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  type Texture,
} from 'three'
import type { ImageData2D } from './useImageData'
import { mulberry32 } from './brush'
import { IMG_TO_CLIP_GLSL, TEX_ASPECT } from './skyFraming'

// Brush-dab churn: instanced strokes coloured from the painting's OWN pixels (sampled at each dab's home
// uv), drifting along the derived SIGNED flow over the real-painting base, so the brushwork lifts and
// churns. Image-space convention (y-down) shared with LivingPainting via skyFraming → exact registration.

export type Dab2D = { home: [number, number]; tangent: [number, number]; scale: number; phase: number; len: number }

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
    dabs.push({
      home: [u, v],
      tangent: [dx, dy],
      scale: 0.006 + 0.006 * rng(),
      phase: rng(),
      len: 0.018 + 0.014 * rng(), // drift distance (image-UV) — capped short to bound colour transport
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
  for (let k = 0; k < n; k++) {
    const d = dabs[k]
    home[k * 2] = d.home[0]
    home[k * 2 + 1] = d.home[1]
    tan[k * 2] = d.tangent[0]
    tan[k * 2 + 1] = d.tangent[1]
    sca[k] = d.scale
    pha[k] = d.phase
    len[k] = d.len
  }
  g.setAttribute('aHome', new InstancedBufferAttribute(home, 2))
  g.setAttribute('aTangent', new InstancedBufferAttribute(tan, 2))
  g.setAttribute('aScale', new InstancedBufferAttribute(sca, 1))
  g.setAttribute('aPhase', new InstancedBufferAttribute(pha, 1))
  g.setAttribute('aLen', new InstancedBufferAttribute(len, 1))
  g.instanceCount = n
  return g
}

const dabVert = /* glsl */ `
  attribute vec2 aHome;
  attribute vec2 aTangent;
  attribute float aScale;
  attribute float aPhase;
  attribute float aLen;
  uniform float uTime, uSpeed, uViewA, uTexA, uFreeze, uSize, uDrift;
  varying vec2 vUv;
  varying vec2 vImg;
  varying vec2 vHome;
  varying float vFade;
  ${IMG_TO_CLIP_GLSL}
  void main() {
    float t = fract(aPhase + uTime * uSpeed);
    vec2 center = aHome + aTangent * (aLen * uDrift) * t;     // drift along the flow → rotates round swirls
    vec2 along = aTangent;
    vec2 across = vec2(-along.y, along.x);
    float halfLen = aScale * uSize * 2.2;                     // elongated impasto stroke (length > width)
    float halfWid = aScale * uSize * 0.7;
    vec2 imgPos = center + position.x * halfLen * along + position.y * (halfWid * 2.0) * across;
    gl_Position = vec4(imgToClip(imgPos, uViewA, uTexA), 0.0, 1.0);
    vUv = uv;
    vImg = imgPos;                                            // this fragment's painting-UV (footprint mask)
    vHome = aHome;
    vFade = sin(3.14159265 * t) * (1.0 - uFreeze);            // born→peak→die; frozen → 0 (base only)
  }
`

const dabFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting, uMask;
  varying vec2 vUv;
  varying vec2 vImg;
  varying vec2 vHome;
  varying float vFade;
  void main() {
    vec2 q = vUv * 2.0 - 1.0;                                 // local stroke coords [-1,1]
    float brush = smoothstep(1.0, 0.15, length(q));           // soft elongated impasto mark
    float mask = texture2D(uMask, vImg).r;                    // per-fragment footprint mask: dab edge that
                                                             // laps onto cypress/village/moon fades to nothing
    float a = brush * vFade * mask;
    if (a < 0.02) discard;
    vec3 col = texture2D(uPainting, vHome).rgb;               // the painting's OWN colour at the dab origin
    gl_FragColor = vec4(col, a);
  }
`

export function makeBrushDabMaterial(painting: Texture, mask: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uPainting: { value: painting },
      uMask: { value: mask },
      uTime: { value: 0 },
      uSpeed: { value: 0.15 },
      uViewA: { value: 1.6 },
      uTexA: { value: TEX_ASPECT },
      uFreeze: { value: 0 },
      uSize: { value: 0.55 }, // crisp default (Mark); the leva 'dab size' control overrides live
      uDrift: { value: 1 },
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
