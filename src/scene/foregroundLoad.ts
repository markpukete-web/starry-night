import type { ImageData2D } from './useImageData.ts'

/** The painting's pixels, which the diorama's island and cypress both sample. */
export const PAINTING_URL = '/reference/painting.jpg'

/**
 * The painting the cypress loads itself. `undefined` means no caller holds one, so the tree loads its own. `null` means
 * the caller owns the load and it is pending or failed, so the tree loads nothing: a second load would decode another
 * 8 MB and keep it for the tree's life (audit 2026-11-14, item 13).
 */
export function ownPaintingUrl(painting: ImageData2D | null | undefined): string | null {
  return painting === undefined ? PAINTING_URL : null
}
