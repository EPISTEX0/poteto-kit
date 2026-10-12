import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium, type Browser } from 'playwright-core'
import { resolveChrome } from './chrome'
import { appReady } from './selectors'
import { passed, renderReport, type ConsoleEntry, type RunResult } from './report'
import { createContext, ScenarioFailure, type Scenario } from './scenario'
import { runDoctor } from './doctor'
import { loadScenarios } from './load-scenarios'
import { choosePort, PortRefusal } from './port'
import { buildApp, startPreview, type PreviewServer } from './server'
import { endTrace, startTrace, summarizeTrace, type TraceSummary } from './trace'

const usageText = `Usage:
  npm run verify -- --feature <id> [--scenario <name>] [--port <n>] [--no-build]
  npm run verify:all
  npm run verify -- doctor [--port <n>]
  npm run verify -- --help

Runs the real app in headless Chromium, drives the chosen scenarios and writes
screenshot.png, console.json, trace.json and report.md under artifacts/<timestamp>/.

Options:
  --feature <id>      run every scenario of one feature
  --scenario <name>   with --feature, run only this scenario
  --all               run every scenario (npm run verify:all)
  --port <n>          preview port; refused with exit 3 if something already holds it
  --no-build          reuse dist/ from the last verify build instead of rebuilding
  -h, --help          show this text

Commands:
  doctor              read-only health report: browser, dist/, port, node, git worktree

Exit codes: 0 all scenarios passed, 1 a scenario failed or an error occurred,
2 usage error, 3 refused to start because the port is held by another process.`

function usage(message: string | null, features: string[] = []): never {
  if (message) {
    console.error(message)
  }
  console.error(usageText)
  if (features.length > 0) {
    console.error(`\nFeatures: ${features.join(', ')}`)
  }
  process.exit(2)
}

function readArgs() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        port: { type: 'string' },
        feature: { type: 'string' },
        scenario: { type: 'string' },
        all: { type: 'boolean', default: false },
        'no-build': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })
  } catch (error) {
    return usage(error instanceof Error ? error.message : String(error))
  }
}

const { values, positionals } = readArgs()

function readPort() {
  if (values.port === undefined) {
    return undefined
  }
  const port = Number(values.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    usage(`Invalid --port "${values.port}": expected an integer from 1 to 65535`)
  }
  return port
}

const explicitPort = readPort()

function selectScenarios(allScenarios: Scenario[]) {
  const features = [...new Set(allScenarios.map((scenario) => scenario.feature))]
  if (values.all) {
    return allScenarios
  }
  if (!values.feature) {
    usage('Missing --feature', features)
  }
  const forFeature = allScenarios.filter((scenario) => scenario.feature === values.feature)
  if (forFeature.length === 0) {
    usage(`Unknown feature: ${values.feature}`, features)
  }
  if (!values.scenario) {
    return forFeature
  }
  const chosen = forFeature.filter((scenario) => scenario.name === values.scenario)
  if (chosen.length === 0) {
    usage(
      `Unknown scenario "${values.scenario}" for ${values.feature}. Available: ${forFeature.map((scenario) => scenario.name).join(', ')}`,
      features,
    )
  }
  return chosen
}

function commandLine() {
  if (values.all) {
    return 'npm run verify:all'
  }
  const scenario = values.scenario ? ` --scenario ${values.scenario}` : ''
  return `npm run verify -- --feature ${values.feature}${scenario}`
}

async function runScenario(
  browser: Browser,
  scenario: Scenario,
  server: PreviewServer,
  runDir: string,
): Promise<RunResult> {
  const artifactDir = join(runDir, `${scenario.feature}-${scenario.name}`)
  mkdirSync(artifactDir, { recursive: true })

  const started = Date.now()
  const browserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await browserContext.newPage()
  const consoleEntries: ConsoleEntry[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const { url, lineNumber } = message.location()
      consoleEntries.push({
        kind: 'console.error',
        text: message.text(),
        location: url ? `${url}:${lineNumber}` : undefined,
      })
    }
  })
  page.on('pageerror', (error) => {
    consoleEntries.push({ kind: 'pageerror', text: error.stack ?? error.message })
  })

  const session = await browserContext.newCDPSession(page)
  const { context, steps, checks } = createContext(page)
  let failure: string | null = null
  let trace: TraceSummary | null = null

  await startTrace(session)
  try {
    await context.step('Open the app', async () => {
      await page.goto(server.url)
      await page.locator(appReady).waitFor()
    })
    await scenario.run(context)
  } catch (error) {
    failure = error instanceof ScenarioFailure ? error.message : `unexpected error: ${String(error)}`
  }

  await page.screenshot({ path: join(artifactDir, 'screenshot.png') })
  try {
    const traceText = await endTrace(session)
    writeFileSync(join(artifactDir, 'trace.json'), traceText)
    trace = summarizeTrace(traceText)
  } catch (error) {
    failure ??= `trace capture failed: ${String(error)}`
  }
  writeFileSync(join(artifactDir, 'console.json'), `${JSON.stringify(consoleEntries, null, 2)}\n`)
  await browserContext.close()

  if (failure === null && consoleEntries.length > 0) {
    failure = `${consoleEntries.length} console/page error(s) during the scenario`
  }

  const result: RunResult = {
    feature: scenario.feature,
    scenario: scenario.name,
    description: scenario.description,
    command: commandLine(),
    appUrl: server.url,
    injectBug: server.build.injectBug,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    steps,
    checks,
    consoleEntries,
    trace,
    failure,
    artifactDir,
  }
  writeFileSync(join(artifactDir, 'report.md'), renderReport(result))
  return result
}

async function main() {
  if (values.help) {
    console.log(usageText)
    process.exit(0)
  }
  if (positionals[0] === 'doctor') {
    process.exit(await runDoctor(explicitPort))
  }
  if (positionals.length > 0) {
    usage(`Unknown command: ${positionals.join(' ')}`)
  }
  const scenarios = selectScenarios(await loadScenarios())
  const { port, source } = await choosePort(explicitPort)
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const runDir = join(process.env.VERIFY_ARTIFACTS_DIR ?? 'artifacts', stamp)
  mkdirSync(runDir, { recursive: true })

  if (!values['no-build']) {
    await buildApp()
  }
  const server = await startPreview(port)
  console.log(`preview server on port ${port} (${source})`)
  const stopOnSignal = () => {
    void server.stop().then(() => process.exit(130))
  }
  process.once('SIGINT', stopOnSignal)
  process.once('SIGTERM', stopOnSignal)

  let browser: Browser | undefined
  const results: RunResult[] = []
  try {
    browser = await chromium.launch({ executablePath: resolveChrome(), headless: true })
    for (const scenario of scenarios) {
      const result = await runScenario(browser, scenario, server, runDir)
      results.push(result)
      const label = `${result.feature}/${result.scenario}`
      const detail = passed(result) ? '' : `  ${result.failure}`
      console.log(`${passed(result) ? 'PASS' : 'FAIL'}  ${label}${detail}`)
    }
  } finally {
    await browser?.close()
    await server.stop()
  }

  const failed = results.filter((result) => !passed(result))
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passed. Artifacts: ${runDir}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((error) => {
  if (error instanceof PortRefusal) {
    console.error(error.message)
    process.exit(3)
  }
  console.error(error)
  process.exit(1)
})
