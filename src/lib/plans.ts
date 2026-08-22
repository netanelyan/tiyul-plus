/**
 * Plans and quotas - the only file shared between the server (enforcement)
 * and the UI (the premium page, quota messages). No secrets here.
 *
 * "AI units" are the internal cost measure of an agent conversation: an
 * uncached input token = 1, an output token = 4 (roughly reflecting the
 * price ratio; cache reads are almost free and therefore not counted). A
 * free user gets enough to build a full trip + dozens of edits per day -
 * the quota is meant to stop abuse, not real usage.
 */

import { priceLabel as predepartureCheckPriceLabel } from '@/lib/predeparture';

export type Plan = 'free' | 'premium' | 'pro';

/** The paid plans, i.e. everything that carries a price and a personal money cap. */
export type PaidPlan = Exclude<Plan, 'free'>;

/**
 * Plans are **ordinal**, exactly like `ROLE_RANK` below, and for the same
 * reason: every feature gate in the codebase used to be written
 * `caller.plan === 'premium'`, which silently means "premium and nobody
 * above it". The moment a third paid tier exists, every one of those
 * equality checks becomes a bug that **removes** a feature from the more
 * expensive plan - and it fails silently, because nothing throws when a
 * paying subscriber is quietly told they need to subscribe.
 *
 * So gates go through `planAtLeast(plan, 'premium')` and never through
 * equality. Equality is still correct for **display** ("you are on the pro
 * plan"), which is why both exist.
 */
export const PLAN_RANK: Record<Plan, number> = { free: 0, premium: 1, pro: 2 };

export const isPlan = (v: unknown): v is Plan => v === 'free' || v === 'premium' || v === 'pro';

/** Does `plan` include at least everything `need` includes? */
export const planAtLeast = (plan: Plan, need: Plan) => PLAN_RANK[plan] >= PLAN_RANK[need];

/**
 * The paying plan of a caller, or null. **Requires a userId**: a paid plan is
 * by definition signed in, and the personal money wallet is keyed on the user
 * id - so a plan with nobody to charge it to must be treated as free rather
 * than silently drawing from a wallet that belongs to no one.
 */
export const paidPlanOf = (
  caller: { plan: Plan; userId?: string | null },
): PaidPlan | null =>
  caller.userId && planAtLeast(caller.plan, 'premium') ? (caller.plan as PaidPlan) : null;

/**
 * The quota tier. Deliberately separate from `Plan`: `Plan` is a
 * **billing state** (subscribed or not), and `Tier` is **how much is
 * allowed**. An anonymous visitor is not a free customer - they are
 * someone who has not signed up yet, and there is no reason the most
 * expensive resource in the product should be equally available to them.
 */
export type Tier = 'anon' | Plan;

/**
 * Roles. 'user' is the default and has no special permission at all.
 *
 * The hierarchy is ordinal on purpose (`ROLE_RANK`), so a permission
 * check is a single comparison rather than a list of ifs that somebody
 * will forget to update when a role is added.
 */
export type Role = 'user' | 'admin' | 'owner';

export const ROLE_RANK: Record<Role, number> = { user: 0, admin: 1, owner: 2 };

export const isRole = (v: unknown): v is Role =>
  v === 'user' || v === 'admin' || v === 'owner';

/** Does `role` have at least the permissions of `need` */
export const roleAtLeast = (role: Role, need: Role) => ROLE_RANK[role] >= ROLE_RANK[need];

/**
 * The **effective** plan, after expiry.
 *
 * Why this is a function and not a read of the column: premium can come
 * from two sources - a Stripe subscription (no end date; the webhook
 * downgrades it when it is cancelled) or an admin grant, which can be
 * time-limited. Without this check a 30-day grant quietly becomes
 * premium forever - and that is exactly the kind of bug nobody reports,
 * because it looks like generosity.
 *
 * **Single source of truth**: everyone who decides whether somebody is
 * premium must go through here - both the server (identity.ts, quota
 * enforcement) and the UI.
 */
export function effectivePlan(
  row: { plan?: string | null; plan_until?: string | null } | null | undefined,
  now: number = Date.now(),
): Plan {
  /*
    Anything that is not one of the paid plan strings is free - including
    'PREMIUM', 'Pro' and any future value written into the column by hand.
    The bias is deliberate: an unrecognised value must not grant anything.
  */
  const plan = row?.plan;
  if (plan !== 'premium' && plan !== 'pro') return 'free';
  if (!row?.plan_until) return plan;
  const until = Date.parse(row.plan_until);
  if (Number.isNaN(until)) return plan; // a corrupt date must not revoke a subscription already paid for
  return until > now ? plan : 'free';
}

/**
 * **The fields here are named `PerDay` but the actual period is derived
 * from the tier, not from the name.** `periodMsFor(tier)` returns a day
 * for anon/free and 30 days for premium; every caller of `checkLimit`
 * uses it instead of hardcoding 24 hours. The names stayed as they were
 * so an economic change would not balloon into a rename across every
 * file that reads them - `PLAN_FEATURE_ROWS` is the only place that also
 * needs to describe the correct unit to the user, and it does that
 * explicitly ("per day"/"per month") rather than through the name.
 */
export interface PlanLimits {
  /** Chat requests - per day (anon/free) or per month (premium) */
  chatPerDay: number;
  /** Chat requests per minute (burst protection - stays short at every tier; not period-dependent) */
  chatBurstPerMin: number;
  /**
   * AI-units budget - per day (anon/free) or per month (premium).
   *
   * **For premium this is no longer the real protection** -
   * `SUBSCRIBER_MONTHLY_CAP_USD` in `budget.ts` is, because dollars
   * measure real cost and units are an approximation. The number here
   * stays as a high second safety net, which should never be the one
   * that binds.
   */
  aiUnitsPerDay: number;
  /** Quick trip builds (/api/generate-trip) - per day or per month */
  generatePerDay: number;
  /** Short share links - per day or per month */
  sharesPerDay: number;
  /** Map imports (Google My Maps) - per day or per month */
  importsPerDay: number;
  /**
   * Images that can be attached to a conversation - per day or per month
   * (a photo of a booking confirmation, a flight ticket). An image costs
   * the model far more than text, so the quota is deliberately low.
   */
  imagesPerDay: number;
  /**
   * Destination explorations - per day or per month
   * (`explore_destination` → Wikipedia).
   *
   * This is not a model cost but **a cost borne by someone else**:
   * Wikipedia gives us a free service and asks for fair use, and there
   * is no reason one user should be able to send it thousands of
   * searches through our site. A real traveler explores a city or two
   * per conversation.
   */
  exploresPerDay: number;
  /**
   * Geocoding lookups - per day or per month (`add_pin` →
   * OpenStreetMap/Nominatim).
   *
   * Nominatim is bounded by a one-request-per-second policy, and our
   * throttle is **serial and global** - meaning one user sending a
   * hundred lookups stalls everyone's queue, and also risks our address
   * being blocked. Hence a separate quota.
   */
  geocodesPerDay: number;
  /**
   * Live web searches - per day or per month (`web_search`,
   * hours/admission-price/existence).
   *
   * Unlike `exploresPerDay`/`geocodesPerDay` this is not protecting
   * someone else's free service - a search costs us a real $0.01 per
   * call (`WEB_SEARCH_COST_USD`), so the quota is deliberately lower.
   * For premium it is also counted inside `SUBSCRIBER_MONTHLY_CAP_USD` -
   * the dollar cap is the real protection of the money; this one only
   * prevents repeated exploitation by a single person.
   */
  lookupsPerDay: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** 30 days, not a "calendar month" - simple and constant, like every other quota here */

/**
 * The quota window length for a tier: a day for anon/free, 30 days for
 * premium.
 *
 * **This is the whole point of "monthly quotas, not daily".** The card
 * used to promise 400 chats and 100 builds **per day** for premium - no
 * real subscriber plans like that, but anyone who did would cost far
 * more than they pay. Same numbers, derived from the real $4/month
 * budget rather than a guess, and checked over 30 days.
 *
 * Every caller of `checkLimit` should use this instead of the constant
 * `24 * 60 * 60 * 1000`, so premium gets the right window without
 * changing a single number.
 */
/**
 * The quota window, and it is **one day for every tier including premium**.
 *
 * It used to be 30 days for premium, and that single asymmetry produced a
 * paying plan that was worse than the free one on every countable row: free
 * showed 60 chats A DAY next to premium's 10 A MONTH. Nothing in the code was
 * wrong - the numbers had been derived backwards from the dollar cap without
 * ever being compared against the free tier, and no test compared them either.
 * A shared period is what makes the comparison table mean anything, and
 * `premiumIsNeverWorseThanFree` in the tests now enforces the ordering.
 */
export const periodMsFor = (): number => DAY_MS;

export const PLAN_LIMITS: Record<Tier, PlanLimits> = {
  /*
    Anonymous. **The numbers were derived from measured cost, not from a
    guess** (July 31, after Netanel got blocked after four messages).

    Two real measurements: the first call in a session $0.447, a call
    after it $0.063. The difference is the cache write of the catalog
    prefix - meaning **our cost is per cold session, not per message**.

    25 messages are a full planning session (build + edits + questions),
    and that is the experience that is supposed to convince someone to
    sign up. At the measured prices that is ~$2.1 in a typical session
    and ~$2.7 in a bad one - both below the $3 personal cap.
    The units here are only a second belt: the dollar cap is the real
    tool, and the number was chosen so it never touches anyone who did
    not touch the cap.
  */
  anon: {
    chatPerDay: 25,
    chatBurstPerMin: 4,
    aiUnitsPerDay: 600_000,
    generatePerDay: 6,
    sharesPerDay: 5,
    importsPerDay: 2,
    imagesPerDay: 1,
    exploresPerDay: 8,
    geocodesPerDay: 12,
    lookupsPerDay: 5,
  },
  free: {
    chatPerDay: 60,
    chatBurstPerMin: 6,
    aiUnitsPerDay: 1_200_000,
    generatePerDay: 15,
    sharesPerDay: 10,
    importsPerDay: 5,
    imagesPerDay: 3,
    exploresPerDay: 20,
    geocodesPerDay: 30,
    lookupsPerDay: 10,
  },
  /*
    Premium. **Daily numbers, on the same clock as free, and strictly larger
    than free on every single row.** That ordering is the requirement now, and
    it is enforced by a test - because the previous version failed it on
    everything.

    ## What went wrong, since the numbers here were not arbitrary

    The previous version derived every premium quota backwards from
    SUBSCRIBER_MONTHLY_CAP_USD ($2.00) so that using the whole visible
    allowance could never hit the invisible dollar cap - Netanel's rule, word
    for word: "if someone is cut off by the dollar cap while the page told them
    they had trips remaining, that's a broken promise and a refund."

    That is a good rule and the arithmetic was right. What nobody did was
    compare the result against the FREE tier, and premium was on a monthly
    clock while free was on a daily one. The outcome, live on the pricing page:

      chats        free 60 A DAY   premium 10 A MONTH
      quick builds free 15 a day   premium  5 a month
      images       free  3 a day   premium  5 a month
      shares       free 10 a day   premium 60 a month
      ... and so on for every row, all of them the wrong way round.

    A subscriber got fewer agent messages in a month than a free user got in a
    single day. Nothing was broken in the code; the guard that should have
    existed simply did not, and no amount of care inside one column catches an
    error that only exists BETWEEN two columns.

    ## What binds now, honestly

    With daily premium quotas the visible numbers can no longer be the first
    thing to bind - $2.00/month is roughly 30 warm agent turns, or ~4 full trip
    builds at the cold-cache price, and the quotas here are far above that. So
    the dollar cap is now the real constraint for heavy use, and the ordering
    Netanel asked for is inverted again.

    That is a deliberate trade and it is the lesser of the two evils: the rule
    exists to stop a subscriber being cut off while the screen promises more,
    and the previous numbers broke that promise far more brutally by promising
    a tenth of what free already gives away. The cap is not a silent failure
    either - PREMIUM_BUDGET_MESSAGE explains it in words.

    **The number to revisit is the cap, not these quotas.** At the measured
    prices $2.00 covers about one real planning session a month (25 turns from
    a warm cache plus one cold start is ~$2.00 exactly). Two sessions need
    ~$3.50-4.00, which at Netanel's ~$4 net per subscriber is most of the
    margin. That is a pricing decision, so it is written down here rather than
    changed: raise SUBSCRIBER_MONTHLY_CAP_USD, raise PREMIUM_PRICE_ILS, or
    accept that heavy subscribers hit the ceiling.

    Fields with no AI cost of ours (imports, shares, explores, geocodes) are
    generous simply because they cost nothing - they were never part of any
    arithmetic.
  */
  premium: {
    chatPerDay: 200,
    chatBurstPerMin: 20,
    aiUnitsPerDay: 6_000_000,
    generatePerDay: 40,
    sharesPerDay: 60,
    importsPerDay: 30,
    imagesPerDay: 20,
    exploresPerDay: 150,
    geocodesPerDay: 200,
    lookupsPerDay: 40,
  },
  /*
    Pro (₪89/month). **The tier is volume, and volume only** - it carries no
    feature premium does not have, and the card says so in those words. That is
    not a gap waiting to be filled with something invented; it is what the
    product honestly has today, and for the person it is aimed at, volume IS
    the thing they are short of.

    The daily numbers below are ~3x premium's and, exactly like premium's, they
    are **anti-abuse belts and not the promise**. The promise is the monthly
    planning capacity in PRO_TRIPS_PER_MONTH, and that is the number sized to
    fit under the money cap - see SUBSCRIBER_CAP_USD for the whole arithmetic.

    exploresPerDay/geocodesPerDay grow by less than the rest (2x, not 3x) on
    purpose: those two spend **somebody else's** free service, and Nominatim's
    throttle is serial and global, so one heavy account there degrades everyone
    else's geocoding. Paying more does not buy the right to lean harder on
    OpenStreetMap.
  */
  pro: {
    chatPerDay: 600,
    chatBurstPerMin: 30,
    aiUnitsPerDay: 20_000_000,
    generatePerDay: 120,
    sharesPerDay: 200,
    importsPerDay: 100,
    imagesPerDay: 60,
    exploresPerDay: 300,
    geocodesPerDay: 400,
    lookupsPerDay: 120,
  },
};

/**
 * How many **full trip builds** (create_trip_full in a conversation) a
 * subscriber may run per day. Counted **inside** the chat quota (a build is a
 * chat) and capped separately because a full build costs ~8x an edit chat
 * ($0.53 vs $0.063), so a loop of builds is the one shape that can spend real
 * money fast. Enforced by a dedicated gate in chat/route.ts, consumed only on
 * a build **that succeeded** (peekUsed + checkLimit), so an attempt that failed
 * validation does not burn quota.
 *
 * Five a day is far beyond real planning (a traveller builds one trip and then
 * edits it), and deliberately more permissive than anything the free tier gets
 * - the previous value, 2 per MONTH, was less than a free user could do in an
 * afternoon, which is the bug this whole block was rewritten for.
 */
export const TRIP_BUILDS_PER_DAY: Record<PaidPlan, number> = { premium: 5, pro: 15 };

/** Kept as a name because the premium row of the comparison table reads it directly. */
export const PREMIUM_TRIP_BUILDS_PER_DAY = TRIP_BUILDS_PER_DAY.premium;

/**
 * The AI-units equivalent of one search: $0.01 (`WEB_SEARCH_COST_USD`)
 * divided by a typical input price of about $3 per million tokens, i.e.
 * roughly 3,333 units - rounded to 3,500 for the same reason every
 * other number here is a round number and not an exact calculation:
 * this is a second belt, the dollar cap is the real tool.
 */
const WEB_SEARCH_AI_UNITS = 3_500;

/** Compute AI units from Anthropic's usage (cache reads are not counted) */
export function aiUnits(usage: {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
  web_search_requests?: number;
}): number {
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.output_tokens ?? 0) * 4 +
    (usage.web_search_requests ?? 0) * WEB_SEARCH_AI_UNITS
  );
}

/**
 * The price displayed on the premium page.
 *
 * Since 2026-08-16 subscription signup is **live through PayPal
 * Subscriptions** (`server/paypalSubs.ts`; `/api/billing/checkout`
 * creates a subscription and returns an approval link; actual activation
 * happens only in the verified webhook). The price here must match the
 * Plan configured in PayPal - changing one side without the other shows
 * a false price. The Stripe infrastructure (billing.ts) stays in the
 * code as a legacy path only - no subscription was ever charged
 * through it.
 */
export const PREMIUM_PRICE_ILS = 19.9;

/**
 * The heavy plan, ₪89/month. Same product as premium - **no feature premium
 * does not have** - with roughly six times the planning capacity.
 *
 * Why a tier that is only volume is not filler: at the premium cap ($2.00) a
 * subscriber gets about **one** full planning session a month before the money
 * ceiling starts biting (the arithmetic is in the test, and in the comment on
 * `PLAN_LIMITS.premium`). For somebody who plans constantly that is the actual
 * wall they hit, and there is nothing else on the site they can buy to move it.
 * This moves it, and it moves it by more than the price ratio: **4.47x the
 * price buys 6x the capacity**, which is what makes it a sensible purchase
 * rather than "four subscriptions in a trench coat".
 */
export const PRO_PRICE_ILS = 89;

/**
 * **The capacity promise on the pro card, and the only number there that is a
 * promise at all** - the daily quotas in `PLAN_LIMITS.pro` are anti-abuse
 * belts, exactly as they are for premium.
 *
 * Five, and deliberately not six or eight: at the measured worst-case prices
 * five *long* plannings cost $10.20 against a $12.00 cap (85%), and five
 * typical ones cost $7.38 (61%). So the person who reads "five trips a month"
 * and then edits obsessively still does not meet the ceiling first. Six would
 * have been $12.24 at the worst case - over - and that is precisely the broken
 * promise this number exists to avoid. Locked by a test.
 */
export const PRO_TRIPS_PER_MONTH = 5;

/**
 * The same promise for premium, and it is **one**.
 *
 * Stated on the card since 2026-08-22. It had never been stated before, which
 * let the plan read as unbounded and made pro's five look like an arbitrary
 * upsell rather than a real step. One is the honest number: a long single
 * planning session is 82% of premium's cap and two typical ones do not fit.
 *
 * For the traveller premium is aimed at - one or two trips a **year** - this
 * reads as plenty, which is the point. Somebody who genuinely needs more has
 * pro, and somebody who hits it once has the FAQ's standing offer to write in.
 */
export const PREMIUM_TRIPS_PER_MONTH = 1;

/**
 * Promo-code redemption attempts. **Deliberately not plan-based** - this
 * is protection against code guessing, not a usage quota, and premium
 * should not buy the right to guess faster.
 *
 * A code is 3-24 alphanumeric characters, i.e. a space that can be
 * scanned: without a limit, one signed-in account could try thousands
 * of codes a minute and win premium. Five attempts an hour is more than
 * anyone needs to type a code from their email.
 */
export const PROMO_ATTEMPTS_PER_HOUR = 5;
export const PROMO_ATTEMPTS_PER_DAY = 20;

/**
 * **The real cap on a single premium subscriber, in real dollars -
 * $2.00 per month.**
 *
 * **Invisible to the user, on Netanel's explicit instruction**: "'$2 of
 * planning' means nothing to anyone." What the user sees is only the
 * countable quotas in `PLAN_FEATURE_ROWS` (trips, chats) - calibrated
 * so they run out **before** this cap on every realistic path (see the
 * arithmetic table next to `PLAN_LIMITS.premium`, and the test that
 * locks it). The only place this amount is shown is the admin area -
 * where Netanel sees the real money, per subscriber and in total.
 *
 * Lives here (the shared file) and not in `budget.ts` because the
 * margin test needs it alongside `PLAN_LIMITS`; `budget.ts` imports it
 * and actually enforces it through `premiumBudgetFor()` - the
 * explanation of the enforcement and the isolation from the other
 * wallets lives there.
 *
 * The arithmetic: ₪19.90/month including VAT ≈ ₪16.90 net ≈ ₪15 after
 * payment fees ≈ $4. $2.00 is 50% of that - even a subscriber who maxes
 * everything out still leaves a 50% gross margin on themselves.
 */
export const SUBSCRIBER_CAP_USD: Record<PaidPlan, number> = {
  /*
    ## Why this is 2.50 and not 2.00

    It was 2.00, and at 2.00 the page could not honestly say what premium buys.
    A typical planning session is $1.475 (74% of the cap, fine) but a **long**
    one - the same trip with 24 turns of editing rather than 15 - is $2.04,
    which is 102% of a $2.00 cap. So a subscriber who plans their one trip and
    then keeps fiddling with it gets cut off, in the same month, having used the
    plan exactly as intended.

    That is the "broken promise and a refund" case, and the moment
    PREMIUM_TRIPS_PER_MONTH started being **stated on the card** it stopped
    being theoretical. The rule applied to pro applies here: the promise has to
    hold at the worst case, not the typical one.

    At $2.50 a long single session is 82% of the cap and two typical sessions
    ($2.95) still do not fit - so "one full trip a month, however much you edit
    it" is exactly the true claim, which is what the card says.

    **The margin cost is smaller than it looks.** 37% gross against 50% before,
    the same structure as pro - but this is a **ceiling, not an expectation**.
    Almost every subscriber plans one trip from a warm cache and costs a small
    fraction of it; the cap only ever binds on the heaviest, which is precisely
    who we would rather serve than block.
  */
  premium: 2.5,
  /*
    ## ₪89 → $12.00, and where every step of that comes from

    The revenue side, using exactly the method that produced the ₪19.90 figures
    above (it reproduces them to the agora, which is why it is trusted here):

      gross                     ₪89.00      ₪19.90
      less VAT (18%)            ₪75.42      ₪16.86
      less PayPal 3.4% + ₪1.20  ₪71.19      ₪14.98
      net, at ₪3.75/$           $19.00      $4.00

    The cost side, at the measured prices (COLD_TRIP_USD $0.53 for a full build
    including the cold cache write, HEAVY_TURN_USD $0.063 for a warm turn):

      a typical planning session = 1 build + 15 turns = $1.475
      a long one                 = 1 build + 24 turns = $2.040
      five typical                                      $7.38   61% of the cap
      five long                                         $10.20  85% of the cap
      eight typical                                     $11.80  98% - the real ceiling

    So $12.00 is 63% of net, i.e. **a 37% gross margin** where premium keeps
    50%. That is a deliberate difference and not an oversight: at ₪19.90 the
    fixed ₪1.20 payment fee alone is 9.4% of gross and the whole subscriber is
    worth $2.00 of margin, so prudence is cheap. At ₪89 the same fee is 4.8%,
    and 37% of $19 is **$7.00 of margin per subscriber - three and a half times
    what a premium subscriber yields in total.** A lower percentage on a much
    larger absolute number is the better business, and pretending otherwise
    would have meant selling a plan too thin for the person it is aimed at.

    Invisible to the user, like premium's. What the pro card promises is
    PRO_TRIPS_PER_MONTH, and that promise is sized to land at 85% of this
    number in the worst case - see the test.
  */
  pro: 12.0,
};

/**
 * Premium's cap under its historical name - `budget.ts` and the margin tests
 * read it, and it is the number the whole comment above compares against.
 */
export const SUBSCRIBER_MONTHLY_CAP_USD = SUBSCRIBER_CAP_USD.premium;

/**
 * The comparison rows on the premium page - derived from the real
 * quotas, not copied.
 *
 * **No dollar appears here, by explicit instruction** - only counts a
 * user understands: trips, chats, builds (a test locks this). A ₪
 * product price (the check) is allowed - that is a price, not a cost
 * cap.
 *
 * **The unit is written in each cell separately ("per day")** rather than
 * once in the label. It looks redundant while all three columns share the
 * daily window, and it is what stopped the columns being comparable the
 * last time they did not - see `periodMsFor`.
 *
 * The first two rows (the check, the shared trip) and the availability
 * row are not quotas - they are **the features** premium gives in the
 * first place: the check included, the shared trip (joining and voting
 * free for everyone - deliberately, that is the distribution channel),
 * and the agent on a personal lane that does not depend on the site's
 * shared daily load (see budget.ts).
 *
 * A third feature row, the trip story, was removed on 2026-08-17 when
 * that feature was retired - see the session log for why.
 */
export const PLAN_FEATURE_ROWS: { label: string; free: string; premium: string; pro: string }[] = [
  {
    label: 'בדיקה לפני הנסיעה',
    free: `${predepartureCheckPriceLabel()} לטיול`,
    premium: 'כלולה, בלי הגבלה',
    pro: 'כלולה, בלי הגבלה',
  },
  {
    // Named by what it does, not by what it is called: "shared trip" alone means
    // nothing to somebody who has not seen it, and the four verbs are the reason
    // to pay.
    label: 'טיול משותף - הצבעות, תגובות, הצעות מקומות ותאריכים',
    free: 'הצטרפות והשתתפות מלאה - בחינם',
    premium: 'יצירת קישור הזמנה לחברים',
    pro: 'יצירת קישור הזמנה לחברים',
  },
  {
    label: 'זמינות הסוכן החכם',
    free: 'משותפת - תלויה בעומס היומי באתר',
    premium: 'מסלול אישי מובטח - לא תלוי באף אחד אחר',
    pro: 'מסלול אישי מובטח - לא תלוי באף אחד אחר',
  },
  /*
    The capacity row - the honest headline of both paid tiers, and the row where
    they genuinely differ. Both cells now state a real number, sized so it holds
    at the WORST case rather than the typical one (see SUBSCRIBER_CAP_USD, and
    the tests that lock both).
  */
  {
    label: 'כמה אפשר לתכנן בחודש',
    free: 'מכסות יומיות משותפות עם כל המבקרים',
    premium: 'טיול מלא בחודש, כמה שתערכו אותו',
    pro: `עד ${PRO_TRIPS_PER_MONTH} טיולים מלאים בחודש, עם כל העריכות סביבם`,
  },
  /*
    Every row below is a count, and every count is now in the SAME unit on both
    sides - see the comment on PLAN_LIMITS.premium for what happens when it is
    not. `premiumIsNeverWorseThanFree` in the tests reads these numbers straight
    out of PLAN_LIMITS, so a row cannot describe an ordering the code does not
    have.
  */
  {
    label: 'שיחות עם הסוכן',
    free: `${PLAN_LIMITS.free.chatPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.chatPerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.chatPerDay} ביום`,
  },
  {
    label: 'בניית טיול מלא בשיחה',
    free: 'במסגרת המכסה היומית',
    premium: `עד ${TRIP_BUILDS_PER_DAY.premium} טיולים מלאים ביום`,
    pro: `עד ${TRIP_BUILDS_PER_DAY.pro} טיולים מלאים ביום`,
  },
  {
    label: 'בניות מסלול מהירות (שאלון/מתכנן)',
    free: `${PLAN_LIMITS.free.generatePerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.generatePerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.generatePerDay} ביום`,
  },
  {
    label: 'צירוף תמונות לשיחה (אישור הזמנה, כרטיס)',
    free: `${PLAN_LIMITS.free.imagesPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.imagesPerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.imagesPerDay} ביום`,
  },
  {
    label: 'בדיקות חיות (שעות פתיחה, מחיר כניסה)',
    free: `${PLAN_LIMITS.free.lookupsPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.lookupsPerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.lookupsPerDay} ביום`,
  },
  {
    label: 'ייבוא מפות מ-Google My Maps',
    free: `${PLAN_LIMITS.free.importsPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.importsPerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.importsPerDay} ביום`,
  },
  {
    label: 'קישורי שיתוף קצרים',
    free: `${PLAN_LIMITS.free.sharesPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.sharesPerDay} ביום`,
    pro: `${PLAN_LIMITS.pro.sharesPerDay} ביום`,
  },
];

