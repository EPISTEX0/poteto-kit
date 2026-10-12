# encode-lessons-in-skills

**Rule:** When you learn something that a future agent would otherwise have to rediscover, write it down where agents will read it, in the smallest durable form.

**Why:** Lessons that stay in a conversation vanish; the same failure then recurs, and each recurrence costs a human a review comment.

**In practice:**
- After a failure caused by missing knowledge, add a rule, a gotcha line in a feature file, or a skill, following the failure loop in the `team-mode` skill.
- Prefer the hardest form that works: type or lint rule first, then CI check, then a skill (see `guardrails/review-comment-to-rule.md`).
- Put the lesson in the same PR as the fix, with the evidence that reproduced the failure.

**Tells you are violating it:** the same mistake twice, "I'll remember for next time", a fix PR with no change to docs, rules or skills.

**Enforced by:** soft: this file; review asks "where is this lesson encoded?".
