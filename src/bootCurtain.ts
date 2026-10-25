/**
 * The loading curtain (tasks/2026-10-25-loading-curtain-plan.md (a), (b)): `#boot` in index.html is a copy of the
 * opening's layer, painted at the first paint, before the code arrives. The diorama keeps it while its opening waits
 * for the scene, and its driver drops it when the wait ends. Every other page drops it on its first commit.
 */
import { ARRIVAL } from './scene/arrival'

let kept = false
let dropped = false

export function keepBootCurtain(): void {
  if (kept) return
  kept = true
  // a page that fails after the keep (no WebGL, a throw in the first render) has no driver left to drop it: the
  // curtain never outlives the opening's own timeout by more than 5 s (the loading read's P2). React's layer looks the
  // same, so on a page that still runs the drop is not seen
  window.setTimeout(dropBootCurtain, (ARRIVAL.readyTimeout + 5) * 1000)
}

export function dropBootCurtain(): void {
  if (dropped) return
  dropped = true
  document.getElementById('boot')?.remove()
}

export function dropBootCurtainUnlessKept(): void {
  if (!kept) dropBootCurtain()
}
