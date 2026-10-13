<!-- HOW TO USE:
1. Use this when a coordinator agent owns a long-running goal (hours to days) that spans many PRs or tasks, for example landing a migration. The coordinator runs on a loop or schedule and posts a short "tick" report each time, so a human can glance and trust it without watching.
2. Fill the goal block and paste it into the coordinator's first prompt. Set the tick cadence with whatever scheduling your agent tool has (loop command, cron, scheduled agent).
3. Prerequisites: the work itself has hard guardrails (CI, evidence reports, atomic PRs) and the coordinator has the narrowest permissions needed. Do not start a goal like this before you trust single-agent work; see docs/08-scaling-to-cloud-agents.md.
4. Replace {{PLACEHOLDERS}}; delete this comment block when done.
-->

# Long-running goal with ticks

## 1. Goal statement

```text
GOAL: {{one sentence outcome, for example "Land the entire {{PROGRAM_NAME}} migration on main"}}
WHY: {{the reason it matters, so the coordinator can make trade-offs}}
SCOPE: {{what is in; what is explicitly out}}
DONE WHEN (all must be true, each checkable by a command or link):
  1. {{criterion, for example "All PRs in the list below are merged to main"}}
  2. {{criterion, for example "{{GATE_COMMAND}} passes on main"}}
  3. {{criterion, for example "Evidence reports linked on every PR"}}
  4. {{criterion, for example "A final program report with the merge ledger is posted"}}
NOT ALLOWED: {{actions needing a human: force-push to main, weakening CI, merging without the required review, spending above {{BUDGET}}}}
```

Rules for the goal: done criteria are observable, not "looks good"; the coordinator never edits the criteria to match what it achieved; if a criterion cannot be met, it says so in a tick.

## 2. Tick cadence

- A tick every {{CADENCE}} (for example 30 minutes while PRs are moving, hourly overnight). Tick when something changes as well as on schedule.
- Each tick starts by re-reading real state (PR status, CI results, the merge queue), not memory of the last tick. Facts first, then the plan.
- Between ticks the coordinator advances the work mostly by delegating it to subagents (restack, rerun CI, open the next atomic PR, answer review feedback) and checking what they report. It does little of the implementation itself.

## 3. Tick report format

Post exactly this shape, short enough to read in 20 seconds:

```text
Tick <HH:MM> (goal running <elapsed>)
In flight:
  - <PR/task id and title>: <state: waiting on CI | needs restack | in review | merging | blocked> (<link>)
  - ...
Done since last tick: <ids merged or finished, or "none">
State: <N of M done>; next action: <the single next step>
ETA: <time or range for the next milestone and for DONE>, based on <reason, for example "CI cycle ~25 min, 3 PRs cascade behind it">
Blockers: <none | what, who owns it, since when>
Escalation: <none | "escalating only if the next tick shows no motion" | escalating now because ...>
```

Rules:

- "Motion" means a state change on at least one in-flight item (a CI result, a merge, a restack, a review comment answered). Time passing is not motion.
- Report failures and surprises in the same tick they appear; never pad a tick with success text.
- ETAs come from observed cycle times, and are updated when they were wrong.

## 4. Escalation: only if the next tick shows no motion

The coordinator does not interrupt a human the first time something is slow. The policy:

1. If an item is waiting (CI, restack, a queue), say so and name what it is waiting for. Probe deeper at the next tick if it has not moved (read the logs, rerun, check the queue).
2. If the next tick still shows no motion on anything, escalate: one message to {{ESCALATION_CHANNEL}} with what is stuck, evidence (links, log lines), what was tried, and what decision or action is needed.
3. Escalate immediately, without waiting a tick, only for: an action not allowed by the goal, a security or data-loss risk, or spend above {{BUDGET}}.

## 5. LAST HUMAN DEPENDENCY (pinned note)

When the only remaining blocker is a human, pin one note where the human will see it (the goal's notes, the PR, the team channel) and keep it current:

```text
LAST HUMAN DEPENDENCY: <exact approval or action needed>
From: <named person or group, @-mentioned>
Why it cannot be automated: <for example "hard security route: no bot approval, no downgrade, by policy {{POLICY_LINK}}">
Evidence pinned: <links: PR, passing CI, verification report, diff summary>
What happens after: <the remaining automatic steps and the ETA once approved>
```

Rules:

- There is exactly one such note at a time; if several humans are needed, list them in one note.
- Mention every team that must act, with the evidence in the note so nobody has to ask the coordinator for context.
- Remove the note the moment it is resolved and say so in the next tick.

## 6. Closing the goal

When all done criteria hold, the coordinator posts a final report: what landed (ledger of PRs with links), evidence, what was deferred and why, follow-up items, and cost. It stops the loop, shuts down subagents it started, and removes temporary files. A goal that was abandoned says so and why, and leaves the state clean for the next owner.
