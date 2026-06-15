import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
// In production (`vite build`) we alias `leva` to a tiny stub so the dev-only tuning panel's library is
// left out of the shipped bundle; dev (`vite serve`) uses the real leva. The stub returns the baked
// default values, so the production look is identical.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve:
    command === 'build'
      ? { alias: { leva: fileURLToPath(new URL('./src/dev/leva-stub.ts', import.meta.url)) } }
      : undefined,
}))
