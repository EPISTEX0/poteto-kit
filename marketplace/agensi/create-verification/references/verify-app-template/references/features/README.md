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
- If the backend allows one session per account, runs are serialized (a second login revokes the first), and nobody uses the test account while a run is going (`references/test-account.md`).
- No modal, settings pane, toast or banner is open. Default view settings ({{DEFAULT_VIEW_SETTINGS}}).
- Paths that need an entitlement, OS, device or driver you do not have (cloud, remote, native-bound) are unreachable: mark them `skip: <reason>` and say so in the proof (see "Proof and skip reporting").

## Driving conventions

- **Selectors, in order of preference:** ARIA labels and semantic data attributes ({{SEMANTIC_ATTRIBUTES}}, for example `data-component`, `data-action-id`). Class selectors are a fallback. Use `data-testid` only where the feature file names it.
- **Keyboard over coordinates.** Prefer the registered keyboard chord (`press "{{MODIFIER}}+KeyB"`) over clicking at coordinates: it exercises the power-user path and survives layout changes. Treat command ids in feature files as pointers to the handler, not as something to invoke.
- **Reading versus acting.** Use `eval` (or the equivalent) only to READ state. Do not call application commands through it; that bypasses the user path and proves nothing.
- **Async and streaming work is non-deterministic.** Poll observable end states (status labels, button enablement, a status attribute) with a timeout. A generic "wait for settle" helper only covers short UI transitions, not network or model output.
- **Leave the environment alone:** keep developer overlays off, and leave unrelated feature flags untouched. For a gated path, enable only the flag the feature file names, using {{FEATURE_FLAG_COMMAND}}.
- **Watch the console.** For any flow whose expected result includes "no errors", stream the console ({{CONSOLE_COMMAND}}) while you drive it and report what appeared. Known noise (for example a 4xx an endpoint returns on every visit) is not ignored: it is a named allowlist entry with a pattern, a reason and the scenarios it applies to, and the report lists each match. Anything not on the list is a finding.
- **Manual-only paths:** {{MANUAL_ONLY_PATHS}} (typically OS file drops, native menus, opening an external browser, auth dialogs). Unless your tooling supports them, mark the affected ids `skip: <reason>` rather than faking them.

## Proof and skip reporting

- **The feature file is the coverage set.** Every id listed under its `## Sub-features` heading is an entry point or behavior that proof must reach. `cross-cutting-flows.md` adds the shared journeys as `flow-<id>` bullets under `## Flows`.
- A proof that drives only one convenient entry point is incomplete when the map lists others (a keyboard chord and a button that do the same thing, a menu, a context menu, a gated variant). Exercise every reachable entry point, mode and enabled gated variant, plus the success, cancel, error, empty and persistence paths that the change can affect.
- **Record the action and the final observable state.** Not only the setup, not only the last screenshot, and not a synthetic reproduction that bypasses the user path.
- **When mocks count:** only when a mock stands in for an unavailable external dependency behind the same production boundary. **When they do not:** when the mock skips the renderer, a service, an RPC, a backend request, persistence, or the tool path under test.
- **Declare what a scenario proves.** Each scenario names the ids it covers (`covers: [...]`, in the manifest `verify-coverage.json` or in a `*.scenario.*` file). `ci/check-coverage.mjs` fails for an id that no scenario covers, a covered id that no file lists, an id listed twice, and a `skip` on an id that is covered. A hand-kept list only proves what someone typed: have your verify command write the manifest from the scenarios that ran and passed (each scenario lists an id only when an assertion on it passed), so an id is covered only if it was reached.
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
