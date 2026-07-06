import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, DoubleSide, NoColorSpace, ShaderMaterial, Vector3 } from 'three'
import { CANOPY_CAMERA } from './canopyContract'
import { canopyEdgeFade, uvToCanopyPosition } from './frontCanopyMapping'

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
  uniform int uSkyOnly;
  varying vec2 vUv;
  varying float vEdgeFade;
  void main() {
    float sky = texture2D(uMask, vUv).r;
    if (uSkyOnly == 1) discard;
    if (sky > 0.35) discard;
    vec3 col = texture2D(uPainting, vUv).rgb;
    float a = vEdgeFade;
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
  }
`

type Props = {
  hidden?: boolean
}

export function CanopyForegroundMatte({ hidden = false }: Props) {
  const [painting, mask] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])

  useEffect(() => {
    for (const tex of [painting, mask]) {
      tex.colorSpace = NoColorSpace
      tex.flipY = false
      tex.needsUpdate = true
    }
  }, [painting, mask])

  const geometry = useMemo(() => {
    const cols = 96
    const rows = 72
    const positions: number[] = []
    const uvs: number[] = []
    const edge: number[] = []
    const indices: number[] = []
    const p = new Vector3()
    const camera = new Vector3(...CANOPY_CAMERA.position)

    for (let y = 0; y <= rows; y++) {
      const v = y / rows
      for (let x = 0; x <= cols; x++) {
        const u = x / cols
        uvToCanopyPosition(u, v, p)
        // Move the foreground a little along the design-camera ray. That preserves screen
        // registration while letting it occlude the sky ribbons without using a flat plane.
        p.lerp(camera, 0.045)
        positions.push(p.x, p.y, p.z)
        uvs.push(u, v)
        edge.push(canopyEdgeFade(u, v))
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
    return g
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uPainting: { value: painting },
          uMask: { value: mask },
          uSkyOnly: { value: hidden ? 1 : 0 },
        },
        vertexShader: matteVert,
        fragmentShader: matteFrag,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        side: DoubleSide,
      }),
    [painting, mask, hidden],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uPainting.value = painting
    material.uniforms.uMask.value = mask
    material.uniforms.uSkyOnly.value = hidden ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [hidden, material, mask, painting])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  if (hidden) return null

  return (
    <mesh geometry={geometry} renderOrder={5} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </mesh>
  )
}
