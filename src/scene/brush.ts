import type { ImageData2D } from './useImageData'

/** Sample an image's colour at (u,v), returned as linear-ish 0..1 sRGB components. */
export function sampleColour(img: ImageData2D, u: number, v: number): [number, number, number] {
  const x = Math.min(img.width - 1, Math.max(0, Math.floor(u * img.width)))
  const y = Math.min(img.height - 1, Math.max(0, Math.floor(v * img.height)))
  const i = (y * img.width + x) * 4
  return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255]
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
