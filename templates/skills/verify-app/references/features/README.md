<!-- HOW TO USE:
1. This directory is the feature map: one file per user-facing feature, plus cross-cutting-flows.md. Copy _feature.template.md once per feature, named <feature-id>.md, where <feature-id> equals the directory name under {{FEATURES_DIR}} (default src/features). Keep _feature.template.md in this directory as the copy source: it is the one file in the installed skills that keeps its placeholders (check with `grep -rn "{{" .agents/skills --exclude=_feature.template.md`). With no cross-feature journey yet, cross-cutting-flows.md can be a stub (a heading and an empty `## Flows` section); fill it from this kit's cross-cutting-flows.md when the first real journey exists.
2. Replace every {{PLACEHOLDER}} in this README (baseline preconditions, conventions). A slot your app has no counterpart for (no feature flags, no manual-only paths): write `none`; with no login, delete the whole signed-in bullet (test account, entitlement, auth automation, fresh-machine login). Then fill the index at the bottom: one line per feature file, grouped by area. Keep the index line format exactly; a CI script parses it (ci/check-feature-map.sh, see skills/maintain-verification/SKILL.md). Sub-feature and flow ids are parsed too, by ci/check-coverage.mjs.
3. Or let the agent draft the first version with skills/create-verification/SKILL.md, then review it yourself: you know what users really do.
4. Delete this comment block when done.
-->

# {{APP_NAME}} feature map

## Purpose

This directory describes every user-facing feature of {{APP_NAME}} from the user's point of view: what it is, how to get to it, how to use it, and how to drive it with the control tooling ({{DRIVER}}, for example Playwright over CDP, a simulator CLI, or a shell). There is one file per feature, plus `cross-cutting-flows.md` for journeys that span features.

Read the relevant feature file before you drive, reproduce or verify anything. These files teach how to USE a feature, not how it is built: for internals, read the code, which changes faster than any document. This map is the maintained verification source; when behavior changes, the change updates the map (skill `maintain-verification`).

Keep entries at the behavior level, grounded in selectors or visible state, and short enough to follow without reading source.

## Mapping a vague report to a feature

Reports are often a screenshot and "???". Do not grep code first. (1) Read every piece of visible text in the report (labels, button names, errors, tab titles) and note the screen region. (2) Search the index and the feature files for that text: overview paragraphs and sub-feature lines are written to match. (3) Open the matching file, follow **How to get to it**, reproduce with **Driving it**, and capture evidence. (4) State the mapping in your report ("screenshot shows X in the left panel, which is sub-feature `<id>`"). If nothing matches, say so, list the text you tried, and add the missing file afterwards.

## Baseline preconditions

Unless a feature file says otherwise, assume all of these before driving anything:

- The dev build is running and the health command is green (`{{DOCTOR_COMMAND}}`).
- Signed in as {{TEST_ACCOUNT}} with access to {{REQUIRED_ENTITLEMENT}}. Automated path: {{AUTH_AUTOMATION}} (for example clone a prepared profile, then restart). On a fresh machine: {{FRESH_MACHINE_LOGIN}}. Real OAuth or SSO is manual.
- Starting state: {{STARTING_STATE}} (for example "sidebar visible with at least one item").
- No modal, settings pane, toast or banner is open. Default view settings ({{DEFAULT_VIEW_SETTINGS}}).
- Paths that need an entitlement, OS, device or driver you do not have (cloud, remote, native-bound) are unreachable: mark them `skip: <reason>` and say so in the proof (see "Proof and skip reporting").

## Driving conventions

- **Selectors, in order of preference:** ARIA labels and semantic data attributes ({{SEMANTIC_ATTRIBUTES}}, for example `data-component`, `data-action-id`). Class selectors are a fallback. Use `data-testid` only where the feature file names it.
- **Keyboard over coordinates.** Prefer the registered keyboard chord (`press "{{MODIFIER}}+KeyB"`) over clicking at coordinates: it exercises the power-user path and survives layout changes. Treat command ids in feature files as pointers to the handler, not as something to invoke.
- **Reading versus acting.** Use `eval` (or the equivalent) only to READ state. Do not call application commands through it; that bypasses the user path and proves nothing.
- **Async and streaming work is non-deterministic.** Poll observable end states (status labels, button enablement, a status attribute) with a timeout. A generic "wait for settle" helper only covers short UI transitions, not network or model output.
- **Leave the environment alone:** keep developer overlays off, and leave unrelated feature flags untouched. For a gated path, enable only the flag the feature file names, using {{FEATURE_FLAG_COMMAND}}.
- **Watch the console.** For any flow whose expected result includes "no errors", stream the console ({{CONSOLE_COMMAND}}) while you drive it and report what appeared.
- **Manual-only paths:** {{MANUAL_ONLY_PATHS}} (typically OS file drops, native menus, opening an external browser, auth dialogs). Unless your tooling supports them, mark the affected ids `skip: <reason>` rather than faking them.

## Proof and skip reporting

- **The feature file is the coverage set.** Every id listed under its `## Sub-features` heading is an entry point or behavior that proof must reach. `cross-cutting-flows.md` adds the shared journeys as `flow-<id>` bullets under `## Flows`.
- A proof that drives only one convenient entry point is incomplete when the map lists others (a keyboard chord and a button that do the same thing, a menu, a context menu, a gated variant). Exercise every reachable entry point, mode and enabled gated variant, plus the success, cancel, error, empty and persistence paths that the change can affect.
- **Record the action and the final observable state.** Not only the setup, not only the last screenshot, and not a synthetic reproduction that bypasses the user path.
- **When mocks count:** only when a mock stands in for an unavailable external dependency behind the same production boundary. **When they do not:** when the mock skips the renderer, a service, an RPC, a backend request, persistence, or the tool path under test.
- **Declare what a scenario proves.** Each scenario names the ids it covers (`covers: [...]`, in the manifest `verify-coverage.json` or in a `*.scenario.*` file). `ci/check-coverage.mjs` fails for an id that no scenario covers, a covered id that no file lists, an id listed twice, and a `skip` on an id that is covered.
- **Unreachable paths:** end that id's line with `skip: <reason>`. The reason names what blocks it (account, OS, entitlement, driver, missing data). Cover the closest real path with a scenario instead. Never silently drop it.
- **The proof report repeats the skip.** The Coverage line of the evidence report lists every `skip: <reason>` that applies to the change, with the closest real path covered. A skip that is in the file but not in the report is a silent drop.

## Full sweep

To check the whole app, walk this map top to bottom in the order of the index below, then finish with `cross-cutting-flows.md`. Anything that breaks and is not covered by the change you are making becomes a follow-up item in the report, not a silent fix. Suggested order: {{SWEEP_ORDER}} (for example auth, shell and onboarding, navigation, core workflow, secondary panels, settings).

## Index

Format, one line per feature file, exactly: ``- [`<feature-id>`](<feature-id>.md) — one-line scope`` (the scope is required). Group by area with `###` headings. Lines without a backticked id, such as the cross-cutting line below, are ignored by the check. Every directory under `{{FEATURES_DIR}}` must have a line here and a file next to this README, and the reverse (enforced in CI).

### {{AREA_1}} (for example Shell and onboarding)

- [`{{feature-id-1}}`]({{feature-id-1}}.md) — {{scope: what the user can do here, in one line}}

### {{AREA_2}} (for example Core workflow)

- [`{{feature-id-2}}`]({{feature-id-2}}.md) — {{scope}}

### Cross-cutting

- [Cross-cutting flows](cross-cutting-flows.md) — journeys that span features
