/**
 * `JSON.stringify` with every number rounded to 6 decimal places, for a hash pinned on this Mac and checked in CI.
 * macOS arm64 and Linux x64 differ in the last bits of some built floats: 85,170 of 13,490,062 values, by at most
 * 7.2e-14 (item 1, 2026-11-14, `tasks/2026-11-14-audit.md`). Node 24 and Node 26 agree on Linux, so the machine
 * type is the cause, not the Node version. At 1e-6 the chance that a re-pin lands a value on a rounding edge was
 * measured under 0.005%, and 1e-6 is far below a pixel in the world or 1/255 in a colour.
 */
export const roundedJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v))
