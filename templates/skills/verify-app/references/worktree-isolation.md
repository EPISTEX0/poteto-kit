<!-- HOW TO USE:
1. Keep this file only if several agents (or an agent and a human) may run the app at the same time on one machine. Fill the {{PLACEHOLDERS}} with your real commands; delete anything your stack does not need.
2. The CLI behavior described here is a contract to implement and test in the skill's own CLI; the commands are examples of the shape, rename them freely.
3. Delete this comment block when done.
-->

# Parallel instances: worktree isolation

Why: the human's session, and every parallel agent, must be able to run and drive their own build at once. One shared port and one shared profile means agents fight over the same window, overwrite each other's state and report on the wrong build.

## The model

| | Main checkout | Worktree (parallel agent) |
| --- | --- | --- |
| Detect | `.git` is a directory | `.git` is a file pointing at the main repository |
| Port | default `{{DEFAULT_PORT}}` | derived from the worktree path (stable hash into the range `{{PORT_RANGE}}`) |
| Profile / user data | shared `{{DEFAULT_PROFILE_DIR}}` | isolated `{{WORKTREE_PROFILE_DIR}}` per worktree |
| Flag | none | `--worktree` on every command |
| Build watcher | optional | one per worktree |

## Refuse, do not fall back

From a worktree, a command that carries neither `--worktree` nor an explicit port must exit with an error that says what to pass. It must never quietly use the default port: the default instance is somebody else's session. The same rule applies to any ambiguous target (two instances match, port owner is a different checkout): stop and say which flag disambiguates. A fallback here turns a wrong target into a confident wrong report.

## Two shapes, one rule: `--worktree` or `--target`

The rule is the same in both: the instance you drive is named, never guessed. They differ in where the CLI lives.

| | `--worktree` | `--target <checkout>` |
| --- | --- | --- |
| The CLI is | in each worktree (every worktree has its own copy and its own build watcher) | in the main checkout only; it drives another checkout or worktree |
| Fits | apps with a fixed dev port and a persistent signed-in profile (desktop, Electron) | apps the CLI can start itself from a path (a web dev server, a simulator build) |
| Port | derived from the worktree path | derived from the target path |
| Artifacts | in the worktree | in the checkout that holds the CLI, so one place collects every run |
| Without the flag | in a worktree: refuse | in a linked worktree: refuse and say `--target .` verifies this one; in the main checkout: the main checkout is the target |

`--target` is an explicit choice, not a fallback, so it does not break the refusal rule. It adds its own refusals: the path is not a directory, the target is not installed (the CLI never installs for it), or the derived port is held (never replaced by another port). Never touch ports or browsers the developer is using: list them as reserved and skip them in the derivation.

A detached target (a worktree on a commit) has no branch name. Label it in `doctor` and in the report by the remote branch(es) that point at its commit, falling back to those that contain it, for example `origin/some-branch @ <short sha>`, and say so when no remote branch has it.

To compare behavior before and after a change, use a throwaway worktree at the base and `--target`; the recipe is in `SKILL.md` (recipe B).

## Quick start

Typical commands (rename to match your CLI):

```
{{CLI_NAME}} worktree-setup --watch          # provision this worktree: install, build, start the watcher
{{CLI_NAME}} seed-profile                    # seed a signed-in profile into this worktree's isolated profile so the instance boots signed in
{{CLI_NAME}} --worktree restart              # (re)start the isolated instance
{{CLI_NAME}} --worktree info                 # which port, which profile, which build
{{CLI_NAME}} doctor                          # read-only health: port owner, watcher, build freshness, prerequisites
{{CLI_NAME}} cleanup --remove-worktree       # stop the instance, delete its profile, remove the worktree
```

Setup rules:

- Runtime pin: the project names the runtime version it needs ({{RUNTIME_VERSION_FILE}}). If the installed version differs, exit before provisioning anything; half-provisioned worktrees are the worst failure to debug.
- The seeded profile (signed in, onboarding done) is what makes an automated run start in the baseline state; real login is manual.
- Setup must be idempotent: running it twice leaves one working instance.

## doctor

Read-only. Reports: worktree context (main or worktree, which one), the process that owns the port (pid, command, which checkout), watcher liveness, whether the build is newer than the latest source change, and the environment check: tool versions match the runtime pin, build artifacts are fresh, the profile exists and is signed in. Exit code non-zero when the instance is not worth driving. Run it first whenever something looks off, and paste its summary into the evidence report.

## Cleanup

When the task is over: stop the instance and watcher you started, delete the isolated profile and temp files, and remove the worktree if you created it. Never touch the main checkout's instance or profile.

For agents that run in cloud VMs instead of local worktrees, see `cloud-environment.md`.
