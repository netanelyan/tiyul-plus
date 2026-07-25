import { destinations } from '@/data/destinations';
import { isKosher } from '@/lib/categories';
import { haversineKm } from './travel';
import { newId } from './types';
import type { BookingKind, BookingStatus, Trip, TripDay, TripPreferences } from './types';
import type { Destination } from '@/lib/types';

/**
 * כלי הסוכן: הגדרות ה-tools של Anthropic + מבצע צד-שרת עם ולידציה קשיחה.
 * הסוכן עובד על עותק בזיכרון של הטיול; כל קריאה לא-חוקית מחזירה שגיאה
 * מוסברת (is_error) כדי שהמודל יתקן את עצמו. placeId חייב להתקיים בדאטה
 * של העיר, אינדקסים 1-based כפי שמוצג למשתמש ולמודל.
 */

export interface AgentToolResult {
  trip: Trip | null; // הטיול אחרי הפעולה (או ללא שינוי בכישלון)
  ok: boolean;
  message: string; // תוכן ה-tool_result שהמודל רואה
  action?: string; // שורת "מה בוצע" בעברית למשתמש
  quickReplies?: string[]; // תשובות מהירות להצגה כצ׳יפים (suggest_quick_replies)
}

const dayNumberSchema = {
  type: 'integer',
  description: 'Day number, 1-based, exactly as shown in CURRENT TRIP',
};

export const AGENT_TOOLS = [
  {
    name: 'create_trip',
    description:
      'Create a NEW empty trip and make it the active trip. Use only when the user asks for a new trip or no trip exists. citySlugs sets the visit order of cities (slugs from the DATA only). The trip starts with zero days - add days with add_day and places with add_place.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short Hebrew trip name' },
        citySlugs: {
          type: 'array',
          items: { type: 'string' },
          description: 'City slugs from the DATA, in visit order',
        },
      },
      required: ['name', 'citySlugs'],
    },
  },
  {
    name: 'create_trip_full',
    description:
      "Create a complete NEW trip in ONE call: name + every day with its places. PREFER THIS over create_trip when building a new trip - it is atomic and cheap. Each dayPlans entry becomes one day, in visit order. placeIds must exist in the DATA for that day's city, and a place may appear only once in the whole trip. The call fails as a whole if anything is invalid - fix and retry.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short Hebrew trip name' },
        dayPlans: {
          type: 'array',
          description: 'One entry per day, in visit order',
          items: {
            type: 'object',
            properties: {
              citySlug: { type: 'string', description: 'City slug from the DATA' },
              placeIds: {
                type: 'array',
                items: { type: 'string' },
                description: "Ordered stops - ids from the DATA for that day's city",
              },
              notes: { type: 'string', description: 'Optional short Hebrew tip for the day' },
            },
            required: ['citySlug', 'placeIds'],
          },
        },
      },
      required: ['name', 'dayPlans'],
    },
  },
  {
    name: 'set_day_places',
    description:
      "Replace ALL stops of one day in a single call - use it to fill an empty day or reorder wholesale. placeIds must exist in the DATA for that day's city and must not already be used in another day. An empty array clears the day.",
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        placeIds: {
          type: 'array',
          items: { type: 'string' },
          description: "Ordered stops - ids from the DATA for that day's city",
        },
      },
      required: ['dayNumber', 'placeIds'],
    },
  },
  {
    name: 'explore_destination',
    description:
      "The user asks about a destination that is NOT in the DATA (no matching city slug). Call this ONCE with the destination name to auto-explore it from public sources (Wikipedia). On success you get an ephemeral city (slug starts with 'explored-') with real places you may then use in the trip tools like any other city. The results are UNVERIFIED - always tell the user this destination was auto-explored and details must be double-checked. If exploration fails, say honestly the destination is not covered. Never call this for cities that ARE in the DATA.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The destination/city name exactly as the user said it (Hebrew or English)',
        },
        scope: {
          type: 'string',
          enum: ['city', 'area'],
          description:
            "'city' = the city itself (~10km). 'area' = the city PLUS everything within driving range (~45km) - use it whenever the travelers have or want a rental car, or ask about day trips, nature, villages or sites outside the city. Never assume a car: if the trip's booking.car is 'have' or 'need', or the user mentioned driving, prefer 'area'. Defaults to the trip's car status.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_quick_replies',
    description:
      'Attach 2-4 short Hebrew tappable answer options to a NON-sensitive clarifying question you are asking in this same reply (pace, number of days, destination, who is traveling). They render as chips under your message. NEVER use this for kashrut, Shabbat or any religious or private matter.',
    input_schema: {
      type: 'object',
      properties: {
        replies: {
          type: 'array',
          items: { type: 'string' },
          description: '2-4 short Hebrew options, each a complete answer',
        },
      },
      required: ['replies'],
    },
  },
  {
    name: 'add_day',
    description:
      'Append a new empty day in the given city to the end of the active trip. Returns the new day number. For NEW trips prefer create_trip_full; never leave an added day empty - fill it with set_day_places in the same turn.',
    input_schema: {
      type: 'object',
      properties: {
        citySlug: { type: 'string', description: 'City slug from the DATA' },
      },
      required: ['citySlug'],
    },
  },
  {
    name: 'remove_day',
    description:
      'Remove a whole day from the active trip. DESTRUCTIVE - ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: { dayNumber: dayNumberSchema },
      required: ['dayNumber'],
    },
  },
  {
    name: 'add_place',
    description:
      "Add a place as the last stop of a day. placeId must be an id that exists in the DATA for that day's city - never invent ids.",
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        placeId: { type: 'string', description: "Place id from the DATA for that day's city" },
      },
      required: ['dayNumber', 'placeId'],
    },
  },
  {
    name: 'remove_place',
    description: 'Remove a stop from a day.',
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        placeId: { type: 'string' },
      },
      required: ['dayNumber', 'placeId'],
    },
  },
  {
    name: 'move_place',
    description:
      'Reorder stops within a day: move the stop at position fromPos to position toPos (both 1-based).',
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        fromPos: { type: 'integer', description: '1-based current position' },
        toPos: { type: 'integer', description: '1-based target position' },
      },
      required: ['dayNumber', 'fromPos', 'toPos'],
    },
  },
  {
    name: 'set_day_notes',
    description: "Set (replace) the free-text Hebrew notes of a day. Empty string clears them.",
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        notes: { type: 'string', description: 'Hebrew notes, short' },
      },
      required: ['dayNumber', 'notes'],
    },
  },
  {
    name: 'rename_trip',
    description: 'Rename the active trip.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'New Hebrew name' } },
      required: ['name'],
    },
  },
  {
    name: 'set_preferences',
    description:
      'Store traveler preferences on the active trip. Set ONLY fields the user actually stated - never assume. These persist with the trip and must guide your recommendations (e.g. kosher=true → prefer kosher food places and always remind to verify kashrut).',
    input_schema: {
      type: 'object',
      properties: {
        party: { type: 'string', enum: ['couple', 'family', 'friends', 'solo'] },
        pace: { type: 'string', enum: ['relaxed', 'packed'] },
        budget: { type: 'string', enum: ['low', 'medium', 'high'] },
        kosher: { type: 'boolean' },
        shabbatAware: { type: 'boolean' },
        shopping: { type: 'string', enum: ['more', 'normal', 'less'] },
        interests: { type: 'array', items: { type: 'string' }, description: 'Short Hebrew phrases' },
      },
    },
  },
  {
    name: 'set_booking_status',
    description:
      "Record what the traveler has ALREADY arranged and what they still need, per booking type. Set a field ONLY when the user actually said so - never assume, never guess from the itinerary. 'have' = already booked, 'need' = still needs it, 'not_needed' = irrelevant for this trip. You must NEVER output a booking URL, price, availability or provider name in your reply: the app attaches the real link itself from its own affiliate config. Your job is only to notice what is missing and record the answer.",
    input_schema: {
      type: 'object',
      properties: {
        flights: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        stay: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        activities: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        esim: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        insurance: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        car: { type: 'string', enum: ['have', 'need', 'not_needed'] },
      },
    },
  },
];

/* ---------- ביצוע ---------- */

/**
 * יעדים שנחקרו אוטומטית (AI Explorer) - נקבעים פר-קריאה ע"י route.ts.
 * executeAgentTool סינכרוני, אז אין מרוץ: ההשמה בתחילת כל קריאה תקפה
 * לכל אורך הביצוע. curated תמיד קודם - explored לא יכול להאפיל על עיר
 * אמיתית מהקטלוג.
 */
let sessionExplored: Destination[] = [];

const destOf = (slug: string) =>
  destinations.find((d) => d.slug === slug) ?? sessionExplored.find((d) => d.slug === slug);
const placeName = (citySlug: string, placeId: string) =>
  destOf(citySlug)?.places.find((p) => p.id === placeId)?.name ?? placeId;

const validSlugs = () =>
  [...destinations.map((d) => d.slug), ...sessionExplored.map((d) => d.slug)].join(', ');

function fail(trip: Trip | null, message: string): AgentToolResult {
  return { trip, ok: false, message };
}

function needTrip(trip: Trip | null): trip is Trip {
  return trip !== null;
}

function dayAt(trip: Trip, dayNumber: unknown): TripDay | null {
  const n = Number(dayNumber);
  if (!Number.isInteger(n) || n < 1 || n > trip.days.length) return null;
  return trip.days[n - 1];
}

const BOOKING_KIND_LABELS: Record<BookingKind, string> = {
  flights: 'טיסות',
  stay: 'לינה',
  activities: 'כרטיסים ופעילויות',
  esim: 'eSIM',
  insurance: 'ביטוח',
  car: 'רכב',
};

const PREF_LABELS: Record<keyof TripPreferences, string> = {
  party: 'הרכב הנוסעים',
  pace: 'קצב',
  budget: 'תקציב',
  kosher: 'כשרות',
  shabbatAware: 'שמירת שבת',
  shopping: 'שופינג',
  interests: 'תחומי עניין',
  booking: 'מה כבר סגור',
};

/**
 * כשרות היא opt-in בלבד (hard rule: "none assumed, all respected when
 * chosen"). בכלים שמשבצים מסלול שלם - create_trip_full ו-set_day_places -
 * מקומות כשרים נזרקים אלא אם ההעדפה כבר נשמרה על הטיול (טוגל ה-UI,
 * השאלון, או אמירה מפורשת של המשתמש שהסוכן שמר ב-set_preferences).
 * add_place הגרנולרי לא מסונן: שם המשתמש ביקש מקום מסוים בשמו.
 */
function filterKosherUnlessOptedIn(
  ids: string[],
  destSlug: string,
  trip: Trip | null,
): { ids: string[]; dropped: string[] } {
  if (trip?.preferences?.kosher === true) return { ids, dropped: [] };
  const dest = destOf(destSlug);
  if (!dest) return { ids, dropped: [] };
  const dropped: string[] = [];
  const kept = ids.filter((id) => {
    const place = dest.places.find((p) => p.id === id);
    if (place && isKosher(place.category)) {
      dropped.push(id);
      return false;
    }
    return true;
  });
  return { ids: kept, dropped };
}

/**
 * סיכום מסלול דטרמיניסטי שחוזר למודל אחרי בנייה: רצף הערים בסדר הימים
 * עם מרחק אמיתי (haversine) בין כל שתי ערים עוקבות, ואזהרה מפורשת אם
 * המסלול מזגזג - עיר שחוזרים אליה אחרי שכבר עזבו אותה (חוץ מחזרה לעיר
 * ההגעה ביום/ימים האחרונים, שזה מבנה לגיטימי של לולאה). המודל לא מחשב
 * מרחקים טוב - אנחנו כן, אז אנחנו אומרים לו מה הוא בנה באמת.
 */
function routeSummary(days: TripDay[]): string {
  // רצף ערים ללא כפילויות עוקבות
  const seq: string[] = [];
  for (const d of days) {
    if (seq[seq.length - 1] !== d.citySlug) seq.push(d.citySlug);
  }
  if (seq.length <= 1) return '';

  const hops = seq.slice(0, -1).map((slug, i) => {
    const a = destOf(slug)?.center;
    const b = destOf(seq[i + 1])?.center;
    const name = (s: string) => destOf(s)?.name ?? s;
    const km = a && b ? ` (~${Math.round(haversineKm(a, b) * 1.25)} ק"מ בכביש)` : '';
    return `${name(slug)} ← ${name(seq[i + 1])}${km}`;
  });

  // זגזוג: עיר שמופיעה שוב אחרי שעיר אחרת נכנסה בינתיים.
  // חריג לגיטימי: הרצף מסתיים בעיר שבה התחיל (לולאה חזרה לעיר ההגעה).
  const revisited = new Set<string>();
  const seen = new Set<string>();
  seq.forEach((slug, i) => {
    if (seen.has(slug) && seq[i - 1] !== slug) {
      const isLoopClose = i === seq.length - 1 && slug === seq[0];
      if (!isLoopClose) revisited.add(slug);
    }
    seen.add(slug);
  });

  const warn =
    revisited.size > 0
      ? `\n⚠️ אזהרת מסלול: הסדר הנוכחי חוזר ל-${[...revisited]
          .map((s) => destOf(s)?.name ?? s)
          .join(', ')} אחרי שכבר עזבתם - זה זגזוג שמבזבז שעות נסיעה. סדר מחדש עם set_day_places כך שכל עיר מרוכזת בבלוק ימים אחד, מתחילים בעיר ההגעה ומסיימים בעיר היציאה (או לולאה שחוזרת אליה רק בסוף).`
      : '';

  return `\nמסלול בפועל: ${hops.join(' · ')}.${warn}`;
}

export function executeAgentTool(
  trip: Trip | null,
  name: string,
  input: Record<string, unknown>,
  exploredDestinations: Destination[] = [],
): AgentToolResult {
  sessionExplored = exploredDestinations;
  switch (name) {
    case 'create_trip': {
      const tripName = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : '';
      if (!tripName) return fail(trip, 'name חסר או ריק.');
      const slugs = Array.isArray(input.citySlugs) ? input.citySlugs : [];
      const bad = slugs.filter((s) => !destOf(String(s)));
      if (slugs.length === 0 || bad.length > 0) {
        return fail(trip, `citySlugs לא תקינים: [${bad.join(', ')}]. הערכים החוקיים: ${validSlugs()}.`);
      }
      const next: Trip = {
        id: newId(),
        name: tripName,
        citySlugs: [...new Set(slugs.map(String))],
        days: [],
        createdAt: Date.now(),
      };
      return {
        trip: next,
        ok: true,
        message: `נוצר טיול חדש "${tripName}" (0 ימים). הוסף ימים עם add_day.`,
        action: `יצרתי טיול חדש: "${tripName}"`,
      };
    }

    case 'create_trip_full': {
      const tripName = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : '';
      if (!tripName) return fail(trip, 'name חסר או ריק.');
      const plans = Array.isArray(input.dayPlans) ? input.dayPlans : [];
      if (plans.length === 0) return fail(trip, 'dayPlans ריק - חובה לפחות יום אחד עם מקומות.');
      if (plans.length > 21) return fail(trip, 'עד 21 ימים לטיול.');
      const used = new Set<string>();
      const days: TripDay[] = [];
      const errors: string[] = [];
      const droppedKosher: string[] = [];
      plans.forEach((raw, i) => {
        const dp = (raw ?? {}) as Record<string, unknown>;
        const dest = destOf(String(dp.citySlug ?? ''));
        if (!dest) {
          errors.push(`יום ${i + 1}: citySlug לא מוכר "${dp.citySlug}". החוקיים: ${validSlugs()}.`);
          return;
        }
        const requested = [...new Set((Array.isArray(dp.placeIds) ? dp.placeIds : []).map(String))];
        // כשרות רק בבחירה מפורשת - אחרת מסננים כאן, לפני כל שאר הבדיקות
        const gated = filterKosherUnlessOptedIn(requested, dest.slug, trip);
        droppedKosher.push(...gated.dropped);
        const ids = gated.ids;
        const bad = ids.filter((id) => !dest.places.some((p) => p.id === id));
        if (bad.length > 0) {
          errors.push(`יום ${i + 1}: מזהים שלא קיימים ב${dest.name}: [${bad.join(', ')}].`);
          return;
        }
        const dup = ids.filter((id) => used.has(id));
        if (dup.length > 0) {
          errors.push(`יום ${i + 1}: מקומות שכבר שובצו ביום קודם: [${dup.join(', ')}].`);
          return;
        }
        ids.forEach((id) => used.add(id));
        days.push({
          id: newId(),
          citySlug: dest.slug,
          placeIds: ids,
          notes:
            typeof dp.notes === 'string' && dp.notes.trim() ? dp.notes.trim().slice(0, 200) : undefined,
        });
      });
      if (errors.length > 0) {
        return fail(trip, `הקריאה נדחתה בשלמותה - תקן את השגיאות ונסה שוב:\n${errors.join('\n')}`);
      }
      const next: Trip = {
        id: newId(),
        name: tripName,
        citySlugs: [...new Set(days.map((d) => d.citySlug))],
        days,
        createdAt: Date.now(),
      };
      const totalStops = days.reduce((n, d) => n + d.placeIds.length, 0);
      const kosherNote =
        droppedKosher.length > 0
          ? ` הערה: לא שובצו מקומות כשרים (${droppedKosher.join(', ')}) - העדפת כשרות לא נבחרה. אל תנסה לשבץ אותם שוב, ואל תשאל על כך; אם המשתמש יאמר במפורש שהוא שומר כשרות, קרא ל-set_preferences ואז שבץ.`
          : '';
      return {
        trip: next,
        ok: true,
        message: `נוצר "${tripName}": ${days.length} ימים, ${totalStops} עצירות.${kosherNote}${routeSummary(days)}`,
        action: `יצרתי טיול חדש: "${tripName}" (${days.length} ימים, ${totalStops} עצירות)`,
      };
    }

    case 'set_day_places': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל. צור אחד קודם עם create_trip_full.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const dest = destOf(day.citySlug);
      if (!dest) return fail(trip, `העיר של היום (${day.citySlug}) לא נמצאה בדאטה.`);
      const requestedIds = [...new Set((Array.isArray(input.placeIds) ? input.placeIds : []).map(String))];
      // כשרות רק בבחירה מפורשת (ראו filterKosherUnlessOptedIn)
      const gatedDay = filterKosherUnlessOptedIn(requestedIds, dest.slug, trip);
      const ids = gatedDay.ids;
      const bad = ids.filter((id) => !dest.places.some((p) => p.id === id));
      if (bad.length > 0) {
        const valid = dest.places.map((p) => p.id).join(', ');
        return fail(trip, `מזהים שלא קיימים ב${dest.name}: [${bad.join(', ')}]. החוקיים: ${valid}.`);
      }
      const usedElsewhere = ids.filter((id) =>
        trip.days.some((d) => d.id !== day.id && d.placeIds.includes(id)),
      );
      if (usedElsewhere.length > 0) {
        return fail(trip, `מקומות שכבר משובצים ביום אחר: [${usedElsewhere.join(', ')}].`);
      }
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) => (d.id === day.id ? { ...d, placeIds: ids } : d)),
      };
      return {
        trip: next,
        ok: true,
        message: `יום ${n} עודכן: ${ids.length} עצירות${ids.length ? ` (${ids.join(' ← ')})` : ''}.`,
        action: `עדכנתי את העצירות של יום ${n} (${ids.length} מקומות)`,
      };
    }

    case 'suggest_quick_replies': {
      const replies = (Array.isArray(input.replies) ? input.replies : [])
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        .map((r) => r.trim().slice(0, 30))
        .slice(0, 4);
      if (replies.length < 2) return fail(trip, 'צריך 2-4 תשובות קצרות.');
      return {
        trip,
        ok: true,
        message: 'האפשרויות יוצגו למשתמש כצ׳יפים מתחת להודעה.',
        quickReplies: replies,
      };
    }

    case 'add_day': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל. צור אחד קודם עם create_trip.');
      const slug = String(input.citySlug ?? '');
      const dest = destOf(slug);
      if (!dest) return fail(trip, `citySlug לא מוכר: "${slug}". הערכים החוקיים: ${validSlugs()}.`);
      const next: Trip = {
        ...trip,
        citySlugs: trip.citySlugs.includes(slug) ? trip.citySlugs : [...trip.citySlugs, slug],
        days: [...trip.days, { id: newId(), citySlug: slug, placeIds: [] }],
      };
      return {
        trip: next,
        ok: true,
        message: `נוסף יום ${next.days.length} ב${dest.name}. הטיול כולל עכשיו ${next.days.length} ימים.`,
        action: `הוספתי יום ב${dest.name} (יום ${next.days.length})`,
      };
    }

    case 'remove_day': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const n = Number(input.dayNumber);
      const days = trip.days.filter((d) => d.id !== day.id);
      const next: Trip = {
        ...trip,
        days,
        citySlugs: trip.citySlugs.filter((c) => days.some((d) => d.citySlug === c)),
      };
      const cityName = destOf(day.citySlug)?.name ?? day.citySlug;
      return {
        trip: next,
        ok: true,
        message: `יום ${n} הוסר. נשארו ${days.length} ימים (המספור התעדכן).`,
        action: `הסרתי את יום ${n} (${cityName})`,
      };
    }

    case 'add_place': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל. צור אחד קודם עם create_trip.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const placeId = String(input.placeId ?? '');
      const dest = destOf(day.citySlug);
      const place = dest?.places.find((p) => p.id === placeId);
      if (!place) {
        const ids = dest?.places.map((p) => p.id).join(', ') ?? '';
        return fail(trip, `placeId "${placeId}" לא קיים ב${dest?.name}. המזהים החוקיים לעיר: ${ids}.`);
      }
      const already = trip.days.findIndex((d) => d.placeIds.includes(placeId));
      if (already >= 0) return fail(trip, `${place.name} כבר משובץ ביום ${already + 1}.`);
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) =>
          d.id === day.id ? { ...d, placeIds: [...d.placeIds, placeId] } : d,
        ),
      };
      return {
        trip: next,
        ok: true,
        message: `${place.name} נוסף כעצירה ${day.placeIds.length + 1} ביום ${n}.`,
        action: `הוספתי את ${place.name} ליום ${n}`,
      };
    }

    case 'remove_place': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const placeId = String(input.placeId ?? '');
      if (!day.placeIds.includes(placeId)) {
        return fail(trip, `placeId "${placeId}" לא נמצא ביום ${Number(input.dayNumber)}. העצירות שם: ${day.placeIds.join(', ')}.`);
      }
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) =>
          d.id === day.id ? { ...d, placeIds: d.placeIds.filter((p) => p !== placeId) } : d,
        ),
      };
      return {
        trip: next,
        ok: true,
        message: `הוסר. ביום ${n} נשארו ${day.placeIds.length - 1} עצירות.`,
        action: `הסרתי את ${placeName(day.citySlug, placeId)} מיום ${n}`,
      };
    }

    case 'move_place': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const from = Number(input.fromPos);
      const to = Number(input.toPos);
      const len = day.placeIds.length;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1 || from > len || to > len) {
        return fail(trip, `מיקום מחוץ לטווח. ביום יש ${len} עצירות (1-${len}).`);
      }
      const ids = [...day.placeIds];
      const [moved] = ids.splice(from - 1, 1);
      ids.splice(to - 1, 0, moved);
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) => (d.id === day.id ? { ...d, placeIds: ids } : d)),
      };
      return {
        trip: next,
        ok: true,
        message: `הסדר עודכן: ${ids.join(' ← ')}.`,
        action: `הזזתי את ${placeName(day.citySlug, moved)} למקום ${to} ביום ${n}`,
      };
    }

    case 'set_day_notes': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 300) : '';
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) => (d.id === day.id ? { ...d, notes: notes || undefined } : d)),
      };
      return {
        trip: next,
        ok: true,
        message: `ההערות של יום ${n} עודכנו.`,
        action: `עדכנתי הערות ליום ${n}`,
      };
    }

    case 'rename_trip': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const tripName = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : '';
      if (!tripName) return fail(trip, 'name חסר או ריק.');
      return {
        trip: { ...trip, name: tripName },
        ok: true,
        message: `שם הטיול עודכן ל"${tripName}".`,
        action: `שיניתי את שם הטיול ל"${tripName}"`,
      };
    }

    case 'set_preferences': {
      if (!needTrip(trip)) {
        return fail(trip, 'אין טיול פעיל - העדפות נשמרות על טיול. זכור אותן והחל אותן מיד אחרי create_trip.');
      }
      const prefs: TripPreferences = { ...trip.preferences };
      const changed: (keyof TripPreferences)[] = [];
      const setEnum = <K extends keyof TripPreferences>(key: K, allowed: string[]) => {
        const v = input[key];
        if (typeof v === 'string' && allowed.includes(v)) {
          prefs[key] = v as TripPreferences[K];
          changed.push(key);
        }
      };
      setEnum('party', ['couple', 'family', 'friends', 'solo']);
      setEnum('pace', ['relaxed', 'packed']);
      setEnum('budget', ['low', 'medium', 'high']);
      setEnum('shopping', ['more', 'normal', 'less']);
      if (typeof input.kosher === 'boolean') {
        prefs.kosher = input.kosher;
        changed.push('kosher');
      }
      if (typeof input.shabbatAware === 'boolean') {
        prefs.shabbatAware = input.shabbatAware;
        changed.push('shabbatAware');
      }
      if (Array.isArray(input.interests)) {
        prefs.interests = input.interests
          .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
          .map((i) => i.trim().slice(0, 40))
          .slice(0, 8);
        changed.push('interests');
      }
      if (changed.length === 0) return fail(trip, 'לא זוהתה אף העדפה תקינה בקלט.');
      const labels = changed.map((k) => PREF_LABELS[k]).join(', ');
      return {
        trip: { ...trip, preferences: prefs },
        ok: true,
        message: `ההעדפות עודכנו: ${JSON.stringify(prefs)}.`,
        action: `עדכנתי העדפות: ${labels}`,
      };
    }

    case 'set_booking_status': {
      if (!needTrip(trip)) {
        return fail(trip, 'אין טיול פעיל - מצב ההזמנות נשמר על טיול.');
      }
      const kinds: BookingKind[] = ['flights', 'stay', 'activities', 'esim', 'insurance', 'car'];
      const allowed: BookingStatus[] = ['have', 'need', 'not_needed'];
      const booking = { ...(trip.preferences?.booking ?? {}) };
      const changed: BookingKind[] = [];
      for (const kind of kinds) {
        const v = input[kind];
        if (typeof v === 'string' && (allowed as string[]).includes(v)) {
          booking[kind] = v as BookingStatus;
          changed.push(kind);
        }
      }
      if (changed.length === 0) return fail(trip, 'לא זוהה אף סוג הזמנה תקין בקלט.');
      const labels = changed.map((k) => BOOKING_KIND_LABELS[k]).join(', ');
      return {
        trip: { ...trip, preferences: { ...trip.preferences, booking } },
        ok: true,
        // מזכירים למודל שהקישור אינו שלו - הוא כבר מוצג בממשק
        message: `מצב ההזמנות עודכן: ${JSON.stringify(booking)}. כפתורי ההזמנה מוצגים בממשק אוטומטית - אל תכתוב קישורים, מחירים או זמינות.`,
        action: `סימנתי: ${labels}`,
      };
    }

    default:
      return fail(trip, `כלי לא מוכר: ${name}.`);
  }
}

/** מצב הטיול כפי שהמודל רואה אותו - ימים ממוספרים 1-based, מקומות עם שם+מזהה */
export function serializeTripForModel(trip: Trip | null): string {
  if (!trip) return 'null (אין טיול פעיל - השתמש ב-create_trip כדי להתחיל)';
  return JSON.stringify({
    name: trip.name,
    preferences: trip.preferences ?? {},
    days: trip.days.map((d, i) => ({
      day: i + 1,
      citySlug: d.citySlug,
      city: destOf(d.citySlug)?.name ?? d.citySlug,
      places: d.placeIds.map((id) => ({ id, name: placeName(d.citySlug, id) })),
      notes: d.notes,
    })),
  });
}

/** ולידציה קלה של הטיול שהגיע מהלקוח - מבנה בלבד, בלי להמציא תוכן */
export function sanitizeClientTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.days)) return null;
  const days: TripDay[] = [];
  for (const d of t.days) {
    if (!d || typeof d !== 'object') continue;
    const dd = d as Record<string, unknown>;
    if (typeof dd.citySlug !== 'string' || !destOf(dd.citySlug)) continue;
    days.push({
      id: typeof dd.id === 'string' ? dd.id : newId(),
      citySlug: dd.citySlug,
      placeIds: Array.isArray(dd.placeIds)
        ? dd.placeIds.filter((p): p is string => typeof p === 'string')
        : [],
      notes: typeof dd.notes === 'string' ? dd.notes : undefined,
    });
  }
  return {
    id: t.id,
    name: t.name.slice(0, 60),
    citySlugs: Array.isArray(t.citySlugs)
      ? t.citySlugs.filter((s): s is string => typeof s === 'string' && Boolean(destOf(s)))
      : [...new Set(days.map((d) => d.citySlug))],
    days,
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    preferences:
      t.preferences && typeof t.preferences === 'object'
        ? (t.preferences as Trip['preferences'])
        : undefined,
  };
}
