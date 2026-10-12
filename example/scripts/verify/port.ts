import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readlinkSync, realpathSync } from 'node:fs'
import { createServer } from 'node:net'

const portBase = 20000
const portSpan = 12000

export class PortRefusal extends Error {}

export function projectRoot() {
  return realpathSync(process.cwd())
}

export function derivePort(root: string) {
  const digest = createHash('sha256').update(root).digest()
  return portBase + (digest.readUInt32BE(0) % portSpan)
}

export function isPortFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)))
  })
}

export type Holder = { pid: number; command: string; cwd: string | null; ours: boolean }

export type HolderTool = 'ss' | 'lsof'

function readText(path: string) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function run(command: string, args: string[]) {
  return spawnSync(command, args, { encoding: 'utf8' }).stdout ?? ''
}

export function parseSsPid(output: string) {
  return Number(/pid=(\d+)/.exec(output)?.[1]) || null
}

export function parseLsofPid(output: string) {
  return Number(/^p(\d+)$/m.exec(output)?.[1]) || null
}

function holderPid(port: number, tools: readonly HolderTool[]) {
  for (const tool of tools) {
    const pid =
      tool === 'ss'
        ? parseSsPid(run('ss', ['-ltnpH', `sport = :${port}`]))
        : parseLsofPid(run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp']))
    if (pid) {
      return pid
    }
  }
  return null
}

function processCommand(pid: number) {
  const fromProc = readText(`/proc/${pid}/cmdline`)?.split('\0').join(' ').trim()
  return fromProc || run('ps', ['-o', 'command=', '-p', String(pid)]).trim() || 'unknown command'
}

function processCwd(pid: number) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`)
  } catch {
    return /^n(.+)$/m.exec(run('lsof', ['-nP', '-a', '-p', String(pid), '-d', 'cwd', '-Fn']))?.[1] ?? null
  }
}

export function findHolder(port: number, root: string, tools: readonly HolderTool[] = ['ss', 'lsof']): Holder | null {
  const pid = holderPid(port, tools)
  if (!pid) {
    return null
  }
  const cwd = processCwd(pid)
  return { pid, command: processCommand(pid), cwd, ours: cwd === root }
}

export function describeHolder(holder: Holder | null) {
  if (!holder) {
    return 'an unknown process (could not read its pid)'
  }
  const where = holder.cwd ? `, started from ${holder.cwd}` : ''
  return `pid ${holder.pid} (${holder.command.slice(0, 120)}${where})`
}

export type PortChoice = { port: number; source: 'explicit' | 'derived from the project path' }

export async function choosePort(explicit: number | undefined): Promise<PortChoice> {
  const root = projectRoot()
  if (explicit !== undefined) {
    if (await isPortFree(explicit)) {
      return { port: explicit, source: 'explicit' }
    }
    throw new PortRefusal(
      `verify refused to start: explicit --port ${explicit} is held by ${describeHolder(findHolder(explicit, root))}.\nIt will not drive a server it did not start. Free that port, or choose another: npm run verify -- --feature <id> --port <free port>`,
    )
  }
  const port = derivePort(root)
  if (await isPortFree(port)) {
    return { port, source: 'derived from the project path' }
  }
  const holder = findHolder(port, root)
  const owner = holder?.ours
    ? `a process started from this project: ${describeHolder(holder)}. A verify or preview run may still be going; wait for it, or stop it with: kill ${holder.pid}`
    : `${describeHolder(holder)}. Another project copy or worktree may be using it`
  throw new PortRefusal(
    `verify refused to start: preview port ${port} (derived from ${root}) is held by ${owner}.\nIt will not pick another port silently. Free that port, or choose one explicitly: npm run verify -- --feature <id> --port <free port>`,
  )
}
