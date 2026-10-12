import type { Page } from 'playwright-core'

export const appReady = '[data-component="notes-sidebar"]'

export function ui(page: Page) {
  return {
    newNote: page.locator('[data-action-id="notes.create"]'),
    noteRows: page.locator('[data-component="note-item"]'),
    selectedRow: page.locator('[data-component="note-item"][aria-current="true"]'),
    title: page.locator('[aria-label="Note title"]'),
    body: page.locator('[aria-label="Note body"]'),
    searchButton: page.locator('[data-action-id="search.open"]'),
    searchPalette: page.locator('[data-component="search-palette"]'),
    searchInput: page.locator('[aria-label="Search query"]'),
    searchResults: page.locator('[data-component="search-result"]'),
    activeResult: page.locator('[data-component="search-result"][aria-selected="true"]'),
  }
}
