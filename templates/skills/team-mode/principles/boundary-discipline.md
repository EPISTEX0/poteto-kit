# boundary-discipline

**Rule:** Respect module and process boundaries; cross them only through the interface designed for it.

**Why:** Boundaries encode ownership and cost (a renderer shares a frame budget, a package must stay reusable). Reaching across one works today and breaks isolation, performance or reuse quietly later.

**In practice:**
- Before an import, check which side of the boundary each file sits on; use the typed contract instead of importing the other side.
- If a boundary is in your way, stop and report it; moving a boundary is an architecture change in its own PR.
- Put shared pure code in the shared module, not in whichever side needed it first.

**Tells you are violating it:** relative imports with several `../` segments into another package, duplicated helpers, an import added "just for a type".

**Enforced by:** import-boundary check in CI (see `guardrails/architecture-contract.md`); this file is the backup.
