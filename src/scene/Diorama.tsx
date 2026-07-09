import { BrushCypress } from './BrushCypress'
import { BrushIsland } from './BrushIsland'
import { BrushVillage } from './BrushVillage'

/**
 * The Starry Night diorama, authored in Van Gogh brushstrokes. Every foreground surface is a real
 * closed 3D volume clad in oriented impasto strokes (BrushIsland, BrushCypress) — so the scene
 * survives a full orbit, no projected sheet to curl or funnel. The camera-locked source-ribbon sky
 * (PaintingFlowSky3D) carries the swirls behind them. The projected-relief foreground and the grey
 * prop diorama before it are both gone.
 */
export function Diorama({ debug = 'final' }: { debug?: 'final' | 'stage' }) {
  void debug // stage and final show the same forms; stage differs only by omitting the sky stack
  return (
    <group>
      <BrushIsland />
      {/* the village huddle + pale-spired church, nestled at the hills' foot */}
      <BrushVillage />
      {/* cypress, front-left — the dark flame, the vertical counterweight to the sky */}
      <BrushCypress />
    </group>
  )
}
