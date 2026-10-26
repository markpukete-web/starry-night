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
