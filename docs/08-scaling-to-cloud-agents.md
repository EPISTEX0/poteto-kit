# 08 - Scaling up: from local to cloud agents, automation and auto-merge

## The idea

There is a sensible order for scaling up. Start **local** so you can watch the agent, and build verification. Only then move to **cloud agents** and **automation** (for example, an agent that reproduces bugs automatically). Last comes **auto-merge**, with review on the main branch afterwards. A **fuzz swarm** checks a build at scale once verification is strong. Inside an allowed change class, with every required signal green, an agent's risk rating lets humans skip the low-risk PRs and review the rest. Skipping a step only burns tokens. What makes auto-merge safe is a codebase with hard guardrails and small, atomic changes. For long-running work, a coordinator reports progress with ticks and calls a human only when truly needed.

## Why it works

### Local first, cloud second

- Local gives you **observability**: you see how the agent launches the app and which APIs it calls to interact with it. Cloud gives you **scale**. Reverse the order and you multiply something you don't yet understand.
- If you spend a little time building the cloud environment ([templates/skills/verify-app/references/cloud-environment.md](../templates/skills/verify-app/references/cloud-environment.md)), control and verification skills pay off hugely, because they don't just make one engineer better, they lift the whole team: the same skill runs everywhere.
- Take a **bug-repro agent** ([templates/automation/bug-repro.md](../templates/automation/bug-repro.md)). It receives every bug report, spins up a cloud VM, runs the app on that machine, and uses the same control skills you already trust locally to reproduce the bug or the user's report. The result might be "reproduced", "reproduced, but already fixed on main, so just ship a new build", or "not a bug in main: it only appears with an input the app does not support (a missing dependency, an unsupported configuration, data corrupted outside the app)". A valid input that reproduces the bug is "reproduced", with that input as a precondition. That is valuable information you didn't have to spend hours with an agent to find. The whole team benefits.
- **Group related reports before fixing.** When a burst of related reports arrives (say 30 about slowness), give them to one coordinator instead of one agent per report. One agent per report loses the thread between them and repeats work. Reading slightly different reports together also moves the root cause up: the first report points at one screen, and the others show the problem sits further up. Lauren describes this on Matt Pocock's live stream ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). The bug-repro template lists the related open reports so a coordinator can group them.
- But this is a journey: trust comes first. If you are still early on the curve, don't jump to spawning hundreds or thousands of cloud agents; it wastes tokens and gets very expensive. The path: verification first, trust locally, then scale up to the cloud with agents that pick up signals on their own (like bug reports) and send PRs. The last step is auto-merge with review on main. There are no shortcuts on the curve ([01](01-trust-curve.md)).

### The outer loop

The agent loop you run, the inner loop, works from a snapshot of your intent. The snapshot goes stale. New facts arrive in Slack, the issue tracker, X or email: a bug report, a feature request, a limit someone found in the backend. If nothing connects those channels to your agents, you become the proxy who carries each fact over by hand, and how many projects you can run is capped by how fast you can do that.

- **Connect the loops with routines.** A routine subscribes to a channel, filters for what matters (for example "bugs in the desktop app") and forwards it to the coordinator project for that area. The coordinator triages with the verification skill, as the bug-repro agent does above. Keep routines read-only on the source channels. Lauren describes this split on Matt Pocock's live stream: one tool with connectors pulls outside context in, and coordinator projects do the work ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)).
- **Ask the audit question.** Lauren's version is "where am I the bottleneck in this process" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). Then ask why the agent needs you for each answer, and how it could answer its own question with real data (a report, a log, a tracker entry, a trace) instead of guessing.
- **Order still matters.** An agent that triages reports on its own needs a verification skill you already trust ([02](02-verification.md)). Connect the channels after that, not before.

### Standing scanners: queue first, then batch

Not every automation starts from a report. An agent can scan the code on a schedule for patterns you want gone but cannot lint yet (a pattern you can lint already fails CI). Start by queuing: have it append each hit to a document instead of fixing it. Every few days, read the queue and look for one shared root cause. Lauren calls it "a buffer, a queue" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). Fixing every hit on sight with one subagent each is pure execution mode, and it misses the pattern that the queue makes visible. Once you know the shared cause, fixing can be automatic.

When the queue shows a shared cause, take it up the correction ladder ([06](06-guardrail-layers.md)): change the structure so the pattern cannot be written, or turn it into a lint rule, and the scanner has less to find. The history-mining prompt in 06 is the one-off version of this; the scanner is the ongoing one.

### Fuzz swarm: verification at scale

Once the verification skill is solid and the cloud environment works, you can point many agents at one build. A **fuzz swarm** is 10 or more agents that run the real build and use it the way users do, driven by the verification skill and the feature map ([02](02-verification.md), [03](03-feature-map.md)).

- **Most are directed, a few are random.** Directed agents follow paths from the feature map and its coverage set. A few click around at random, like a chaos monkey, to find what nobody wrote down. Lauren's swarm is part of her release and QA process: 10 or more agents, directed plus chaos monkey ([tweet](https://x.com/poteto/status/2107527180263829827)).
- **Real build, test account.** The kit's rule is a non-production backend, with the test account described in [test-account.md](../templates/skills/verify-app/references/test-account.md). Lauren's own practice differs: she describes the fuzzing as running through the features on "a real test user account against the prod backend" ([tweet](https://x.com/poteto/status/2107584297351970839)). Treat production as the owner's explicit decision, and only with accounts that cannot trigger real messages, payments or shared writes, and with no random-clicking agents. Creating 10 or more accounts on a shared environment needs a human's OK. Give each agent its own VM and profile. Some backends keep one session per account, so give each worker its own account or serialize runs (see "One session per account" in [test-account.md](../templates/skills/verify-app/references/test-account.md#one-session-per-account)).
- **Artifacts first; sample the diff.** The output of a run is videos, screenshots and an evidence report. Lauren Tan: "those artifacts are what i primarily review these days" ([tweet](https://x.com/poteto/status/2107529532144234937)). You are looking for something that looks wrong, so read the artifacts first and sample the code.
- **It only works on top of a strong verification skill.** In Lauren's words, "this was all possible because we have a high quality verification skill" ([tweet](https://x.com/poteto/status/2107529149355319657)). A swarm multiplies whatever the skill does, so with a weak one you get ten confident wrong reports ([01](01-trust-curve.md): parallelism multiplies bad output too). Check the skill with evals ([05](05-evals.md)) first.
- **Run the full swarm on builds you are about to ship and on risky merges; give ordinary PRs one to a few verifiers.** The swarm adds to the gate and does not replace it, and 10 or more agents is real token cost (see Tokens and ROI below). The verifier count is the cost dial. In Lauren's full autopilot every PR gets verifier agents that fuzz the running app, fix what they find and repeat until the PR can land. She says it is token-intensive and can be tuned down, for example from ten verifiers to one ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)).

### Small, atomic changes

- You don't need a hard cap on PR size (some PRs are a few dozen lines, some are a thousand lines because they mostly delete files), but encourage agents to split work into multiple PRs.
- The reason: git history is a rich source of context for later agents, and each PR describes one small piece atomically. It is easy to revert and easy to tell where a bug lives, instead of hiding in a giant PR where no one knows what is inside.
- This is the practical precondition for reviewing *after* merge on main. Auto-merge is only safe when the hard layer ([06](06-guardrail-layers.md)) catches errors before merge. Review on main is then just a confirmation step. Write down which kinds of change may merge unattended, and what stops that, in [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md).
- **How far you can automate depends on how verifiable the domain is.** Matt Pocock asked about one-way doors (changes you cannot cheaply undo) in fields like medicine, law and finance, and about data loss. Lauren answered that verifiability decides it: where work can be verified programmatically, one-way doors become two-way doors in a sense, and for domains that are hard to verify programmatically she does not have an answer and says the industry has to work it out ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). The kit reads that carefully. Verification helps because it stops a bad change before merge; a revert does not undo a one-way effect. So keep two cases apart. Irreversible effects (deleting or rewriting user data, moving money, sending messages outside the system) stay with a human through the policy's `{{DATA_PATHS}}` row. Output that no program can check (for example medical, legal or financial output) is listed under `{{UNVERIFIABLE_PATHS}}` in section 3 of the policy (class D, never auto-merged).

### Risk-rated review

Auto-merge does not have to be all or nothing. Within an allowed change class, with every required signal green, have an agent review every PR and rate its risk. Start by merging low risk only; humans read the rest. Lauren's end state is wider: "every PR gets assessed for risk. low-medium risk ones don't require a review so you just merge it." ([tweet](https://x.com/poteto/status/2108283057581195413))

- **It spends human attention where it matters.** Human review is the last step of the correction ladder ([06](06-guardrail-layers.md)): the weakest and the most expensive. The rating decides which PRs earn it.
- **The rating routes; the hard layer makes the merge safe.** An AI reviewer is a soft layer ([06](06-guardrail-layers.md)) and can miss things. So treat the rating as signal 8 in section 2 of [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md) (`{{MAX_AUTO_RISK}}`, low by default), on top of a green gate, attached evidence, an atomic PR and no protected path. A low rating never overrides a protected path or a class marked "never".
- **Make the rating checkable.** Ask the reviewer to say what the change touches and why it chose that level, so a human can audit the call in seconds.
- **Check the rating against what happened.** Check the rating during the post-merge review ([templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md), section 5), which already covers every auto-merged PR. A low-risk PR that gets reverted is the number to watch; it feeds the revert and rework rate in [01](01-trust-curve.md).
- **This policy is conservative on purpose.** Medium risk is Lauren's end state, not the starting point: widen from low to medium only when the ledger shows it is safe (section 6 of the policy). Her end state also has the gate be runtime verification plus the environment: verifier agents fuzz every PR, the hard layers catch the rest, and she reads the commit history the next morning to revert, modify or add lint rules ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). Matt Pocock's name for that after-the-fact check is "sampling instead of blocking" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). The morning read is in section 5 of the policy template.

### Tokens and ROI

- Upfront token cost is large (refactoring the codebase, adding constraints). But if the future is agents writing all the code, you want a lean team, not one that bloats into an organization of thousands of engineers with all the overhead.
- The value of agents is that they can do what wasn't possible before: one person applying constraints across an entire codebase, work that could previously take years. The question for whoever leads: hire people to do it, or pay tokens to build a codebase in which even the "most naive" agent does well.
- Once you get there, even an agent that isn't a top-tier model writes very good code in a constrained codebase, and the benefit spreads to PMs, designers and engineers new to the codebase. Nothing is free and tokens are expensive; run the ROI analysis for your own team.
- You can get there without "going broke" if you invest in order: verification, hard guardrails, then scale.

### A coordinator running a long-horizon goal

A coordinator mostly delegates and supervises. It keeps a list of tasks, spawns subagents for them, passes context along and checks their results; it does little of the implementation itself. Start with one, and split by problem area (desktop performance, user-reported bugs) when one gets hard to manage. Lauren's advice on bots is to "start with one bot and then only make new bots when it gets tricky to manage" ([tweet](https://x.com/poteto/status/2108097362283597916)); she now runs more than ten coordinators, each on a different area ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). The coordinator in [05](05-evals.md) is a different role: it grades a skill, it does not drive a goal.

A coordinator agent with an active **goal** (for example "land a chain of PRs") can run for hours. [templates/automation/goal-ticks.md](../templates/automation/goal-ticks.md) holds the pattern that keeps it auditable: a goal statement with checkable done-criteria, **ticks** (short, timestamped status updates covering what is in flight, what finished, the ETA and the next action), escalation only if the next tick shows no motion, and one pinned **last human dependency** note. Why this shape:

- **Ticks make an hours-long task auditable.** Instead of going quiet and then reporting "done", the agent gives status, ETA and next step at every beat. Skim a few ticks and you know whether it is stuck, without reading the whole run. This ties directly to reviewing on main after auto-merge.
- **Escalating only when there is no motion** keeps the signal clean: humans are called when needed, not after every step, and not too late either.
- **Pinning the last human dependency** is honest about what automation can't replace, such as an approval that policy reserves for a person. Knowing the final dependency lets everything else run as far as it can, without pretending to get past that gate.
- **One home per goal** (its ticks and notes in one place) keeps parallel coordinators from mixing up their context.

## How to apply

1. Run 1-3 local agents, watch their tool calls, and perfect `verify-app` ([02](02-verification.md)) first.
2. Once verification is trustworthy, pick *one* repeatable process to move to cloud/automation. The nearest example: an agent reads a bug report, reproduces it with `verify-app` in a prepared cloud environment ([cloud-environment.md](../templates/skills/verify-app/references/cloud-environment.md)), and returns one verdict (reproduced, not reproduced, already fixed on main, setup or data, or needs info), where "setup or data" is only for an input the app does not support and a valid input that reproduces is reproduced, with the input as a precondition, with evidence. Start from [templates/automation/bug-repro.md](../templates/automation/bug-repro.md).
3. When verification holds up under evals and the cloud environment works, run a fuzz swarm against one build: some directed agents, a few random ones, each with its own VM and account. Review the videos and screenshots first, sample the diff, and turn each real finding into a feature-map entry or a check.
4. Ask where you are the bottleneck: which facts do you carry from Slack, the tracker or email into an agent chat? Pick one channel and connect it to one coordinator with a routine. Start with bug reports and the bug-repro agent.
5. Start one standing scanner for a pattern you want gone but cannot lint yet: it appends hits to a queue, and you read the queue every few days for a shared cause.
6. Ask agents to split work into atomic PRs. Write that into [templates/guardrails/AGENTS.md.template](../templates/guardrails/AGENTS.md.template) (a soft layer) and, if needed, add a PR size check to CI ([templates/ci/ci.yml](../templates/ci/ci.yml)) as a warning, not a hard cap.
7. Enable auto-merge only for the kinds of change where a hard gate ([06](06-guardrail-layers.md)) already blocks the common errors. Start with a low-risk kind, and record the scope in [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md).
8. Add an agent review that rates every PR's risk (signal 8 in the policy). Merge low risk only, and only when the policy's other signals are green too and no protected path is touched. Widen to medium (Lauren's end state) when the ledger shows it is safe, and send everything above the ceiling to a human.
9. Review merged PRs on main on a fixed schedule, and sample the low and medium risk ones to check the rating. Run each repeated comment through [templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md). Track the three readiness numbers in [01](01-trust-curve.md).
10. Work out the ROI: the one-time token cost of building guardrails versus the cost of manual review and hiring.
11. For a long-running goal (for example landing a PR chain), give the coordinator a goal block and a tick format from [templates/automation/goal-ticks.md](../templates/automation/goal-ticks.md), including the escalation rule and the pinned last-human-dependency note.
12. Keep each goal's ticks and notes in one place, so parallel coordinators don't mix up context.
13. See how the gates fit together in [example/README.md](../example/README.md).

## Anti-patterns

- Spawning many agents when you still don't trust one.
- Skipping the local step and never having watched an agent interact with the app.
- Moving to the cloud before the environment is built (control skills work on your machine but not in the cloud).
- Giant PRs that make reverting and tracing a bug's source nearly impossible.
- Auto-merging without hard gates, or reviewing on main without turning comments into rules.
- Letting an AI risk rating alone decide a merge, with no hard gate behind it, or never checking the rating against what happened after the merge.
- One agent per report when a burst of related reports arrives, so the shared root cause is never seen.
- Fixing every hit of a scanner on sight, with one subagent each, instead of reading the queue for a shared cause.
- You carrying facts from Slack, the tracker or email into agent chats by hand, and calling it orchestration.
- Copying the end state (agents merge, a human reads the log next morning) before the verification and the environment behind it exist.
- Running a fuzz swarm on a weak verification skill, or reading only the swarm's diffs when the videos and screenshots are what show the problem.
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
