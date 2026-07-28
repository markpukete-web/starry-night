# The Starry Night

Van Gogh's *The Starry Night*, made movable — an interactive 3D rendition where the sky churns the way he painted it.

Built with three.js / React Three Fiber. Vibe-coded with Claude Code; product thinking, taste, and
the love for this painting are [Mark's](https://markma.dev).

## Run

```bash
npm install
npm run dev
```

### Asset pipeline (only when re-baking reference assets)

The derived reference assets are committed, so nothing below is needed to run, build, test or
deploy the app. Re-baking them (`npm run derive-reference` / `npm run extend-reference`) writes
PNG, then `npm run slim-reference` prepares the shipped set — re-encoding losslessly and
converting the three colour assets to lossless WebP. That last step needs `cwebp`/`dwebp`:

```bash
brew install webp
```

## Status

An orbitable 3D diorama: constrained orbit (never free-fly), visitor controls, reduced-motion still state,
and a full foreground. Head-on it reads as the painting's composition.

The sky-flow fidelity work is done. Motion and colour are derived from a high-resolution scan rather than
from generic noise, and an offline pipeline fills the cypress cut-out and extends the canvas sideways using
the painting's own pixels, so the sky continues past its edges instead of ending on a card.

The cypress has since had its own second pass on the same principle: its silhouette is compiled from the
painting's persistent row runs, and the painting's pixels are projected onto that form rather than its
brushwork being synthesised. Full-frame bloom came out of the diorama in the same pass — the contrast was
already authored, and the wash was flattening the sky's strokes.

The village had the same treatment — drawn cloisonnist contours, stroke-built walls, the church held inside
the nocturne band, and painted window glow.

**Released 2026-07-28 — live at <https://starry-night-blue.vercel.app>.** All five review gates have
passed: reference pipeline, the movable decision, first full animated sky, foreground complete, and
pre-release. Production deploys from `main`.

Two items are open rather than done. The custom domain `starrynight.markma.dev` is not attached yet, so the
`.vercel.app` URL is the address for now. And the locked 30 fps mid-tier-mobile criterion is accepted
**unverified** — it was waived by the owner rather than measured, since headless cannot read real device
frame rates; desktop sits at mean 8.33 ms / p95 ~9.1 ms.
