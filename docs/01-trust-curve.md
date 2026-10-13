# 01 - The trust curve: parallelize only as far as you trust

## The idea

The bottleneck with coding agents is not how fast they generate code. It is **how much you trust the output**. Trust grows along a curve: from watching every output of a few agents, to letting agents merge the changes your hard guardrails already cover and reviewing afterward on the main branch. There are no shortcuts on this curve. The only way up is to accumulate evidence, so that trust grows for real.

## Why it works

- Trust is a function of **evidence**, not of feel. Every time an agent says "done" without proving it, you have to re-check by hand, and that cost blocks all parallelization. That is why verification comes first (see [02](02-verification.md)).
- Skills that only improve how the agent thinks or writes do not move you up the curve while you are still the proxy between the agent and its output. Lauren says her other skills (how, why and unslop) did not, and that verification did, because it let the agent see the result of its own work and iterate ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)).
- Trust is lost in a familiar way: the agent guesses, hallucinates, then confidently declares a "root cause" that isn't one. After a few rounds of that you fall into micromanagement: standing over its shoulder, checking every step, no longer getting real use out of the agent. The trap feeds itself. Micromanaging under a deadline leaves no time to sharpen the tools that would let you stop, like cooking with dull knives and no time to sharpen them ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)).
- Think of it as managing a team of engineers, and the mechanism shows. If you don't trust the team, you micromanage; if you do, you design the environment and hand out work. Managers Lauren worked with at Netflix called this "context not control" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)): you can steer an outcome by controlling every step, but it is better to give the agent the context to be self-sufficient. The same goes for agents: your role shifts from typing code to head chef, the person who sets up the kitchen (skills, guardrails, verification) and assigns work to each station.
- Parallelism multiplies good output and bad output alike. If one agent isn't trustworthy yet, many agents just create more work to review and burn tokens for nothing.
- Engineering standards belong to each team and each codebase, so you can't borrow someone else's trust; you can only borrow tools (skills, templates) and then verify them yourself. Once your standards are encoded as skills and guardrails, and you can *verify* that the agent follows them, you can climb further and start automating.
- Speed (how many changes get merged) is not a measure of trust. "How much of this code is actually good?" is always a fair question, and it must be answered with evidence, not volume. The three numbers below are ratios that count the cost of what went wrong.

The stage-by-stage path, with a "move on when" criterion for each stage, is in the [README](../README.md#adoption-path-by-trust-stage). The stages are a frame for measuring where you are; tune the thresholds to fit your team.

### Measuring agent-readiness

The stages say where you are. Lauren suggests three numbers that "could maybe be measured" ([tweet](https://x.com/poteto/status/2107923381001781362)). They are candidates, not a proven scorecard. Try them and keep the ones that tell you something:

- **The share of agent-written code that gets merged.** Lauren Tan names it "% of agent written code that gets merged" ([tweet](https://x.com/poteto/status/2107923381001781362)). If most of what agents write is thrown away, you are paying tokens for work you discard.
- **The revert and rework rate.** How many merged changes are later reverted or need a follow-up fix. Read it together with the first number: a high merge share with a high rework rate means bad changes are getting through. The ledger in [templates/automation/automerge-policy.md](../templates/automation/automerge-policy.md) already records reverts for auto-merged PRs.
- **Human messages per accepted PR.** Lauren writes "# of human messages per accepted PR (less is better)" ([tweet](https://x.com/poteto/status/2107923381001781362)). PR history does not hold this number; count it from your chat transcripts. Most of those messages are corrections. When the same one keeps coming, run it through the correction ladder ([06](06-guardrail-layers.md)).

If the numbers are useful, all three should improve as you climb. If one gets worse after you add parallel agents or widen auto-merge, step back a stage ([08](08-scaling-to-cloud-agents.md)).

## How to apply

1. Work out which stage you are at: how many agents run in parallel, whether you read every output, whether any agent change has been merged without you seeing it. Write it down in one line.
2. Pick *one* recurring kind of work (say, small UI bug fixes) as your trust testing ground. Expand to other kinds of work only once this one is solid. Take the three readiness numbers for it now, as a baseline.
3. Read [templates/README.md](../templates/README.md) for the order in which to adopt each template, and use it as a checklist for each stage.
4. Build verification first ([templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)), because it is what frees you from being the manual verifier.
5. Add parallel agents only after agent-made changes regularly pass review without you fixing the same kind of mistake again and again.
6. Fork the templates instead of using them verbatim: adapt them to your team's engineering standards.
7. Run [example/README.md](../example/README.md) to see one complete loop: the gate goes red on a violation, and verify catches the planted bug.

## Anti-patterns

- Spawning agents in bulk while you are still the manual verifier of everything.
- Trusting a plugin, a template, or someone online instead of verifying in your own repo.
- Measuring speed but not quality: counting merged PRs without the share of agent-written code that gets merged, the revert and rework rate, and how many human messages each PR took.
- Trying to skip stages because you believe in a magic tool.
- Micromanaging the agent: reading every tool call all day without turning what you observe into skills (see [04](04-skills-from-failures.md)).

## Related

- [templates/README.md](../templates/README.md)
- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md)
- [example/README.md](../example/README.md)

Next → [02 - Verification](02-verification.md)
