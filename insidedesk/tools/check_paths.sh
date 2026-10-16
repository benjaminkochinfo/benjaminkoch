#!/usr/bin/env bash
# Inside Desk path guard. Fails (exit 1) if any changed path is outside:
#   InsideDesk.html   q7c/**   insidedesk/**
#
# Usage (from the repo root):
#   insidedesk/tools/check_paths.sh                 # working tree + index + untracked vs HEAD, plus commits since BASE
#   BASE=origin/main insidedesk/tools/check_paths.sh
#   insidedesk/tools/check_paths.sh --tree DIR      # check every file inside a local mirror directory
#   git diff --name-only A B | insidedesk/tools/check_paths.sh --stdin
set -euo pipefail
ALLOW='^(InsideDesk\.html|q7c/.+|insidedesk/.+)$'

collect() {
  case "${1:-}" in
    --tree)  [ -d "${2:?--tree needs a directory}" ] || { echo "no such dir: $2" >&2; exit 2; }
             (cd "$2" && find . -type f ! -path './.git/*' | sed 's|^\./||') ;;
    --stdin) cat ;;
    *)       git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "not a git repo; use --tree DIR or --stdin" >&2; exit 2; }
             BASE="${BASE:-}"
             if [ -z "$BASE" ]; then
               if git rev-parse --verify -q origin/main >/dev/null; then BASE=origin/main; else BASE=HEAD; fi
             fi
             { git diff --name-only "$BASE"...HEAD 2>/dev/null || true
               git diff --name-only
               git diff --name-only --cached
               git ls-files --others --exclude-standard; } ;;
  esac
}

mapfile -t FILES < <(collect "$@" | sed '/^$/d' | sort -u)
bad=0
for f in "${FILES[@]}"; do
  if [[ ! "$f" =~ $ALLOW ]]; then echo "OUTSIDE INSIDE DESK: $f"; bad=1; fi
done
if [ "$bad" -ne 0 ]; then
  echo "✗ path guard failed — only InsideDesk.html, q7c/ and insidedesk/ may change." >&2; exit 1
fi
echo "✓ path guard ok — ${#FILES[@]} path(s), all inside Inside Desk."
