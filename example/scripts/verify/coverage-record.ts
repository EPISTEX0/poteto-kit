import { join } from 'node:path'
import { passed, type RunResult } from './report'

export type CoverageRecord = {
  generatedAt: string
  command: string
  injectBug: boolean
  scenarios: { name: string; passed: boolean; covers: string[] }[]
}

export function coverageRecordPath() {
  return join(process.env.VERIFY_ARTIFACTS_DIR ?? 'artifacts', 'verify-coverage.json')
}

export function buildCoverageRecord(results: RunResult[]): CoverageRecord {
  return {
    generatedAt: new Date().toISOString(),
    command: 'npm run verify:all',
    injectBug: results.some((result) => result.injectBug),
    scenarios: results.map((result) => ({
      name: `${result.feature}/${result.scenario}`,
      passed: passed(result),
      covers: passed(result) ? result.reached : [],
    })),
  }
}
