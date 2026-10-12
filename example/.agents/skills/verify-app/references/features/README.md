# Feature map

## Purpose
This directory describes every user-facing feature of the Notes app from the user's point of view: what it is, how to reach it, how to use it and how to drive it in a browser. There is one file per feature, plus `cross-cutting-flows.md` for journeys that span features. Read the file for the feature you are about to touch before you drive or reproduce anything.

These files teach how to use a feature, not how it is built. For internals read the code under `src/features/<id>/`; code changes faster than any document. Treat this directory as the maintained source for verification: `npm run check:features` and `npm run verify:coverage` fail when it drifts from the code or from the scenarios.

## Mapping a vague report to a feature
Reports are often a screenshot and "???". Do not grep the code first. Read every piece of visible text in the report (labels, button names, titles), search this directory for that text, open the matching file, follow **How to get to it**, reproduce with **Driving it**, and capture evidence. State the mapping in your report ("the screenshot shows X in the top bar, which is sub-feature `search-open-button`"). If nothing matches, say so, list the text you tried, and add the missing file afterwards.

## Baseline preconditions
Unless a feature file says otherwise:
- The app is built and served by the verify command (or by `npm run dev`), and `npm run verify -- doctor` reports no problems.
- The page has loaded and the sidebar shows the three seed notes: "Welcome to Notes", "Meeting agenda", "Grocery list". The first one is selected.
- No search palette is open. There is no login, no settings dialog and no toast to dismiss.
- `INJECT_BUG` is unset when the build is used as evidence. A build with `INJECT_BUG=1` is only for `npm run verify:selftest`.

## Driving conventions
- Prefer ARIA labels and semantic data attributes: `[aria-label="..."]`, `[data-component="..."]`, `[data-action-id="..."]`, `[aria-current]`, `[aria-selected]`. Class names are a last resort. Test ids are not used in this app because every control already has an accessible name; add one only when a feature file names it.
- Prefer the registered keyboard chord over a coordinate click when a feature has one, because it exercises the power-user path. Use Control on Linux and Windows, Meta on macOS.
- Do not call app commands through `evaluate`. Use `evaluate` only to read DOM state.
- Wait on observable end states (an element appears, a label changes, a count settles), not on fixed sleeps. The scenario helper `expect` polls for a short time and records expected versus observed.
- Run with the console watched: a flow whose expected result is "no errors" must leave `console.json` empty.
- Native browser UI (context menus, file pickers, OS dialogs) cannot be driven headlessly; mark those entry points `skip: <reason>` instead of faking them.

## Proof and skip reporting
A feature file defines the coverage set: every id listed under its `## Sub-features` heading is an entry point or behavior that proof must reach. `cross-cutting-flows.md` adds the shared journeys under `## Flows`.

- A proof that exercises only one convenient entry point is incomplete when the file lists others, for example a keyboard chord and a button that do the same thing. Cover each reachable entry point, and the success, cancel and empty paths your change can affect.
- Record the action and the final observable state. A synthetic setup that bypasses the user path does not count.
- A scenario declares what it proves with `covers: ['<id>', ...]`. `npm run verify:coverage` fails for any listed id that no scenario covers.
- When a path cannot be reached, say so in the file: end that id's line with `skip: <reason>`. The reason names what blocks it. Cover the closest real path with a scenario instead, and expect the skip to show up in the coverage output.

## Full sweep
Walk the files in this order, then finish with the flows: `sidebar`, `editor`, `search`, `cross-cutting-flows`. In practice this is `npm run verify:all`. Anything that breaks and is not covered by a scenario becomes a follow-up, not a footnote.

## Index
Format, one line per feature file, exactly: ``- [`<feature-id>`](<feature-id>.md) — one-line scope``, grouped by area under `###` headings. Every directory under `src/features/` has a line here and a file next to this README, and the reverse; `npm run check:features` enforces it.

### Notes
- [`sidebar`](sidebar.md) — the note list and the New note button.
- [`editor`](editor.md) — the title and body of the selected note.

### Finding
- [`search`](search.md) — the Ctrl/Meta+K palette and the Search button.

### Cross-cutting
- [Cross-cutting flows](cross-cutting-flows.md) — journeys that span several features.
