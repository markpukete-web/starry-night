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

Pre-release sign-off is currently withdrawn for a quality-refinement gate. The piece is an orbitable 3D
diorama with visitor controls, reduced motion, and a full foreground, but the next roadmap item is to bring
the sky flow materially closer to the original painting before release. After the sky-flow fidelity pass, the
cypress and village get a second painterly refinement pass.
