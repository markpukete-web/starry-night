import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, DoubleSide, NoColorSpace, NormalBlending, ShaderMaterial, Vector3 } from 'three'
import { DOME_R } from './skyMapping'
import { dioramaSourceEdgeFade, uvToDioramaSkyPosition } from './dioramaSkyProjection'

const matteVert = /* glsl */ `
  attribute float aEdgeFade;
  varying vec2 vUv;
  varying float vEdgeFade;

  void main() {
    vUv = uv;
    vEdgeFade = aEdgeFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const matteFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  uniform sampler2D uMask;
  uniform float uOpacity;
  uniform int uDebugMode;
  varying vec2 vUv;
  varying float vEdgeFade;

  float sourceForegroundMask(vec2 uv, vec3 col) {
    float foreground = 1.0 - texture2D(uMask, uv).r;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));

    float left = 1.0 - smoothstep(0.24, 0.39, uv.x);
    float dark = 1.0 - smoothstep(0.22, 0.36, lum);
    float vertical = smoothstep(0.02, 0.11, uv.y) * (1.0 - smoothstep(0.985, 1.0, uv.y));
    float bottomFade = 1.0 - smoothstep(0.78, 0.94, uv.y);
    float cypress = foreground * left * dark * vertical * bottomFade;

    float lowerBand = foreground * smoothstep(0.52, 0.68, uv.y) * smoothstep(0.05, 0.22, uv.x);
    lowerBand *= 1.0 - smoothstep(0.86, 0.98, uv.y);
    lowerBand *= 1.0 - cypress * 0.72;

    return smoothstep(0.03, 0.22, max(cypress * 1.22, lowerBand * 0.46));
  }

  void main() {
    vec3 paint = texture2D(uPainting, vUv).rgb;
    float mask = sourceForegroundMask(vUv, paint) * vEdgeFade;
    if (mask < 0.012) discard;

    vec3 col = paint;
    if (uDebugMode == 1) {
      col = vec3(0.12, 0.46, 0.36);
    } else {
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 lifted = mix(col * vec3(0.96, 1.02, 1.08), col + vec3(0.018, 0.02, 0.028), 0.32);
      col = clamp(mix(vec3(lum), lifted, 1.12), 0.0, 1.08);
    }

    float alpha = mask * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

function makeForegroundMatteGeometry() {
  const cols = 128
  const rows = 88
  const positions: number[] = []
  const uvs: number[] = []
  const edge: number[] = []
  const indices: number[] = []
  const p = new Vector3()

  for (let y = 0; y <= rows; y++) {
    const v = y / rows
    for (let x = 0; x <= cols; x++) {
      const u = x / cols
      uvToDioramaSkyPosition(u, v, p, DOME_R - 0.18)
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

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setAttribute('aEdgeFade', new BufferAttribute(new Float32Array(edge), 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function DioramaForegroundMatte({ debug = false }: { debug?: boolean }) {
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])

  useEffect(() => {
    for (const texture of [painting, mask]) {
      texture.colorSpace = NoColorSpace
      texture.flipY = false
      texture.needsUpdate = true
    }
  }, [painting, mask])

  const geometry = useMemo(() => makeForegroundMatteGeometry(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uOpacity: { value: 0.94 },
          uDebugMode: { value: debug ? 1 : 0 },
        },
        vertexShader: matteVert,
        fragmentShader: matteFrag,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [debug, mask, painting],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uPainting.value = painting
    material.uniforms.uMask.value = mask
    material.uniforms.uDebugMode.value = debug ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [debug, mask, material, painting])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
}
