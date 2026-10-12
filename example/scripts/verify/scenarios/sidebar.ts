import type { Scenario } from '../scenario'
import { ui } from '../selectors'

const seedTitles = ['Welcome to Notes', 'Meeting agenda', 'Grocery list']

export const scenarios: Scenario[] = [
  {
    feature: 'sidebar',
    name: 'create-note',
    description: 'New note adds an Untitled note at the top, selects it and opens it in the editor.',
    covers: ['sidebar-new-note'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await expect('seed notes are listed', seedTitles, () => u.noteRows.allTextContents())
      await step('Click "New note"', () => u.newNote.click())
      await expect('note list has the new note first', ['Untitled note', ...seedTitles], () =>
        u.noteRows.allTextContents(),
      )
      await expect('new note is the selected row', 'Untitled note', () => u.selectedRow.innerText())
      await expect('editor shows the new note title', 'Untitled note', () => u.title.inputValue())
    },
  },
  {
    feature: 'sidebar',
    name: 'select-note',
    description: 'Clicking a sidebar row opens that note in the editor.',
    covers: ['sidebar-select-note'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Click the "Grocery list" row', () => u.noteRows.filter({ hasText: 'Grocery list' }).click())
      await expect('clicked row is selected', 'Grocery list', () => u.selectedRow.innerText())
      await expect('editor title is the clicked note', 'Grocery list', () => u.title.inputValue())
      await expect('editor body is the clicked note body', 'Oat milk, coffee beans, lemons.', () =>
        u.body.inputValue(),
      )
    },
  },
]
