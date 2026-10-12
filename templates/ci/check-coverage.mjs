#!/usr/bin/env node
// HOW TO USE:
// 1. Copy to scripts/check-coverage.mjs and add it to your gate command, for example
//    "check:coverage": "node scripts/check-coverage.mjs". Needs Node 18 or newer; no dependencies.
// 2. Usage:
//      node check-coverage.mjs [--features DIR] [--manifest FILE]... [--scenarios DIR]...
//    --features   the feature map directory (default .agents/skills/verify-app/references/features)
//    --manifest   a JSON manifest of scenarios (default verify-coverage.json; repeatable)
//    --scenarios  a directory scanned recursively for files named *.scenario.* that declare
//                 covers: [...] or "covers": [...] (repeatable; optional)
// 3. The portable default is the JSON manifest verify-coverage.json:
//      { "scenarios": [ { "name": "sidebar/new-note", "covers": ["sidebar-new-note"] } ] }
//    A bare array of the same objects also works. Keep one entry per scenario you actually run.
// 4. What it reads: in every <feature-id>.md, the bullets under "## Sub-features"; in
//    cross-cutting-flows.md, the bullets under "## Flows". Each bullet is exactly
//      - `<id>` — <one line>             (optionally ending with: skip: <reason>)
//    README.md and files starting with "_" are not read.
// 5. It exits 1 and names the fix for: an id no scenario covers (uncovered), a scenario that covers
//    an id no file lists (unknown), an id listed twice (duplicate), an id that is covered but still
//    marked skip (stale-skip), a manifest it cannot read, and a feature map with no ids at all
//    (a wrong directory must not pass). Skips are printed on success so they show up in CI logs.
// 6. Delete this comment block in the installed copy if you like; the script does not read it.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_FEATURES = '.agents/skills/verify-app/references/features'
const DEFAULT_MANIFEST = 'verify-coverage.json'
const LISTED_SECTIONS = { 'Sub-features': (file) => file !== 'cross-cutting-flows.md', Flows: (file) => file === 'cross-cutting-flows.md' }
const BULLET = /^- `([a-z][a-z0-9-]*)` — (.*)$/
const SKIP = /\bskip: (\S.*)$/

function parseArgs(argv) {
  const opts = { features: DEFAULT_FEATURES, manifests: [], scenarioDirs: [] }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (!['--features', '--manifest', '--scenarios'].includes(flag) || value === undefined) {
      console.error(`check-coverage: unknown or incomplete argument "${flag}". Usage: node check-coverage.mjs [--features DIR] [--manifest FILE]... [--scenarios DIR]...`)
      process.exit(2)
    }
    i++
    if (flag === '--features') opts.features = value
    else if (flag === '--manifest') opts.manifests.push(value)
    else opts.scenarioDirs.push(value)
  }
  if (opts.manifests.length === 0 && opts.scenarioDirs.length === 0) opts.manifests.push(DEFAULT_MANIFEST)
  return opts
}

function parseEntryPoints(dir, file) {
  const entries = []
  let listed = false
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    if (line.startsWith('## ')) {
      const accepts = LISTED_SECTIONS[line.slice(3).trim()]
      listed = accepts !== undefined && accepts(file)
      continue
    }
    const match = listed ? BULLET.exec(line) : null
    if (match) entries.push({ id: match[1], file, skip: SKIP.exec(match[2])?.[1] ?? null })
  }
  return entries
}

function readManifest(path, errors) {
  if (!existsSync(path)) {
    errors.push(`check-coverage-manifest: ${path} does not exist; create it (see HOW TO USE) or pass --manifest <file> / --scenarios <dir>`)
    return []
  }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    const list = Array.isArray(data) ? data : data.scenarios
    if (!Array.isArray(list)) throw new Error('expected {"scenarios": [...]} or a bare array')
    return list.map((entry, index) => {
      if (!entry || !Array.isArray(entry.covers) || entry.covers.some((id) => typeof id !== 'string')) {
        throw new Error(`entry ${index} needs "covers": ["<id>", ...]`)
      }
      return { name: entry.name ?? `${path}#${index}`, covers: entry.covers }
    })
  } catch (error) {
    errors.push(`check-coverage-manifest: cannot read ${path}: ${error.message}`)
    return []
  }
}

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, found)
    else if (/\.scenario\./.test(name)) found.push(full)
  }
  return found
}

function readScenarioFiles(dir, errors) {
  if (!existsSync(dir)) {
    errors.push(`check-coverage-manifest: scenarios directory ${dir} does not exist`)
    return []
  }
  return walk(dir).flatMap((file) => {
    const covers = []
    for (const match of readFileSync(file, 'utf8').matchAll(/\bcovers["']?\s*:\s*\[([^\]]*)\]/g)) {
      for (const id of match[1].matchAll(/["'`]([^"'`]+)["'`]/g)) covers.push(id[1])
    }
    return [{ name: file, covers }]
  })
}

const opts = parseArgs(process.argv.slice(2))
const errors = []

if (!existsSync(opts.features)) {
  console.error(`check-coverage-features: ${opts.features} does not exist; pass --features <dir>`)
  process.exit(1)
}
const files = readdirSync(opts.features).filter((name) => name.endsWith('.md') && name !== 'README.md' && !name.startsWith('_'))
const entryPoints = files.flatMap((file) => parseEntryPoints(opts.features, file))
const scenarios = [
  ...opts.manifests.flatMap((path) => readManifest(path, errors)),
  ...opts.scenarioDirs.flatMap((dir) => readScenarioFiles(dir, errors)),
]

if (entryPoints.length === 0) {
  errors.push(`check-coverage-empty: no "- \`<id>\` — ..." bullets found under "## Sub-features" or "## Flows" in ${opts.features}; wrong directory, or the files do not follow the format`)
}

const covering = new Map()
for (const scenario of scenarios) {
  for (const id of scenario.covers) covering.set(id, [...(covering.get(id) ?? []), scenario.name])
}

const seen = new Map()
for (const entry of entryPoints) {
  const first = seen.get(entry.id)
  if (first) {
    errors.push(`check-coverage-duplicate: "${entry.id}" is listed in ${first.file} and in ${entry.file}; ids are unique across the map, rename one`)
    continue
  }
  seen.set(entry.id, entry)
  const covered = covering.has(entry.id)
  if (!covered && entry.skip === null) {
    errors.push(`check-coverage-uncovered: ${entry.id} (${entry.file}) has no scenario with covers: ["${entry.id}"] and no "skip: <reason>"; add a scenario to the manifest, or end its line with skip: <reason>`)
  }
  if (covered && entry.skip !== null) {
    errors.push(`check-coverage-stale-skip: ${entry.id} is covered by ${covering.get(entry.id).join(', ')} but ${entry.file} still says skip: ${entry.skip}; remove the skip`)
  }
}
for (const [id, names] of covering) {
  if (!seen.has(id)) {
    errors.push(`check-coverage-unknown: ${names.join(', ')} covers "${id}", which no feature file lists under Sub-features or Flows; fix the id or add the bullet`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const skipped = [...seen.values()].filter((entry) => entry.skip !== null)
console.log(`check-coverage: ok (${seen.size} ids: ${seen.size - skipped.length} covered by ${scenarios.length} scenarios, ${skipped.length} skipped)`)
for (const entry of skipped) console.log(`  skipped ${entry.id}: ${entry.skip}`)
