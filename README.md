# The Starry Night

Van Gogh's *The Starry Night*, made movable — an interactive 3D rendition where the sky churns the way he painted it.

**→ Live: <https://starry-night-blue.vercel.app>**

Built with three.js / React Three Fiber. Vibe-coded with Claude Code; product thinking, taste, and
the love for this painting are [Mark's](https://markma.dev).

## Run

```bash
npm install
npm run dev
```

Node 24 LTS. The build scripts are executed straight by Node (`node scripts/foo.ts`), so they need a
Node new enough to strip TypeScript natively; Vercel builds on 24.x.

### Routes and debug switches

`mode` defaults to `diorama`, which is what a visitor gets.

| Query | Effect |
|---|---|
| `?mode=diorama` | the shipped orbitable 3D diorama (default) |
| `?mode=painting` | the flat 2D route — any value that is not `diorama`/`canopy`/`relief` lands here |
| `?mode=canopy` · `?mode=relief` | earlier experiments, kept for comparison |
| `&clean=1` | hides all visitor chrome — how captures stay comparable |
| `&debug=nopost` · `&debug=flow` · `&debug=stage` | no post pass · sky only · foreground only |
| `&view=orbit` | the orbit-preset camera instead of the home pose |
| `&perf=1` | frame-timing probe on `window.__perf`, pipeline otherwise untouched |

### Verifying

```bash
npm run lint && npm run test:sky && npm run build
npm run check:reduced     # prefers-reduced-motion yields a still frame; the control churns
npm run check:viewport    # camera AND visitor chrome survive a live device rotation
npm run capture:diorama -- output/playwright/<name>   # nine deterministic views
```

`check:viewport` and `check:reduced` drive a real headless browser, because the failures they guard
are live ones — a stale camera after a resize, or chrome that only clips at a viewport nobody tested.
Unit tests pin the constants and cannot see either.

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

## Deploying

The Vercel project is connected to this repo with `main` as its production branch, so **pushing `main`
is the deploy** — there is no separate publish step, and there is no staging branch in front of it.

`main` is the only long-lived branch (`record/2d-streamline-flow` is a frozen bookmark on the 2D era).
So for anything beyond a typo, branch, verify there, then fast-forward:

```bash
git switch -c <change>            # work here, push freely — a branch push only makes a preview
npm run lint && npm run test:sky && npm run build
npm run check:reduced && npm run check:viewport
git switch main && git merge --ff-only <change> && git push origin main   # this deploys
```

Preview deployments sit behind Vercel authentication; production does not. If a deploy goes wrong, the
previous production deployment is a rollback candidate in the Vercel dashboard.

## Where things live

| Path | |
|---|---|
| `src/scene/` | the scene — `DioramaExperience` composes `Diorama` (island, cypress, village, shrubs) under `PaintingFlowSky3D` |
| `src/scene/dioramaContract.ts` | cameras and the locked orbit envelope, stated as orbit parameters |
| `scripts/` | the offline pipeline, the browser checks, and the unit tests |
| `public/reference/` | the derived assets the runtime samples — committed, so a clone just runs |
| `tasks/todo.md` · `tasks/lessons.md` | the plan of record and the project's memory — **read both before changing anything** |
| `docs/decisions/` | why the reference pipeline, the movable decision, and the inpaint/extend work are the way they are |
