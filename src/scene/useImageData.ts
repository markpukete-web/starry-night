import { useEffect, useRef, useState } from 'react'

/** CPU-side pixel data for an image, for sampling the flow field and painting colours. */
export type ImageData2D = { data: Uint8ClampedArray; width: number; height: number }

/**
 * Load an image and expose its pixels on the CPU (via an offscreen canvas). A load that fails stays null and calls
 * `onError` once, so a caller waiting on the pixels can stop waiting (the moving sky's latch; Codex, PR #13 P2).
 * The callback is read through a ref, so a new function identity never restarts the load.
 */
export function useImageData(url: string, onError?: () => void): ImageData2D | null {
  const [img, setImg] = useState<ImageData2D | null>(null)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })
  useEffect(() => {
    let alive = true
    const el = new Image()
    el.onerror = () => {
      if (alive) onErrorRef.current?.()
    }
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
