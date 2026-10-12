# 01 - The trust curve: parallelize only as far as you trust

## The idea

The bottleneck with coding agents is not how fast they generate code. It is **how much you trust the output**. Trust grows along a curve: from watching every output of a few agents, to letting agents merge the changes your hard guardrails already cover and reviewing afterward on the main branch. There are no shortcuts on this curve. The only way up is to accumulate evidence, so that trust grows for real.

## Why it works

- Trust is a function of **evidence**, not of feel. Every time an agent says "done" without proving it, you have to re-check by hand, and that cost blocks all parallelization. That is why verification comes first (see [02](02-verification.md)).
- Trust is lost in a familiar way: the agent guesses, hallucinates, then confidently declares a "root cause" that isn't one. After a few rounds of that you fall into micromanagement: standing over its shoulder, checking every step, no longer getting real use out of the agent.
- Think of it as managing a team of engineers, and the mechanism shows. If you don't trust the team, you micromanage; if you do, you design the environment and hand out work. The same goes for agents: your role shifts from typing code to head chef, the person who sets up the kitchen (skills, guardrails, verification) and assigns work to each station.
- Parallelism multiplies good output and bad output alike. If one agent isn't trustworthy yet, many agents just create more work to review and burn tokens for nothing.
- Engineering standards belong to each team and each codebase, so you can't borrow someone else's trust; you can only borrow tools (skills, templates) and then verify them yourself. Once your standards are encoded as skills and guardrails, and you can *verify* that the agent follows them, you can climb further and start automating.
- Speed (how many changes get merged) is not a measure of trust. "How much of this code is actually good?" is always a fair question, and it must be answered with evidence, not volume.

The stage-by-stage path, with a "move on when" criterion for each stage, is in the [README](../README.md#adoption-path-by-trust-stage). The stages are a frame for measuring where you are; tune the thresholds to fit your team.

## How to apply

1. Work out which stage you are at: how many agents run in parallel, whether you read every output, whether any agent change has been merged without you seeing it. Write it down in one line.
2. Pick *one* recurring kind of work (say, small UI bug fixes) as your trust testing ground. Expand to other kinds of work only once this one is solid.
3. Read [templates/README.md](../templates/README.md) for the order in which to adopt each template, and use it as a checklist for each stage.
4. Build verification first ([templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)), because it is what frees you from being the manual verifier.
5. Add parallel agents only after agent-made changes regularly pass review without you fixing the same kind of mistake again and again.
6. Fork the templates instead of using them verbatim: adapt them to your team's engineering standards.
7. Run [example/README.md](../example/README.md) to see one complete loop: the gate goes red on a violation, and verify catches the planted bug.

## Anti-patterns

- Spawning agents in bulk while you are still the manual verifier of everything.
- Trusting a plugin, a template, or someone online instead of verifying in your own repo.
- Measuring speed but not quality.
- Trying to skip stages because you believe in a magic tool.
- Micromanaging the agent: reading every tool call all day without turning what you observe into skills (see [04](04-skills-from-failures.md)).

## Related

- [templates/README.md](../templates/README.md)
- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md)
- [example/README.md](../example/README.md)

Next → [02 - Verification](02-verification.md)
