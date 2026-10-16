#!/usr/bin/env bash
# One command to produce an edition locally:  insidedesk/tools/publish.sh [--offline] [--no-png]
# Builds charts + pages + feed + sitemap, validates, and runs the path guard. Never pushes.
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 insidedesk/tools/build.py "$@"
python3 insidedesk/tools/validate.py
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then insidedesk/tools/check_paths.sh; else insidedesk/tools/check_paths.sh --tree .; fi
echo "Ready. Review locally (insidedesk/tools/serve.sh), then commit only the paths above."
