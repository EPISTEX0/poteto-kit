# 02 - Verification: make the agent run the real thing and bring evidence

## The idea

The most important skill in working with agents is **verification**: the agent has to run the code itself, take a CPU trace or a heap snapshot, open the iOS simulator, or do whatever it takes to touch your product the way a user does. It doesn't guarantee the code is *good*, but it does guarantee the code is *correct*, and it closes the loop so you stop being the bottleneck. The tool for this is a **control skill** (in this repo, `verify-app`).

## Why it works

- Verification turns **"agent claims" into "agent evidence"**. "I fixed it" is a statement; before/after traces, screenshots, and logs are evidence that you (or another agent) can check.
- Without a verification skill, **you are the verifier**: you open the dev build, see it's broken, copy a screenshot or console error and paste it back to the agent, and the fix-run-see-error-paste loop always has a human in the middle. That loop can't be parallelized. Handing the checking to the agent is the precondition for parallelizing.
- An agent with only screenshots and traces will confidently say "it's this" and fix the wrong thing. Given tools that run and measure the real thing, it tries, measures, and fixes based on the numbers.
- "Correct" is not "good": verification only guarantees observable behavior. Code quality (architecture, conventions) has to be held by a different layer; see [06](06-guardrail-layers.md).
- The code of a control skill is usually not the hard part: the agent can write it for you. For web or Electron, teach it the Chrome DevTools Protocol; for iOS, use Apple's simulator tooling to run, capture traces, and drive the app programmatically ([09](09-other-stacks.md) maps every stack to concrete tools). The hard part is the conventions around it (below) and the feature map ([03](03-feature-map.md)).
- Never trust a verification skill that hasn't been checked itself: use evals ([05](05-evals.md)) and give the skill's CLI its own tests.

### Anatomy of a control skill

A good control skill is a *directory*, not a prompt:

- **Parts:** `SKILL.md`, a CLI, a small library, `references/`, and `test/`. The CLI has a `--help` that lists commands, flags, and examples, and it has its own tests.
- **Why it is a CLI.** Lauren's account, on Matt Pocock's live stream ([live](https://www.youtube.com/watch?v=MN9dGgmLyso)): without one, every agent builds its own throwaway verify script, differently each time, and the next agent discards it. That is slow and burns context. The CLI holds the deterministic parts once, so every agent that uses the skill gets the same tested step, and the skill text keeps only the judgment (see [04](04-skills-from-failures.md)).
- **The description says when to use it and when not to.** For example: use it to drive a running dev build, take screenshots, click, type, read the accessibility tree, run JS, and check visible state; inside a cloud agent's VM, skip it unless asked. Whether the agent may load it on its own is a separate choice. The default for a control skill is yes (`disable-model-invocation: false`), because its job is to fire when the agent is about to say "done" or receives a bug report, without anyone remembering to ask. Make it explicit-only when driving it is costly or touches something shared (a live session, a paid environment, a cloud VM where it should stay out unless asked): Claude Code and Cursor honour `disable-model-invocation: true` in the frontmatter, and Codex uses `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml`. Router (mode) skills such as `team-mode` are always explicit-only.
- **Capabilities:** inspect the DOM, take screenshots, click, type, read the accessibility tree, run JS, profile, throttle CPU/network, stream console or network, and manage isolated parallel instances.
- **Pick a flow:** detect whether you are in a worktree or the main checkout (in a worktree, `.git` is a file, not a directory). The main checkout uses a fixed control port and a shared profile. Any other checkout is named: either the CLI lives in each worktree and every command takes a worktree flag, or the CLI runs from the main checkout and takes `--target <checkout>` to drive another checkout or worktree (artifacts land with the CLI; a detached target is labelled by the remote branches that contain its commit). Either way the instance has its own derived port and an isolated profile, so parallel agents don't fight over your working session.
- **Refuse instead of silently attaching.** A connect command run from a worktree without the worktree flag, `--target` or an explicit endpoint is **refused**, not quietly pointed at the default port, because that would touch your main session and dirty its login. `--target` is an explicit choice, not a fallback; a missing, uninstalled or port-held target is refused too.
- **The verdict comes from assertions only.** Build, lint and typecheck run as gates and are reported beside the verdict, never inside it. Lint is judged as a delta against the base commit (new problems in the changed files), so a repo with an existing lint backlog can still get a clean PASS. The cheap way needs no second worktree: lint each changed file now and at the base via `git show`, and derive the base total.
- **The CLI writes the report.** `report.json` is the source of truth; `report.md` is exactly the evidence-report block, so the agent pastes it instead of assembling it by hand. A readable export (PDF in the team's language) is generated from `report.json` too, never typed.
- **Known console noise is an allowlist, not a mute button.** Each entry has a pattern, a reason and a scenario scope, and the report lists every match; anything else is a finding.
- **A test account the tool creates.** One dedicated account, registered through the app's own sign-up on a non-production environment, credentials in a user config file outside the repo, never printed; `doctor` reports presence only. Some backends keep one session per account (a second login revokes the first): serialize runs or give each worker its own account.
- **A `smoke` feature** that only loads the first screen separates a broken harness (smoke fails) from bad credentials or a backend problem (smoke passes, login fails).
- **`doctor` first when anything looks off.** A read-only command reports the worktree context, who holds the control port, whether the watcher is alive, whether the build is fresh, and whether the required pieces are compiled; it answers "is this instance worth driving?".
- **Worktree lifecycle:** a setup command (with a watch mode), a command that copies over an already-logged-in profile, restart, info, doctor, and cleanup (remove the worktree). Details in [templates/skills/verify-app/references/worktree-isolation.md](../templates/skills/verify-app/references/worktree-isolation.md).
- **Environment guard:** setup installs dependencies for the runtime version pinned in the repo; if the version doesn't match, it exits *before* provisioning.
- **`references/`** holds supporting docs: the feature map (see [03](03-feature-map.md)), a cookbook for the control protocol, how to set up inside a cloud VM, how to reproduce remotely, and worktree isolation.

Why these designs make sense:

- **Refuse instead of fall back** keeps evidence trustworthy: evidence taken from the wrong instance (the user's main session) is worse than no evidence, because it looks real. A loud, early failure is cheaper than a silently wrong result.
- **`doctor` and the environment guard** turn environment faults (wrong runtime, stale build, held port) into a clear message before the agent sinks time into a broken instance. Label expected answers as expected: an unauthenticated probe that gets HTTP 401 means the API is up.
- **Gates beside the verdict** keep one signal clean. If lint could flip the verdict, a repo with a noisy baseline would never see PASS, and people would stop reading the report; if it is invisible, regressions slip through. Reporting it next to the verdict, as a delta, keeps both honest.
- **Generated, not typed.** A report an agent assembled by hand can drift from the run; one written by the CLI from the run's data cannot.
- **Worktree isolation** (derived port, separate profile) is what lets many agents verify in parallel without stepping on each other or on your session (see [08](08-scaling-to-cloud-agents.md)).
- **A CLI with its own tests** means the skill is verified code, not just text.
- An evidence report (commands run, output, attached screenshots/traces, a pass/fail conclusion) makes "verified" something you can check again.

## How to apply

1. Pick *one* way to run your real application (web: CDP/Playwright; Electron: CDP; iOS: simulator; CLI: run the command and capture the output; the full stack-by-stack list is in [09](09-other-stacks.md)). Run it locally first and watch the agent work, so you see which APIs it calls.
2. Copy [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md) to `.agents/skills/verify-app/SKILL.md` (how each tool finds it: [README](../README.md#install-skills-in-your-tool)), and adapt the app-startup and evidence-gathering parts to your stack.
3. Require the agent to attach evidence when it reports "done" (command output, screenshot, trace). Bare claims are not accepted.
4. If you'd rather not write it by hand, use [templates/skills/create-verification/SKILL.md](../templates/skills/create-verification/SKILL.md) to have the agent read the code and generate `verify-app` and a feature map.
5. Keep the skill in sync with the code using [templates/skills/maintain-verification/SKILL.md](../templates/skills/maintain-verification/SKILL.md).
6. Make the control skill a directory with a CLI: a `--help` command, commands to screenshot/click/read the DOM, and a separate `test/` for the CLI.
7. Add a read-only `doctor` command, and have the agent run it before driving anything whenever something looks off.
8. With multiple parallel agents, follow [templates/skills/verify-app/references/worktree-isolation.md](../templates/skills/verify-app/references/worktree-isolation.md): one derived port and one profile per worktree; if the flag is missing, **refuse**; don't fall back to the default instance.
9. Add an environment guard (runtime version, whether the build has run) to fail early, before provisioning.
10. Check the verification skill itself with evals ([05](05-evals.md)) before you rely on it to drop manual review.
11. Run [example/README.md](../example/README.md) to see one complete verify loop, including the `doctor` command and the self-check that plants a deliberate bug. It does not implement gates, `--target`, `account create` or the evidence-block `report.md`; the templates describe those.
12. Build on what the team already does. Before writing the CLI, look for their own verification (per-ticket browser scripts, PDF or report builders, an evidence folder). Port their helpers, keep their report format, and replace the numbers they type by hand with data the CLI measures.
13. To compare with the state before a change, add a throwaway worktree at the merge-base, install, run the same scenario with `--target`, compare, and remove it (recipe B in [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)).
14. Optional: a readable export, rendered from `report.json` and printed to PDF by the browser that drove the run ([templates/skills/verify-app/references/evidence-export.md](../templates/skills/verify-app/references/evidence-export.md)). Provision the login with [templates/skills/verify-app/references/test-account.md](../templates/skills/verify-app/references/test-account.md).
15. Once the skill passes its evals, scale it out: run it on many agents at once as a fuzz swarm and review the videos and screenshots first, sampling the diff ([08](08-scaling-to-cloud-agents.md#fuzz-swarm-verification-at-scale)).

## Anti-patterns

- You are still the one copy-pasting screenshots and console errors to the agent.
- The agent reports "found the cause" based only on a screenshot or a guess, with no trace and no real run.
- The verification skill doesn't know how to *get to* the feature it needs to check (see [03](03-feature-map.md)).
- Trusting the verification skill without ever evaluating it, or fanning it out to a swarm of agents before it has been evaluated.
- Treating "it runs" as "the code is good" and skipping architectural guardrails.
- A control skill that silently falls back to the default instance/port when a flag is missing, so the agent can drive your session by mistake.
- Several agents sharing one profile and one port; one agent's verification run corrupts another's.
- A skill CLI with no tests or `--help`; nobody knows whether it still works.
- Lint or build failures that flip the verdict (or are hidden), so the report is either always red or silent about regressions.
- Console errors "ignored" in code with no reason and no scope, so real errors hide in the noise.
- A report or PDF with numbers typed by hand instead of read from the run's data.
- Credentials copied from an old script, printed in a log, or committed; or two parallel runs sharing one account on a backend that allows one session.

## Related

- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [templates/skills/create-verification/SKILL.md](../templates/skills/create-verification/SKILL.md)
- [templates/skills/maintain-verification/SKILL.md](../templates/skills/maintain-verification/SKILL.md)
- [templates/skills/verify-app/references/features/README.md](../templates/skills/verify-app/references/features/README.md)
- [templates/skills/verify-app/references/worktree-isolation.md](../templates/skills/verify-app/references/worktree-isolation.md)
- [templates/skills/verify-app/references/test-account.md](../templates/skills/verify-app/references/test-account.md)
- [templates/skills/verify-app/references/evidence-export.md](../templates/skills/verify-app/references/evidence-export.md)
- [09 - Other stacks](09-other-stacks.md)
- [example/README.md](../example/README.md)

Next → [03 - Feature map](03-feature-map.md)
