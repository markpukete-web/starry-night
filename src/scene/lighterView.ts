/**
 * The lighter view (2026-10-30, the record tasks/2026-10-30-lighter-view.md). Mark asked whether a weak GPU could be
 * told and given a lighter fallback, then "Yes go with your recommendations": once the diorama has settled, a frame
 * rate that stays under the bar offers a lower pixel ratio, and the visitor chooses. Nothing changes unasked.
 */
export const LIGHTER = {
  /**
   * ms after the cypress and the land report ready before any frame is read. A scene's start-up dip ran past 10 s on
   * Mark's iPhone (2026-10-30): read early, it would flag every phone.
   */
  settleMs: 8000,
  /** a quarter-second window is slow under these, by the locked bar: 60 fps on a computer, 30 on a phone */
  computerFps: 50,
  phoneFps: 30,
  /** the pixel-ratio cap, shipped and lighter. 1 draws 44% of 1.5's pixels: 7.6 ms against 12.4 on an M5 Pro */
  dpr: 1.5,
  lighterDpr: 1,
} as const

/** The offer's life in a page: watched until slow, offered, then the visitor's answer. A reload starts it again. */
export type LighterState = 'watching' | 'offered' | 'lighter' | 'full'
