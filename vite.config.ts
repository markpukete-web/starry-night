import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// The only fields the tuning endpoint will persist (allowlist — anything else is dropped).
const TUNING_FIELDS = new Set([
  'churnSpeed', 'strokes', 'strokeWidth', 'swirlTightness', 'flowBias', 'saturation',
  'skyTop', 'skyBottom', 'bloom', 'bloomThreshold', 'bloomRadius', 'glow', 'moon', 'stars',
])

// Dev-only middleware: the tuning panel's "set as default" button POSTs the current control values
// here, and we write them to src/scene/sky-tuning.json (the source of the baked defaults). Serve-only,
// so the shipped build has no file-writing endpoint.
function skyTuningWriter(): Plugin {
  return {
    name: 'sky-tuning-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__set-tuning', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        // This endpoint writes a file, so guard against cross-site abuse: only accept a same-origin
        // localhost request with an application/json body. HTML forms can't set that content type, and
        // a cross-origin fetch that does would trigger a CORS preflight we never answer — so only the
        // app's own "set as default" button (or a local tool like curl, which sends no Origin) gets through.
        const origin = req.headers.origin
        const sameOrigin = origin === undefined || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        const isJson = (req.headers['content-type'] ?? '').includes('application/json')
        if (!sameOrigin || !isJson) {
          res.statusCode = 403
          res.end('forbidden')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += String(chunk)))
        req.on('end', () => {
          try {
            const parsed: unknown = JSON.parse(body)
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('expected an object')
            // Write only allowlisted fields whose values are finite numbers or #-hex colour strings.
            const clean: Record<string, number | string> = {}
            for (const [key, val] of Object.entries(parsed)) {
              if (!TUNING_FIELDS.has(key)) continue
              if (typeof val === 'number' && Number.isFinite(val)) clean[key] = val
              else if (typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val)) clean[key] = val
              else throw new Error(`invalid value for ${key}`)
            }
            const file = fileURLToPath(new URL('./src/scene/sky-tuning.json', import.meta.url))
            fs.writeFileSync(file, JSON.stringify(clean, null, 2) + '\n')
            res.statusCode = 200
            res.end('ok')
          } catch (err) {
            res.statusCode = 400
            res.end(String(err))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
// In production (`vite build`) we alias `leva` to a tiny stub so the dev-only tuning panel's library is
// left out of the shipped bundle; dev (`vite serve`) uses the real leva. The stub returns the baked
// default values, so the production look is identical.
export default defineConfig(({ command }) => ({
  plugins: [react(), skyTuningWriter()],
  resolve:
    command === 'build'
      ? { alias: { leva: fileURLToPath(new URL('./src/dev/leva-stub.ts', import.meta.url)) } }
      : undefined,
}))
