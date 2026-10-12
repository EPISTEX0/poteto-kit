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

function readText(path: string) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function findHolder(port: number, root: string): Holder | null {
  const listing = spawnSync('ss', ['-ltnpH', `sport = :${port}`], { encoding: 'utf8' })
  const pid = Number(/pid=(\d+)/.exec(listing.stdout ?? '')?.[1])
  if (!pid) {
    return null
  }
  const command = readText(`/proc/${pid}/cmdline`)?.split('\0').join(' ').trim() ?? 'unknown command'
  let cwd: string | null
  try {
    cwd = readlinkSync(`/proc/${pid}/cwd`)
  } catch {
    cwd = null
  }
  return { pid, command, cwd, ours: cwd === root }
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
