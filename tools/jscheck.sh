#!/bin/bash
# Syntax-check JS files using macOS JavaScriptCore (no node needed).
# usage: tools/jscheck.sh assets/js/*.js
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
[ -x "$JSC" ] || { echo "jsc not found"; exit 2; }
rc=0
for f in "$@"; do
  tmp=$(mktemp -t jscheck).js
  printf "var __src = read('%s'); try { new Function(__src); print('OK   %s'); } catch (e) { print('ERR  %s -> ' + e); }\n" "$f" "$f" "$f" > "$tmp"
  out=$("$JSC" "$tmp" 2>&1); echo "$out"
  echo "$out" | grep -q '^ERR' && rc=1
  rm -f "$tmp"
done
exit $rc
