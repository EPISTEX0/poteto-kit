# 05 - Evals: unit tests for agents and skills

## The idea

Evals answer two questions: "how do I maintain a skill as the product changes?" and "when is verification good enough?" Treat them as **unit tests for agents**. A coordinator sets a rubric, spawns subagents that do the work without knowing they are being graded, and runs them across several models. A judge on a different model scores the results, and you hill-climb until the skill passes.

## Why it works

- Skills are soft and non-deterministic, so "I reread it and it looks fine" is not evidence. An eval turns a skill's intent into a repeatable score you can compare before and after every change. You can build one yourself, with no special framework, as scientific and rigorous as you want it to be.
- **The coordinator sets the rubric.** The orchestrating agent works out a rubric for what the skill must do, then spawns several subagents, each in its own directory.
- **Blind testing:** name directories carefully so a subagent cannot tell it is being evaluated. Agents can tell, and when they do, they change their behavior. Hiding it is the only way to measure real behavior.
- **A model matrix:** running the eval across several models, especially the ones you actually use, shows whether the skill depends on one specific model. Rerun it after every skill change to confirm it still produces the intended result.
- **A judge on a different model** reduces bias. The model that orchestrated and graded the subagents tends to favor its own output, so a judge on another model cross-checks it.
- Once you have a score, you can automate the "fix the skill, rerun" loop (**hill-climbing**). For example, use your tool's loop/schedule feature (e.g. `/loop` in Claude Code or Cursor) and tell it to iterate on the eval until every item scores 10/10. The same approach builds and polishes the verification skill itself, almost hands-off. It is bumpy at first and takes many iterations, but it pays off.
- Verification uses the same loop: evals are how you "verify the verification skill" ([02](02-verification.md)).
- Caveat: hill-climbing to 10/10 only means something when the rubric is tight. A loose rubric gives inflated scores. So still read the tool calls of a few runs to confirm a high score reflects real behavior.

## How to apply

1. Pick the skill you rely on most (usually `verify-app`).
2. Read [templates/evals/EVAL_PLAYBOOK.md](../templates/evals/EVAL_PLAYBOOK.md) and write a rubric from [templates/evals/rubric.template.md](../templates/evals/rubric.template.md): the behaviors you must see, the forbidden behaviors, and the scoring scale.
3. Create the subagents' working directories with neutral names (no "eval", "test" or "rubric") so they cannot guess they are being graded.
4. Grade with [templates/evals/judge-prompt.md](../templates/evals/judge-prompt.md), using a different model from the one that ran the task.
5. Record each run's score in [templates/evals/scoreboard.template.md](../templates/evals/scoreboard.template.md), and try at least a few models.
6. When the score falls short, fix the skill and rerun. You can let your tool's loop feature iterate, but still read the tool calls of a few runs to confirm a high score reflects real behavior.
7. Rerun the eval whenever you change the skill or switch models.

## Anti-patterns

- Editing a skill without rerunning anything.
- Naming a subagent directory "eval-run-1", or using a prompt that reveals it is being graded.
- The same model both running and grading.
- Testing on a single model only.
- A 10/10 score when you have not read a single tool call to see the real behavior. Trusting the number and skipping observation (see "backseat driver" in [04](04-skills-from-failures.md)).
- Waiting for a "standard" framework before you start. You don't need one.

## Related

- [templates/evals/EVAL_PLAYBOOK.md](../templates/evals/EVAL_PLAYBOOK.md)
- [templates/evals/rubric.template.md](../templates/evals/rubric.template.md)
- [templates/evals/judge-prompt.md](../templates/evals/judge-prompt.md)
- [templates/evals/scoreboard.template.md](../templates/evals/scoreboard.template.md)
- [example/README.md](../example/README.md)

Next → [06 - Guardrail layers](06-guardrail-layers.md)
