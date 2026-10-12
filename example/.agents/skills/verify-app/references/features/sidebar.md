# Sidebar and note list (`sidebar`)

The left column of the app. It lists every note by title, highlights the selected one, and has a New note button above the list. Root selector: `[data-component="notes-sidebar"]`.

## Sub-features

- `sidebar-new-note` — the New note button adds an "Untitled note" at the top of the list, selects it and opens it in the editor.
- `sidebar-select-note` — clicking a note in the list selects it and shows it in the editor.

## How to get to it

- **`sidebar-new-note`:** start the app and click New note at the top of the left column.
- **`sidebar-select-note`:** start the app and click any title in the list. Selection moves to the clicked note immediately.

## Driving it

How to drive it with Playwright over the headless Chromium started by `npm run verify`.

- **Preconditions:** the baseline in `README.md`.
- **Chords per OS:** none; the sidebar has no keyboard chord.
- **Selectors:** root `[data-component="notes-sidebar"]`; New note `[data-action-id="notes.create"]` (also `[aria-label="New note"]`); each row `[data-component="note-item"]` with a `data-note-id`; the selected row has `aria-current="true"`.
- **Command ids** (documentation only; they point at the handler): `notes.create`, handled by `createNote` in `src/client/commands.ts`.
- **Observable end states** to poll: the ordered text of all `[data-component="note-item"]` rows (after New note the first row is "Untitled note" and the list is one longer); which row has `aria-current="true"`; the editor title matching the selected row.
- **Gotchas:** every new note starts with the same title, so tell rows apart by position or `data-note-id`. The sidebar shows titles from the shared notes store; if the editor shows a new title but the sidebar does not, the editor did not commit it (see `editor`).
