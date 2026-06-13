import { useEffect, useState } from 'react'

/** CPU-side pixel data for an image, for sampling the flow field and painting colours. */
export type ImageData2D = { data: Uint8ClampedArray; width: number; height: number }

/** Load an image and expose its pixels on the CPU (via an offscreen canvas). */
export function useImageData(url: string): ImageData2D | null {
  const [img, setImg] = useState<ImageData2D | null>(null)
  useEffect(() => {
    let alive = true
    const el = new Image()
    el.onload = () => {
      const cv = document.createElement('canvas')
      cv.width = el.naturalWidth
      cv.height = el.naturalHeight
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(el, 0, 0)
      const { data } = ctx.getImageData(0, 0, cv.width, cv.height)
      if (alive) setImg({ data, width: cv.width, height: cv.height })
    }
    el.src = url
    return () => {
      alive = false
    }
  }, [url])
  return img
}
