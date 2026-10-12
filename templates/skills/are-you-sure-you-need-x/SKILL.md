---
name: are-you-sure-you-need-x
description: Challenge skill. Use when you are about to reach for a risky API or pattern ({{RISKY_LIST}}, for example requestAnimationFrame, useEffect, setTimeout polling, global mutable state, manual DOM access). Asks for evidence that it is needed, lists safer alternatives, and states what the PR must show if you proceed.
---

<!-- HOW TO USE:
1. Copy this folder once per risky API or pattern, naming the folder and the `name` above together for the thing: are-you-sure-you-need-raf, are-you-sure-you-need-use-effect, ... (install under .agents/skills/; see the install table in templates/README.md). Or keep one skill and list several APIs; one skill per API triggers more precisely.
2. Fill all seven placeholders. Take them from a real incident: performance regressions, flaky behavior or review comments that came from this API.
   - {{API}}: the API or pattern, as written in code (for example requestAnimationFrame).
   - {{RISKY_LIST}}: the short list shown in the description, so the skill triggers on the right words.
   - {{WHY_RISKY}}: why it is risky here, in one sentence.
   - {{ALTERNATIVES}}: the safer alternatives to try first, in prose, before the table.
   - {{EVIDENCE_REQUIRED}}: the form the evidence must take in this repo (for example "a trace attached to the PR").
   - {{DATA_FETCHING_APPROACH}}: your project's data-fetching primitive; delete the table row if the API is not about effects.
   - {{WHAT_TO_MEASURE}}: what a before and after measurement must cover (for example long tasks and frames over budget in the trace).
3. This is a SOFT layer. If the API can simply be banned by a lint rule, do that (guardrails/review-comment-to-rule.md) and keep this skill only for the legitimate exceptions the lint rule allows.
4. Delete this comment block when done.
-->

# Are you sure you need `{{API}}`?

You are about to use `{{API}}`. It is risky because: {{WHY_RISKY}} (for example: it runs outside the framework's render cycle, it is easy to leak, it regresses frame time on every user and nothing catches it in CI).

Most of the time you do not need it. Work through this before you write it.

## 1. State the need

Write one sentence: "I need `{{API}}` because <the behavior the user sees that cannot be produced another way>." If the sentence is about how the code is structured or about convenience, you do not need it.

## 2. Show the evidence

Provide at least one of, as {{EVIDENCE_REQUIRED}}:

- A reproduction in the running app (use `verify-app`) showing the behavior the alternatives fail to produce: screenshot, trace or measurement.
- A measurement showing the alternative is too slow or wrong (numbers, not impressions).
- A link to the documented constraint of the platform or library that forces it.

"It is simpler", "the existing code does it elsewhere" and "the agent usually does it" are not evidence. Copying a nearby use is how it spread.

## 3. Try the safer alternatives first

{{ALTERNATIVES}} Examples, adapt to the API:

| Reaching for | Safer alternative to try |
| --- | --- |
| `requestAnimationFrame` loop | CSS transitions or animations; the framework's animation primitive; a single event-driven update |
| `useEffect` to derive state | compute during render; memoize; handle it in the event handler |
| `useEffect` to fetch data | the project's data-fetching primitive ({{DATA_FETCHING_APPROACH}}) |
| polling with `setTimeout` | subscribe to the event or stream that signals the change |
| global mutable state | the single owned store with commands (one writer per value) |

For each alternative you rule out, say why, with a concrete observation.

## 4. If you proceed, the PR must show

- The one-sentence need and the evidence from step 2.
- Which alternatives were tried and why they failed.
- The cleanup and failure handling (cancellation, unmount, error) for `{{API}}`, in the code.
- A before and after measurement or evidence report (`verify-app`) showing no regression in {{WHAT_TO_MEASURE}} (for example long tasks (>50 ms, Long Tasks API) and frames over the 16.7 ms budget in the trace, reported separately).
- A narrow, explicit exception if a lint rule blocks it, reviewed as an architecture change, with the reason in the PR (not in a code comment that narrates history).

## If you cannot show the evidence

Use the alternative, or stop and report what you would need to measure. Do not use `{{API}}` on the assumption that you will justify it later.
