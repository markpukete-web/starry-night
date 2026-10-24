/**
 * The hand's trail (S3 task 3, tasks/2026-10-24-street-s3-plan.md):
 * D1's rise, swing, settle and freeze in every texel of the map.
 */

import { LAND_TOUCH, NO_RELEASE, landAmplitude } from './landTouch.ts'

export function encodePush(push: number): number {
  return Math.round(128 + 127 * Math.max(-1, Math.min(1, push)))
}

export const TRAIL = {
  texel: 0.005,
  radius: 0.045,
  feet: 0.03,
  rise: LAND_TOUCH.rise,
  tau: LAND_TOUCH.tau,
  period: LAND_TOUCH.period,
  windowStart: LAND_TOUCH.windowStart,
  windowEnd: LAND_TOUCH.windowEnd,
} as const

export type LiveTexel = {
  index: number
  x: number
  y: number
  z: number
  t0: number
  amp: number
  from: number
  release: number
  dir: [number, number]
  source: 'hand' | 'feet'
  stampedThisStep: boolean
  settleFrom?: number
  settleT0?: number
}

export type Trail = {
  rect: [number, number, number, number] // [x0, z0, width, depth]
  size: [number, number] // [cols, rows]
  live: Map<number, LiveTexel>
  clock: number
  mode: 'swing' | 'settle' | 'frozen'
  bytes: Uint8Array
  frozenSince: number | null
}

export function createTrail(rect: [number, number, number, number]): Trail {
  const cols = Math.ceil(rect[2] / TRAIL.texel)
  const rows = Math.ceil(rect[3] / TRAIL.texel)
  const bytes = new Uint8Array(cols * rows * 2)
  bytes.fill(128)
  return {
    rect,
    size: [cols, rows],
    live: new Map(),
    clock: 0,
    mode: 'swing',
    bytes,
    frozenSince: null,
  }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function calcAmp(texel: LiveTexel, now: number, mode: 'swing' | 'settle' | 'frozen'): number {
  if (mode === 'settle' && texel.release !== NO_RELEASE && now > texel.release) {
    if (texel.settleT0 === undefined) {
      texel.settleT0 = now
      texel.settleFrom = landAmplitude(texel, now, TRAIL)
    }
    const since = now - texel.settleT0
    if (since >= TRAIL.rise) return 0
    const progress = smoothstep(0, TRAIL.rise, since)
    return (texel.settleFrom ?? 0) * (1 - progress)
  }

  return landAmplitude(texel, now, TRAIL)
}

export function stampSegment(
  trail: Trail,
  from: [number, number] | null,
  to: [number, number],
  radius: number,
  now: number,
  source: 'hand' | 'feet',
): void {
  if (trail.mode === 'frozen') return

  const [x0, z0] = trail.rect
  const [cols, rows] = trail.size

  const isSegment = from !== null
  const segX = isSegment ? to[0] - from[0] : 0
  const segZ = isSegment ? to[1] - from[1] : 0
  const segLen = isSegment ? Math.hypot(segX, segZ) : 0

  const minX = (isSegment ? Math.min(from[0], to[0]) : to[0]) - radius
  const maxX = (isSegment ? Math.max(from[0], to[0]) : to[0]) + radius
  const minZ = (isSegment ? Math.min(from[1], to[1]) : to[1]) - radius
  const maxZ = (isSegment ? Math.max(from[1], to[1]) : to[1]) + radius

  const c0 = Math.max(0, Math.floor((minX - x0) / TRAIL.texel))
  const c1 = Math.min(cols - 1, Math.floor((maxX - x0) / TRAIL.texel))
  const r0 = Math.max(0, Math.floor((minZ - z0) / TRAIL.texel))
  const r1 = Math.min(rows - 1, Math.floor((maxZ - z0) / TRAIL.texel))

  if (c0 > c1 || r0 > r1) return

  for (let r = r0; r <= r1; r++) {
    const tz = z0 + (r + 0.5) * TRAIL.texel
    for (let c = c0; c <= c1; c++) {
      const tx = x0 + (c + 0.5) * TRAIL.texel

      let dist: number
      let dir: [number, number]

      if (!isSegment || segLen < 1e-6) {
        const dx = tx - to[0]
        const dz = tz - to[1]
        dist = Math.hypot(dx, dz)
        if (dist >= radius) continue
        const isCentreTexel = Math.abs(dx) < TRAIL.texel * 0.5 && Math.abs(dz) < TRAIL.texel * 0.5
        dir = isCentreTexel || dist < 1e-6 ? [0, 0] : [dx / dist, dz / dist]
      } else {
        const u = ((tx - from[0]) * segX + (tz - from[1]) * segZ) / (segLen * segLen)
        if (u <= 0 || u >= 1) {
          const endPt = u <= 0 ? from : to
          const dx = tx - endPt[0]
          const dz = tz - endPt[1]
          dist = Math.hypot(dx, dz)
          if (dist >= radius) continue
          const isCentreTexel = Math.abs(dx) < TRAIL.texel * 0.5 && Math.abs(dz) < TRAIL.texel * 0.5
          dir = isCentreTexel || dist < 1e-6 ? [0, 0] : [dx / dist, dz / dist]
        } else {
          const projX = from[0] + u * segX
          const projZ = from[1] + u * segZ
          const dx = tx - projX
          const dz = tz - projZ
          dist = Math.hypot(dx, dz)
          if (dist >= radius) continue
          if (dist <= TRAIL.texel) {
            dir = [segX / segLen, segZ / segLen]
          } else {
            dir = [dx / dist, dz / dist]
          }
        }
      }

      const q = dist / radius
      const target = (1 - q) ** 2
      const idx = r * cols + c

      const existing = trail.live.get(idx)
      if (existing) {
        existing.stampedThisStep = true
        if (existing.release !== NO_RELEASE) {
          // Re-stamping an already released texel: a target at least its current amplitude holds it again
          const curr = calcAmp(existing, now, trail.mode)
          if (target >= curr - 1e-9) {
            existing.from = curr
            existing.amp = target
            existing.t0 = now
            existing.release = NO_RELEASE
            existing.source = source
            if (target > 0) existing.dir = dir
            delete existing.settleFrom
            delete existing.settleT0
          }
        } else {
          // Held texel: greater target retargets, equal target takes direction and source only
          if (target > existing.amp + 1e-9) {
            const curr = calcAmp(existing, now, trail.mode)
            existing.from = curr
            existing.amp = target
            existing.t0 = now
            existing.source = source
            if (target > 0) existing.dir = dir
          } else if (Math.abs(target - existing.amp) <= 1e-9) {
            existing.source = source
            if (target > 0) existing.dir = dir
          }
        }
      } else {
        trail.live.set(idx, {
          index: idx,
          x: tx,
          y: 0,
          z: tz,
          t0: now,
          amp: target,
          from: 0,
          release: NO_RELEASE,
          dir,
          source,
          stampedThisStep: true,
        })
      }
    }
  }
}

export function stepTrail(
  trail: Trail,
  now: number,
  mode: 'swing' | 'settle' | 'frozen',
): boolean {
  if (trail.mode === 'frozen' && mode === 'frozen') {
    return false
  }

  if (trail.frozenSince !== null && mode !== 'frozen') {
    const dt = now - trail.frozenSince
    for (const texel of trail.live.values()) {
      texel.t0 += dt
      if (texel.release !== NO_RELEASE) texel.release += dt
      if (texel.settleT0 !== undefined) texel.settleT0 += dt
    }
    trail.frozenSince = null
  }

  const enteringFreeze = mode === 'frozen' && trail.mode !== 'frozen'
  const activeMode = enteringFreeze ? trail.mode : mode
  trail.mode = mode
  trail.clock = now

  // Implicit release for held texels not reached this step
  if (!enteringFreeze) {
    for (const texel of trail.live.values()) {
      if (texel.release === NO_RELEASE) {
        if (!texel.stampedThisStep) {
          texel.release = now
          if (activeMode === 'settle') {
            texel.settleFrom = calcAmp(texel, now, 'swing')
            texel.settleT0 = now
          }
        }
      }
      texel.stampedThisStep = false
    }
  }

  let changed = false

  for (const [idx, texel] of trail.live) {
    const amp = calcAmp(texel, now, activeMode)

    const isClosed =
      texel.release !== NO_RELEASE &&
      (amp === 0 ||
        (activeMode === 'settle' &&
          texel.settleT0 !== undefined &&
          now - texel.settleT0 >= TRAIL.rise) ||
        (activeMode === 'swing' && now - texel.release >= TRAIL.windowEnd))

    if (isClosed) {
      trail.live.delete(idx)
      if (trail.bytes[idx * 2] !== 128 || trail.bytes[idx * 2 + 1] !== 128) {
        trail.bytes[idx * 2] = 128
        trail.bytes[idx * 2 + 1] = 128
        changed = true
      }
    } else {
      const pushX = Math.max(-1, Math.min(1, amp * texel.dir[0]))
      const pushZ = Math.max(-1, Math.min(1, amp * texel.dir[1]))
      const b0 = encodePush(pushX)
      const b1 = encodePush(pushZ)

      if (trail.bytes[idx * 2] !== b0 || trail.bytes[idx * 2 + 1] !== b1) {
        trail.bytes[idx * 2] = b0
        trail.bytes[idx * 2 + 1] = b1
        changed = true
      }
    }
  }

  if (enteringFreeze) {
    trail.frozenSince = now
  }

  return changed
}
