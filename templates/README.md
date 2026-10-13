# Templates: a starter set to copy into your repo

This directory is the template half of **poteto-kit**: a general-purpose set of templates to copy into your repo to build trust with coding agents (verification, skills, architectural guardrails). Each template body is written for agents to read, in English, and has to work on Claude Code, Cursor and Codex. This README is the human guide.

Want your coding agent to do the adoption for you, one phase at a time? Point it at [ADOPT.md](../ADOPT.md). The rest of this README is the manual route.

## The three pillars that organize the templates

poteto-kit is built around three pillars that answer the question "how do I trust my agent more?" Every template below belongs to one of them:

| Pillar | What it means | Templates in this pillar |
| --- | --- | --- |
| 1. Verification | The agent can run the real app, drive it, and capture evidence | `skills/verify-app/` (SKILL.md, `references/features/`, `references/worktree-isolation.md`, `references/cloud-environment.md`), `skills/create-verification/`, `skills/maintain-verification/`, `ci/check-feature-map.sh`, `ci/check-coverage.mjs`, `automation/bug-repro.md` (when scaling up) |
| 2. High-quality skills (skills that teach the agent to work like a real engineer) | Turn observed behavioral failures into the smallest possible skill; measure with evals | `skills/team-mode/` (with its `principles/`), `skills/investigate/`, `skills/are-you-sure-you-need-x/`, `skills/_skill-from-failure.md`, `skills/CATALOG.md`, `evals/*` |
| 3. Agent-friendly architecture | Hard guardrails in the codebase, lint, CI; the shortest path is the right path | `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md`, `ci/ci.yml` |

Scaling up (cloud agents, automations, auto-merge) sits on top of the three pillars: `automation/goal-ticks.md`, `automation/bug-repro.md`, `automation/automerge-policy.md`.

The recommended order of adoption follows the trust curve too: local verification first, then skills, then guardrails, and scaling up last.

## Install: where each tool reads skills

Install every skill once, in one place, and let each tool find it:

- **Canonical location:** `.agents/skills/<name>/SKILL.md`, **flat** (exactly one folder level per skill). Do not group skills in nested folders such as `.agents/skills/client/<name>/`: the tools below disagree on whether they find them. Group with a name prefix instead (`client-control-app`; see `skills/CATALOG.md`).
- **Frontmatter:** `name` (must equal the folder name) and `description` work everywhere, and are all a skill needs. `disable-model-invocation: true` means "only when the user invokes it by name, never auto-loaded"; Claude Code and Cursor honour it. Codex does not read that key; it uses `agents/openai.yaml` inside the skill folder with `policy: { allow_implicit_invocation: false }`. No other frontmatter key is documented by all three tools, so the templates use no others. A one-line nudge for every new task goes in `AGENTS.md` instead.
- **Instructions file:** `AGENTS.md` at the repo root.

| Tool | Where it reads skills | Where it reads instructions | What to do |
| --- | --- | --- | --- |
| Codex | `.agents/skills`, found by scanning upward from the working directory to the repo root (it does not scan downward into subfolders) | `AGENTS.md` | Put skills in `.agents/skills/` at the repo root. For explicit-only skills add `agents/openai.yaml` with `policy: { allow_implicit_invocation: false }` |
| Cursor | `.agents/skills`, walked recursively | `AGENTS.md` | Nothing more. `disable-model-invocation: true` in the frontmatter makes a skill explicit-only |
| Claude Code | `.claude/skills/<name>/SKILL.md` (flat; nested grouping folders are not documented) | `CLAUDE.md`; reads `AGENTS.md` only when there is no `CLAUDE.md` | Make `.claude/skills` a symlink to `.agents/skills`; create a `CLAUDE.md` containing `@AGENTS.md`. `disable-model-invocation: true` makes a skill explicit-only |

One-time setup for Claude Code, from the repo root:

```sh
mkdir -p .agents/skills .claude
ln -s ../.agents/skills .claude/skills
printf '@AGENTS.md\n' > CLAUDE.md
```

If your platform cannot create symlinks (some Windows setups), keep `.claude/skills` as a copy and sync it in your gate, rather than editing two places by hand. Commit the symlink, the skills and `AGENTS.md`. Official docs these rules come from: Claude Code `code.claude.com/docs/en/skills` and `/memory`, Cursor `cursor.com/docs/context/skills`, Codex `learn.chatgpt.com/docs/build-skills`; the tools change, so recheck them when something does not load.

Templates refer to each other by their path in this kit (for example `guardrails/enforcement-layers.md`, `evals/EVAL_PLAYBOOK.md`). After you copy them, read those as pointing at your copy.

## How to use any template

1. Copy the file into your repo (suggested paths are in the file map below).
2. Search the file for `{{` to find every spot that needs filling in. `{{NAME}}` is a placeholder for you to fill in; don't leave any behind. The one exception is `_feature.template.md`, the copy source for feature files: search the installed skills with `grep -rn "{{" .agents/skills --exclude=_feature.template.md`. The placeholders section below lists all of them.
3. Each template starts with a comment block `<!-- HOW TO USE: ... -->` (`ci/check-feature-map.sh` and `ci/ci.yml` use `#` lines; `ci/check-coverage.mjs` uses `//` lines) giving brief usage instructions. Read it, then delete it. For `SKILL.md` files specifically, the frontmatter (`---`) must be on the very first line so the agent recognizes the skill, so the comment block goes right after the frontmatter.
4. Try it out with a real agent and keep the evidence (screenshots, logs, traces) before you trust the template.
5. Anything in a template that refers to this kit's `example/` directory is in the HOW TO USE comment and goes away with it.

## File map

| File | What it is for | Where to copy it (suggested) |
| --- | --- | --- |
| `skills/verify-app/SKILL.md` | The verification skill (a "control skill"): capability list, runtime pin and environment check, picking a flow (main checkout or worktree), running `doctor` first, running the real app (web, Electron, iOS, Android, Flutter/React Native, backend HTTP API, CLI), capturing evidence, reporting. Auto-invocable by default; works in cloud VMs where a display or headless browser and a profile exist | `.agents/skills/verify-app/` |
| `skills/verify-app/references/features/README.md` | The feature map index: purpose, preconditions, driving conventions, how to prove and report what was skipped, full-sweep order, catalog by area | same directory, under `references/features/` |
| `skills/verify-app/references/features/_feature.template.md` | Template for ONE feature: overview + root selector, Sub-features, how to get there (user's point of view), how to drive it | install it in that directory and keep it there as the copy source (the one installed file that keeps its `{{` placeholders); copy it to `<feature-id>.md` per feature |
| `skills/verify-app/references/features/cross-cutting-flows.md` | Journeys that span several features: a `## Flows` section of ``- `flow-<id>` — ...`` bullets, each with How to get to it and Driving it detail | same directory. A pure template (every flow is a placeholder): fill it in at once, or start from a stub (heading plus an empty `## Flows`) and copy the template when the first real flow exists |
| `skills/verify-app/references/worktree-isolation.md` | Running several instances in parallel: ports derived from the worktree, isolated profiles, refusing instead of guessing, `--worktree` versus `--target <checkout>` (one CLI driving other checkouts), `doctor` | alongside `references/` |
| `skills/verify-app/references/test-account.md` | The test account for an app with a login: a CLI command that creates one dedicated account, credentials outside the repo and never printed, what `doctor` may say, backends with one session per account | alongside `references/` (delete if the app has no login) |
| `skills/verify-app/references/evidence-export.md` | Optional human-readable evidence: HTML rendered from `report.json` in the team's language, printed to PDF by the browser that drove the run, with font checks | alongside `references/` (delete if nobody needs it) |
| `skills/verify-app/references/cloud-environment.md` | Running the control skill in a cloud agent VM: headless browser or virtual display, profile and auth seeding, ports, artifact upload, what to mark manual | alongside `references/` (delete if you never run in the cloud) |
| `skills/create-verification/SKILL.md` | Meta-skill: explores the codebase, then generates `verify-app` and the feature map directory itself | `.agents/skills/create-verification/` |
| `skills/maintain-verification/SKILL.md` | Keeps the feature map in sync with the code; points at the two CI scripts that check it | `.agents/skills/maintain-verification/` |
| `skills/team-mode/SKILL.md` | A router skill: the non-negotiables, a trigger table pointing to leaf skills, "asking a human is the slow path", naming the data shape first, splitting work in parallel, the failure loop. Explicit invocation only | `.agents/skills/team-mode/` |
| `skills/team-mode/principles/_principle.template.md` | Template for one principle per file; four filled principles ship beside it (`fix-root-causes.md`, `boundary-discipline.md`, `encode-lessons-in-skills.md`, `script-the-deterministic-parts.md`) | `.agents/skills/team-mode/principles/<name>.md` (do not install the underscore file) |
| `skills/are-you-sure-you-need-x/SKILL.md` | A "challenge" skill for when the agent reaches for a risky API or pattern (for example `requestAnimationFrame`, `useEffect`) | `.agents/skills/are-you-sure-you-need-<x>/` |
| `skills/CATALOG.md` | How to classify a skill library and name it flat with prefixes by owner/area; a starter catalog to fill in | `.agents/skills/CATALOG.md` |
| `skills/investigate/SKILL.md` | "Don't guess": read the code, cite `file:line`, and reproduce before stating a root cause | `.agents/skills/investigate/` |
| `skills/_skill-from-failure.md` | The loop that turns an observed behavioral failure into the smallest possible skill | keep in `docs/` (a process doc, not installed as a skill) |
| `evals/EVAL_PLAYBOOK.md` | The eval process: coordinator, blind subagents, a judge on a different model, hill-climbing | `evals/` |
| `evals/rubric.template.md` | Scoring rubric template (criteria scored 0-10), with a "proof completeness" criterion | `evals/<skill>/rubric.md` |
| `evals/judge-prompt.md` | Prompt for the judge, returns JSON (a reason for every score below 10), with rules for scoring how complete the evidence is | `evals/` |
| `evals/scoreboard.template.md` | Scoreboard by iteration, model and task | `evals/<skill>/scoreboard.md` |
| `guardrails/AGENTS.md.template` | Architecture map, banned patterns with reasons, gate command, PR policy, working-mode line, tool notes | `AGENTS.md` at the repo root (plus a `CLAUDE.md` containing `@AGENTS.md`) |
| `guardrails/review-comment-to-rule.md` | Turn each review comment into a hard rule | `docs/` |
| `guardrails/enforcement-layers.md` | A matrix of the five enforcement layers (codebase, static analysis, rules/review bot, skills, style guide) plus two optional extra rows (tests, human review); layers 1-2 hard, 3-5 soft | `docs/` |
| `guardrails/architecture-contract.md` | An agent-friendly architecture contract: agent behavior as a design input, 5 rules, public nouns, package boundaries | `docs/` |
| `ci/ci.yml` | A GitHub Actions template that runs your gate and uploads artifacts on failure; fill in the placeholders | `.github/workflows/ci.yml` |
| `ci/check-feature-map.sh` | Gate script (POSIX shell): every feature directory has a feature-map file and an index line, and the reverse | `scripts/check-feature-map.sh` |
| `ci/check-coverage.mjs` | Gate script (Node, no dependencies): every entry point in the map is covered by a scenario in the manifest it reads, or marked `skip: <reason>`; fails on uncovered, unknown, duplicate and stale-skip ids. It trusts the manifest: generate it from the run (see Step 2), do not keep it by hand | `scripts/check-coverage.mjs` |
| `automation/goal-ticks.md` | Long-horizon goals for a coordinator agent: tick cadence, report template, escalation when there is no progress, a "LAST HUMAN DEPENDENCY" note | `docs/` or the coordinator agent's prompt |
| `automation/bug-repro.md` | An automation that tries every incoming bug report on main with the control skill and posts REPRODUCED / NOT REPRODUCED / FIXED ON MAIN / SETUP OR DATA / NEEDS INFO with evidence, and lists related open reports so one coordinator can take the group: trigger, prompt, output format, escalation rule | `docs/` or the automation's instructions |
| `automation/automerge-policy.md` | Which change classes may auto-merge, required signals, protected paths, revert policy, reviewing on main afterwards; fillable | `docs/automerge-policy.md` |

## Recommended order of adoption

### Step 1. Pillar 1: build verification (day one)

1. Copy `skills/create-verification/SKILL.md` and the whole `skills/verify-app/` directory (including `references/`) into `.agents/skills/`. Fill in the basics: `{{APP_NAME}}`, `{{SKILLS_DIR}}`, `{{GATE_COMMAND}}`.
2. Tell the agent: "Use the create-verification skill for this repo". It explores the code with several parallel subagents, generates `verify-app/SKILL.md` and the `references/features/` directory, adds any missing stable selectors, then verifies 2-3 features itself.
3. Review the feature map: you are the one who knows what users really do. Try it with a vague bug report (a screenshot with "???") and see whether the agent maps it to the right feature.
4. Run it locally and watch every tool call (the "backseat driver"): see how the agent calls CDP, `adb` or the simulator.
5. If you have several agents, or you work in parallel with an agent, keep `references/worktree-isolation.md` and install the behavior of refusing when the target is ambiguous.
6. If the app has a login, keep `references/test-account.md` and let the CLI create the test account. Keep `references/evidence-export.md` only if someone must read the evidence outside Markdown.

Fill in `verify-app/SKILL.md`: `{{APP_NAME}}`, `{{APP_TYPE}}`, `{{INSTALL_COMMAND}}`, `{{DEV_COMMAND}}`, `{{APP_URL}}` or `{{CDP_PORT}}`, `{{CLI_NAME}}`, `{{CLI_FILE}}`, `{{DEFAULT_PORT}}`, `{{DEFAULT_PROFILE_DIR}}`, `{{ARTIFACTS_DIR}}`, `{{TEST_DATA_OR_LOGIN}}`, `{{CREDENTIALS_FILE}}`, `{{DEFAULT_BRANCH}}`, `{{RUNTIME_VERSION_FILE}}`, `{{REQUIRED_TOOLS}}`, `{{SIMULATOR_NAME}}`. Delete the parts that don't apply to your app type (web, Electron, iOS, Android, Flutter/React Native, backend API or CLI). Note that a real verification skill has its own CLI with `--help` and its own tests. The frontmatter line `disable-model-invocation: false` is a literal on purpose (so the file is valid YAML before you edit it); change it to `true` only if you want explicit `/verify-app` invocation.

Structure of `references/features/` (one file per feature):

- `README.md`: purpose, preconditions (`{{TEST_ACCOUNT}}`, `{{STARTING_STATE}}`, ...), driving conventions (prefer ARIA labels and semantic data attributes, keyboard shortcuts over coordinate clicks, `eval` for reading only, polling for the end state with async work, watching the console), how to prove and report what was skipped, full-sweep order, catalog by area. Each catalog line must have exactly the form ``- [`<id>`](<id>.md) — scope`` (scope required) because the CI script reads it.
- `<feature-id>.md` (copied from `_feature.template.md`): overview + root selector, Sub-features, How to get to it, Driving it. `<feature-id>` matches the directory name in `src/features/`. Sub-features are bullets of the form ``- `<id>` — <one line>``.
- `cross-cutting-flows.md`: journeys across several features, as a `## Flows` section of ``- `flow-<id>` — <one line>`` bullets, each followed by the same How to get to it and Driving it detail.
- A path you cannot reach is marked on its id line with a trailing `skip: <reason>`. The proof report repeats the skip (see "Proof and skip reporting" in `references/features/README.md`).

If you run agents in cloud VMs, keep `references/cloud-environment.md` and fill it in; otherwise delete it and the cloud line in `verify-app/SKILL.md`.

### Step 2. Keep the map from going stale

1. Copy `skills/maintain-verification/SKILL.md`. Fill in `{{FEATURES_DIR}}` (default `src/features`), `{{FEATURE_MAP_DIR}}`, `{{GATE_COMMAND}}`.
2. Copy `ci/check-feature-map.sh` to `scripts/` and add it to your gate command: `sh scripts/check-feature-map.sh <features-dir> <feature-map-dir>`. The rule runs both ways: every `src/features/<id>/` has a `references/features/<id>.md` and a line in the README catalog; conversely, every feature file and every catalog line has a matching directory. This is a hard CI rule; the skill is only a soft layer supporting it.
3. Copy `ci/check-coverage.mjs` to `scripts/` and add `node scripts/check-coverage.mjs --features <feature-map-dir>` to the gate. It reads every Sub-features id in the feature files and every `## Flows` id in `cross-cutting-flows.md`, and a scenarios manifest you keep. The portable default is a JSON file `verify-coverage.json` at the repo root:

   ```json
   { "scenarios": [ { "name": "sidebar/new-note", "covers": ["sidebar-new-note"] } ] }
   ```

   (Instead, or as well, it can scan `*.scenario.*` files that declare `covers: [...]`: pass `--scenarios <dir>`.) It fails for an id no scenario covers and that has no `skip: <reason>`, a scenario that covers an unknown id, an id listed twice, and an id that is covered but still marked skip. Skips are printed on success, so they stay visible in CI logs.

   **A manifest someone typed is a claim, not a result.** The script cannot tell a scenario that reached `sidebar-new-note` from one that merely lists it. The honest setup has your verify command write the manifest itself, after the run, listing in each passing scenario's `covers` only the ids that an assertion tagged with that id passed on (a failed scenario lists none), and has the check run after that command. The runnable example does this: its `verify:all` writes `artifacts/verify-coverage.json` in exactly this shape, `verify:all` fails any scenario whose declared `covers` differs from what its assertions reached (it is the only authority; no gate reads the file back), and `node ../templates/ci/check-coverage.mjs --features .agents/skills/verify-app/references/features --manifest artifacts/verify-coverage.json` accepts the same file. The difference: the template script knows only the manifest (it cannot say which declared id went unreached, and it believes a hand-written or old file), so run it in the same job right after the verify command and keep that command's exit code as the authority; the example's `verify:all` compares each scenario's declarations with what it reached while it runs.
4. Mention the skill in `AGENTS.md`: any PR that adds, renames or removes a feature, route, shortcut or selector must update the feature map and attach an evidence report.

### Step 3. Pillar 2: high-quality skills

1. Copy `skills/investigate/SKILL.md`. Fill in `{{REPRO_SKILL}}` (`verify-app`) and `{{SUBAGENT_LIMIT}}`.
2. When a behavioral mistake recurs, or several agents make it, try the correction ladder first (`guardrails/review-comment-to-rule.md`: can the structure, a lint rule or a CI check remove it?). Use `skills/_skill-from-failure.md` only if the fix is judgment or procedure: name the failure, write the smallest skill that prevents it, add an eval case that reproduces the failure, and rerun the eval. Don't write a skill library out of imagination.
3. Once you have a few skills, add `skills/team-mode/SKILL.md` as a router (fill the trigger table with skills you really have) and the principles in its `principles/` folder (one principle per file, linked relatively as `principles/<name>.md`; only name principles drawn from failures you have observed). Add the working-mode line to `AGENTS.md` (the template has it).
4. For each risky API or pattern that has caused an incident (for example `requestAnimationFrame`), create an `are-you-sure-you-need-<x>` copy. If you can ban it outright with lint, do the lint first; this skill is only for legitimate exceptions.
5. Use `skills/CATALOG.md` to track the skill library, and name skills flat with a prefix by owner or area when several people contribute.

### Step 4. Measure whether skills really work

1. Copy the `evals/` directory. For each skill, copy `rubric.template.md` and `scoreboard.template.md` to `evals/<skill>/rubric.md` and `evals/<skill>/scoreboard.md`.
2. Write 5-10 observable criteria, with at least one negative criterion. For a verification skill, keep the "proof completeness" criterion: did it run through every entry point and path in the feature file, and did it record the end state?
3. Open `EVAL_PLAYBOOK.md`, fill `{{SKILL_NAME}}`, `{{SKILL_PATH}}`, `{{MODELS}}`, `{{JUDGE_MODEL}}`, `{{TARGET}}`, `{{K}}`, `{{CONCURRENCY}}` into the coordinator prompt (section 4), then paste it into a main agent session.
4. Remember: name the task directories neutrally (`work-0417`, not "eval" or "test"), use a judge on a different model from the one being graded, and keep a few tasks as hold-outs to guard against overfitting. Rerun after every skill change.
5. Run fewer parallel subagents than you have CPU cores: memory runs out before CPU. Check free memory, set `{{CONCURRENCY}}` to 2-4, use `/tmp/<task-name>/` and clean up when done.

### Step 5. Pillar 3: build hard guardrails and agent-friendly architecture

1. Copy `guardrails/AGENTS.md.template` to `AGENTS.md`. Fill in the architecture map, the "shortest path is the best path" convention (one directory per feature, discovered from reserved files, no registry), the table of banned patterns with reasons, `{{GATE_COMMAND}}`, and the PR policy. For Claude Code, also create a `CLAUDE.md` containing the single line `@AGENTS.md`.
2. Fill in `guardrails/enforcement-layers.md`: five layers (1 codebase, 2 static analysis including lint/compiler/CI, 3 rules/review bot, 4 skills, 5 style guide). Layers 1-2 turn CI red (hard), layers 3-5 are soft. The goal: every important invariant has at least one hard layer. The two rows "Tests" and "Human review" are optional extra rows below the five layers; keep or delete them.
3. Use `guardrails/review-comment-to-rule.md` when you are about to write a review comment about a mistake that recurs, or that several agents make (a one-off only needs the PR fixed). The decision ladder (strongest first): eliminate the whole class of error with types/architecture, the compiler, lint, a CI script, a test, and only last a soft rule.
4. Read and adapt `guardrails/architecture-contract.md` if you are designing (or restructuring) an architecture: treat the agent's predictable behavior as a design input, fill in the "how we enforce it here" column and the public nouns table. This is a set of ideas and principles, not a library to install.
5. Copy `ci/ci.yml` to `.github/workflows/ci.yml`, fill `{{WORKING_DIR}}`, `{{NODE_VERSION}}`, `{{INSTALL_COMMAND}}`, `{{GATE_COMMAND}}` and `{{ARTIFACTS_PATH}}`, delete the browser-install step if your verification does not drive a browser, and make sure the job runs your actual gate command (the one that includes the two scripts from Step 2).

### Step 6. Scale up (only once trust is established locally)

Only after local verification and the hard guardrails are working well should you let agents run in the cloud, automate off signals, and then consider auto-merge. Jumping straight to thousands of agents before you have trust only burns tokens. See `docs/08-scaling-to-cloud-agents.md`.

1. Cloud agents: fill in `skills/verify-app/references/cloud-environment.md` (display, profile seeding, ports, artifact upload, what to mark manual).
2. Triage off signals: `automation/bug-repro.md` tries every incoming bug report on main with the control skill, posts a verdict with evidence, and lists related open reports so one coordinator can take the group.
3. Long-horizon goals run by a coordinator agent: `automation/goal-ticks.md`. State an observable completion criterion, report ticks using the template, escalate only when the next tick shows no progress, and pin a "LAST HUMAN DEPENDENCY" note. Run the cadence with your tool's loop or schedule feature (for example `/loop`).
4. Fuzz swarm: once `verify-app` passes its evals, run 10 or more agents (directed, plus a few random) on a build you are about to ship or a risky merge, against a non-production backend by default, and review the artifacts first and sample the diff (`docs/08-scaling-to-cloud-agents.md`). Ordinary PRs get one to a few verifiers.
5. Standing scanner: an agent that scans for a pattern you want gone but cannot lint yet, queues each hit in a document, and you read the queue every few days for a shared cause.
6. Auto-merge: fill in `automation/automerge-policy.md` (change classes, required signals including the agent risk rating (low only at first), protected paths, revert policy, review on main afterwards), and enforce it as a required status check, not as an instruction.

## Placeholders

Generated by grepping every `{{...}}` in `templates/` (all files except this README). Each placeholder is listed once, with its meaning and the files that use it. `{{NAME}}` in capitals is a named slot you fill once per repo. Lower-case `{{...}}` text is a prose slot, described after the tables.

### Project and commands (used across several templates)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{PROJECT_NAME}}` | Name of your project, in headings and prose. | `automation/automerge-policy.md`, `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md` |
| `{{PROJECT_ONE_LINE}}` | One sentence on what the project is, at the top of AGENTS.md. | `guardrails/AGENTS.md.template` |
| `{{APP_NAME}}` | Display name of the app the agent drives and verifies. | `CATALOG.md`, `create-verification/SKILL.md`, `verify-app/SKILL.md`, `features/README.md` |
| `{{APP_SHORT}}` | Short name of the app, used as a skill-name part in the catalog (for example in `check-<app>-perf-regression`). | `CATALOG.md` |
| `{{INSTALL_COMMAND}}` | Clean, lockfile-exact dependency install (for example `npm ci`). | `ci/ci.yml`, `guardrails/AGENTS.md.template`, `verify-app/SKILL.md` |
| `{{DEV_COMMAND}}` | Command that starts the app the way users reach it (dev server, desktop shell, simulator build). | `guardrails/AGENTS.md.template`, `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md` |
| `{{TEST_COMMAND}}` | Command that runs the unit tests. | `guardrails/AGENTS.md.template`, `guardrails/enforcement-layers.md` |
| `{{LINT_COMMAND}}` | Command that runs the linter. | `guardrails/enforcement-layers.md` |
| `{{TYPECHECK_COMMAND}}` | Command that runs the type checker or compiler diagnostics. | `guardrails/enforcement-layers.md` |
| `{{GATE_COMMAND}}` | The single command that runs every check (lint, types, boundaries, feature-map and coverage checks, tests, verification scenarios). CI and local runs use the same one. | `automation/automerge-policy.md`, `automation/goal-ticks.md`, `ci/ci.yml`, `guardrails/AGENTS.md.template`, `guardrails/review-comment-to-rule.md`, `CATALOG.md`, `create-verification/SKILL.md`, `maintain-verification/SKILL.md` |
| `{{GATE_CONTENTS}}` | The list of what the gate runs, in prose, for the AGENTS.md Gate section. | `guardrails/AGENTS.md.template` |
| `{{VERIFY_COMMAND}}` | Command that verifies one feature (for example the verification CLI with a feature and scenario). | `guardrails/AGENTS.md.template` |
| `{{SKILLS_DIR}}` | Directory that holds your skills. Default `.agents/skills`. | `automation/automerge-policy.md`, `guardrails/AGENTS.md.template`, `guardrails/enforcement-layers.md`, `CATALOG.md`, `create-verification/SKILL.md`, `maintain-verification/SKILL.md`, `team-mode/SKILL.md` |
| `{{FEATURES_DIR}}` | Directory with one folder per feature. Default `src/features`. | `automation/automerge-policy.md`, `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md`, `create-verification/SKILL.md`, `maintain-verification/SKILL.md`, `features/README.md`, `features/_feature.template.md` |
| `{{FEATURE_MAP_DIR}}` | The feature map directory. Default `<SKILLS_DIR>/verify-app/references/features`. | `automation/bug-repro.md`, `guardrails/AGENTS.md.template`, `guardrails/review-comment-to-rule.md`, `maintain-verification/SKILL.md` |
| `{{SHARED_DIR}}` | Directory for code used by two or more features. | `automation/automerge-policy.md`, `guardrails/AGENTS.md.template` |
| `{{DEFAULT_BRANCH}}` | Your default branch name (for example `main`). The base for the lint delta and for the before/after worktree is `origin/{{DEFAULT_BRANCH}}`. | `automation/automerge-policy.md`, `verify-app/SKILL.md` |
| `{{OWNER}}` | A person, team or area that owns a skill or router (in `team-mode` and the catalog). | `CATALOG.md`, `team-mode/SKILL.md` |
| `{{DATE}}` | A date (rows of the promoted-rules table, the auto-merge ledger). | `automation/automerge-policy.md`, `guardrails/review-comment-to-rule.md` |

### verify-app skill

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{APP_TYPE}}` | One of web, electron, ios, android, cross-platform mobile, backend HTTP API, cli (keep only the ones that apply). | `verify-app/SKILL.md` |
| `{{APP_URL}}` | URL the web app or HTTP API serves at in development. | `verify-app/SKILL.md` |
| `{{CDP_PORT}}` | Chrome DevTools Protocol remote-debugging port, for web and Electron. | `verify-app/SKILL.md` |
| `{{CLI_NAME}}` | Name of the control skill's own CLI (the command that runs `doctor`, `--worktree`, `--target`, `account create`, and so on). | `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md`, `verify-app/references/evidence-export.md`, `verify-app/references/test-account.md`, `verify-app/references/worktree-isolation.md` |
| `{{CLI_FILE}}` | Repo path of that CLI's entry point (suggested `scripts/verify/cli.ts`; the CLI lives in the repo, not in the skill folder). | `verify-app/SKILL.md` |
| `{{DEFAULT_PORT}}` | Port of the shared instance in the main checkout. | `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md`, `verify-app/references/worktree-isolation.md` |
| `{{DEFAULT_PROFILE_DIR}}` | Profile or user-data directory of the shared instance (the human's session). | `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md`, `verify-app/references/worktree-isolation.md` |
| `{{ARTIFACTS_DIR}}` | Where each run writes screenshots, logs, traces and `report.json`/`report.md`. Suggested `artifacts/verify/<timestamp>/`. | `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md`, `verify-app/references/evidence-export.md` |
| `{{TEST_DATA_OR_LOGIN}}` | How the agent gets test data or a signed-in state. | `verify-app/SKILL.md` |
| `{{CREDENTIALS_FILE}}` | User config file, outside the repo, with mode 600, where the CLI keeps the test account's credentials (for example `~/.config/<app>/verify.env`). | `verify-app/SKILL.md`, `verify-app/references/test-account.md` |
| `{{REQUIRED_TOOLS}}` | Tools the skill needs installed (browsers, simulators, `adb`, Maestro, `curl`). | `verify-app/SKILL.md` |
| `{{SIMULATOR_NAME}}` | Name of the iOS simulator, Android emulator or device to boot. | `verify-app/SKILL.md` |
| `{{RUNTIME_VERSION_FILE}}` | File that pins the exact runtime version (for example a Node or toolchain version file). | `verify-app/SKILL.md`, `verify-app/references/cloud-environment.md`, `verify-app/references/worktree-isolation.md` |
| `{{PORT_RANGE}}` | Range that worktree ports are hashed into. | `verify-app/references/cloud-environment.md`, `verify-app/references/worktree-isolation.md` |
| `{{WORKTREE_PROFILE_DIR}}` | Per-worktree isolated profile directory. | `verify-app/references/worktree-isolation.md` |
| `{{PROFILE_SEED_COMMAND}}` | Command that seeds a signed-in profile from your secret store (cloud VMs). | `verify-app/references/cloud-environment.md` |
| `{{ARTIFACT_STORE}}` | Where artifacts are uploaded so reviewers can open them (CI artifacts, object storage, PR attachments). | `automation/bug-repro.md`, `verify-app/references/cloud-environment.md` |
| `{{CLOUD_MANUAL_PATHS}}` | Extra paths that must be marked manual in your cloud VM. | `verify-app/references/cloud-environment.md` |

### Feature map (`references/features/`)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{AREA_1}}` | Heading of the first group of index lines. `AREA_2` is the second; add more as needed. | `features/README.md` |
| `{{AREA_2}}` | Heading of the second group of index lines. | `features/README.md` |
| `{{DOCTOR_COMMAND}}` | Health command whose green result is a baseline precondition. | `features/README.md` |
| `{{TEST_ACCOUNT}}` | Account the baseline signs in as. | `verify-app/references/cloud-environment.md`, `features/README.md` |
| `{{REQUIRED_ENTITLEMENT}}` | What that account must have access to. | `features/README.md` |
| `{{AUTH_AUTOMATION}}` | How sign-in is automated (for example seed a prepared profile). | `features/README.md` |
| `{{FRESH_MACHINE_LOGIN}}` | How to sign in on a machine with no prepared profile. | `features/README.md` |
| `{{STARTING_STATE}}` | State the app must be in before any feature is driven. | `features/README.md` |
| `{{DEFAULT_VIEW_SETTINGS}}` | Default view settings assumed by feature files. | `features/README.md` |
| `{{SEMANTIC_ATTRIBUTES}}` | The semantic data attributes your app uses (for example `data-component`, `data-action-id`). | `features/README.md` |
| `{{MODIFIER}}` | Platform modifier key in the example chord. | `features/README.md` |
| `{{FEATURE_FLAG_COMMAND}}` | Command to enable the one feature flag a gated feature file names. | `features/README.md` |
| `{{CONSOLE_COMMAND}}` | Command that streams the console while you drive a flow. | `features/README.md` |
| `{{MANUAL_ONLY_PATHS}}` | Paths no tooling can drive (OS drops, native menus, auth dialogs). | `features/README.md` |
| `{{SWEEP_ORDER}}` | Order of areas for a full sweep. | `features/README.md` |
| `{{DRIVER}}` | Driver used in a feature file's Driving it section (Playwright over CDP, a simulator CLI, a shell). | `features/README.md`, `features/_feature.template.md`, `features/cross-cutting-flows.md` |
| `{{KEY}}` | Key letter of a chord in a feature file. | `features/_feature.template.md` |
| `{{FLAG_NAME}}` | Feature flag that gates a sub-feature. | `features/_feature.template.md` |

### Skills library (catalog, team-mode, investigate, challenge skill, failure worksheet)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{PREFIX}}` | Area or owner prefix of a skill name (`client`, `infra`, an owner). | `CATALOG.md` |
| `{{OWNERS_FILE}}` | File that names the owner of each prefix. | `CATALOG.md` |
| `{{MIGRATION_EXAMPLE}}` | An example migration skill name for your stack. | `CATALOG.md` |
| `{{ADD_YOUR_PRINCIPLES}}` | Marker line in `team-mode`: replace with one link per principle file you created. | `team-mode/SKILL.md` |
| `{{DESIGN_SKILL}}` | Name of your design or planning skill, in the `team-mode` trigger table. | `team-mode/SKILL.md` |
| `{{YOUR_TRIGGER}}` | A situation you add to the `team-mode` trigger table. | `team-mode/SKILL.md` |
| `{{YOUR_LEAF}}` | The skill that handles that situation. | `team-mode/SKILL.md` |
| `{{REPRO_SKILL}}` | Skill that runs the real app to reproduce (`verify-app`), in `investigate`. | `investigate/SKILL.md` |
| `{{SUBAGENT_LIMIT}}` | Most read-only subagents `investigate` runs at once. | `investigate/SKILL.md` |
| `{{API}}` | The risky API or pattern, in the challenge skill. | `are-you-sure-you-need-x/SKILL.md` |
| `{{RISKY_LIST}}` | Short list of risky APIs, shown in the challenge skill's description. | `are-you-sure-you-need-x/SKILL.md` |
| `{{WHY_RISKY}}` | Why the API is risky in this repo. | `are-you-sure-you-need-x/SKILL.md` |
| `{{ALTERNATIVES}}` | The safer alternatives to try first. | `are-you-sure-you-need-x/SKILL.md` |
| `{{EVIDENCE_REQUIRED}}` | Form the evidence takes in this repo. | `are-you-sure-you-need-x/SKILL.md` |
| `{{DATA_FETCHING_APPROACH}}` | Your project's data-fetching primitive (also used in AGENTS.md). | `guardrails/AGENTS.md.template`, `are-you-sure-you-need-x/SKILL.md` |
| `{{WHAT_TO_MEASURE}}` | What a before and after measurement must cover. | `are-you-sure-you-need-x/SKILL.md` |
| `{{SHORT_NAME}}` | Short name of an observed failure, in the failure record. | `_skill-from-failure.md` |

### Guardrails (AGENTS.md, architecture contract, enforcement layers, review-comment-to-rule)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{ARCHITECTURE_CONTRACT_PATH}}` | Where you keep your copy of the architecture contract. | `guardrails/AGENTS.md.template` |
| `{{PROCESS_A_DIR}}` | Directory of the first process or layer (for example the main process). | `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md` |
| `{{PROCESS_A_ROLE}}` | What it is for. | `guardrails/AGENTS.md.template` |
| `{{PROCESS_B_DIR}}` | Directory of the second process or layer (for example the renderer). | `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md` |
| `{{PROCESS_B_ROLE}}` | What it is for. | `guardrails/AGENTS.md.template` |
| `{{IPC_DIR}}` | Directory of the typed contract between the two. | `guardrails/AGENTS.md.template` |
| `{{ADD_FEATURE_STEPS}}` | Steps to add a feature. | `guardrails/AGENTS.md.template` |
| `{{ADD_ENTRY_POINT_STEPS}}` | Steps to add an entry point (route, command, menu item, shortcut). | `guardrails/AGENTS.md.template` |
| `{{ADD_CARD_STEPS}}` | Steps to add the repeated noun of your app (card, widget, plugin). | `guardrails/AGENTS.md.template` |
| `{{NAMING_CONVENTIONS}}` | Naming conventions, in prose. | `guardrails/AGENTS.md.template` |
| `{{SUBSCRIBE_HELPER}}` | Approved helper for external subscriptions. | `guardrails/AGENTS.md.template` |
| `{{NO_USE_EFFECT_RULE}}` | Name of the lint rule that bans the pattern. | `guardrails/AGENTS.md.template` |
| `{{ALLOWED_COMMENT_KINDS}}` | The few comment kinds that are allowed. | `guardrails/AGENTS.md.template` |
| `{{NO_NARRATING_COMMENTS_CHECK}}` | The lint rule or script that flags history-narrating comments. | `guardrails/AGENTS.md.template`, `guardrails/review-comment-to-rule.md` |
| `{{IMPORT_BOUNDARY_CHECK}}` | The dependency-graph check that enforces boundaries. | `guardrails/AGENTS.md.template`, `guardrails/enforcement-layers.md` |
| `{{FEATURE_MAP_CHECK}}` | The feature-map check (`check-feature-map.sh`) as wired in your gate. | `guardrails/AGENTS.md.template`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md` |
| `{{APPROVED_EFFECT_WRAPPER}}` | The sanctioned wrapper for the rare legitimate use of a banned API. | `guardrails/review-comment-to-rule.md` |
| `{{BANNED_PATTERN_4}}` | A banned pattern you add. Also `BANNED_PATTERN_5`. | `guardrails/AGENTS.md.template` |
| `{{BANNED_PATTERN_5}}` | A second banned pattern you add. | `guardrails/AGENTS.md.template` |
| `{{WHY_4}}` | Why pattern 4 is banned. | `guardrails/AGENTS.md.template` |
| `{{WHY_5}}` | Why pattern 5 is banned. | `guardrails/AGENTS.md.template` |
| `{{INSTEAD_4}}` | What to do instead of pattern 4. | `guardrails/AGENTS.md.template` |
| `{{INSTEAD_5}}` | What to do instead of pattern 5. | `guardrails/AGENTS.md.template` |
| `{{ENFORCED_BY_4}}` | What enforces the ban on pattern 4. | `guardrails/AGENTS.md.template` |
| `{{KNOWN_ESCAPE_1}}` | A shape your rules are known not to catch, and what covers it. Add a line per escape. | `guardrails/AGENTS.md.template` |
| `{{ENFORCED_BY_5}}` | What enforces the ban on pattern 5. | `guardrails/AGENTS.md.template` |
| `{{PR_TITLE_FORMAT}}` | Your PR title convention. | `guardrails/AGENTS.md.template` |
| `{{ARTIFACT_POLICY}}` | When generated artifacts may be committed. | `guardrails/AGENTS.md.template` |
| `{{AUTOMERGE_POLICY}}` | Condition under which an agent may merge (link to `automation/automerge-policy.md`). | `guardrails/AGENTS.md.template` |
| `{{AI_REVIEW_TOOL}}` | Your automated code review tool. | `automation/automerge-policy.md`, `guardrails/AGENTS.md.template`, `guardrails/enforcement-layers.md` |
| `{{FRAMEWORK_DIR}}` | Directory of the framework package. | `guardrails/architecture-contract.md` |
| `{{APP_DIR}}` | Directory of the application package. | `guardrails/architecture-contract.md` |
| `{{CLIENT_DIR}}` | Directory of the durable state (the one writer). | `guardrails/architecture-contract.md` |
| `{{HOST_DIR}}` | Directory of the typed host contract (OS, filesystem, network). | `guardrails/architecture-contract.md` |
| `{{ENTRYPOINT_FILE}}` | Reserved file name by which entry points are discovered. | `guardrails/AGENTS.md.template`, `guardrails/architecture-contract.md` |
| `{{CARD_FILE}}` | Reserved file name for the repeated noun. | `guardrails/architecture-contract.md` |
| `{{REPEATED_NOUN}}` | The repeated element of your product. | `guardrails/architecture-contract.md` |
| `{{SCAFFOLD_COMMAND}}` | Command that scaffolds a feature. | `guardrails/architecture-contract.md` |
| `{{ENFORCEMENT_1}}` | How you enforce architecture rule 1. `ENFORCEMENT_2` to `ENFORCEMENT_5` do the same for rules 2 to 5. | `guardrails/architecture-contract.md` |
| `{{ENFORCEMENT_2}}` | How you enforce rule 2. | `guardrails/architecture-contract.md` |
| `{{ENFORCEMENT_3}}` | How you enforce rule 3. | `guardrails/architecture-contract.md` |
| `{{ENFORCEMENT_4}}` | How you enforce rule 4. | `guardrails/architecture-contract.md` |
| `{{ENFORCEMENT_5}}` | How you enforce rule 5. | `guardrails/architecture-contract.md` |
| `{{CHECK}}` | The check that enforces a row (in tables). | `guardrails/architecture-contract.md`, `guardrails/review-comment-to-rule.md` |
| `{{COVERAGE_1}}` | Current coverage of enforcement layer 1. `COVERAGE_2` to `COVERAGE_5` are layers 2 to 5. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_2}}` | Layer 2 coverage. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_3}}` | Layer 3 coverage. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_4}}` | Layer 4 coverage. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_5}}` | Layer 5 coverage. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_T}}` | Coverage of the optional Tests row. | `guardrails/enforcement-layers.md` |
| `{{COVERAGE_H}}` | Coverage of the optional Human review row. | `guardrails/enforcement-layers.md` |
| `{{GAP_1}}` | Gap or next step for layer 1. `GAP_2` to `GAP_5` are layers 2 to 5. | `guardrails/enforcement-layers.md` |
| `{{GAP_2}}` | Layer 2 gap. | `guardrails/enforcement-layers.md` |
| `{{GAP_3}}` | Layer 3 gap. | `guardrails/enforcement-layers.md` |
| `{{GAP_4}}` | Layer 4 gap. | `guardrails/enforcement-layers.md` |
| `{{GAP_5}}` | Layer 5 gap. | `guardrails/enforcement-layers.md` |
| `{{GAP_T}}` | Gap for the Tests row. | `guardrails/enforcement-layers.md` |
| `{{GAP_H}}` | Gap for the Human review row. | `guardrails/enforcement-layers.md` |
| `{{STYLE_GUIDE_PATH}}` | Where your style guide lives. | `guardrails/enforcement-layers.md` |
| `{{INVARIANT}}` | An invariant, in one sentence (per-invariant table and promoted-rules table). | `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md` |
| `{{LAYERS}}` | Enforcement layer numbers that cover an invariant. | `guardrails/enforcement-layers.md` |
| `{{YES_NO}}` | Yes or no. | `guardrails/enforcement-layers.md` |
| `{{PLAN}}` | Plan to add a hard layer. | `guardrails/enforcement-layers.md` |
| `{{COMMENT}}` | Verbatim review comment (promoted-rules table). | `guardrails/review-comment-to-rule.md` |
| `{{COUNT}}` | Number of existing violations fixed. | `guardrails/review-comment-to-rule.md` |

### Evals

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{SKILL_NAME}}` | Name of the skill under evaluation. | `evals/EVAL_PLAYBOOK.md`, `evals/judge-prompt.md`, `evals/rubric.template.md`, `evals/scoreboard.template.md` |
| `{{SKILL_PATH}}` | Path of that skill. | `evals/EVAL_PLAYBOOK.md` |
| `{{MODELS}}` | Models under test. | `evals/EVAL_PLAYBOOK.md` |
| `{{JUDGE_MODEL}}` | Judge model (different from the model under test). | `evals/EVAL_PLAYBOOK.md`, `evals/scoreboard.template.md` |
| `{{TARGET}}` | The score target that ends the loop. | `evals/EVAL_PLAYBOOK.md`, `evals/scoreboard.template.md` |
| `{{K}}` | Number of no-gain iterations before stopping. | `evals/EVAL_PLAYBOOK.md`, `evals/scoreboard.template.md` |
| `{{CONCURRENCY}}` | Most workers to run at once (2-4; memory runs out before CPU). | `evals/EVAL_PLAYBOOK.md` |
| `{{RUBRIC_PATH}}` | Rubric path given to the judge. | `evals/judge-prompt.md` |
| `{{RUN_FOLDER}}` | Folder of one run, given to the judge. | `evals/judge-prompt.md` |
| `{{TASK_NAME}}` | Neutral name of the task being judged. | `evals/judge-prompt.md` |
| `{{INTENT}}` | One-paragraph reason the skill exists, in the rubric. | `evals/rubric.template.md` |
| `{{COMMIT}}` | Skill version (git commit) in the scoreboard. | `evals/scoreboard.template.md` |
| `{{MODEL_A}}` | A model name in the scoreboard sample row. | `evals/scoreboard.template.md` |

### CI (`ci/ci.yml`)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{WORKING_DIR}}` | Directory that holds `package.json` (`.` for the repo root). | `ci/ci.yml` |
| `{{NODE_VERSION}}` | Node version of your runtime pin. | `ci/ci.yml` |
| `{{ARTIFACTS_PATH}}` | Path that is uploaded as verification artifacts when the gate fails. | `ci/ci.yml` |

### Automation (`goal-ticks.md`, `bug-repro.md`, `automerge-policy.md`)

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{PROGRAM_NAME}}` | Name of the program or migration the goal lands. | `automation/goal-ticks.md` |
| `{{BUDGET}}` | Spend limit that triggers immediate escalation. | `automation/goal-ticks.md` |
| `{{CADENCE}}` | Tick cadence. | `automation/goal-ticks.md` |
| `{{ESCALATION_CHANNEL}}` | Where escalations are posted. | `automation/bug-repro.md`, `automation/goal-ticks.md` |
| `{{POLICY_LINK}}` | Link to the policy that forbids automating a given approval. | `automation/goal-ticks.md` |
| `{{ISSUE_TRACKER}}` | Where bug reports arrive. | `automation/bug-repro.md` |
| `{{BUG_LABEL}}` | Label that marks a bug report. | `automation/bug-repro.md` |
| `{{BUG_CHANNEL}}` | Chat channel that receives reports, if any. | `automation/bug-repro.md` |
| `{{SECURITY_LABEL}}` | Label for security or privacy reports, which the automation never touches. | `automation/bug-repro.md` |
| `{{TRIAGE_OWNER}}` | Person or group that owns triage and is mentioned on escalation. | `automation/bug-repro.md` |
| `{{CONTROL_SKILL}}` | The control skill the automation uses (normally `verify-app`). | `automation/bug-repro.md` |
| `{{REPORT_LINK_OR_TEXT}}` | Filled at run time with the report being triaged. | `automation/bug-repro.md` |
| `{{MAX_RUN_MINUTES}}` | Wall-time budget of one repro run. | `automation/bug-repro.md` |
| `{{NEEDS_INFO_DAYS}}` | Days without a reply before NEEDS INFO escalates. | `automation/bug-repro.md` |
| `{{ESCALATION_EXTRA}}` | Extra escalation conditions of your own. | `automation/bug-repro.md` |
| `{{SAMPLE_RULE}}` | How much of the NOT REPRODUCED, FIXED ON MAIN and SETUP OR DATA verdicts a person re-checks. | `automation/bug-repro.md` |
| `{{CLASS_E}}` | A change class of your own in the auto-merge table. | `automation/automerge-policy.md` |
| `{{ATOMIC_LIMIT}}` | What an atomic PR may touch for auto-merge. | `automation/automerge-policy.md` |
| `{{ALLOWED_AUTHORS}}` | Authors or bots allowed to auto-merge. | `automation/automerge-policy.md` |
| `{{KILL_SWITCH}}` | The control that turns all auto-merge off. | `automation/automerge-policy.md` |
| `{{AUTOMERGE_CHECK}}` | The required check that computes eligibility. | `automation/automerge-policy.md` |
| `{{CI_PATHS}}` | Protected paths: CI workflows, the gate, gate scripts. | `automation/automerge-policy.md` |
| `{{LINT_CONFIG_PATHS}}` | Protected paths: lint, boundary and ignore configuration. | `automation/automerge-policy.md` |
| `{{AUTH_PATHS}}` | Protected paths: authentication, permissions, secrets. | `automation/automerge-policy.md` |
| `{{DATA_PATHS}}` | Protected paths: schema, migrations, anything that deletes or rewrites user data, moves money, or sends messages outside the system. | `automation/automerge-policy.md` |
| `{{DEPENDENCY_PATHS}}` | Protected paths: manifests and lockfiles. | `automation/automerge-policy.md` |
| `{{DEPLOY_PATHS}}` | Protected paths: infrastructure, release, deploy. | `automation/automerge-policy.md` |
| `{{UNVERIFIABLE_PATHS}}` | Protected paths: code whose result no program can check (for example medical, legal or financial output). | `automation/automerge-policy.md` |
| `{{MORE_PROTECTED_PATHS}}` | Further protected paths. | `automation/automerge-policy.md` |
| `{{REVERT_LIMIT}}` | Reverts of one class that switch that class off. | `automation/automerge-policy.md` |
| `{{REVERT_PERIOD}}` | Period over which reverts are counted. | `automation/automerge-policy.md` |
| `{{POST_MERGE_REVIEWER}}` | Who reviews auto-merged PRs afterwards. | `automation/automerge-policy.md` |
| `{{POST_MERGE_WINDOW}}` | How soon after the merge that review happens. | `automation/automerge-policy.md` |
| `{{LEDGER_LOCATION}}` | Where the auto-merge ledger is kept. | `automation/automerge-policy.md` |
| `{{PR}}` | A PR link (ledger row). | `automation/automerge-policy.md` |
| `{{WIDEN_CRITERION}}` | What the ledger must show before a class is widened. | `automation/automerge-policy.md` |
| `{{MAX_AUTO_RISK}}` | The highest risk rating that may auto-merge (default: low; medium only through the ledger). | `automation/automerge-policy.md` |
| `{{RISK_REVIEWER}}` | The agent review that rates every PR's risk. | `automation/automerge-policy.md` |
| `{{MORNING_READ_CRITERION}}` | What the ledger must show before post-merge review becomes a morning read of the commit history. | `automation/automerge-policy.md` |

### Generic words in HOW TO USE comments

| Placeholder | Meaning | Used in |
| --- | --- | --- |
| `{{PLACEHOLDER}}` | Generic mention of the `{{NAME}}` syntax; not a slot. | `automation/automerge-policy.md`, `ci/ci.yml`, `guardrails/AGENTS.md.template`, `verify-app/SKILL.md`, `features/README.md` |
| `{{PLACEHOLDERS}}` | Same; not a slot. | `automation/bug-repro.md`, `automation/goal-ticks.md`, `guardrails/architecture-contract.md`, `guardrails/enforcement-layers.md`, `guardrails/review-comment-to-rule.md`, `_skill-from-failure.md`, `verify-app/references/cloud-environment.md`, `features/cross-cutting-flows.md`, `verify-app/references/evidence-export.md`, `verify-app/references/test-account.md`, `verify-app/references/worktree-isolation.md` |

### Lower-case slots

Short lower-case `{{...}}` text is an id, a cell or a word to replace with your own value:

| Slot | Fill with | Used in |
| --- | --- | --- |
| `{{feature-id}}`, `{{feature-id-1}}`, `{{feature-id-2}}`, `{{feature-id-a}}`, `{{feature-id-b}}`, `{{feature-id-c}}` | A feature id: the directory name under `{{FEATURES_DIR}}`, also the name of its feature-map file. | `features/README.md`, `features/_feature.template.md`, `features/cross-cutting-flows.md` |
| `{{sub-feature}}`, `{{sub-feature-2}}`, `{{sub-feature-3}}` | A sub-feature id or the suffix of one (`<feature-id>-<sub-feature>`). | `features/_feature.template.md` |
| `{{flow-name}}` | The suffix of a cross-cutting flow id (`flow-<name>`). | `features/cross-cutting-flows.md` |
| `{{principle-name}}` | Name of a principle file (kebab-case verb phrase). | `team-mode/principles/_principle.template.md` |
| `{{root-component}}`, `{{action-id}}`, `{{command.id}}` | The root `data-component`, a `data-action-id`, or a command id of the feature you are describing. | `features/_feature.template.md` |
| `{{Display name}}`, `{{Button label}}`, `{{label}}`, `{{region}}`, `{{visible result}}` | Visible text, a button or ARIA label, a screen region, or what the user sees on arrival. | `features/_feature.template.md` |
| `{{launch}}`, `{{a fresh profile}}`, `{{restart the app}}`, `{{complete onboarding}}`, `{{reach the main screen}}`, `{{steps}}`, `{{one line}}` | Short step or sentence in a flow or feature file. | `features/_feature.template.md`, `features/cross-cutting-flows.md` |
| `{{x}}`, `{{app}}`, `{{name}}`, `{{prefix}}`, `{{path}}`, `{{kind}}`, `{{owner}}`, `{{area}}`, `{{status}}`, `{{list}}`, `{{ids}}`, `{{date}}`, `{{scores}}`, `{{another}}`, `{{scope}}`, `{{why}}`, `{{link}}`, `{{examples}}`, `{{extra conditions}}` | A cell or word in a table or record: a skill name, prefix, owner, area, status, list, date, scores, reason, link or condition. | `automation/automerge-policy.md`, `CATALOG.md`, `_skill-from-failure.md`, `team-mode/principles/_principle.template.md`, `features/README.md` |
| `{{yes / no}}`, `{{draft / active}}`, `{{ok / finding}}`, `{{low / medium}}`, `{{no / yes: link}}`, `{{A/B/C}}`, `{{1-6}}`, `{{risky API}}`, `{{your skill}}` | A choice to make in a table cell (yes or no, a status, a class, a rung number, an API, one of your own skills). | `automation/automerge-policy.md`, `guardrails/review-comment-to-rule.md`, `CATALOG.md` |
| `{{...}}` | Whatever the surrounding sentence asks for. | `evals/judge-prompt.md`, `CATALOG.md`, `_skill-from-failure.md`, `features/_feature.template.md` |
| `{{what shows with no data}}`, `{{what shows when it fails}}`, `{{what you changed and why}}`, `{{how to force a failure}}`, `{{switch, then come back}}`, `{{observable behavior}}`, `{{skill version / commit}}`, `{{task dir name (neutral!)}}`, `{{things learned the hard way}}` | A short hint sentence; replace it with your own text. | `evals/scoreboard.template.md`, `_skill-from-failure.md`, `features/_feature.template.md`, `features/cross-cutting-flows.md` |

Lower-case text longer than two dozen characters is a hint sentence: it says what to write there (for example `{{what is in; what is explicitly out}}`), and you replace the whole thing, braces included. These are in:

| File | Hint sentences |
| --- | --- |
| `automation/automerge-policy.md` | 2 |
| `automation/goal-ticks.md` | 8 |
| `_skill-from-failure.md` | 4 |
| `team-mode/principles/_principle.template.md` | 5 |
| `features/README.md` | 1 |
| `features/_feature.template.md` | 9 |
| `features/cross-cutting-flows.md` | 12 |

## Pick a template by the problem you have

| Problem | Use |
| --- | --- |
| The agent says "it should work" but never ran it | `verify-app` + require an evidence report in the PR (`AGENTS.md`) |
| Evidence covers only the most convenient way in | the "Proof and skip reporting" section in `references/features/README.md` + the proof completeness criterion |
| A bug report is only a screenshot and "???", and the agent flounders | `references/features/` (the "Mapping a vague report to a feature" section) |
| Several parallel agents trample each other's sessions | `references/worktree-isolation.md`, the `doctor` command |
| The run needs a login and credentials keep leaking or being reused | `references/test-account.md` |
| Lint or build noise makes the verdict meaningless, or someone has to retype the report by hand | "Gates and the verdict" and "The `report.md` is this block" in `skills/verify-app/SKILL.md`; `references/evidence-export.md` for a PDF |
| The agent asserts a cause without reading the code | `investigate` |
| The agent asks a human questions that running it would answer | `team-mode` ("asking a human is the slow path") |
| The agent reaches for a risky API on its own | `are-you-sure-you-need-x` (and lint if it can be banned) |
| The feature map gradually goes stale | `maintain-verification` and the CI scripts (`ci/check-feature-map.sh` checks structure only, not selectors; `ci/check-coverage.mjs` checks the manifest it is given) |
| You can't tell whether a skill change made it better | `evals/` |
| Reviewers keep repeating the same rule | `review-comment-to-rule.md` |
| It is unclear which enforcement layer is missing | `enforcement-layers.md` |
| The agent takes a shortcut that breaks an architectural invariant | `architecture-contract.md` |
| A long-horizon goal needs the coordinator agent to report on itself | `automation/goal-ticks.md` |
| Bug reports wait for a human just to be tried | `automation/bug-repro.md` |
| You are deciding what an agent may merge without a human | `automation/automerge-policy.md` |
| The agent must verify in a cloud VM, not on your machine | `skills/verify-app/references/cloud-environment.md` |

## Quick check after adopting

- No unfilled placeholders remain (after deleting the `HOW TO USE` blocks): `grep -rn "{{" .agents/skills AGENTS.md ci scripts .github`. Skill bodies must not contain a `{{` once installed.
- Each skill folder name equals the `name` in its frontmatter, and no skill sits in a nested folder: `find .agents/skills -name SKILL.md` shows only `.agents/skills/<name>/SKILL.md`. `ls -l .claude/skills` shows the symlink.
- The gate command runs green on a clean branch, and goes red when you deliberately break a banned rule (a ban that has never gone red is unproven). For the feature map script: try deleting an `<id>.md` file or a catalog line and watch it go red. For the coverage script: add a sub-feature bullet with no scenario and no `skip`, and watch it go red.
- The agent can run `verify-app` from a cold start for 2-3 features, run `doctor` first, walk every entry point the feature file lists, and produce a report with artifact paths.
- Every directory in `src/features/*` has a file in `references/features/` and a line in the catalog.
