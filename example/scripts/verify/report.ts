import type { CheckRecord, StepRecord } from './scenario'
import type { TraceSummary } from './trace'
import { frameBudgetMs, longTaskThresholdMs } from './trace'

export type ConsoleEntry = { kind: 'console.error' | 'pageerror'; text: string; location?: string }

export type RunResult = {
  feature: string
  scenario: string
  description: string
  command: string
  appUrl: string
  injectBug: boolean
  startedAt: string
  durationMs: number
  steps: StepRecord[]
  checks: CheckRecord[]
  reached: string[]
  consoleEntries: ConsoleEntry[]
  trace: TraceSummary | null
  failure: string | null
  artifactDir: string
}

export function passed(result: RunResult) {
  return result.failure === null && result.consoleEntries.length === 0
}

function cell(text: string) {
  return text.replaceAll('|', '\\|')
}

export function renderReport(result: RunResult) {
  const lines: string[] = [
    `# Verify report: ${result.feature} / ${result.scenario}`,
    '',
    `- **Result:** ${passed(result) ? 'PASS' : 'FAIL'}`,
    `- **Command:** \`${result.command}\``,
    `- **Started:** ${result.startedAt} (${(result.durationMs / 1000).toFixed(1)}s)`,
    `- **App:** ${result.appUrl} (INJECT_BUG=${result.injectBug ? '1' : 'unset'})`,
    `- **Scenario:** ${result.description}`,
  ]
  if (result.failure) {
    lines.push(`- **Failure:** ${result.failure}`)
  }

  lines.push('', '## Steps', '')
  result.steps.forEach((step, index) => {
    const detail = step.error ? ` -- ${step.error}` : ''
    lines.push(`${index + 1}. [${step.ok ? 'ok' : 'FAILED'}] ${step.description}${detail}`)
  })
  if (result.steps.length === 0) {
    lines.push('(no interaction steps)')
  }

  lines.push('', '## Expected vs observed', '', '| Check | Expected | Observed | Result |', '| --- | --- | --- | --- |')
  for (const check of result.checks) {
    lines.push(
      `| ${cell(check.name)} | \`${cell(check.expected)}\` | \`${cell(check.observed)}\` | ${check.pass ? 'pass' : 'FAIL'} |`,
    )
  }

  lines.push('', '## Entry points reached', '')
  lines.push(result.reached.length > 0 ? result.reached.map((id) => `- \`${id}\``).join('\n') : '- none')

  lines.push('', '## Console', '')
  lines.push(`- Errors: ${result.consoleEntries.length} (details in \`console.json\`)`)
  for (const entry of result.consoleEntries) {
    lines.push(`  - ${entry.kind}: ${entry.text}`)
  }

  lines.push('', '## Performance trace', '')
  if (result.trace) {
    lines.push(`- Long tasks (>${longTaskThresholdMs} ms): ${result.trace.longTasks}`)
    lines.push(`- Tasks over the ${frameBudgetMs} ms frame budget: ${result.trace.tasksOverFrameBudget}`)
    lines.push(`- Longest task: ${result.trace.longestTaskMs}ms`)
    lines.push(`- Renderer main-thread tasks: ${result.trace.rendererMainTasks}`)
    lines.push(`- Trace events: ${result.trace.eventCount}`)
  } else {
    lines.push('- Trace unavailable')
  }

  lines.push('', '## Artifacts', '')
  for (const file of ['screenshot.png', 'console.json', 'trace.json', 'report.md']) {
    lines.push(`- \`${result.artifactDir}/${file}\``)
  }
  return `${lines.join('\n')}\n`
}
