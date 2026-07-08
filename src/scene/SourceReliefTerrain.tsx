import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  NoColorSpace,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { extractSkylineV } from './paintingRegions'
import { sourceUVAtDistance } from './sourceProjection'
import { PALETTE } from './palette'

/**
 * The painting's foreground given depth: a relief grid spanning the full painted ground band —
 * village, hills, trees — whose home-view pixels ARE the painting (projective registration), and
 * whose depth stages from the hills (far) through the village to the near ground, with rolling
 * swells and luminance micro-relief (moonlit crests raised like impasto). Below the painted band
 * a dark earthen root closes the volume so the diorama reads as a floating object, dissolving to
 * night like the painting's own darkness. Replaces the grey prop world entirely.
 */

const COLS = 140
const ROWS = 84
const ROOT_ROWS = 12
const U_MIN = -0.03 // overscan past the frame so the edges never expose a knife-cut
const U_MAX = 1.03
const V_BOTTOM = 1.28 // continue well below the frame bottom — the mobile camera sits far behind
// the home eye and looks under the band; a short skirt reads as a black arch with void beneath
const SKY_SEAL = 0.02 // top edge overlaps this far above the skyline
const DIST_FAR = 8.8 // skyline / hills distance from the home eye
const DIST_NEAR = 6.1 // frame-bottom ground distance
const ROLL_AMP = 0.55 // rolling-hill depth swells
const IMPASTO_AMP = 0.5 // luminance relief: bright paint raised toward the eye
const SHELL_MELT = 10.8 // edge columns melt out to (nearly) the underpaint shell distance
const ROOT_DEPTH = 2.4 // how far the under-root drops below the painted band

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
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const terrainVert = /* glsl */ `
  attribute float aPaint;
  attribute float aShade;
  attribute vec3 aRootColor;
  varying vec2 vUv;
  varying float vPaint;
  varying float vShade;
  varying vec3 vRootColor;
  void main() {
    vUv = uv;
    vPaint = aPaint;
    vShade = aShade;
    vRootColor = aRootColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const terrainFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  varying vec2 vUv;
  varying float vPaint;
  varying float vShade;
  varying vec3 vRootColor;
  void main() {
    vec3 paint = texture2D(uPainting, vUv).rgb;
    // warm lit windows glow: yellow pixels pushed past 1.0 so bloom catches them as light
    float warm = smoothstep(0.16, 0.34, paint.r + paint.g - 2.2 * paint.b);
    vec3 lit = paint + paint * warm * 0.5;
    vec3 col = mix(vRootColor, lit * vShade, vPaint);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SourceReliefTerrain() {
  const paintingData = useImageData('/reference/painting.jpg')
  const maskData = useImageData('/reference/sky-mask.png')
  const painting = useTexture('/reference/painting.jpg')

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional three.js texture configuration */
    painting.colorSpace = NoColorSpace
    painting.flipY = false
    painting.needsUpdate = true
    /* eslint-enable react-hooks/immutability */
  }, [painting])

  const geometry = useMemo(() => {
    if (!paintingData || !maskData) return null
    const skyline = extractSkylineV(maskData, COLS + 1)
    const lumAt = (u: number, v: number) => {
      const x = Math.min(paintingData.width - 1, Math.max(0, Math.floor(u * paintingData.width)))
      const y = Math.min(paintingData.height - 1, Math.max(0, Math.floor(v * paintingData.height)))
      const i = (y * paintingData.width + x) * 4
      return (
        (0.299 * paintingData.data[i] + 0.587 * paintingData.data[i + 1] + 0.114 * paintingData.data[i + 2]) / 255
      )
    }

    const earth = new Color(PALETTE.hills)
    const abyss = earth.clone().multiplyScalar(0.075)
    const rootTop = earth.clone().multiplyScalar(0.6)

    const rows = ROWS + ROOT_ROWS + 1
    const cols = COLS + 1
    const positions = new Float32Array(rows * cols * 3)
    const uvs = new Float32Array(rows * cols * 2)
    const aPaint = new Float32Array(rows * cols)
    const aShade = new Float32Array(rows * cols)
    const aRoot = new Float32Array(rows * cols * 3)
    const p = new Vector3()
    const cc = new Color()

    let vertex = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = U_MIN + ((U_MAX - U_MIN) * c) / COLS
        const uc = Math.min(0.998, Math.max(0.002, u))
        const vTop = skyline[c] - SKY_SEAL
        const isRoot = r > ROWS
        const tv = Math.min(1, r / ROWS)
        const v = vTop + (V_BOTTOM - vTop) * tv
        const vc = Math.min(0.995, Math.max(0, v))

        // depth: hills far → ground near, rolling swells, luminance impasto
        const lum = lumAt(uc, vc)
        const roll = (vnoise(u * 6.5 + 2, v * 5 + 9) - 0.5) * ROLL_AMP * (1 - tv * 0.6)
        const impasto = (lum - 0.5) * IMPASTO_AMP
        let dist = DIST_FAR - (DIST_FAR - DIST_NEAR) * smooth(0, 1, tv) - roll - impasto
        // overscan columns MELT into the camera-locked underpaint shell rather than adding a
        // fixed offset — a constant curl leaves a visible mid-air wall at the frame corners
        const curl = Math.min(1, smooth(0.03, -0.03, u) + smooth(0.97, 1.03, u))
        dist += (SHELL_MELT - dist) * curl

        sourceUVAtDistance(uc, vc, dist, p)

        const idx = vertex / 3
        if (isRoot) {
          // the under-root: drop below the last painted row, pulling inward to a keel
          const k = (r - ROWS) / ROOT_ROWS
          const drop = ROOT_DEPTH * (k * k * 0.7 + k * 0.3)
          const rocky = (vnoise(u * 9 + 3, k * 4 + 6) - 0.5) * 0.3 * (1 - k)
          p.y -= drop + rocky
          // taper inward, then collapse the final rings so the root CLOSES into a keel — an open
          // bottom shows the interior of the far wall as a pale arch from low/mobile views
          const pull = (1 - 0.3 * k) * (1 - smooth(0.72, 1, k) * 0.88)
          p.x *= pull
          p.z *= pull
          cc.copy(rootTop).lerp(abyss, smooth(0.05, 0.85, k))
          aPaint[idx] = 0
          aShade[idx] = 1
        } else {
          // fade the last painted rows into the root earth so the volume's underside starts as
          // shadowed ground, not a hard white-smear-to-black cut
          aPaint[idx] = 1 - smooth(0.92, 1, tv) * 0.85
          // gentle modelling: crest light follows the luminance relief that raised the vertex
          aShade[idx] = 0.9 + 0.18 * smooth(0.35, 0.75, lum)
          cc.copy(rootTop)
        }

        positions[vertex] = p.x
        positions[vertex + 1] = p.y
        positions[vertex + 2] = p.z
        uvs[idx * 2] = uc
        uvs[idx * 2 + 1] = vc
        aRoot[vertex] = cc.r
        aRoot[vertex + 1] = cc.g
        aRoot[vertex + 2] = cc.b
        vertex += 3
      }
    }

    const indices: number[] = []
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = r * cols + c
        const b = a + 1
        const d = a + cols
        const e = d + 1
        indices.push(a, d, b, b, d, e)
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('uv', new BufferAttribute(uvs, 2))
    g.setAttribute('aPaint', new BufferAttribute(aPaint, 1))
    g.setAttribute('aShade', new BufferAttribute(aShade, 1))
    g.setAttribute('aRootColor', new BufferAttribute(aRoot, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [maskData, paintingData])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uPainting: { value: painting } },
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
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
  return <mesh geometry={geometry} material={material} renderOrder={0} />
}
