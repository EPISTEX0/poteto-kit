import type { Scenario } from '../scenario'
import { ui } from '../selectors'

export const scenarios: Scenario[] = [
  {
    feature: 'search',
    name: 'shortcut-filters-and-selects',
    description: 'Ctrl+K opens search, typing filters the notes, Enter selects the match and closes the palette.',
    covers: ['search-open-chord', 'search-filter', 'search-select-enter'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await expect('search palette starts closed', 0, () => u.searchInput.count())
      await step('Press Control+K', () => page.keyboard.press('Control+K'))
      await expect(
        'query field is open and focused',
        true,
        () => u.searchInput.evaluate((input) => input === document.activeElement),
        { reaches: 'search-open-chord' },
      )
      await expect('all notes are listed before typing', 3, () => u.searchResults.count())
      await step('Type "groc"', () => page.keyboard.type('groc'))
      await expect('a title match leaves only that note', ['Grocery list'], () => u.searchResults.allTextContents())
      await step('Replace the query with "OAT MILK", words that appear only in a body, in capitals', async () => {
        await page.keyboard.press('Control+A')
        await page.keyboard.type('OAT MILK')
      })
      await expect(
        'a body-only match in other letter case leaves only that note',
        ['Grocery list'],
        () => u.searchResults.allTextContents(),
        { reaches: 'search-filter' },
      )
      await step('Press Enter', () => page.keyboard.press('Enter'))
      await expect('search palette closed', 0, () => u.searchInput.count())
      await expect('editor opened the selected note', 'Grocery list', () => u.title.inputValue())
      await expect('sidebar highlights the selected note', 'Grocery list', () => u.selectedRow.innerText(), {
        reaches: 'search-select-enter',
      })
    },
  },
  {
    feature: 'search',
    name: 'meta-shortcut-and-escape',
    description: 'Meta+K also opens search and Escape closes it without changing the selection.',
    covers: ['search-open-chord', 'search-close-escape'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Press Meta+K', () => page.keyboard.press('Meta+K'))
      await expect('query field is open', 1, () => u.searchInput.count(), { reaches: 'search-open-chord' })
      await step('Press Escape', () => page.keyboard.press('Escape'))
      await expect('search palette closed', 0, () => u.searchInput.count())
      await expect('selection unchanged', 'Welcome to Notes', () => u.title.inputValue(), {
        reaches: 'search-close-escape',
      })
    },
  },
  {
    feature: 'search',
    name: 'button-opens-and-click-selects',
    description: 'The Search button opens the palette and clicking a result selects that note.',
    covers: ['search-open-button', 'search-select-click'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Click the Search button', () => u.searchButton.click())
      await expect(
        'query field is open and focused',
        true,
        () => u.searchInput.evaluate((input) => input === document.activeElement),
        { reaches: 'search-open-button' },
      )
      await step('Click the "Meeting agenda" result', () =>
        u.searchResults.filter({ hasText: 'Meeting agenda' }).click(),
      )
      await expect('search palette closed', 0, () => u.searchInput.count())
      await expect('editor opened the clicked note', 'Meeting agenda', () => u.title.inputValue())
      await expect('sidebar highlights the clicked note', 'Meeting agenda', () => u.selectedRow.innerText(), {
        reaches: 'search-select-click',
      })
    },
  },
  {
    feature: 'search',
    name: 'arrow-navigation',
    description: 'ArrowDown and ArrowUp move the active result, wrapping at both ends, and Enter selects the active one.',
    covers: ['search-navigate-arrows'],
    async run({ page, step, expect }) {
      const u = ui(page)
      await step('Press Control+K', () => page.keyboard.press('Control+K'))
      await expect('first result is active', 'Welcome to Notes', () => u.activeResult.innerText())
      await step('Press ArrowDown twice', async () => {
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
      })
      await expect('third result is active', 'Grocery list', () => u.activeResult.innerText())
      await step('Press ArrowDown to wrap', () => page.keyboard.press('ArrowDown'))
      await expect('active result wrapped to the first', 'Welcome to Notes', () => u.activeResult.innerText())
      await step('Press ArrowUp to wrap back', () => page.keyboard.press('ArrowUp'))
      await expect('active result wrapped to the last', 'Grocery list', () => u.activeResult.innerText(), {
        reaches: 'search-navigate-arrows',
      })
      await step('Press Enter', () => page.keyboard.press('Enter'))
      await expect('search palette closed', 0, () => u.searchInput.count())
      await expect('editor opened the arrow-selected note', 'Grocery list', () => u.title.inputValue())
      await expect('sidebar highlights the arrow-selected note', 'Grocery list', () => u.selectedRow.innerText())
    },
  },
]
