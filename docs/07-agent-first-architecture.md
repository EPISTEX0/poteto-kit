# 07 - Agent-friendly architecture: the architecture contract

## The idea

An agent does fairly well in a brownfield codebase that already has guardrails. A greenfield vibe-coded project is both the biggest risk and the biggest opportunity. The approach: write an **architecture contract** that treats the agent's predictable behavior as a *design input*, and build the structure so that "the shortest path is the best path". The locally obvious change is also the globally correct one, and an unsafe shortcut fails with an error that names the supported path.

## Why it works

### Brownfield, greenfield, and "organic architecture"

- Guardrails built for the contributor with the *least* context work for agents too. Mature engineering organizations design frameworks, conventions and credential limits so that a newcomer's honest mistake cannot reach production. An agent arrives the same way: a narrow prompt and no full model of the system. If your codebase already has that level of infrastructure, agents do reasonably well, and you can always add more.
- A greenfield vibe-coded project has no guardrails. Each task gets solved the most convenient way ("organic architecture"), so the codebase gradually spirals out of control: humans don't understand it, agents optimize for shortcuts, and you pay the price. So start a codebase with very strong constraints, and for an app that is already vibe-coded, invest in refactoring it into a constrained structure. The investment (tokens, effort) is big but worth it: afterwards you barely have to read each change, and less experienced teammates (PMs, designers, new engineers) can contribute at a high level too.

### The codebase is the agent's memory

An agent starts each session without remembering the last one. What it has is your code, and it extends what it finds there. In Lauren Tan's words, "your codebase is a form of memory to agents!" ([tweet](https://x.com/poteto/status/2109699980248408574)) Whatever patterns the repo holds, good or bad, are the ones that get repeated.

- **Every bad pattern in the code is a future copy.** A nit, an annoyance, a mistake you watched an agent make: once the pattern is in the code, the next agent finds it and copies it. Turn it into a constraint (the correction ladder in [06](06-guardrail-layers.md), which also says when a mistake is worth one) and fix the existing instances in the same change, or it spreads.
- **That is why so much of the work is refactoring.** Lauren says "that's why most of the volume of PRs i land are refactoring" ([tweet](https://x.com/poteto/status/2109361189071499640)). A refactor edits the agent's memory: it removes the bad examples and the second way of doing the same thing, so the nearest pattern to copy is the right one.
- **The finish line is a codebase locked down enough that a low-context agent can one-shot a good PR.** Lauren puts the goal as a codebase "locked down enough that even agents with little context can one shot a high quality PR" ([tweet](https://x.com/poteto/status/2109699980248408574)). A fresh agent with a narrow prompt and no history opens a PR that passes the gate and that you would merge. That is the contributor context model below, taken to its end.

### The contributor context model

The assumption: many contributors (human or agent) arrive with a narrow prompt, a few nearby files and *no full model* of the application. The goal: turn the locally obvious change into the globally correct change.

**Five agent behaviors, treated as predictable design inputs:**

1. copy the nearest working pattern;
2. edit the file that is already open;
3. take the shortest path that compiles;
4. avoid deleting code whose callers they can't see;
5. follow the requested implementation, even when it contradicts a system invariant.

**Five rules:**

1. The conventional path takes fewer decisions than the shortcut.
2. Forbidden dependencies fail mechanically.
3. Every durable value has one obvious writer.
4. New product work adds isolated files, not branches in shared roots.
5. Exceptions must be narrow, explicit, and reviewed like architecture changes.

**Five public nouns that carry those rules** (the table is in section 4 of the [contract](../templates/guardrails/architecture-contract.md)):

- A **Feature** gets its own owned directory, and all the code that contributes to it (UI, logic, tests) lives in one place (co-located), so the agent doesn't have to hunt for it.
- An **Entrypoint** (a route, command, menu item or shortcut) is how the user reaches a feature. It is *discovered from a reserved file*, not registered in a shared catalog.
- A **repeated noun** of your product (a card, widget, plugin or route) is discovered from reserved files in the same way.
- A **Client** (or store) for the user's durable state has exactly one writer, behind commands.
- A **Host** covers everything outside the pure app (OS, filesystem, network, other processes) and sits behind exactly one typed contract.

Beside the nouns sits the **package boundary**, which repeats the same idea: framework and application live in separate directories, and *the framework never imports application code*.

Each feature is a noun with a conventional way to create it, so most work fits inside a single directory.

### Why this design works

- **The five agent behaviors are design inputs, not bugs to complain about.** Instead of fighting the urge to copy, edit the open file and take the shortest path, the structure is built so those very behaviors produce the right result. That is what "make the locally obvious change the globally correct change" means in practice. Agents love shortcuts; if the shortest path *is* the right path, the agent's default behavior matches the behavior you want, with no persuasion needed.
- **Errors that name the supported path** turn a block into a lesson: the agent sees the failure and reads the right way to do it in the message, instead of guessing.
- **One writer per durable value** eliminates a whole class of bugs where state is written from many places. The agent doesn't need to know the whole system to know where writes are allowed.
- **Discovery from reserved files instead of a shared catalog** means adding a feature only adds files and never edits shared ones. That reduces conflicts and reduces the chance of an agent breaking something it can't see.
- **A framework that doesn't import the app** keeps dependencies one-directional and checkable with a dependency graph.
- Important architecture rules are expressed as **checkable structure**, so a violation is red CI, not an opinion. Example for an Electron app: the `main` and `renderer` processes live in separate directories, and CI checks the dependency graph to block cross-imports. The reason: smooth rendering at 60 fps leaves each frame a 16.7 ms budget, and any task over 50 ms counts as a long task that blocks input. If heavy or I/O-bound code accidentally runs on the renderer, you get frames over the 16.7 ms budget and long tasks (>50 ms). Poor process isolation is a frequent source of performance regressions, because any change can degrade performance, stability or reliability.
- Rule 1 matches "the shortest path is the right path"; rule 4 matches co-locating a feature; rule 2 matches CI blocking cross-imports.
- Infrastructure built "for the weakest engineer" protects humans and agents alike. Newcomers benefit from the same guardrails.
- This is a set of ideas and principles, not a fixed framework. You can describe them to your agent and ask it to build a similar structure for your stack.

## How to apply

1. Write the "contract" for your repo from [templates/guardrails/architecture-contract.md](../templates/guardrails/architecture-contract.md): list the agent behaviors you observe (the five above are a starting point), the five rules, the public nouns, and the package boundaries.
2. List the core "nouns" of your product (analogous to Feature, Entrypoint, a repeated noun such as a card or widget, Client, Host) and decide on *exactly one* way to create each kind.
3. Co-locate: everything for a feature (UI, logic, tests) lives in one directory.
4. Write architecture constraints as automated checks: ban cross-imports between layers, and ban APIs or patterns the team has been bitten by. See how the gates are wired in [templates/ci/ci.yml](../templates/ci/ci.yml) and [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md); [09](09-other-stacks.md) names the import-boundary and banned-API tools for each language, and how reserved-file discovery looks in different frameworks.
5. For every bad agent behavior worth a constraint (see the correction ladder in [06](06-guardrail-layers.md)), add a lint rule or CI check. Don't just write it in AGENTS.md ([templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template)). Fix the existing copies of the pattern in the same change: a rule against something the repo still does in twenty places tells the next agent that the twenty are fine.
6. Test the "shortest path": give a fresh agent, with a narrow prompt and no history, a small feature or bug, and see whether it opens a good PR on the first try and walks into the right structure on its own. If it takes another route, your structure is rewarding the wrong path: find the pattern it copied and turn it into a constraint.
7. In a greenfield project, put these constraints in place *before* you vibe-code much. In brownfield, start where regressions happen most.
8. See a small version in [example/README.md](../example/README.md) (a feature is a directory, `framework/` never imports the app, `client/` is the only writer, and adding a feature means adding a directory).

## Anti-patterns

- Vibe-coding a greenfield project with no constraints and hoping to clean up later.
- A different directory structure for every feature, so the agent has to "grep around".
- Architecture boundaries that exist only in documentation, with no automated check.
- Letting the agent write historical code comments that then stay behind for posterity.
- Copying someone else's ban list wholesale instead of basing it on your own repo's real failures.
- Fixing a bad pattern where you noticed it and leaving the other copies in the repo for the next agent to find.
- Each durable value written from many places; nobody is the "obvious writer".
- Adding a feature by editing a shared registry file (inventory) instead of adding isolated files.
- A framework that imports application code back, or an unsafe shortcut that is only blocked without naming the supported path.

## Related

- [templates/guardrails/architecture-contract.md](../templates/guardrails/architecture-contract.md)
- [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md)
- [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template)
- [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md)
- [templates/ci/ci.yml](../templates/ci/ci.yml)
- [09 - Other stacks](09-other-stacks.md)
- [example/README.md](../example/README.md)

Next → [08 - Scaling to cloud agents](08-scaling-to-cloud-agents.md)
