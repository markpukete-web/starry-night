# The Starry Night

Van Gogh's *The Starry Night*, made movable — an interactive 3D rendition where the sky churns the way he painted it.

**→ Live: <https://starrynight.markma.dev>** (Vercel fallback: <https://starry-night-blue.vercel.app>)

Built with three.js / React Three Fiber. Vibe-coded with Claude Code; product thinking, taste, and
the love for this painting are [Mark's](https://markma.dev). It hangs inside that portfolio as The
Easel, alongside [TrackView 3D](https://trackview3d.markma.dev).

## Run

```bash
npm install
npm run dev
```

Node 24 LTS. The build scripts are executed straight by Node (`node scripts/foo.ts`), so they need a
Node new enough to strip TypeScript natively; Vercel builds on 24.x.

### Routes and switches

`mode` defaults to `diorama`, which is what a visitor gets.

| Query | Effect |
|---|---|
| `?mode=diorama` | the shipped orbitable 3D diorama (default) |
| `?mode=painting` | the flat 2D route — any value that is not `diorama`/`canopy`/`relief` lands here |
| `?mode=canopy` · `?mode=relief` | earlier experiments, kept for comparison |
| `&clean=1` | hides all visitor chrome — how captures stay comparable |
| `&debug=flow` · `&debug=stage` | sky only · foreground only |
| `&view=orbit` | the orbit-preset camera instead of the home pose |
| `&perf=1` | frame-timing probe on `window.__perf`, pipeline otherwise untouched |
| `&sky=light` | opens on the painted-light sky instead of the moving strokes |
| `&alive=0` | turns off the sky's gusts and breathing halos, and the pointer's surge of light with them |
| `&touch=0` | turns off the pointer's surge of light alone |
| `&arrival=0` · `&arrival=1` | skips the opening · always plays it (a plain visit plays it once per session) |
| `&portal=0` | turns off the portal into the village street |
| `&slow=1` | shows the lighter view's card at once |
| `&tune=1` | opens the tuner for the sky's alive knobs |
| `?street=1` | opens the village street directly. Its own switches (`station`, `walk`, `walkT`, `walkMode`, `vincent`, `grass`, `wander`, `light`) are listed with their slices in `CLAUDE.md`'s Tunables |

### Verifying

```bash
npm run lint && npm run test:sky && npm run build
npm run check:reduced     # prefers-reduced-motion yields a still frame; the control churns
npm run check:viewport    # camera AND visitor chrome survive a live device rotation
npm run capture:diorama -- output/playwright/<name>   # eight deterministic views
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

The village had the same treatment. The church, its neighbours and the surrounding houses are authored
forms painted with patches cut from the scan, and the foliage between them is traced from the painting's
own brush crests rather than generated.

**Released 2026-07-28 — live at <https://starrynight.markma.dev>.** All five review gates have
passed: reference pipeline, the movable decision, first full animated sky, foreground complete, and
pre-release. Production deploys from `main`.

The custom domain and portfolio link-out are live. The locked 30 fps mid-tier-mobile criterion remains
accepted **unverified** — it was waived by the owner rather than measured, since headless cannot read real
device frame rates; desktop sits at mean 8.33 ms / p95 ~9.1 ms. The custom domain is currently served
through Cloudflare proxying; the earlier DNS-only (grey-cloud) plan is configuration history, not a release
blocker.

Since the release the diorama has come alive. Gusts warp the sky's clock, the cypress flickers upward and the
village windows glimmer. A pointer pushes light along the strokes, and a visit opens on the painting with
Vincent's line from letter 777 before it dissolves into the scene. The cypress and the land are painted with
ribbons traced in their own flow fields.

The village is also a place to walk. A click on the village, or the dock's "Enter the village", flies the camera
into its street. There Vincent walks the lane past the cottages to the church and its square, and the grass parts
under the hand and his feet. A phone asks before its first entry, because the street is heavy for a phone.

## Deploying

The Vercel project is connected to this repo with `main` as its production branch, so **a merge to `main`
is the deploy** — there is no separate publish step, and there is no staging branch in front of it.

`main` is the only long-lived branch, and the "Protect main" ruleset refuses a direct push: a change reaches
it through a pull request with the CI check green. So branch, verify there, then open the pull request:

```bash
git switch -c <change>            # work here, push freely — a branch push only makes a preview
npm run lint && npm run test:sky && npm run build
npm run check:reduced && npm run check:viewport
git push -u origin <change> && gh pr create      # merging the pull request deploys
```

Preview deployments sit behind Vercel authentication; production does not. If a deploy goes wrong, the
previous production deployment is a rollback candidate in the Vercel dashboard.

## Where things live

| Path | |
|---|---|
| `src/scene/` | the scene — `DioramaExperience` composes `Diorama` (island, village, cypress) under `PaintingFlowSky3D` |
| `src/scene/dioramaContract.ts` | cameras and the locked orbit envelope, stated as orbit parameters |
| `scripts/` | the offline pipeline, the browser checks, and the unit tests |
| `public/reference/` | the derived assets the runtime samples — committed, so a clone just runs |
| `tasks/todo.md` · `tasks/lessons.md` | the plan of record and the project's memory — **read both before changing anything** |
| `docs/decisions/` | why the reference pipeline, the movable decision, and the inpaint/extend work are the way they are |
