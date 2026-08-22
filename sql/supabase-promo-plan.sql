-- ============================================================
--  Promo codes can hand out pro, not only premium
--  Run in Supabase -> SQL Editor. Idempotent, safe to run again.
-- ============================================================
--
--  Until now every promo code granted premium, because the plan was hardcoded
--  in the redemption route and the table had nowhere to say otherwise. One
--  column fixes it.
--
--  **`redeem_promo` is deliberately NOT changed.** It is a security-definer
--  function that does the atomic bit - the row lock, the redemption count, the
--  double-redeem primary key - and it returns the number of days. The plan is
--  read separately by the route afterwards, from the same row, which means:
--    * the existing function keeps working untouched, so nothing that already
--      redeems can break;
--    * the thing that must be atomic (can this code still be redeemed) stays
--      exactly as atomic as it was.
--
--  The default is 'premium', so **every code that already exists keeps granting
--  exactly what it granted yesterday**. And a value outside the two known plans
--  is rejected by the check constraint rather than being handed to the app to
--  interpret, since "some other string" in a plan column would end up as a free
--  account at best and an invented tier at worst.

alter table public.promo_codes
  add column if not exists plan text not null default 'premium';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promo_codes_plan_check'
  ) then
    alter table public.promo_codes
      add constraint promo_codes_plan_check check (plan in ('premium', 'pro'));
  end if;
end $$;

-- Record what was actually granted, not only for how long. Without this a
-- redemption row cannot tell you which plan somebody got, which is the first
-- question asked when a grant is disputed.
alter table public.promo_redemptions
  add column if not exists plan text;
