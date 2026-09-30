#!/bin/bash
# Local static preview server for the site (zero dependencies, needs python3).
#
# usage:  tools/serve.sh [port]        default port: 8137
#         then open  http://localhost:8137/
#
# Notes:
#  - Serves the project root, so /404.html, /cv/ and /projects/... resolve like on GitHub Pages.
#  - Unknown URLs answer with the site's own 404.html (status 404), exactly as GitHub Pages does.
#  - Stop with Ctrl+C.
set -e
PORT="${1:-8137}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "$1" in -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0;; esac
cd "$ROOT"
echo "Serving $ROOT"
echo "→  http://localhost:$PORT/   (Ctrl+C to stop)"
exec python3 - "$PORT" <<'PY'
import http.server, os, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(os.getcwd(), "404.html")
        if code == 404 and os.path.isfile(page):
            with open(page, "rb") as f:
                body = f.read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
        else:
            super().send_error(code, message, explain)

http.server.test(HandlerClass=Handler, port=int(sys.argv[1]), bind="127.0.0.1")
PY
