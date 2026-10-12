import type { Scenario } from '../scenario'

export const scenarios: Scenario[] = [
  {
    feature: 'ghost',
    name: 'ghost-covered-scenario',
    description: 'Covers an entry point that still says skip.',
    covers: ['ghost-covered'],
    async run() {},
  },
]
