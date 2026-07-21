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

Four of the five review gates have passed (reference pipeline, the movable decision, first full animated
sky, foreground complete). **Pre-release is the one that remains** — lighting/bloom balance, mobile portrait
framing, performance on real hardware, and deploy. Not released yet.
