# 04 - Skills born from the failure modes you observe

## The idea

A skill (just markdown, really) is how you teach a "new teammate who codes well but has no context". Don't plan a skill set up front: let it grow. When you watch the agent fail in a particular way, write the failure down; when it repeats, or several agents make it, take it up the correction ladder ([06](06-guardrail-layers.md#the-correction-ladder)). A small skill is where it ends up when structure, lint and CI cannot remove it. That means reading tool calls and thinking blocks, not watching from the sidelines. As skills multiply, organize them: a **mode skill** as the router, **leaf skills** and one-file **principles** beneath it, and a catalog named by owner/area.

## Why it works

- Every observed failure mode is a **real need**, with evidence; a skill born from one targets exactly where the agent is weak instead of being a wish list. The classic example: you report a broken feature, the agent confidently says "it's definitely this", and when you open the tool calls you see it never read the relevant code. That becomes the skill "stop guessing: read the code, use subagents, reproduce before concluding" ([templates/skills/investigate/SKILL.md](../templates/skills/investigate/SKILL.md)).
- Picture hiring an engineer who codes well but has no business context and who onboarded a few seconds ago. The effective way to teach that person is a **skill**: a document that encodes instructions and context.
- A skill puts high-quality tokens at the head of the context, pulling the output distribution toward better behavior (the common phrasing: "pull the agent into a different latent space"). Put simply: an LLM predicts the next token, so if you feed it high-quality tokens first, it pattern-matches in a "smarter" region. This is a mental model, not a guarantee.
- Reading tool calls and thinking blocks shows you the agent's *process* (did it read the code?), not just the result. That is the evidence for deciding whether to trust it. Be the "backseat driver" as in pair programming: ask why it didn't take the other approach, and don't be a passive observer, especially early on while you build the skill set.
- Skills are soft: the agent can still forget them or apply them inconsistently. So skills need evals ([05](05-evals.md)) and should be backed by hard guardrails ([06](06-guardrail-layers.md)). If the same failure happens *even with a skill in place*, don't write another reminder; turn it into a lint or a CI check. On the correction ladder ([06](06-guardrail-layers.md)) a skill sits below changing the structure and below a check in CI.
- **A router keeps context lean.** A mode skill holds only the invariant rules and a trigger table; the detailed knowledge lives in leaf skills, loaded when a trigger matches. The agent doesn't carry the whole skill library in its head on every turn.
- **Citing the principle behind each decision turns "I read it" into checkable evidence.** A principle that's named without changing any decision is a sign it was skipped, so a reviewer (human or agent) can spot it without rereading the whole process.
- **"Asking a human is the slow path"**: most "how should we do this?" questions are really empirical questions. Trying it is cheaper than asking and faster than waiting for an answer, and it hands the human a result to react to instead of a decision to guess at (consistent with the verification idea in [02](02-verification.md)).
- **Stating the shape of the data first** forces the agent to decide structure before writing logic, which is where design mistakes tend to originate.
- **Put what is deterministic into code, and leave judgment to the agent.** Think of the work in a skill as a gradient. At one end is judgment: weighing context, deciding what to check. At the other is mechanical work with one right answer, such as running the same commands or moving code from one pattern to another. Lauren's rule of thumb is to "extract out the deterministic parts and turn that into code" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)) and leave the agent only the parts that need judgment. Without that, every agent rewrites its own throwaway version of the step (the story is in [02](02-verification.md)). This is why a control skill ships a CLI ([02](02-verification.md)), and it holds for every skill. It holds for migrations too: use a codemod or a syntax-tree transform, not agents rewriting files by hand. The principle file is [templates/skills/team-mode/principles/script-the-deterministic-parts.md](../templates/skills/team-mode/principles/script-the-deterministic-parts.md).
- **Precise words carry intent.** On the live stream Lauren says a word like "tautological" compresses a lot of intent and meaning ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)). She took it from a tip of Matt Pocock's about cutting the useless tests agents write. One such term tells an agent more than a paragraph about useless tests. When you find a term that works, use it in your skills.
- **Skills shrink as models improve.** Lauren expects skills to get smaller and smaller ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)): with newer models, implementation details such as exact script commands can be deleted, and what stays is the workflow, the series of steps of your process. Re-read your skills when the model changes and delete what the model no longer needs.
- **Naming by owner/area** lets several teams add skills without overwriting each other, and lets the agent guess the right skill from the directory name.

### The mode/router skill pattern

A mode skill (template: [templates/skills/team-mode/SKILL.md](../templates/skills/team-mode/SKILL.md)) describes the team's way of working: answer briefly but in detail, use subagents deliberately, write prose without "slop", keep code simple, make sure work is verified.

- **Deliberate invocation:** no automatic loading. Claude Code and Cursor honour `disable-model-invocation: true` in the frontmatter; Codex uses `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. The `description` says when to apply the skill (a new task that needs a playbook or rigor) and when not to (ordinary chat turns, or when the user declines).
- **Non-negotiables.** Every multi-step task starts with a todo list whose first item is *read the whole Principles section*. In its answer, the agent must name each principle that shaped a decision and the specific choice it changed. A telltale sign: if a principle is cited without tying to any concrete decision, the leaf skill was skipped.
- **Triggers → leaf skill.** A non-trivial change, an architecture decision, or "are we sure?" routes to the matching leaf skill (for example `investigate`). Before asking a human "which way / what should we do / what should this do", *classify the question*: if the answer is a fact you can observe by trying it (behavior, timing, layout, output, performance, whether an eval separates cases), it is not a question for a human; sketch an experiment through the prototype playbook and let the result decide. Read-only investigation stays investigation and answers from evidence. When writing any code, state the *shape of the data* first. For parallel work, split the work (coverage matrices, races, test lanes, exploration partitions); use an "arena" for design or code bake-offs.
- **The skill tree.** The mode skill's directory holds `SKILL.md` and `principles/` (the only subfolder the kit ships); add `playbooks/`, `references/` or `scripts/` beside them when you have a procedure, a document or a helper script that the router points at. Leaf skills (for example `investigate`, `are-you-sure-you-need-x`, `verify-app`) sit next to it as ordinary sibling skills, because skill directories are flat (see [Install skills in your tool](../README.md#install-skills-in-your-tool)).
- **Principles:** one file per principle in `team-mode/principles/`, for example `fix-root-causes`, `boundary-discipline`, `encode-lessons-in-skills`, `script-the-deterministic-parts` ([templates/skills/team-mode/principles/_principle.template.md](../templates/skills/team-mode/principles/_principle.template.md)). Each decision must cite which principle shaped it.
- **Challenge skills:** when the agent reaches for a risky API or pattern (for example `requestAnimationFrame`, `useEffect`), an "are you sure you need X?" skill makes it prove the need first ([templates/skills/are-you-sure-you-need-x/SKILL.md](../templates/skills/are-you-sure-you-need-x/SKILL.md)).

### Catalog shape

A shared skill library should be split by owner or area (for example `client`, `infra`, `global`, individual people or teams). Skill directories stay flat, so encode the area in the skill name (`infra-deploy-check`) rather than in a grouping folder. Within an area, sort by kind of skill:

- one control skill per surface (web, IDE, website, ...): `verify-app` while there is one, `control-<surface>` once there are several;
- performance split into check, explore, bisect, trace, hill-climb, cost eval;
- "challenge" skills like `are-you-sure-you-need-raf`;
- per-area best-practice skills;
- migration skills;
- QA skills (design QA, a design-implementation linter, UI autofix, debugging diffs).

Template: [templates/skills/CATALOG.md](../templates/skills/CATALOG.md).

## How to apply

1. For a week, every time the agent gets something wrong, open the tool calls and thinking blocks and write the failure mode down in one sentence ("concluded a cause without reading the relevant file"). You can also have an agent mine your commit history and your past chat transcripts for the pitfalls agents hit most (the prompt is in [06](06-guardrail-layers.md)). Past chats are, in Lauren's words on Matt Pocock's live stream, "a treasure trove of context" ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)): your corrections are your process, already written down. Turn the ones that repeat into lint rules or skills.
2. For any failure that has happened twice or more, first ask whether a structural change, a lint rule or a test would remove it ([06](06-guardrail-layers.md)). If not, fill in [templates/skills/_skill-from-failure.md](../templates/skills/_skill-from-failure.md) (failure name, how to recognize it, desired behavior, bad/good examples).
3. Use [templates/skills/investigate/SKILL.md](../templates/skills/investigate/SKILL.md) as your starter "stop guessing" skill, then adapt it to your real failures. Install each skill at `.agents/skills/<name>/SKILL.md`, flat, and link it into your tool as described in the [README](../README.md#install-skills-in-your-tool).
4. Give each new skill a small eval before you trust it ([05](05-evals.md)).
5. Once you have more than a few skills, add a mode skill as a router from [templates/skills/team-mode/SKILL.md](../templates/skills/team-mode/SKILL.md): set the non-negotiables, a trigger → leaf skill table, and require citing principles per decision.
6. One file per team principle, from [templates/skills/team-mode/principles/_principle.template.md](../templates/skills/team-mode/principles/_principle.template.md), so decisions can cite them.
7. For risky APIs or patterns, write an "are you sure you need X?" skill from [templates/skills/are-you-sure-you-need-x/SKILL.md](../templates/skills/are-you-sure-you-need-x/SKILL.md).
8. Catalog your skills by owner/area and kind (control, perf, challenge, best-practice, migration, QA) in [templates/skills/CATALOG.md](../templates/skills/CATALOG.md).
9. If the same failure happens *even with a skill in place*, don't write another reminder; turn it into a lint or CI check ([06](06-guardrail-layers.md)).

## Anti-patterns

- Downloading a huge skill set and trusting it without watching your own agent.
- Writing skills from imagination instead of from real failures.
- Reading only the final result and not the tool calls, so you don't know whether the agent read the code.
- Editing a skill without checking that it actually changes behavior.
- Treating skills as your only enforcement.
- One giant mode skill holding all the details instead of just routing to leaf skills.
- Principles cited for show that change no decision.
- Asking a human questions that running a prototype could answer.
- A flat skill list with no owner/area, so nobody knows whose skill is whose, or which are still alive.

## Related

- [templates/skills/_skill-from-failure.md](../templates/skills/_skill-from-failure.md)
- [templates/skills/investigate/SKILL.md](../templates/skills/investigate/SKILL.md)
- [templates/skills/team-mode/SKILL.md](../templates/skills/team-mode/SKILL.md)
- [templates/skills/team-mode/principles/_principle.template.md](../templates/skills/team-mode/principles/_principle.template.md)
- [templates/skills/are-you-sure-you-need-x/SKILL.md](../templates/skills/are-you-sure-you-need-x/SKILL.md)
- [templates/skills/CATALOG.md](../templates/skills/CATALOG.md)
- [templates/README.md](../templates/README.md)

Next → [05 - Evals](05-evals.md)
