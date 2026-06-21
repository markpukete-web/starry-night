import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  type Texture,
} from 'three'
import type { Dab } from './dabField'
import { DOME_R } from './skyMapping'

export function buildDabGeometry(dabs: Dab[]): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, -1, 0.5, 0]), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
  g.setIndex([0, 1, 2, 0, 2, 3])

  const n = dabs.length
  const iDir = new Float32Array(n * 3)
  const iTangent = new Float32Array(n * 3)
  const iColor = new Float32Array(n * 3)
  const iScale = new Float32Array(n)
  const iPhase = new Float32Array(n)
  const iDrift = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const d = dabs[k]
    iDir[k * 3] = d.dir.x; iDir[k * 3 + 1] = d.dir.y; iDir[k * 3 + 2] = d.dir.z
    iTangent[k * 3] = d.tangent.x; iTangent[k * 3 + 1] = d.tangent.y; iTangent[k * 3 + 2] = d.tangent.z
    iColor[k * 3] = d.color[0]; iColor[k * 3 + 1] = d.color[1]; iColor[k * 3 + 2] = d.color[2]
    iScale[k] = d.scale; iPhase[k] = d.phase; iDrift[k] = d.drift
  }
  g.setAttribute('iDir', new InstancedBufferAttribute(iDir, 3))
  g.setAttribute('iTangent', new InstancedBufferAttribute(iTangent, 3))
  g.setAttribute('iColor', new InstancedBufferAttribute(iColor, 3))
  g.setAttribute('iScale', new InstancedBufferAttribute(iScale, 1))
  g.setAttribute('iPhase', new InstancedBufferAttribute(iPhase, 1))
  g.setAttribute('iDrift', new InstancedBufferAttribute(iDrift, 1))
  g.instanceCount = n
  return g
}

const dabVert = /* glsl */ `
  attribute vec3 iDir;
  attribute vec3 iTangent;
  attribute vec3 iColor;
  attribute float iScale;
  attribute float iPhase;
  attribute float iDrift;
  uniform float uTime;
  uniform float uDriftSpeed;
  uniform float uDrift;
  uniform float uWidth;
  uniform float uDomeR;
  uniform float uFreeze;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float t = fract(iPhase + uTime * uDriftSpeed);
    float a = t * iDrift * uDrift;                         // arc travelled along the great circle
    vec3 dir = normalize(iDir * cos(a) + iTangent * sin(a));
    vec3 along = normalize(iTangent * cos(a) - iDir * sin(a)); // unit tangent at the advected point
    vec3 across = normalize(cross(dir, along));
    // Ribbon length is DECOUPLED from the width control: consecutive dabs along a streamline sit STEP*R
    // (~0.3) apart, so length must stay long enough to TOUCH the neighbour (continuous ribbons, not
    // dashes) REGARDLESS of width. Width is the crispness knob — thinner = crisper, distinct impasto
    // strokes rather than a blended blur; it no longer shortens the ribbon when reduced.
    float halfLen = iScale * 2.7;
    float halfWid = iScale * uWidth * 0.5;
    vec3 world = dir * uDomeR + along * (position.x * halfLen) + across * (position.y * halfWid * 2.0);
    vUv = uv;
    vColor = iColor;
    // born→peak→die, but floored to full when frozen so a paused still has no coverage gaps
    vFade = max(sin(3.14159265 * t), uFreeze);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`

const dabFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uBrush;
  uniform float uSat;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec4 b = texture2D(uBrush, vUv);
    float alpha = b.a * clamp(vFade, 0.0, 1.0);
    if (alpha < 0.01) discard;
    float relief = 0.7 + 0.6 * b.r;                        // brush.r encodes raised-paint relief
    vec3 col = vColor * relief;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, uSat), 0.0, 2.0);
    // P5: deepen toward cobalt NIGHT — pull the low/mid (blue field) strokes down while holding the
    // bright highlight filaments and near-star creams, so the swirls stay luminous against a deep sky
    // and the stars/moon pop. A flat darken would kill the motion; the tone curve keeps the contrast.
    float bl = dot(vColor, vec3(0.299, 0.587, 0.114));
    col *= mix(0.58, 1.0, smoothstep(0.32, 0.8, bl));
    gl_FragColor = vec4(col, alpha);
  }
`

export function makeDabMaterial(brush: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDriftSpeed: { value: 0 }, // still until Task 5
      uDrift: { value: 0.06 },   // absolute drift arc (live via the repurposed control in Task 5)
      uWidth: { value: 1 },
      uSat: { value: 1.3 },
      uDomeR: { value: DOME_R },
      uBrush: { value: brush },
      uFreeze: { value: 1 },     // 1 = full-coverage still (Task 5 drops it to 0 while playing)
    },
    vertexShader: dabVert,
    fragmentShader: dabFrag,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: NormalBlending,
  })
}
