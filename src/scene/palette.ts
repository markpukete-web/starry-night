// The derived palette is the colour source of record (CLAUDE.md acceptance criterion: "colours
// sampled from palette.json; no drift beyond tolerance"). Every painted SURFACE colour below is
// taken from palette.json — median-cut per region from the scan — instead of being hand-picked.
//
// Two deliberate exceptions, both faithful:
//   • The sky STROKES sample painting.jpg directly (see SkyDome) — the palette's own source, so they
//     carry the painting's true local colour rather than its 5-colour reduction (zero drift).
//   • Emissive LIGHT (moon, stars, lit windows) is light, not surface, so it stays warm and bright;
//     Van Gogh's own moon and windows are luminous points, not paint-coloured.
//   • A few foreground surfaces apply a DOCUMENTED scalar/lerp lift to their swatch (at the use site
//     in Diorama.tsx) so the dark forms read in the night lighting — provenance kept (swatch × logged
//     factor, fit to preserve the prior hand-tuned look), per the 2026-06-15 palette-provenance pass.
import palette from '../../public/reference/palette.json'

type Swatch = { hex: string; srgb: number[]; lab: number[]; weight: number }
const region = (name: string): Swatch[] => (palette.regions as Record<string, { colours: Swatch[] }>)[name].colours
const hex = (name: string, i = 0): string => region(name)[i].hex

/** Named surface colours, each sourced from a palette.json region (dominant colour unless noted). */
export const PALETTE = {
  skyZenith: hex('sky', 0), //   #2d3c60 — deepest derived sky (dome gradient, top)
  skyHorizon: hex('sky', 1), //  #3f5d97 — dome gradient, horizon
  cypress: hex('cypress', 0), // #151c1b — the dark flame
  hills: hex('hills', 2), //     #263041 — rolling hills
  ground: hex('village', 0), //  #151b24 — the floating slab
  house: hex('village', 1), //   #2a3f6f — house walls
  roof: hex('village', 3), //    #26282b — roofs
  steeple: hex('village', 2), // #556c81 — the lit spire
  villageCool: hex('village', 4), // #36403f — coolest village swatch (cypress moonlit rim)
  hillsCrest: hex('hills', 4), //  #5c6872 — lightest hills swatch (moonlit crest)
  cypressGreen: hex('cypress', 4), // #333426 — cypress green (the flame's tongues)
  cypressShade: hex('cypress', 3), // #232622 — cypress shade (foreground bushes)
}
