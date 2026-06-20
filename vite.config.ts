import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'

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
        let body = ''
        req.on('data', (chunk) => (body += String(chunk)))
        req.on('end', () => {
          try {
            const parsed: unknown = JSON.parse(body)
            const file = fileURLToPath(new URL('./src/scene/sky-tuning.json', import.meta.url))
            fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n')
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
