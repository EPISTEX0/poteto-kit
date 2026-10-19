---
name: create-verification
description: "Bootstrap verification for this repo. Explore the codebase with parallel subagents (routes, top-level components, menus, keybindings, test ids), write verify-app/SKILL.md and the feature map directory verify-app/references/features/, add missing stable selectors, then prove it works by verifying 2-3 features end to end. Use once per repo, or when verification is missing or badly out of date. Unofficial, not affiliated with Lauren Tan (poteto). Free, MIT source: https://github.com/EPISTEX0/poteto-kit"
---

# create-verification: generate the control skill and feature map

Goal: an agent that can start the app (`<app name>`), get to any feature a user could mention, drive it, and bring back evidence, without a human explaining the UI. The code of the control skill is the boring part; the feature map is what makes it useful. This skill builds both from the repo, then proves them.

Finish line: `<skills dir>/verify-app/SKILL.md`, `<skills dir>/verify-app/references/cli-contract.md` and the directory `<skills dir>/verify-app/references/features/` (a `README.md` with baseline, conventions and index, one `<feature-id>.md` per feature, `cross-cutting-flows.md`) exist with no unfilled double-brace placeholders left (search the whole `<skills dir>/verify-app/` for two opening braces, excluding `_feature.template.md`) (`_feature.template.md` is the copy source and keeps its placeholders on purpose), every feature has a file with working steps and selectors, and 2-3 features were verified end to end with evidence reports.

## Setup: detect the values and install the templates

This skill is self-contained: the verify-app templates it fills in are bundled in its `references/verify-app-template/` folder (next to this file). It adds no network calls of its own. The commands it runs (install, dev server, tests, gates) are the repo's own and may use the network or write files the way they normally do. If the app has a login, the verify CLI it builds may create one dedicated test account on the app's own backend and keep its credentials in a local file with mode 600, outside the repo and never printed (`test-account.md`). Artifact upload happens only if you opt into the cloud recipe (`cloud-environment.md`).

Detect these four values from the repo, and use them everywhere below. Do not ask the user unless a value is truly ambiguous.

- `<app name>`: the `name` in the package manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, `Package.swift`, ...), else the first heading of `README.md`, else the repo folder name.
- `<skills dir>`: `.agents/skills` if it exists, else `.claude/skills` if it exists, else create `.agents/skills`. If you created it and you are Claude Code (which reads `.claude/skills`), also link it: `mkdir -p .claude && ln -s ../.agents/skills .claude/skills`.
- `<features dir>`: the folder that holds one directory per feature (for example `src/features`, `app/features`, `packages/*/src/features`). If the repo has none, write `none` and use one candidate feature per route, screen or user-visible capability instead of a directory name.
- `<gate command>`: the repo's own checks, taken from its scripts or CI config: lint, typecheck and test (for example `npm run lint && npm run typecheck && npm test`, `cargo clippy && cargo test`, `make check`). If none exists, write `none` and skip the gate runs below. If parts of the gate read the verify-app docs this skill is about to write, run only the other parts until Step 2 is done. If a gate step fails for a reason outside your diff, report it with the failing output and run the remaining steps by hand.

Then install the templates. Do this before Step 2, and only if `<skills dir>/verify-app/` does not exist yet (if it exists, keep its content: add only the files that are missing, and fill or correct the sections that are empty or stale):

1. Copy `references/verify-app-template/SKILL.template.md` to `<skills dir>/verify-app/SKILL.md` (rename it to `SKILL.md`).
2. Copy `references/verify-app-template/references/cli-contract.md`, `references/verify-app-template/references/worktree-isolation.md` and the whole folder `references/verify-app-template/references/features/` into `<skills dir>/verify-app/references/` (keep the same relative layout). Then replace the installed `features/cross-cutting-flows.md` with a stub: its `# Cross-cutting flows` heading and an empty `## Flows` section. Step 2 fills it from the bundled template once a real journey exists. Also copy the optional `test-account.md` (only if the app has a login), `evidence-export.md` (only if someone needs PDF evidence) and `cloud-environment.md` (only if agents run in cloud VMs) from the same folder, and delete the comment block at the top of each copy after following it.
3. Do not copy `references/verify-app-template/references/launch-by-app-type.md`. Read it from the bundle in Step 3; a copy in the installed skill would keep unfilled placeholders.
4. Every path in the steps below that begins with `verify-app/` refers to the installed copy under `<skills dir>/`.

The templates mention a few files that are not bundled: `_skill-from-failure.md`, `evals/EVAL_PLAYBOOK.md`, the `ci/check-feature-map.sh` and `ci/check-coverage.mjs` scripts, and the `maintain-verification` and `investigate` skills. Where a bullet mixes a rule with a sentence about one of them, keep the rule and delete only that sentence. When you fill the templates, delete each sentence or bullet that points to one of them, unless you write that file yourself or the repo already has it. Do the same for links to the optional references you chose not to copy. Where a slot has no counterpart in this app (no login, no feature flags, no manual-only paths), write `none` and rewrite or delete the sentence around it. Delete recipes and capabilities the app cannot support. Keep `name: verify-app` in the installed SKILL.md frontmatter.

## Step 0: Detect the app type and the way to run it

Read `package.json`, `Cargo.toml`, `Package.swift`, `*.xcodeproj`, `Makefile`, README and CI config. Determine:

- App type: web, electron, ios, android, cross-platform mobile (Flutter, React Native), backend HTTP API, cli (more than one is possible; handle each).
- Install, dev/start command, ready signal (URL, CDP port, process output).
- The driver to use: Playwright or CDP (web, electron), simulator or emulator tooling (iOS, Android: `simctl`, `adb`, UIAutomator, Maestro), an HTTP client (API), direct execution (CLI). Prefer what is already a dependency of the repo.
- Existing e2e tests: they often already contain navigation recipes and selectors; mine them.

Actually launch it once with the development command you found and confirm it starts. If it does not start, stop and report; do not generate a skill for an app you could not run.

## Step 1: Explore with parallel read-only subagents

Spawn one read-only subagent per area at the same time (they only read; no edits). If your agent cannot spawn subagents, cover the areas one after another yourself. Give each the area, the output format, and the rule "cite file:line for every claim". Areas, adapt to the stack:

1. **Routes / screens / windows:** router config, page directories, Electron windows, iOS view controllers/scenes, CLI subcommands.
2. **Top-level components and layout regions:** shell, sidebar, header, panels, modals, status bar; what each shows (visible text) and where it is.
3. **Menus, command palette, context menus:** every menu item, its label, its action.
4. **Keybindings and shortcuts:** key, scope (global or focused), action.
5. **Test ids and accessibility handles:** existing `data-testid`, `aria-label`, accessibility identifiers; which interactive elements have none.
6. **Feature boundaries:** how code is organized (`src/features/*` or equivalent), one candidate feature per directory or per user-visible capability.
7. **Existing e2e tests and scripts:** what flows are already automated.

Each subagent returns a compact table, not prose. Merge the tables yourself; where two disagree, read the code and decide.

## Step 2: Draft the feature map directory

Work in `<skills dir>/verify-app/references/features/`, starting from `README.md` and `_feature.template.md` there (both were copied in Setup).

1. **README.md:** fill the purpose, baseline preconditions (how to be signed in, starting state, what must not be open), driving conventions for this stack, manual-only paths, sweep order, and the index. Take preconditions from what you needed to get the app into a usable state in Step 0.
2. **One file per feature:** copy `_feature.template.md` to `<feature-id>.md` and fill its four sections: overview with root selector; Sub-features (named ids, one line each); How to get to it (user steps per sub-feature); Driving it (preconditions, per-OS chords, selectors, command ids, gotchas). Rules:
   - Write from the user's point of view: visible text and screen regions first, code paths second. Teach how to USE the feature, not how it is built.
   - The feature id equals the directory name under `<features dir>` when that convention exists. List every sub-feature a vague report might point at (a filter box, a badge, a context menu) and every entry point (button, shortcut, menu, context menu): the feature file is the coverage set that proofs are judged against.
   - Selectors: ARIA labels and semantic data attributes first, test ids only where the file names them. If an element has no stable handle, write "needs selector" in the gotchas for Step 4.
   - Mark gated variants with the exact feature flag.
   - Every step is something a user does, and every selector is something you checked in the running app.
   - Keep the template's four sections and their order.
3. **cross-cutting-flows.md:** write the journeys that span features (first run, create-edit-persist, error recovery) as `flow-<id>` bullets under `## Flows`, each with its How to get to it and Driving it detail. Write real journeys only. If `cross-cutting-flows.md` is a stub (a heading and an empty `## Flows`), replace it with the bundled template (`references/verify-app-template/references/features/cross-cutting-flows.md`, next to this file) filled in for this app; with no real journey yet, leave the stub.
4. **Index:** one line per feature file in README.md, grouped by area, exact format ``- [`<id>`](<id>.md) — scope`` (the scope is required). Sub-features and flows use exactly ``- `<id>` — <one line>``; an entry point you cannot reach ends with `skip: <reason>`.
5. If the `maintain-verification` skill is installed, run its two checks (`check-feature-map.sh`, and `check-coverage.mjs` once scenarios exist) and fix mismatches; otherwise compare the index with the feature directories by hand.

## Step 3: Write verify-app/SKILL.md

Fill the installed `verify-app/SKILL.md`, `verify-app/references/cli-contract.md` and `verify-app/references/worktree-isolation.md`: every placeholder in them (a double-brace name such as the app name, CLI name, default port or profile directory), starting with the app type, install, launch command, ready signal, driver, artifacts directory, test data/login. Fill Launch from the row for the app type in the bundled `references/verify-app-template/references/launch-by-app-type.md` (next to this file; read it now, and the other rows do not go into the skill): the row's launch command goes into the dev-command slot, its "Reached at" cell into the "Reached at" line (the app URL, the CDP port or the simulator; write `none` and delete the line if the app has no address, as with a CLI), and its last cell into the launch-driver slot. Delete the recipes that do not apply. If the driver needs glue code (a CDP launcher, a simulator wrapper, a `verify` CLI that takes `--feature` and `--scenario` and writes artifacts), write the smallest script that does it and reference it in the skill. If the repo already has a verify CLI, keep it: add only what this skill relies on, delete from the installed skill and contract the capabilities the CLI lacks, and say so in the report. Otherwise, before you write the CLI, read `verify-app/references/cli-contract.md` and implement it: the refusal rules, `doctor`, the gates, the exit codes, a `report.md` generated from `report.json`, with tests for those rules. Whoever later changes the CLI's behavior changes `cli-contract.md` in the same commit; say so in the installed SKILL.md.

## Step 4: Add missing stable selectors

For every interactive or key element the map references that lacks a stable handle, add `data-testid="<feature-id>-<element>"` (or the platform equivalent: accessibility identifier, CLI flag name). Constraints:

- Smallest possible diff; no behavior or styling change.
- Naming: lowercase, hyphenated, prefixed with the feature id, never derived from copy text or index.
- Update the feature file's Driving it selectors to match.
- Run the project's gate command (`<gate command>`) afterwards.

## Step 5: Prove it (not optional)

Pick 2-3 features of different kinds (one simple, one with sub-features, one performance-sensitive or stateful). For each, follow only what the generated skill and map say, from a cold app start, and produce a verification report in the format defined in `verify-app/SKILL.md`:

- Navigate using the feature file's steps; drive using its selectors and chords; exercise every entry point the file lists for the sub-feature you picked, not just the convenient one; capture a screenshot and console output.
- For the performance-sensitive one, capture a trace and report long tasks (>50 ms, Long Tasks API) and frames over the 16.7 ms budget, as two separate numbers.
- Take one feature file and break it on purpose in your head: if its selector were wrong, would your run have failed? If the proof cannot fail, it proves nothing; make the check assert on something visible.

Where a step fails, fix the map or skill and rerun that feature. Do not mark a feature verified without a report.

## Step 6: Report

Return: the four detected values, files written, number of features mapped, selectors added (file list), the 2-3 verification reports (or their artifact paths), and anything you could not map or run with the reason. Do not commit unless asked.

## Failure policy

If the app cannot be launched, or a feature cannot be reached after two different approaches, record it as "not verified" with the exact error. A partial map with honest gaps is better than a complete-looking map nobody ran.
