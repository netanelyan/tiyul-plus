import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { generateTrip } from '@/lib/trip/generate';
import { newId } from '@/lib/trip/types';
import type { Trip, TripDay, WizardPrefs } from '@/lib/trip/types';

/**
 * בניית טיול מטקסט חופשי ("ספרו לי על הטיול שלכם").
 *
 * POST { notes: string } → { trip, understood } או { error }.
 *
 * שני מצבים:
 * 1. עם ANTHROPIC_API_KEY - Claude מקבל את דאטת היעדים כ-grounding ומחזיר
 *    JSON קשיח (structured outputs). ולידציה בצד השרת היא חובה: מזהי מקומות
 *    שלא קיימים בדאטה נזרקים; אם ה-dayPlans שורדים - בונים מהם את הטיול,
 *    אחרת נופלים ל-generateTrip עם ההעדפות שחולצו.
 * 2. בלי מפתח - חילוץ מילות מפתח (ערים, ימים, כשר/טבע/שופינג/ילדים) ואז
 *    generateTrip, כך שהתיבה עובדת גם ללא מפתח.
 */

export const maxDuration = 60;

interface AiDayPlan {
  citySlug: string;
  placeIds: string[];
  notes: string;
}

interface AiTripPlan {
  citySlugs: string[];
  totalDays: number;
  pace: WizardPrefs['pace'];
  tripType: WizardPrefs['tripType'];
  shopping: WizardPrefs['shopping'];
  kosherOnly: boolean;
  interests: string[];
  tripName: string;
  dayPlans: AiDayPlan[];
}

const TRIP_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'citySlugs',
    'totalDays',
    'pace',
    'tripType',
    'shopping',
    'kosherOnly',
    'interests',
    'tripName',
    'dayPlans',
  ],
  properties: {
    citySlugs: { type: 'array', items: { type: 'string' } },
    totalDays: { type: 'integer' },
    pace: { type: 'string', enum: ['relaxed', 'packed'] },
    tripType: { type: 'string', enum: ['city', 'nature', 'combined'] },
    shopping: { type: 'string', enum: ['more', 'normal', 'less'] },
    kosherOnly: { type: 'boolean' },
    interests: { type: 'array', items: { type: 'string' } },
    tripName: { type: 'string' },
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

const SYSTEM_PROMPT = `You are the trip-builder of tiyul+ (טיול+), a Hebrew travel-planning site for Israeli travelers. You receive a free-text Hebrew description of a desired trip and return a structured trip plan as JSON.

RULES
- citySlugs may ONLY be slugs that exist in the DATA below. If the request names destinations not covered by the data, return an empty citySlugs array and an empty dayPlans array.
- totalDays: 1-21. Infer from the text ("שבוע" = 7, "שבועיים" = 14, "סופ״ש" = 3); default to 4 when unstated.
- dayPlans: one entry per day, in visit order. placeIds may ONLY be ids that exist in that city's places in the DATA - never invent ids. Order each day's stops in a sensible geographic flow. Respect the pace: relaxed ≈ 3-4 stops/day, packed ≈ 5-6. When kosherOnly is true, include one kosher-food place per day where the city has one. If you cannot build confident dayPlans, return an empty dayPlans array - the server will generate days from your extracted preferences instead.
- notes: one short, helpful Hebrew tip per day; empty string when you have none. Never state hours, prices, or kashrut facts that are not in the DATA.
- tripName: a short Hebrew name, e.g. "טיול משפחתי לוינה".
- interests: up to 4 short Hebrew phrases taken from the request (e.g. "עם ילדים", "אוהבים גלידה"). Empty array if none.
- Preferences are options, never assumptions: set kosherOnly, shopping and pace only from what the user stated or clearly implied ("עם ילדים קטנים" implies relaxed pace).

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

async function planWithClaude(notes: string): Promise<AiTripPlan | null> {
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
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: TRIP_PLAN_SCHEMA },
        },
        // כמו בצ׳אט: ה-grounding הוא הבלוק האחרון עם cache_control, כך שכל
        // הפרומפט הקבוע נכנס ל-prompt cache ובקשות חוזרות קוראות ממנו.
        system: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'text', text: buildGrounding(), cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: notes }],
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
    return JSON.parse(text) as AiTripPlan;
  } catch {
    return null; // כל כשל → נפילה חיננית לחילוץ מילות מפתח
  }
}

/* ---------- מצב ללא מפתח: חילוץ מילות מפתח ---------- */

function extractKeywords(notes: string): { prefs: WizardPrefs; interests: string[] } {
  const lower = notes.toLowerCase();
  const citySlugs: string[] = [];
  for (const d of destinations) {
    if (notes.includes(d.name) || lower.includes(d.slug)) citySlugs.push(d.slug);
  }
  for (const c of countries) {
    if (notes.includes(c.name) || lower.includes(c.slug)) {
      for (const d of destinations) {
        if (d.countrySlug === c.slug && !citySlugs.includes(d.slug)) citySlugs.push(d.slug);
      }
    }
  }

  let totalDays = 4;
  const daysMatch = notes.match(/(\d+)\s*(?:ימים|לילות)/);
  if (daysMatch) totalDays = Number(daysMatch[1]);
  else if (/שבועיים/.test(notes)) totalDays = 14;
  else if (/שבוע/.test(notes)) totalDays = 7;
  else if (/סופ[״"']?ש/.test(notes)) totalDays = 3;
  totalDays = Math.min(21, Math.max(1, totalDays));

  const hasKids = /ילד|משפח/.test(notes);
  const wantsNature = /טבע|פארק|הרים|ירוק|הליכות בטבע/.test(notes);
  const wantsCity = /מוזיאונ|היסטוריה|אדריכלות|עירוני|אמנות/.test(notes);
  const lessShopping = /בלי שופינג|בלי קניות|לא שופינג/.test(notes);
  const moreShopping = !lessShopping && /שופינג|קניות|קניונ/.test(notes);

  const prefs: WizardPrefs = {
    citySlugs,
    totalDays,
    pace: /דחוס|אינטנסיבי|לחוץ/.test(notes) ? 'packed' : 'relaxed',
    tripType: wantsNature && wantsCity ? 'combined' : wantsNature ? 'nature' : wantsCity ? 'city' : 'combined',
    shopping: moreShopping ? 'more' : lessShopping ? 'less' : 'normal',
    kosherOnly: /כשר|כשרות/.test(notes),
  };

  const interests: string[] = [];
  if (hasKids) interests.push('משפחה עם ילדים');
  return { prefs, interests };
}

/* ---------- ולידציה ובניית הטיול ---------- */

const PACES = new Set(['relaxed', 'packed']);
const TYPES = new Set(['city', 'nature', 'combined']);
const SHOPPING = new Set(['more', 'normal', 'less']);

function sanitizePlan(plan: AiTripPlan): {
  prefs: WizardPrefs;
  tripName: string | null;
  interests: string[];
  days: TripDay[];
} {
  const knownSlugs = new Set(destinations.map((d) => d.slug));
  const citySlugs = [...new Set(
    (Array.isArray(plan.citySlugs) ? plan.citySlugs : []).filter((s) => knownSlugs.has(s)),
  )];

  // ולידציית dayPlans - חובה: מזהה מקום שלא קיים בעיר שלו נזרק,
  // יום שנשאר בלי מקומות נזרק, ומקום לא משתבץ פעמיים בטיול.
  const usedPlaceIds = new Set<string>();
  const days: TripDay[] = [];
  for (const dp of Array.isArray(plan.dayPlans) ? plan.dayPlans : []) {
    const dest = destinations.find((d) => d.slug === dp?.citySlug);
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

  const daysCitySlugs = [...new Set(days.map((d) => d.citySlug))];
  const prefs: WizardPrefs = {
    citySlugs: citySlugs.length > 0 ? citySlugs : daysCitySlugs,
    totalDays: Math.min(21, Math.max(1, Math.round(Number(plan.totalDays)) || 4)),
    pace: PACES.has(plan.pace) ? plan.pace : 'relaxed',
    tripType: TYPES.has(plan.tripType) ? plan.tripType : 'combined',
    shopping: SHOPPING.has(plan.shopping) ? plan.shopping : 'normal',
    kosherOnly: plan.kosherOnly === true,
  };

  return {
    prefs,
    tripName:
      typeof plan.tripName === 'string' && plan.tripName.trim()
        ? plan.tripName.trim().slice(0, 60)
        : null,
    interests: (Array.isArray(plan.interests) ? plan.interests : [])
      .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
      .map((i) => i.trim().slice(0, 40))
      .slice(0, 4),
    days,
  };
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

function buildUnderstood(prefs: WizardPrefs, interests: string[]): string {
  const cityNames = prefs.citySlugs
    .map((slug) => destinations.find((d) => d.slug === slug)?.name)
    .filter(Boolean);
  const parts: string[] = [`${prefs.totalDays} ימים ב${cityNames.join(' + ')}`];
  parts.push(...interests);
  if (prefs.tripType === 'nature') parts.push('דגש טבע');
  if (prefs.tripType === 'city') parts.push('דגש עירוני');
  if (prefs.pace === 'packed') parts.push('קצב דחוס');
  if (prefs.shopping === 'more') parts.push('הרבה שופינג');
  if (prefs.shopping === 'less') parts.push('בלי שופינג');
  if (prefs.kosherOnly) parts.push('אוכל כשר');
  return `הבנתי: ${parts.join(', ')} - אפשר לשנות הכול`;
}

export async function POST(request: Request) {
  let notes = '';
  try {
    const body = (await request.json()) as { notes?: unknown };
    if (typeof body.notes === 'string') notes = body.notes.trim();
  } catch {
    /* גוף לא תקין → notes ריק */
  }
  if (!notes) {
    return Response.json({ error: 'ספרו לי קצת על הטיול - ואבנה אותו' }, { status: 400 });
  }

  const plan = process.env.ANTHROPIC_API_KEY ? await planWithClaude(notes.slice(0, 2000)) : null;
  const { prefs, tripName, interests, days } = plan
    ? sanitizePlan(plan)
    : { ...extractKeywords(notes), tripName: null, days: [] as TripDay[] };

  if (prefs.citySlugs.length === 0) {
    const cityNames = destinations.map((d) => `${d.flag} ${d.name}`).join(' · ');
    return Response.json({
      error: `לא זיהיתי יעד שיש לנו עליו דאטה אמיתית. היעדים שלנו כרגע: ${cityNames}. נסו לציין אחד מהם.`,
    });
  }

  const name = tripName ?? defaultTripName(prefs.citySlugs);

  // dayPlans ששרדו ולידציה → בונים מהם ישירות; אחרת האשף הקיים
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

  const understoodPrefs: WizardPrefs =
    days.length > 0 ? { ...prefs, totalDays: days.length, citySlugs: trip.citySlugs } : prefs;

  return Response.json({ trip, understood: buildUnderstood(understoodPrefs, interests) });
}
