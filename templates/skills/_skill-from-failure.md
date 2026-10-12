<!-- HOW TO USE:
1. This is a worksheet plus the loop for growing a skill library incrementally from observed agent failures. Copy the "Failure record" block into a note or issue for each failure you observe; do not write skills from imagination.
2. Start local: watch your agent work with tool calls and thinking blocks open. Be the backseat driver, like in pair programming. Do not just look at the final diff.
3. Fill the {{PLACEHOLDERS}} in the record; the finished record becomes the skill's seed, its eval case and its changelog line.
4. The files skills/investigate/SKILL.md and the verify-app skill are two examples of results of this loop.
5. The underscore prefix means: this file is a template for making skills, not a skill itself. Do not install it into the skills directory.
-->

# From a failure to a skill

Skills are just markdown, but they pull the agent toward higher-quality behavior by putting good instructions in context. The reliable way to write ones that matter is incremental: every skill exists because an agent failed in a way you observed. Do not design a library up front.

## The loop

1. **Observe.** Run the agent on real work and read the tool calls and thinking blocks, not just the result. Look for: confident claims with no supporting reads, the same wrong turn repeated, flailing for the location of something, ignoring a rule, inventing an API, stopping at "should work".
2. **Name the failure mode.** One sentence, in behavioral terms: "States a root cause without having opened the code path." A name you can search for later. If you cannot name it in one sentence it is two failures; split them.
3. **Check it is a skill problem.** In order of preference (see `guardrails/review-comment-to-rule.md`): can the class be eliminated by types or architecture? A lint rule or CI check? Only if the answer is "no, it is judgment or procedure", write a skill.
4. **Write the smallest skill that prevents it.** Target one failure mode. Include: the trigger ("use when ..."), the rules stated as observable behaviors, a procedure, and the output format that makes compliance checkable. Cut anything that did not come from the failure. Put the failure's description in the skill's own introduction so the reason survives.
5. **Add an eval case that reproduced it.** Take the original situation (repo state plus prompt) and save it as a task for `evals/EVAL_PLAYBOOK.md`. Confirm that, without the skill, the agent fails the rubric on that task (red). This is the proof that the eval can fail.
6. **Run the evals.** With the skill, the agent should now pass the case, and old cases must still pass. Use blind task names and a judge on a different model (see the playbook).
7. **Iterate or ship.** Edit the skill, rerun, stop at your target or after K runs without gain. Record the result in the scoreboard.
8. **Keep watching.** New models and new code produce new failures. Return to step 1. Merge, prune and split skills when the evals say behavior is stable; a skill that no case needs any more is a candidate for deletion.

## Failure record (copy per failure)

```
### Failure: {{SHORT_NAME}}
- Observed in: {{task / PR / session, model and agent used}}
- What the agent did (evidence): {{quote the tool call or thinking block, with where to find it}}
- What it should have done: {{observable behavior}}
- Cost when it happens: {{wasted fix attempts, wrong PR, lost trust, review comment}}
- Failure mode (one sentence): {{...}}
- Why not eliminate / lint / CI instead: {{answer from the decision ladder}}
- Smallest skill: {{name}} at {{path}}; rules: {{list}}
- Eval case: {{task dir name (neutral!)}}; rubric criteria it checks: {{ids}}
- Baseline without the skill: {{scores}}   With the skill: {{scores}}
- Changelog: {{date}} {{skill version / commit}}
```

## Worked example (the investigate skill)

- Observed: user reports a feature stopped working; the agent answers "it has to be X". Reading the tool calls shows it never opened the files X lives in.
- Failure mode: states a root cause without reading the code path.
- Smallest skill: `skills/investigate/SKILL.md`: read the path and cite `file:line`, reproduce first, at least two hypotheses, read-only subagents, observed versus inferred, "smoking gun" only with a reproduction.
- Eval case: a repo with a planted bug whose obvious culprit is wrong; the rubric checks citations of the real location, a reproduction, two hypotheses, and no unearned "confirmed".
- Result recorded in the scoreboard, then the skill is kept or edited.

## Skill-writing checklist

- Description says when to use it (the trigger), not just what it is.
- Written for the dumbest competent agent: no hidden context, no "obviously".
- Rules are observable (a judge could quote evidence for each).
- Has an output format, because formats make claims auditable.
- Short and focused on one failure mode. If it grows to cover several, split it.
- Says what to do when it cannot be followed (failure policy).
