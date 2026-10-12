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
import { nodeSatisfies } from './verify/doctor'
import { derivePort } from './verify/port'
import { renderReport, type RunResult } from './verify/report'
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
    expects: [{ gate: 'typecheck', ruleId: 'TS2724', text: "has no exported member named 'notesStore'" }],
  },
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
