---
name: verify-app
description: Run the real Notes app in headless Chromium, drive it through a feature's scenarios, and produce evidence (screenshot, console log, CDP performance trace, report). Use after any change to src/ and before claiming a feature works, a bug is fixed, or opening a PR. Also use to reproduce a vague bug report or screenshot.
---

# verify-app

Never claim "it works" from reading code or from a green type check. Run the app, drive it, and attach the evidence.

## Pick a flow
1. Run `npm run verify -- doctor` when anything looks off, or before a first run in a new copy. It is read-only and tells you whether this instance is worth driving: browser found, `dist/` fresh, preview port free or who holds it, node version, git worktree or not.
2. Find the feature in [references/features/README.md](references/features/README.md) (index by area), then read its file. The README has the baseline preconditions, driving conventions and the rules for proof and skips. Read it once per session.
3. Reproduce or verify with a scenario, then fix, then verify again.

Several copies or worktrees at once: see [references/worktree-isolation.md](references/worktree-isolation.md). The preview port is derived from the project path; if another process holds it, the command refuses instead of silently using a different port.

## Commands
Run from the repository root (the directory with `package.json`).

| Goal | Command |
| --- | --- |
| Usage and every flag | `npm run verify -- --help` |
| Health of this instance | `npm run verify -- doctor` |
| One feature, all its scenarios | `npm run verify -- --feature <feature-id>` |
| One scenario | `npm run verify -- --feature <feature-id> --scenario <scenario-name>` |
| Everything | `npm run verify:all` |
| Every listed entry point has a scenario or a stated skip | `npm run verify:coverage` |
| Prove verification can fail | `npm run verify:selftest` |

The command builds the app, starts `vite preview` on the derived port, launches headless Chromium with `playwright-core`, runs the scenarios, and stops everything it started. It exits non-zero on any failed assertion, console error or uncaught page error, and with code 3 when it refuses to start because the port is taken.

Environment and flags:
- `--port <n>`: use this preview port instead of the derived one. If something else already holds it, verify refuses with exit 3 and names the holder; it never drives a server it did not start (it checks the nonce in `/.verify-build.json` against the build it just made).
- `CHROME_PATH`: use this browser binary. Otherwise the newest `~/.cache/ms-playwright/chromium-*`, then Playwright's default path, then a system Chromium. Nothing is downloaded.
- `INJECT_BUG=1`: build-time flag that breaks the editor title commit on purpose. Only `verify:selftest` should use it.
- `VERIFY_ARTIFACTS_DIR`: where to write artifacts (default `artifacts/`).

## Evidence
Each scenario writes `artifacts/<timestamp>/<feature>-<scenario>/`:
- `report.md`: command, steps, expected vs observed table, PASS/FAIL, console error count, long tasks (>50 ms) and tasks over the 16.7 ms frame budget, artifact paths. Read this first.
- `screenshot.png`: final state of the page. Look at it; a passing assertion can still sit on a broken layout.
- `console.json`: console errors and uncaught page errors. Must be `[]`.
- `trace.json`: CDP `Tracing` performance trace (open in the Chrome DevTools Performance panel or Perfetto).

When you report back, quote the `report.md` result line and the failing "Expected vs observed" rows, not a paraphrase. Name the entry points you covered by their ids (for example `search-open-chord`, `search-open-button`) and any you skipped, with the reason.

## Selectors
Prefer ARIA labels and semantic data attributes: `[aria-label]`, `[data-component]`, `[data-action-id]`, `[aria-current]`, `[aria-selected]`. They are listed in each feature file under "Driving it". Do not select by class or DOM position. Scenarios get their locators from `scripts/verify/selectors.ts`.

## Adding or changing a scenario
1. Create or edit `scripts/verify/scenarios/<feature-id>.ts` exporting `scenarios: Scenario[]`. Files in that directory are discovered; there is no registry to edit.
2. Declare `covers: [...]` with the ids from the feature file's Sub-features (or Flows) list. If you add an entry point, add its id to the feature file in the same change.
3. Use `expect(name, expected, read)` for every outcome; it polls briefly, then records expected vs observed. Use `step(description, action)` for interactions.
4. Prove it can fail: break the behaviour (or use the `INJECT_BUG` pattern) and watch the scenario go red before trusting it.
5. Run `npm run verify:coverage` and `npm run check:features`.

## Rules
- A scenario that cannot fail is not verification. Every new scenario must be seen failing once.
- A proof that drives one convenient entry point is incomplete when the feature file lists others (a chord and a button, for example).
- Do not weaken an assertion or raise a timeout to get green. Fix the app or explain the discrepancy.
- Console errors fail the run on purpose. Do not filter them out.
- Unreachable paths are never dropped silently: end the id's line in the feature file with `skip: <reason>` and cover the closest real path.
