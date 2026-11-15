#!/usr/bin/env bash
# The Vercel cron, moved to a systemd timer: GET /api/internal/warm with
# CRON_SECRET. Without the secret the route answers 404, so this does nothing.
set -euo pipefail

secret=$(sed -n 's/^CRON_SECRET=//p' /opt/tiyulplus-web/shared/env | tail -n1 | tr -d "\r\"'")
if [ -z "$secret" ]; then
  echo "CRON_SECRET is not set - warming is off"
  exit 0
fi
# The header goes in on stdin so the secret never shows up in `ps`.
printf 'Authorization: Bearer %s\n' "$secret" |
  curl -fsS -m 120 -H @- http://127.0.0.1:4800/api/internal/warm
echo
