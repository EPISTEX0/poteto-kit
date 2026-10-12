import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findChrome } from './chrome'
import { buildInfoPath, readBuildInfo } from './server'
import { derivePort, describeHolder, findHolder, isPortFree, projectRoot } from './port'

function newestMtime(path: string): number {
  const stats = statSync(path)
  if (!stats.isDirectory()) {
    return stats.mtimeMs
  }
  return readdirSync(path).reduce((newest, name) => Math.max(newest, newestMtime(join(path, name))), 0)
}

function gitKind(start: string) {
  let directory = start
  for (;;) {
    const marker = join(directory, '.git')
    if (existsSync(marker)) {
      return statSync(marker).isDirectory()
        ? 'main git checkout (.git is a directory)'
        : 'linked git worktree (.git is a file)'
    }
    const parent = join(directory, '..')
    if (parent === directory || directory === '/') {
      return 'not a git checkout'
    }
    directory = parent
  }
}

export function requiredNode(root: string): { range: string; problem: string | null } {
  try {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { engines?: { node?: string } }
    return { range: manifest.engines?.node ?? '*', problem: null }
  } catch (error) {
    return { range: '*', problem: `package.json cannot be read, so the node range is unknown: ${String(error)}` }
  }
}

function checkNode(range: string) {
  try {
    return { ok: nodeSatisfies(process.versions.node, range), problem: null }
  } catch (error) {
    return { ok: false, problem: error instanceof Error ? error.message : String(error) }
  }
}

type Version = [number, number, number]

function parseVersion(text: string): Version {
  const [major = 0, minor = 0, patch = 0] = text.split('.').map(Number)
  return [major, minor, patch]
}

function compareVersions(a: Version, b: Version) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

function satisfiesComparator(version: Version, comparator: string) {
  const caret = /^\^(\d+(?:\.\d+){0,2})$/.exec(comparator)
  if (caret?.[1]) {
    const floor = parseVersion(caret[1])
    if (floor[0] === 0) {
      throw new Error(`engines.node comparator "${comparator}" is not supported by verify doctor`)
    }
    return compareVersions(version, floor) >= 0 && version[0] === floor[0]
  }
  const atLeast = /^>=(\d+(?:\.\d+){0,2})$/.exec(comparator)
  if (atLeast?.[1]) {
    return compareVersions(version, parseVersion(atLeast[1])) >= 0
  }
  if (comparator === '*') {
    return true
  }
  throw new Error(`engines.node comparator "${comparator}" is not supported by verify doctor`)
}

export function nodeSatisfies(nodeVersion: string, range: string) {
  const version = parseVersion(nodeVersion)
  return range
    .split('||')
    .some((alternative) =>
      alternative
        .trim()
        .split(/\s+/)
        .every((comparator) => satisfiesComparator(version, comparator)),
    )
}

function stamp(ms: number) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
}

export async function runDoctor(explicitPort: number | undefined) {
  const root = projectRoot()
  const blocking: string[] = []
  const warnings: string[] = []
  const lines: string[] = ['verify doctor (read-only)']
  const row = (label: string, value: string) => lines.push(`  ${label.padEnd(8)} ${value}`)

  row('project', root)

  const { range, problem: manifestProblem } = requiredNode(root)
  const { ok: nodeOk, problem: rangeProblem } = checkNode(range)
  row('node', `v${process.versions.node} (needs ${range}) ${nodeOk ? 'ok' : 'NOT SUPPORTED'}`)
  const nodeProblem = manifestProblem ?? rangeProblem
  if (nodeProblem) {
    blocking.push(nodeProblem)
  } else if (!nodeOk) {
    blocking.push(`node v${process.versions.node} is outside package.json engines (${range})`)
  }

  row('git', gitKind(root))

  const browser = findChrome()
  if (browser) {
    row('browser', `${browser.path} (${browser.source})`)
  } else {
    row('browser', 'NOT FOUND')
    blocking.push('no Chromium found: set CHROME_PATH or run npx playwright-core install chromium')
  }

  const distIndex = join(root, 'dist', 'index.html')
  const inputs = ['src', 'index.html', 'vite.config.ts', 'package.json'].filter((path) => existsSync(join(root, path)))
  const newestSource = Math.max(...inputs.map((path) => newestMtime(join(root, path))))
  if (!existsSync(distIndex)) {
    row('dist', 'missing (verify will build it)')
  } else {
    const built = statSync(distIndex).mtimeMs
    const fresh = built >= newestSource
    row('dist', `${fresh ? 'fresh' : 'STALE'} (built ${stamp(built)}, newest source change ${stamp(newestSource)})`)
    if (!fresh) {
      warnings.push('dist/ is older than src/; verify rebuilds it, but a plain vite preview would serve old code')
    }
    if (existsSync(join(root, buildInfoPath))) {
      const info = readBuildInfo(join(root, buildInfoPath))
      if (!info) {
        warnings.push(
          `${buildInfoPath} is not valid JSON with a nonce and an injectBug flag, so dist/ cannot be matched to a build; run verify without --no-build to rebuild it`,
        )
      } else if (info.injectBug) {
        warnings.push('dist/ was built with INJECT_BUG=1 and contains the injected bug')
      }
    }
  }

  const derived = derivePort(root)
  const port = explicitPort ?? derived
  const source = explicitPort === undefined ? 'derived from the project path' : 'explicit --port'
  if (await isPortFree(port)) {
    row('port', `${port} (${source}): free`)
  } else {
    const holder = findHolder(port, root)
    row('port', `${port} (${source}): held by ${describeHolder(holder)}${holder?.ours ? ' [this project]' : ''}`)
    if (explicitPort === undefined) {
      blocking.push(`derived port ${port} is busy; verify will refuse to start (use --port to choose another)`)
    } else {
      blocking.push(`port ${port} is busy`)
    }
  }

  lines.push('')
  for (const warning of warnings) {
    lines.push(`warning: ${warning}`)
  }
  for (const problem of blocking) {
    lines.push(`problem: ${problem}`)
  }
  lines.push(blocking.length === 0 ? 'verdict: healthy, worth driving' : 'verdict: not ready')
  console.log(lines.join('\n'))
  return blocking.length === 0 ? 0 : 1
}
