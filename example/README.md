<img src="../assets/poteto.png" alt="poteto-kit" width="72" align="right">

# poteto-kit: a runnable example

This is the runnable example for **poteto-kit**, a kit for coming to trust coding agents. The agent **verifies** its own work by running the real app. A feature map tells it how to reach each feature. And hard guardrails turn CI red, instead of leaving you with soft rules and reminders. This small repo lets you **run** each mechanism and **watch it work**: the gate goes red on a violation, `verify` genuinely catches a bug when we deliberately plant one, and adding a feature is just adding a directory.

The app is a notes app (Vite + React + TypeScript) with three features: `sidebar`, `editor`, `search`. The conceptual docs are in `../docs/` and the template files are in `../templates/`. The agent-friendly architecture contract is at `../templates/guardrails/architecture-contract.md`.

## Quick start

Requirements: Node.js `^22.13.0 || ^24.0.0 || >=26.0.0` (the `engines` range in `package.json`: ESLint 10 needs `^20.19.0 || ^22.13.0 || >=24` and dependency-cruiser 18 needs `^22 || ^24 || >=26`, so the intersection is this range; `npm run verify -- doctor` checks it) and a Chromium already on your machine (the scripts do **not** download a browser). Chromium lookup order: the `CHROME_PATH` variable, then `~/.cache/ms-playwright/chromium-*`, then the `playwright-core` default path, then the system Chromium. If you don't have one: `npx playwright-core install chromium`.

```bash
npm install
npm run verify -- doctor
npm run gate
```

`gate` runs `lint`, `typecheck`, `check:deps`, `check:features`, `test:guardrails`, `verify:coverage`, `verify:all`, `verify:reached`, `verify:selftest` in order and stops at the first step that goes red. It takes about 1 minute (not counting `npm install`).

## What each piece proves

| Piece in the repo | The idea it proves |
| --- | --- |
| `npm run verify -- --feature <id>`, `verify:all`: build the app, open it in headless Chromium, run the scenario, write `screenshot.png`, `console.json`, `trace.json` (CDP `Tracing`), `report.md` | **Verification**: the agent runs the real app itself and submits evidence, instead of a human copy-pasting errors and screenshots to it. See `../docs/02-verification.md`. |
| `.agents/skills/verify-app/SKILL.md` | The control skill: when to use it, "pick one flow", the evidence it must submit. Template: `../templates/skills/verify-app/`. |
| `npm run verify -- doctor` | A read-only command that tells you whether this instance is worth driving: the browser, whether `dist/` is fresh or stale, who holds the port, worktree or main checkout, and whether the node version is inside `engines`. |
| The preview port is derived from a hash of the project path; if it is taken, it **refuses** rather than silently switching ports; an explicit `--port` is probed too and refused if busy. Verify only drives a server whose `/.verify-build.json` carries the nonce of the build it just made; `references/worktree-isolation.md` | Isolation for parallel runs: many agents and many worktrees don't trample each other, and never silently attach to someone else's server. |
| `.agents/skills/verify-app/references/features/`: `README.md`, `sidebar.md`, `editor.md`, `search.md`, `cross-cutting-flows.md` | **The feature map as a directory**: one file per feature, written from the user's point of view. The README has preconditions, driving conventions, proof and skip rules, the full-sweep order, and an index by area. See `../docs/03-feature-map.md`. |
| Each feature file: description + root selector, **Sub-features** (named ids), **How to get to it**, **Driving it** | The standard structure of a feature file, matching `_feature.template.md`. |
| Selectors by ARIA label and `data-component` / `data-action-id`, not test ids (see the section below) | The driving convention: prefer semantics and accessibility. |
| `covers: [...]` in scenarios + `reaches` on the assertions + `npm run verify:coverage` and `verify:reached` | A feature file is a **coverage set**: proving only one way in is not enough if the map still lists other buttons and shortcuts. A path that can't be reached must say so explicitly with `skip: <reason>`. `covers` is a claim; coverage counts only an entry point that a passing `expect(..., { reaches: '<id>' })` reached in the last `verify:all` run. |
| `npm run check:features` | The map must keep up with the code: every `src/features/<id>/` has an `<id>.md` and an index line, and vice versa. |
| `npm run verify:selftest` (the last step of `gate`) | Verify doesn't pass for show: with `INJECT_BUG=1` (a bug planted at build time), `verify:all` must go red on exactly the scenarios flagged `catchesInjectedBug: true`, and without the flag it is green. |
| `eslint.config.js`: bans `useEffect` and `useLayoutEffect` (import, member access and destructuring) and `import.meta.glob` outside `src/framework/discover.ts`; the `local/no-comments` rule | Hard guardrails: ban effects (a big React trap) and ban comments in TS/JS (agents write historical comments that go stale; CSS comments are not checked). See `../docs/06-guardrail-layers.md`. |
| `src/features/<id>/feature.tsx` + `src/framework/discover.ts` (`import.meta.glob`) | New work adds its own files and no branches in a shared root: features are **discovered** from a reserved file, with no code registry to edit; the only shared edit is one index line in the feature map. |
| `src/client/` (the store is built inside `commands.ts`; the `local/store-stays-private` lint rule fails if it is exported, aliased, its setter is passed around, or a command forwards a caller's function into `store.set`, so `commands.ts` is the only place that writes to it; import only through `@/client`) | Every durable value has one obvious writer. |
| `src/framework/` imports no features and no app code (the `framework-is-a-package` rule) | The package boundary: the framework never imports app code. |
| `src/electron/main` and `renderer` don't import each other (`check:deps`) | Forbidden dependencies fail mechanically. |
| The error messages from lint / depcruise / check all point to the **supported path** | An unsafe shortcut fails with an error that names the right path. |
| `npm run test:guardrails` and `guardrail-fixtures/` | Proves that each rule really fires, and that a clean tree is green. Every repeated review comment should become a rule like this (`../templates/guardrails/review-comment-to-rule.md`). |
| `AGENTS.md` | The architecture map, the shortest path to add a feature, banned patterns and why. |
| `../templates/ci/ci.yml` | Runs `doctor` and then `npm run gate` in CI, and uploads `artifacts/` when red. |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server so you can try the app yourself. |
| `npm run lint` | ESLint: bans `useEffect` and `useLayoutEffect`, bans every TS/JS comment, bans imports into another feature's internals, bans feature registries, bans reaching into `src/client` except through `@/client`, bans `import.meta.glob` outside the discovery file, keeps the `framework` boundary. |
| `npm run typecheck` | `tsc --noEmit` in strict mode. |
| `npm run check:deps` | dependency-cruiser: main/renderer, feature boundaries, one writer, framework boundary, `shared` stays a leaf, no circular imports. |
| `npm run check:features` | Reconciles `src/features/*` with `references/features/` (has `feature.tsx`, `<id>.md`, an index line, and vice versa). |
| `npm run verify:coverage` | Every id in the Sub-features / Flows section must have a scenario that `covers` it, or `skip: <reason>`. Static: it reads the scenario files. |
| `npm run verify:reached` | Reads `artifacts/verify-coverage.json`, which `verify:all` writes from what actually ran, and fails if a declared `covers` id was not reached by a passing `expect(..., { reaches })`, if a scenario is missing from the run, or if the run was built with `INJECT_BUG=1`. |
| `npm run test:guardrails` | Runs the real gates on each violating fixture (every lint, dependency and feature-map rule has one), on the clean tree, on "adding a feature with only new files" (all gates plus a real `verify --feature ping`), on port isolation and the build nonce, on the doctor's node range check and on the report's trace thresholds. |
| `npm run verify -- --help` | The usage text with every flag and exit code. Unknown options print it instead of a stack trace. |
| `npm run verify -- doctor` | A read-only report: the browser, whether `dist/` is fresh or stale, the port, the node version against `engines`, whether this is a git worktree. |
| `npm run verify -- --feature sidebar` | Runs every scenario of one feature; add `--scenario create-note` to run a single scenario; add `--port <n>` to choose the port (refused with exit 3 if something already holds it). |
| `npm run verify:all` | Runs every scenario and writes `artifacts/verify-coverage.json` (`{ scenarios: [{ name, passed, covers }] }`, the same shape `../templates/ci/check-coverage.mjs` reads) with the entry points each scenario really reached. Exits non-zero on a failed assertion, a console error, or a scenario that declares a `covers` id it never reached; exits 3 if it refuses because the port is taken. |
| `npm run verify:selftest` | Runs `verify:all` with and without `INJECT_BUG=1`, asserting the first run goes red on exactly the scenarios flagged `catchesInjectedBug` and the second is green. |
| `npm run gate` | Runs everything in the order above, ending with `verify:selftest`. |

Verify results land in `artifacts/<timestamp>/<feature>-<scenario>/`: `report.md` (the command, the steps, expected versus observed, PASS/FAIL, the count of long tasks (>50 ms, the Long Tasks API definition) and, on a separate line, of main-thread tasks over the 16.7 ms frame budget, both from the trace, artifact paths), `screenshot.png`, `console.json`, `trace.json`.

## Adding a feature: the shortest path

There is no code registry to edit; the only shared edit is one index line in the feature map. For example, to add a `ping` feature:

1. A directory `src/features/ping/` containing `index.ts` (the public export), the component, and `feature.tsx`:
   ```tsx
   export default defineFeature({ id: 'ping', title: 'Ping', order: 40, slots: { topbar: Ping } })
   ```
   (`defineFeature` comes from `@/framework`; the slots are `topbar`, `left`, `main`, `overlay`; read and change notes through `@/client`.)
2. `.agents/skills/verify-app/references/features/ping.md` (Sub-features with ids, How to get to it, Driving it) and one index line in the `README.md` in the same directory: ``- [`ping`](ping.md) — short description``.
3. `scripts/verify/scenarios/ping.ts` exporting `scenarios` with `covers: ['ping-send']`, and an `expect(..., { reaches: 'ping-send' })` on the assertion that proves it.
4. `npm run gate`.

The test `adding a feature is only new files` in `scripts/guardrails.test.ts` does exactly this in a temp directory, then asserts that lint, typecheck, check:deps, check:features and verify:coverage are green, that a real `verify --feature ping` on a free port passes, and that the new feature's code appears in the bundle without editing any code file. The fixtures `feature-missing-doc`, `feature-without-feature-file`, `doc-without-feature`, `index-entry-without-feature` prove that `check:features` goes red when a step is missed.

## Watch the gate "blow up" yourself

Run each experiment, look at the error, then undo it.

1. **Ban `useEffect`.** Add `import { useEffect } from 'react'` and call `useEffect(() => {}, [])` in `src/features/sidebar/sidebar.tsx`; `npm run lint` reports `useEffect and useLayoutEffect are banned ...` along with the alternative. `React.useEffect`, `React['useEffect']`, `const { useEffect: run } = React` and `useLayoutEffect` are caught too.
2. **Ban comments.** Add `// note` to a TS/JS file in `src/`: `local/no-comments`. `// eslint-disable-next-line` doesn't get around it either. (The ban covers TS/JS only; CSS comments are not checked.)
3. **Importing another feature's internals.** In `sidebar.tsx` add `import { commitTitle } from '@/features/editor/commit-title'`: both `lint` and `check:deps` go red.
4. **Feature registry.** Create `src/registry.ts` with `import { Sidebar } from '@/features/sidebar'`: red with `no-feature-registry`, and the error says to "add a directory with a `feature.tsx`".
5. **Two writers.** In a feature add `import { resetNotes } from '@/client/commands'`: red with `one-writer-notes-store`, and the error says to add a command in `src/client/commands.ts`. Inside `src/client`, add `export` to `const store` in `commands.ts` (so a second file could write `store.set(...)`): `npm run lint` fails with `local/store-stays-private` (this is the fixture `rogue-writer`; before that rule existed lint, typecheck and check:deps all passed on exactly this edit). `import.meta.glob('/src/client/*.ts')` anywhere but `src/framework/discover.ts` is a lint error, also as `import.meta['glob']` or `const { glob } = import.meta`.
6. **Framework that knows the app.** In `src/framework/` import `@/client` or `@/features/sidebar`: red with `framework-is-a-package`.
7. **main imports renderer.** In `src/electron/main/index.ts` import `@/electron/renderer`: `main-must-not-import-renderer`, and the error says to use `src/shared/ipc.ts`.
8. **A feature without docs.** `mkdir src/features/ghost`, then add `index.ts` and `feature.tsx`: `check:features` goes red with `feature-missing-doc` and `feature-missing-from-index`.
9. **The coverage set.** Remove `'search-open-button'` from the `covers` of the scenario `button-opens-and-click-selects`: `npm run verify:coverage` goes red with `verify-coverage-uncovered`, because the Search button is the second way in besides Ctrl/Meta+K. Then undo that, and instead delete the `{ reaches: 'editor-edit-title' }` option from the last `expect` of the scenario `edit-title-updates-sidebar`: `verify:all` fails that scenario (`covers [editor-edit-title] but no passing expect(..., { reaches })`) and `verify:reached` goes red with `verify-coverage-not-reached`, because a `covers` list is only a claim until a passing assertion backs it.
10. **Verify catches a real bug.** `npm run verify:selftest` builds with `INJECT_BUG=1` (the editor title doesn't update the sidebar): `editor/edit-title-updates-sidebar` and `cross-cutting/create-rename-find` must go red (they carry `catchesInjectedBug: true`), and the other seven scenarios stay green. See `report.md` in `artifacts/selftest-bug/`.
11. **A taken port.** Run another process holding the port that `npm run verify -- doctor` prints (for example `node -e "require('net').createServer().listen(<port>,'127.0.0.1');setInterval(()=>{},1e9)"` from a different directory): `npm run verify -- --feature sidebar` exits with code 3 and names the pid, and `doctor` prints `held by pid ...`; add `--port <another port>` and it runs normally. Passing the busy port as `--port` is refused the same way: verify never drives a server it did not start.
12. **The gate's own tests blow up too.** Change `severity: 'error'` to `'ignore'` for the `framework-is-a-package` rule in `.dependency-cruiser.cjs`, then run `npm run test:guardrails`: the `check:deps` tests of the three `framework-*-import*` fixtures go red. A good test is one that goes red when the mechanism is switched off.

## Selectors: ARIA and `data-*`, not test ids

The feature map prefers ARIA labels and semantic attributes (`data-component`, `data-action-id`), classes only as a last resort, and `data-testid` only when the feature file names it. This app follows that: every control has an accessible name (`aria-label="New note"`, `"Note title"`, `"Search query"`...), plus `data-component="note-item"`, `data-action-id="notes.create"`, `aria-current`, `aria-selected`. So no test ids are needed, and every selector also checks the UI's accessibility. The per-feature selector lists are in the "Driving it" section of each feature file; `scripts/verify/selectors.ts` is where scenarios get their locators.

## Taking this to your repo

1. **The skill and the feature map.** Copy `.agents/skills/verify-app/` (or use the template in `../templates/skills/verify-app/`), rewrite `SKILL.md` around your app's run command, and write one file per feature using the `_feature.template.md` template.
2. **The smallest, cheapest gate first.** Start with `local/no-comments` or a rule banning a pattern your reviews keep repeating, then `check:features`, `check:deps`.
3. **Write the fixture first.** For each new rule: add a directory in `guardrail-fixtures/`, add a case in `scripts/guardrails.test.ts`, watch it go red, and only then turn on the rule.
4. **Verify with the real app.** Replace `vite preview` with a way to run your app (web, Electron over CDP, simulator), and keep the artifacts as they are: screenshot, console log, trace, report. Keep `doctor` and deriving the port from the project path.
5. **Prove verify isn't hollow.** A build-time bug-injection flag (like `INJECT_BUG`) and a selftest for it.
6. **Discovery instead of registration.** Pick one reserved file per feature (here `feature.tsx`), let the framework find it itself, and ban importing features from anywhere else.
7. **CI.** Copy `../templates/ci/ci.yml` and adjust `working-directory`.
8. **AGENTS.md.** Copy `AGENTS.md`, adjust the architecture map and the banned-pattern list, and keep the line "run `npm run gate` before every PR, attach the verify report".

### For Claude Code, Cursor, Codex

The canonical place for skills is `.agents/skills/<name>/SKILL.md`: flat, one level, no grouping folders. Cursor and Codex read `.agents/skills` directly. Claude Code reads `.claude/skills`, so make that a symlink to the same directory instead of copying (this example already has it):

```bash
mkdir -p .claude
ln -s ../.agents/skills .claude/skills
```

Instructions follow the same rule: put them in `AGENTS.md`. Claude Code reads `AGENTS.md` only when there is no `CLAUDE.md`; if you keep a `CLAUDE.md`, put `@AGENTS.md` in it so it imports the same file.

On Windows, enable symlink creation permission when you clone.

## Known limits

- `electron/main` and `electron/renderer` are only mock modules to illustrate the boundary rules. There is no real Electron.
- `src/framework/discover.ts` uses `import.meta.glob('/src/features/*/feature.tsx')`. That is a path string and not an `import` statement, so the "framework doesn't import features" rule still holds. The trade-off is that this path is tied to the app's layout. Because a glob bypasses the import rules, lint bans `import.meta.glob` everywhere else.
- The names in the example ("Client", "Feature", "framework") are one small implementation of the architecture contract at `../templates/guardrails/architecture-contract.md`.
- The comment ban covers TS/JS only; there is no stylelint check, so CSS comments are allowed.
- The `useEffect` ban here is deliberately absolute. In a real project you may choose a deliberate list of exceptions, but put it in the config, not in a comment.
- Naming the process that holds a port uses `ss`, then `lsof`, and reads `/proc` or falls back to `ps`. The refusal itself does not depend on them (it is a bind probe), so on a machine with none of these tools verify still refuses, but names "an unknown process". The test that runs verify against a holder exercises the Linux `ss` path; a second test calls the holder lookup with `lsof` only; it has only been run on Linux, so macOS is expected to work but is not proven. Windows is not supported by the holder lookup.
- When the derived port is held by a process **from this very project** (another verify run still in progress), `verify` also refuses and prints `kill <pid>`; it does not stop that process itself.
