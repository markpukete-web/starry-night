import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const PORTS = {
  'capture-diorama': { app: 5179, debug: 9223, range: 500 },
  'capture-sky-frames': { app: 5179, debug: 9223, range: 500 },
  'check-failure-paths': { app: 5197, debug: 9300, range: 300 },
  'check-portal': { app: 5198, debug: 9600, range: 300 },
  'check-reduced-motion': { app: 5179, debug: 9223, range: 500 },
  'check-sky-transform': { app: 5181, debug: 9223, range: 500 },
  'check-street-cypress-hang': { app: 5183, debug: 9223, range: 500 },
  'check-street-grass': { app: 5191, debug: 9555, range: 300 },
  'check-street-rotation': { app: 5181, debug: 9223, range: 500 },
  'check-street-walk': { app: 5191, debug: 9444, range: 400 },
  'check-viewport-camera': { app: 5179, debug: 9700, range: 300 },
  'perf-street-grass': { app: 5191, debug: 9600, range: 300 },
}

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function debugPort(name) {
  const entry = PORTS[name]
  if (!entry) throw new Error(`Unknown script port entry: ${name}`)
  return entry.debug + Math.floor(Math.random() * entry.range)
}

export function chromePath() {
  const found = process.env.CHROME_PATH || CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) {
    console.error('No Chrome-compatible browser found. Set CHROME_PATH.')
    process.exit(1)
  }
  return found
}

async function waitForChrome(port, timeoutMs = 20000) {
  const versionUrl = `http://127.0.0.1:${port}/json/version`
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(versionUrl)
      if (response.ok) return await response.json()
    } catch {
      /* not up yet */
    }
    await sleep(150)
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

export async function startChrome({ port, prefix, flags = [] }) {
  if (!prefix.startsWith('starry-')) throw new Error(`startChrome: prefix ${prefix} must start with starry-, or the leak count misses it`)
  const executable = chromePath()
  const userDataDir = mkdtempSync(join(tmpdir(), prefix))
  const extraFlags = (process.env.CHROME_FLAGS ?? '').split(/\s+/).filter(Boolean)
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      ...extraFlags,
      ...flags,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  )

  let closed = false
  async function close() {
    if (closed) return
    closed = true
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once('exit', () => resolve(true)))
      child.kill()
      if (!(await Promise.race([exited, sleep(5000).then(() => false)]))) {
        child.kill('SIGKILL')
      }
    }
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  }

  let version
  try {
    version = await waitForChrome(port, 20000)
  } catch (err) {
    await close()
    throw err
  }

  return { child, userDataDir, version, close }
}

async function urlOk(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const html = await response.text()
    return html.includes('The Starry Night')
  } catch {
    return false
  }
}

export async function startViteIfNeeded(appUrl, port) {
  if (await urlOk(appUrl)) return null
  const child = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    log += chunk.toString()
  })
  const start = Date.now()
  while (Date.now() - start < 25000) {
    if (await urlOk(appUrl)) return child
    await sleep(250)
  }
  child.kill()
  throw new Error(`Vite did not become ready at ${appUrl}\n${log}`)
}

// Counts only the browsers startChrome made: each profile folder starts with "starry-". Another session's headless
// Chrome on this machine is not counted. Playwright's, from the Story_Bridge session, failed three runs (2026-11-15).
export function countHeadlessChromes() {
  try {
    return execFileSync('pgrep', ['-f', 'user-data-dir=[^ ]*/starry-'], { encoding: 'utf8' }).trim().split('\n').length
  } catch {
    return 0 // pgrep exits 1 when nothing matches
  }
}

export class CdpPage {
  constructor(wsUrl = '', { port = null, targetId = null } = {}) {
    this.wsUrl = wsUrl
    this.port = port
    this.targetId = targetId
    this.seq = 0
    this.pending = new Map()
    this.errors = []
    this.listeners = new Map()
    this.closed = false
  }

  on(method, fn) {
    let list = this.listeners.get(method)
    if (!list) {
      list = []
      this.listeners.set(method, list)
    }
    list.push(fn)
    return this
  }

  onMessage(event) {
    const message = JSON.parse(event.data)
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
      return
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params?.exceptionDetails
      this.errors.push(details?.exception?.description || details?.text || 'runtime exception')
    }
    if (message.method) {
      const list = this.listeners.get(message.method)
      if (list) {
        for (const fn of list) fn(message.params)
      }
    }
  }

  async connect(domains = ['Page', 'Runtime']) {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.addEventListener('message', (event) => this.onMessage(event))
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    for (const domain of domains) {
      await this.send(`${domain}.enable`)
    }
  }

  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  async evaluate(expression, { awaitPromise = true } = {}) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`)
    }
    return res.result?.value
  }

  async waitFor(expression, timeoutMs = 30000, what = expression, intervalMs = 100) {
    const start = Date.now()
    for (;;) {
      await sleep(intervalMs)
      if (await this.evaluate(`Boolean(${expression})`)) return
      if (Date.now() - start > timeoutMs) {
        throw new Error(`timed out after ${timeoutMs} ms waiting for ${what}`)
      }
    }
  }

  async close() {
    if (this.closed) return
    this.closed = true
    this.ws?.close()
    if (this.port !== null && this.targetId !== null) {
      await fetch(`http://127.0.0.1:${this.port}/json/close/${this.targetId}`).catch(() => {})
    }
  }
}

export async function openPage(port, { domains = ['Page', 'Runtime'] } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
  const target = await response.json()
  const page = new CdpPage(target.webSocketDebuggerUrl, { port, targetId: target.id })
  await page.connect(domains)
  return page
}
