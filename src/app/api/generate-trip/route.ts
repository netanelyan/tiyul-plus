import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { generateTrip } from '@/lib/trip/generate';
import { newId } from '@/lib/trip/types';
import type { Trip, TripDay, WizardPrefs } from '@/lib/trip/types';

/**
 * בניית טיול מהעדפות-כפתורים + טקסט חופשי אופציונלי.
 *
 * POST { prefs, party?, notes? } → { trip, understood } או { error }.
 *
 * ההעדפות מהכפתורים הן אילוצים קשיחים - עוברות ולידציה בשרת ולעולם לא
 * משתנות ע"י ה-AI. הטקסט החופשי (אם יש, ויש ANTHROPIC_API_KEY) משמש רק
 * לעידון: אילו מקומות, סדר, הערות ליום, שם הטיול. מזהי מקומות שלא קיימים
 * בדאטה נזרקים; אם ה-dayPlans לא שורדים ולידציה מלאה - נופלים ל-generateTrip.
 * בלי טקסט או בלי מפתח: generateTrip ישירות, כך שהכול עובד גם keyless.
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
- placeIds may ONLY be ids that exist for that day's city in the DATA below - never invent ids, and never repeat a place across the trip. Order each day's stops in a sensible geographic flow. Pace: relaxed ≈ 3-4 stops/day, packed ≈ 5-6. When kosherOnly is true, include one kosher-food place per day where the city has one. Shopping 'less' → avoid shopping-category places; 'more' → include more of them.
- Honor the free text when choosing places: exclusions ("בלי מוזיאונים"), children's ages, likes and dislikes. Work relevant tips into the day notes. Never state hours, prices, or kashrut facts that are not in the DATA.
- notes: one short, helpful Hebrew tip per day; empty string when you have none.
- tripName: a short Hebrew name, e.g. "טיול משפחתי לוינה".
- interests: up to 4 short Hebrew phrases summarizing what you took from the free text (e.g. "בלי מוזיאונים", "ילדים בני 4 ו-7"). Empty array when the text added nothing.
- If you cannot build confident dayPlans, return an empty dayPlans array - the server will generate the days from the constraints instead.

DATA (cities, their places and ready-made itineraries):
`;

function buildGrounding(): string {
  return JSON.stringify(
    destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      country: countries.find((c) => c.slug === d.countrySlug)?.name,
      places: d.places.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        durationMin: p.durationMin,
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
        model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
        max_tokens: 3000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: REFINE_SCHEMA },
        },
        // כמו בצ׳אט: ה-grounding הוא הבלוק האחרון עם cache_control - הפרומפט
        // הקבוע נכנס ל-prompt cache, והאילוצים המשתנים יושבים בהודעת המשתמש.
        system: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'text', text: buildGrounding(), cache_control: { type: 'ephemeral' } },
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
    };
    if (data.stop_reason === 'refusal') return null;
    const text = data.content?.find((b) => b.type === 'text')?.text;
    if (!text) return null;
    return JSON.parse(text) as AiRefinement;
  } catch {
    return null; // כל כשל → נפילה חיננית ל-generateTrip
  }
}

/* ---------- ולידציה ---------- */

const PACES = new Set(['relaxed', 'packed']);
const TYPES = new Set(['city', 'nature', 'combined']);
const SHOPPING = new Set(['more', 'normal', 'less']);
const PARTIES = new Set<Party>(['couple', 'family', 'friends', 'solo']);

/** העדפות הכפתורים מהלקוח - האילוצים הקשיחים. null כשאין אף עיר תקפה. */
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
 * ולידציית ה-dayPlans מה-AI מול האילוצים - חובה: עיר שלא נבחרה, מזהה מקום
 * שלא קיים בעיר שלו, או מקום שחוזר - נזרקים. משתמשים בתוצאה רק אם נשארו
 * בדיוק totalDays ימים; אחרת generateTrip.
 */
function validateDayPlans(dayPlans: AiDayPlan[], prefs: WizardPrefs): TripDay[] {
  const allowedCities = new Set(prefs.citySlugs);
  const usedPlaceIds = new Set<string>();
  const days: TripDay[] = [];
  for (const dp of Array.isArray(dayPlans) ? dayPlans : []) {
    if (!allowedCities.has(dp?.citySlug)) continue;
    const dest = destinations.find((d) => d.slug === dp.citySlug);
    if (!dest) continue;
    const placeIds = (Array.isArray(dp.placeIds) ? dp.placeIds : []).filter(
      (id) => dest.places.some((p) => p.id === id) && !usedPlaceIds.has(id),
    );
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
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* גוף לא תקין → prefs חסרות */
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

  if (notes && process.env.ANTHROPIC_API_KEY) {
    const refinement = await refineWithClaude(notes, prefs, party);
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
  const trip: Trip =
    days.length > 0
      ? {
          id: newId(),
          name,
          citySlugs: [...new Set(days.map((d) => d.citySlug))],
          days,
          createdAt: Date.now(),
        }
      : generateTrip(prefs, destinations, name);

  return Response.json({ trip, understood: buildUnderstood(prefs, party, interests) });
}
