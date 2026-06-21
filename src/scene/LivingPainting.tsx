import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls } from 'leva'
import { LinearFilter, NoColorSpace, ShaderMaterial } from 'three'

// The painting, brought to life. A full-screen quad shows the REAL painting and a flow-map advection
// shader flows its own brushstrokes along the derived SIGNED flow field, masked to the sky — so it looks
// exactly like the painting (it is the painting) with the sky gently churning. Phase 1: flat. Phase 2
// splits it into depth layers for 2.5D parallax.

const TEX_ASPECT = 1280 / 1013 // analysis size of the derived assets; painting.jpg shares the aspect

// Full-screen triangle/quad: the 2×2 plane's xy IS clip space, so it fills the viewport regardless of
// the camera (Phase 1 is flat and head-on).
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting, uFlow, uMask;
  uniform float uTime, uSpeed, uAmp, uFreeze, uViewA, uTexA;
  varying vec2 vUv;

  // contain-fit: show the WHOLE painting (village included), letterboxed, without distorting it
  vec2 containUv(vec2 uv, float va, float ta) {
    vec2 st = va > ta ? vec2(va / ta, 1.0) : vec2(1.0, ta / va);
    return (uv - 0.5) * st + 0.5;
  }

  void main() {
    vec2 img = containUv(vUv, uViewA, uTexA);
    if (img.x < 0.0 || img.x > 1.0 || img.y < 0.0 || img.y > 1.0) {
      gl_FragColor = vec4(0.043, 0.102, 0.227, 1.0); // deep-night letterbox bars (matches #0b1a3a)
      return;
    }
    vec4 fl = texture2D(uFlow, img);
    vec2 dir = fl.rg * 2.0 - 1.0;          // directed flow (baked signed) — no half-plane hack
    dir.y = -dir.y;                        // bake is image y-down; flipY=true makes +v visually up (Codex)
    float coh = fl.b;
    float mask = texture2D(uMask, img).r;  // 1 = sky (animate), 0 = foreground/moon (still)
    // coherence only DAMPENS (floor 0.65) — it must not throttle the sky to a standstill
    float amp = uAmp * mask * mix(0.65, 1.0, coh) * (1.0 - uFreeze);

    vec2 f = dir * amp;
    // CHURN, not water-flow: 3 phase-taps along the flow (smoother than 2-tap, so the motion can be
    // stronger without ghosting) with a smooth spatial phase offset, so neighbouring regions roll OUT
    // of sync — the sky churns in turbulent rolling waves instead of sliding uniformly like a sheet.
    float roll = 0.5 * (sin(img.x * 9.0 + img.y * 3.0) + sin(img.y * 7.0 - img.x * 4.0));
    float baseP = uTime * uSpeed + roll;
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int k = 0; k < 3; k++) {
      float ph = fract(baseP + float(k) * 0.3333);
      float w = 1.0 - abs(ph - 0.5) * 2.0; // each tap fades out at its own wrap
      acc += texture2D(uPainting, img - f * ph).rgb * w;
      wsum += w;
    }
    gl_FragColor = vec4(acc / max(wsum, 0.0001), 1.0);
  }
`

export function LivingPainting({ paused = false }: { paused?: boolean }) {
  const size = useThree((s) => s.size)
  const [painting, flow, mask] = useTexture([
    '/reference/painting.jpg',
    '/reference/signed-flow.png',
    '/reference/sky-mask.png',
  ])

  // Texture state must be explicit (Codex plan-review): the painting is shown raw through the shader so
  // it is 1:1 with the source; flow + mask are DATA (no sRGB decode, linear filter, no mipmap blur at
  // the flow/mask boundaries). flipY left at three's default — painting and flow/mask share it, so they
  // stay registered with each other and the shader samples both at the same uv.
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- one-time texture config, not React state */
    painting.colorSpace = NoColorSpace
    painting.needsUpdate = true
    for (const t of [flow, mask]) {
      t.colorSpace = NoColorSpace
      t.minFilter = LinearFilter
      t.magFilter = LinearFilter
      t.generateMipmaps = false
      t.needsUpdate = true
    }
    /* eslint-enable react-hooks/immutability */
  }, [painting, flow, mask])

  const { churnSpeed, flowAmount } = useControls('living painting', {
    churnSpeed: { value: 0.3, min: 0, max: 0.8, step: 0.01, label: 'churn speed' },
    flowAmount: { value: 0.05, min: 0, max: 0.18, step: 0.005, label: 'flow amount' },
  })

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: null },
          uFlow: { value: null },
          uMask: { value: null },
          uTime: { value: 0 },
          uSpeed: { value: 0.3 },
          uAmp: { value: 0.05 },
          uFreeze: { value: 0 },
          uViewA: { value: 1.6 },
          uTexA: { value: TEX_ASPECT },
        },
        vertexShader: vert,
        fragmentShader: frag,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )

  // wire textures + live tunables into the material (uniform writes — method/value sets, intentional)
  /* eslint-disable react-hooks/immutability -- R3F uniform writes are intentional */
  material.uniforms.uPainting.value = painting
  material.uniforms.uFlow.value = flow
  material.uniforms.uMask.value = mask
  /* eslint-enable react-hooks/immutability */
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uSpeed.value = churnSpeed
    material.uniforms.uAmp.value = flowAmount
    /* eslint-enable react-hooks/immutability */
  }, [material, churnSpeed, flowAmount])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uViewA.value = size.width / size.height
  }, [material, size])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uFreeze.value = paused ? 1 : 0
  }, [material, paused])
  useEffect(() => () => material.dispose(), [material])

  // advance the churn clock; frozen when paused so prefers-reduced-motion yields a still painting
  useFrame((_, dt) => {
    if (paused) return
    // eslint-disable-next-line react-hooks/immutability -- render-loop uniform write
    material.uniforms.uTime.value += dt
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
