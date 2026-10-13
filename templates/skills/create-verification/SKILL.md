---
name: create-verification
description: Bootstrap verification for this repo. Explore the codebase with parallel subagents (routes, top-level components, menus, keybindings, test ids), write verify-app/SKILL.md and the feature map directory verify-app/references/features/, add missing stable selectors, then prove it works by verifying 2-3 features end to end. Use once per repo, or when verification is missing or badly out of date.
---

<!-- HOW TO USE:
1. Install this folder next to your other skills (.agents/skills/create-verification/; see the install table in templates/README.md) together with the verify-app/ templates (SKILL.md, references/cli-contract.md and references/features/), which this skill fills in. Step 3 reads references/launch-by-app-type.md from the kit's GitHub URL; do not install it. Add references/worktree-isolation.md only if several instances run in parallel, and references/cloud-environment.md only when you scale to cloud agents.
2. Ask your agent: "Use the create-verification skill for this repo." Replace {{APP_NAME}}, {{SKILLS_DIR}} (where your skills live; default .agents/skills), {{FEATURES_DIR}} (default src/features) and {{GATE_COMMAND}} below. Those four are the only placeholders in this file's body.
3. Review the generated feature map yourself: you are the person who knows what users actually do. Fix wrong feature files, then commit.
4. After this, switch to skills/maintain-verification/SKILL.md to keep the map in sync.
5. Worked instance in this kit: example/ has a verify CLI that takes --feature and --scenario (`npm run verify -- --feature <id> --scenario <name>`, run from example/); it is the shape Step 3 asks for. Delete this line in the installed copy.
-->

# create-verification: generate the control skill and feature map

Goal: an agent that can start {{APP_NAME}}, get to any feature a user could mention, drive it, and bring back evidence, without a human explaining the UI. The code of the control skill is the boring part; the feature map is what makes it useful. This skill builds both from the repo, then proves them.

Finish line: `{{SKILLS_DIR}}/verify-app/SKILL.md`, `{{SKILLS_DIR}}/verify-app/references/cli-contract.md` and the directory `{{SKILLS_DIR}}/verify-app/references/features/` (a `README.md` with baseline, conventions and index, one `<feature-id>.md` per feature, `cross-cutting-flows.md`) exist with no unfilled double-brace placeholders left (`_feature.template.md` is the copy source and keeps its placeholders on purpose), every feature has a file with working steps and selectors, and 2-3 features were verified end to end with evidence reports.

## Step 0: Detect the app type and the way to run it

Read `package.json`, `Cargo.toml`, `Package.swift`, `*.xcodeproj`, `Makefile`, README and CI config. Determine:

- App type: web, electron, ios, android, cross-platform mobile (Flutter, React Native), backend HTTP API, cli (more than one is possible; handle each).
- Install, dev/start command, ready signal (URL, CDP port, process output).
- The driver to use: Playwright or CDP (web, electron), simulator or emulator tooling (iOS, Android: `simctl`, `adb`, UIAutomator, Maestro), an HTTP client (API), direct execution (CLI). Prefer what is already a dependency of the repo.
- Existing e2e tests: they often already contain navigation recipes and selectors; mine them.

Actually launch it once with the development command you found and confirm it starts. If it does not start, stop and report; do not generate a skill for an app you could not run.

## Step 1: Explore with parallel read-only subagents

Spawn one read-only subagent per area at the same time (they only read; no edits). Give each the area, the output format, and the rule "cite file:line for every claim". Areas, adapt to the stack:

1. **Routes / screens / windows:** router config, page directories, Electron windows, iOS view controllers/scenes, CLI subcommands.
2. **Top-level components and layout regions:** shell, sidebar, header, panels, modals, status bar; what each shows (visible text) and where it is.
3. **Menus, command palette, context menus:** every menu item, its label, its action.
4. **Keybindings and shortcuts:** key, scope (global or focused), action.
5. **Test ids and accessibility handles:** existing `data-testid`, `aria-label`, accessibility identifiers; which interactive elements have none.
6. **Feature boundaries:** how code is organized (`src/features/*` or equivalent), one candidate feature per directory or per user-visible capability.
7. **Existing e2e tests and scripts:** what flows are already automated.

Each subagent returns a compact table, not prose. Merge the tables yourself; where two disagree, read the code and decide.

## Step 2: Draft the feature map directory

Work in `{{SKILLS_DIR}}/verify-app/references/features/`, starting from `README.md` and `_feature.template.md` there (both are installed with the skill).

1. **README.md:** fill the purpose, baseline preconditions (how to be signed in, starting state, what must not be open), driving conventions for this stack, manual-only paths, sweep order, and the index. Take preconditions from what you needed to get the app into a usable state in Step 0.
2. **One file per feature:** copy `_feature.template.md` to `<feature-id>.md` and fill its four sections: overview with root selector; Sub-features (named ids, one line each); How to get to it (user steps per sub-feature); Driving it (preconditions, per-OS chords, selectors, command ids, gotchas). Rules:
   - Write from the user's point of view: visible text and screen regions first, code paths second. Teach how to USE the feature, not how it is built.
   - The feature id equals the directory name under `{{FEATURES_DIR}}` when that convention exists. List every sub-feature a vague report might point at (a filter box, a badge, a context menu) and every entry point (button, shortcut, menu, context menu): the feature file is the coverage set that proofs are judged against.
   - Selectors: ARIA labels and semantic data attributes first, test ids only where the file names them. If an element has no stable handle, write "needs selector" in the gotchas for Step 4.
   - Mark gated variants with the exact feature flag.
3. **cross-cutting-flows.md:** write the journeys that span features (first run, create-edit-persist, error recovery) as `flow-<id>` bullets under `## Flows`, each with its How to get to it and Driving it detail. Write real journeys only. If `cross-cutting-flows.md` is a stub (a heading and an empty `## Flows`), replace it with a copy of the kit's template (https://github.com/EPISTEX0/poteto-kit/blob/main/templates/skills/verify-app/references/features/cross-cutting-flows.md) filled in for this app; with no real journey yet, leave the stub.
4. **Index:** one line per feature file in README.md, grouped by area, exact format ``- [`<id>`](<id>.md) — scope`` (the scope is required). Sub-features and flows use exactly ``- `<id>` — <one line>``; an entry point you cannot reach ends with `skip: <reason>`.
5. If installed, run the two checks from `skills/maintain-verification/SKILL.md` (`check-feature-map.sh`, and `check-coverage.mjs` once scenarios exist) and fix mismatches; otherwise compare the index with the feature directories by hand.

## Step 3: Write verify-app/SKILL.md

Fill the template: app type, install, launch command, ready signal, driver, artifacts directory, test data/login. Fill Launch from the row for the app type in the kit's `launch-by-app-type.md` (https://github.com/EPISTEX0/poteto-kit/blob/main/templates/skills/verify-app/references/launch-by-app-type.md; read it now, and the other rows do not go into the skill) and delete the recipes that do not apply. If the driver needs glue code (a CDP launcher, a simulator wrapper, a `verify` CLI that takes `--feature` and `--scenario` and writes artifacts), write the smallest script that does it and reference it in the skill. Before you write the CLI, read `verify-app/references/cli-contract.md` and implement it: the refusal rules, `doctor`, the gates, the exit codes, a `report.md` generated from `report.json`, with tests for those rules.

## Step 4: Add missing stable selectors

For every interactive or key element the map references that lacks a stable handle, add `data-testid="<feature-id>-<element>"` (or the platform equivalent: accessibility identifier, CLI flag name). Constraints:

- Smallest possible diff; no behavior or styling change.
- Naming: lowercase, hyphenated, prefixed with the feature id, never derived from copy text or index.
- Update the feature file's Driving it selectors to match.
- Run the project's gate command (`{{GATE_COMMAND}}`) afterwards.

## Step 5: Prove it (not optional)

Pick 2-3 features of different kinds (one simple, one with sub-features, one performance-sensitive or stateful). For each, follow only what the generated skill and map say, from a cold app start, and produce a verification report in the format defined in `verify-app/SKILL.md`:

- Navigate using the feature file's steps; drive using its selectors and chords; exercise every entry point the file lists for the sub-feature you picked, not just the convenient one; capture a screenshot and console output.
- For the performance-sensitive one, capture a trace and report long tasks (>50 ms, Long Tasks API) and frames over the 16.7 ms budget, as two separate numbers.
- Take one feature file and break it on purpose in your head: if its selector were wrong, would your run have failed? If the proof cannot fail, it proves nothing; make the check assert on something visible.

Where a step fails, fix the map or skill and rerun that feature. Do not mark a feature verified without a report.

## Step 6: Report

Return: files written, number of features mapped, selectors added (file list), the 2-3 verification reports (or their artifact paths), and anything you could not map or run with the reason. Do not commit unless asked.

## Failure policy

If the app cannot be launched, or a feature cannot be reached after two different approaches, record it as "not verified" with the exact error. A partial map with honest gaps is better than a complete-looking map nobody ran.
