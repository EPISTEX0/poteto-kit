---
name: maintain-verification
description: Keep the feature map (verify-app/references/features/) and its selectors in sync with the code. Use on any PR or change that adds, renames, moves or removes a feature, route, menu item, keyboard shortcut or test id, and whenever a verification run finds a stale or wrong feature file.
---

<!-- HOW TO USE:
1. Install this folder next to verify-app/ and create-verification/ under .agents/skills/ (see the install table in templates/README.md). Replace {{FEATURES_DIR}} (default src/features), {{FEATURE_MAP_DIR}} (default {{SKILLS_DIR}}/verify-app/references/features), {{SKILLS_DIR}} and {{GATE_COMMAND}}.
2. Reference this skill from AGENTS.md ("PRs that touch features must update the feature map") so every agent loads it.
3. Copy the two gate scripts of this kit into your repo and add them to your gate command: templates/ci/check-feature-map.sh and templates/ci/check-coverage.mjs. The rules must be enforced by CI, not just by this skill.
4. The checks assume the layout of the feature map directory: one <feature-id>.md per feature; an index in README.md with lines of the form ``- [`<feature-id>`](<feature-id>.md) — scope`` (scope required); Sub-features bullets ``- `<id>` — ...`` in each feature file; and `## Flows` bullets in cross-cutting-flows.md. README.md, cross-cutting-flows.md and any file starting with "_" are not features.
-->

# maintain-verification: the feature map never lags the code

A stale feature map is worse than none: the agent follows wrong steps with confidence. The map is the maintained verification source, so it changes in the same PR as the code, with a diff-driven procedure and two CI checks: one fails when a feature has no file or no index line, the other fails when an entry point in the map is covered by no scenario.

## Triggers

Run this skill when a change does any of:

- Adds, renames, moves, splits, merges or removes a feature directory (`{{FEATURES_DIR}}/*`).
- Adds, renames or removes a route, screen, window, tab, menu item, command or CLI subcommand.
- Adds, changes or removes a keyboard shortcut or its OS variants.
- Adds, renames or removes a selector that a feature file lists (ARIA label, semantic data attribute, test id).
- Changes visible text that a feature file quotes.
- A verification run found a step or selector that no longer works.

## Procedure (diff-driven)

1. **Get the diff.** `git diff --name-status <base>...HEAD` and the content diff. List what changed in each trigger category above. A pattern such as `git diff -G'data-testid|aria-label|data-action-id|accelerator|keybinding|registerCommand|path:'` finds the interesting lines quickly (adapt it to your stack).
2. **Classify each change:** new feature, renamed or moved feature, removed feature, new or changed sub-feature, changed entry point (navigation, shortcut, route), changed selector, changed visible text, new gated variant.
3. **Update `{{FEATURE_MAP_DIR}}`:**
   - New feature: copy `_feature.template.md` (it stays in `{{FEATURE_MAP_DIR}}` as the copy source) to `<feature-id>.md`, fill all four sections (overview with root selector, Sub-features, How to get to it, Driving it), and add an index line to `README.md` under the right area. Add a scenario for each sub-feature id to your coverage manifest, or mark the id `skip: <reason>`.
   - Renamed or moved: rename the file, change the title, id, selectors and index line; search every other feature file and `cross-cutting-flows.md` for the old id and old selectors.
   - Removed: delete the file and the index line; fix cross-cutting flows that used it.
   - New or changed sub-feature: edit that file's Sub-features list, its How to get to it bullet and its Driving it notes together, and keep the scenario's `covers` ids in step with the list.
   - Changed entry point or shortcut: rewrite the user steps and the per-OS chords.
   - Changed baseline (login, starting state, driving convention): edit `README.md`, not every feature file.
4. **Update `verify-app/SKILL.md`** only if launch commands, driver, doctor or prerequisites changed.
5. **Verify what you touched.** For each added or changed feature file, follow its steps with the `verify-app` skill (every entry point and path the file lists that your change can affect) and attach the evidence report to the PR. A feature file you did not run is a guess; if you cannot run it, say "unverified" in the file's gotchas and in the PR.
6. **Run the gate:** `{{GATE_COMMAND}}` (includes the CI rules below).
7. **State in the PR description** which feature files were added, changed or removed, and link the evidence.

## The CI-checkable rules

> **Map rule.** Every directory directly under `{{FEATURES_DIR}}/` has a file `{{FEATURE_MAP_DIR}}/<id>.md`, and the `README.md` index lists it with a line ``- [`<id>`](<id>.md) — <scope>`` (the scope is required). The reverse holds: every feature file and every index line corresponds to a directory.

Both directions matter: a missing file means agents cannot find or verify the feature; an orphan file or index line means agents follow steps to nothing. The script checks existence and consistency; it cannot check that the steps are true, which is why step 5 exists.

Reference implementation: `check-feature-map.sh` in this kit's `templates/ci/` (POSIX shell, no dependencies). Copy it to `scripts/check-feature-map.sh` and run it as:

```sh
sh scripts/check-feature-map.sh {{FEATURES_DIR}} {{FEATURE_MAP_DIR}}
```

It exits non-zero and prints one line per problem: a directory with no file, a directory with no index line, a file or index line with no directory, an index line whose link is not `<id>.md`, and an index line with no scope. Directories and files starting with `_` are templates and are ignored. Do not paste its logic into this skill; keep one copy, in the repo's scripts.

> **Coverage rule.** Every id under `## Sub-features` (feature files) and `## Flows` (`cross-cutting-flows.md`) is covered by a scenario that declares it, or ends with `skip: <reason>`. No scenario covers an id that no file lists, no id is listed twice, and no id is both covered and marked skip.

Reference implementation: `check-coverage.mjs` in this kit's `templates/ci/` (Node, no dependencies). Copy it to `scripts/check-coverage.mjs`. Scenarios declare what they prove in a manifest, `verify-coverage.json` by default (`{ "scenarios": [ { "name": "...", "covers": ["<id>"] } ] }`), or in `*.scenario.*` files that contain `covers: [...]`. Either way this script trusts the list it is given: a hand-kept manifest or a `covers` array in a source file is a claim, not a result. The stronger setup, which the runnable example uses, is for the verify command to write the manifest itself from the scenarios that ran and passed, listing an id only when an assertion tagged with that id passed; point `--manifest` at that file and run the check after the verify run:

```sh
node scripts/check-coverage.mjs --features {{FEATURE_MAP_DIR}}
```

`check-feature-map.sh` compares structure only (directories, files, index lines); it does not compare the selectors a feature file names with the markup. The example's `scripts/check-features.ts` also does that for `aria-label`, `data-component` and `data-action-id`; port it if your markup is greppable.

Wire both as scripts (for example `check:feature-map` and `check:coverage`) and include them in `{{GATE_COMMAND}}`. Without this, the skill is a soft rule that agents will forget (see `guardrails/enforcement-layers.md`).

## What not to do

- Do not "fix" the map by loosening the CI check or adding ignore lists. If a directory is not a user-visible feature, move it out of `{{FEATURES_DIR}}` or document the exception in AGENTS.md.
- Do not rewrite untouched feature files for style; the diff should show only what the code change required.
- Do not describe features from the code alone. How to get to it and Driving it come from running the app.

## Failure policy

If you cannot run the app to confirm a feature file, still update the map from the diff, mark the file "unverified after <PR or commit>" in its gotchas, and say so in the PR. Never silently skip the update.
