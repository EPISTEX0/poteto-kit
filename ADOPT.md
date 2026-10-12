# ADOPT: adopt poteto-kit into this repo

This file is for you, the coding agent (Claude Code, Cursor, Codex). A developer asked you to adopt **poteto-kit** into their repo. Do it incrementally: one phase at a time, a visible win at the end of each, the developer in the loop. Paths starting with `templates/`, `docs/` or `example/` are in the kit; everything else is in the developer's repo.

## Ground rules

1. **One phase at a time.** Never install the whole kit. Install only what the current phase names.
2. **Every phase ends with proof and a pause.** Proof is a command with its output, or an evidence report. Then send the phase report (format at the end) and ask whether to continue. Do not start the next phase before the answer.
3. **Work on a new branch** (for example `git switch -c poteto-adoption`). If you are already on an adoption branch, continue on it and record that in the log. Leave existing uncommitted work as you found it.
4. **Never commit, push or open a PR without asking.** Stage files by name, never `git add -A` or `git add .`.
5. **Fill placeholders by reading the repo** (package files, CI config, README, scripts). Ask only what cannot be found: test accounts, secrets, which app to target.
6. **Never write secrets into files**, logs or reports. Write the name of the env var or the secret store instead. If existing scripts hard-code credentials, tell the developer and never copy them. Ask before creating an account on a shared environment.
7. **Do not overwrite existing agent files** (`AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.claude/`, existing skills). Add beside them or append, and log every edit to an existing file.
8. **Keep the resumable log at `.agents/poteto-adoption.md`.** Create it in Phase 1 and update it at the end of every phase. A later session must be able to continue from it alone. Skeleton:

```
# poteto-kit adoption log
Kit: https://github.com/EPISTEX0/poteto-kit @ <commit from step 0>   Branch: <name>   Tool: <Claude Code|Cursor|Codex>
## Repo facts       (Phase 1: stack, commands, how the app is reached, CI gate, existing agent files)
## Decisions        (pain, target app, constraints such as "no CI changes", approvals given, the gate command used)
## Installed        (one line per path: created or edited, and what for; also what lives outside the repo: config files, worktrees, test accounts by email only, each with how to remove it)
## Evidence         (phase, command or report path, result; lint and test baseline before and after)
## Rules promoted   (Phase 3: the review comment, the check, the fixture path, violations fixed)
## Phase status     (1 diagnose: done | 2 verification: in progress | ...)
## Unknowns         (placeholders or facts still missing, who must answer)
## Next step
```

If `.agents/poteto-adoption.md` already exists, you are resuming: read it, re-check what can have changed (branch, `git status`, whether the installed paths still exist), then continue at "Next step". Do not redo finished phases.

## Step 0: Get the kit

```sh
git clone --depth 1 https://github.com/EPISTEX0/poteto-kit /tmp/poteto-kit
git -C /tmp/poteto-kit rev-parse HEAD   # record in the log
```

If git or the network clone fails, read single files from `https://raw.githubusercontent.com/EPISTEX0/poteto-kit/main/<path>` (for example `.../main/templates/skills/verify-app/SKILL.md`). The clone is read-only source material: copy from it, never edit it. Keep it until the whole adoption is finished: after a pause a later session needs it, so clone it again if it is missing.

Read only these sections, once, before Phase 2: in `templates/README.md`, under `## Placeholders`, the subsections `### Project and commands (used across several templates)`, `### verify-app skill` and ``### Feature map (`references/features/`)``. Read `README.md` `## Adoption path by trust stage` only at Phase 5. Open other sections only when a phase names them.

## Phase 1: Diagnose (about 5 min)

1. Inspect the repo and write the facts into the log: language, framework, app type (web, Electron, iOS, Android, Flutter or React Native, backend API, CLI), install and dev commands, how the app is reached (URL, port, binary), test and lint commands, CI system and its gate, package manager and runtime pin, monorepo layout (workspaces, apps), whether agents or people run several checkouts in parallel (`git worktree list`, the README), and existing agent files (`AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.agents/`, `.claude/`). Look for how the developer verifies today: per-ticket browser or API scripts, report or PDF builders, an evidence folder, a report convention (`package.json` scripts, `git ls-files | grep -iE 'verif|evidence|e2e|report'`). Measure the baseline before adding any code: run lint and the tests once and log the counts (a noisy baseline is normal). Also note which tool you are running in (infer it, ask only if unclear); it goes into the log header and decides the `.claude/skills` symlink.
2. Ask the developer at most 3 questions, in one message:
   - What is the biggest pain with coding agents in this repo today, and how do you verify a change now (show me one example)?
   - Which app or surface should come first (only if the repo has several)?
   - Any constraints, for example "no CI changes yet" or "no new dependencies"? (Add "do agents or people run several checkouts in parallel?" here if you could not infer it.)
3. Map the pain to the first slice:

| Pain | First slice |
|---|---|
| The agent claims done, but it is broken | `verify-app` (Phase 2) |
| The agent flails on vague bug reports | `verify-app` + feature map (Phases 2 and 4) |
| The agent guesses root causes | `investigate`, after `verify-app` (Phase 5) |
| The same review comment, again and again | `review-comment-to-rule` (Phase 3) |
| The codebase drifts from its design | architecture contract (Phase 5) |
| Agents cannot run in parallel | worktree isolation, `templates/skills/verify-app/references/worktree-isolation.md` (Phase 2) |
| Skill edits regress silently | evals (Phase 5) |

4. Present a plan for Phases 2 and 3 with the files you will add and an estimate of the time each takes (an estimate, not a promise). **Wait for approval.** Verification usually goes first, because every later phase needs proof; say so if you pick a different order.

**Proof of Phase 1:** the filled log (Repo facts, Decisions) plus the approved plan. Nothing needs to run except the baseline measurement.

## Phase 2: First win, verification (usually first)

1. Install exactly this, flat (`.agents/skills/<name>/SKILL.md`, no grouping folders), and nothing else:

```sh
K=/tmp/poteto-kit/templates/skills; D=.agents/skills; F=verify-app/references/features
mkdir -p $D/$F
cp -R $K/create-verification $K/maintain-verification $D/
cp $K/verify-app/SKILL.md $D/verify-app/
cp $K/$F/README.md $K/$F/_feature.template.md $D/$F/
```

   Into `$D/verify-app/references/` also copy `worktree-isolation.md` if Phase 1 found parallel checkouts (it covers `--target`) and `test-account.md` if the app has a login. `evidence-export.md` only if the developer wants a PDF or other readable export. Not installed now: `references/cloud-environment.md` (Phase 5), `check-feature-map.sh` and `check-coverage.mjs` (Phase 4). `_feature.template.md` stays installed: both skills tell you to copy from it, and it is the one file allowed to keep `{{` (see the checks below). `cross-cutting-flows.md` is a pure template, so a copy would hide real unfilled placeholders, yet the skills point at it: create a stub instead, `references/features/cross-cutting-flows.md` with a `# Cross-cutting flows` heading, the line "No journeys mapped yet." and an empty `## Flows` heading. Cursor and Codex read `.agents/skills` directly. For Claude Code add the symlink, unless `.claude/skills` already exists (then ask):

```sh
mkdir -p .claude && ln -s ../.agents/skills .claude/skills
```

2. Pick the driver for the stack from `docs/09-other-stacks.md` (verify driver table). Prefer what the repo already depends on.
3. Build on what exists: if Phase 1 found the developer's own verification, port its helpers (login, navigation, selectors), keep its report format and language, and replace the hand-typed numbers with data the CLI measures; do not impose the kit's format on them (their format becomes the optional export in `references/evidence-export.md`). Then build the smallest control CLI that can launch or attach to the real app, drive it, assert, and capture evidence. Reference implementation: `example/scripts/verify/` (`cli.ts`, `doctor.ts`, `port.ts`, `report.ts`, `selftest.ts`). Adapt it, do not copy it blindly: it is TypeScript run with `tsx` and npm, and drives headless Chromium over CDP against a Vite preview. Hazards: package managers may block dependency build scripts (`pnpm add -D tsx` on pnpm 12 fails with ERR_PNPM_IGNORED_BUILDS for esbuild; `pnpm approve-builds` or no tsx); Node runs `.ts` itself without tsx from 22.18 / 23.6, but only erasable syntax, with `.ts` in relative imports and no `paths` aliases (the example's imports are extensionless, so it needs edits); look for an installed browser before downloading one; the `ss` and `/proc` port-owner logic is Linux only. Put the CLI in `scripts/verify/` like the example, not in the skill folder: `.agents/skills/` stays markdown, so it can be re-copied from the kit. Anatomy: `docs/02-verification.md` and the CLI section of `templates/skills/verify-app/SKILL.md`. Contract:
   - `<cli> --help` lists every command, flag and exit code.
   - `<cli> doctor`: read-only; instance and port owner, build fresh or stale, tools present, test data or login available. Exit 0 healthy, 1 not ready.
   - `<cli> --feature <id> [--scenario <name>]` and `--all` run scenarios: build or launch, wait for ready, drive, assert the **expected behaviour**, write artifacts, stop what it started. An app that stays up between commands (desktop, simulator, stateful server) may split this into `start`, `stop`, `run <scenario>` and an ad hoc `drive`.
   - Verdict and exit code come only from scenario assertions. Build, lint and typecheck run as gates beside the verdict; lint is judged as a delta against the merge-base with the main branch, so a lint backlog does not fail the run ("Gates and the verdict" in `templates/skills/verify-app/SKILL.md`).
   - Artifacts: one directory per run, `artifacts/<timestamp>/<feature>-<scenario>/` with report, screenshot and console log; `report.json` is the source of truth and `report.md` is exactly the evidence-report block, to paste, not to rebuild; git-ignored, never overwritten. Capture a trace only on failure or on request: the example always does, about 2 MB per scenario even for its tiny app.
   - Exit codes: 0 all passed, 1 an assertion or step failed, 2 usage error, 3 refused to start (these are the example's). Refuse instead of falling back: from a git worktree, no `--worktree`, `--target <checkout>` or explicit endpoint means fail with the fix named (the example derives the port from the project path and refuses when it is held). Add `--target` when checkouts must be verified from one CLI; the example does not have it. Add a `smoke` feature (the first screen loads) to tell a broken harness from bad credentials, and an allowlist of known console noise, each entry with a reason and a scenario scope; anything else is a finding. With a login, add `account create` (`references/test-account.md`).
   - Its own tests: refusal, port derivation, doctor output and usage errors (model: `example/scripts/guardrails.test.ts`), plus a self-test that plants a bug and expects red (`example/scripts/verify/selftest.ts`). Plant it in a throwaway copy of the app (for example a `--root <dir>` flag pointing at a temp copy), never by editing app code or shipping an env-flag bug hook. The example's `INJECT_BUG=1` (a build-time `__INJECT_BUG__` branch in `src/features/editor/commit-title.ts`) is a demo convenience, not a pattern.

   The repo's tooling now meets this code. Go through this list (skip what the repo lacks) and log each change as an edit to an existing file:
   - lint: ignore the artifacts directory, include the CLI and its tests; the new files must add 0 problems: lint them against the Phase 1 baseline and report the counts before and after;
   - tsconfig: include them and add the compiler options they need; Node types in the shared tsconfig loosen the app's type checking, so give the CLI its own tsconfig;
   - test runner: include the CLI's tests;
   - `.gitignore`: the artifacts directory;
   - `package.json`: devDependencies and scripts.
4. Fill the placeholders from the repo (names are in `templates/README.md`). For `{{GATE_COMMAND}}` with no single gate command in the repo, use the literal chain its CI runs and note it in Decisions. Delete every `HOW TO USE` block (HTML comments: `find .agents/skills -name '*.md' -exec perl -0pi -e 's/<!-- HOW TO USE:.*?-->\n*//gs' {} +`) and the rows and recipes for app types that do not apply. With no login and no shared human instance, delete the sign-in and one-session bullets in `features/README.md` (TEST_ACCOUNT, REQUIRED_ENTITLEMENT, AUTH_AUTOMATION, FRESH_MACHINE_LOGIN), the Credentials bullet and "signed in" in the Environment check and `doctor` bullets of `verify-app/SKILL.md`, rewrite its "Pick a flow" step 2 (DEFAULT_PORT, DEFAULT_PROFILE_DIR) and name in step 3 the selector your CLI really has (`--worktree` or `--target`), and write `none` for TEST_DATA_OR_LOGIN, FEATURE_FLAG_COMMAND and MANUAL_ONLY_PATHS. If you did not install `worktree-isolation.md`, the short rule is already inline in `verify-app/SKILL.md` "Pick a flow" step 4 (refuse when ambiguous): keep it and drop the pointers to the file. Then draft the feature file for what you will prove in step 5: copy `_feature.template.md` to `references/features/<feature-id>.md`, fill it from what you know, and leave only that file's line in the `README.md` index. Feature files describe the intended behaviour: no open issues, no suspected causes, or the vague-report test (Phase 4) is leaked the answer.
5. **Prove it** on something real: one recent bug, a fresh issue, or a key user flow. Reproduce or verify it end to end with the CLI: `doctor`, launch, drive, capture. Hand over the CLI's `report.md`, which is the exact format of `templates/skills/verify-app/SKILL.md` ("Evidence report format", with its verdict rules), including a BLOCKED or NOT REPRODUCED verdict if that is what happened. Show the report and artifact paths. A proof that could not have failed is not a proof: assert on something visible. If the feature to prove is not on the checked-out branch, prove it on a fresh detached worktree of the branch or commit that has it, outside the repo, with `--target`; do not repair or prune the developer's existing worktrees, and log the new one with its removal command.
6. Update the feature file with every gotcha the run taught you (selectors that failed, waits, state to seed). Then run again following only the file, from a cold app start, as a fresh subagent or session given only the skill files and the report (not your notes). If it had to improvise, the file is not done.
7. Check the install. Both commands must come out clean:

```sh
grep -rn "{{" .agents/skills --exclude=_feature.template.md
```

   Empty, or only unknowns listed in the log with who must answer (test accounts, secrets); never invent a value. Do not exclude anything else: the exclusion is what keeps this check meaningful.

```sh
for f in $(find .agents/skills -name '*.md'); do d=$(dirname "$f"); s=$(echo "$f" | cut -d/ -f1-3)
  sed -E 's#\[[^]]*\]\(https?://[^)]*\)##g; s#https?://[^][ )>`"]*##g' "$f" | grep -oE '[A-Za-z0-9_./-]+\.(md|mjs|sh|yml)' | sort -u | while read -r p; do
    case ${p##*/} in _feature.template.md|report.md) continue;; esac   # installed on purpose; written by the CLI
    case $p in */*) ;; *) [ -n "$(find .agents/skills -name "$p" -print -quit)" ] && continue;; esac
    for b in "$d" "$s" .agents/skills .agents .; do [ -e "$b/$p" ] && continue 2; done
    echo "$f -> $p"
  done
  grep -v poteto-kit "$f" | grep -oE '`[a-z][a-z0-9-]+` skill|skill `[a-z][a-z0-9-]+`' | tr -d '`' | sed 's/ skill//;s/skill //' | sort -u | while read -r n; do
    [ -f ".agents/skills/$n/SKILL.md" ] || echo "$f -> skill $n"
  done
done
```

   This lists every pointer to a file or skill that is not installed (links with an absolute URL are skipped, text and target; the skills point at kit files such as `check-coverage.mjs`, `guardrails/enforcement-layers.md`, `evals/EVAL_PLAYBOOK.md`, `_skill-from-failure.md` and the `investigate` skill). Rewrite each to `https://github.com/EPISTEX0/poteto-kit/blob/main/<path>` (`find /tmp/poteto-kit -name <name>` gives the path) or delete the line, then run it again until it is empty. A hit on `AGENTS.md` means rewrite it to the instructions file the repo really has.
8. Optional, ask first: add one line to `AGENTS.md` (or `CLAUDE.md`) saying that any claim that something works must come with a `verify-app` evidence report.

**Exit criterion:** the developer saw the agent run the real app and bring evidence, without copy-pasting a screenshot or an error back. If they did not, say so in the report and do not call the phase done.

## Phase 3: One hard rule

1. Find the review comment this team repeats most. Ask the developer; or mine history: `git log --format=%s -n 300` (commits like "address review", "fix lint"), and, only if `git remote -v` shows a GitHub remote and `gh` is authenticated (otherwise skip it), `gh api --paginate "repos/{owner}/{repo}/pulls/comments?per_page=100" --jq '.[].body'`. Group the comments yourself, show up to 3 that exist, and let the developer choose.
2. Turn it into the hardest feasible check, following the ladder in `templates/guardrails/review-comment-to-rule.md`: eliminate the class by types or architecture, the compiler, a lint rule, a CI script, a test, and only last a prompt rule. Tools by stack are in `docs/09-other-stacks.md`. The message of the check must name the supported alternative.
3. Add a violating fixture, outside the paths your normal lint and tests scan (the model is `example/guardrail-fixtures/`, tested in `example/scripts/guardrails.test.ts`). Show it **red**: run the check on the fixture, with its failing output. Fix or list the existing violations, then show it **green**: run the check on the repo, with its passing output. A light proof is enough for a lint rule: lint the fixture through stdin or an explicit path (ESLint: `npx eslint --stdin --stdin-filename <path> < <fixture>`) for red, lint the repo for green, and add a small test that repeats the red run. Close the cheapest bypass by forbidding inline disable comments (rung 3 of the ladder file), claim only what a fixture proves, and write the shapes the rule does not catch into the "Not enforced" list of `AGENTS.md`.
   If fixing existing violations changes persisted data or user-visible behaviour, do not push it through quietly: flag it under "Decision needed" with the measured effect (how many records, files or screens, before and after). While the developer decides, keep the rule on and park the violations: a named exemption list in the lint config, a ratchet test that fails if the list grows, and the decision recorded in the log. `noInlineConfig` makes ESLint ignore the repo's existing inline disables, so count them first (`grep -rn "eslint-disable" src`) and treat each as a violation to fix or list.
4. Wire the check into the existing lint or CI gate only if the developer allowed CI changes. Otherwise leave it runnable with one command and write the command in the report.
5. Log the rule under "Rules promoted": the comment, the check, the fixture path, how many existing violations were fixed.

**Exit criterion:** the check fails on its fixture and passes on the repo (or its existing violations are fixed, or parked in a named list with the decision recorded), and the developer has the one command that runs it. If the fixture was never red, the rule is not done.

## Phase 4: Map the top features

1. Ask the developer for the 3 features that matter most (or propose them from the routes and README and get a yes). Write one file per feature in `.agents/skills/verify-app/references/features/<feature-id>.md` from the installed `_feature.template.md`, plus its index line in that directory's `README.md` (exact form ``- [`<id>`](<id>.md) — scope``). Rules and proof conventions: `docs/03-feature-map.md`.
2. Write from the user's point of view: visible text and entry points first. If a journey spans features, replace the stub `cross-cutting-flows.md` with a filled copy of `templates/skills/verify-app/references/features/cross-cutting-flows.md`, real flows only. Then verify each map by following only the file from a cold app start, and show one report per feature.
3. Check the vague-report test: take a bug report that is only a screenshot or a one-line complaint and show a fresh subagent or session, given only the skill files and that report, finding the right feature file and reproducing.
4. `templates/ci/check-feature-map.sh` is a two-way check: it fails for every directory under the features dir that has no map file. Install it to `scripts/check-feature-map.sh` only if the repo has one directory per feature, and wire it into CI only if CI changes are allowed and every feature directory is mapped (with a partial map, run it locally and record the gaps in the log). The optional `templates/ci/check-coverage.mjs` needs a scenarios manifest, which the verify command should write from the run (a hand-kept list is only a claim); offer it, do not push it. For each script you install, point the matching URLs in the skills back to the local path.

**Exit criterion:** three feature files with index lines exist, each was followed from a cold app start with a report to show for it, and the vague-report test found the right file. A script installed in item 4 passes on the repo, or its gaps are in the log.

## Phase 5: Menu for later

Do not install these now. Present them, keyed to the trust stages in `README.md` ("Adoption path by trust stage"), and let the developer pick. Each one is installed the same way: one slice, proof, pause.

| Option | Worth it when | Stage |
|---|---|---|
| `templates/skills/investigate/SKILL.md` | The agent states root causes it has not proven. It needs `verify-app` to reproduce. | 0-1 |
| `templates/evals/EVAL_PLAYBOOK.md` | You edit skills and cannot tell whether the edit made them better, or the verification skill is something you rely on. | 2 |
| `templates/guardrails/architecture-contract.md` and `templates/guardrails/enforcement-layers.md` | Agents take locally-easy shortcuts that break design invariants; you can name the invariants. | 3 |
| `templates/skills/team-mode/SKILL.md` | You already have several skills of your own, so a router has something to route to. | 2-3 |
| `templates/skills/verify-app/references/cloud-environment.md` and `templates/automation/bug-repro.md` | Local verification works without you watching, and bug reports wait for a human just to be tried. | 4 |
| `templates/automation/automerge-policy.md` | Hard gates cover a class of change, review on main finds almost nothing new, and you enforce the policy as a required check. | 5 |
| `templates/guardrails/AGENTS.md.template` | You want a full `AGENTS.md`. Merge the parts you need into the existing file; do not replace it. | 1-3 |

## Phase report format

Send this after every phase, then ask whether to continue.

```
## Phase <n> report: <name>
- Changed: <paths created or edited, one per line>
- Evidence: <command and output, or report path and verdict>
- Time spent: <minutes, against the estimate>
- Next: <the next phase and what it will add>
- Decision needed: <continue? commit? CI change? open questions, or "none">
```

Also update the log (Installed, Evidence, Phase status, Next step) before you send it.

## Uninstall

Every path you create or edit is in the log under "Installed", so removal is one list: delete the created paths (`.agents/skills/verify-app`, `.agents/skills/create-verification`, `.agents/skills/maintain-verification`, `.claude/skills` if you made the symlink, scripts, fixtures), revert the edits to existing files that the log names, revert or remove what the log lists outside the repo (config files, extra worktrees, test accounts), then delete `.agents/poteto-adoption.md` and the branch if unmerged. When the whole adoption is finished (not at a pause), remove the clone: `rm -rf /tmp/poteto-kit`.
