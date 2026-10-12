<!-- HOW TO USE:
1. This is a design document for an agent-friendly architecture, in the style of a framework built for contributors who see only a small part of the system. Copy it to docs/architecture-contract.md and adapt it: it is a collection of ideas and principles, not a library to install. Ask your agent to build the matching conventions and checks for your stack.
2. Fill the "how we enforce it here" column and the public nouns table with your real structure. Every row you cannot enforce mechanically is a debt; link it to guardrails/enforcement-layers.md.
3. Keep section 2 (the agent-behaviour contract) intact: the rules only make sense as responses to those behaviours.
4. Replace {{PLACEHOLDERS}}; delete this comment block when done.
-->

# Architecture contract for {{PROJECT_NAME}}

Goal: make the locally obvious change the globally correct change. Unsafe shortcuts fail with an error that names the supported path.

## 1. The contributor context model

Every contributor, human or agent, arrives with:

- a narrow prompt (one task, little background),
- a few nearby files (what is open, what search returned),
- no complete model of the system.

The architecture cannot assume contributors will read the whole codebase or remember invariants. It has to put the correct path right where they are standing, and make every other path loud.

## 2. The agent-behaviour contract

A coding agent optimizes for what fits in its context. These behaviours are predictable; treat them as design inputs, not as defects to complain about.

| Observed behaviour | Design consequence |
| --- | --- |
| Copies the nearest working pattern | Make the nearest pattern the right one: keep a clean, conventional exemplar next to every kind of thing; delete bad examples quickly |
| Edits the file that is already open | Make the right file the obvious one: colocate everything for a feature so the open file is usually the right file, and keep shared roots free of per-feature code |
| Takes the shortest path that compiles | Make the correct path the shortest one, and make shortcuts fail to compile, fail lint, or fail in CI |
| Avoids deleting code whose callers it cannot see | Make callers discoverable (one folder per feature, explicit entry files) so dead code is visibly dead and can be removed safely |
| Follows the requested implementation even when it conflicts with a system invariant | Make the invariant mechanical, so the request fails with a clear error instead of succeeding wrongly |

## 3. The five rules (defaults)

| # | Rule | How we enforce it here |
| --- | --- | --- |
| 1 | The conventional path requires fewer decisions than a shortcut | {{ENFORCEMENT_1: for example a scaffold command, one file naming convention, reserved file names that are picked up automatically}} |
| 2 | Forbidden dependencies fail mechanically | {{ENFORCEMENT_2: for example import-boundary check on the dependency graph in CI, separate TS projects per process or package}} |
| 3 | Every durable value has one obvious writer | {{ENFORCEMENT_3: for example state behind a store with commands; lint rule against writing it elsewhere}} |
| 4 | New product work adds isolated files rather than branches in shared roots | {{ENFORCEMENT_4: for example discovery from reserved files; CI check that shared roots contain no feature-specific identifiers}} |
| 5 | Exceptions are narrow, explicit, and reviewed as architecture changes | {{ENFORCEMENT_5: for example an allowlist file with owner and reason, changes to it need an architecture reviewer}} |

Each rule must name its layer in `enforcement-layers.md`. Prefer layers 1 and 2 (codebase, static analysis); use rules and skills only as a backup.

## 4. Public nouns

A small set of nouns carries the rules. Everything a contributor does maps to a noun with one conventional way to create it. Fill the table for your app; keep the first four rows' idea even if you rename them.

| Noun | What it is | Where it lives | How it is created | How it is discovered | Enforced by |
| --- | --- | --- | --- | --- | --- |
| **Feature** | A user-visible capability | Owned folder `{{FEATURES_DIR}}/<feature-id>/`, everything for the feature inside | {{SCAFFOLD_COMMAND}} | Folder name = id; feature-map file `<feature-id>.md` | {{CHECK}} |
| **Entrypoint** (route, command, menu item, shortcut) | How the user reaches a feature | Reserved file in the feature folder: `{{ENTRYPOINT_FILE}}` | Add the reserved file | Discovered by scanning reserved files, never registered in a shared inventory | {{CHECK}} |
| **{{REPEATED_NOUN}}** (for example chat card, widget, plugin) | The repeated element of your product | Reserved file in the feature folder: `{{CARD_FILE}}` | Add the reserved file | Discovered the same way | {{CHECK}} |
| **Client / store** | Durable state (the user's data on this machine) | `{{CLIENT_DIR}}` | Declare the value and its commands | One writer per durable value, behind commands; readers subscribe | {{CHECK}} |
| **Host** | Everything outside the pure app: OS, filesystem, network, other processes | `{{HOST_DIR}}` | Implement the typed host contract | One typed contract; callers never reach past it | {{CHECK}} |

Discovery from reserved files, rather than registering in shared lists, is what stops shared roots from becoming merge-conflict and branching hot spots, and lets an agent add a feature by adding files only.

## 5. Package boundary

The framework and the application are separate packages with a one-way dependency:

- framework: `{{FRAMEWORK_DIR}}` (conventions, discovery, host contract, checks)
- application: `{{APP_DIR}}` (features, product code)
- **The framework never imports application code.** The application depends on the framework, never the reverse. Enforce it with the dependency-graph check in CI and with separate build targets so the import cannot resolve.

The same boundary idea repeats inside the application: processes or layers that must not import each other (for example UI process versus main process) are enforced the same way.

## 6. Unsafe shortcuts fail with an error naming the supported path

Every mechanical check must say what to do instead, not just that it failed. Examples of the shape:

- `Importing {{PROCESS_A_DIR}} from {{PROCESS_B_DIR}} is not allowed. Call it through the host contract in {{HOST_DIR}} (see docs/architecture-contract.md section 4).`
- `Features are discovered from {{ENTRYPOINT_FILE}}. There is no registry to edit for '<id>'; add the reserved file instead.`
- `'<value>' is written outside its owner. Use the command '<command>' in {{CLIENT_DIR}}.`

An error that names the supported path teaches the agent the right move in the same turn, which a review comment a day later cannot. Write the message as if the reader has never seen the repo.

## 7. Using the contract

- New conventions start as a row in section 3 or 4 with an enforcement plan; a convention with no mechanical enforcement is a soft rule (see `enforcement-layers.md`).
- Review architecture exceptions as architecture changes: narrow, explicit, written down.
- When an agent finds a shortcut that works, treat it as a bug in the architecture: close it with a check and an error message, then add the lesson to `AGENTS.md` and the relevant skill.
- A greenfield app built fast without these constraints accumulates "organic" structure: agents solve each task in whatever way is most convenient, and the codebase drifts out of anyone's understanding. Put the constraints in before that happens; a brownfield app with strong conventions already has most of them.
