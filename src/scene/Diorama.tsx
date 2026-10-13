import type { RefObject } from 'react'
import { BrushCypress } from './BrushCypress'
import { BrushIsland } from './BrushIsland'
import { Village } from './Village'
import type { AliveTuning } from './skyAlive'

/**
 * The Starry Night diorama, authored in Van Gogh brushstrokes. Every foreground surface is a real
 * closed 3D volume clad in oriented impasto strokes (BrushIsland, BrushCypress) or painted with
 * the painting's own pixels (Village) — so the scene survives a full orbit, no projected sheet to
 * curl or funnel. The camera-locked source-ribbon sky (PaintingFlowSky3D) carries the swirls behind
 * them. The projected-relief foreground and the grey prop diorama before it are both gone.
 */
export function Diorama({
  debug = 'final',
  clock,
  alive = false,
  tuning,
}: {
  debug?: 'final' | 'stage'
  /** The one sky clock (make-it-alive A, second pass): the cypress flicker and the window glimmer read it. */
  clock?: RefObject<number>
  /** The flag: off, the foreground is today's, bit for bit. */
  alive?: boolean
  /** The live knobs (`flicker`, `glimmer`). */
  tuning?: AliveTuning
}) {
  void debug // stage and final show the same forms; stage differs only by omitting the sky stack
  return (
    <group>
      <BrushIsland />
      {/* the village: church, houses and foliage rows painted from the source, at the hills' foot */}
      <Village clock={clock} alive={alive} tuning={tuning} />
      {/* cypress, front-left — the dark flame, the vertical counterweight to the sky */}
      <BrushCypress clock={clock} alive={alive} tuning={tuning} />
    </group>
  )
}
