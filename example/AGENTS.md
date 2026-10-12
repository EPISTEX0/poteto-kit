# AGENTS.md

A small notes app (Vite + React + TypeScript) built to be safe for coding agents to change. Rules here are enforced by CI, not by good intentions: if a rule matters it has a gate, and if a gate fails the change is not done.

## Before any PR
Run `npm run gate` and attach the verify report (`artifacts/<timestamp>/*/report.md`) to the PR. `gate` runs, in order: `lint`, `typecheck`, `check:deps`, `check:features`, `test:guardrails`, `verify:coverage`, `verify:all`, `verify:reached`, `verify:selftest`. Do not skip a step, do not edit a gate to make it pass. If a gate seems wrong, say so in the PR and change the gate in its own commit.

## Why the layout looks like this
Contributors, human or agent, arrive with a narrow prompt, a few nearby files and no full model of the app. They copy the nearest working pattern, edit the file that is already open, take the shortest path that compiles and avoid deleting code whose callers they cannot see. This repo treats that as a design input (the agent-friendly architecture contract, see `../templates/guardrails/architecture-contract.md`): the locally obvious change should be the globally correct one, forbidden dependencies fail mechanically, every durable value has one writer, new work adds isolated files instead of branches in shared roots, and every unsafe shortcut fails with an error that names the supported path.

## Architecture map
```
src/
  main.tsx                 entry: starts main, loads notes through the renderer, mounts the shell with the app name
  app-config.ts            app-owned constants (the app name); the framework receives them as props and never names the app
  framework/               tiny standalone package: feature discovery + shell. Imports nothing from src.
  client/                  the one writer of durable notes state
    commands.ts            builds the store, keeps it private (lint-enforced) and holds every mutation; exports commands + useNotesState
    index.ts               public surface: commands + useNotesState
  features/<feature-id>/   one folder per feature, self-contained
    feature.tsx            reserved file: default-exports defineFeature({ id, title, order, slots })
    index.ts(x)            the only file other features may import
  electron/main/           stand-in for the Electron main process
  electron/renderer/       stand-in for the Electron renderer process
  shared/                  types, store factory, IPC contract; imports nothing above it
.agents/skills/verify-app/ how to run and verify the app; references/features/ is the feature map
scripts/                   check-features, verify-coverage, verify CLI + scenarios, guardrail tests
guardrail-fixtures/        one deliberately violating example per rule (never imported by the app)
```
Features: `sidebar`, `editor`, `search`. Feature docs, selectors and entry-point ids: `.agents/skills/verify-app/references/features/`.

Imports: use `@/` for anything outside your own directory and `./` inside it. Another feature is reachable only as `@/features/<id>` (its index). App state is reached only as `@/client`.

## Add a feature (shortest path)
There is no code registry to edit; the only shared edit is one index line in the feature map. A feature is discovered from `src/features/<id>/feature.tsx`.
1. Create `src/features/<id>/` with `index.ts` (public export), your component(s), and `feature.tsx`:
   `export default defineFeature({ id: '<id>', title: '...', order: 40, slots: { main: MyComponent } })`. Slots: `topbar`, `left`, `main`, `overlay`. Read and change notes through `@/client`.
2. Write `.agents/skills/verify-app/references/features/<id>.md` (Sub-features list with ids, How to get to it, Driving it) and add one index line to that directory's `README.md`: ``- [`<id>`](<id>.md) — scope``.
3. Add `scripts/verify/scenarios/<id>.ts` exporting `scenarios` with `covers: ['<sub-feature-id>', ...]`, and tag the assertion that proves each id: `expect(name, expected, read, { reaches: '<sub-feature-id>' })`. Watch each scenario fail once before trusting it.
4. `npm run gate`.

The guardrail test `adding a feature is only new files` does exactly this in a sandbox with a `ping` feature: it runs lint, typecheck, check:deps, check:features and verify:coverage, then a real `verify --feature ping`, and checks that the feature reached the bundle without editing any code file.

## Banned patterns and why
| Pattern | Enforced by | Why / what to do instead |
| --- | --- | --- |
| `useEffect` and `useLayoutEffect` (import, `React.useEffect`, `React['useEffect']`, `const { useEffect } = React`) | `npm run lint` | Effects hide data flow and cause stale-state bugs agents cannot see. Derive during render, update in event handlers, use `useSyncExternalStore` or a ref callback. |
| Code comments in TS/JS (including `eslint-disable`; CSS comments are not checked) | `npm run lint`, rule `local/no-comments` | Agents write comments about history that go stale and are never checked. Use names, types and tests; explain in the PR. Inline lint config is also disabled. |
| Importing another feature's internals | `lint`, `check:deps` | Cross-feature access goes through the other feature's `index` only. |
| Importing a feature from outside `src/features` (a registry, a hard-wired list) | `lint`, `check:deps` (`no-feature-registry`) | Features are discovered from `feature.tsx`; add a folder instead of editing a shared root. |
| Importing anything in `src/client` except its index | `lint`, `check:deps` (`one-writer-notes-store`) | One writer per durable value. Outside `src/client`, only the index is reachable. Add a command in `src/client/commands.ts` and call it. |
| A store built with `createStore` that is exported, aliased, or whose `set` is passed around as a value or given anything but an inline function; a second store built in `src/client` | `npm run lint`, rules `local/store-stays-private` and `no-restricted-imports` in `src/client` | The notes store is built in `src/client/commands.ts` and only `store.use`, `store.get()` and calls to `store.set(<inline function>)` may mention it, and that inline function may not call a function it was handed as a parameter. So the store and its setter cannot be exported, aliased or forwarded, even from inside `src/client` (fixtures `rogue-writer`, `store-leak-variants`, `setter-passthrough`, `setter-callback-passthrough`). Not caught: a handed-in function passed on as a value instead of called (`store.set((s) => apply(fn, s))`); that stays a review item. Not enforced: a parallel store of notes state built elsewhere, for example in a feature. `search-store.ts` is a legitimate private store of UI state, so this stays a review item. |
| `import.meta.glob` outside `src/framework/discover.ts`, including `import.meta['glob']` and aliasing or destructuring `import.meta` (only `.env`, `.url`, `.dirname`, `.filename` are allowed elsewhere) | `npm run lint` | Globbing reads files by path and bypasses every import rule. Only feature discovery may do it. |
| `src/framework` importing features, the client or app code | `check:deps` (`framework-is-a-package`), `lint` | The framework is a package boundary. Pass what it needs in through a Feature definition. |
| `electron/main` and `electron/renderer` importing each other | `check:deps` | Separate processes; share contracts through `src/shared/ipc.ts`. |
| Feature folder without `feature.tsx`, feature doc or index line; doc or index line without a folder; a selector (`aria-label`, `data-component`, `data-action-id`) named in a feature doc that the feature's markup no longer sets | `check:features` | The map is how agents find and verify features. |
| Listed entry point (in a feature doc) with no covering scenario and no `skip: <reason>` | `verify:coverage` | A proof that drives one entry point is incomplete when others exist. |
| A scenario that lists an id in `covers` but whose passing assertions never reached it (`expect(..., { reaches: '<id>' })`), or that reaches an id it does not list | `verify:all` (the scenario fails), `verify:reached` (`verify-coverage-not-reached`, reads `artifacts/verify-coverage.json` written by the last `verify:all`) | `covers` is a claim; coverage counts only what ran and passed. `reaches` goes on the last assertion the entry point's description promises, so everything before it has passed. |

Every one of these errors names the supported path. If you hit one, follow the message instead of looking for a way around it.

## Verification and selectors
`npm run verify -- --feature <id>` runs the real app in headless Chromium and writes screenshot, console log, CDP trace and a report. `npm run verify -- --help` prints the usage, `npm run verify -- doctor` checks the instance first. An explicit `--port` that something else holds is refused (exit 3), and verify only drives a server whose `/.verify-build.json` carries the nonce of the build it just made. See `.agents/skills/verify-app/SKILL.md`. "It type-checks" is not verification; attach the report.

Selectors: prefer ARIA labels and `data-component` / `data-action-id`; there are no test ids in this app. The feature docs list the selectors for each feature; keep them in sync when you change markup. `check:features` fails (`feature-selector-drift`) when an `aria-label`, `data-component` or `data-action-id` value named in a feature file is no longer set in `src/features/<id>/`; it does not compare roles, ARIA state, text or behaviour.

## Fixing a gate failure
Fix the code, not the gate. A review comment that a human makes twice should become a lint rule, a dependency rule or a test with a fixture in `guardrail-fixtures/` and a case in `scripts/guardrails.test.ts`, seen failing first.
