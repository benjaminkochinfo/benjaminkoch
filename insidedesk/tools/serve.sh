#!/usr/bin/env bash
# Local preview: insidedesk/tools/serve.sh [port]   → http://127.0.0.1:PORT/InsideDesk.html
cd "$(dirname "$0")/../.."
PORT="${1:-8765}"
echo "Preview: http://127.0.0.1:${PORT}/InsideDesk.html"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
