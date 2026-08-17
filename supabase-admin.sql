-- ============================================================
-- tiyul+ : roles (owner / admin), premium grants, promo codes,
--          app flags and an audit log.
--
-- Run in Supabase's SQL Editor. Idempotent - safe to run again.
-- Only one prerequisite: supabase-profiles.sql (the profiles table exists).
-- The premium columns are created here if missing, so run order does not matter.
--
-- ============================================================
-- This file's security principle, in one line:
-- **The client cannot write to any of the columns and tables here.**
-- role, plan, plan_until and plan_source are written exclusively by the
-- service role (i.e. server code with SUPABASE_SERVICE_ROLE_KEY), and never
-- from a user token. If the user could write role, any account could make
-- itself owner in a single REST call. That is why the grants here are given
-- at column level and not just RLS.
-- ============================================================


-- ------------------------------------------------------------
-- 0. The premium columns, in case supabase-premium.sql has not run yet.
--
--    Why this is here: Netanel ran this file before the premium file, and got
--    `column p.plan does not exist`. The role seeded successfully but a premium
--    grant would have failed - no column to write to. A "prerequisite" note in
--    the file header did not prevent that, so the file simply fills in what is
--    missing instead of relying on run order. Idempotent, and does not
--    overwrite existing values.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium'));
alter table public.profiles
  add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ------------------------------------------------------------
-- 1. Role + premium expiry + premium source
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin', 'owner'));

-- When the premium expires. NULL = unlimited (an active Stripe subscription,
-- or a "forever" grant). The comparison happens in code via effectivePlan()
-- in lib/plans.ts.
alter table public.profiles
  add column if not exists plan_until timestamptz;

-- 'stripe' = paid subscription · 'grant' = an admin grant · 'promo' = a promo code.
-- Without this, a Stripe webhook downgrading a cancelled subscription would
-- also downgrade manually-granted premium, and there would be no way to tell
-- a paying customer from someone who got a gift.
alter table public.profiles
  add column if not exists plan_source text
    check (plan_source is null or plan_source in ('stripe', 'grant', 'promo'));

create index if not exists profiles_role_idx
  on public.profiles (role) where role <> 'user';

-- ------------------------------------------------------------
-- 2. Hardening: the explicit list of columns a signed-in user may write.
--    role / plan / plan_until / plan_source / stripe_customer_id are not in it.
--    (Repeats what supabase-premium.sql did, so this file is correct even if
--    it runs first or somebody changed grants in the meantime.)
-- ------------------------------------------------------------
revoke insert, update on table public.profiles from authenticated;
grant insert (user_id, display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;
grant update (display_name, phone, avatar, visited, prefs, is_public, updated_at)
  on table public.profiles to authenticated;

-- ------------------------------------------------------------
-- 3. Audit log - every admin action, without exception.
--    The email is stored too, not just the uuid: if an account is deleted,
--    the row is still readable.
-- ------------------------------------------------------------
create table if not exists public.admin_audit (
  id bigserial primary key,
  actor_user_id uuid not null,
  actor_email text,
  action text not null,
  target_user_id uuid,
  target_email text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_user_id);

alter table public.admin_audit enable row level security;
-- No policies on purpose: anon and authenticated are fully blocked. The
-- service role bypasses RLS, and that is the only way to write and read -
-- meaning even an admin sees the log only through our server code, which
-- verifies their role first.
revoke all on table public.admin_audit from anon, authenticated;
revoke all on sequence public.admin_audit_id_seq from anon, authenticated;

-- ------------------------------------------------------------
-- 4. Promo codes - an admin creates, the traveler redeems on their own
-- ------------------------------------------------------------
create table if not exists public.promo_codes (
  code text primary key,
  days integer not null check (days > 0 and days <= 3650),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redeemed integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code text not null references public.promo_codes (code) on delete cascade,
  user_id uuid not null,
  days integer not null,
  redeemed_at timestamptz not null default now(),
  -- Prevents double redemption of the same code by the same user **at the
  -- database level**, not with a check in code that can fail under two
  -- concurrent requests.
  primary key (code, user_id)
);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;

-- ------------------------------------------------------------
-- 5. Atomic redemption.
--
--    Why an RPC and not read-then-write from the server: two concurrent
--    requests on the last remaining code would both read redeemed=0 and both
--    succeed. Here the check and the update are one statement, and a
--    duplicate primary key catches a repeated redemption.
--
--    Returns: days if redeemed, 0 if the code does not exist/is
--             disabled/expired/full, -1 if this user already redeemed it.
-- ------------------------------------------------------------
create or replace function public.redeem_promo(p_code text, p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  -- Lock the row so the redemption count stays correct under contention
  select days into v_days
  from public.promo_codes
  where code = upper(trim(p_code))
    and active
    and (expires_at is null or expires_at > now())
    and redeemed < max_redemptions
  for update;

  if v_days is null then
    return 0;
  end if;

  begin
    insert into public.promo_redemptions (code, user_id, days)
    values (upper(trim(p_code)), p_user, v_days);
  exception when unique_violation then
    return -1;
  end;

  update public.promo_codes
  set redeemed = redeemed + 1
  where code = upper(trim(p_code));

  return v_days;
end;
$$;

revoke execute on function public.redeem_promo(text, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 6. App flags - an emergency kill switch without a deploy
--
--    agent_enabled=false drops /api/chat to the keyless rule-based
--    responses, i.e. the site keeps working and model spend stops
--    immediately.
-- ------------------------------------------------------------
create table if not exists public.app_flags (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_flags enable row level security;
revoke all on table public.app_flags from anon, authenticated;

insert into public.app_flags (key, value)
values ('agent_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 7. Seeding the owner.
--
--    **This is the only line in the file that needs editing** if the address
--    changes. Works even if the user has never logged in (so they have no
--    profiles row): in that case the row is created. If they already exist -
--    only the role is updated.
-- ------------------------------------------------------------
do $$
declare
  v_email text := 'natikyan153@gmail.com';
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise notice 'טיול+: המשתמש % עוד לא נרשם. להריץ את הקובץ הזה שוב אחרי ההתחברות הראשונה שלו.', v_email;
    return;
  end if;

  insert into public.profiles (user_id, role)
  values (v_uid, 'owner')
  on conflict (user_id) do update set role = 'owner';

  insert into public.admin_audit (actor_user_id, actor_email, action, target_user_id, target_email, detail)
  values (v_uid, v_email, 'seed_owner', v_uid, v_email, jsonb_build_object('source', 'supabase-admin.sql'));

  raise notice 'טיול+: % הוגדר כ-owner.', v_email;
end $$;
