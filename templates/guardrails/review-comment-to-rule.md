<!-- HOW TO USE:
1. Keep this next to AGENTS.md. Use it as a checklist whenever you (a human) are about to leave, or have just left, a review comment, and whenever an agent repeats a mistake.
2. Treat each review comment that states a rule as a bug report against your environment, not against the PR. Fix the PR, then fix the environment using the ladder below.
3. Fill the "Rules we promoted" table as you go; it is the audit trail of how hard your codebase has become.
4. {{PLACEHOLDERS}} in the examples are for your repo's real commands and paths.
-->

# From review comment to rule

Every time a human has to read code and write "you should not do this", that is a smell. It means an invariant of the codebase is enforced by a person's attention, which is slow, inconsistent and does not scale to agents opening dozens of PRs. The question is never "how do I word the comment" but "how do I make it impossible, or at least red in CI, so nobody has to say it again".

## The decision ladder (strongest first)

Stop at the first rung that works.

1. **Eliminate the class.** Change types, architecture or API design so the mistake cannot be expressed. Example: a single typed IPC module so there is nothing to import across processes; a `<Feature>` factory that requires a feature id that has a feature-map file.
2. **Compiler / type check.** Make the type system or compiler diagnostics reject it (strict flags, branded types, exhaustive checks, borrow checker in Rust-like stacks). Hard: the build fails.
3. **Lint rule.** A custom or off-the-shelf lint rule for a bad pattern, set to error. Hard: `{{GATE_COMMAND}}` fails. A lint rule can be bypassed by an inline disable comment unless the config forbids those: in ESLint set `linterOptions.noInlineConfig: true` (this kit's `example/eslint.config.js` does; a `// eslint-disable` then only adds a warning and the rule still errors). In Rust use `forbid` instead of `deny`, because `#[allow]` cannot lower a forbidden lint. For any other linter, find its switch before you trust the rule. Key a rule on module paths and types rather than names: a rule that matches the identifier `createStore` is beaten by `import { createStore as make }` or `import * as kit`, while a dependency rule on the module's path or a type-aware lint rule is not. That raises the cost of the careless version, nothing more: it still detects spellings, and TypeScript analysis is not sound (structural `readonly`, containers, `Reflect`, copied files, re-exports through an allowed file). A lint rule is not a boundary against deliberate evasion.
4. **CI script.** A script over files, the dependency graph or the diff (import boundaries, forbidden strings, map-vs-directories). Hard.
5. **Test.** A test that fails when the invariant breaks (architecture test, snapshot, perf budget test). Hard if run in CI.
6. **Soft rule.** A line in AGENTS.md, a skill, or an AI review bot prompt. Soft: the agent can forget, and the reviewer may not apply it consistently. Use only when 1-5 are impossible (taste, judgment, design intent), and still layer it on top of a hard rule where one exists.

Only the first five make CI red. A codebase held together by soft rules alone drifts toward trash over time; invest in the hard layers.

## Checklist (answer in order for each comment)

1. What is the invariant, in one sentence, independent of this PR?
2. Has it been said before (search PR comments, AGENTS.md)? If yes, you are already late.
3. Can I make it inexpressible (rung 1)? What would the API or type have to look like?
4. If not: can the compiler or type system catch it (rung 2)?
5. If not: can a lint rule detect it (rung 3)? Write the rule, include a fixture of a violation and a pass. Then write a fixture for each way around it that you claim to catch (the rename, the alias, the namespace import, the re-export of the original violation), and watch each go red (`example/guardrail-fixtures/store-*` does this for the single-writer rule). Claim only what a fixture proves, and write the shapes it does not catch under "Not enforced" in AGENTS.md. When a review finds a new way around a rule, do not add another rule for that spelling: ask what makes the wrong thing structurally absent (no API for it, a runtime freeze, a narrower type) and do that instead.
6. If not: can a script over imports/files/diff detect it (rung 4)? Add it to `{{GATE_COMMAND}}`.
7. If not: can a test express it (rung 5)?
8. Only then: add the soft rule, with the reason, to AGENTS.md or a skill; and add an eval case if it is a skill (see `evals/EVAL_PLAYBOOK.md`).
9. Run the new check against the whole repo. Fix or document existing violations in the same change; a rule that starts red or is ignored on day one will be removed.
10. Record it in the table below and delete the human comment's need to exist.

## Worked examples

### 1. "Don't use useEffect"
- Invariant: derived state and side effects are not wired through effects.
- Ladder: eliminating the class is hard in React (effects are part of it), but a framework wrapper that offers the few approved primitives gets close (rung 1 partially). Compiler: no. Lint: yes, rung 3.
- Do: a lint rule that errors on `useEffect` and `useLayoutEffect` imports or calls (ESLint `no-restricted-syntax` or `no-restricted-imports`, or a custom rule), with an allowed wrapper `{{APPROVED_EFFECT_WRAPPER}}` for the rare legitimate subscription. The error message names the replacement.
- Soft backup: AGENTS.md "Banned patterns" row with the reason.

### 2. "Don't import main-process code in the renderer"
- Invariant: heavy or IO code never runs on the UI thread; the renderer has a 16.7 ms frame budget at 60 fps.
- Ladder: rung 1 by separate packages or separate TS projects (tsconfig `references`/path boundaries) so the import does not resolve; rung 4 otherwise: a dependency-graph check (for example dependency-cruiser or eslint-plugin-boundaries) that fails when `{{PROCESS_B_DIR}}` imports `{{PROCESS_A_DIR}}`.
- Do: add the rule to CI with a forbidden-dependency config; add a perf test or trace budget only as a backstop.
- Soft backup: Architecture map table and AI review prompt.

### 3. "Remove this stale comment"
- Invariant: comments never narrate history or conversation.
- Ladder: eliminate: ban comments by default (rung 3/4) except an allowlist (license header, a marked `why:` comment). A script flags comments that match history patterns or any comment not on the allowlist.
- Do: lint rule `{{NO_NARRATING_COMMENTS_CHECK}}` set to error; message says "Put history in the commit message".
- Soft backup: AGENTS.md row with the reason (agents write these almost every time and they are rarely true of the code).

### 4. "Every feature needs a feature-map file"
- Invariant: each directory in `{{FEATURES_DIR}}` has a file `{{FEATURE_MAP_DIR}}/<id>.md` and an index line in that directory's README, and vice versa.
- Ladder: rung 4: a CI script comparing directory names with feature-map files and index lines (see `skills/maintain-verification/SKILL.md` for a reference implementation). Rung 1 variant: generate the skeleton file and index line when a feature is scaffolded.
- Do: add `{{FEATURE_MAP_CHECK}}` to `{{GATE_COMMAND}}`.
- Soft backup: the `maintain-verification` skill, for filling in the content (a script cannot check that the steps are true).

## Rules we promoted

| Date | Review comment (verbatim) | Invariant | Rung used | Enforced by (command / file) | Existing violations fixed |
| --- | --- | --- | --- | --- | --- |
| {{DATE}} | {{COMMENT}} | {{INVARIANT}} | {{1-6}} | {{CHECK}} | {{COUNT}} |

## When a soft rule is the right answer

Taste (naming nuance, API ergonomics), design intent (is this the right abstraction?) and product judgment cannot be linted. For these use a skill or an AI reviewer, accept that it will sometimes be ignored, and keep a human on the final call until the evals show the soft rule holds.
