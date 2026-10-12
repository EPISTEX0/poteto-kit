# 06 - Guardrail layers: hard (red CI) beats soft (reminders)

## The idea

The ways to make an agent do the right thing fall into **five layers**, strongest to weakest: (1) the codebase, (2) static analysis (lint/compiler/CI), (3) rules / AI review bot, (4) skills, (5) a "style guide". The first two turn CI red, so they are **hard**. The last three are **soft**: worth having, but never the only source of enforcement. Every comment a reviewer repeats is a "code smell" that should become a hard rule.

| # | Layer | Hard / soft |
|---|---|---|
| 1 | codebase | hard (turns CI red) |
| 2 | static analysis (lint/compiler/CI) | hard (turns CI red) |
| 3 | rules / AI review bot | soft |
| 4 | skills | soft |
| 5 | "style guide" | soft |

"Style guide" is in quotes because it is usually a document of conventions with no enforcement mechanism. An AI review bot runs in CI but still sits in the soft layers: it does not reliably block a merge, and it can miss things.

## Why it works

- **Agents copy existing patterns**, so your repo's conventions are the strongest guidance there is: every new feature ends up looking like the old ones. The tighter the architecture, the more features get built by convention, and the stronger layer 1 becomes.
- **Soft rules get forgotten; red CI doesn't.** Rules, skills and AI review bots live in the context window and can be skipped or applied inconsistently. Red CI blocks the merge whether or not the agent remembers. With only rules, bots, skills and a style guide, it is just a matter of time before the codebase turns to garbage. Layer your defenses, but invest in what is hard and enforced.
- Your tech stack is a guardrail too. Rust, for example, is attractive again because its compiler is so strict (the borrow checker). If you can guarantee the agent writes no `unsafe` blocks, code that compiles is nearly code that works, and humans don't have to re-check it themselves.
- Errors get caught **before** merge and reproducibly, so you can drop manual review for that class of error. This is the precondition for auto-merge ([08](08-scaling-to-cloud-agents.md)).
- The worst place to be is "code review land", where a constraint or invariant of the codebase is held only by a person reading code and commenting "don't do that". Treat every such comment as a code smell and ask: can this become a lint rule, a CI failure, or can the whole class of problem be eliminated? Knowledge moves out of the reviewer's head and into the machine, and review cost shrinks instead of growing with the number of changes.
- Real examples of hard rules: ban `useEffect` (CI fails and the error names the alternative); ban code comments, because agents almost always write comments describing history that is no longer relevant (for example, recording a piece of feedback that was only true for one PR as if it were a permanent rule); separate `main` and `renderer` directories with a dependency-graph check that blocks cross-imports. Details in [07](07-agent-first-architecture.md); the equivalent tools for other languages are in [09](09-other-stacks.md).
- Constraints in CI make writing code "annoying", but the agent absorbs the annoyance, and humans no longer have to worry about a regression slipping through.

## How to apply

1. Fill in [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md) for your repo using the five layers. For each important rule, which layer from the table above holds it today? A rule that lives only in layers 3-5 is a soft rule.
2. For rules that live only in the soft layers, pick the one that breaks things most and move it to a hard layer: write a lint rule, a CI check, or a dependency check. [09](09-other-stacks.md) lists the import-boundary, banned-API and comment-policy tools for each stack.
3. For 2 weeks, log every repeated review comment and run it through [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md): make it a lint rule, make it a CI failure, or eliminate the class of problem.
4. Create `AGENTS.md` from [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template). Remember it is a soft layer, there to support the hard ones.
5. Run the gates through [templates/ci/ci.yml](../templates/ci/ci.yml) so CI goes red on a violation. The same directory ships two reusable checks, [check-feature-map.sh](../templates/ci/check-feature-map.sh) and [check-coverage.mjs](../templates/ci/check-coverage.mjs).
6. Write an architecture contract following [templates/guardrails/architecture-contract.md](../templates/guardrails/architecture-contract.md) to give layer 1 concrete content.
7. See [example/README.md](../example/README.md) for a small repo with gates that actually run, and tests proving that each rule really fires.

## Anti-patterns

- All enforcement lives in AGENTS.md, skills, review bots and a style guide, which means only layers 3-5.
- You are writing the same review comment for the third time.
- A rule exists, but CI stays green when it is violated.
- The codebase has no clear conventions, so each feature is built a different way. The agent will copy the mess too.
- Choosing a stack with weak static-analysis tooling, then expecting the agent to police itself.
- A lint rule exists, but no test proves it catches a violation.

## Related

- [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md)
- [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md)
- [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template)
- [templates/guardrails/architecture-contract.md](../templates/guardrails/architecture-contract.md)
- [templates/ci/ci.yml](../templates/ci/ci.yml)
- [09 - Other stacks](09-other-stacks.md)
- [example/README.md](../example/README.md)

Next → [07 - Agent-friendly architecture](07-agent-first-architecture.md)
