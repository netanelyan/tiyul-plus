#!/usr/bin/env bash
# Puts a previous release of the tiyul+ website back, in seconds (no build).
#
#   bash rollback.sh            the release that was live before the current one
#   bash rollback.sh <id>       a specific release (see: ls /opt/tiyulplus-web/releases)
#
# Code only. A database change is not undone by this - see RUNBOOK.md section 4.
set -euo pipefail

APP=/opt/tiyulplus-web
cur=$(basename "$(readlink -f "$APP/current")")
target=${1:-}

if [ -z "$target" ]; then
  # The newest activated release that is not the live one and is still on disk.
  mapfile -t log < "$APP/shared/releases.log"
  for ((i = ${#log[@]} - 1; i >= 0; i--)); do
    if [ "${log[i]}" != "$cur" ] && [ -d "$APP/releases/${log[i]}" ]; then
      target=${log[i]}
      break
    fi
  done
fi
[ -n "$target" ] && [ -d "$APP/releases/$target" ] || {
  echo "no release to roll back to (live: $cur)" >&2
  ls -1t "$APP/releases" >&2
  exit 1
}

echo "==> $cur -> $target"
ln -sfn "$APP/releases/$target" "$APP/.current.new" && mv -Tf "$APP/.current.new" "$APP/current"
systemctl restart tiyulplus-web
for _ in $(seq 1 90); do
  if curl -fsS -m 5 http://127.0.0.1:4800/api/health >/dev/null 2>&1; then
    echo "$target" >> "$APP/shared/releases.log"
    echo "==> live: $target ($(cat "$APP/current/REVISION"))"
    exit 0
  fi
  sleep 1
done
echo "!! $target did not become healthy - check: journalctl -u tiyulplus-web -n 100" >&2
exit 1
