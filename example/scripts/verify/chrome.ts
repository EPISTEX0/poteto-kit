import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

export type BrowserChoice = { path: string; source: string }

function cachedPlaywrightChromium(): BrowserChoice[] {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? '',
    join(homedir(), '.cache', 'ms-playwright'),
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter((root) => root !== '' && existsSync(root))

  const candidates: { revision: number; path: string }[] = []
  for (const root of roots) {
    for (const name of readdirSync(root)) {
      const match = /^chromium-(\d+)$/.exec(name)
      if (!match?.[1]) {
        continue
      }
      for (const relative of [
        ['chrome-linux64', 'chrome'],
        ['chrome-linux', 'chrome'],
        ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
      ]) {
        candidates.push({ revision: Number(match[1]), path: join(root, name, ...relative) })
      }
    }
  }
  return candidates
    .sort((a, b) => b.revision - a.revision)
    .map((candidate) => ({ path: candidate.path, source: 'Playwright browser cache' }))
}

function bundledPath(): BrowserChoice[] {
  try {
    return [{ path: chromium.executablePath(), source: 'playwright-core default path' }]
  } catch {
    return []
  }
}

const systemCandidates: BrowserChoice[] = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].map((path) => ({ path, source: 'system install' }))

export function findChrome(): BrowserChoice | null {
  const override = process.env.CHROME_PATH
  if (override) {
    return existsSync(override) ? { path: override, source: 'CHROME_PATH' } : null
  }
  return (
    [...cachedPlaywrightChromium(), ...bundledPath(), ...systemCandidates].find((candidate) =>
      existsSync(candidate.path),
    ) ?? null
  )
}

export function resolveChrome() {
  const found = findChrome()
  if (!found) {
    throw new Error(
      process.env.CHROME_PATH
        ? `CHROME_PATH is set but does not exist: ${process.env.CHROME_PATH}`
        : 'No Chromium found. Set CHROME_PATH, install chromium with your package manager, or run `npx playwright-core install chromium`.',
    )
  }
  return found.path
}
