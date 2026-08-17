-- tiyul+ · A personal budget for every premium subscriber, fully isolated from the daily budget
-- Run once in Supabase → SQL Editor. Idempotent - safe to run again.
--
-- ============================================================
-- Background: the economics of premium were wrong
-- ============================================================
--
-- ₪19.90/month (PREMIUM_PRICE_ILS) including VAT is about ₪16.90 net, and about
-- ₪15 after payment-processing fees - roughly $4 a month. Measured cost: $0.063
-- per cached turn, $0.45 per cold turn, about $0.53 for a full trip build. At
-- zero margin, $4 buys about 60 turns or about 7 trips - and that is the
-- absolute upper ceiling, not a reasonable budget. The card on the site
-- promised 400 chats and 100 builds **per day** - a subscriber using a
-- fraction of that would have cost far more than they pay.
--
-- ============================================================
-- The solution: a real monthly dollar cap, per individual subscriber
-- ============================================================
--
-- $2.00/month per subscriber (SUBSCRIBER_MONTHLY_CAP_USD in lib/server/budget.ts) -
-- 50% of net revenue. Even if a subscriber maxes it out completely, a 50%
-- gross margin remains on that single subscriber; most subscribers will not
-- come close, so the average margin across the whole subscriber base is much
-- higher. $2.00 comfortably buys two full trip builds (2 × $0.53) plus about
-- 15 cached edit/question turns (15 × $0.063) - exactly "generous for someone
-- planning one or two real trips", not the old ceiling.
--
-- ============================================================
-- Why a separate table, and not an extension of ai_spend_daily
-- ============================================================
--
-- **The two wallets - anonymous and signed-in-free - must never touch each
-- other in either direction**, and that includes the new premium wallet. Had a
-- premium subscriber's spend been counted inside ai_spend_daily.usd (as
-- happens today for every "signed-in" caller), one subscriber maxing out
-- their cap would have drained the budget the free users share - exactly the
-- opposite of what the anonymous cap already prevents. The table here is
-- **fully independent**: recordSpend() in budget.ts skips bump_ai_spend
-- (which updates ai_spend_daily/ai_spend_caller) for a premium subscriber,
-- and calls bump_subscriber_spend instead. The raw ai_spend row is still
-- written for everyone, for reporting - only the aggregation that drives the
-- blocking is separated.
--
-- A monthly key ('YYYY-MM'), not daily: this is the cap the subscriber
-- actually lives by - it resets with the subscription, not at midnight.

create table if not exists public.subscriber_spend_monthly (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null,                  -- 'YYYY-MM', in UTC like dayKey()
  usd        numeric(12, 6) not null default 0,
  requests   integer        not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- For the admin's "how much did subscribers cost this month" view - summed by month, not by user
create index if not exists subscriber_spend_monthly_month_idx
  on public.subscriber_spend_monthly (month, usd desc);

-- ---------- Atomic update, exactly the same pattern as bump_ai_spend ----------
create or replace function public.bump_subscriber_spend(
  p_user  uuid,
  p_month text,
  p_usd   numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
begin
  insert into public.subscriber_spend_monthly (user_id, month, usd, requests)
  values (p_user, p_month, greatest(p_usd, 0), 1)
  on conflict (user_id, month) do update
    set usd        = public.subscriber_spend_monthly.usd + greatest(excluded.usd, 0),
        requests   = public.subscriber_spend_monthly.requests + 1,
        updated_at = now()
  returning usd into total;
  return total;
end;
$$;

-- ---------- Permissions ----------
-- Same policy as ai_spend*: RLS enabled with no policy at all - "nobody", not
-- "everybody" - and only the service role gets in. Explicit revoke from
-- public so the revoke precedes the grant, as supabase-rpc-grants-fix.sql
-- concluded.
alter table public.subscriber_spend_monthly enable row level security;
revoke all on public.subscriber_spend_monthly from anon, authenticated;

revoke all on function public.bump_subscriber_spend(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.bump_subscriber_spend(uuid, text, numeric) to service_role;

-- ============================================================
-- Premium's actual feature: the pre-departure check included, unlimited
-- ============================================================
--
-- The "pre-departure check" (predeparture.ts) was explicitly built as
-- unrelated to Plan/Tier ("this has no connection to Plan/Tier and must not
-- have one"). That decision was right when it was written - it is a
-- standalone one-time-payment product - but premium had no quality feature of
-- its own, only bigger quotas on the same product. The decision here is to
-- give premium subscribers the check **free and unlimited**: the marginal
-- cost is zero (a deterministic computation against the catalog, not an AI
-- call), and it is the first qualitative difference premium offers at all.
-- See purchases.ts and checks/create-order/route.ts.
--
-- A new source: 'premium_included', in addition to the existing 'paypal' and
-- 'admin_grant'. amount=0 like admin_grant - this is not real revenue and the
-- financial report must not count it as such (purchases.ts computeStats
-- distinguishes the two so the picture stays accurate: how much is human
-- support vs. how much is an automatic subscriber perk).
--
-- **The original check constraint's name is not guessed here.** It was
-- created without an explicit name in supabase-purchases.sql, meaning
-- Postgres picked an automatic name - usually `purchases_source_check`, but
-- relying on that is exactly the kind of assumption pgrest.ts exists to
-- prevent elsewhere. This block **finds** the actual constraint name via
-- pg_constraint (the only constraint on the source column that is a CHECK,
-- not FK/PK) and drops it by its real name.
--
-- **And this file does not depend on execution order.** Netanel's first run
-- failed with `relation "public.purchases" does not exist` - he ran this file
-- before supabase-purchases.sql. That is exactly the lesson already recorded
-- in the log about supabase-admin.sql: "a 'prerequisite' note in a file
-- header did not prevent the mistake, so the file stopped depending on run
-- order." Therefore: if the table does not exist yet - skip quietly (with a
-- notice), because supabase-purchases.sql was updated to create the
-- constraint **already with** 'premium_included', so in any execution order
-- the final result is identical. Safe to run again after the table is
-- created.
do $$
declare
  real_name text;
begin
  if to_regclass('public.purchases') is null then
    raise notice 'public.purchases עוד לא קיימת - מדלגים. supabase-purchases.sql יוצר אותה כבר עם premium_included, כך שאין מה להריץ כאן שוב.';
    return;
  end if;

  select con.conname into real_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'purchases'
    and con.contype = 'c'
    and att.attname = 'source'
  limit 1;

  if real_name is not null then
    execute format('alter table public.purchases drop constraint %I', real_name);
  end if;

  alter table public.purchases add constraint purchases_source_check
    check (source in ('paypal', 'admin_grant', 'premium_included'));
end
$$;

-- ---------- Verification ----------
-- `select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.purchases'::regclass and conname = 'purchases_source_check';`
-- should show all three values.
