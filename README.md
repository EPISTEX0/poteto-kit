<p align="center">
  <img src="assets/poteto.png" width="140" alt="poteto-kit: a roasted sweet potato">
</p>

<h1 align="center">poteto-kit</h1>

<p align="center">Recipes for trusting your coding agents: verification, skills, and agent-friendly architecture — baked and ready to serve.</p>

<p align="center"><em>"When you don't have much trust in your agents, … you really can't get the most out of them."</em><br>— Lauren Tan, a.k.a. poteto</p>

The bottleneck with coding agents isn't how fast they write code. It's how much you trust what they hand back. Until you can trust it, you are the verifier, and no amount of parallel agents will save you from that.

poteto-kit is a reusable kit for developers, in three parts: **docs** (`docs/`) that explain each idea and why it works; **templates** (`templates/`) to copy into your repo; and **a runnable example** (`example/`) that proves the templates work. Template bodies are written for agents to read.

## Start here

Paste one line into Claude Code, Cursor or Codex, inside your repo:

```
Read https://github.com/EPISTEX0/poteto-kit/blob/main/ADOPT.md and adopt poteto-kit into this repo.
```

Your agent follows [ADOPT.md](ADOPT.md): it adopts the kit one phase at a time on a new branch, shows proof at the end of each phase, and asks you before it continues, commits or changes CI. Not sure what you need? Start from your pain:

| If your agent ... | Start with | Read |
|---|---|---|
| says "done" but it's broken | [verify-app](templates/skills/verify-app/SKILL.md) | [02 - verification](docs/02-verification.md) |
| flails on a vague bug report | [feature map](templates/skills/verify-app/references/features/README.md) | [03 - feature map](docs/03-feature-map.md) |
| guesses root causes | [investigate](templates/skills/investigate/SKILL.md) | [04 - skills from failures](docs/04-skills-from-failures.md) |
| keeps earning the same review comment | [review-comment-to-rule](templates/guardrails/review-comment-to-rule.md) | [06 - guardrail layers](docs/06-guardrail-layers.md) |
| lets the codebase drift | [architecture contract](templates/guardrails/architecture-contract.md) | [07 - agent-friendly architecture](docs/07-agent-first-architecture.md) |
| can't run in parallel without collisions | [worktree isolation](templates/skills/verify-app/references/worktree-isolation.md) | [02 - verification](docs/02-verification.md) |
| regresses when you edit a skill | [evals](templates/evals/EVAL_PLAYBOOK.md) | [05 - evals](docs/05-evals.md) |

Prefer to do it yourself? Keep reading: the pillars below and the [Quick start](#quick-start) are written for humans.

## The three pillars

One question runs through everything: *how do you come to trust your agents?* Three pillars answer it. Every doc and template is filed under one of them; docs [01](docs/01-trust-curve.md) (the trust curve) and [08](docs/08-scaling-to-cloud-agents.md) (scaling) span all three.

### Pillar 1 - Verification

The agent runs the real application itself and brings back evidence. Without that, you are the verifier and the bottleneck.

- Docs: [02 - verification](docs/02-verification.md) (anatomy of a control skill: a CLI with `--help` and tests, `doctor`, worktree isolation, refuse instead of fall back), [03 - feature map](docs/03-feature-map.md) (the feature map directory, proof rules, and skip reporting), [05 - evals](docs/05-evals.md) (verifying the verification skill itself), [09 - other stacks](docs/09-other-stacks.md) (the verify driver for iOS, Android, Flutter, React Native, backend APIs and CLIs).
- Templates: [templates/skills/verify-app/SKILL.md](templates/skills/verify-app/SKILL.md), [templates/skills/verify-app/references/features/README.md](templates/skills/verify-app/references/features/README.md), [templates/skills/verify-app/references/features/_feature.template.md](templates/skills/verify-app/references/features/_feature.template.md), [templates/skills/verify-app/references/features/cross-cutting-flows.md](templates/skills/verify-app/references/features/cross-cutting-flows.md), [templates/skills/verify-app/references/worktree-isolation.md](templates/skills/verify-app/references/worktree-isolation.md), [templates/skills/verify-app/references/cloud-environment.md](templates/skills/verify-app/references/cloud-environment.md), [templates/skills/create-verification/SKILL.md](templates/skills/create-verification/SKILL.md), [templates/skills/maintain-verification/SKILL.md](templates/skills/maintain-verification/SKILL.md), [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh), [templates/ci/check-coverage.mjs](templates/ci/check-coverage.mjs).

### Pillar 2 - High-quality skills that teach agents to work like real engineers

Skills (markdown) are born from observed failure modes, organized as mode skills, leaf skills, and one-file principles, and evaluated like unit tests.

- Docs: [04 - skills from failures](docs/04-skills-from-failures.md) (mode/router skills, principles, a catalog by owner/area), [05 - evals](docs/05-evals.md).
- Templates: [templates/skills/team-mode/SKILL.md](templates/skills/team-mode/SKILL.md), [templates/skills/team-mode/principles/_principle.template.md](templates/skills/team-mode/principles/_principle.template.md), [templates/skills/are-you-sure-you-need-x/SKILL.md](templates/skills/are-you-sure-you-need-x/SKILL.md), [templates/skills/CATALOG.md](templates/skills/CATALOG.md), [templates/skills/_skill-from-failure.md](templates/skills/_skill-from-failure.md), [templates/skills/investigate/SKILL.md](templates/skills/investigate/SKILL.md), [templates/evals/EVAL_PLAYBOOK.md](templates/evals/EVAL_PLAYBOOK.md), [templates/evals/rubric.template.md](templates/evals/rubric.template.md), [templates/evals/judge-prompt.md](templates/evals/judge-prompt.md), [templates/evals/scoreboard.template.md](templates/evals/scoreboard.template.md).

### Pillar 3 - Agent-friendly architecture (greenfield vs brownfield)

Agents do reasonably well in brownfield codebases that already have guardrails. Greenfield vibe-coding is the biggest risk, and also the biggest opportunity. Make the change that is obvious locally the change that is correct globally, and push rules into the hard layers (red CI).

- Docs: [06 - guardrail layers](docs/06-guardrail-layers.md) (five layers: 1-2 hard, 3-5 soft), [07 - agent-friendly architecture](docs/07-agent-first-architecture.md) (the architecture contract, five behaviors, five rules, five nouns), [08 - scaling](docs/08-scaling-to-cloud-agents.md) (cloud agents, automation, ticks, auto-merge), [09 - other stacks](docs/09-other-stacks.md) (boundary, banned-API and comment-policy tools per language).
- Templates: [templates/guardrails/architecture-contract.md](templates/guardrails/architecture-contract.md), [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md), [templates/guardrails/review-comment-to-rule.md](templates/guardrails/review-comment-to-rule.md), [templates/guardrails/AGENTS.md.template](templates/guardrails/AGENTS.md.template), [templates/ci/ci.yml](templates/ci/ci.yml), [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh), [templates/ci/check-coverage.mjs](templates/ci/check-coverage.mjs), [templates/automation/goal-ticks.md](templates/automation/goal-ticks.md), [templates/automation/bug-repro.md](templates/automation/bug-repro.md), [templates/automation/automerge-policy.md](templates/automation/automerge-policy.md).

## Quick start

1. **Copy the three verification skills** into `.agents/skills/` in your repo, flat: `templates/skills/verify-app/` (the whole directory, including `references/`), `templates/skills/create-verification/` and `templates/skills/maintain-verification/`. Also copy [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh) to `scripts/check-feature-map.sh`: `create-verification` runs maintain-verification's check script when it finishes. Then make your tool see the skills ([next section](#install-skills-in-your-tool)). This manual route copies the full set up front; [ADOPT.md](ADOPT.md) installs less (no `check-feature-map.sh`, no cloud reference) and adds the rest in later phases.
2. **Fill the placeholders.** Find every one with `grep -rn "{{" .agents/skills --exclude=_feature.template.md`, replace it, and delete each `HOW TO USE` comment block. `_feature.template.md` keeps its placeholders on purpose: it stays in `references/features/` as the copy source for new feature files. Step 3 fills `cross-cutting-flows.md`; run the grep again after it. [templates/README.md](templates/README.md) explains the placeholders and the order of adoption.
3. **Let the agent draft your feature map.** Tell it: "use the create-verification skill for this repo". Review what it generates, because you know what your users really do.
4. **Add the guardrails.** Copy [templates/guardrails/AGENTS.md.template](templates/guardrails/AGENTS.md.template) to `AGENTS.md`, [templates/ci/ci.yml](templates/ci/ci.yml) to `.github/workflows/ci.yml` (fill in `{{WORKING_DIR}}`, `{{GATE_COMMAND}}` and the other placeholders at the top of the file), and [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh) and [templates/ci/check-coverage.mjs](templates/ci/check-coverage.mjs) into `scripts/`, then call both from your gate command. Fill in [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md) to see which rules are still soft.
5. **Then grow.** Use [templates/skills/_skill-from-failure.md](templates/skills/_skill-from-failure.md) for each recurring failure, and [templates/evals/EVAL_PLAYBOOK.md](templates/evals/EVAL_PLAYBOOK.md) to measure your skills. Not a TypeScript web app? [docs/09-other-stacks.md](docs/09-other-stacks.md) maps each mechanism to tools for your stack.
6. **Run the example** to watch the gate go red on a violation and verify catch a planted bug:

   ```bash
   cd example && npm ci && npm run gate
   ```

   The gate includes a self-test that plants a bug in the build and proves that verify goes red on it. It needs Node.js `^22.13.0 || ^24 || >=26` and a Chromium on the machine; details in [example/README.md](example/README.md).

## Install skills in your tool

- **Canonical location:** `.agents/skills/<name>/SKILL.md`, flat. Do not nest skills in grouping folders; put the owner or area in the skill name instead.
- **Cursor and Codex** read `.agents/skills` directly. Nothing to do.
- **Claude Code** reads `.claude/skills`. Point it at the same directory from the repo root:

  ```bash
  mkdir -p .claude && ln -s ../.agents/skills .claude/skills
  ```

- **AGENTS.md** is read by Cursor and Codex. Claude Code reads it only when there is no `CLAUDE.md`; otherwise add the line `@AGENTS.md` to `CLAUDE.md`.
- **Keeping a skill manual-only:** `disable-model-invocation: true` in the `SKILL.md` frontmatter is honoured by Claude Code and Cursor. Codex uses `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml` instead. Don't rely on other tool-specific frontmatter keys; the `name` and `description` are what every tool needs.

## Idea → Doc → Template

| Idea | Doc | Template / example |
|---|---|---|
| The trust curve: no shortcuts, don't scale before you trust | [docs/01-trust-curve.md](docs/01-trust-curve.md) | [templates/README.md](templates/README.md), [example/README.md](example/README.md) |
| Verification: the agent runs the real thing and brings evidence | [docs/02-verification.md](docs/02-verification.md) | [templates/skills/verify-app/SKILL.md](templates/skills/verify-app/SKILL.md), [templates/skills/create-verification/SKILL.md](templates/skills/create-verification/SKILL.md), [templates/skills/maintain-verification/SKILL.md](templates/skills/maintain-verification/SKILL.md), [templates/skills/verify-app/references/cloud-environment.md](templates/skills/verify-app/references/cloud-environment.md) |
| Control skill: `doctor`, worktree isolation, refuse instead of fall back | [docs/02-verification.md](docs/02-verification.md) | [templates/skills/verify-app/references/worktree-isolation.md](templates/skills/verify-app/references/worktree-isolation.md) |
| Feature map as a directory: index, baseline, driving conventions, proof & skip reporting, full sweep | [docs/03-feature-map.md](docs/03-feature-map.md) | [templates/skills/verify-app/references/features/README.md](templates/skills/verify-app/references/features/README.md), [templates/skills/verify-app/references/features/_feature.template.md](templates/skills/verify-app/references/features/_feature.template.md), [templates/skills/verify-app/references/features/cross-cutting-flows.md](templates/skills/verify-app/references/features/cross-cutting-flows.md), [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh), [templates/ci/check-coverage.mjs](templates/ci/check-coverage.mjs) |
| Skills born from failure modes, "stop guessing", the backseat driver | [docs/04-skills-from-failures.md](docs/04-skills-from-failures.md) | [templates/skills/_skill-from-failure.md](templates/skills/_skill-from-failure.md), [templates/skills/investigate/SKILL.md](templates/skills/investigate/SKILL.md) |
| Mode/router skills, principles, challenge skills, a catalog by owner/area | [docs/04-skills-from-failures.md](docs/04-skills-from-failures.md) | [templates/skills/team-mode/SKILL.md](templates/skills/team-mode/SKILL.md), [templates/skills/team-mode/principles/_principle.template.md](templates/skills/team-mode/principles/_principle.template.md), [templates/skills/are-you-sure-you-need-x/SKILL.md](templates/skills/are-you-sure-you-need-x/SKILL.md), [templates/skills/CATALOG.md](templates/skills/CATALOG.md) |
| Evals: coordinator, rubric, blind subagent, judge from a different model, hill-climbing | [docs/05-evals.md](docs/05-evals.md) | [templates/evals/EVAL_PLAYBOOK.md](templates/evals/EVAL_PLAYBOOK.md), [templates/evals/rubric.template.md](templates/evals/rubric.template.md), [templates/evals/judge-prompt.md](templates/evals/judge-prompt.md), [templates/evals/scoreboard.template.md](templates/evals/scoreboard.template.md) |
| Five hard/soft guardrail layers; turning review comments into rules | [docs/06-guardrail-layers.md](docs/06-guardrail-layers.md) | [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md), [templates/guardrails/review-comment-to-rule.md](templates/guardrails/review-comment-to-rule.md), [templates/guardrails/AGENTS.md.template](templates/guardrails/AGENTS.md.template), [templates/ci/ci.yml](templates/ci/ci.yml), [templates/ci/check-feature-map.sh](templates/ci/check-feature-map.sh), [templates/ci/check-coverage.mjs](templates/ci/check-coverage.mjs) |
| Architecture contract: agent behavior as a design input, five rules, five nouns, package boundaries | [docs/07-agent-first-architecture.md](docs/07-agent-first-architecture.md) | [templates/guardrails/architecture-contract.md](templates/guardrails/architecture-contract.md), [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md), [templates/ci/ci.yml](templates/ci/ci.yml), [example/README.md](example/README.md) |
| Local → cloud agents → automation → auto-merge, atomic PRs, token ROI | [docs/08-scaling-to-cloud-agents.md](docs/08-scaling-to-cloud-agents.md) | [templates/skills/verify-app/SKILL.md](templates/skills/verify-app/SKILL.md), [templates/skills/verify-app/references/cloud-environment.md](templates/skills/verify-app/references/cloud-environment.md), [templates/automation/bug-repro.md](templates/automation/bug-repro.md), [templates/automation/automerge-policy.md](templates/automation/automerge-policy.md), [templates/guardrails/review-comment-to-rule.md](templates/guardrails/review-comment-to-rule.md), [templates/ci/ci.yml](templates/ci/ci.yml) |
| Long-running goals: ticks, escalating when progress stalls, the last human dependency | [docs/08-scaling-to-cloud-agents.md](docs/08-scaling-to-cloud-agents.md) | [templates/automation/goal-ticks.md](templates/automation/goal-ticks.md) |
| The same mechanisms on other stacks: verify drivers, import boundaries, banned APIs, comment policy, discovery | [docs/09-other-stacks.md](docs/09-other-stacks.md) | [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md), [example/README.md](example/README.md) |
| The kit's own proof: the example's gate runs in CI | [docs/06-guardrail-layers.md](docs/06-guardrail-layers.md) | [.github/workflows/example.yml](.github/workflows/example.yml), [example/README.md](example/README.md) |
| Glossary | [docs/glossary.md](docs/glossary.md) | - |

## Adoption path by trust stage

The six stages below are a frame for measuring where you are; tune the "move on when ..." thresholds to fit your team. Don't skip stages: spawning cloud agents in bulk while you are still at the start of the curve only burns tokens.

| Stage | What you do | Use | Move on when ... |
|---|---|---|---|
| **0. In the loop with 1-3 local agents** | Watch every output, read tool calls and thinking blocks, write down failure modes. | [docs/01](docs/01-trust-curve.md), [docs/04](docs/04-skills-from-failures.md) | You can list the agent's recurring failure modes, and you still feel like the manual verifier. |
| **1. Verification closes the loop** | Build `verify-app` plus a feature map (a directory, with proof rules); the agent attaches evidence when it reports done. | [docs/02](docs/02-verification.md), [docs/03](docs/03-feature-map.md), [templates/skills/verify-app/SKILL.md](templates/skills/verify-app/SKILL.md) | You no longer copy-paste screenshots or console errors to the agent, and given a vague bug report it finds the right feature and reproduces the bug on its own. |
| **2. Skills + evals** | Turn failure modes into skills, group them under a mode skill as they multiply; eval every skill across several models, with a judge from a different model, and hill-climb. | [docs/04](docs/04-skills-from-failures.md), [docs/05](docs/05-evals.md), [templates/evals/EVAL_PLAYBOOK.md](templates/evals/EVAL_PLAYBOOK.md) | Your key skills (verification above all) hit the rubric consistently on the models you use, and scores don't drop when you edit a skill. |
| **3. Hard guardrails** | Move rules from the soft layers into CI/lint/the compiler; turn recurring review comments into rules; co-locate and standardize by convention. | [docs/06](docs/06-guardrail-layers.md), [docs/07](docs/07-agent-first-architecture.md), [templates/guardrails/enforcement-layers.md](templates/guardrails/enforcement-layers.md), [templates/ci/ci.yml](templates/ci/ci.yml) | Recurring review comments all but disappear, because that class of mistake turns CI red before it reaches a reviewer. |
| **4. Cloud agents and automation** | Set up the cloud environment, bring `verify-app` into it, and run automatically on signals like bug reports (the agent reproduces the bug); small, atomic PRs; long-running goals report in ticks. | [docs/08](docs/08-scaling-to-cloud-agents.md), [templates/skills/verify-app/SKILL.md](templates/skills/verify-app/SKILL.md), [templates/skills/verify-app/references/cloud-environment.md](templates/skills/verify-app/references/cloud-environment.md), [templates/automation/bug-repro.md](templates/automation/bug-repro.md), [templates/automation/goal-ticks.md](templates/automation/goal-ticks.md) | Automation results (for example, bug reproduction reports) are usually correct and come with evidence, so you skim instead of redoing them; token cost has been weighed against ROI. |
| **5. Auto-merge + review on main** | Let the agent merge the kinds of change the hard gate already covers; review afterward on main and keep turning comments into rules. | [docs/06](docs/06-guardrail-layers.md), [docs/08](docs/08-scaling-to-cloud-agents.md), [templates/automation/automerge-policy.md](templates/automation/automerge-policy.md), [templates/guardrails/review-comment-to-rule.md](templates/guardrails/review-comment-to-rule.md) | This is the last stage of the path; "moving on" means widening scope (more kinds of change, more contributors such as PMs and designers) once review on main rarely finds anything new. |

## Repo layout

```
poteto-kit/
├── README.md                 entry point (this file)
├── ADOPT.md                  playbook your coding agent runs to adopt the kit step by step
├── LICENSE                   MIT
├── assets/                   icon (poteto.png 512px, 128/32px sizes, original artwork)
├── .github/workflows/
│   └── example.yml           this repo's own CI: runs the example's gate
├── docs/                     guides
│   ├── 01-trust-curve.md
│   ├── 02-verification.md
│   ├── 03-feature-map.md
│   ├── 04-skills-from-failures.md
│   ├── 05-evals.md
│   ├── 06-guardrail-layers.md
│   ├── 07-agent-first-architecture.md
│   ├── 08-scaling-to-cloud-agents.md
│   ├── 09-other-stacks.md
│   └── glossary.md
├── templates/                copy into your repo (see templates/README.md)
│   ├── README.md
│   ├── skills/               verify-app (with references/, including cloud-environment.md),
│   │                         create-/maintain-verification, team-mode (with principles/),
│   │                         are-you-sure-you-need-x, investigate,
│   │                         CATALOG.md, _skill-from-failure.md
│   ├── evals/                EVAL_PLAYBOOK, rubric, judge-prompt, scoreboard
│   ├── guardrails/           AGENTS.md.template, enforcement-layers,
│   │                         architecture-contract, review-comment-to-rule
│   ├── automation/           goal-ticks.md, bug-repro.md, automerge-policy.md
│   └── ci/                   ci.yml, check-feature-map.sh, check-coverage.mjs
└── example/                  runnable TypeScript example (see example/README.md)
    ├── src/                  features/, framework/, client/, electron/
    ├── .agents/skills/       verify-app and a filled-in feature map
    ├── scripts/              verify CLI, check-features, guardrail tests
    └── guardrail-fixtures/   sample violations that prove the rules fire
```

## License

MIT.
