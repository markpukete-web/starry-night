import { Color, SRGBColorSpace } from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { GRASS_SOURCES, grassTexelUsable } from './grassBlade.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The paint under the grass (S3b pass 5, `tasks/2026-10-25-street-s3b-plan.md` Task 6). Mark, on the flat base between
 * the clumps: "It bother me a bit". The strip keeps its flat colour, and the fragment lays a dab over it in every cell,
 * so the gaps read as paint in shadow and cost no triangles. The dabs' paints are hue means, up to four, over the
 * bushes' darkest 80% (`grassBasePalette`). A dab is a comma: an ellipse
 * bent across its length, narrowing to its tail. Its angle is read once per cell from a slow field, so the dabs turn
 * across the verge as the bushes' strokes do, without the swirl a per-fragment rotation gives.
 */
export const GRASS_BASE = {
  /** one dab per cell, jittered inside it (world units) */
  cell: 0.01,
  halfLength: 0.009,
  halfWidth: 0.003,
  /** the comma's bend at its ends, in half-widths */
  bend: 0.8,
  /** the tail's width, a share of the head's */
  tail: 0.55,
  /** the slow field the dabs' angles read, cycles per world unit */
  field: 6,
  /** each dab's value, ± this share about its paint's */
  jitter: 0.15,
  /** the dabs' paint: the darkest share of the bushes' usable texels */
  share: 0.8,
} as const

export type BaseHue = 'blue' | 'olive' | 'green' | 'neutral'

/** A dark texel's hue, by the thresholds that split the bushes' dark paint into its blue-black, blue, green and olive. */
export function baseHue(r: number, g: number, b: number): BaseHue {
  if (b > r + 12 && b >= g) return 'blue'
  if (r > b + 10 && g > b + 10) return 'olive'
  if (g > r + 6 && g > b) return 'green'
  return 'neutral'
}

export type BasePaint = { colour: [number, number, number]; share: number }

/** The dabs' paints: each hue's mean among the bushes' darkest `share`, in linear RGB, with the share of texels it holds. */
export function grassBasePalette(painting: ImageData2D): BasePaint[] {
  const [x0, y0, x1, y1] = GRASS_SOURCES.bushes
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const texels: [number, number, number, number][] = []
  for (let y = Math.floor(y0 * sy); y < Math.floor(y1 * sy); y++) {
    for (let x = Math.floor(x0 * sx); x < Math.floor(x1 * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      if (grassTexelUsable(r, g, b)) texels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  if (texels.length === 0) throw new Error('grassBase: the bushes have no usable texel')
  texels.sort((p, q) => p[0] - q[0])
  const dark = texels.slice(0, Math.max(1, Math.round(texels.length * GRASS_BASE.share)))
  const sums = new Map<BaseHue, [number, number, number, number]>()
  for (const [, r, g, b] of dark) {
    const hue = baseHue(r, g, b)
    const sum = sums.get(hue) ?? [0, 0, 0, 0]
    sums.set(hue, [sum[0] + r, sum[1] + g, sum[2] + b, sum[3] + 1])
  }
  return [...sums.values()].map(([r, g, b, n]) => {
    const c = new Color().setRGB(r / n / 255, g / n / 255, b / n / 255, SRGBColorSpace)
    return { colour: [c.r, c.g, c.b], share: n / dark.length }
  })
}

const glsl = (v: number) => v.toFixed(6)

/** The dabs, as the strip's body: before the fog in `material()`'s order, and under the ID view's colours. */
export function grassBaseBody(palette: BasePaint[]): Omit<AliveInjection, 'key' | 'uniforms'> {
  const B = GRASS_BASE
  let cumulative = 0
  const pick = palette
    .map(({ colour, share }, i) => {
      cumulative += share
      const set = `paint = vec3(${colour.map(glsl).join(', ')});`
      return i === palette.length - 1 ? set : `if (h.z < ${glsl(cumulative)}) ${set}`
    })
    .join('\n      else ')
  return {
    vertexHead: 'varying vec2 vBaseXZ;',
    vertexBody: 'vBaseXZ = position.xz;',
    fragmentHead: `varying vec2 vBaseXZ;
float baseHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float baseNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(baseHash(i), baseHash(i + vec2(1.0, 0.0)), u.x), mix(baseHash(i + vec2(0.0, 1.0)), baseHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`,
    fragmentBody: `{
  vec2 g = floor(vBaseXZ / ${glsl(B.cell)});
  float best = -1.0;
  vec3 dab = diffuseColor.rgb;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 c = g + vec2(float(i), float(j));
      vec4 h = vec4(baseHash(c), baseHash(c + 17.3), baseHash(c + 41.9), baseHash(c + 73.1));
      vec2 centre = (c + 0.2 + 0.6 * h.xy) * ${glsl(B.cell)};
      float a = 6.283185 * baseNoise(centre * ${glsl(B.field)});
      vec2 d = vec2(cos(a), sin(a));
      vec2 r = vBaseXZ - centre;
      float u = dot(r, d) / ${glsl(B.halfLength)};
      float w = 1.0 - ${glsl(1 - B.tail)} * (0.5 + 0.5 * u);
      float v = (dot(r, vec2(-d.y, d.x)) / ${glsl(B.halfWidth)} - ${glsl(B.bend)} * u * u) / w;
      if (u * u + v * v < 1.0 && h.w > best) {
        best = h.w;
        vec3 paint;
      ${pick}
        dab = paint * (${glsl(1 - B.jitter)} + ${glsl(2 * B.jitter)} * fract(h.w * 13.7));
      }
    }
  }
  diffuseColor.rgb = dab;
}`,
  }
}
