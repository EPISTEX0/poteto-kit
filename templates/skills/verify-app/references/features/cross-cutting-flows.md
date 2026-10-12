<!-- HOW TO USE:
1. List journeys that span several features and that no single feature file covers: first run, create then change then persist, error recovery, switching context, logout and login, upgrade or migration.
2. Each flow is one bullet under `## Flows`, exactly ``- `flow-<id>` — <one line>``, followed by its detail in the two sections below (same shape as a feature file). The id is the name proofs cite and the coverage check reads (ci/check-coverage.mjs). Replace all {{PLACEHOLDERS}}; delete the example flows that do not apply.
3. A flow you cannot reach (needs an entitlement, device or OS you lack) is marked on its id line with a trailing `skip: <reason>`; see "Proof and skip reporting" in README.md.
4. A full sweep (README.md) finishes with these flows. A change touching two or more features should run the relevant flows here as well as each feature file.
5. Delete this comment block when done.
-->

# Cross-cutting flows

Journeys that cross feature boundaries. Each one passes through the real user path across features; do not shortcut it by writing state directly. Baseline preconditions and driving conventions in `README.md` apply to every flow.

## Flows

- `flow-first-run` — {{launch with a fresh profile, finish onboarding and reach the main screen}}
- `flow-create-change-persist` — {{create an item, change it through a second entry point, restart, and find both again}}
- `flow-switch-context` — {{switch project, account, workspace or tab, then come back}}
- `flow-error-recovery` — {{force a failure in the middle of a flow, then retry}}
- `flow-{{flow-name}}` — {{one line}}

## How to get to it

User point of view, one bullet per flow: where it starts, the steps, and the visible result that tells you it worked.

- **`flow-first-run`:** start from {{a fresh profile}} (not the prepared profile of the baseline). 1. {{launch}} 2. {{complete onboarding}} 3. {{reach the main screen}}.
- **`flow-create-change-persist`:** 1. {{create an item through the primary entry point}} 2. {{change it through a secondary entry point (shortcut, context menu)}} 3. {{restart the app}}.
- **`flow-switch-context`:** {{switch, then come back}}.
- **`flow-error-recovery`:** {{how to force the failure in the middle of the flow, then retry}}.
- **`flow-{{flow-name}}`:** {{steps}}

## Driving it

How to drive it with {{DRIVER}}.

- **Preconditions:** the baseline in `README.md`, plus the starting state named per flow above.
- **Features involved:** `flow-first-run`: `{{feature-id-a}}`, `{{feature-id-b}}`. `flow-create-change-persist`: `{{feature-id-a}}`, `{{feature-id-c}}`. Name the feature files whose selectors and chords apply.
- **Observable end states** to poll: `flow-first-run`: {{visible state and persisted state, for example the onboarding flag survives a restart}}. `flow-create-change-persist`: {{the item and its change are present after restart}}. `flow-switch-context`: {{previous state restored, no data from the other context visible}}. `flow-error-recovery`: {{the user sees a clear message, the retry succeeds, no duplicate side effects}}.
- **Check also:** the console shows no errors and no modal is left over; for `flow-create-change-persist`, the cancel path (abandon the change, nothing changes) and the error path ({{how to force a failure}}).
- **Gotchas:** {{things learned the hard way}}.
