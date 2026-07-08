import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  NoColorSpace,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { extractCypressSlices } from './paintingRegions'
import { HOME_EYE, sourceUVAtDistance, worldPerU, worldToSourceUV } from './sourceProjection'

/**
 * The cypress as ONE Van Gogh flame: a world-space volume whose silhouette is extracted from the
 * painting's own dark left band and whose surface samples the painting through the home-view
 * projection. Head-on it is pixel-registered with the source matte behind it; orbiting shows a
 * genuinely three-dimensional flame whose slide over the matte reads as impasto depth, because
 * both carry the same pixels.
 */

const DIST_BASE = 4.72 // world distance (from the home eye) of the flame's base ring
const DIST_TIP = 4.92 // the tip leans slightly away toward the sky
const MARGIN = 1.3 // silhouette over-cover so the matte strip never peeks past the volume in-arc
const DEPTH_RATIO = 0.62 // flame thickness along the sightline, relative to its width
const UV_COMPRESS = 0.7 // sample UVs pulled toward the slice centre so edges stay on painted bark
const SEG = 22

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

const cypressVert = /* glsl */ `
  attribute float aShade;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vShade = aShade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const cypressFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec3 col = texture2D(uPainting, vUv).rgb * vShade;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SourceCypress() {
  const paintingData = useImageData('/reference/painting.jpg')
  const painting = useTexture('/reference/painting.jpg')

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional three.js texture configuration */
    painting.colorSpace = NoColorSpace
    painting.flipY = false
    painting.needsUpdate = true
    /* eslint-enable react-hooks/immutability */
  }, [painting])

  const geometry = useMemo(() => {
    if (!paintingData) return null
    const slices = extractCypressSlices(paintingData)
    if (slices.length < 6) return null

    const rows = slices.length
    const vTip = slices[0].v
    const vBase = slices[rows - 1].v
    const positions: number[] = []
    const uvs: number[] = []
    const shade: number[] = []
    const indices: number[] = []
    const centre = new Vector3()
    const p = new Vector3()
    const viewDir = new Vector3()
    const right = new Vector3()
    const up = new Vector3(0, 1, 0)

    for (let i = 0; i < rows; i++) {
      const s = slices[i]
      const t = (s.v - vTip) / (vBase - vTip) // 0 tip → 1 base
      const dist = DIST_TIP + (DIST_BASE - DIST_TIP) * t
      sourceUVAtDistance(s.uCentre, s.v, dist, centre)
      viewDir.copy(centre).sub(HOME_EYE).normalize()
      right.crossVectors(viewDir, up).normalize().negate() // +u (painting right) in world
      // tip rings pinch toward a point
      const pinch = i === 0 ? 0.2 : 1
      const halfAcross = s.halfWidth * MARGIN * worldPerU(dist) * pinch
      const halfDepth = halfAcross * DEPTH_RATIO

      for (let j = 0; j <= SEG; j++) {
        const a = (j / SEG) * Math.PI * 2
        const nx = Math.cos(a)
        const nz = Math.sin(a)
        // licking tongues: coherent angular noise drifting upward, sharpened outward (the F4 recipe)
        const ridge = vnoise(nx * 2.4 + 10, nz * 2.4 + t * 6.5 + 4)
        const fine = vnoise(nx * 5 + 2, nz * 5 + t * 10 + 7)
        let bump = (ridge - 0.5) * 0.8 + (fine - 0.5) * 0.35
        bump = bump > 0 ? bump * 1.35 : bump * 0.55
        const swell = 1 + bump * 0.4 * (0.4 + 0.6 * (1 - t))
        p.copy(centre)
          .addScaledVector(right, nx * halfAcross * swell)
          .addScaledVector(viewDir, nz * halfDepth * swell)
        positions.push(p.x, p.y, p.z)
        const q = worldToSourceUV(p)
        uvs.push(
          s.uCentre + (q.u - s.uCentre) * UV_COMPRESS,
          Math.min(0.995, s.v + (q.v - s.v) * UV_COMPRESS),
        )
        // modelling: outward tongues catch light, the sightline flanks fall dark
        const exposure = Math.max(0, bump)
        shade.push(0.66 + 0.5 * exposure + 0.12 * Math.max(0, nx))
      }
    }

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * (SEG + 1) + j
        const b = a + 1
        const c = a + SEG + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
    g.setAttribute('aShade', new BufferAttribute(new Float32Array(shade), 1))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [paintingData])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uPainting: { value: painting } },
        vertexShader: cypressVert,
        fragmentShader: cypressFrag,
        side: DoubleSide,
      }),
    [painting],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform write */
    material.uniforms.uPainting.value = painting
    /* eslint-enable react-hooks/immutability */
  }, [material, painting])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={3} />
}
