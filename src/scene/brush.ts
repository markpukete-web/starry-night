import { CanvasTexture, SRGBColorSpace } from 'three'
import type { ImageData2D } from './useImageData'

/**
 * Sample the derived flow field. Decodes the double-angle orientation in flow-field.png and
 * returns the stroke angle (radians, image space: x right, y down) and coherence in [0,1].
 */
export function sampleFlow(field: ImageData2D, u: number, v: number): { theta: number; coh: number } {
  const x = Math.min(field.width - 1, Math.max(0, Math.floor(u * field.width)))
  const y = Math.min(field.height - 1, Math.max(0, Math.floor(v * field.height)))
  const i = (y * field.width + x) * 4
  const cos2 = (field.data[i] / 255) * 2 - 1
  const sin2 = (field.data[i + 1] / 255) * 2 - 1
  const coh = field.data[i + 2] / 255
  return { theta: 0.5 * Math.atan2(sin2, cos2), coh }
}

/** Sample an image's colour at (u,v), returned as linear-ish 0..1 sRGB components. */
export function sampleColour(img: ImageData2D, u: number, v: number): [number, number, number] {
  const x = Math.min(img.width - 1, Math.max(0, Math.floor(u * img.width)))
  const y = Math.min(img.height - 1, Math.max(0, Math.floor(v * img.height)))
  const i = (y * img.width + x) * 4
  return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255]
}

/** A soft, tapered brushstroke dab as a white alpha texture; long axis is +x. */
export function makeBrushTexture(): CanvasTexture {
  const w = 128
  const h = 64
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1 // -1..1 along length
      const ny = (y / (h - 1)) * 2 - 1 // -1..1 across width
      const along = Math.max(0, 1 - nx * nx) // tapered ends
      const across = Math.max(0, 1 - ny * ny)
      const shape = Math.pow(along, 0.45) * Math.pow(across, 1.1)
      const a = Math.min(1, shape * 1.25)
      // fake impasto relief: bright core, gently darker rim, so strokes read as raised paint at
      // true colour (multiplied by the stroke's instanceColor) without washing the image lighter.
      const rel = Math.round((0.65 + 0.35 * Math.sqrt(shape)) * 255)
      const idx = (y * w + x) * 4
      img.data[idx] = rel
      img.data[idx + 1] = rel
      img.data[idx + 2] = rel
      img.data[idx + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Deterministic PRNG so stroke seeds are stable across retunes (fair visual comparison). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
