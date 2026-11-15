#!/usr/bin/env bash
# Nightly dump of the whole tiyul+ database - the site's tables and the auth
# schema (accounts, Google identities) together - run by
# tiyulplus-db-backup.timer. Kept for KEEP_DAYS.
#
# Restoring: a fresh pgdata/ (init/00-roles.sh recreates the roles), then
#   docker compose -f /opt/tiyulplus-db/compose.yml exec -T db \
#     pg_restore -U postgres -d postgres --clean --if-exists < <dump>
set -euo pipefail

ROOT=/opt/tiyulplus-db
KEEP_DAYS=${KEEP_DAYS:-14}
dc() { docker compose --project-directory "$ROOT" -f "$ROOT/compose.yml" "$@"; }

out=$ROOT/backups/tiyulplus-$(date +%Y%m%d-%H%M%S).dump
umask 077
dc exec -T db pg_dump -U postgres -d postgres --format=custom > "$out.part"
# A dump pg_restore cannot read is not a backup; find out tonight, not on the
# day it is needed.
dc exec -T db pg_restore --list < "$out.part" > /dev/null
mv "$out.part" "$out"
find "$ROOT/backups" -name 'tiyulplus-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "backup: $(basename "$out") ($(du -h "$out" | cut -f1)), $(ls "$ROOT"/backups/*.dump | wc -l) kept"
