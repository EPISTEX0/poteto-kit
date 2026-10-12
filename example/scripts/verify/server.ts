import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const viteBin = 'node_modules/vite/bin/vite.js'

export const buildInfoPath = 'dist/.verify-build.json'

export type BuildInfo = { builtAt: string; injectBug: boolean; nonce: string }

export function readBuildInfo(path = buildInfoPath): BuildInfo | null {
  try {
    const info = JSON.parse(readFileSync(path, 'utf8')) as Partial<BuildInfo>
    if (typeof info.nonce !== 'string' || typeof info.injectBug !== 'boolean') {
      return null
    }
    return { builtAt: String(info.builtAt ?? ''), injectBug: info.injectBug, nonce: info.nonce }
  } catch {
    return null
  }
}

export function buildApp() {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [viteBin, 'build', '--logLevel', 'warn'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`vite build exited with code ${code}`))
        return
      }
      mkdirSync('dist', { recursive: true })
      const info: BuildInfo = {
        builtAt: new Date().toISOString(),
        injectBug: process.env.INJECT_BUG === '1',
        nonce: randomUUID(),
      }
      writeFileSync(buildInfoPath, `${JSON.stringify(info)}\n`)
      resolve()
    })
  })
}

async function readServedBuild(url: string): Promise<Partial<BuildInfo> | null> {
  try {
    const response = await fetch(new URL('.verify-build.json', url))
    if (!response.ok) {
      return null
    }
    return (await response.json()) as Partial<BuildInfo>
  } catch {
    return null
  }
}

export async function waitUntilReady(url: string, child: ChildProcess, expected: BuildInfo, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let foreign = false
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      const code = child.exitCode ?? child.signalCode
      const hint = foreign ? '; something else answers on that port and is not this build' : ''
      throw new Error(`vite preview exited before it was ready (${code})${hint}`)
    }
    const served = await readServedBuild(url)
    if (served?.nonce === expected.nonce) {
      if (child.exitCode !== null || child.signalCode !== null) {
        continue
      }
      return
    }
    foreign = foreign || served !== null
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(
    `${url}.verify-build.json never matched this build's nonce; the server on that port is not the preview this run started`,
  )
}

export type PreviewServer = { url: string; build: BuildInfo; stop: () => Promise<void> }

export async function startPreview(port: number): Promise<PreviewServer> {
  const build = readBuildInfo()
  if (!build) {
    throw new Error(`${buildInfoPath} is missing or has no nonce; run verify without --no-build so it builds first`)
  }
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'ignore', 'inherit'], env: process.env },
  )
  const url = `http://127.0.0.1:${port}/`
  const stop = () =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve()
        return
      }
      child.once('exit', () => resolve())
      child.kill('SIGTERM')
    })
  try {
    await waitUntilReady(url, child, build)
  } catch (error) {
    await stop()
    throw error
  }
  return { url, build, stop }
}
