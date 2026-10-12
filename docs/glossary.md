# Glossary - Key terms

Each entry links to the doc that covers it in detail.

| Term | Meaning | Doc |
|---|---|---|
| **Trust curve** | The curve of trust in agents: from in-the-loop with a few agents that can't be parallelized, to letting agents merge changes covered by hard guardrails themselves and reviewing afterwards on the main branch. Trust is personal to each person and team, and there are no shortcuts. | [01](01-trust-curve.md) |
| **Verification skill** | A skill that gives an agent the ability to actually run the app, capture CPU traces and heap snapshots, open a simulator, and then check the results. It ensures code is *correct*, not that it is *good*. In this repo: `verify-app`. | [02](02-verification.md) |
| **Control skill** | A skill that drives the app programmatically (Chrome DevTools Protocol, simulator utilities...). It is the "hands and feet" of verification: a directory with a CLI, `--help`, its own tests, `doctor`, and worktree isolation. | [02](02-verification.md) |
| **doctor** | A read-only command of a control skill: it reports worktree context, who holds the control port, watchers, and build freshness, answering "is this instance worth driving?" | [02](02-verification.md) |
| **Worktree isolation** | Each worktree has its own derived port and isolated profile, so parallel agents don't trample the user's session. Without the flag (`--worktree`, or `--target <checkout>` when one CLI drives other checkouts) it refuses rather than falling back to the default port. | [02](02-verification.md) |
| **Gates (beside the verdict)** | Build, lint and typecheck run by a control skill's CLI next to the scenarios. They are reported beside the verdict and never change it; lint is judged as a delta against the base commit. Not the same as the single `GATE_COMMAND` that CI runs. | [02](02-verification.md) |
| **Feature map** | A directory that ships with a control skill (`references/features/`): one file per feature, plus `cross-cutting-flows.md` and a README that doubles as the index and the proof rules. Each file describes the feature from the user's point of view: sub-features, how to get there, shortcuts, selectors. It turns vague reports into navigation instructions. | [03](03-feature-map.md) |
| **Coverage set** | The set of entry points, modes, variants and paths (success / cancel / error / empty / persisted) that a feature file defines and a proof must cover. | [03](03-feature-map.md) |
| **Cross-cutting flow** | A journey that spans several features, recorded in `cross-cutting-flows.md`. It complements each feature file's coverage set. | [03](03-feature-map.md) |
| **Skill** | Markdown that encodes instructions for an agent. Putting high-quality tokens in first helps the model pattern-match in its "smarter" region. Born from observed failure modes. | [04](04-skills-from-failures.md) |
| **Mode skill** | A skill that acts as a router: non-negotiable rules, a trigger-to-leaf-skill table, and the principles to cite. | [04](04-skills-from-failures.md) |
| **Leaf skill** | A skill specialized in one job that a mode skill routes to, for example `investigate`. | [04](04-skills-from-failures.md) |
| **Principle** | One file per principle under `team-mode/principles/` (for example `fix-root-causes`). The decision must cite which principle shaped it. | [04](04-skills-from-failures.md) |
| **Playbook** | A process document inside a skill directory (`playbooks/`), called by a mode skill or leaf skill, for example a prototype playbook or an eval playbook. | [04](04-skills-from-failures.md), [05](05-evals.md) |
| **Backseat driver** | An attitude of active observation, asking questions as in pair programming: read the tool calls, code and thinking blocks to see where the agent breaks before writing a skill. | [04](04-skills-from-failures.md) |
| **Eval** | A "unit test for agents": checks whether a skill does what we think it does. You can build one yourself, no framework needed. | [05](05-evals.md) |
| **Coordinator** | The main agent that sets the rubric, spawns subagents in their own directories, and scores them. In a long-horizon goal, it also posts ticks. | [05](05-evals.md), [08](08-scaling-to-cloud-agents.md) |
| **Judge** | The grading agent, on a *different model* from the one that ran the task, to cross-check and counter bias. | [05](05-evals.md) |
| **Hill-climbing** | Using eval scores to iterate on a skill until it hits a threshold, for example your tool's loop/schedule feature (e.g. `/loop` in Claude Code or Cursor) running until every item scores 10/10. | [05](05-evals.md) |
| **Guardrail (hard / soft)** | Five enforcement layers, strongest to weakest. The first two turn CI red, so they are *hard*; the other three are *soft*, and agents can forget them. Don't rely on soft layers alone. The full table is in doc 06. | [06](06-guardrail-layers.md) |
| **AI review bot** | A tool that reviews code with AI, running in CI. Useful, but a *soft* layer: it can miss things and does not reliably block a merge. | [06](06-guardrail-layers.md) |
| **Architecture contract** | A document that treats the agent's predictable behavior as a design input: the behaviors, five rules, public nouns and package boundaries. The goal is to make the locally obvious change also the globally correct one. | [07](07-agent-first-architecture.md) |
| **Organic architecture** | The architecture that "grows on its own" in a vibe-coded app without guardrails: each task is solved the most convenient way, so the codebase gradually gets out of control. | [07](07-agent-first-architecture.md) |
| **Durable value / one writer** | The rule: every durable value has exactly one obvious writer. A Client holds the user's durable machine state with a single writer behind commands. | [07](07-agent-first-architecture.md) |
| **Feature** | A public noun: an owned directory, with all of the feature's code co-located. | [07](07-agent-first-architecture.md) |
| **Entrypoint** | A public noun: the entry point of a Feature, discovered from a reserved file rather than registered in a shared catalog. | [07](07-agent-first-architecture.md) |
| **Repeated noun** | A public noun for the repeated element of your product (a card, widget, plugin or route), discovered from reserved files in the same way as Entrypoints. | [07](07-agent-first-architecture.md) |
| **Host** | A public noun: everything outside the pure app (OS, filesystem, network, other processes), behind exactly one typed contract. | [07](07-agent-first-architecture.md) |
| **Cloud agent** | An agent that runs on a remote machine with its own environment. Once the environment and control skills are built, the benefit multiplies across the whole team. | [08](08-scaling-to-cloud-agents.md) |
| **Bug-repro agent** | An agent that takes a bug report, opens a cloud VM, runs the app with a control skill and reproduces the bug, with evidence (including a verdict of "already fixed on main"). | [08](08-scaling-to-cloud-agents.md) |
| **Automation** | Work a cloud agent does on its own when a signal arrives, for example receiving a bug report. | [08](08-scaling-to-cloud-agents.md) |
| **Automerge** | The agent merges changes covered by hard gates itself, with no human approving each PR first. Humans review afterwards on the main branch. | [08](08-scaling-to-cloud-agents.md) |
| **Tick** | A periodic update from a coordinator running a long-horizon goal: PRs in the pipeline, ETA, next step, and escalate only if the next tick shows no progress. | [08](08-scaling-to-cloud-agents.md) |
| **Last human dependency** | A pinned note naming the last piece of work only a human can do (for example a hard security approval), with the evidence and the person to @-mention. | [08](08-scaling-to-cloud-agents.md) |
