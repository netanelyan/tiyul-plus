#!/usr/bin/env bash
# First start of an empty database only (the postgres image runs
# /docker-entrypoint-initdb.d once, then never again).
#
# Recreates the part of a Supabase project that is not in the app's own SQL:
# the roles its policies and grants name, the `auth` schema that Supabase Auth
# migrates on its first start, and the `extensions` schema Supabase installs
# extensions into. sql/*.sql and a dump of the old project both assume all three.
set -euo pipefail

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v authenticator_pw="$AUTHENTICATOR_PASSWORD" -v auth_admin_pw="$AUTH_ADMIN_PASSWORD" <<'SQL'
-- PostgREST logs in as authenticator and switches to the role in the request's
-- JWT: anon without one, authenticated for a signed-in user, service_role for
-- the server's key. Only service_role bypasses row level security.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password :'authenticator_pw';
grant anon, authenticated, service_role to authenticator;
-- The same limits Supabase sets, so a slow query from a visitor cannot hold a
-- connection.
alter role anon set statement_timeout = '3s';
alter role authenticated set statement_timeout = '8s';

-- Supabase Auth owns the auth schema and creates its tables there itself.
create role supabase_auth_admin login noinherit createrole password :'auth_admin_pw';
create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
-- Policies call auth.uid() as the visitor's role.
grant usage on schema auth to anon, authenticated, service_role;

-- Grants in a dump of the old project name these; nothing logs in as them.
create role supabase_admin nologin;
create role dashboard_user nologin;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create extension pg_trgm with schema extensions;
create extension pgcrypto with schema extensions;
create extension "uuid-ossp" with schema extensions;
alter database postgres set search_path = "$user", public, extensions;

-- Supabase's defaults for the public schema: every role can reach every table,
-- and row level security decides what it sees.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- PostgREST caches the schema. Supabase reloads that cache after every DDL
-- statement with an event trigger like this one; without it a new table or
-- function stays invisible to the API until PostgREST restarts.
create function extensions.pgrst_watch() returns event_trigger
  language plpgsql as $$ begin notify pgrst, 'reload schema'; end $$;
create event trigger pgrst_ddl_watch on ddl_command_end execute function extensions.pgrst_watch();
create event trigger pgrst_drop_watch on sql_drop execute function extensions.pgrst_watch();
SQL
