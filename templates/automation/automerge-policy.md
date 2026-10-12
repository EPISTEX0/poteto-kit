<!-- HOW TO USE:
1. Copy to docs/automerge-policy.md and fill every {{PLACEHOLDER}}. Link it from AGENTS.md (the "Do not merge or enable auto-merge yourself unless ..." line).
2. Prerequisites, all of them: the gate is a single command that CI runs and that has gone red when you broke a rule on purpose; PRs are atomic; every behavior PR carries an evidence report from the verification skill; you can revert quickly. If one is missing, do not auto-merge anything yet; see docs/08-scaling-to-cloud-agents.md.
3. Enforce the policy as a required status check computed from the diff, not as an instruction to the agent. An agent can forget or argue with a sentence; it cannot flip a required check.
4. Start with the narrowest class (section 1) and widen it only with the ledger in section 6.
5. Delete this comment block when done.
-->

# Auto-merge policy for {{PROJECT_NAME}}

Auto-merge is not "the agent may merge". It is a short list of change classes for which the hard layers (gate, evidence, atomicity, protected paths) already give the assurance a reviewer would, so human review adds delay and no safety. Everything outside the list waits for a human.

## 1. Change classes

Classify by the files the diff touches, mechanically. When a diff spans classes, the strictest class wins.

| Class | Examples | Auto-merge? | Extra conditions beyond section 2 |
| --- | --- | --- | --- |
| **A. No runtime effect** | docs, comments that follow the comment rule, test-only changes, feature-map corrections | {{yes / no}} | {{extra conditions}} |
| **B. Mechanical** | formatter output, a rename done by a codemod, generated files regenerated from their source, patch-level dependency bumps with an unchanged lockfile shape | {{yes / no}} | {{for example: the generator command is in the PR and reproduces the diff}} |
| **C. One feature, small** | a behavior change inside one `{{FEATURES_DIR}}/<feature-id>/` directory and its feature-map file | {{yes / no}} | {{for example: the evidence report covers every entry point the changed feature file lists}} |
| **D. Shared or sensitive** | `{{SHARED_DIR}}`, the framework package, public contracts, config, anything on the protected list in section 3 | **never** | A human approves |
| {{CLASS_E}} | {{examples}} | {{yes / no}} | {{extra conditions}} |

## 2. Required signals (all of them, on the PR head commit)

1. **Gate green:** `{{GATE_COMMAND}}` passed in CI on the exact commit being merged, and the branch is up to date with `{{DEFAULT_BRANCH}}` (or passed in the merge queue).
2. **Verification evidence attached** (classes B and C that change behavior): an evidence report in the PR in the format of the verify-app skill, with a verdict of PASS, a build commit equal to the PR head, every entry point of the touched feature files exercised or listed with `skip: <reason>`, and no "Not verified" item that the change could affect. A report with BLOCKED, or for an older commit, does not count.
3. **Atomic PR:** one concern, described in one sentence, touching {{ATOMIC_LIMIT}} (for example one feature directory plus its map file). No mixed refactor and behavior change.
4. **No protected path** (section 3) in the diff, including renames into or out of one.
5. **Review signals clean:** {{AI_REVIEW_TOOL}} has no unresolved blocking finding, no open human comment, and the codeowner rules for the touched paths are satisfied.
6. **Author allowed:** the PR author or bot is on the list {{ALLOWED_AUTHORS}}.
7. **Not paused:** the kill switch ({{KILL_SWITCH}}) is off.

The check that computes eligibility is `{{AUTOMERGE_CHECK}}`. It posts one required status, `automerge-eligible`, with the class and the failing signal if any. Only that status turns auto-merge on.

## 3. Protected paths (always a human)

A diff touching any of these is class D, whoever wrote it:

| Path or pattern | Why a human decides |
| --- | --- |
| `{{CI_PATHS}}` (CI workflows, the gate command, gate scripts) | Changes what "green" means; weakening a gate is the easiest way to get a bad merge |
| `{{LINT_CONFIG_PATHS}}` (lint rules, import-boundary config, ignore lists) | Same: they define the hard layers |
| `AGENTS.md`, `{{SKILLS_DIR}}/**`, this file | They change how every agent behaves |
| `{{AUTH_PATHS}}` (authentication, permissions, secrets handling) | Security |
| `{{DATA_PATHS}}` (schema, migrations, anything that deletes or rewrites user data) | Hard to undo |
| `{{DEPENDENCY_PATHS}}` (manifests, lockfiles) except what class B allows | Supply chain |
| `{{DEPLOY_PATHS}}` (infrastructure, release, deploy configuration) | Production blast radius |
| {{MORE_PROTECTED_PATHS}} | {{why}} |

The protected list is itself protected: changing it needs a human.

## 4. Revert policy

- **Revert first, diagnose second.** If main breaks after an auto-merge (gate red on main, a post-merge check fails, a user-visible regression), revert the merge commit immediately. Anyone, human or automation, may do it; do not wait for a root cause.
- A clean revert of an auto-merged commit is itself eligible for auto-merge if the gate is green on it.
- Open a follow-up issue with the evidence (failing check, artifacts, the PR). The fix is a new PR that goes through this policy again.
- **Strikes:** if {{REVERT_LIMIT}} auto-merged changes of a class are reverted within {{REVERT_PERIOD}}, switch auto-merge off for that class until a human reviews why and switches it back on.
- **Kill switch:** {{KILL_SWITCH}} turns off all auto-merge at once. Anyone on the team may use it without asking.
- Because history is atomic PRs, a revert is one commit; that is the reason section 2 requires atomic PRs.

## 5. Reviewing on main afterwards

Auto-merged does not mean unreviewed forever; the review moves after the merge.

- Every auto-merged PR is listed in the ledger (section 6) and reviewed by {{POST_MERGE_REVIEWER}} within {{POST_MERGE_WINDOW}}. The reviewer is a human, or an AI reviewer on a different model than the one that wrote the change.
- The reviewer checks: is the evidence real (artifact paths open and show the claimed end state), did the gate really cover the change, was the class right, and is there a lesson to promote to a hard rule (see `guardrails/review-comment-to-rule.md`).
- A finding that a human would have blocked is a miss: revert if it matters, then change the policy or the gate so it cannot recur. A policy that never changes after a miss is not being run.

## 6. Ledger and widening

Keep one row per auto-merged PR in {{LEDGER_LOCATION}}:

| Date | PR | Class | Evidence link | Post-merge review result | Reverted? |
| --- | --- | --- | --- | --- | --- |
| {{DATE}} | {{PR}} | {{A/B/C}} | {{link}} | {{ok / finding}} | {{no / yes: link}} |

Widen a class (or add one) only when the ledger shows {{WIDEN_CRITERION}} (for example a stated number of consecutive merges with clean post-merge reviews and no reverts), and record the change in this file in its own PR. Narrow it at the first miss that matters.
