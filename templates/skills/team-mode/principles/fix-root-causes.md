# fix-root-causes

**Rule:** Fix the cause of a problem where it originates, not the place where it shows up.

**Why:** A patch at the symptom (a retry, a null guard, a longer timeout) hides the defect, lets it recur through another path, and leaves the next person a worse system.

**In practice:**
- Before changing code for a bug, trace the wrong value or behavior back to where it first appears, and cite that `file:line` (skill `investigate`).
- If the true fix is larger than the task, say so and propose the split; do not ship the patch as if it were the fix.
- Remove the mechanism that allowed the bug when feasible (a type, a single writer) rather than adding a check beside it.

**Tells you are violating it:** new `try/catch` that swallows, retry loops, arbitrary sleeps, a special case keyed on the failing input.

**Enforced by:** soft: this file, plus the `investigate` skill.
