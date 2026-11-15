#!/usr/bin/env bash
# Copies the old Supabase project into the self-hosted database: the public
# schema whole (tables, data, functions, policies, grants), and the accounts
# from auth (users + identities, so a Google sign-in still lands in the same
# account). Sessions are not copied - everyone signs in once more.
#
# The connection string comes on stdin, never as an argument (argv is visible
# to every user of the box):
#   ssh tiyul-vps 'bash /opt/tiyulplus-db/import-supabase.sh --fresh' < url.txt
# Use the session pooler string from the dashboard's Connect panel; the direct
# db.<ref>.supabase.co host is IPv6 only.
#
#   --fresh   wipe the self-hosted database first and start from an empty one.
#             Refused once the website's env file points at this database:
#             after the switch, this database IS production.
set -euo pipefail

ROOT=/opt/tiyulplus-db
WEB_ENV=/opt/tiyulplus-web/shared/env
dc() { docker compose --project-directory "$ROOT" -f "$ROOT/compose.yml" "$@"; }
local_psql() { dc exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }
# The source is on the internet, which a container on a Docker network cannot
# reach (see compose.yml), so it is read by a throwaway client in the host's
# network. SQL for it goes on stdin, and the URL rides in the environment, so
# it is in no process's argv.
src_run() { SRC=$SRC docker run --rm -i --network host -e SRC postgres:17-bookworm "$@"; }
src_sql() { src_run sh -c 'psql "$SRC" -v ON_ERROR_STOP=1 -qAt -F " "'; }

read -r SRC || true
[[ ${SRC:-} == postgres*://* ]] || { echo "expected a postgres:// connection string on stdin" >&2; exit 1; }
export SRC

if [ "${1:-}" = "--fresh" ]; then
  if grep -q '^SUPABASE_URL=https://db\.tiyulplus\.com' "$WEB_ENV"; then
    echo "refusing --fresh: the website already uses this database" >&2; exit 1
  fi
  echo "==> wiping the self-hosted database"
  dc down
  rm -rf "$ROOT/pgdata"
  dc up -d --wait --wait-timeout 180
fi

echo "==> waiting for Supabase Auth to create its tables"
for _ in $(seq 1 60); do
  [ "$(local_psql -c "select to_regclass('auth.identities') is not null" 2>/dev/null)" = t ] && break
  sleep 2
done
[ "$(local_psql -c "select count(*) from auth.users")" = 0 ] ||
  { echo "auth.users is not empty here - rerun with --fresh" >&2; exit 1; }
[ "$(local_psql -c "select count(*) from pg_tables where schemaname = 'public'")" = 0 ] ||
  { echo "public already has tables here - rerun with --fresh" >&2; exit 1; }

echo "==> source: $(src_sql <<< "select version()" | cut -d, -f1)"
# Triggers on auth tables belong to auth and are not in a dump of public; if the
# old project has any, they must be recreated by hand. Say so rather than lose them.
trg=$(src_sql <<< "select tgrelid::regclass || ': ' || tgname from pg_trigger where tgrelid in ('auth.users'::regclass, 'auth.identities'::regclass) and not tgisinternal")
[ -z "$trg" ] || { echo "!! triggers on auth tables in the source, not copied:"; echo "$trg"; }

work=$(mktemp -d); trap 'rm -rf "$work"' EXIT

echo "==> accounts"
# Column lists are the intersection of both sides, minus generated columns:
# the hosted Auth may be a version ahead and carry a column this one lacks.
cols() { # cols <table> <side: src|local>
  local q="select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_schema = 'auth' and table_name = '$1' and is_generated = 'NEVER'"
  if [ "$2" = src ]; then src_sql <<< "$q"; else local_psql -c "$q"; fi
}
for t in users identities; do
  both=$(comm -12 <(cols "$t" src | tr , '\n' | sort) <(cols "$t" local | tr , '\n' | sort) | paste -sd, -)
  only=$(comm -23 <(cols "$t" src | tr , '\n' | sort) <(cols "$t" local | tr , '\n' | sort) | paste -sd, -)
  [ -z "$only" ] || echo "   auth.$t: not copied (no such column here): $only"
  src_sql <<< "\\copy (select $both from auth.$t) to stdout" > "$work/$t.copy"
  local_psql -c "\\copy auth.$t($both) from stdin" < "$work/$t.copy"
  echo "   auth.$t: $(wc -l < "$work/$t.copy") rows"
done

echo "==> extensions, in the schema the source has each one in"
# A dump of one schema does not create extensions, but it does name them by
# schema: the old project keeps pg_trgm in public, so its index on profile names
# says public.gin_trgm_ops, which fails against init's extensions.pg_trgm.
# pg_stat_statements needs a preload library, and the vault is Supabase's own.
while read -r ext sch; do
  [ -n "$ext" ] || continue
  if [ "$(local_psql -c "select count(*) from pg_available_extensions where name = '$ext'" </dev/null)" != 1 ]; then
    echo "   $ext: not available here, skipped"; continue
  fi
  cur=$(local_psql -c "select extnamespace::regnamespace from pg_extension where extname = '$ext'" </dev/null)
  if [ -z "$cur" ]; then
    local_psql -c "create schema if not exists \"$sch\"; create extension \"$ext\" with schema \"$sch\"" </dev/null
  elif [ "$cur" != "$sch" ]; then
    local_psql -c "alter extension \"$ext\" set schema \"$sch\"" </dev/null
  fi
  echo "   $ext: $sch"
done < <(src_sql <<< "select extname, extnamespace::regnamespace from pg_extension where extname not in ('plpgsql', 'pg_stat_statements', 'supabase_vault') order by 1")

echo "==> public schema"
src_run sh -c 'pg_dump "$SRC" --schema=public --no-owner --format=custom' > "$work/public.dump"
# Not --exit-on-error: a dump of a Supabase project carries a few statements
# about things this database deliberately does not have (the realtime
# publication, grants to Supabase's internal roles). Every error is printed;
# the row counts below are what decides whether the import worked.
dc exec -T db pg_restore -U postgres -d postgres --no-owner < "$work/public.dump" 2> "$work/restore.err" || true
# The dump re-creates the public schema, which every database already has.
errs=$(grep -E 'error:|ERROR' "$work/restore.err" | grep -v 'schema "public" already exists' || true)
if [ -n "$errs" ]; then
  echo "   pg_restore reported:"; echo "$errs" | sed 's/^/     /' | head -40
fi
local_psql -c "notify pgrst, 'reload schema'"

echo "==> counts, source vs here"
q="select string_agg(format('select %L, count(*) from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname = 'public'"
union=$(local_psql -c "$q")
# Rows are not everything: a policy, index or function that failed to restore
# leaves every count intact, so these are compared too.
extra="union all select 'auth.users', count(*) from auth.users
  union all select 'auth.identities', count(*) from auth.identities
  union all select '~policies', count(*) from pg_policies where schemaname = 'public'
  union all select '~indexes', count(*) from pg_indexes where schemaname = 'public'
  union all select '~functions', count(*) from pg_proc where pronamespace = 'public'::regnamespace
  union all select '~triggers', count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where c.relnamespace = 'public'::regnamespace and not t.tgisinternal"
for side in src local; do
  if [ "$side" = src ]; then
    src_sql <<< "$union $extra" | sort > "$work/$side.counts"
  else
    local_psql -F ' ' -c "$union $extra" | sort > "$work/$side.counts"
  fi
done
join -a1 -a2 -e MISSING -o 0,1.2,2.2 "$work/src.counts" "$work/local.counts" | while read -r t a b; do
  flag=""; [ "$a" = "$b" ] || flag="   <-- differs"
  printf '   %-32s %8s %8s%s\n' "$t" "$a" "$b" "$flag"
done
join -a1 -a2 -e MISSING -o 1.2,2.2 "$work/src.counts" "$work/local.counts" | awk '$1 != $2 {bad=1} END {exit bad}' ||
  { echo "!! counts differ - do not switch the site to this database" >&2; exit 1; }
echo "==> import complete, every count matches"
