# The Starry Night — interactive painting

## What this is

A standalone interactive 3D piece that makes Vincent van Gogh's *The Starry Night* (1889, public
domain) movable — the painting's sky genuinely churning the way Van Gogh painted the motion, not a
static canvas with effects on top. This is Mark's passion piece: the ONE painting he most wants to
build.

Standalone by decision (2026-06-12): its own repo, its own deploy. It is **not** a scene inside
markma.dev and not bound by that project's spec. Once finished it links from the portfolio and
lives at `starrynight.markma.dev` (Vercel Hobby + Cloudflare DNS subdomain, CNAME grey-cloud).

## The bar

The swirl motion must read as **Van Gogh's brushstrokes**, not generic noise soup. Faithfulness to
the painting's motion, colour, and impasto energy is the whole point. Prior art to study before
building: Petros Vrellis' interactive Starry Night (flow-field brushstroke animation); the
Techartist time-dial diorama (markma.dev repo,
`docs/superpowers/references/2026-06-12-techartist-time-dial-diorama.md`) for preset-switch
interaction shape.

## Stack (decided)

Vite + React + TypeScript + three.js + React Three Fiber + drei. npm. Same proven stack as
markma.dev v3 — capability transfers both ways. The current `App.tsx` scene is a scaffold
smoke-test placeholder, not design.

## Open — settle in the first design session before building

- What "movable" means precisely: flow-field instanced-brushstroke sky vs 2.5D depth-parallax vs
  3D foreground (cypress, village, steeple) under an animated sky — or a hybrid.
- Camera model: free orbit, constrained pan/tilt, or guided.
- Interaction beyond looking: any dial/toggle mechanic, or pure observation.
- Mobile/touch behaviour and performance budget.

## Working discipline (carried from markma.dev v3 — proven there)

- **British English** throughout.
- **Conventional commits**; the log reads as a build-in-public timeline.
- **Look before the gate:** before asking Mark to review any visual change, run the app, capture
  with Playwright (desktop + mobile), self-judge against the painting, retune on mechanical fails.
  Never present "tests green" as done without looking.
- **Taste and release calls are Mark's.** Claude flags what looks wrong; Mark decides what feels
  right.
- **Ground in the reference first.** The actual painting (high-resolution public-domain scan) is
  the source of truth for colour and stroke direction — study it before building, don't re-derive
  from memory.
- **Classify before building:** authored assets for identity objects, procedural for fill —
  judged per element in the design session.
- `prefers-reduced-motion` respected: the piece must have a dignified still state.
- **Honest AI framing:** human-led product thinking supported by AI coding tools.

## Out of scope

- Audio, VR/AR, other paintings, gallery/series framing — this is one painting done deeply.
- Anything that puts Starry Night inside the markma.dev world. It links out, full stop.
