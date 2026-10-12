import type { Page } from 'playwright-core'

export type StepRecord = { description: string; ok: boolean; error?: string }

export type CheckRecord = { name: string; expected: string; observed: string; pass: boolean }

export type ExpectOptions = { reaches?: string; timeoutMs?: number }

export type ScenarioContext = {
  page: Page
  step: (description: string, action: () => Promise<void>) => Promise<void>
  expect: <T>(name: string, expected: T, read: () => Promise<T>, options?: ExpectOptions) => Promise<void>
}

export type Scenario = {
  feature: string
  name: string
  description: string
  covers: string[]
  catchesInjectedBug?: boolean
  run: (context: ScenarioContext) => Promise<void>
}

export class ScenarioFailure extends Error {}

const pollIntervalMs = 50

function show(value: unknown) {
  return JSON.stringify(value)
}

export function coverageProblem(scenario: Pick<Scenario, 'covers'>, reached: ReadonlySet<string>) {
  const unreached = scenario.covers.filter((id) => !reached.has(id))
  const undeclared = [...reached].filter((id) => !scenario.covers.includes(id))
  const problems: string[] = []
  if (unreached.length > 0) {
    problems.push(
      `covers [${unreached.join(', ')}] but no passing expect(..., { reaches: '<id>' }) reached ${unreached.length === 1 ? 'it' : 'them'}`,
    )
  }
  if (undeclared.length > 0) {
    problems.push(`reaches [${undeclared.join(', ')}] without listing ${undeclared.length === 1 ? 'it' : 'them'} in covers`)
  }
  return problems.length > 0 ? `scenario ${problems.join('; ')}` : null
}

export function createContext(page: Page) {
  const steps: StepRecord[] = []
  const checks: CheckRecord[] = []
  const reached = new Set<string>()

  const step: ScenarioContext['step'] = async (description, action) => {
    try {
      await action()
      steps.push({ description, ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] ?? '' : String(error)
      steps.push({ description, ok: false, error: message })
      throw new ScenarioFailure(`step failed: ${description}: ${message}`)
    }
  }

  const expect: ScenarioContext['expect'] = async (name, expected, read, { reaches, timeoutMs = 2000 } = {}) => {
    const deadline = Date.now() + timeoutMs
    let observed = await read()
    while (show(observed) !== show(expected) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      observed = await read()
    }
    const pass = show(observed) === show(expected)
    checks.push({ name, expected: show(expected), observed: show(observed), pass })
    if (!pass) {
      throw new ScenarioFailure(`expectation failed: ${name}`)
    }
    if (reaches) {
      reached.add(reaches)
    }
  }

  return { context: { page, step, expect } satisfies ScenarioContext, steps, checks, reached }
}
