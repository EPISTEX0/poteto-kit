import assert from 'node:assert/strict'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createSocketServer, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { after, describe, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { appConfig } from '../src/app-config'
import { createNote, hydrateNotes, selectNote, updateNote, useNotesState } from '../src/client'
import { Shell } from '../src/framework/shell'
import { createStore } from '../src/shared/create-store'
import { handle } from '../src/shared/ipc'
import type { Note } from '../src/shared/types'
import { buildCoverageRecord } from './verify/coverage-record'
import { nodeSatisfies, requiredNode } from './verify/doctor'
import { loadScenarios } from './verify/load-scenarios'
import { derivePort, findHolder, parseLsofPid, parseSsPid } from './verify/port'
import { passed, renderReport, type RunResult } from './verify/report'
import { checkProblem, coverageProblem } from './verify/scenario'
import { waitUntilReady, type BuildInfo } from './verify/server'
import { summarizeTrace } from './verify/trace'

type Gate = 'lint' | 'typecheck' | 'check:deps' | 'check:features' | 'verify:coverage'

type Finding = { ruleId: string; text: string }

type Expectation = { gate: Gate; ruleId: string; text: string; times?: number }

type Edit = { file: string; from: string; to: string }

type Case = {
  fixture?: string
  mutation?: string
  edits?: Edit[]
  remove?: string[]
  scope?: string[]
  expects: Expectation[]
}

const fixtureMarkers = [
  'violation',
  'registry',
  'ghost',
  'orphan',
  'removed',
  'vanished',
  'uncovered',
]
const projectRoot = process.cwd()
const sandboxRoot = mkdtempSync(join(tmpdir(), 'poteto-guardrails-'))
const featureDocs = '.agents/skills/verify-app/references/features'

const copied = [
  'src',
  'scripts',
  '.agents',
  'eslint-rules',
  'eslint.config.js',
  '.dependency-cruiser.cjs',
  'tsconfig.json',
  'package.json',
  'vite.config.ts',
  'index.html',
]

const gateArgs: Record<Gate, string[]> = {
  lint: ['--format', 'json'],
  typecheck: ['--pretty', 'false'],
  'check:deps': [],
  'check:features': [],
  'verify:coverage': [],
}

const cases: Case[] = [
  {
    fixture: 'use-effect-import',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-imports', text: 'useEffect and useLayoutEffect are banned' }],
  },
  {
    fixture: 'use-effect-member',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-syntax', text: 'useEffect and useLayoutEffect are banned', times: 2 }],
  },
  {
    fixture: 'use-effect-destructure',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-syntax', text: 'useEffect and useLayoutEffect are banned', times: 2 }],
  },
  {
    fixture: 'use-layout-effect',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'useEffect and useLayoutEffect are banned' },
      { gate: 'lint', ruleId: 'no-restricted-syntax', text: 'useEffect and useLayoutEffect are banned', times: 2 },
    ],
  },
  {
    fixture: 'glob-outside-discover',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-syntax', text: 'import.meta.glob is only allowed' }],
  },
  {
    fixture: 'glob-aliased',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-syntax', text: 'import.meta.glob is only allowed', times: 2 }],
  },
  {
    fixture: 'eslint-disable-escape',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'useEffect and useLayoutEffect are banned' },
      { gate: 'lint', ruleId: 'local/no-comments', text: 'Code comments are banned' },
    ],
  },
  {
    fixture: 'comment',
    expects: [{ gate: 'lint', ruleId: 'local/no-comments', text: 'Code comments are banned' }],
  },
  {
    fixture: 'feature-internal-import',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'Feature internals are private' },
      { gate: 'check:deps', ruleId: 'no-cross-feature-internals', text: "through its index file" },
    ],
  },
  {
    fixture: 'script-imports-feature-internals',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-imports', text: 'Feature internals are private' }],
  },
  {
    fixture: 'feature-parent-import',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-imports', text: 'Feature internals are private' }],
  },
  {
    fixture: 'main-imports-renderer',
    expects: [{ gate: 'check:deps', ruleId: 'main-must-not-import-renderer', text: 'src/shared/ipc.ts' }],
  },
  {
    fixture: 'renderer-imports-main',
    expects: [{ gate: 'check:deps', ruleId: 'renderer-must-not-import-main', text: 'src/shared/ipc.ts' }],
  },
  {
    fixture: 'feature-registry',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'discovered from src/features/*/feature.tsx' },
      { gate: 'check:deps', ruleId: 'no-feature-registry', text: 'discovered from src/features/*/feature.tsx' },
    ],
  },
  {
    fixture: 'feature-registry-relative',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'discovered from src/features/*/feature.tsx' },
      { gate: 'check:deps', ruleId: 'no-feature-registry', text: 'discovered from src/features/*/feature.tsx' },
    ],
  },
  {
    fixture: 'writer-bypass',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'has one writer' },
      { gate: 'check:deps', ruleId: 'one-writer-notes-store', text: 'has one writer' },
    ],
  },
  {
    fixture: 'writer-bypass-relative',
    expects: [{ gate: 'lint', ruleId: 'no-restricted-imports', text: 'has one writer' }],
  },
  {
    fixture: 'rogue-writer',
    edits: [{ file: 'src/client/commands.ts', from: 'const store = createStore', to: 'export const store = createStore' }],
    scope: ['src/client/commands.ts'],
    expects: [
      { gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts' },
      { gate: 'lint', ruleId: 'local/writer-takes-data', text: "'store' is exported" },
    ],
  },
  {
    fixture: 'store-leak-variants',
    scope: ['src/client/commands.ts'],
    expects: [{ gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts', times: 4 }],
  },
  {
    fixture: 'store-unbound',
    scope: ['src/client/commands.ts'],
    expects: [{ gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts', times: 4 }],
  },
  {
    fixture: 'store-renamed-import',
    edits: [
      { file: 'src/client/commands.ts', from: 'import { createStore } from', to: 'import { createStore as make } from' },
      { file: 'src/client/commands.ts', from: 'const store = createStore<', to: 'export const store = make<' },
    ],
    scope: ['src/client/commands.ts'],
    expects: [
      { gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts' },
      { gate: 'lint', ruleId: 'local/writer-takes-data', text: "'store' is exported" },
    ],
  },
  {
    fixture: 'store-namespace-import',
    edits: [
      { file: 'src/client/commands.ts', from: 'import { createStore } from', to: 'import * as kit from' },
      { file: 'src/client/commands.ts', from: 'const store = createStore<', to: 'export const store = kit.createStore<' },
    ],
    scope: ['src/client/commands.ts'],
    expects: [
      { gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts' },
      { gate: 'lint', ruleId: 'local/writer-takes-data', text: "'store' is exported" },
    ],
  },
  {
    fixture: 'store-reexport',
    edits: [
      {
        file: 'src/client/commands.ts',
        from: "import { createStore } from '@/shared/create-store'",
        to: "import { makeStore } from '@/shared/violation-make-store'",
      },
      { file: 'src/client/commands.ts', from: 'const store = createStore<', to: 'export const store = makeStore<' },
    ],
    scope: ['src/client/commands.ts'],
    expects: [
      { gate: 'lint', ruleId: 'local/store-stays-private', text: 'src/client/commands.ts' },
      { gate: 'check:deps', ruleId: 'create-store-is-private', text: 'src/shared/violation-make-store.ts' },
    ],
  },
  {
    fixture: 'create-store-in-feature',
    expects: [{ gate: 'check:deps', ruleId: 'create-store-is-private', text: 'src/features/sidebar/violation.ts' }],
  },
  {
    fixture: 'create-store-dynamic-import',
    expects: [{ gate: 'check:deps', ruleId: 'create-store-is-private', text: 'src/features/sidebar/violation-dynamic-store.ts' }],
  },
  {
    fixture: 'client-second-store',
    expects: [{ gate: 'check:deps', ruleId: 'create-store-is-private', text: 'src/client/violation-second-store.ts' }],
  },
  {
    fixture: 'state-mutation',
    expects: [
      { gate: 'typecheck', ruleId: 'TS2540', text: 'read-only property', times: 3 },
      { gate: 'typecheck', ruleId: 'TS2339', text: "'push'" },
    ],
  },
  ...(
    [
    ['setter-passthrough', 'setNotesState'],
    ['setter-callback-passthrough', 'applyToNotes'],
    ['writer-callable-alias', 'applyAlias'],
    ['writer-callable-call', 'applyWithCall'],
    ['writer-callable-module-var', 'queueUpdate'],
    ['writer-callable-default', 'applyDefault'],
    ['writer-callable-type-alias', 'applyReducer'],
    ['writer-callable-in-object', 'applyOptions'],
    ['writer-callable-generic', 'applyGeneric'],
    ['writer-callable-unknown', 'applyUnknown'],
    ['writer-callable-function-type', 'applyFunction'],
    ['writer-callable-returned', 'makeApplier'],
    ['writer-callable-any', 'applyAny'],
    ['writer-callable-array', 'applyAll'],
    ] as const
  ).map(
    ([fixture, name]): Case => ({
      fixture,
      scope: ['src/client/commands.ts'],
      expects: [{ gate: 'lint', ruleId: 'local/writer-takes-data', text: `'${name}' is exported` }],
    }),
  ),
  {
    fixture: 'framework-imports-feature',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'standalone package' },
      { gate: 'check:deps', ruleId: 'framework-is-a-package', text: 'standalone package' },
    ],
  },
  {
    fixture: 'framework-imports-app',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'standalone package' },
      { gate: 'check:deps', ruleId: 'framework-is-a-package', text: 'standalone package' },
    ],
  },
  {
    fixture: 'framework-relative-import',
    expects: [
      { gate: 'lint', ruleId: 'no-restricted-imports', text: 'standalone package' },
      { gate: 'check:deps', ruleId: 'framework-is-a-package', text: 'standalone package' },
    ],
  },
  {
    fixture: 'shared-imports-up',
    expects: [{ gate: 'check:deps', ruleId: 'shared-is-a-leaf', text: 'must stay a leaf' }],
  },
  {
    fixture: 'circular-import',
    expects: [{ gate: 'check:deps', ruleId: 'no-circular', text: 'Circular imports' }],
  },
  {
    fixture: 'feature-missing-doc',
    expects: [
      { gate: 'check:features', ruleId: 'feature-missing-doc', text: 'src/features/ghost/' },
      { gate: 'check:features', ruleId: 'feature-missing-from-index', text: 'ghost' },
    ],
  },
  {
    fixture: 'feature-without-feature-file',
    expects: [{ gate: 'check:features', ruleId: 'feature-missing-feature-file', text: 'src/features/orphan/' }],
  },
  {
    fixture: 'doc-without-feature',
    expects: [{ gate: 'check:features', ruleId: 'feature-doc-orphan', text: 'removed.md' }],
  },
  {
    fixture: 'index-entry-without-feature',
    expects: [{ gate: 'check:features', ruleId: 'feature-index-stale-entry', text: 'vanished' }],
  },
  {
    mutation: 'feature-readme-missing',
    remove: [`${featureDocs}/README.md`],
    scope: ['feature-readme-missing:', 'feature-missing-from-index'],
    expects: [{ gate: 'check:features', ruleId: 'feature-readme-missing', text: 'README.md must exist' }],
  },
  {
    mutation: 'feature-readme-missing-section',
    edits: [{ file: `${featureDocs}/README.md`, from: '## Full sweep', to: '## Sweep' }],
    scope: ['feature-readme-missing-section'],
    expects: [{ gate: 'check:features', ruleId: 'feature-readme-missing-section', text: 'Full sweep' }],
  },
  {
    mutation: 'feature-missing-index',
    remove: ['src/features/search/index.ts'],
    scope: ['src/features/search/'],
    expects: [{ gate: 'check:features', ruleId: 'feature-missing-index', text: 'src/features/search/' }],
  },
  {
    mutation: 'feature-index-bad-link',
    edits: [{ file: `${featureDocs}/README.md`, from: '(editor.md)', to: '(editor-notes.md)' }],
    scope: ['"editor"'],
    expects: [{ gate: 'check:features', ruleId: 'feature-index-bad-link', text: 'editor-notes.md' }],
  },
  {
    mutation: 'feature-index-broken-link',
    remove: [`${featureDocs}/editor.md`],
    scope: ['editor'],
    expects: [{ gate: 'check:features', ruleId: 'feature-index-broken-link', text: 'editor.md' }],
  },
  {
    mutation: 'index-line-without-scope',
    edits: [
      {
        file: `${featureDocs}/README.md`,
        from: '- [`sidebar`](sidebar.md) — the note list and the New note button.',
        to: '- [`sidebar`](sidebar.md) —',
      },
    ],
    scope: ['sidebar'],
    expects: [{ gate: 'check:features', ruleId: 'feature-missing-from-index', text: 'sidebar' }],
  },
  {
    mutation: 'index-line-with-hyphen',
    edits: [
      {
        file: `${featureDocs}/README.md`,
        from: '- [`search`](search.md) — the',
        to: '- [`search`](search.md) - the',
      },
    ],
    scope: ['search'],
    expects: [{ gate: 'check:features', ruleId: 'feature-missing-from-index', text: 'search' }],
  },
  {
    mutation: 'feature-doc-bad-title',
    edits: [{ file: `${featureDocs}/editor.md`, from: '# Editor (`editor`)', to: '# Editor' }],
    scope: ['editor'],
    expects: [{ gate: 'check:features', ruleId: 'feature-doc-bad-title', text: 'editor.md' }],
  },
  {
    mutation: 'feature-doc-missing-section',
    edits: [{ file: `${featureDocs}/editor.md`, from: '## Driving it', to: '## Driving' }],
    scope: ['editor'],
    expects: [{ gate: 'check:features', ruleId: 'feature-doc-missing-section', text: 'editor.md has no "## Driving it"' }],
  },
  {
    mutation: 'feature-doc-missing-root-selector',
    edits: [
      { file: `${featureDocs}/editor.md`, from: 'Root selector: `[data-component="note-editor"]`.', to: 'Root selector: none.' },
    ],
    scope: ['editor'],
    expects: [{ gate: 'check:features', ruleId: 'feature-doc-missing-root-selector', text: 'editor.md' }],
  },
  {
    mutation: 'feature-cross-cutting-missing',
    remove: [`${featureDocs}/cross-cutting-flows.md`],
    scope: ['feature-cross-cutting-missing'],
    expects: [{ gate: 'check:features', ruleId: 'feature-cross-cutting-missing', text: 'cross-cutting-flows.md' }],
  },
  {
    mutation: 'feature-cross-cutting-without-flows',
    edits: [{ file: `${featureDocs}/cross-cutting-flows.md`, from: '## Flows', to: '## Journeys' }],
    scope: ['cross-cutting-flows.md'],
    expects: [{ gate: 'check:features', ruleId: 'feature-doc-missing-section', text: 'cross-cutting-flows.md has no "## Flows"' }],
  },
  {
    mutation: 'feature-selector-drift-component',
    edits: [{ file: 'src/features/sidebar/sidebar.tsx', from: 'data-component="note-item"', to: 'data-component="note-row"' }],
    scope: ['sidebar.md'],
    expects: [{ gate: 'check:features', ruleId: 'feature-selector-drift', text: 'sidebar.md names [data-component="note-item"]' }],
  },
  {
    mutation: 'feature-selector-drift-aria-label',
    edits: [{ file: 'src/features/editor/editor.tsx', from: 'aria-label="Note title"', to: 'aria-label="Title"' }],
    scope: ['editor.md', 'cross-cutting-flows.md'],
    expects: [{ gate: 'check:features', ruleId: 'feature-selector-drift', text: 'names [aria-label="Note title"]', times: 2 }],
  },
  {
    mutation: 'feature-selector-drift-single-quoted',
    edits: [{ file: `${featureDocs}/editor.md`, from: '[aria-label="Note title"]', to: "[aria-label='Note heading']" }],
    scope: ['editor.md'],
    expects: [{ gate: 'check:features', ruleId: 'feature-selector-drift', text: 'editor.md names [aria-label="Note heading"]' }],
  },
  {
    mutation: 'feature-selector-drift-role',
    edits: [{ file: `${featureDocs}/search.md`, from: '[role="listbox"]', to: '[role="menu"]' }],
    scope: ['search.md'],
    expects: [{ gate: 'check:features', ruleId: 'feature-selector-drift', text: 'search.md names [role="menu"]' }],
  },
  {
    fixture: 'coverage-gap',
    expects: [{ gate: 'verify:coverage', ruleId: 'verify-coverage-uncovered', text: 'sidebar-uncovered-button' }],
  },
  {
    fixture: 'coverage-duplicate-id',
    expects: [{ gate: 'verify:coverage', ruleId: 'verify-coverage-duplicate-id', text: 'ghost-twice' }],
  },
  {
    fixture: 'coverage-stale-skip',
    expects: [{ gate: 'verify:coverage', ruleId: 'verify-coverage-stale-skip', text: 'ghost-covered' }],
  },
  {
    fixture: 'coverage-unknown-id',
    expects: [{ gate: 'verify:coverage', ruleId: 'verify-coverage-unknown-id', text: 'ghost-unlisted' }],
  },
]

function copyTree(from: string, to: string) {
  mkdirSync(join(to, '..'), { recursive: true })
  cpSync(from, to, { recursive: true })
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function applyMutation(sandbox: string, { edits = [], remove = [] }: Pick<Case, 'edits' | 'remove'>) {
  for (const path of remove) {
    assert.ok(existsSync(join(sandbox, path)), `cannot remove ${path}: it does not exist`)
    rmSync(join(sandbox, path))
  }
  for (const { file, from, to } of edits) {
    const target = join(sandbox, file)
    const text = readFileSync(target, 'utf8')
    assert.ok(text.includes(from), `cannot edit ${file}: it no longer contains ${JSON.stringify(from)}`)
    writeFileSync(target, text.replace(from, to))
  }
}

function makeSandbox(name: string, fixture?: string) {
  const sandbox = join(sandboxRoot, name)
  rmSync(sandbox, { recursive: true, force: true })
  mkdirSync(sandbox, { recursive: true })
  for (const entry of copied) {
    copyTree(join(projectRoot, entry), join(sandbox, entry))
  }
  symlinkSync(join(projectRoot, 'node_modules'), join(sandbox, 'node_modules'), 'dir')

  if (fixture) {
    const fixtureRoot = join(projectRoot, 'guardrail-fixtures', fixture)
    assert.ok(existsSync(fixtureRoot), `missing fixture directory ${fixtureRoot}`)
    for (const file of walk(fixtureRoot)) {
      const target = join(sandbox, relative(fixtureRoot, file))
      if (file.endsWith('.append')) {
        appendFileSync(target.slice(0, -'.append'.length), readFileSync(file, 'utf8'))
      } else {
        copyTree(file, target)
      }
    }
  }
  return sandbox
}

function runGate(sandbox: string, gate: Gate) {
  const result = spawnSync('npm', ['run', '--silent', gate, '--', ...gateArgs[gate]], {
    cwd: sandbox,
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function depFindings(stdout: string): Finding[] {
  const found: Finding[] = []
  for (const line of stdout.split('\n')) {
    const match = /^\s+error ([a-z-]+): (.+)$/.exec(line)
    if (match?.[1] && match[2]) {
      found.push({ ruleId: match[1], text: match[2] })
    } else if (line.trim() !== '' && found.length > 0) {
      const last = found[found.length - 1]
      if (last && !line.startsWith('x ') && !line.startsWith('✖')) {
        last.text += ` ${line.trim()}`
      }
    }
  }
  return found
}

function findings(gate: Gate, run: ReturnType<typeof runGate>, sandbox: string): Finding[] {
  if (gate === 'lint') {
    const results = JSON.parse(run.stdout) as {
      filePath: string
      messages: { ruleId: string | null; message: string }[]
    }[]
    return results.flatMap((file) =>
      file.messages.map((message) => ({
        ruleId: message.ruleId ?? 'parse-error',
        text: `${relative(sandbox, file.filePath)}: ${message.message}`,
      })),
    )
  }
  if (gate === 'typecheck') {
    return run.stdout
      .split('\n')
      .map((line) => /^(.+)\(\d+,\d+\): error (TS\d+): (.+)$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({ ruleId: match[2] ?? '', text: `${match[1]}: ${match[3]}` }))
  }
  if (gate === 'check:deps') {
    return depFindings(run.stdout)
  }
  return `${run.stdout}\n${run.stderr}`
    .split('\n')
    .filter((line) => /^[a-z-]+: /.test(line))
    .map((line) => ({ ruleId: line.slice(0, line.indexOf(':')), text: line }))
}

function foreignDirectory() {
  const directory = join(sandboxRoot, 'foreign')
  mkdirSync(directory, { recursive: true })
  return directory
}

async function holdPort(port: number) {
  const holder = spawn(
    process.execPath,
    [
      '-e',
      `require('net').createServer().listen(${port}, '127.0.0.1', () => console.log('listening')); setInterval(() => {}, 1e6)`,
    ],
    { cwd: foreignDirectory(), stdio: ['ignore', 'pipe', 'inherit'] },
  )
  await new Promise<void>((resolve, reject) => {
    holder.stdout.once('data', () => resolve())
    holder.once('exit', (code) => reject(new Error(`port holder exited with code ${code}`)))
  })
  return holder
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createSocketServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

async function serveFixedBody(body: string, contentType: string) {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': contentType })
    response.end(body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

function idleProcess(): ChildProcess {
  return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e6)'], { stdio: 'ignore' })
}

after(() => {
  rmSync(sandboxRoot, { recursive: true, force: true })
})

describe('guardrails fire on violating fixtures', () => {
  for (const { fixture, mutation, edits, remove, scope = [], expects } of cases) {
    const label = fixture ?? mutation ?? 'unnamed'
    for (const expectation of expects) {
      test(`${label}: ${expectation.gate} reports ${expectation.ruleId}`, () => {
        const sandbox = makeSandbox(`${label}-${expectation.gate.replace(':', '-')}`, fixture)
        applyMutation(sandbox, { edits, remove })
        const run = runGate(sandbox, expectation.gate)
        assert.notEqual(run.status, 0, `${expectation.gate} must fail on ${label}`)
        const found = findings(expectation.gate, run, sandbox)
        const hits = found.filter(
          (finding) => finding.ruleId === expectation.ruleId && finding.text.includes(expectation.text),
        )
        assert.equal(
          hits.length,
          expectation.times ?? 1,
          `expected ${expectation.times ?? 1} x ${expectation.ruleId} containing "${expectation.text}", got:\n${found
            .map((finding) => `  ${finding.ruleId}: ${finding.text}`)
            .join('\n')}`,
        )
        const markers = [...fixtureMarkers, ...scope]
        const strays = found.filter((finding) => !markers.some((marker) => finding.text.includes(marker)))
        assert.deepEqual(strays, [], 'only the fixture may be reported; the rest of the tree is clean')
      })
    }
  }
})

describe('guardrails pass on the clean tree', () => {
  for (const gate of ['lint', 'typecheck', 'check:deps', 'check:features', 'verify:coverage'] as const) {
    test(`${gate} passes without a fixture`, () => {
      const sandbox = makeSandbox(`clean-${gate.replace(':', '-')}`)
      const run = runGate(sandbox, gate)
      assert.equal(run.status, 0, `${gate} failed on the clean tree:\n${run.stdout}\n${run.stderr}`)
    })
  }
})

describe('what the rules must allow', () => {
  test('import.meta.hot, import.meta.env, import.meta.url, import.meta.dirname and import.meta.filename are legitimate outside discover.ts', () => {
    const sandbox = makeSandbox('allowed-import-meta', 'import-meta-allowed')
    for (const gate of ['lint', 'typecheck'] as const) {
      const run = runGate(sandbox, gate)
      assert.equal(run.status, 0, `${gate} must accept import.meta.hot/env/url/dirname/filename:\n${run.stdout}\n${run.stderr}`)
    }
  })

  test('a doc selector in single quotes is compared, and a correct one is not a false red', () => {
    const sandbox = makeSandbox('allowed-single-quoted-selector')
    applyMutation(sandbox, {
      edits: [{ file: `${featureDocs}/editor.md`, from: '[aria-label="Note title"]', to: "[aria-label='Note title']" }],
    })
    const run = runGate(sandbox, 'check:features')
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
  })

  test('commands that take data (ids, values, patches, readonly lists) are accepted by writer-takes-data', () => {
    const sandbox = makeSandbox('allowed-data-commands')
    appendFileSync(
      join(sandbox, 'src', 'client', 'commands.ts'),
      `
export function renameNote(id: string, title: string, when: Date, tags: readonly string[]) {
  store.set((state) => ({
    ...state,
    notes: state.notes.map((note) => (note.id === id ? { ...note, title: \`\${title} \${when.getTime()} \${tags.length}\` } : note)),
  }))
}
`,
    )
    const run = runGate(sandbox, 'lint')
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
  })
})

describe('the type-aware rules refuse to run blind', () => {
  test('without parserOptions.projectService, lint fails loudly instead of silently checking nothing', () => {
    const sandbox = makeSandbox('type-aware-rules-blind')
    applyMutation(sandbox, { edits: [{ file: 'eslint.config.js', from: 'projectService: true, ', to: '' }] })
    const run = runGate(sandbox, 'lint')
    assert.notEqual(run.status, 0)
    assert.match(`${run.stdout}\n${run.stderr}`, /local\/store-stays-private needs type information/)
  })
})

describe('adding a feature is only new files', () => {
  test('a new folder, its doc, an index line and a scenario pass every gate, verify and reach the bundle', async () => {
    const sandbox = makeSandbox('add-feature-folder', 'add-feature-folder')
    for (const gate of ['lint', 'typecheck', 'check:deps', 'check:features', 'verify:coverage'] as const) {
      const run = runGate(sandbox, gate)
      assert.equal(run.status, 0, `${gate} failed after adding a feature folder:\n${run.stdout}\n${run.stderr}`)
    }
    const port = await freePort()
    const verify = spawnSync('npm', ['run', '--silent', 'verify', '--', '--feature', 'ping', '--port', String(port)], {
      cwd: sandbox,
      encoding: 'utf8',
    })
    assert.equal(verify.status, 0, `verify --feature ping failed:\n${verify.stdout}\n${verify.stderr}`)
    assert.match(verify.stdout, /PASS {2}ping\/ping-button-is-visible/)
    assert.match(verify.stdout, /1\/1 scenarios passed/)
    const assets = join(sandbox, 'dist', 'assets')
    const bundle = readdirSync(assets)
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(join(assets, name), 'utf8'))
      .join('\n')
    assert.ok(bundle.includes('ping-feature-marker'), 'the discovered feature must be in the bundle without editing any code registry')
  })
})

describe('the coverage record is an export of the run, never an input to a gate', () => {
  const run = (feature: string, scenario: string, overrides: Partial<RunResult>): RunResult => ({
    feature,
    scenario,
    description: 'demo',
    command: 'npm run verify:all',
    appUrl: 'http://127.0.0.1:1/',
    injectBug: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 1,
    steps: [],
    checks: [],
    reached: [],
    consoleEntries: [],
    trace: null,
    failure: null,
    artifactDir: 'artifacts/demo',
    ...overrides,
  })

  test('buildCoverageRecord lists the reached ids of a passing scenario and none for a failed one', () => {
    const record = buildCoverageRecord([
      run('search', 'passes', { reached: ['search-filter', 'search-open-chord'] }),
      run('search', 'fails', { reached: ['search-close-escape'], failure: 'expectation failed: demo' }),
      run('sidebar', 'console-error', { reached: ['sidebar-new-note'], consoleEntries: [{ kind: 'console.error', text: 'boom' }] }),
    ])
    assert.deepEqual(record.scenarios, [
      { name: 'search/passes', passed: true, covers: ['search-filter', 'search-open-chord'] },
      { name: 'search/fails', passed: false, covers: [] },
      { name: 'sidebar/console-error', passed: false, covers: [] },
    ])
    assert.equal(record.command, 'npm run verify:all')
    assert.equal(record.injectBug, false)
    assert.ok(Number.isFinite(Date.parse(record.generatedAt)))
  })

  test('buildCoverageRecord marks a record from an INJECT_BUG=1 build', () => {
    const record = buildCoverageRecord([run('a', 'one', {}), run('a', 'two', { injectBug: true })])
    assert.equal(record.injectBug, true)
  })

  test('a hand-written record cannot make a failing verify:all pass; the run overwrites it from what it asserted', async () => {
    const sandbox = makeSandbox('record-end-to-end')
    applyMutation(sandbox, {
      edits: [
        {
          file: 'scripts/verify/scenarios/editor.ts',
          from: ", {\n        reaches: 'editor-edit-title',\n      })",
          to: ')',
        },
      ],
    })
    const forged = (await loadScenarios()).map((scenario) => ({
      name: `${scenario.feature}/${scenario.name}`,
      passed: true,
      covers: [...scenario.covers],
    }))
    mkdirSync(join(sandbox, 'artifacts'), { recursive: true })
    const recordPath = join(sandbox, 'artifacts', 'verify-coverage.json')
    writeFileSync(
      recordPath,
      JSON.stringify({ generatedAt: '2020-01-01T00:00:00.000Z', command: 'npm run verify:all', injectBug: false, scenarios: forged }),
    )
    const port = await freePort()
    const verify = spawnSync('npm', ['run', '--silent', 'verify', '--', '--all', '--port', String(port)], {
      cwd: sandbox,
      encoding: 'utf8',
    })
    assert.equal(verify.status, 1, `${verify.stdout}\n${verify.stderr}`)
    assert.match(
      verify.stdout,
      /FAIL {2}editor\/edit-title-updates-sidebar {2}scenario covers \[editor-edit-title\] but no passing expect/,
    )
    assert.match(verify.stdout, /PASS {2}editor\/edit-body-persists/)
    const written = JSON.parse(readFileSync(recordPath, 'utf8')) as ReturnType<typeof buildCoverageRecord>
    assert.notEqual(written.generatedAt, '2020-01-01T00:00:00.000Z')
    const edit = written.scenarios.find((entry) => entry.name === 'editor/edit-title-updates-sidebar')
    assert.deepEqual(edit, { name: 'editor/edit-title-updates-sidebar', passed: false, covers: [] })
    const body = written.scenarios.find((entry) => entry.name === 'editor/edit-body-persists')
    assert.deepEqual(body, { name: 'editor/edit-body-persists', passed: true, covers: ['editor-edit-body'] })
  })

  test('no script other than the two that write the record, and no package script, consumes it', () => {
    const writers = ['verify/cli.ts', 'verify/coverage-record.ts', 'guardrails.test.ts']
    const scriptsRoot = join(projectRoot, 'scripts')
    const readers = walk(scriptsRoot)
      .filter((file) => !writers.includes(relative(scriptsRoot, file)))
      .filter((file) => /verify-coverage\.json|coverage-record|coverageRecordPath/.test(readFileSync(file, 'utf8')))
    assert.deepEqual(readers.map((file) => relative(projectRoot, file)), [])
    const scripts = (JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
    assert.equal(scripts['verify:reached'], undefined)
    assert.doesNotMatch(Object.values(scripts).join('\n'), /verify-coverage\.json/)
  })
})

describe('a scenario cannot pass with a failed assertion', () => {
  const check = (pass: boolean) => ({ name: 'demo check', expected: '"a"', observed: pass ? '"a"' : '"b"', pass })
  const result = (overrides: Partial<RunResult>): RunResult => ({
    feature: 'demo',
    scenario: 'demo',
    description: 'demo',
    command: 'npm run verify:all',
    appUrl: 'http://127.0.0.1:1/',
    injectBug: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 1,
    steps: [],
    checks: [],
    reached: ['demo-id'],
    consoleEntries: [],
    trace: null,
    failure: null,
    artifactDir: 'artifacts/demo',
    ...overrides,
  })

  test('passed() is false when any recorded check failed, even though the scenario did not throw', () => {
    assert.equal(passed(result({ checks: [check(true), check(true)] })), true)
    assert.equal(passed(result({ checks: [check(true), check(false)] })), false)
  })

  test('the report and the coverage record agree with passed()', () => {
    const swallowed = result({ checks: [check(false)] })
    assert.match(renderReport(swallowed), /^- \*\*Result:\*\* FAIL$/m)
    assert.deepEqual(buildCoverageRecord([swallowed]).scenarios, [{ name: 'demo/demo', passed: false, covers: [] }])
  })

  test('checkProblem names the first failed check and is null when all passed', () => {
    assert.equal(checkProblem([check(true)]), null)
    assert.equal(checkProblem([check(true), check(false)]), 'expectation failed: demo check')
  })

  test('an expect() wrapped in try/catch inside a scenario still turns verify red', async () => {
    const sandbox = makeSandbox('scenario-swallowed-expect')
    applyMutation(sandbox, {
      edits: [
        {
          file: 'scripts/verify/scenarios/sidebar.ts',
          from: "await expect('seed notes are listed', seedTitles, () => u.noteRows.allTextContents())",
          to: "try {\n        await expect('seed notes are listed', ['nope'], () => u.noteRows.allTextContents(), { timeoutMs: 100 })\n      } catch {\n        await Promise.resolve()\n      }",
        },
      ],
    })
    const port = await freePort()
    const verify = spawnSync('npm', ['run', '--silent', 'verify', '--', '--feature', 'sidebar', '--port', String(port)], {
      cwd: sandbox,
      encoding: 'utf8',
    })
    assert.equal(verify.status, 1, `${verify.stdout}\n${verify.stderr}`)
    assert.match(verify.stdout, /FAIL {2}sidebar\/create-note {2}expectation failed: seed notes are listed/)
    assert.match(verify.stdout, /PASS {2}sidebar\/select-note/)
  })
})

describe('a scenario must reach exactly the entry points it lists', () => {
  test('reaching an id that covers does not list fails, and so does listing one that was not reached', () => {
    assert.equal(coverageProblem({ covers: ['a'] }, new Set(['a'])), null)
    assert.match(coverageProblem({ covers: ['a'] }, new Set(['a', 'b'])) ?? '', /reaches \[b\] without listing it/)
    assert.match(coverageProblem({ covers: ['a', 'b'] }, new Set(['a'])) ?? '', /covers \[b\] but no passing expect/)
  })
})

describe('durable state: one writer, intent commands, frozen at runtime', () => {
  const seed = (...ids: string[]): Note[] => ids.map((id) => ({ id, title: `Title ${id}`, body: `Body ${id}` }))

  const readState = () => {
    const seen: ReturnType<typeof useNotesState>[] = []
    renderToStaticMarkup(
      createElement(function Probe() {
        seen.push(useNotesState())
        return null
      }),
    )
    const state = seen[0]
    assert.ok(state)
    return state
  }

  const hydrateWith = async (...ids: string[]) => {
    handle('notes:load', () => seed(...ids))
    await hydrateNotes()
  }

  test('hydrating notes whose ids are not 1..n never makes the next created note repeat an id', async () => {
    await hydrateWith('note-1', 'note-3')
    createNote()
    createNote()
    assert.deepEqual(
      readState().notes.map((note) => note.id),
      ['note-5', 'note-4', 'note-1', 'note-3'],
    )
  })

  test('hydrating selects the first loaded note, and hydrating nothing selects none', async () => {
    await hydrateWith('note-7', 'note-2')
    assert.equal(readState().selectedId, 'note-7')
    await hydrateWith()
    assert.equal(readState().selectedId, null)
    createNote()
    assert.deepEqual(
      readState().notes.map((note) => note.id),
      ['note-1'],
    )
  })

  test('the commands still do their job on the frozen state', async () => {
    await hydrateWith('note-1', 'note-2')
    updateNote('note-2', { title: 'Renamed' })
    selectNote('note-2')
    const state = readState()
    assert.equal(state.selectedId, 'note-2')
    assert.deepEqual(
      state.notes.map((note) => note.title),
      ['Title note-1', 'Renamed'],
    )
  })

  test('every way of writing to a note or to the state the store hands out throws or changes nothing', async () => {
    await hydrateWith('note-1', 'note-2')
    const state = readState()
    const note = state.notes[0] as { title: string; body: string }
    const tidy = (target: { title: string }) => {
      target.title = ''
    }
    assert.throws(() => tidy(note), TypeError)
    assert.throws(() => {
      note.body = ''
    }, TypeError)
    assert.throws(() => Object.assign(note, { title: '' }), TypeError)
    assert.throws(() => (state.notes as Note[]).push(seed('note-9')[0]!), TypeError)
    assert.throws(() => {
      ;(state as { selectedId: string | null }).selectedId = null
    }, TypeError)
    assert.equal(Reflect.set(note, 'title', ''), false)
    assert.equal(readState().notes[0]?.title, 'Title note-1')
    assert.equal(readState().notes.length, 2)
    assert.equal(readState().selectedId, 'note-1')
  })

  test('a feature that writes to a note through a structurally typed parameter typechecks but turns verify red', async () => {
    const sandbox = makeSandbox('feature-writes-state')
    applyMutation(sandbox, {
      edits: [
        {
          file: 'src/features/sidebar/sidebar.tsx',
          from: 'onClick={() => selectNote(note.id)}',
          to: 'onClick={() => {\n                blank(note)\n                selectNote(note.id)\n              }}',
        },
        {
          file: 'src/features/sidebar/sidebar.tsx',
          from: 'export function Sidebar() {',
          to: "function blank(target: { title: string }) {\n  target.title = ''\n}\n\nexport function Sidebar() {",
        },
      ],
    })
    const typecheck = runGate(sandbox, 'typecheck')
    assert.equal(typecheck.status, 0, `${typecheck.stdout}\n${typecheck.stderr}`)
    const port = await freePort()
    const verify = spawnSync('npm', ['run', '--silent', 'verify', '--', '--feature', 'sidebar', '--port', String(port)], {
      cwd: sandbox,
      encoding: 'utf8',
    })
    assert.equal(verify.status, 1, `${verify.stdout}\n${verify.stderr}`)
    assert.match(verify.stdout, /FAIL {2}sidebar\/select-note/)
    assert.match(verify.stdout, /PASS {2}sidebar\/create-note/)
    const runs = readdirSync(join(sandbox, 'artifacts'))
    const report = readFileSync(join(sandbox, 'artifacts', runs[0]!, 'sidebar-select-note', 'report.md'), 'utf8')
    assert.match(report, /pageerror: TypeError: Cannot assign to read only property 'title'/)
  })

  test('createStore freezes the initial value and every value set, however deeply nested', () => {
    const store = createStore({ list: [{ inner: { value: 1 } }], flag: false })
    const initial = store.get()
    assert.ok(Object.isFrozen(initial) && Object.isFrozen(initial.list) && Object.isFrozen(initial.list[0]!.inner))
    store.set(() => ({ list: [{ inner: { value: 2 } }], flag: true }))
    const next = store.get()
    assert.ok(Object.isFrozen(next) && Object.isFrozen(next.list) && Object.isFrozen(next.list[0]!.inner))
    assert.throws(() => {
      ;(next.list[0]!.inner as { value: number }).value = 3
    }, TypeError)
  })
})

describe('the search scenario proves what the feature doc claims', () => {
  for (const [label, expression] of [
    ['matches only titles', 'note.title.toLowerCase().includes(needle)'],
    ['matches the body case-sensitively', 'note.title.toLowerCase().includes(needle) || note.body.includes(needle)'],
  ] as const) {
    test(`a filter that ${label} turns verify red`, async () => {
      const sandbox = makeSandbox(`search-filter-${label.includes('only') ? 'title-only' : 'body-case'}`)
      applyMutation(sandbox, {
        edits: [
          {
            file: 'src/features/search/filter-notes.ts',
            from: 'note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle)',
            to: expression,
          },
        ],
      })
      const port = await freePort()
      const verify = spawnSync('npm', ['run', '--silent', 'verify', '--', '--feature', 'search', '--port', String(port)], {
        cwd: sandbox,
        encoding: 'utf8',
      })
      assert.equal(verify.status, 1, `${verify.stdout}\n${verify.stderr}`)
      assert.match(
        verify.stdout,
        /FAIL {2}search\/shortcut-filters-and-selects {2}expectation failed: a body-only match in other letter case/,
      )
      assert.match(verify.stdout, /PASS {2}search\/arrow-navigation/)
    })
  }
})

describe('the framework knows nothing about the app', () => {
  test('no file in src/framework mentions the app name, which the app passes in', () => {
    const mentions = walk(join(projectRoot, 'src', 'framework')).filter((file) =>
      readFileSync(file, 'utf8').includes(appConfig.name),
    )
    assert.deepEqual(mentions.map((file) => relative(projectRoot, file)), [])
  })

  test('the shell renders the title it is given', () => {
    const markup = renderToStaticMarkup(createElement(Shell, { title: 'Zebra', features: [] }))
    assert.match(markup, /<h1 class="app-title">Zebra<\/h1>/)
    assert.doesNotMatch(markup, new RegExp(appConfig.name))
  })
})

describe('preview port isolation', () => {
  test('the derived port is stable per project path and differs between paths', () => {
    assert.equal(derivePort('/work/notes'), derivePort('/work/notes'))
    assert.notEqual(derivePort('/work/notes'), derivePort('/work/notes-worktree'))
  })

  test('verify refuses, and doctor names the holder, when a foreign process holds the derived port', async () => {
    const port = derivePort(realpathSync(projectRoot))
    const holder = await holdPort(port)
    try {
      const refused = spawnSync('npm', ['run', '--silent', 'verify', '--', '--feature', 'sidebar'], {
        cwd: projectRoot,
        encoding: 'utf8',
      })
      assert.equal(refused.status, 3, `expected the refusal exit code 3:\n${refused.stdout}\n${refused.stderr}`)
      assert.match(refused.stderr, /refus/i)
      assert.match(refused.stderr, new RegExp(`pid ${holder.pid}\\b`))
      assert.match(refused.stderr, /--port/)

      const doctor = spawnSync('npm', ['run', '--silent', 'verify', '--', 'doctor'], {
        cwd: projectRoot,
        encoding: 'utf8',
      })
      assert.equal(doctor.status, 1)
      assert.match(doctor.stdout, new RegExp(`held by pid ${holder.pid}\\b`))
    } finally {
      holder.kill('SIGKILL')
    }
  })

  test('the holder is found with lsof alone, as on macOS where ss does not exist', async () => {
    const port = await freePort()
    const holder = await holdPort(port)
    try {
      const found = findHolder(port, realpathSync(projectRoot), ['lsof'])
      assert.equal(found?.pid, holder.pid)
      assert.equal(found?.cwd, realpathSync(foreignDirectory()))
      assert.match(found?.command ?? '', /net/)
      assert.equal(found?.ours, false)
      assert.equal(findHolder(await freePort(), realpathSync(projectRoot), ['lsof']), null)
    } finally {
      holder.kill('SIGKILL')
    }
  })

  test('the pid parsers read the ss and lsof listings', () => {
    assert.equal(parseSsPid('LISTEN 0 511 127.0.0.1:20000 0.0.0.0:* users:(("node",pid=4242,fd=19))\n'), 4242)
    assert.equal(parseSsPid(''), null)
    assert.equal(parseLsofPid('p4242\n'), 4242)
    assert.equal(parseLsofPid(''), null)
  })

  test('verify refuses an explicit --port that another process holds, before building or driving anything', async () => {
    const port = await freePort()
    const holder = await holdPort(port)
    try {
      const artifacts = join(sandboxRoot, 'refused-artifacts')
      const refused = spawnSync(
        'npm',
        ['run', '--silent', 'verify', '--', '--feature', 'sidebar', '--port', String(port)],
        { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, VERIFY_ARTIFACTS_DIR: artifacts } },
      )
      assert.equal(refused.status, 3, `expected the refusal exit code 3:\n${refused.stdout}\n${refused.stderr}`)
      assert.match(refused.stderr, /refus/i)
      assert.match(refused.stderr, new RegExp(`--port ${port} is held by pid ${holder.pid}\\b`))
      assert.doesNotMatch(refused.stdout, /preview server on port/)
      assert.equal(existsSync(artifacts), false, 'a refused run must not create artifacts')
    } finally {
      holder.kill('SIGKILL')
    }
  })
})

describe('verify command line', () => {
  const verify = (...args: string[]) =>
    spawnSync('npm', ['run', '--silent', 'verify', '--', ...args], { cwd: projectRoot, encoding: 'utf8' })

  test('--help and -h print the usage and exit 0', () => {
    for (const flag of ['--help', '-h']) {
      const run = verify(flag)
      assert.equal(run.status, 0, `${flag}:\n${run.stdout}\n${run.stderr}`)
      assert.match(run.stdout, /^Usage:/m)
      assert.match(run.stdout, /--feature <id>/)
    }
  })

  test('an unknown option prints the usage and exits 2, with no stack trace', () => {
    const run = verify('--bogus')
    assert.equal(run.status, 2)
    assert.match(run.stderr, /Unknown option '--bogus'/)
    assert.match(run.stderr, /^Usage:/m)
    assert.doesNotMatch(run.stderr, /\n\s+at /)
  })

  test('a malformed --port prints the usage and exits 2', () => {
    const run = verify('--feature', 'sidebar', '--port', 'abc')
    assert.equal(run.status, 2)
    assert.match(run.stderr, /Invalid --port "abc"/)
    assert.match(run.stderr, /^Usage:/m)
  })
})

describe('the served preview must be the build this run made', () => {
  const expected: BuildInfo = { builtAt: 'now', injectBug: false, nonce: 'the-nonce-of-this-build' }

  test('a foreign server that answers 200 with another build nonce is never accepted', async () => {
    const foreign = await serveFixedBody(JSON.stringify({ ...expected, nonce: 'foreign', injectBug: true }), 'application/json')
    const child = idleProcess()
    try {
      await assert.rejects(waitUntilReady(foreign.url, child, expected, 800), /never matched this build's nonce/)
    } finally {
      child.kill('SIGKILL')
      await foreign.close()
    }
  })

  test('a foreign server that answers 200 with an app shell and no build file is never accepted', async () => {
    const foreign = await serveFixedBody('<!doctype html><title>other app</title>', 'text/html')
    const child = idleProcess()
    try {
      await assert.rejects(waitUntilReady(foreign.url, child, expected, 800), /never matched this build's nonce/)
    } finally {
      child.kill('SIGKILL')
      await foreign.close()
    }
  })

  test('a server serving the nonce of this build is accepted', async () => {
    const own = await serveFixedBody(JSON.stringify(expected), 'application/json')
    const child = idleProcess()
    try {
      await waitUntilReady(own.url, child, expected, 800)
    } finally {
      child.kill('SIGKILL')
      await own.close()
    }
  })

  test('a preview process that exits before it is ready is fatal even while something else answers 200', async () => {
    const foreign = await serveFixedBody(JSON.stringify({ ...expected, nonce: 'foreign' }), 'application/json')
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(1), 300)'], { stdio: 'ignore' })
    try {
      await assert.rejects(waitUntilReady(foreign.url, child, expected, 5000), /exited before it was ready/)
    } finally {
      child.kill('SIGKILL')
      await foreign.close()
    }
  })
})

describe('doctor checks the whole node engines range', () => {
  const range = '^22.13.0 || ^24.0.0 || >=26.0.0'

  for (const [version, ok] of [
    ['20.19.0', false],
    ['22.12.0', false],
    ['22.13.0', true],
    ['22.99.1', true],
    ['23.11.0', false],
    ['24.0.0', true],
    ['25.2.0', false],
    ['26.0.0', true],
    ['27.1.0', true],
  ] as const) {
    test(`node ${version} is ${ok ? 'accepted' : 'rejected'}`, () => {
      assert.equal(nodeSatisfies(version, range), ok)
    })
  }
})

describe('doctor reports unreadable inputs instead of crashing', () => {
  const doctor = async (sandbox: string) =>
    spawnSync('npx', ['tsx', 'scripts/verify/cli.ts', 'doctor', '--port', String(await freePort())], {
      cwd: sandbox,
      encoding: 'utf8',
    })

  test('a truncated dist/.verify-build.json is a warning that says how to fix it, not a stack trace', async () => {
    const sandbox = makeSandbox('doctor-truncated-build-record')
    mkdirSync(join(sandbox, 'dist'), { recursive: true })
    writeFileSync(join(sandbox, 'dist', 'index.html'), '<!doctype html>')
    writeFileSync(join(sandbox, 'dist', '.verify-build.json'), '{"builtAt": "now", "inj')
    const run = await doctor(sandbox)
    assert.doesNotMatch(`${run.stdout}${run.stderr}`, /\n\s+at /)
    assert.match(run.stdout, /warning: dist\/\.verify-build\.json is not valid JSON with a nonce and an injectBug flag/)
    assert.match(run.stdout, /rebuild/)
    assert.match(run.stdout, /verdict: /)
  })

  test('a build record without a nonce is treated the same way', async () => {
    const sandbox = makeSandbox('doctor-nonce-less-build-record')
    mkdirSync(join(sandbox, 'dist'), { recursive: true })
    writeFileSync(join(sandbox, 'dist', 'index.html'), '<!doctype html>')
    writeFileSync(join(sandbox, 'dist', '.verify-build.json'), JSON.stringify({ builtAt: 'now', injectBug: false }))
    const run = await doctor(sandbox)
    assert.match(run.stdout, /warning: dist\/\.verify-build\.json is not valid JSON with a nonce/)
  })

  test('an engines.node comparator it cannot evaluate is a blocking problem that names the comparator', async () => {
    const sandbox = makeSandbox('doctor-unsupported-range')
    const manifestPath = join(sandbox, 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { engines: { node: string } }
    manifest.engines.node = '~22.1.0'
    writeFileSync(manifestPath, JSON.stringify(manifest))
    const run = await doctor(sandbox)
    assert.equal(run.status, 1)
    assert.doesNotMatch(`${run.stdout}${run.stderr}`, /\n\s+at /)
    assert.match(run.stdout, /problem: engines\.node comparator "~22\.1\.0" is not supported by verify doctor/)
  })

  test('a package.json that is not JSON is reported as a problem by name', () => {
    const directory = join(sandboxRoot, 'doctor-bad-manifest')
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'package.json'), '{ "engines": ')
    const { range, problem } = requiredNode(directory)
    assert.equal(range, '*')
    assert.match(problem ?? '', /^package\.json cannot be read, so the node range is unknown: SyntaxError/)
    assert.deepEqual(requiredNode(projectRoot), { range: '^22.13.0 || ^24.0.0 || >=26.0.0', problem: null })
  })
})

describe('verify report', () => {
  const micros = (ms: number) => ms * 1000
  const task = (dur: number) => ({ name: 'RunTask', ph: 'X', pid: 1, tid: 2, dur: micros(dur) })
  const trace = JSON.stringify({
    traceEvents: [
      { name: 'thread_name', ph: 'M', pid: 1, tid: 2, args: { name: 'CrRendererMain' } },
      task(5),
      task(20),
      task(49),
      task(60),
    ],
  })

  test('long tasks use the 50 ms Long Tasks definition and the frame budget is counted separately', () => {
    const summary = summarizeTrace(trace)
    assert.equal(summary.rendererMainTasks, 4)
    assert.equal(summary.longTasks, 1)
    assert.equal(summary.tasksOverFrameBudget, 3)
  })

  test('the report prints both lines with their own thresholds', () => {
    const result: RunResult = {
      feature: 'demo',
      scenario: 'demo',
      description: 'demo',
      command: 'npm run verify -- --feature demo',
      appUrl: 'http://127.0.0.1:1/',
      injectBug: false,
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 1,
      steps: [],
      checks: [],
      reached: [],
      consoleEntries: [],
      trace: summarizeTrace(trace),
      failure: null,
      artifactDir: 'artifacts/demo',
    }
    const report = renderReport(result)
    assert.match(report, /^- Long tasks \(>50 ms\): 1$/m)
    assert.match(report, /^- Tasks over the 16\.7 ms frame budget: 3$/m)
  })
})
