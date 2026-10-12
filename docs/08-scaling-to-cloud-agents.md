# 08 - Scaling up: from local to cloud agents, automation and auto-merge

## The idea

There is a sensible order for scaling up. Start **local** so you can watch the agent, and build verification. Only then move to **cloud agents** and **automation** (for example, an agent that reproduces bugs automatically). Last comes **auto-merge**, with review on the main branch afterwards. Skipping a step only burns tokens. What makes auto-merge safe is a codebase with hard guardrails and small, atomic changes. For long-running work, a coordinator reports progress with ticks and calls a human only when truly needed.

## Why it works

### Local first, cloud second

- Local gives you **observability**: you see how the agent launches the app and which APIs it calls to interact with it. Cloud gives you **scale**. Reverse the order and you multiply something you don't yet understand.
- If you spend a little time building the cloud environment ([templates/skills/verify-app/references/cloud-environment.md](../templates/skills/verify-app/references/cloud-environment.md)), control and verification skills pay off hugely, because they don't just make one engineer better, they lift the whole team: the same skill runs everywhere.
- Take a **bug-repro agent** ([templates/automation/bug-repro.md](../templates/automation/bug-repro.md)). It receives every bug report, spins up a cloud VM, runs the app on that machine, and uses the same control skills you already trust locally to reproduce the bug or the user's report. The result might be "reproduced", or "reproduced, but already fixed on main, so just ship a new build". That is valuable information you didn't have to spend hours with an agent to find. The whole team benefits.
- But this is a journey: trust comes first. If you are still early on the curve, don't jump to spawning hundreds or thousands of cloud agents; it wastes tokens and gets very expensive. The path: verification first, trust locally, then scale up to the cloud with agents that pick up signals on their own (like bug reports) and send PRs. The last step is auto-merge with review on main. There are no shortcuts on the curve ([01](01-trust-curve.md)).

### Small, atomic changes

- You don't need a hard cap on PR size (some PRs are a few dozen lines, some are a thousand lines because they mostly delete files), but encourage agents to split work into multiple PRs.
- The reason: git history is a rich source of context for later agents, and each PR describes one small piece atomically. It is easy to revert and easy to tell where a bug lives, instead of hiding in a giant PR where no one knows what is inside.
- This is the practical precondition for reviewing *after* merge on main. Auto-merge is only safe when the hard layer ([06](06-guardrail-layers.md)) catches errors before merge. Review on main is then just a confirmation step. Write down which kinds of change may merge unattended, and what stops that, in [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md).

### Tokens and ROI

- Upfront token cost is large (refactoring the codebase, adding constraints). But if the future is agents writing all the code, you want a lean team, not one that bloats into an organization of thousands of engineers with all the overhead.
- The value of agents is that they can do what wasn't possible before: one person applying constraints across an entire codebase, work that could previously take years. The question for whoever leads: hire people to do it, or pay tokens to build a codebase in which even the "most naive" agent does well.
- Once you get there, even an agent that isn't a top-tier model writes very good code in a constrained codebase, and the benefit spreads to PMs, designers and engineers new to the codebase. Nothing is free and tokens are expensive; run the ROI analysis for your own team.
- You can get there without "going broke" if you invest in order: verification, hard guardrails, then scale.

### A coordinator running a long-horizon goal

A coordinator agent with an active **goal** (for example "land a chain of PRs") can run for hours. [templates/automation/goal-ticks.md](../templates/automation/goal-ticks.md) holds the pattern that keeps it auditable: a goal statement with checkable done-criteria, **ticks** (short, timestamped status updates covering what is in flight, what finished, the ETA and the next action), escalation only if the next tick shows no motion, and one pinned **last human dependency** note. Why this shape:

- **Ticks make an hours-long task auditable.** Instead of going quiet and then reporting "done", the agent gives status, ETA and next step at every beat. Skim a few ticks and you know whether it is stuck, without reading the whole run. This ties directly to reviewing on main after auto-merge.
- **Escalating only when there is no motion** keeps the signal clean: humans are called when needed, not after every step, and not too late either.
- **Pinning the last human dependency** is honest about what automation can't replace, such as an approval that policy reserves for a person. Knowing the final dependency lets everything else run as far as it can, without pretending to get past that gate.
- **One home per goal** (its ticks and notes in one place) keeps parallel coordinators from mixing up their context.

## How to apply

1. Run 1-3 local agents, watch their tool calls, and perfect `verify-app` ([02](02-verification.md)) first.
2. Once verification is trustworthy, pick *one* repeatable process to move to cloud/automation. The nearest example: an agent reads a bug report, reproduces it with `verify-app` in a prepared cloud environment ([cloud-environment.md](../templates/skills/verify-app/references/cloud-environment.md)), and returns "reproduced / already fixed on main / unclear", with evidence. Start from [templates/automation/bug-repro.md](../templates/automation/bug-repro.md).
3. Ask agents to split work into atomic PRs. Write that into [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template) (a soft layer) and, if needed, add a PR size check to CI ([templates/ci/ci.yml](../templates/ci/ci.yml)) as a warning, not a hard cap.
4. Enable auto-merge only for the kinds of change where a hard gate ([06](06-guardrail-layers.md)) already blocks the common errors. Start with a low-risk kind, and record the scope in [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md).
5. Review merged PRs on main on a fixed schedule. Run each repeated comment through [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md).
6. Work out the ROI: the one-time token cost of building guardrails versus the cost of manual review and hiring.
7. For a long-running goal (for example landing a PR chain), give the coordinator a goal block and a tick format from [templates/automation/goal-ticks.md](../templates/automation/goal-ticks.md), including the escalation rule and the pinned last-human-dependency note.
8. Keep each goal's ticks and notes in one place, so parallel coordinators don't mix up context.
9. See how the gates fit together in [example/README.md](../example/README.md).

## Anti-patterns

- Spawning many agents when you still don't trust one.
- Skipping the local step and never having watched an agent interact with the app.
- Moving to the cloud before the environment is built (control skills work on your machine but not in the cloud).
- Giant PRs that make reverting and tracing a bug's source nearly impossible.
- Auto-merging without hard gates, or reviewing on main without turning comments into rules.
- Ignoring tokens and ROI, which is both costly and leaves you unable to tell whether it's worth it.
- An agent running for hours with no ticks, so you only learn it is stuck once everything is late.
- An agent that escalates after every step (noisy) or never escalates (silent until it breaks).
- A mandatory human dependency (a hard approval) buried in the chat stream instead of pinned.

## Related

- [templates/README.md](../templates/README.md)
- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template)
- [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md)
- [templates/ci/ci.yml](../templates/ci/ci.yml)
- [templates/automation/goal-ticks.md](../templates/automation/goal-ticks.md)
- [templates/automation/bug-repro.md](../templates/automation/bug-repro.md)
- [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md)
- [templates/skills/verify-app/references/cloud-environment.md](../templates/skills/verify-app/references/cloud-environment.md)
- [example/README.md](../example/README.md)

Next → [09 - Other stacks](09-other-stacks.md)
