import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { button, useControls } from 'leva'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  NoColorSpace,
  NormalBlending,
  ShaderMaterial,
  Vector2,
  Vector4,
} from 'three'
import { useImageData } from './useImageData'
import { IMG_TO_CLIP_GLSL, TEX_ASPECT } from './skyFraming'
import { HALO_SWIRLS, MOON_R, MOON_UV } from './skySwirls'
import { tuned, saveDefaults } from './tuning'
import { buildSourceStreamlineRibbons } from './streamlineGeometry'

const vert = /* glsl */ `
  attribute float aLen;
  attribute float aAcross;
  attribute float aPhase;
  attribute float aRate;
  attribute vec3 aColor;
  uniform float uViewA, uTexA, uFreeze;
  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vFreeze;
  varying vec2 vImgUv;
  ${IMG_TO_CLIP_GLSL}
  void main() {
    vLen = aLen;
    vAcross = aAcross;
    vPhase = aPhase;
    vRate = aRate;
    vColor = aColor;
    vFreeze = uFreeze;
    vImgUv = position.xy;
    gl_Position = vec4(imgToClip(position.xy, uViewA, uTexA), 0.0, 1.0);
  }
`

const frag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uPulseScale;
  uniform float uShimmerMix;
  uniform float uShimmerSpeed;
  uniform float uShimmerScale;
  uniform float uBristleFreq;
  uniform float uBristleAmp;
  uniform sampler2D uMask;
  uniform vec4 uHalos[10];
  uniform vec2 uMoonUV;
  uniform float uMoonR;

  varying float vLen;
  varying float vAcross;
  varying float vPhase;
  varying float vRate;
  varying vec3 vColor;
  varying float vFreeze;
  varying vec2 vImgUv;

  float getEffectiveMask(vec2 uv, float rawMask) {
    // Check if inside moon crescent
    float distToMoon = distance(uv, uMoonUV);
    if (distToMoon < uMoonR) {
      return 0.0;
    }
    
    float bestMask = rawMask;
    
    // Check if inside any of the 10 halo swirls
    for (int i = 0; i < 10; i++) {
      vec4 swirl = uHalos[i]; // vec4(u, v, sign, radius)
      float dist = distance(uv, swirl.xy);
      float sr = swirl.w;
      
      bool isMoonSwirl = (abs(swirl.x - uMoonUV.x) < 0.001 && abs(swirl.y - uMoonUV.y) < 0.001);
      if (isMoonSwirl) {
        // Moon annulus: inner fade and outer fade
        if (dist >= uMoonR && dist < sr * 1.5) {
          float val = 1.0;
          if (dist < uMoonR + 0.02) {
            val = smoothstep(uMoonR, uMoonR + 0.02, dist);
          } else if (dist > sr * 1.0) {
            float t = smoothstep(sr * 1.5, sr * 1.0, dist);
            val = mix(rawMask, 1.0, t);
          }
          bestMask = max(bestMask, val);
        }
      } else {
        // Star swirl: outer fade
        if (dist < sr * 1.5) {
          float val = 1.0;
          if (dist > sr * 1.0) {
            float t = smoothstep(sr * 1.5, sr * 1.0, dist);
            val = mix(rawMask, 1.0, t);
          }
          bestMask = max(bestMask, val);
        }
      }
    }
    
    return bestMask;
  }

  void main() {
    float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
    float taper = smoothstep(0.0, 0.15, vLen) * smoothstep(1.0, 0.85, vLen);
    
    // Flow speed animation, frozen completely when reduced-motion / pause is active
    float flowTime = mix(uTime, 0.0, vFreeze);
    
    // Dual-frequency combined flow
    float flow = 0.5 + 0.5 * sin(vLen * uPulseScale - flowTime * uSpeed * vRate + vPhase);
    float shimmer = 0.5 + 0.5 * sin(vLen * (uPulseScale * uShimmerScale) - flowTime * (uSpeed * uShimmerSpeed) * vRate + vPhase * 2.7);
    float combinedFlow = mix(flow, shimmer, uShimmerMix);
    
    // Bristle pattern along the ribbon width
    float bristle = (1.0 - uBristleAmp) + uBristleAmp * sin(vAcross * uBristleFreq + sin(vLen * 45.0) * 3.0);
    
    // Impasto relief ridge Shading
    float ridge = 0.82 + 0.36 * edge;
    vec3 col = vColor * (0.62 + 0.38 * combinedFlow) * ridge * bristle;
    
    // Gentle saturation boost to emulate thick, vibrant paint
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, 1.15), 0.0, 1.0);
    
    // Sample the raw mask and compute the effective mask (overriding cores & moon)
    float rawMask = texture2D(uMask, vImgUv).r;
    float maskVal = getEffectiveMask(vImgUv, rawMask);
    
    float a = edge * taper * uOpacity * maskVal;
    if (a < 0.015) discard;
    gl_FragColor = vec4(col, a);
  }
`

export function StreamlineSky({ paused = false }: { paused?: boolean }) {
  const size = useThree((s) => s.size)
  const flowData = useImageData('/reference/signed-flow.png')
  const maskData = useImageData('/reference/sky-mask.png')
  const paintingData = useImageData('/reference/painting.jpg')
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])

  useEffect(() => {
    for (const tex of [painting, mask]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask])

  // Leva controls configured for interactive streamline tuning
  const {
    count,
    speed,
    opacity,
    strokeWidth,
    points,
    stepSize,
    pulseScale,
    shimmerMix,
    shimmerSpeed,
    shimmerScale,
    bristleFreq,
    bristleAmp,
  } = useControls('streamline sky', {
    // Defaults come from sky-tuning.json (the "set as default" button writes it); the second arg is the
    // factory fallback if the JSON lacks a key. See src/scene/tuning.ts.
    count: { value: tuned('count', 3000), min: 200, max: 4000, step: 50, label: 'count' },
    speed: { value: tuned('speed', 1.6), min: 0, max: 2.5, step: 0.05, label: 'speed' },
    opacity: { value: tuned('opacity', 0.55), min: 0, max: 1.0, step: 0.05, label: 'opacity' },
    strokeWidth: { value: tuned('strokeWidth', 0.0032), min: 0.002, max: 0.02, step: 0.0005, label: 'stroke width' },
    points: { value: tuned('points', 16), min: 6, max: 32, step: 1, label: 'points' },
    stepSize: { value: tuned('stepSize', 0.012), min: 0.005, max: 0.03, step: 0.001, label: 'step size' },
    pulseScale: { value: tuned('pulseScale', 8.0), min: 2.0, max: 20.0, step: 0.5, label: 'pulse scale' },
    shimmerMix: { value: tuned('shimmerMix', 0.30), min: 0, max: 1.0, step: 0.05, label: 'shimmer mix' },
    shimmerSpeed: { value: tuned('shimmerSpeed', 2.5), min: 0.5, max: 5.0, step: 0.1, label: 'shimmer speed' },
    shimmerScale: { value: tuned('shimmerScale', 2.5), min: 0.5, max: 5.0, step: 0.1, label: 'shimmer scale' },
    bristleFreq: { value: tuned('bristleFreq', 75.0), min: 10.0, max: 200.0, step: 5.0, label: 'bristle freq' },
    bristleAmp: { value: tuned('bristleAmp', 0.22), min: 0.0, max: 0.5, step: 0.02, label: 'bristle amp' },
    // Persist the current panel values (both folders) as the baked defaults. `get` reads the live store.
    'set as default': button((get) =>
      saveDefaults({
        churnSpeed: get('living painting.churnSpeed'),
        flowAmount: get('living painting.flowAmount'),
        count: get('streamline sky.count'),
        speed: get('streamline sky.speed'),
        opacity: get('streamline sky.opacity'),
        strokeWidth: get('streamline sky.strokeWidth'),
        points: get('streamline sky.points'),
        stepSize: get('streamline sky.stepSize'),
        pulseScale: get('streamline sky.pulseScale'),
        shimmerMix: get('streamline sky.shimmerMix'),
        shimmerSpeed: get('streamline sky.shimmerSpeed'),
        shimmerScale: get('streamline sky.shimmerScale'),
        bristleFreq: get('streamline sky.bristleFreq'),
        bristleAmp: get('streamline sky.bristleAmp'),
      }),
    ),
  })

  // Build the streamlines geometry once on the CPU when image data is fully resolved
  const geometry = useMemo(() => {
    if (!flowData || !maskData || !paintingData) return null

    const positions: number[] = []
    const colors: number[] = []
    const aLen: number[] = []
    const aAcross: number[] = []
    const aPhase: number[] = []
    const aRate: number[] = []
    const ribbons = buildSourceStreamlineRibbons({
      flowData,
      maskData,
      paintingData,
      count,
      strokeWidth,
      points,
      stepSize,
      seed: 0x5712a3,
    })

    for (const vertex of ribbons.vertices) {
      positions.push(vertex.u, vertex.v, 0)
      colors.push(...vertex.color)
      aLen.push(vertex.len)
      aAcross.push(vertex.across)
      aPhase.push(vertex.phase)
      aRate.push(vertex.rate)
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3))
    geo.setAttribute('aLen', new BufferAttribute(new Float32Array(aLen), 1))
    geo.setAttribute('aAcross', new BufferAttribute(new Float32Array(aAcross), 1))
    geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(aPhase), 1))
    geo.setAttribute('aRate', new BufferAttribute(new Float32Array(aRate), 1))
    geo.setIndex(ribbons.indices)
    return geo
  }, [flowData, maskData, paintingData, count, strokeWidth, points, stepSize])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uOpacity: { value: opacity },
          uPulseScale: { value: pulseScale },
          uViewA: { value: 1.6 },
          uTexA: { value: TEX_ASPECT },
          uFreeze: { value: 0 },
          uShimmerMix: { value: shimmerMix },
          uShimmerSpeed: { value: shimmerSpeed },
          uShimmerScale: { value: shimmerScale },
          uBristleFreq: { value: bristleFreq },
          uBristleAmp: { value: bristleAmp },
          uMask: { value: mask },
          uHalos: { value: HALO_SWIRLS.map((s) => new Vector4(s[0], s[1], s[2], s[3])) },
          uMoonUV: { value: new Vector2(MOON_UV[0], MOON_UV[1]) },
          uMoonR: { value: MOON_R },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [speed, opacity, pulseScale, shimmerMix, shimmerSpeed, shimmerScale, bristleFreq, bristleAmp, mask],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- uniform config updates */
    material.uniforms.uOpacity.value = opacity
    material.uniforms.uSpeed.value = speed
    material.uniforms.uPulseScale.value = pulseScale
    material.uniforms.uShimmerMix.value = shimmerMix
    material.uniforms.uShimmerSpeed.value = shimmerSpeed
    material.uniforms.uShimmerScale.value = shimmerScale
    material.uniforms.uBristleFreq.value = bristleFreq
    material.uniforms.uBristleAmp.value = bristleAmp
    material.uniforms.uMask.value = mask
    /* eslint-enable react-hooks/immutability */
  }, [
    material,
    speed,
    opacity,
    pulseScale,
    shimmerMix,
    shimmerSpeed,
    shimmerScale,
    bristleFreq,
    bristleAmp,
    mask,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    material.uniforms.uViewA.value = size.width / size.height
  }, [material, size])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    material.uniforms.uFreeze.value = paused ? 1.0 : 0.0
  }, [material, paused])

  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => geometry?.dispose(), [geometry])

  useFrame((_, dt) => {
    if (paused) return
    // eslint-disable-next-line react-hooks/immutability
    material.uniforms.uTime.value += dt
  })

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
}
