# Search (`search`)

A palette for jumping to a note by name or text. It opens from a keyboard chord or from the Search button in the top bar, filters notes as you type (case-insensitive over title and body) and selects one with Enter or a click. Root selector: `[data-component="search-palette"]`, which exists only while the palette is open.

## Sub-features

- `search-open-chord` — pressing Ctrl+K (Meta+K on macOS) opens the palette with the query field focused.
- `search-open-button` — clicking the Search button in the top bar opens the same palette.
- `search-filter` — typing narrows the result list to notes whose title or body contains the text.
- `search-navigate-arrows` — ArrowDown and ArrowUp move the active result, wrapping at both ends.
- `search-select-enter` — Enter selects the active result, closes the palette and opens that note.
- `search-select-click` — clicking a result does the same as Enter on it.
- `search-close-escape` — Escape closes the palette and leaves the selection unchanged.

## How to get to it

- **`search-open-chord`:** start the app, then press Ctrl+K on Linux or Windows, Meta+K on macOS. The page must have focus.
- **`search-open-button`:** start the app and click Search at the right of the top bar.
- **`search-filter`:** open the palette and type; with an empty query all notes are listed.
- **`search-navigate-arrows`:** with the palette open, press ArrowDown or ArrowUp. The first result is active when the palette opens or the query changes.
- **`search-select-enter`:** with a result active, press Enter.
- **`search-select-click`:** click any result.
- **`search-close-escape`:** press Escape while the query field is focused.

## Driving it

How to drive it with Playwright over the headless Chromium started by `npm run verify`.

- **Preconditions:** the baseline in `README.md`; the page has finished loading.
- **Chords per OS:** macOS `press "Meta+K"`; Windows and Linux `press "Control+K"`.
- **Selectors:** Search button `[data-action-id="search.open"]` (also `[aria-label="Open search"]`); palette `[data-component="search-palette"]` (role dialog, `[aria-label="Search notes"]`); query field `[aria-label="Search query"]`; results `[data-component="search-result"]` inside `[role="listbox"]`, the active one has `aria-selected="true"`.
- **Command ids** (documentation only): `search.open`, bound in `src/features/search/search-palette.tsx` through a ref callback on the host element, and from the button in `src/features/search/search-button.tsx`.
- **Observable end states** to poll: the palette is gone (`[data-component="search-palette"]` count is 0), the editor title matches the chosen note, and the sidebar row with `aria-current="true"` is the same note.
- **Gotchas:** the palette is not in the DOM while closed, so wait for the query field after opening. The chord is bound on `document`, so it works from any focus inside the page, but not before the page has loaded. The chord and the button are separate code paths; cover both.
