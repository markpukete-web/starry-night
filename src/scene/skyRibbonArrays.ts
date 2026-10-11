import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import type { ImageData2D } from './useImageData'
import type { SourceRibbonGeometry } from './streamlineGeometry'
import { smoothstep } from './skyMapping'
import { dioramaSourceEdgeFade, SIDE_BORDER_U, uvToDioramaSkyPosition } from './dioramaSkyProjection'

// The sky's ribbon build, with no React and no DOM, so the moving sky can run it in a worker (Codex, PR #7:
// built in the render, the first switch froze for about 230 ms on an M5 Pro).

export type RibbonArrays = {
  position: Float32Array
  aColor: Float32Array
  aLen: Float32Array
  aAcross: Float32Array
  aPhase: Float32Array
  aRate: Float32Array
  aEdgeFade: Float32Array
  index: Uint16Array | Uint32Array
}

/**
 * Stitch [left strip | base | right strip] into one wide CPU buffer for ribbon integration.
 * Each strip covers paintU ∈ [−SIDE_EXTEND_U, SIDE_BORDER_U] (mirrored on the right) and OWNS
 * the base's weave-border columns — the strips overwrite them, exactly as the wash renders.
 */
function compositeSideExtended(base: ImageData2D, left: ImageData2D, right: ImageData2D): ImageData2D {
  const borderPx = Math.round(SIDE_BORDER_U * base.width)
  const padPx = left.width - borderPx
  const width = base.width + 2 * padPx
  const data = new Uint8ClampedArray(width * base.height * 4)
  const blit = (src: ImageData2D, dstX: number): void => {
    for (let y = 0; y < base.height; y++) {
      data.set(src.data.subarray(y * src.width * 4, (y + 1) * src.width * 4), (y * width + dstX) * 4)
    }
  }
  blit(base, padPx)
  blit(left, 0)
  blit(right, padPx + base.width - borderPx)
  return { data, width, height: base.height }
}

export type SkyImages = Record<
  'flowData' | 'maskData' | 'paintingData' | 'extendLeftData' | 'extendRightData' | 'extendFlowLeftData' | 'extendFlowRightData',
  ImageData2D
>

/**
 * Both skies integrate across the composite [left strip | canvas | right strip] so the churn carries over
 * the canvas edges; count scales with the wider domain to hold front density. Built inside each geometry
 * memo and then dropped: kept for the session the two composites held 21 MB the light sky never reads again
 * (review F2).
 */
export function composite(i: SkyImages) {
  const compositePainting = compositeSideExtended(i.paintingData, i.extendLeftData, i.extendRightData)
  const compositeFlow = compositeSideExtended(i.flowData, i.extendFlowLeftData, i.extendFlowRightData)
  const uPad = (compositePainting.width - i.paintingData.width) / 2 / i.paintingData.width
  return { compositePainting, compositeFlow, maskData: i.maskData, uPad }
}

/**
 * Project built ribbons onto the diorama sky and pack their attributes as typed arrays. Shared by both skies:
 * the light sky on the main thread, the moving sky in `movingSky.worker.ts`.
 */
export function ribbonsToArrays(ribbons: SourceRibbonGeometry): RibbonArrays {
  const positions: number[] = []
  const colors: number[] = []
  const aLen: number[] = []
  const aAcross: number[] = []
  const aPhase: number[] = []
  const aRate: number[] = []
  const aEdgeFade: number[] = []
  const p = new Vector3()

  for (const vertex of ribbons.vertices) {
    uvToDioramaSkyPosition(vertex.u, vertex.v, p)
    positions.push(p.x, p.y, p.z)
    colors.push(...vertex.color)
    aLen.push(vertex.len)
    aAcross.push(vertex.across)
    aPhase.push(vertex.phase)
    aRate.push(vertex.rate)
    // Below the sky band the island covers the canvas centre but NOT the edge columns or the
    // strips — ribbon segments there float under the wash's skirt as stray dots over the bare
    // gradient (the pre-S4 side fade hid the edge ones). Outside the old fade margins the
    // ribbons must exit the melt BEFORE the wash does (a ribbon's bell cross-section peaks
    // above the dissolving wash continuum at every v, reading as a dotted arc — p4), so their
    // window ends at 0.62 where the wash's skyBand (washFrag 0.58–0.7) still has body.
    const subBandSkirt = vertex.u < 0.22 || vertex.u > 0.78 ? 1 - smoothstep(0.5, 0.62, vertex.v) : 1
    aEdgeFade.push(dioramaSourceEdgeFade(vertex.u, vertex.v) * subBandSkirt)
  }

  let maxIndex = 0
  for (const i of ribbons.indices) if (i > maxIndex) maxIndex = i
  return {
    position: new Float32Array(positions),
    aColor: new Float32Array(colors),
    aLen: new Float32Array(aLen),
    aAcross: new Float32Array(aAcross),
    aPhase: new Float32Array(aPhase),
    aRate: new Float32Array(aRate),
    aEdgeFade: new Float32Array(aEdgeFade),
    // the index type three's setIndex(array) chose before the split, so the light geometry is unchanged
    index: maxIndex >= 65535 ? new Uint32Array(ribbons.indices) : new Uint16Array(ribbons.indices),
  }
}

/** The ribbon arrays as a geometry, on the main thread. */
export function arraysToGeometry(a: RibbonArrays): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(a.position, 3))
  geo.setAttribute('aColor', new BufferAttribute(a.aColor, 3))
  geo.setAttribute('aLen', new BufferAttribute(a.aLen, 1))
  geo.setAttribute('aAcross', new BufferAttribute(a.aAcross, 1))
  geo.setAttribute('aPhase', new BufferAttribute(a.aPhase, 1))
  geo.setAttribute('aRate', new BufferAttribute(a.aRate, 1))
  geo.setAttribute('aEdgeFade', new BufferAttribute(a.aEdgeFade, 1))
  geo.setIndex(new BufferAttribute(a.index, 1))
  geo.computeBoundingSphere()
  return geo
}

/** Every buffer of a `RibbonArrays`, for `postMessage`'s transfer list. */
export function ribbonBuffers(a: RibbonArrays): ArrayBuffer[] {
  return [a.position, a.aColor, a.aLen, a.aAcross, a.aPhase, a.aRate, a.aEdgeFade, a.index].map((x) => x.buffer as ArrayBuffer)
}
