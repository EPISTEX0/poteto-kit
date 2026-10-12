import type { Scenario } from '../scenario'
import { ui } from '../selectors'

export const scenarios: Scenario[] = [
  {
    feature: 'editor',
    name: 'edit-title-updates-sidebar',
    description: 'Typing a new title in the editor renames the note in the sidebar.',
    covers: ['editor-edit-title'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await expect('first seed note is open', 'Welcome to Notes', () => u.title.inputValue())
      await step('Replace the title with "Renamed note"', () => u.title.fill('Renamed note'))
      await expect('editor shows the new title', 'Renamed note', () => u.title.inputValue())
      await expect('sidebar row shows the new title', 'Renamed note', () => u.noteRows.first().innerText())
    },
  },
  {
    feature: 'editor',
    name: 'edit-body-persists',
    description: 'A typed body is still there after switching to another note and back.',
    covers: ['editor-edit-body'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Type a body into the first note', () => u.body.fill('Remember to attach the verify report.'))
      await step('Switch to the second note', () => u.noteRows.nth(1).click())
      await expect('second note body is its own', 'Review the verification report before merging.', () =>
        u.body.inputValue(),
      )
      await step('Switch back to the first note', () => u.noteRows.first().click())
      await expect('first note body was kept', 'Remember to attach the verify report.', () => u.body.inputValue())
    },
  },
]
