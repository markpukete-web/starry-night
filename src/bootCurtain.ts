/**
 * The loading curtain (tasks/2026-10-25-loading-curtain-plan.md (a), (b)): `#boot` in index.html is a copy of the
 * opening's layer, painted at the first paint, before the code arrives. The diorama keeps it while its opening waits
 * for the scene, and its driver drops it when the wait ends. Every other page drops it on its first commit.
 */
let kept = false
let dropped = false

export function keepBootCurtain(): void {
  kept = true
}

export function dropBootCurtain(): void {
  if (dropped) return
  dropped = true
  document.getElementById('boot')?.remove()
}

export function dropBootCurtainUnlessKept(): void {
  if (!kept) dropBootCurtain()
}

/**
 * The page failed: the error boundary in `main.tsx` caught a scene's throw and shows the painting with Vincent's line
 * in its place (the audit's item 6). The curtain goes, so one painting shows, whether or not it was still up. The class
 * hides the cue, as `index.html`'s listener does for an error no boundary catches. The ready seams hold true for the
 * page's life, so a check waiting on them stops: a canvas unmounts in its own root after the catch, and a sky that had
 * mounted writes false on its way out.
 */
export function failPage(cause: unknown): void {
  dropBootCurtain()
  document.documentElement.classList.add('arrival-failed')
  for (const seam of ['__skyReady', '__streetReady']) Object.defineProperty(window, seam, { configurable: true, get: () => true, set: () => {} })
  console.error('The Starry Night failed to draw its scene and shows the painting instead:', cause)
}
