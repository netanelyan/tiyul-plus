import { destinations } from '@/data/destinations';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import { countries } from '@/data/countries';
import { generateTrip } from '@/lib/trip/generate';
import { newId } from '@/lib/trip/types';
import type { Trip, TripDay, TripPreferences, WizardPrefs } from '@/lib/trip/types';
import { checkLimit, aiUnitsUsedToday, recordAiUnits } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { PLAN_LIMITS, aiUnits, paidPlanOf, periodMsFor } from '@/lib/plans';
import { budgetFor, maybeAlert, maybeAlertPremium, monthKey, premiumBudgetFor, recordSpend } from '@/lib/server/budget';
import { sameOriginOk } from '@/lib/server/chatGuards';

/**
 * Building a trip from button preferences + optional free text.
 *
 * POST { prefs, party?, notes? } → { trip, understood } or { error }.
 *
 * The button preferences are hard constraints - validated on the server and
 * never changed by the AI. The free text (if present, and ANTHROPIC_API_KEY
 * exists) is used only for refinement: which places, order, day notes, trip
 * name. Place ids that do not exist in the data are dropped; if the dayPlans
 * do not survive full validation - we fall back to generateTrip. Without
 * text or without a key: generateTrip directly, so everything works keyless
 * too.
 */

export const maxDuration = 60;

type Party = 'couple' | 'family' | 'friends' | 'solo';

interface AiDayPlan {
  citySlug: string;
  placeIds: string[];
  notes: string;
}

interface AiRefinement {
  tripName: string;
  interests: string[];
  dayPlans: AiDayPlan[];
}

const REFINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tripName', 'interests', 'dayPlans'],
  properties: {
    tripName: { type: 'string' },
    interests: { type: 'array', items: { type: 'string' } },
    dayPlans: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['citySlug', 'placeIds', 'notes'],
        properties: {
          citySlug: { type: 'string' },
          placeIds: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the trip-builder of tiyul+ (טיול+), a Hebrew travel-planning site for Israeli travelers. The user configured their trip with buttons - those choices arrive as CONSTRAINTS and are final. They also wrote optional free text. Your job is refinement only: pick the places, order the days, write day notes and a trip name - all WITHIN the constraints.

RULES
- The CONSTRAINTS are hard: never change the cities, number of days, pace, trip type, shopping level or kosher setting. The free text only refines choices within them.
- dayPlans: exactly totalDays entries, in visit order. Every day's citySlug must be one of the constraint citySlugs; keep each city's days consecutive, cities in the given order, days split as evenly as possible between cities.
- placeIds may ONLY be ids that exist for that day's city in the DATA below - never invent ids, and never repeat a place across the trip. Order each day's stops in a sensible geographic flow. Pace: relaxed ≈ 3-4 stops/day, packed ≈ 5-6. When kosherOnly is true, include one kosher-food place per day where the city has one. When kosherOnly is FALSE, do NOT include any kosher-food or kosher-market place at all - kosher is an opt-in preference, never an assumption (any that slip through are stripped server-side). Shopping 'less' → avoid shopping-category places; 'more' → include more of them.
- Honor the free text when choosing places: exclusions ("בלי מוזיאונים"), children's ages, likes and dislikes. Work relevant tips into the day notes. Never state hours, prices, or kashrut facts that are not in the DATA.
- notes: one short, helpful Hebrew tip per day; empty string when you have none.
- tripName: a short Hebrew name, e.g. "טיול משפחתי לוינה".
- interests: up to 4 short Hebrew phrases summarizing what you took from the free text (e.g. "בלי מוזיאונים", "ילדים בני 4 ו-7"). Empty array when the text added nothing.
- If you cannot build confident dayPlans, return an empty dayPlans array - the server will generate the days from the constraints instead.

DATA (cities, their places and ready-made itineraries):
`;

/**
 * Only the cities the user chose with the buttons. The choice is a hard
 * constraint also enforced by server-side validation, so sending all 47
 * cities is a net waste: it inflated the input to tens of thousands of
 * tokens and slowed the request without adding any capability.
 */
function buildGrounding(citySlugs: string[]): string {
  const chosen = destinations.filter((d) => citySlugs.includes(d.slug));
  return JSON.stringify(
    (chosen.length > 0 ? chosen : destinations).map((d) => ({
      slug: d.slug,
      name: d.name,
      country: countries.find((c) => c.slug === d.countrySlug)?.name,
      places: d.places.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        durationMin: p.durationMin,
        ...(p.tags?.length ? { tags: p.tags } : {}),
        ...(p.priceLevel !== undefined ? { priceLevel: p.priceLevel } : {}),
        ...(p.mustSee ? { mustSee: true } : {}),
      })),
      itinerary: d.itinerary.map((day) => ({ title: day.title, placeIds: day.placeIds })),
    })),
  );
}

const PARTY_PROMPT: Record<Party, string> = {
  couple: 'a couple',
  family: 'a family with kids',
  friends: 'a group of friends',
  solo: 'a solo traveler',
};

async function refineWithClaude(
  notes: string,
  prefs: WizardPrefs,
  party: Party | null,
  meter: { units: number; usage: Record<string, number>; model: string },
): Promise<AiRefinement | null> {
  const constraints = {
    citySlugs: prefs.citySlugs,
    totalDays: prefs.totalDays,
    pace: prefs.pace,
    tripType: prefs.tripType,
    shopping: prefs.shopping,
    kosherOnly: prefs.kosherOnly,
    party: party ? PARTY_PROMPT[party] : 'unspecified',
  };
  const model = process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        // A one-shot structured task → the fast/cheap model (model routing by task)
        model,
        max_tokens: 3000,
        // No thinking/effort - haiku-4-5 does not support them; structured outputs is enough
        output_config: {
          format: { type: 'json_schema', schema: REFINE_SCHEMA },
        },
        // Like in the chat: the grounding is the last block with cache_control - the
        // constant prompt goes into the prompt cache, and the varying constraints sit in the user message.
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: buildGrounding(prefs.citySlugs) },
        ],
        messages: [
          {
            role: 'user',
            content: `CONSTRAINTS (fixed by the user's buttons):\n${JSON.stringify(constraints)}\n\nFREE TEXT from the user:\n${notes}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stop_reason?: string;
      content?: { type: string; text?: string }[];
      usage?: {
        input_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
        output_tokens?: number;
      };
    };
    meter.units += aiUnits(data.usage ?? {});
    // The usage is kept on the meter so the caller can record real cost in dollars
    meter.usage = { ...(data.usage ?? {}) };
    meter.model = model;
    if (process.env.NODE_ENV === 'development' || process.env.CHAT_USAGE_LOG === 'on') {
      const u = data.usage ?? {};
      console.log(
        `[generate-trip] in=${u.input_tokens ?? 0} cached=${u.cache_read_input_tokens ?? 0} cacheWrite=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens ?? 0}`,
      );
    }
    if (data.stop_reason === 'refusal') return null;
    const text = data.content?.find((b) => b.type === 'text')?.text;
    if (!text) return null;
    return JSON.parse(text) as AiRefinement;
  } catch {
    return null; // any failure → graceful fallback to generateTrip
  }
}

/* ---------- Validation ---------- */

const PACES = new Set(['relaxed', 'packed']);
const TYPES = new Set(['city', 'nature', 'combined']);
const SHOPPING = new Set(['more', 'normal', 'less']);
const PARTIES = new Set<Party>(['couple', 'family', 'friends', 'solo']);

/** The client's button preferences - the hard constraints. null when no valid city exists. */
function sanitizeClientPrefs(raw: unknown): WizardPrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const known = new Set(destinations.map((d) => d.slug));
  const citySlugs = [...new Set(
    (Array.isArray(r.citySlugs) ? r.citySlugs : []).filter(
      (s): s is string => typeof s === 'string' && known.has(s),
    ),
  )];
  if (citySlugs.length === 0) return null;
  return {
    citySlugs,
    totalDays: Math.min(21, Math.max(1, Math.round(Number(r.totalDays)) || 4)),
    pace: PACES.has(r.pace as string) ? (r.pace as WizardPrefs['pace']) : 'relaxed',
    tripType: TYPES.has(r.tripType as string) ? (r.tripType as WizardPrefs['tripType']) : 'combined',
    shopping: SHOPPING.has(r.shopping as string) ? (r.shopping as WizardPrefs['shopping']) : 'normal',
    kosherOnly: r.kosherOnly === true,
  };
}

/**
 * Validating the AI's dayPlans against the constraints - mandatory: a city
 * that was not chosen, a place id that does not exist in its city, or a
 * repeated place - all dropped. The result is used only if exactly
 * totalDays days remain; otherwise generateTrip.
 */
function validateDayPlans(dayPlans: AiDayPlan[], prefs: WizardPrefs): TripDay[] {
  const allowedCities = new Set(prefs.citySlugs);
  const usedPlaceIds = new Set<string>();
  const days: TripDay[] = [];
  for (const dp of Array.isArray(dayPlans) ? dayPlans : []) {
    if (!allowedCities.has(dp?.citySlug)) continue;
    const dest = destinations.find((d) => d.slug === dp.citySlug);
    if (!dest) continue;
    // Kashrut is opt-in only: if the user did not ask, kosher places are dropped
    // here on the server side - even if the model scheduled them anyway.
    const placeIds = (Array.isArray(dp.placeIds) ? dp.placeIds : []).filter((id) => {
      const place = dest.places.find((p) => p.id === id);
      if (!place || usedPlaceIds.has(id)) return false;
      if (!prefs.kosherOnly && isKosher(place.category)) return false;
      // The reverse, and no less important: a kosher-keeping traveler does not get
      // a non-kosher eating place - even if the model scheduled it anyway.
      // 'unknown' is blocked exactly like 'not-kosher'.
      if (prefs.kosherOnly && isEating(place.category) && kosherStatusOf(place) !== 'kosher') return false;
      return true;
    });
    if (placeIds.length === 0) continue;
    placeIds.forEach((id) => usedPlaceIds.add(id));
    days.push({
      id: newId(),
      citySlug: dest.slug,
      placeIds,
      notes: typeof dp.notes === 'string' && dp.notes.trim() ? dp.notes.trim().slice(0, 200) : undefined,
    });
  }
  return days.length === prefs.totalDays ? days : [];
}

function defaultTripName(citySlugs: string[]): string {
  const chosen = destinations.filter((d) => citySlugs.includes(d.slug));
  const countrySlugs = [...new Set(chosen.map((d) => d.countrySlug))];
  const singleCountry =
    chosen.length > 1 && countrySlugs.length === 1
      ? countries.find((c) => c.slug === countrySlugs[0])
      : undefined;
  return singleCountry
    ? `טיול ל${singleCountry.name}`
    : `טיול ל${chosen.map((d) => d.name).join(' + ')}`;
}

const PARTY_ACK: Record<Party, string> = {
  couple: 'לזוג',
  family: 'למשפחה',
  friends: 'לחברים',
  solo: 'סולו',
};

function buildUnderstood(prefs: WizardPrefs, party: Party | null, interests: string[]): string {
  const cityNames = prefs.citySlugs
    .map((slug) => destinations.find((d) => d.slug === slug)?.name)
    .filter(Boolean);
  let head = `${prefs.totalDays} ימים ב${cityNames.join(' + ')}`;
  if (party) head += ` ${PARTY_ACK[party]}`;
  const parts: string[] = [head];
  if (prefs.tripType === 'nature') parts.push('דגש טבע');
  if (prefs.tripType === 'city') parts.push('דגש עירוני');
  if (prefs.pace === 'packed') parts.push('קצב דחוס');
  if (prefs.shopping === 'more') parts.push('הרבה שופינג');
  if (prefs.shopping === 'less') parts.push('בלי שופינג');
  if (prefs.kosherOnly) parts.push('אוכל כשר');
  parts.push(...interests);
  return `${parts.join(', ')} - הבנתי`;
}

export async function POST(request: Request) {
  // Quotas: burst → 429; daily quota → building keeps working but without the
  // AI refinement (the local generateTrip is free and cannot be expensively flooded).
  if (!sameOriginOk(request)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  const caller = await resolveCaller(request);
  const limits = PLAN_LIMITS[caller.tier];
  const burst = checkLimit('generate-burst', caller.id, 5, 60_000);
  if (!burst.ok) {
    return Response.json(
      { error: 'יותר מדי בקשות ברצף - נסו שוב בעוד רגע' },
      { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } },
    );
  }
  // Ordinal, not equality - see paidPlanOf. An `=== 'premium'` here would have
  // pushed a pro subscriber back into the shared anonymous/free daily budget.
  const paidPlan = paidPlanOf(caller);
  const isPremium = paidPlan !== null;
  const daily = checkLimit('generate-day', caller.id, limits.generatePerDay, periodMsFor());
  const unitsUsed = process.env.ANTHROPIC_API_KEY ? await aiUnitsUsedToday(caller.id) : 0;
  /*
    The global spending ceiling applies here too. The effect on the traveler
    is **effectively zero**: building continues through the local
    `generateTrip`, exactly like any other state in which the refinement is
    unavailable. What is stopped is the model call.

    A premium subscriber is checked only against `premiumBudgetFor` - their
    personal monthly ceiling - and not against `budgetFor` (the shared daily
    budget of anonymous/free), for exactly the same reason as in /api/chat.
  */
  let budgetExceeded = false;
  if (process.env.ANTHROPIC_API_KEY) {
    if (isPremium) {
      const premiumBudget = await premiumBudgetFor(caller.userId!, paidPlan!);
      budgetExceeded = premiumBudget.exceeded;
      maybeAlertPremium(premiumBudget, caller.userId!, monthKey());
    } else {
      const budget = await budgetFor(caller.id);
      budgetExceeded = budget.exceeded;
      void maybeAlert(budget, caller.id);
    }
  }
  const aiAllowed = daily.ok && unitsUsed < limits.aiUnitsPerDay && !budgetExceeded;

  // Read as text first and block a huge body before JSON.parse - the same
  // protection /api/chat has. Without it the server can be kept busy parsing megabytes.
  let body: Record<string, unknown> = {};
  const rawBody = await request.text();
  if (rawBody.length > 20_000) {
    return Response.json({ error: 'הבקשה גדולה מדי - נסו לקצר את התיאור' }, { status: 413 });
  }
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    /* invalid body → missing prefs */
  }

  const prefs = sanitizeClientPrefs(body.prefs);
  if (!prefs) {
    return Response.json({ error: 'בחרו לפחות עיר אחת - ואבנה את הטיול' }, { status: 400 });
  }
  const party: Party | null = PARTIES.has(body.party as Party) ? (body.party as Party) : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';

  let tripName: string | null = null;
  let interests: string[] = [];
  let days: TripDay[] = [];

  if (notes && process.env.ANTHROPIC_API_KEY && aiAllowed) {
    const meter = { units: 0, usage: {} as Record<string, number>, model: '' };
    const refinement = await refineWithClaude(notes, prefs, party, meter);
    recordAiUnits(caller.id, meter.units);
    recordSpend({
      identity: caller.id,
      userId: caller.userId,
      tripId: null,
      route: 'generate-trip',
      model: meter.model,
      usage: meter.usage,
      premium: isPremium,
    });
    if (refinement) {
      days = validateDayPlans(refinement.dayPlans, prefs);
      tripName =
        typeof refinement.tripName === 'string' && refinement.tripName.trim()
          ? refinement.tripName.trim().slice(0, 60)
          : null;
      interests = (Array.isArray(refinement.interests) ? refinement.interests : [])
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .map((i) => i.trim().slice(0, 40))
        .slice(0, 4);
    }
  }

  const name = tripName ?? defaultTripName(prefs.citySlugs);
  // The preferences are stored on the trip - the agent and the planner will keep honoring them
  const tripPreferences: TripPreferences = {
    pace: prefs.pace,
    shopping: prefs.shopping,
    ...(party ? { party } : {}),
    ...(prefs.kosherOnly ? { kosher: true } : {}),
    ...(interests.length > 0 ? { interests } : {}),
  };
  const trip: Trip =
    days.length > 0
      ? {
          id: newId(),
          name,
          citySlugs: [...new Set(days.map((d) => d.citySlug))],
          days,
          createdAt: Date.now(),
          preferences: tripPreferences,
        }
      : generateTrip(prefs, destinations, name, tripPreferences);

  // Over the quota the trip is still built (the local build is free), but the
  // traveler's free text is **not** read - and that must be said. "We built you
  // a trip" without saying the free-text request was not taken into account is
  // exactly the kind of silence that reads as a bug.
  const notice =
    notes && !aiAllowed
      ? 'הגעתם למכסת ה-AI היומית, ולכן בניתי את המסלול מהבחירות שסימנתם בלבד - הטקסט החופשי לא נקרא הפעם. המכסה מתאפסת פעם ביום, ואפשר לערוך את המסלול ידנית או להמשיך עם הסוכן מחר.'
      : undefined;
  return Response.json({
    trip,
    understood: buildUnderstood(prefs, party, interests),
    ...(notice ? { notice } : {}),
  });
}
