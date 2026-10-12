import type { Scenario } from '../scenario'

export const scenarios: Scenario[] = [
  {
    feature: 'ghost',
    name: 'ghost-unlisted-scenario',
    description: 'Covers an id that no feature file lists.',
    covers: ['ghost-unlisted'],
    async run() {},
  },
]
