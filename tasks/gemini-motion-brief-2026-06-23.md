# Gemini motion brief — close the gap to the parsed video

Date: 2026-06-23
Status: draft handoff prompt for Gemini, written for Codex/Claude cross-review before it is sent.
Author: Claude Code (review session). Executor: Gemini. Reviewer: Codex.

## Context for the cross-reviewer

This brief follows on from Gemini's 2026-06-22 work, which replaced the rejected brush-dab churn
(`BrushDabs`) with a streamline-ribbon sky (`src/scene/StreamlineSky.tsx`) — the direction
`tasks/codex-motion-note-2026-06-22.md` argued for. That swap was reviewed this session by running
the app and looking at the captures:

- It renders cleanly (0 console errors); reduced-motion, Pause, and the Show-original compare all
  still work; paused frames are byte-identical (a true freeze).
- It reads as Van Gogh brushstrokes flowing along the painting's real swirl paths — a genuine step
  back towards "the soul of the painting", not generic noise.

It is **closer in kind** to the parsed reference video, but **not yet matched in degree**. Measuring
the render's frame-to-frame motion against the video's own frame difference (`scratch/ref/mA.jpg`
vs `scratch/ref/mB.jpg`) showed three specific shortfalls:

1. **Coverage** — render motion concentrates in the upper-central whorl; lower sky and edges sit
   nearly static. The video shimmers across the whole sky, evenly.
2. **Star & moon halos** — the video's halos are its brightest, most active element (pulsing
   concentric rings); the render leaves the halo centres as dead holes.
3. **Magnitude & grain** — mean frame difference ≈ 4.5 for the video's single frame-step vs ≈ 1.6
   for the render over a full 2 seconds; the video is finer and several times more active per unit
   time.

Evidence (left = video motion, right = render motion, identical processing):
`output/playwright/claude-review/motion_side_by_side.jpg` (and `video_motion_gray.jpg` /
`render_motion_gray.jpg` alongside it).

The brief is deliberately shaped as an **autonomy test**: it gives Gemini the *what* (the three
gaps), the *why-nots* (the rejected-approach list), and the *proof bar*, but leaves the *how* to
Gemini. The visual gate is emphasised because the previous pass added a heatmap/stats gate, and the
project's locked rule is that heatmaps and tests are **not** proof — only looking at real captures
against the painting is.

---

## The prompt (copy from here down to send to Gemini)

````text
You are an autonomous engineer working in the `starry-night` repo (Vite + React + TypeScript +
three.js / React Three Fiber). This is an interactive, movable version of Van Gogh's *The Starry
Night* whose sky must churn the way Van Gogh painted the motion. Your job: close the gap between
the current animated sky and a parsed reference video of the target motion. Decide the approach
yourself — but obey every constraint below.

── READ FIRST (ground truth — do not work from memory) ──
• CLAUDE.md — the bar, the LOCKED acceptance criteria, Tunables, and Out-of-scope. Obey the locked
  sections; do not edit them.
• tasks/codex-motion-note-2026-06-22.md — the motion diagnosis and the list of approaches already
  TRIED AND REJECTED by the project owner. Read the "why" for each; do not reintroduce any of them.
• src/scene/StreamlineSky.tsx — the animated sky you are improving. It integrates streamline
  ribbons through the painting's derived flow field and travels a brightness phase along each
  ribbon. Helpers: useImageData.ts, brush.ts, skyFraming.ts. It sits over the static base
  src/scene/LivingPainting.tsx.
• Derived inputs: public/reference/signed-flow.png (directed flow), public/reference/sky-mask.png,
  public/reference/painting.jpg.
• Video target: scratch/ref/ref-motion.jpg (the video's motion map), scratch/ref/mA.jpg +
  scratch/ref/mB.jpg (two consecutive video frames), scratch/ref/frame60.jpg (a still).

── THE GAP TO CLOSE ──
The video's motion is a dense, fine, EVEN, full-field stroke shimmer: every brushstroke contour is
alive, and the star and moon halos pulse as bright concentric rings. The current render flows along
the correct swirl paths (keep that), but falls short in exactly three ways:
  1. COVERAGE — render motion is concentrated in the upper-central whorl; the lower sky and edges
     are nearly static. Make the churn cover the whole sky mask, evenly.
  2. STAR & MOON HALOS — in the video these are the brightest, most active element; in the render
     the halo centres are dead holes. Bring the halos alive as PAINTED SHIMMER.
  3. MAGNITUDE & GRAIN — the video is finer and several times more active per unit time (mean
     frame-to-frame difference ≈ 4.5 for the video's single frame-step vs ≈ 1.6 for the render over
     a full 2 seconds). Make it finer-grained and a touch more alive.

── STAY IN THE MEDIUM — DO NOT REGRESS (each was rejected; see the codex note) ──
• No base flow-map advection / cross-fade (reads as water; blurs the art).
• No orbit-forced or tangential laminar halo flow, and NO mechanical "fan spin" on the halos —
  halo motion must be painted shimmer in the same streamline medium, not a rotating wheel.
• No flat-colour or cut-out "dab" overlays drifting over the painting.
• No two-frame A/B (mA↔mB) ping-pong blend (gives back-and-forth, not forward flow).
• No swarm of tiny independent marks (reads as crawling worms).
The motion must read as painted stroke energy travelling through CONTINUOUS marks along the
painting's own swirl paths.

── MUST NOT BREAK (locked / must-keep) ──
• prefers-reduced-motion AND the in-app Pause button must yield a fully frozen, well-lit still
  (today the paused frames are byte-identical — keep that exactly).
• The "Show original" compare-to-painting feature in App.tsx must keep working.
• Colours stay sampled from the painting/palette; stay within the stroke budget in CLAUDE.md
  Tunables (≤8000 desktop / ≤3000 mobile); keep good performance.

── REQUIRED METHOD — THE PROJECT'S HARD GATE, NOT OPTIONAL ──
Heatmaps, stats, and passing tests are NOT proof. After every change you MUST:
  1. Run the app (`npm run dev`), drive it with Playwright, and capture the live WebGL canvas at
     desktop and mobile (the canvas has preserveDrawingBuffer, so canvas.toDataURL() works).
  2. Build a render motion map the same way the reference was built: capture two render frames a
     fixed interval apart, take their grayscale absolute difference, auto-level it, and place it
     BESIDE the video's motion (scratch/ref/ref-motion.jpg, or the mA/mB diff) at matched size.
  3. LOOK at the two side by side with your own eyes and judge coverage, halo activity, and grain.
     Also look at the still render against public/reference/painting.jpg to confirm you have not
     muddied the brushwork.
  4. Iterate until the render's motion map visibly approaches the video's on all three axes.
Never report progress on a frame you have not actually looked at.

── DEFINITION OF DONE ──
The render's motion map shows (a) even, full-sky coverage, (b) star and moon halos pulsing as
rings, and (c) a finer, more active grain — while still reading as Van Gogh brushstrokes (not
worms/water/dabs/fan-spin), with reduced-motion, pause, and compare all still working.

── PROCESS & REPORT ──
Work on a branch; do not commit to main. When done, report: what you changed and why; the
before/after side-by-side motion captures (with the video map for reference); an HONEST assessment
of which of the three gaps you closed and which you did not; and the tunable values you settled on.
If a gap cannot be closed without violating a hard constraint, say so plainly rather than forcing
it.
````

---

## Judgment calls for the cross-reviewer to poke at

- **Autonomy vs prescription.** The brief names the three target outcomes but not an implementation
  (e.g. it does not dictate concentric ribbon seeding around stars). That tests whether Gemini can
  design the fix; the cost is less control. Flip to prescriptive if the goal is a known-good result
  rather than a capability test.
- **No "one lever at a time" rule.** Left out so as not to over-constrain the process; the visual
  gate should catch regressions anyway. Add it if tighter control is wanted.
- **Halo risk.** Asking for lively halos is the closest thing here to the rejected "fan spin"; the
  brief forbids mechanical rotation and demands painted shimmer, but this is the requirement most
  likely to drift back into a hard-negative. Worth a reviewer's eye.
- **Magnitude numbers are directional.** The ≈4.5-vs-1.6 figures compare the video's single
  frame-step against a 2-second render window (the parsed video's frame interval is unknown), so
  they bound the gap loosely rather than exactly.
