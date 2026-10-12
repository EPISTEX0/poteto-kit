---
name: team-mode
description: Router for {{OWNER}}'s way of working. Use for "{{OWNER}} mode", "/team-mode", or when asked to work to this team's standard of rigor (concise detailed answers, deliberate subagents, plain prose, simple code, verified work). Routes each situation to the leaf skill or playbook that owns it.
disable-model-invocation: true
---

<!-- HOW TO USE:
1. A router skill is not a manual: it holds a few non-negotiables and a table that sends the agent to the leaf skill that owns each situation. Keep it short; put the substance in leaves, playbooks and principles.
2. Replace {{OWNER}} (a person, team or area), {{SKILLS_DIR}} (default .agents/skills) and the rows of the triggers table with skills that exist in your catalog (see skills/CATALOG.md). Delete rows you do not have yet; add rows when you write a new leaf skill.
3. Install it as .agents/skills/team-mode/ with its principles/ folder inside (see the install table in templates/README.md). Keep the folder flat: do not group skills in nested folders, because tools differ in whether they find them.
4. Frontmatter: `name` (must equal the folder) and `description` work everywhere. `disable-model-invocation: true` makes the skill load only on an explicit /team-mode (honoured by Claude Code and Cursor); Codex ignores the key, so there add agents/openai.yaml with `policy: { allow_implicit_invocation: false }`. No other keys are needed. For a one-line nudge on every new task, put a line in AGENTS.md instead (the guardrails/AGENTS.md.template has a "Working mode" line for it).
5. Principles: principles/ ships three filled principles (linked below) and _principle.template.md for new ones. Keep, edit or delete the three, create one file per new principle, link every one in the Principles section, and do not install the underscore template file.
6. The failure loop below is inlined so this skill stands alone. The longer worksheet is skills/_skill-from-failure.md in this kit; keep it as a process doc, not as an installed skill.
7. Delete this comment block when done.
-->

# team-mode: {{OWNER}}'s way of working

## Non-negotiables

1. **Start every multi-step task with a todo list whose first item is: read the Principles section below, in full.** The principles ground every trigger in this file.
2. **In your reply, name each principle that shaped a decision and the concrete choice it changed** ("principle `fix-root-causes`: I did not add a retry; I fixed the ordering bug in `queue.ts:88`"). A principle cited with no concrete decision behind it is the tell that you skipped the leaf skill; if you cannot name the choice, go and read the leaf.
3. Every other situation is routed by the triggers below. Nothing else lives in this file.

## Triggers

Match the situation, then read and follow the leaf. If two rows match, read both.

| When | Go to |
| --- | --- |
| Non-trivial change, architecture decision, or "are we sure?" | `{{SKILLS_DIR}}/{{DESIGN_SKILL}}/SKILL.md` |
| A root cause is claimed, or a bug must be explained | `{{SKILLS_DIR}}/investigate/SKILL.md` |
| Behavior must be shown to work (UI, CLI, performance) | `{{SKILLS_DIR}}/verify-app/SKILL.md` |
| Reaching for a risky API or pattern (see list in that skill) | `{{SKILLS_DIR}}/are-you-sure-you-need-x/SKILL.md` |
| About to ask the human which approach to take | see "The ask is the slow path" below |
| Any code is about to be written | "Name the data shape first" below |
| Work splits into independent parts | "Parallel fan-out" below |
| Features, routes, shortcuts or test ids change | `{{SKILLS_DIR}}/maintain-verification/SKILL.md` |
| An agent behavior failed and keeps failing | "The failure loop" below |
| {{YOUR_TRIGGER}} | {{YOUR_LEAF}} |

## The ask is the slow path

Before you ask the human "which approach?", "how should I...?" or "what should this do?", classify the question.

- **Observable by running something** (behavior, timing, layout, output, performance, whether a check separates good from bad): it is not the human's question. Sketch it as a throwaway experiment (the smallest script, test or scratch branch that produces the observation; keep it out of the PR unless it is worth keeping, and put it in a playbook file under `playbooks/` next to this file if you do this often), run it, and let the result decide. Report what you ran and what you saw. A throwaway probe answers faster than a message, and it hands the human a result to react to instead of a decision to make.
- **Read-only investigation** where the deliverable is an answer: stay in it, read code and run commands, and answer with cited evidence rather than building anything.
- **A genuine product or preference call** that no experiment can settle (naming a user-facing concept, trade-offs between goals only the human weighs): ask, with your recommendation and what each option costs.

## Name the data shape first

Before writing any code, write down the data shape: the types or schema, who owns each durable value, and where it lives. Choose the organizing structure of the code around that shape (modules, files, boundaries). If you cannot state the shape in a few lines, you do not yet understand the problem; read more or prototype.

## Parallel fan-out

Use parallel subagents when the work splits into independent pieces that do not need each other's results: coverage matrices (the same check across N variants), race or flakiness hunts, several exploration partitions of a large codebase, review lanes. Give each subagent: the outcome and why it matters, the finish line, the facts you already know, the exact output format, and the rule "evidence for every claim". Use read-only subagents for investigation. Use a bake-off (several attempts at the same design or code problem, compared by criteria you wrote first) when the choice between designs is the goal. Do not fan out work that is serial, tiny, or needs one shared mental model, and cap concurrency by free memory.

## The failure loop

When an agent behavior fails and keeps failing, do not add a vague rule. Run these four steps:

1. **Name it.** One sentence in behavioral terms ("states a root cause without opening the code path"), with the evidence: the tool call or thinking block that shows it. If you cannot say it in one sentence it is two failures.
2. **Climb the ladder.** Can types or architecture make the mistake impossible? A lint rule or CI check? Only if the answer is "no, it is judgment or procedure" write a skill, a principle or a rule.
3. **Write the smallest fix.** One skill, principle or AGENTS.md rule that targets exactly that failure, with the failure described in its introduction so the reason survives. Cut anything that did not come from the failure.
4. **Prove it can fail.** Save the original situation as an eval task, confirm the agent fails it without the fix, then passes with it and still passes the older tasks.

## Principles

Read all of these at the start of a multi-step task. Each is one file in `principles/`; cite them by name.

- [fix-root-causes](principles/fix-root-causes.md)
- [boundary-discipline](principles/boundary-discipline.md)
- [encode-lessons-in-skills](principles/encode-lessons-in-skills.md)
- {{ADD_YOUR_PRINCIPLES: one link per principle file}}
