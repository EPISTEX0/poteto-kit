import type { Page } from 'playwright-core'

export type StepRecord = { description: string; ok: boolean; error?: string }

export type CheckRecord = { name: string; expected: string; observed: string; pass: boolean }

export type ScenarioContext = {
  page: Page
  step: (description: string, action: () => Promise<void>) => Promise<void>
  expect: <T>(name: string, expected: T, read: () => Promise<T>, timeoutMs?: number) => Promise<void>
}

export type Scenario = {
  feature: string
  name: string
  description: string
  covers: string[]
  run: (context: ScenarioContext) => Promise<void>
}

export class ScenarioFailure extends Error {}

const pollIntervalMs = 50

function show(value: unknown) {
  return JSON.stringify(value)
}

export function createContext(page: Page) {
  const steps: StepRecord[] = []
  const checks: CheckRecord[] = []

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

  const expect: ScenarioContext['expect'] = async (name, expected, read, timeoutMs = 2000) => {
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
  }

  return { context: { page, step, expect } satisfies ScenarioContext, steps, checks }
}
