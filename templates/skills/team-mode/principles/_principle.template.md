<!-- HOW TO USE:
1. One principle per file, named <principle>.md (kebab-case verb phrase). A principle is a short rule of judgment that changes concrete decisions; it is cited in replies ("principle X changed Y"), so it must be specific enough that a citation can be checked.
2. Copy the template block below to principles/<principle>.md (next to this file, inside the team-mode skill folder), fill it, and link the file from ../SKILL.md as `principles/<principle>.md`. Three filled principles ship next to this file (`fix-root-causes.md`, `boundary-discipline.md`, `encode-lessons-in-skills.md`): keep, edit or delete them, and keep the links in ../SKILL.md in sync. Do not install this underscore file.
3. Source a principle from an observed failure or a review comment that keeps recurring (the failure loop in ../SKILL.md). If the rule can be a lint rule or a type, make it one and let the principle point at it.
4. Keep each under ~25 lines. Delete this comment block in the files you install.
-->

# Template

```markdown
# {{principle-name}}

**Rule:** {{one sentence, imperative.}}

**Why:** {{the failure it prevents and what that failure costs.}}

**In practice:**
- {{a concrete behavior or decision it changes}}
- {{another}}

**Tells you are violating it:** {{observable signs in a diff, a plan or a reply.}}

**Enforced by:** {{a lint rule, CI check or type if one exists; otherwise "soft: this file only".}}
```
