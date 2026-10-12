#!/bin/sh
# HOW TO USE:
# 1. Copy to scripts/check-feature-map.sh (or anywhere your gate can reach) and add it to your gate command, for example
#    "check:feature-map": "sh scripts/check-feature-map.sh".
# 2. It takes two optional arguments, so nothing needs editing:
#      sh check-feature-map.sh [FEATURES_DIR] [FEATURE_MAP_DIR]
#    defaults: src/features  and  .agents/skills/verify-app/references/features
#    Pass your real paths in the gate command, or change the two defaults below.
# 3. It enforces, in both directions, that every directory directly under FEATURES_DIR has a
#    FEATURE_MAP_DIR/<id>.md and an index line in FEATURE_MAP_DIR/README.md, and that every feature
#    file and every index line has a directory. It cannot check that the steps in a file are true;
#    that is what skills/maintain-verification/SKILL.md step 5 is for.
# 4. Index line format, exactly (the scope after the dash is required):
#      - [`<feature-id>`](<feature-id>.md) — one-line scope
#    Not features, so ignored on both sides: README.md, cross-cutting-flows.md, and any file or
#    directory whose name starts with "_" (templates, scaffolds).
# 5. Delete this comment block in the installed copy if you like; the script does not read it.

FEATURES_DIR="${1:-src/features}"
MAP_DIR="${2:-.agents/skills/verify-app/references/features}"
INDEX="$MAP_DIR/README.md"
status=0
fail() { echo "feature-map: $1"; status=1; }

[ -f "$INDEX" ] || { echo "feature-map: missing $INDEX"; exit 1; }
[ -d "$FEATURES_DIR" ] || { echo "feature-map: missing directory $FEATURES_DIR"; exit 1; }

dirs=$(for p in "$FEATURES_DIR"/*/; do [ -d "$p" ] && basename "$p"; done | grep -v '^_' | sort)
files=$(ls -1 "$MAP_DIR" | grep -E '\.md$' | grep -vE '^(README|cross-cutting-flows)\.md$|^_' | sed 's/\.md$//' | sort)

# Every line that starts like an index line must be a complete one (scope required).
# shellcheck disable=SC2016
loose=$(grep -E '^- \[`' "$INDEX")
# shellcheck disable=SC2016
strict=$(grep -E '^- \[`([^`]+)`\]\(([^)]+)\) — [^[:space:]]' "$INDEX")
echo "$loose" | while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "$strict" | grep -qxF -- "$line" || echo "feature-map: malformed index line in $INDEX (expected: - [\`id\`](id.md) — scope; the scope is required): $line"
done | grep . && status=1

# shellcheck disable=SC2016
pairs=$(echo "$strict" | sed -E 's/^- \[`([^`]+)`\]\(([^)]+)\).*/\1 \2/')
indexed=$(echo "$pairs" | awk 'NF {print $1}' | sort)

for d in $dirs; do
  echo "$files" | grep -qxF -- "$d" || fail "$FEATURES_DIR/$d has no file $MAP_DIR/$d.md"
  echo "$indexed" | grep -qxF -- "$d" || fail "$FEATURES_DIR/$d is not listed in the index of $INDEX"
done
for f in $files; do
  echo "$dirs" | grep -qxF -- "$f" || fail "$MAP_DIR/$f.md has no directory $FEATURES_DIR/$f"
  echo "$indexed" | grep -qxF -- "$f" || fail "$MAP_DIR/$f.md is not listed in the index of $INDEX"
done
echo "$pairs" | while read -r id target; do
  [ -n "$id" ] || continue
  [ "$target" = "$id.md" ] || echo "feature-map: index line for '$id' links to '$target', expected '$id.md'"
done | grep . && status=1
for i in $indexed; do
  [ -f "$MAP_DIR/$i.md" ] || fail "index lists '$i' but $MAP_DIR/$i.md does not exist"
done

[ "$status" -eq 0 ] && echo "feature-map: ok ($(echo "$dirs" | grep -c .) features)"
exit $status
