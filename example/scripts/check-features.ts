import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const featuresDir = join(root, 'src', 'features')
const docsDir = join(root, '.agents', 'skills', 'verify-app', 'references', 'features')
const docsPath = '.agents/skills/verify-app/references/features'
const crossCuttingDoc = 'cross-cutting-flows.md'

const readmeSections = [
  'Purpose',
  'Mapping a vague report to a feature',
  'Baseline preconditions',
  'Driving conventions',
  'Proof and skip reporting',
  'Full sweep',
  'Index',
]
const featureDocSections = ['Sub-features', 'How to get to it', 'Driving it']
const indexLinePattern = /^- \[`([^`]+)`\]\(([^)]+)\) — \S/

const comparedAttributes = 'aria-label|data-component|data-action-id|role'
const selectorInDoc = new RegExp(`\\[(${comparedAttributes})=(["'])([^"']+)\\2\\]`, 'g')
const attributeInMarkup = new RegExp(`(?<![\\w-])(${comparedAttributes})\\s*[=:]\\s*\\{?\\s*["'\`]([^"'\`]+)["'\`]`, 'g')

const errors: string[] = []

function headings(text: string) {
  return text
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim())
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return []
  }
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) {
      return sourceFiles(path)
    }
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

function markupSelectors(directory: string) {
  const found = new Set<string>()
  for (const file of sourceFiles(directory)) {
    for (const match of readFileSync(file, 'utf8').matchAll(attributeInMarkup)) {
      found.add(`${match[1]}=${match[2]}`)
    }
  }
  return found
}

function listDirs(directory: string) {
  if (!existsSync(directory)) {
    return []
  }
  return readdirSync(directory).filter((name) => statSync(join(directory, name)).isDirectory())
}

const featureIds = listDirs(featuresDir)
const docFiles = existsSync(docsDir) ? readdirSync(docsDir).filter((name) => name.endsWith('.md')) : []
const docIds = docFiles
  .filter((name) => name !== 'README.md' && name !== crossCuttingDoc && !name.startsWith('_'))
  .map((name) => name.slice(0, -'.md'.length))

const readmePath = join(docsDir, 'README.md')
const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : ''
if (!readme) {
  errors.push(`feature-readme-missing: ${docsPath}/README.md must exist and index every feature`)
}
for (const section of readmeSections) {
  if (readme && !headings(readme).includes(section)) {
    errors.push(`feature-readme-missing-section: ${docsPath}/README.md has no "## ${section}" section`)
  }
}

const indexEntries = readme
  .split('\n')
  .map((line) => indexLinePattern.exec(line))
  .filter((match): match is RegExpExecArray => match !== null)
  .map((match) => ({ id: match[1] ?? '', file: match[2] ?? '' }))
const indexedIds = indexEntries.map((entry) => entry.id)

for (const id of featureIds) {
  const hasIndex =
    existsSync(join(featuresDir, id, 'index.ts')) || existsSync(join(featuresDir, id, 'index.tsx'))
  if (!hasIndex) {
    errors.push(`feature-missing-index: src/features/${id}/ needs an index.ts or index.tsx public entry`)
  }
  if (!existsSync(join(featuresDir, id, 'feature.tsx'))) {
    errors.push(
      `feature-missing-feature-file: src/features/${id}/ needs a feature.tsx that default-exports defineFeature({ id: '${id}', ... }); that file is how the app discovers the feature`,
    )
  }
  if (!docIds.includes(id)) {
    errors.push(
      `feature-missing-doc: src/features/${id}/ has no ${docsPath}/${id}.md; add it with Sub-features, How to get to it and Driving it sections`,
    )
  }
  if (!indexedIds.includes(id)) {
    errors.push(
      `feature-missing-from-index: ${id} is not listed in the "Index" of ${docsPath}/README.md; add exactly one line - [\`${id}\`](${id}.md) — what it covers (the scope after the dash is required)`,
    )
  }
}

for (const id of docIds) {
  if (!featureIds.includes(id)) {
    errors.push(
      `feature-doc-orphan: ${docsPath}/${id}.md documents "${id}" but src/features/${id}/ does not exist; delete the doc or restore the feature`,
    )
  }
}

for (const entry of indexEntries) {
  if (!featureIds.includes(entry.id)) {
    errors.push(
      `feature-index-stale-entry: README index lists "${entry.id}" but src/features/${entry.id}/ does not exist; remove the line`,
    )
  }
  if (entry.file !== `${entry.id}.md`) {
    errors.push(
      `feature-index-bad-link: README index line for "${entry.id}" links to ${entry.file}; the target must be exactly ${entry.id}.md`,
    )
  } else if (!existsSync(join(docsDir, entry.file))) {
    errors.push(`feature-index-broken-link: README index points at ${entry.file}, which does not exist in ${docsPath}/`)
  }
}

for (const id of docIds) {
  const text = readFileSync(join(docsDir, `${id}.md`), 'utf8')
  const present = headings(text)
  if (!(text.split('\n')[0] ?? '').includes(`(\`${id}\`)`)) {
    errors.push(`feature-doc-bad-title: the first line of ${docsPath}/${id}.md must be "# <Display name> (\`${id}\`)"`)
  }
  for (const section of featureDocSections) {
    if (!present.includes(section)) {
      errors.push(`feature-doc-missing-section: ${docsPath}/${id}.md has no "## ${section}" section`)
    }
  }
  if (!/`\[[a-z-]+=[^`]*\]`/.test(text.split('## ')[0] ?? '')) {
    errors.push(
      `feature-doc-missing-root-selector: the intro of ${docsPath}/${id}.md must name the feature's root selector in backticks, e.g. \`[data-component="..."]\``,
    )
  }
}

function checkSelectors(file: string, sourceDir: string, sourcePath: string) {
  const markup = markupSelectors(sourceDir)
  const text = readFileSync(join(docsDir, file), 'utf8')
  const named = new Map([...text.matchAll(selectorInDoc)].map((match) => [`${match[1]}=${match[3]}`, match] as const))
  for (const [selector, match] of named) {
    if (!markup.has(selector)) {
      errors.push(
        `feature-selector-drift: ${docsPath}/${file} names [${match[1]}="${match[3]}"] but nothing in ${sourcePath} sets ${match[1]}="${match[3]}"; make the doc match the markup (or restore the markup)`,
      )
    }
  }
}

for (const id of docIds.filter((candidate) => featureIds.includes(candidate))) {
  checkSelectors(`${id}.md`, join(featuresDir, id), `src/features/${id}/`)
}
if (existsSync(join(docsDir, crossCuttingDoc))) {
  checkSelectors(crossCuttingDoc, join(root, 'src'), 'src/')
}

const crossCuttingPath = join(docsDir, crossCuttingDoc)
if (!existsSync(crossCuttingPath)) {
  errors.push(`feature-cross-cutting-missing: ${docsPath}/${crossCuttingDoc} must exist`)
} else if (!headings(readFileSync(crossCuttingPath, 'utf8')).includes('Flows')) {
  errors.push(`feature-doc-missing-section: ${docsPath}/${crossCuttingDoc} has no "## Flows" section`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`check:features ok (${featureIds.length} features: ${featureIds.join(', ')})`)
