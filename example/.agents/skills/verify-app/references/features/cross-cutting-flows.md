# Cross-cutting flows

Journeys that cross feature boundaries. Each one passes through the real user path across features; do not shortcut it by writing state directly.

## Flows

- `flow-create-rename-find` — create a note, give it a new title and body, find it again through search, and see it selected everywhere.

## How to get to it

- **`flow-create-rename-find`:** click New note in the sidebar, type a title in the editor, press Ctrl+K (Meta+K on macOS), type part of that title, press Enter.

## Driving it

How to drive it with Playwright over the headless Chromium started by `npm run verify`.

- **Preconditions:** the baseline in `README.md`.
- **Chords per OS:** macOS `press "Meta+K"`; Windows and Linux `press "Control+K"`.
- **Selectors:** see `sidebar`, `editor` and `search`. Steps: click `[data-action-id="notes.create"]`; `fill` `[aria-label="Note title"]` with "Quarterly plan"; `fill` `[aria-label="Note body"]`; press the open chord; type "quarterly"; check that `[data-component="search-result"]` lists exactly "Quarterly plan"; press Enter.
- **Observable end states** to poll: palette closed, the editor title reads "Quarterly plan", and the selected sidebar row reads "Quarterly plan".
- **Gotchas:** if the rename never reaches the notes store (see `editor`), the flow fails at the search step with an empty result list, which is the intended symptom. It is the second scenario that `npm run verify:selftest` expects to fail under `INJECT_BUG=1`.
