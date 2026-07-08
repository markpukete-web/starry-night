import { SourceCypress } from './SourceCypress'
import { SourceReliefTerrain } from './SourceReliefTerrain'

/**
 * The Starry Night diorama, painting-owned: every visible surface samples the painting through the
 * home-view projection (SourceReliefTerrain, SourceCypress); the camera-locked source sky/matte
 * stack (PaintingFlowSky3D) carries the streamline ribbons behind them. The earlier prop world —
 * floating island, box village, grey hills, terrain blades, ridge stones — is deleted: it competed
 * with the painting's own visual language and failed every taste gate. The source-textured forms
 * are unlit (they carry the painting's own light), so the stage needs no scene lights.
 */
export function Diorama({ debug = 'final' }: { debug?: 'final' | 'stage' }) {
  void debug // stage and final show the same forms; stage differs only by omitting the sky stack
  return (
    <group>
      <SourceReliefTerrain />
      {/* cypress, front-left — the painting's own flame, source-projected into a world volume */}
      <SourceCypress />
    </group>
  )
}
