# Editor (`editor`)

The main pane. It shows a title field and a body text area for the selected note. With no selected note it shows "Select or create a note". Root selector: `[data-component="note-editor"]`.

## Sub-features

- `editor-edit-title` — typing in the title field renames the note, and the new title appears in the sidebar and in search.
- `editor-edit-body` — typing in the body text area changes the note body, which is still there after switching to another note and back.
- `editor-native-context-menu` — right-clicking the body opens the browser's own spelling and clipboard menu. skip: native browser menus cannot be driven in headless Chromium.

## How to get to it

- **`editor-edit-title`:** start the app; the first note is open. Click the title field at the top of the main pane and type.
- **`editor-edit-body`:** click the large text area under the title and type.
- **`editor-native-context-menu`:** right-click inside the body text area.

## Driving it

How to drive it with Playwright over the headless Chromium started by `npm run verify`.

- **Preconditions:** the baseline in `README.md`.
- **Chords per OS:** none.
- **Selectors:** root `[data-component="note-editor"]` (with `data-note-id` matching the sidebar row); title `[aria-label="Note title"]`; body `[aria-label="Note body"]`; empty state `[data-component="editor-empty"]`.
- **Command ids** (documentation only): `updateNote` in `src/client/commands.ts`, reached through `src/features/editor/commit-title.ts` for the title.
- **Observable end states** to poll: the title field value, the body field value, and, for a rename, the text of the selected sidebar row.
- **Gotchas:** set the title with `fill`, which replaces the whole value; key presses append. The title field keeps a per-note draft and also commits to the store, and a build with `INJECT_BUG=1` turns that commit into a no-op, so the field looks right while the sidebar stays stale. Always assert on the sidebar, not only on the field.
