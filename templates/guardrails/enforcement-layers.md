<!-- HOW TO USE:
1. Copy this into your repo docs (for example docs/guardrails.md) and fill the last two columns for your stack. Be honest: "none" is a valid and useful answer.
2. Read it top to bottom as a strength ladder: layers 1-2 make CI red (hard); layers 3-5 can be forgotten (soft). The more important invariants sit in layers 1-2, the less you must read agent code, and the further right you can move on the trust curve.
3. Review it when an agent causes a bug that slipped through: find the layer that should have caught it and fill that gap rather than adding another soft rule.
4. Replace {{PLACEHOLDERS}}. The two rows marked "extra" below the five layers are optional extra rows; keep or delete them.
-->

# Enforcement layers

Five layers, ordered strongest to weakest. Layers 1 and 2 are hard: the agent cannot ship a violation however tired or forgetful it is, because CI goes red. Layers 3 to 5 are soft: an agent can forget them or apply them inconsistently. Use soft layers on top of hard ones, never instead of them: a repo with only rules, a review bot, skills and a style guide will, sooner or later, look like trash.

## Matrix

| # | Layer | Hard / soft | What it catches | Example in a typical repo | Your current coverage | Gaps / next step |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Codebase**: strict architecture where the conventional way to build a feature is the only easy way (features as owned folders, discovery from reserved files, forbidden imports by construction) | Hard (strongest: agents copy the nearest pattern, so the pattern is the enforcement) | Wrong place for code, reinvented patterns, scattered features, cross-boundary imports | `{{FEATURES_DIR}}/<feature-id>/` colocation; separate `{{PROCESS_A_DIR}}` and `{{PROCESS_B_DIR}}`; see `architecture-contract.md` | {{COVERAGE_1}} | {{GAP_1}} |
| 2 | **Static analysis**: lint rules, compiler diagnostics, CI checks | Hard | Banned patterns (`useEffect`), history-narrating comments, boundary violations (dependency graph), missing feature-map files, type errors and unhandled cases | `{{LINT_COMMAND}}`, `{{TYPECHECK_COMMAND}}`, `{{IMPORT_BOUNDARY_CHECK}}`, `{{FEATURE_MAP_CHECK}}` | {{COVERAGE_2}} | {{GAP_2}} |
| 3 | **Rules / AI review bot**: `AGENTS.md`, editor rules, a code-review bot on PRs | Soft | Conventions with reasons that tooling cannot express; second look at risky diffs; intent and taste | `AGENTS.md` banned-patterns table; `{{AI_REVIEW_TOOL}}` configured from it | {{COVERAGE_3}} | {{GAP_3}} |
| 4 | **Skills**: procedures and judgment loaded when relevant | Soft | How to verify, how to find a root cause, when to challenge a risky API, when to update the map | `{{SKILLS_DIR}}/*` | {{COVERAGE_4}} | {{GAP_4}} |
| 5 | **Style guide**: prose conventions humans are supposed to remember | Soft (weakest) | Taste: naming nuance, structure preferences | `{{STYLE_GUIDE_PATH}}` | {{COVERAGE_5}} | {{GAP_5}} |
| (+) | Tests (optional extra row): unit, integration, architecture tests, performance budgets | Hard when required in CI; sits with layer 2 | Behavior and performance regressions against a budget | `{{TEST_COMMAND}}` | {{COVERAGE_T}} | {{GAP_T}} |
| (+) | Human review (optional extra row) | Soft and expensive | Product judgment, architecture direction, anything new; every rule a human states here should be promoted upward | PR review | {{COVERAGE_H}} | {{GAP_H}} |

Layers 1 and 2 make CI red. Layers 3 to 5 do not. When someone says "we have rules and a review bot", ask which hard layer backs each important invariant.

## Per-invariant view (fill one row per important invariant)

| Invariant | Layers that enforce it (numbers from the matrix) | At least one hard layer (1 or 2)? | If not, plan |
| --- | --- | --- | --- |
| No `useEffect` | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |
| No cross-process imports | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |
| No history-narrating comments | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |
| Feature has a feature-map file and index line | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |
| Behavior verified by running the app (evidence in PR) | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |
| {{INVARIANT}} | {{LAYERS}} | {{YES_NO}} | {{PLAN}} |

## How to use the result

- An invariant with no hard layer is a debt; promote it with `review-comment-to-rule.md`.
- The tech stack is itself a layer: a stricter compiler or type system gives you hard checking for free (a language whose compiler enforces memory safety, for instance, lets you trust "it compiles" more).
- The worst place to be is enforcing invariants by a human reading code in review. Every time a human has to say "do not do this", treat it as a smell and promote the rule.
- Scale agent autonomy only as far as the hard layers cover: supervised local work needs few; many parallel or cloud agents, automations and auto-merge need most important invariants hard.
- Re-fill this matrix after any incident that reached production.
