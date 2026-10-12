# 03 - Feature map: teach the agent the way to every feature

## The idea

A control skill only gives the agent the ability to *drive* the application. It doesn't tell the agent *what the app has* or *how to get there*. The **feature map** fills that gap. It is not one file but *a directory*: one file per feature, a file for journeys that cross features, and a README that doubles as the index and the proof rules. With it, a vague report (even a screenshot with a few question marks) becomes concrete navigation instructions, and the evidence behind "verified" has a clear standard.

## Why it works

- The agent has tools but no **map**. Code tells you which functions exist, not "what the user clicks to reach this screen". Without a map, when it hears "the left panel is laggy" or "the search button does nothing", the agent flounders through the code looking for the feature and how to open it in the UI. The feature map turns that knowledge into short text that fits in context.
- It compresses search cost: instead of grepping the whole codebase to guess a route every time, the agent looks up one file and goes straight there. The *directory* form lets it read only the file for the feature it is touching.
- Stable selectors (ARIA, data attributes) make the driving step repeatable, so the evidence from [02](02-verification.md) is repeatable too.
- **Proof rules block box-ticking verification.** Agents tend to take the easiest path (see [07](07-agent-first-architecture.md)); if all you ask is "verify this", the agent will steer through one convenient button and report done. A coverage set, plus the requirement to record the action and the final state, makes gaps visible, even when a mock hides the real path.
- **A mock only counts when it stands in for an external dependency behind the same production boundary.** A mock that bypasses the UI layer, a service, a backend request or the persistence layer proves nothing about the path under test.
- **Skip reporting** turns "couldn't check" into information: which paths are uncovered and what blocked them. Honest evidence about the gaps is more trustworthy than evidence that looks perfectly round.
- Splitting files by feature and keeping cross-feature journeys separate keeps each file small and easy to maintain alongside the code ([maintain-verification](../templates/skills/maintain-verification/SKILL.md)).
- Driving conventions (semantic selectors, keyboard over coordinates, `eval` for reading only, polling end states instead of sleeping) live in the README so every feature file inherits them. The full list is in [the features README template](../templates/skills/verify-app/references/features/README.md); this doc does not repeat it.

### Anatomy of a feature file

Every feature file has the same four parts, so the agent knows where to look. The sample notes app (sidebar, editor, search) shows them in [sidebar.md](../example/.agents/skills/verify-app/references/features/sidebar.md):

- **Title and a one-paragraph description,** with the feature's *root selector*. The sidebar is described as the left column that lists every note and has a New note button, with root `[data-component="notes-sidebar"]`.
- **Sub-features:** one named id and a one-line description each. The sidebar has `sidebar-new-note` and `sidebar-select-note`. These ids are the coverage set: a scenario declares which ids it `covers`, and a CI check fails for any id nothing covers (or that is not explicitly skipped with a reason). A `covers` list is only a claim: the runnable example also fails a scenario whose passing assertions never reached a declared id, and its coverage check reads the record of the last run rather than the declarations.
- **How to get to it (user point of view):** one bullet per sub-feature with the steps a real user takes. For `sidebar-new-note`: start the app and click New note at the top of the left column.
- **Driving it:** preconditions (point back to the README baseline), per-OS keys where there are any (the sibling [search.md](../example/.agents/skills/verify-app/references/features/search.md) uses `Meta+K` on macOS and `Control+K` elsewhere), selectors, command ids (documentation only, they point at the handler), the observable end states to poll, and gotchas learned the hard way. The sidebar's gotcha: every new note starts with the same title, so tell rows apart by position or `data-note-id`.

The files teach how to *use* a feature, not how it is built; for implementation details, read the code, which changes faster than any doc.

### Proof and skip reporting

This is the most important part of the README, and the one agents most need to be told:

- Feature files *define the coverage set*; `cross-cutting-flows.md` adds the shared journeys.
- Evidence that drives through only **one convenient entry point** is not enough when the map lists others (a button and a shortcut, a menu and a context menu).
- Run every entry point and mode the change could affect, and the success, cancel, error, empty and persistence paths.
- Record the *action* and the *final observed state*. Setup-only evidence, a final screenshot alone, or a synthetic reproduction that bypasses the user's path is not accepted.
- When a path can't be reached, name it, say what blocks it, and cover the closest real path that remains.

The exact wording to copy is in the [features README template](../templates/skills/verify-app/references/features/README.md); the example fills it in [here](../example/.agents/skills/verify-app/references/features/README.md).

## How to apply

1. Once you have `verify-app` ([02](02-verification.md)), create a `references/features/` directory next to it from [templates/skills/verify-app/references/features/README.md](../templates/skills/verify-app/references/features/README.md): index, baseline preconditions, driving conventions, proof and skip rules, full sweep.
2. For each feature, copy [templates/skills/verify-app/references/features/_feature.template.md](../templates/skills/verify-app/references/features/_feature.template.md) and fill in its four parts: overview and root selector, Sub-features, How to get to it, Driving it.
3. Put cross-feature journeys in [templates/skills/verify-app/references/features/cross-cutting-flows.md](../templates/skills/verify-app/references/features/cross-cutting-flows.md).
4. Let the agent draft the first version with [templates/skills/create-verification/SKILL.md](../templates/skills/create-verification/SKILL.md), then review it yourself: a wrong map sends the agent the wrong way.
5. Make the agent's verify reports follow the proof rules: list the coverage set, every entry point run, the action and final state, which paths were skipped and why, and which mocks (if any) were used and why they are valid.
6. Take 3-5 real bug reports (including the worst-written ones) and ask the agent to identify the relevant feature and the navigation steps. Wherever it gets lost is a gap in the map.
7. Hook [templates/skills/maintain-verification/SKILL.md](../templates/skills/maintain-verification/SKILL.md) into the workflow for PRs that touch UI or navigation, and run its two-way check in CI ([templates/ci/check-feature-map.sh](../templates/ci/check-feature-map.sh)): every feature directory has a description file and an index line, and the reverse.
8. Run a full sweep now and then, in index order; anything that breaks but isn't in the map becomes a follow-up.

## Anti-patterns

- You have a control skill, yet the agent still flounders when it hears a feature name.
- Proof drives through a single button or shortcut while the map lists more menus, context menus and other variants.
- A report that has only the setup, only a final screenshot, or a synthetic reproduction that bypasses the user's path.
- Using a mock that hides the UI layer, a service, a backend request or the persistence layer, then calling it "verified".
- An unreachable path that goes unnamed; silently skipping it.
- A feature map written once and left to rot: code changes, selectors change, the map doesn't.
- Describing features only by module names instead of how users call them, or leaving out selectors and ways to get there.
- Cramming the whole map into one giant file instead of one file per feature.

## Related

- [templates/skills/verify-app/references/features/README.md](../templates/skills/verify-app/references/features/README.md)
- [templates/skills/verify-app/references/features/_feature.template.md](../templates/skills/verify-app/references/features/_feature.template.md)
- [templates/skills/verify-app/references/features/cross-cutting-flows.md](../templates/skills/verify-app/references/features/cross-cutting-flows.md)
- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [templates/skills/create-verification/SKILL.md](../templates/skills/create-verification/SKILL.md)
- [templates/skills/maintain-verification/SKILL.md](../templates/skills/maintain-verification/SKILL.md)
- [templates/ci/check-feature-map.sh](../templates/ci/check-feature-map.sh)
- [example/README.md](../example/README.md)

Next → [04 - Skills from failures](04-skills-from-failures.md)
