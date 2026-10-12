import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadScenarios } from './verify/load-scenarios'

const docsDir = join(process.cwd(), '.agents', 'skills', 'verify-app', 'references', 'features')
const docsPath = '.agents/skills/verify-app/references/features'
const listedSections = new Set(['Sub-features', 'Flows'])
const bulletPattern = /^- `([a-z][a-z0-9-]*)` — (.*)$/
const skipPattern = /\bskip: (\S.*)$/

type EntryPoint = { id: string; file: string; skip: string | null }

function parseEntryPoints(file: string): EntryPoint[] {
  const entries: EntryPoint[] = []
  let listed = false
  for (const line of readFileSync(join(docsDir, file), 'utf8').split('\n')) {
    if (line.startsWith('## ')) {
      listed = listedSections.has(line.slice(3).trim())
      continue
    }
    const match = listed ? bulletPattern.exec(line) : null
    if (match?.[1]) {
      entries.push({ id: match[1], file, skip: skipPattern.exec(match[2] ?? '')?.[1] ?? null })
    }
  }
  return entries
}

const errors: string[] = []
const files = existsSync(docsDir)
  ? readdirSync(docsDir).filter((name) => name.endsWith('.md') && name !== 'README.md' && !name.startsWith('_'))
  : []
const entryPoints = files.flatMap(parseEntryPoints)
const scenarios = await loadScenarios()

const covering = new Map<string, string[]>()
for (const scenario of scenarios) {
  for (const id of scenario.covers) {
    covering.set(id, [...(covering.get(id) ?? []), `${scenario.feature}/${scenario.name}`])
  }
}

const seen = new Set<string>()
for (const entry of entryPoints) {
  if (seen.has(entry.id)) {
    errors.push(`verify-coverage-duplicate-id: "${entry.id}" is listed more than once under ${docsPath}`)
  }
  seen.add(entry.id)
  const covered = covering.has(entry.id)
  if (!covered && entry.skip === null) {
    errors.push(
      `verify-coverage-uncovered: ${entry.id} (${docsPath}/${entry.file}) has no scenario with covers: ['${entry.id}'] and no "skip: <reason>"; add a scenario in scripts/verify/scenarios/ or end its line with skip: <reason>`,
    )
  }
  if (covered && entry.skip !== null) {
    errors.push(
      `verify-coverage-stale-skip: ${entry.id} is covered by ${covering.get(entry.id)?.join(', ')} but ${docsPath}/${entry.file} still says skip; remove the skip`,
    )
  }
}

for (const [id, names] of covering) {
  if (!seen.has(id)) {
    errors.push(
      `verify-coverage-unknown-id: ${names.join(', ')} covers "${id}", which no feature file lists under Sub-features or Flows`,
    )
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const skipped = entryPoints.filter((entry) => entry.skip !== null)
console.log(
  `verify:coverage ok (${entryPoints.length} entry points: ${entryPoints.length - skipped.length} covered by ${scenarios.length} scenarios, ${skipped.length} skipped)`,
)
for (const entry of skipped) {
  console.log(`  skipped ${entry.id}: ${entry.skip}`)
}
