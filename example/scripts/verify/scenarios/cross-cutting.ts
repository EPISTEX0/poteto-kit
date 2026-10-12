import type { Scenario } from '../scenario'
import { ui } from '../selectors'

export const scenarios: Scenario[] = [
  {
    feature: 'cross-cutting',
    name: 'create-rename-find',
    description: 'Create a note, rename it, find it through search and see it selected everywhere.',
    covers: ['flow-create-rename-find'],
    catchesInjectedBug: true,
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Click "New note"', () => u.newNote.click())
      await step('Rename it to "Quarterly plan"', () => u.title.fill('Quarterly plan'))
      await step('Type a body', () => u.body.fill('Budget and hiring.'))
      await step('Press Control+K', () => page.keyboard.press('Control+K'))
      await step('Type "quarterly"', () => page.keyboard.type('quarterly'))
      await expect('search finds exactly the renamed note', ['Quarterly plan'], () =>
        u.searchResults.allTextContents(),
      )
      await step('Press Enter', () => page.keyboard.press('Enter'))
      await expect('search palette closed', 0, () => u.searchInput.count())
      await expect('editor shows the renamed note', 'Quarterly plan', () => u.title.inputValue())
      await expect('sidebar highlights the renamed note', 'Quarterly plan', () => u.selectedRow.innerText(), {
        reaches: 'flow-create-rename-find',
      })
    },
  },
]
