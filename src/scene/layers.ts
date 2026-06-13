import { CanvasTexture, SRGBColorSpace } from 'three'
import type { ImageData2D } from './useImageData'

type MaskOpts = {
  /** normalised [x0,y0,x1,y1] region to keep. */
  rect: [number, number, number, number]
  /** keep pixels darker than this luminance (0..1); soft ramp below it. */
  maxLum?: number
}

/**
 * Phase 1 · Slice 4 — cut a foreground element (e.g. the cypress) out of the painting into its
 * own RGBA texture: RGB = painting colour, A = a soft mask of the dark element within `rect`.
 * Placed on a nearer plane it parallaxes against the sky under the pan/tilt camera.
 */
export function makeMaskedTexture(src: ImageData2D, opts: MaskOpts): CanvasTexture {
  const { width: W, height: H, data } = src
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const out = ctx.createImageData(W, H)
  const ix0 = opts.rect[0] * W
  const iy0 = opts.rect[1] * H
  const ix1 = opts.rect[2] * W
  const iy1 = opts.rect[3] * H
  const maxLum = (opts.maxLum ?? 1) * 255
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      let a = 0
      if (x >= ix0 && x < ix1 && y >= iy0 && y < iy1) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        a = lum < maxLum ? Math.min(1, (maxLum - lum) / (maxLum * 0.6)) : 0
      }
      out.data[i] = r
      out.data[i + 1] = g
      out.data[i + 2] = b
      out.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(out, 0, 0)
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  return tex
}
