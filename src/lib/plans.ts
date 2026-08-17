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

export type Plan = 'free' | 'premium';

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
  if (!row || row.plan !== 'premium') return 'free';
  if (!row.plan_until) return 'premium';
  const until = Date.parse(row.plan_until);
  if (Number.isNaN(until)) return 'premium'; // a corrupt date must not revoke a subscription already paid for
  return until > now ? 'premium' : 'free';
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
const MONTH_MS = 30 * DAY_MS;

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
export const periodMsFor = (tier: Tier): number => (tier === 'premium' ? MONTH_MS : DAY_MS);

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
    Premium. **Monthly numbers, and all of them together must fit under
    the internal dollar cap - with margin.** That is Netanel's
    requirement, word for word: "if someone is cut off by the dollar cap
    while the page told them they had trips remaining - that's a broken
    promise and a refund."

    The logic is inverted from the previous version: before, the visible
    numbers were a "high soft ceiling" and the dollars were supposed to
    bind first. Now **the visible quotas always bind first**, and the
    dollar cap ($2.00, SUBSCRIBER_MONTHLY_CAP_USD, invisible to the user)
    binds only on abnormal usage that bypasses the ordinary shape of the
    quotas (e.g. a single turn running an expensive tool loop - already
    blocked at $1.5 per turn by MAX_TURN_USD).

    ## The worst-realistic arithmetic, against the $2.00 cap (a test locks this):

    | what                          | qty | worst price | total   |
    |-------------------------------|-----|-------------|---------|
    | full trip build (cold cache)  | 2   | $0.53       | $1.06   |
    | remaining chats (warm Sonnet) | 8   | $0.063      | $0.504  |
    | quick builds (Haiku)          | 5   | $0.02       | $0.10   |
    | live lookups                  | 5   | $0.01       | $0.05   |
    | image add-on (within chats)   | 5   | $0.01       | $0.05   |
    | **worst-realistic total**     |     |             | **$1.76** |

    88% of the cap. At typical pricing (warm cache, light routing) the
    same full consumption is ~$0.6-0.9, i.e. 30-45% of the cap. The
    margin ($0.24) absorbs ~half a stray cold call; more than that in a
    month means our cache warmer was down.

    **Netanel's number ("5 full trips per month") does not fit under $2**:
    5×$0.53=$2.65 on the builds alone, before a single message. Displaying
    5 trips honestly would need a cap around ~$3.5-4. The numbers here are
    the maximum that fits with margin under the cap he asked to keep
    exactly as it is.

    Fields with no AI cost (imports, shares, explores, geocodes) stay
    generous - they are not part of the arithmetic.
  */
  premium: {
    chatPerDay: 10,
    chatBurstPerMin: 15,
    aiUnitsPerDay: 1_000_000,
    generatePerDay: 5,
    sharesPerDay: 60,
    importsPerDay: 30,
    imagesPerDay: 5,
    exploresPerDay: 150,
    geocodesPerDay: 200,
    lookupsPerDay: 5,
  },
};

/**
 * How many **full trip builds** (create_trip_full in a conversation) a
 * subscriber is allowed per month. Counted **inside** the chat quota (a
 * build is a chat), but capped separately because a full build costs
 * ~8x an edit chat ($0.53 vs $0.063) - without this limit, 10 chats
 * that are all builds would be $5.30, far above the cap. Enforced by a
 * dedicated gate in chat/route.ts that is consumed only on a build
 * **that succeeded** (peekUsed + checkLimit), so an attempt that failed
 * validation does not burn quota.
 */
export const PREMIUM_TRIP_BUILDS_PER_MONTH = 2;

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
export const SUBSCRIBER_MONTHLY_CAP_USD = 2.0;

/**
 * The comparison rows on the premium page - derived from the real
 * quotas, not copied.
 *
 * **No dollar appears here, by explicit instruction** - only counts a
 * user understands: trips, chats, builds (a test locks this). A ₪
 * product price (the check) is allowed - that is a price, not a cost
 * cap.
 *
 * **The unit is written in each cell separately ("per day"/"per
 * month")**, because since premium moved to a monthly window
 * (`periodMsFor`) the two sides of the same row no longer share a
 * period.
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
export const PLAN_FEATURE_ROWS: { label: string; free: string; premium: string }[] = [
  {
    label: 'בדיקה לפני הנסיעה',
    free: `${predepartureCheckPriceLabel()} לטיול`,
    premium: 'כלולה, בלי הגבלה',
  },
  {
    label: 'טיול משותף - חברים רואים את הטיול ומצביעים',
    free: 'הצטרפות והצבעה בחינם',
    premium: 'יצירת קישור הזמנה לחברים',
  },
  {
    label: 'שיחות עם הסוכן',
    free: `${PLAN_LIMITS.free.chatPerDay} ביום, לפי הזמינות המשותפת`,
    premium: `${PLAN_LIMITS.premium.chatPerDay} בחודש במסלול המובטח`,
  },
  {
    label: 'בניית טיול מלא בשיחה',
    free: 'במסגרת המכסה היומית',
    premium: `עד ${PREMIUM_TRIP_BUILDS_PER_MONTH} טיולים מלאים בחודש`,
  },
  /*
    The "guaranteed lane" row sits after the quotas, not at the top -
    Netanel's instruction: this advantage is real but invisible until
    there is traffic exhausting the daily budget, and pre-launch that is
    nobody. It stays in the table because it is true; it is simply not
    the headline.
  */
  {
    label: 'זמינות הסוכן החכם',
    free: 'משותפת - תלויה בעומס היומי באתר',
    premium: 'מסלול אישי מובטח - לא תלוי באף אחד אחר',
  },
  {
    label: 'בניות מסלול מהירות (שאלון/מתכנן)',
    free: `${PLAN_LIMITS.free.generatePerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.generatePerDay} בחודש`,
  },
  {
    label: 'צירוף תמונות לשיחה (אישור הזמנה, כרטיס)',
    free: `${PLAN_LIMITS.free.imagesPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.imagesPerDay} בחודש`,
  },
  {
    label: 'ייבוא מפות מ-Google My Maps',
    free: `${PLAN_LIMITS.free.importsPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.importsPerDay} בחודש`,
  },
  {
    label: 'קישורי שיתוף קצרים',
    free: `${PLAN_LIMITS.free.sharesPerDay} ביום`,
    premium: `${PLAN_LIMITS.premium.sharesPerDay} בחודש`,
  },
];
