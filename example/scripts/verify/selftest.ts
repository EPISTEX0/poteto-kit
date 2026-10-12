import { spawnSync } from 'node:child_process'
import { loadScenarios } from './load-scenarios'

const expectedFailures = ['editor/edit-title-updates-sidebar', 'cross-cutting/create-rename-find']
const allScenarios = await loadScenarios()

function runVerifyAll(label: string, injectBug: boolean) {
  const env: NodeJS.ProcessEnv = { ...process.env, VERIFY_ARTIFACTS_DIR: `artifacts/selftest-${label}` }
  if (injectBug) {
    env.INJECT_BUG = '1'
  } else {
    delete env.INJECT_BUG
  }
  const result = spawnSync('npm', ['run', 'verify:all'], { env, encoding: 'utf8' })
  const output = `${result.stdout}${result.stderr}`
  console.log(`--- verify:all ${injectBug ? 'with INJECT_BUG=1' : 'without INJECT_BUG'} (exit ${result.status}) ---`)
  console.log(output.split('\n').filter((line) => /^(PASS|FAIL) /.test(line) || /scenarios passed/.test(line)).join('\n'))
  return { status: result.status, output }
}

const problems: string[] = []

const buggy = runVerifyAll('bug', true)
if (buggy.status === 0) {
  problems.push('verify:all passed with INJECT_BUG=1; the verification is vacuous')
}
const failedNames = buggy.output
  .split('\n')
  .filter((line) => line.startsWith('FAIL '))
  .map((line) => line.slice(5).trim().split(/\s+/)[0])
  .sort()
if (JSON.stringify(failedNames) !== JSON.stringify([...expectedFailures].sort())) {
  problems.push(
    `with INJECT_BUG=1 exactly [${expectedFailures.join(', ')}] must fail, saw [${failedNames.join(', ')}]`,
  )
}
const passLines = buggy.output.split('\n').filter((line) => line.startsWith('PASS '))
if (passLines.length !== allScenarios.length - expectedFailures.length) {
  problems.push(
    `expected ${allScenarios.length - expectedFailures.length} scenarios to pass with INJECT_BUG=1, saw ${passLines.length}`,
  )
}

const clean = runVerifyAll('clean', false)
if (clean.status !== 0) {
  problems.push('verify:all failed without INJECT_BUG on the clean app')
}

if (problems.length > 0) {
  console.error(`\nverify:selftest FAILED\n${problems.map((problem) => `- ${problem}`).join('\n')}`)
  process.exit(1)
}
console.log('\nverify:selftest ok: the injected bug is caught, the clean app passes')
