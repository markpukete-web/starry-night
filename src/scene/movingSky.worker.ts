import { buildSourceStreamlineRibbons, type SourceRibbonBuildOptions } from './streamlineGeometry'
import { composite, ribbonBuffers, ribbonsToArrays, type RibbonArrays, type SkyImages } from './skyRibbonArrays'

/** Everything the moving-sky build needs. `tuned()` values are read on the main thread and arrive as numbers. */
export type MovingBuildRequest = {
  images: SkyImages
  /** The ribbon count before the side strips widen the domain: count = round(countPerUnit × (1 + 2 uPad)). */
  countPerUnit: number
  options: Omit<SourceRibbonBuildOptions, 'flowData' | 'maskData' | 'paintingData' | 'count' | 'uPad'>
}

export type MovingBuildReply = { arrays: RibbonArrays; ms: number } | { error: string }

self.onmessage = (event: MessageEvent<MovingBuildRequest>) => {
  const started = performance.now()
  try {
    const { images, countPerUnit, options } = event.data
    const { compositePainting, compositeFlow, maskData, uPad } = composite(images)
    const arrays = ribbonsToArrays(
      buildSourceStreamlineRibbons({
        ...options,
        flowData: compositeFlow,
        maskData,
        paintingData: compositePainting,
        count: Math.round(countPerUnit * (1 + 2 * uPad)),
        uPad,
      }),
    )
    const reply: MovingBuildReply = { arrays, ms: performance.now() - started }
    self.postMessage(reply, { transfer: ribbonBuffers(arrays) })
  } catch (error) {
    const reply: MovingBuildReply = { error: error instanceof Error ? `${error.message}\n${error.stack}` : String(error) }
    self.postMessage(reply)
  }
}
