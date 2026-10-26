import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const ROOT = resolve(import.meta.dirname, '..')

test('--time takes a number, names its file as the capture does, and refuses an empty value (Codex B5)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'street-colour-'))
  const run = (...extra: string[]) =>
    spawnSync(process.execPath, ['scripts/check-street-colour.ts', dir, '--station', '0', '--viewport', 'desktop', ...extra], { cwd: ROOT, encoding: 'utf8' })
  try {
    const empty = run('--time', '')
    assert.equal(empty.status, 1)
    assert.match(empty.stderr, /--time takes a number/)
    // the capture writes `-t${Number(t)}.png`, so 0.0 is the file -t0.png
    const spelled = run('--time', '0.0')
    assert.equal(spelled.status, 1)
    assert.match(spelled.stderr, /\{ -t0\.png \}/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
