export type StreetFlags = {
  street: boolean
  station: 0 | 1 | 2 | 3 | 4
  flat: boolean
  ids: boolean
  fail: 'painting' | 'flow' | 'masses' | null
  anchor: 'A' | 'B'
  turn: 'lock' | 'world'
}

export function readStreetFlags(search: string): StreetFlags {
  const params = new URLSearchParams(search)
  const street = params.get('street') === '1'
  const rawStation = parseInt(params.get('station') ?? '0', 10)
  const station = (isNaN(rawStation) ? 0 : Math.max(0, Math.min(4, rawStation))) as 0 | 1 | 2 | 3 | 4
  const flat = params.get('flat') === '1'
  const ids = params.get('ids') === '1'
  const rawFail = params.get('streetFail') ?? params.get('fail')
  const fail = rawFail === 'painting' || rawFail === 'flow' || rawFail === 'masses' ? rawFail : null
  // G5 (2026-10-23): the sky follows the camera (B) and holds the painting's arc in the world; A and lock stay as dev params
  const anchor = (params.get('skyAnchor') ?? params.get('anchor')) === 'A' ? 'A' : 'B'
  const turn = (params.get('skyTurn') ?? params.get('turn')) === 'lock' ? 'lock' : 'world'

  return {
    street,
    station,
    flat,
    ids,
    fail,
    anchor,
    turn,
  }
}

export type AssetStatus = 'pending' | 'ok' | 'failed'

export function streetReadiness(s: {
  painting: AssetStatus
  flow: AssetStatus
  masses: AssetStatus
}): { ready: boolean; render: boolean } {
  const statuses = [s.painting, s.flow, s.masses]
  if (statuses.some((st) => st === 'failed')) {
    return { ready: true, render: false }
  }
  if (statuses.some((st) => st === 'pending')) {
    return { ready: false, render: false }
  }
  return { ready: true, render: true }
}

// the main bundle's two street checks live in streetEntry.ts, so this module (and its flags) stays in the lazy chunk
export { isStreetMode, touchEnabled } from './streetEntry.ts'
