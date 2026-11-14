import { useEffect, useRef, useState } from 'react'

/** CPU-side pixel data for an image, for sampling the flow field and painting colours. */
export type ImageData2D = { data: Uint8ClampedArray; width: number; height: number }

/**
 * A loaded image's `onload`: its pixels through a canvas. No 2D context, a draw or a read-back that throws (a tainted
 * canvas) calls `failed` once, as a failed load does: a throw here reached neither path, and a caller waiting on the
 * pixels waited for ever (the audit's item 11b).
 */
export function readPixels(el: HTMLImageElement, done: (pixels: ImageData2D) => void, failed: () => void): void {
  let pixels: ImageData2D
  try {
    const cv = document.createElement('canvas')
    cv.width = el.naturalWidth
    cv.height = el.naturalHeight
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no 2D context')
    ctx.drawImage(el, 0, 0)
    pixels = { data: ctx.getImageData(0, 0, cv.width, cv.height).data, width: cv.width, height: cv.height }
  } catch (cause) {
    console.error(`useImageData: could not read the pixels of ${el.src}`, cause)
    failed()
    return
  }
  done(pixels)
}

/**
 * Load an image and expose its pixels on the CPU (via an offscreen canvas). A load that fails stays null and calls
 * `onError` once, so a caller waiting on the pixels can stop waiting (the moving sky's latch; Codex, PR #13 P2).
 * The callback is read through a ref, so a new function identity never restarts the load. A null URL loads nothing.
 */
export function useImageData(url: string | null, onError?: () => void): ImageData2D | null {
  const [img, setImg] = useState<ImageData2D | null>(null)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })
  useEffect(() => {
    // no URL: the caller holds the pixels already and loads nothing
    if (!url) return
    let alive = true
    const el = new Image()
    el.onerror = () => {
      if (alive) onErrorRef.current?.()
    }
    el.onload = () =>
      readPixels(
        el,
        (pixels) => {
          if (alive) setImg(pixels)
        },
        () => {
          if (alive) onErrorRef.current?.()
        },
      )
    el.src = url
    return () => {
      alive = false
    }
  }, [url])
  return img
}
