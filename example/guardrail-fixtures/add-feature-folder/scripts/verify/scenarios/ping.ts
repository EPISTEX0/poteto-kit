import type { Scenario } from '../scenario'

export const scenarios: Scenario[] = [
  {
    feature: 'ping',
    name: 'ping-button-is-visible',
    description: 'The ping button is rendered in the top bar.',
    covers: ['ping-send'],
    async run({ page, expect }) {
      await expect('ping button is present', 1, () => page.locator('[data-action-id="ping.send"]').count())
    },
  },
]
