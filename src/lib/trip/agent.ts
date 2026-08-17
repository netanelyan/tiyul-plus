import { destinations } from '@/data/destinations';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import { haversineKm } from './travel';
import { buildSearchCard, SEARCH_KINDS, type BookingSearchCard, type SearchKind } from '@/lib/bookingSearch';
import { stripClaims } from '@/lib/priceGuard';
import { inHe } from '@/lib/hebrew';
import { bookingIsPerCity } from '@/lib/booking';
import { setBookingStatus } from './bookingStatus';
import { calendar } from '@/data/calendar';
import {
  NOT_PUBLISHED,
  datedLabel,
  dayRangeLabel,
  impactLabel,
  matchTripCalendar,
  sourceLabel,
} from './dateWindows';
import { completeRange, dayDate, formatHebrewRange, isISODate, rangeDays, safeDates } from './dates';
import { newId } from './types';
import type {
  BookingKind,
  BookingStatus,
  Trip,
  TripDay,
  TripPin,
  TripPinKind,
  TripPreferences,
} from './types';
import type { CalendarEntry, Destination } from '@/lib/types';

/**
 * Agent tools: the Anthropic tool definitions + a server-side executor with
 * strict validation. The agent works on an in-memory copy of the trip; every
 * invalid call returns an explained error (is_error) so the model corrects
 * itself. placeId must exist in the city's DATA, indexes are 1-based exactly
 * as shown to the user and to the model.
 */

export interface AgentToolResult {
  trip: Trip | null; // the trip after the action (or unchanged on failure)
  ok: boolean;
  message: string; // the tool_result content the model sees
  action?: string; // the Hebrew "what was done" line for the user
  quickReplies?: string[]; // quick answers rendered as chips (suggest_quick_replies)
  /**
   * A ready-made provider search card (booking_search). Built here and not by
   * the model, so its URL, dates and guest count are data, not generated text.
   */
  search?: BookingSearchCard;
  /**
   * Names of the entries returned from `city_date_notes`. They go into the
   * claims guard's whitelist, so the model can talk about what it received -
   * and only about that.
   */
  eventNames?: string[];
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
      'Attach 2-4 short Hebrew tappable answer options to a NON-sensitive clarifying question you are asking in this same reply (pace, number of days, destination, who is traveling), or to a one-time offer to build a trip from the conversation. They render as chips under your message. NEVER use this for kashrut, Shabbat or any religious or private matter.',
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
    name: 'set_day_city',
    description:
      "Move an EXISTING day to a different city, keeping the trip and every other day intact. This is how you restructure a trip - e.g. the traveler booked a hotel in Bratislava and wants days 1-2 there instead of the Tatras. USE THIS INSTEAD OF rebuilding the trip with create_trip_full: rebuilding throws away everything the traveler already has. The day's current stops belong to the old city and are cleared - the tool tells you exactly which ones - so call set_day_places for that day in the SAME turn to fill it from the new city.",
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: dayNumberSchema,
        citySlug: { type: 'string', description: 'The city slug this day should move to' },
      },
      required: ['dayNumber', 'citySlug'],
    },
  },
  {
    name: 'move_day',
    description:
      'Reorder days: take the day at fromDay and put it at toDay (both 1-based), shifting the rest. Use it to fix the visit order - e.g. the arrival city must be day 1, or a warned zigzag needs the days regrouped per city. Stops travel with the day; nothing is lost. Prefer this over rebuilding the trip.',
    input_schema: {
      type: 'object',
      properties: {
        fromDay: { type: 'integer', description: '1-based day number to move' },
        toDay: { type: 'integer', description: '1-based position it should end up at' },
      },
      required: ['fromDay', 'toDay'],
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
    name: 'set_trip_dates',
    description:
      "Record the traveler's real travel dates on the active trip, in YYYY-MM-DD. Use it ONLY when the user states dates themselves (\"we fly on August 12\", \"12-18/8\", \"the first week of September\" with a concrete year). NEVER invent, estimate or infer a date from anything else - no date is a perfectly normal state for a trip, and a wrong date is worse than none. Day 1 is startDate, day 2 is the next day and so on; endDate is the return date. If the range covers a different number of days than the plan has, say so plainly in one short sentence and let the user decide - do NOT add or remove days yourself.",
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'YYYY-MM-DD, the departure date' },
        endDate: { type: 'string', description: 'YYYY-MM-DD, the return date. Omit if unknown.' },
      },
      required: ['startDate'],
    },
  },
  {
    name: 'set_booking_status',
    description:
      "Record what the traveler has ALREADY arranged and what they still need, per booking type. Set a field ONLY when the user actually said so - never assume, never guess from the itinerary. 'have' = already booked, 'need' = still needs it, 'not_needed' = irrelevant for this trip. LODGING AND TICKETS BELONG TO A CITY, not to the trip: pass citySlug together with stay/activities, and on a multi-city trip ask about one city at a time - \"we have a hotel\" cannot be true for a whole trip. flights/esim/insurance/car are trip-wide and take no citySlug. You must NEVER output a booking URL, price, availability or provider name in your reply: the app attaches the real link itself from its own affiliate config. Your job is only to notice what is missing and record the answer.",
    input_schema: {
      type: 'object',
      properties: {
        flights: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        stay: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        activities: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        esim: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        insurance: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        car: { type: 'string', enum: ['have', 'need', 'not_needed'] },
        citySlug: {
          type: 'string',
          description:
            'City slug from the trip - REQUIRED together with stay or activities. Ignored for the trip-wide kinds.',
        },
      },
    },
  },
  {
    /**
     * Events and closures. **This tool is the ONLY source** from which
     * anything may be said about an event: it has no date field, so there is
     * no path by which a date the model "remembers" enters the answer. An
     * empty result is an answer - "we have nothing recorded".
     */
    name: 'city_date_notes',
    description:
      "Look up what is recorded for a city in the traveler's own dates: known events and closure periods, with their source and the date we checked. Call this WHENEVER the user asks about events, festivals, holidays, closures, crowds or timing ('is anything happening while we are there', 'is the museum open', 'why is it so busy then'). You pass only the city slug - the dates come from the trip itself. THIS TOOL IS YOUR ONLY SOURCE ON THIS SUBJECT. You may never state an event date, a lineup, a performer, a ticket price, or whether something is running this year from your own knowledge - not even if you are confident, not even if the user names the event. If the tool returns nothing, the honest and complete answer is that we have nothing recorded for that city and those dates, and that they should check locally; do not fill the gap. When an entry says its dates are not yet published, you must repeat that wording and must not turn it into a date.",
    input_schema: {
      type: 'object',
      properties: {
        citySlug: { type: 'string', description: 'City slug from the DATA to look up' },
      },
      required: ['citySlug'],
    },
  },
  {
    /**
     * The tool that replaces "talking about hotels" with "opening a real
     * search".
     *
     * Note what is NOT here: no price parameter, no date, no guest count, no
     * name and no free text. The model picks a kind and a city, and that is
     * all - everything else is derived from the trip on the server. That is
     * why it cannot type a number: **there is no field.**
     */
    name: 'booking_search',
    description:
      "Hand the traveler a ready-made search at a real provider when they ask for help finding accommodation ('where should we stay', 'find us a hotel', 'what does a hotel cost') or tickets/tours/guided activities. kind='stay' for hotels and apartments, kind='activities' for tickets, tours and guided experiences. RESTAURANTS ARE NOT IN SCOPE: for food use the curated places in the DATA, never this tool. You pass ONLY the kind and the city slug - the app fills in the dates from the trip's own day order, the number of guests from the party preference, and the budget from the preferences, and it builds the link from its own affiliate config. There is deliberately NO parameter for a price, a date, a guest count, a hotel name or free text, because you must never produce any of those: you have no hotel data of any kind in your context, so any price, availability, room type, star rating or property name you write would be invented, and the server strips it from your reply. Your entire reply about this is: you cannot check prices or availability yourself, plus one short sentence about what the search covers. Never say 'the cheapest' or 'the best price' - we do not search every provider. Set kosher=true or accessible=true only when the user actually asked for it.",
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['stay', 'activities'] },
        citySlug: {
          type: 'string',
          description: 'City slug from the DATA (or an explored city) to search in',
        },
        kosher: {
          type: 'boolean',
          description: 'The user asked for a kosher kitchen / kosher-friendly stay',
        },
        accessible: {
          type: 'boolean',
          description: 'The user asked for accessibility (step-free, wheelchair)',
        },
      },
      required: ['kind', 'citySlug'],
    },
  },
  {
    name: 'add_pin',
    description:
      "Save a place the TRAVELER told you about - the hotel they booked, a restaurant they reserved, or any point they want on the map - so it appears on the trip map. Use it the moment the user names such a place (\"we booked Hotel Devin in Bratislava\"). kind='stay' for hotels and apartments, 'reservation' for booked restaurants/activities, 'other' for anything else. Pass name EXACTLY as the user said it, plus the city so the lookup is unambiguous. You must NEVER pass or invent coordinates: the server looks the place up on OpenStreetMap itself. If the lookup fails the pin is still saved and marked unverified, and the traveler can place it on the map by hand - tell them that plainly instead of guessing where it is.",
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['stay', 'reservation', 'other'] },
        name: { type: 'string', description: 'The place name as the user said it' },
        citySlug: {
          type: 'string',
          description: 'City slug from the DATA that this pin belongs to, when known',
        },
        note: { type: 'string', description: 'Short Hebrew note the user gave (check-in time etc.)' },
      },
      required: ['kind', 'name'],
    },
  },
  {
    name: 'remove_pin',
    description:
      'Remove a pin the traveler previously saved (they cancelled the booking, or it was wrong). Match by the pin name shown in CURRENT TRIP.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name of the pin to remove' } },
      required: ['name'],
    },
  },
];

/* ---------- Execution ---------- */

/**
 * Auto-explored destinations (AI Explorer) - set per call by route.ts.
 * executeAgentTool is synchronous, so there is no race: the assignment at the
 * start of each call holds for the entire execution. Curated always comes
 * first - explored can never shadow a real city from the catalog.
 */
let sessionExplored: Destination[] = [];

const destOf = (slug: string) =>
  destinations.find((d) => d.slug === slug) ?? sessionExplored.find((d) => d.slug === slug);
const placeName = (citySlug: string, placeId: string) =>
  destOf(citySlug)?.places.find((p) => p.id === placeId)?.name ?? placeId;

const validSlugs = () =>
  [...destinations.map((d) => d.slug), ...sessionExplored.map((d) => d.slug)].join(', ');

/**
 * Real distances from a pin to that city's stops in the trip.
 *
 * Why this exists: the model wants to say something useful about the
 * traveler's hotel, and without a real number it invented proximity ("within
 * walking distance", "right next to the UFO"). A prompt-level ban was tested
 * twice in one session and did not hold. We actually have the data - a pin
 * has lat/lng and every catalog place has lat/lng - so instead of fighting
 * the symptom, we hand it the correct number and allow it to quote only that.
 *
 * This is air (straight-line) distance, not walking: we have no road-network
 * data, so the label says "aerial" and the prompt forbids converting it into
 * walking minutes.
 */
function airDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 50) * 50} מ׳ אווירי`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ק״מ אווירי`;
}

export function pinDistances(
  trip: Trip,
  pin: Pick<TripPin, 'citySlug' | 'lat' | 'lng'>,
): { name: string; away: string }[] {
  if (typeof pin.lat !== 'number' || typeof pin.lng !== 'number' || !pin.citySlug) return [];
  const dest = destOf(pin.citySlug);
  if (!dest) return [];
  const at = { lat: pin.lat, lng: pin.lng };
  // only the stops actually in the trip for this city, without duplicates
  const ids = new Set(
    trip.days.filter((d) => d.citySlug === pin.citySlug).flatMap((d) => d.placeIds),
  );
  return [...ids]
    .map((id) => {
      const place = dest.places.find((p) => p.id === id);
      if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
      return { name: place.name, km: haversineKm(at, { lat: place.lat, lng: place.lng }) };
    })
    .filter((x): x is { name: string; km: number } => x !== null)
    .sort((a, b) => a.km - b.km)
    .map((x) => ({ name: x.name, away: airDistanceLabel(x.km) }));
}

function fail(trip: Trip | null, message: string): AgentToolResult {
  return { trip, ok: false, message };
}

/**
 * A short reminder attached to the results of the route-mutating tools.
 *
 * Why here and not only in the prompt: these rules exist in SYSTEM_PROMPT and
 * were tested live three times - on the first turn they held, but in a turn
 * containing many tool calls the model went back to inventing ("everything is
 * within walking distance of the hotel", "to Devin you take bus 29, about a
 * quarter of an hour"). The tool result is the last text it reads before it
 * phrases the answer, and this is the layer that already worked in the
 * booking layer. Short on purpose - it is sent on every tool call.
 */
/**
 * Scrubs from a day note any transit detail with a number that cannot be
 * verified.
 *
 * Live testing showed that even when the chat reply is corrected ("there is a
 * bus or a boat ride"), the model still writes "take bus 29" into `notes` -
 * and the note is stored on the trip, printed in the PDF and sent when
 * sharing. A note is trip data, so exactly the same truth requirement applies
 * to it as to the catalog.
 *
 * We do not block numbers wholesale: if the same number appears in the
 * destination's gettingAround - i.e. somebody wrote it into the data by
 * hand - it stays. Otherwise it is replaced with wording that tells the truth
 * without inventing a number. Same approach as filterKosherUnlessOptedIn:
 * correct quietly and explain to the model why.
 */
const TRANSIT_LINE =
  /(?:אוטובוס|קו|טרמוואי|טראם|חשמלית|מטרו|רכבת|רכבל|מעבורת)\s*(?:מספר\s*)?(\d{1,3}[A-Za-z]?)/g;

export function sanitizeDayNote(
  note: string,
  citySlug: string,
): { note: string; changed: boolean } {
  const dest = destOf(citySlug);
  const practical = [
    dest?.practical?.gettingAround ?? '',
    dest?.practical?.flights ?? '',
  ]
    .join(' ')
    .toLowerCase();
  let changed = false;
  const cleaned = note.replace(TRANSIT_LINE, (match, num: string) => {
    // a number already present in the destination's data is verified - keep it as is
    if (practical.includes(String(num).toLowerCase())) return match;
    changed = true;
    const mode = match.split(/\s+/)[0];
    return mode;
  });
  /**
   * The same price guard that runs on the reply also runs here, **with no
   * whitelist**.
   *
   * A day note is not passing prose: it gets printed, sent when sharing, and
   * read again in the field two months later. A price inside it reads like a
   * promise made by the site, not like a sentence in a conversation. There is
   * no whitelist here because there is no conversational context here - and a
   * number the traveler said can simply stay in the conversation, where it IS
   * allowed.
   *
   * `stripClaims` and not `guardText`: in a note we remove the clause and keep
   * the sentence, without planting apology wording into it.
   */
  const guarded = stripClaims(cleaned);
  if (guarded.redactions.length > 0) changed = true;
  const out = guarded.text;
  return { note: changed ? out.replace(/\s{2,}/g, ' ').trim() : note, changed };
}

/**
 * The city order is derived from the day order, not accumulated by insertion
 * order.
 *
 * This is needed for the structure-changing tools (set_day_city / move_day):
 * after a day changes city or position, `citySlugs` is what feeds the
 * inter-city travel legs, the route summary and the city picker - and if it
 * stayed in the original insertion order, the trip would look right in its
 * days but wrong in its route.
 */
function citySlugsFromDays(days: TripDay[]): string[] {
  return [...new Set(days.map((d) => d.citySlug))];
}

/** e.g. "Day 1: Bratislava · Day 2: Vienna" - so the model sees the structure that resulted */
function dayOrderSummary(days: TripDay[]): string {
  return days
    .map((d, i) => `יום ${i + 1}: ${destOf(d.citySlug)?.name ?? d.citySlug}`)
    .join(' · ');
}

/** A note the model wrote, scrubbed and truncated - see sanitizeDayNote */
function cleanNote(value: unknown, citySlug: string, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, max);
  if (!trimmed) return undefined;
  return sanitizeDayNote(trimmed, citySlug).note || undefined;
}

const NOTE_CLEANED =
  ' שים לב: הוסר מההערה מספר קו תחבורה שאינו מופיע בדאטה של היעד - אל תכתוב מספרי קווים, זמני נסיעה או מחירי כרטיס שלא מופיעים ב-gettingAround.';

/**
 * This instruction rides on every tool result that mutates the trip, i.e. it
 * is the last thing the model reads before it writes the reply - the
 * strongest position there is. The block about length was added after live
 * testing: the prompt rule ("one sentence") got swallowed, and the model
 * repeated the whole itinerary day-by-day in text even though the panel
 * displays it. The cause was a conflict - another prompt rule teaches the
 * "**Day N**" format for recommendation answers, and the model applied it
 * also to a reply in which tools were executed.
 */
const PROSE_DISCIPLINE =
  ' בתשובה ובהערות: מספרי קווים, זמני נסיעה ומחירי כרטיס רק אם הם כתובים ב-gettingAround של היעד; בלי "במרחק הליכה"/"ברגל"/"צמוד" - רק המרחקים האוויריים שקיבלת, עם המילה "אווירי".' +
  ' אורך התשובה: משפט אחד עד שניים על מה שנעשה, וזה הכל. הפאנל והמפה מציגים את המסלול בעצמם, ולכן אסור למנות בטקסט את הימים או את העצירות, אסור להשתמש בפורמט "**יום N**" בתור שבו בוצעו כלים, ואסור לסיים בהצעת עזרה נוספת.';

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

export const PIN_KINDS: TripPinKind[] = ['stay', 'reservation', 'other'];
const PIN_KIND_SET = new Set<string>(PIN_KINDS);

const PIN_KIND_LABELS: Record<TripPinKind, string> = {
  stay: 'לינה',
  reservation: 'הזמנה',
  other: 'סיכה',
};

/** A sane ceiling - pins are stored with the trip in localStorage and in the account */
const MAX_PINS = 40;

const PREF_LABELS: Record<keyof TripPreferences, string> = {
  party: 'הרכב הנוסעים',
  pace: 'קצב',
  budget: 'תקציב',
  kosher: 'כשרות',
  shabbatAware: 'שמירת שבת',
  shopping: 'שופינג',
  // never reaches here via set_preferences (it has no setEnum), but the type
  // demands a value - and that is exactly what we want: whoever gives the
  // agent write access to this field will have to pass through here.
  travelStyle: 'סגנון נסיעה',
  interests: 'תחומי עניין',
  booking: 'מה כבר סגור',
  bookingByCity: 'מה כבר סגור, לפי עיר',
};

/**
 * Kosher is opt-in only (hard rule: "none assumed, all respected when
 * chosen"). In the tools that place a whole itinerary - create_trip_full and
 * set_day_places - kosher places are dropped unless the preference is already
 * stored on the trip (the UI toggle, the quiz, or an explicit user statement
 * the agent stored via set_preferences). The granular add_place is not
 * filtered: there the user asked for a specific place by name.
 */
function filterKosherUnlessOptedIn(
  ids: string[],
  destSlug: string,
  trip: Trip | null,
): { ids: string[]; dropped: string[]; mode: 'not-opted-in' | 'kosher-only' } {
  const optedIn = trip?.preferences?.kosher === true;
  const mode = optedIn ? 'kosher-only' : 'not-opted-in';
  const dest = destOf(destSlug);
  if (!dest) return { ids, dropped: [], mode };
  const dropped: string[] = [];
  const kept = ids.filter((id) => {
    const place = dest.places.find((p) => p.id === id);
    if (!place) return true;
    // keeps kosher: every eating place whose kosher status is not 'kosher'
    // is dropped - including 'unknown'. "Unknown" is not "probably fine".
    if (optedIn) {
      if (isEating(place.category) && kosherStatusOf(place) !== 'kosher') {
        dropped.push(id);
        return false;
      }
      return true;
    }
    // did not opt into kosher: kosher places are not pushed on them at our initiative.
    if (isKosher(place.category)) {
      dropped.push(id);
      return false;
    }
    return true;
  });
  return { ids: kept, dropped, mode };
}

/**
 * The explanation returned to the model after filtering. The two reasons are
 * opposites of each other and must not be confused: "you did not opt into
 * kosher" versus "you opted into kosher, so a non-kosher place was dropped".
 * A wrong message here makes the model try to re-place exactly what we just
 * removed.
 */
function kosherDropNote(dropped: string[], mode: 'not-opted-in' | 'kosher-only'): string {
  if (dropped.length === 0) return '';
  const list = dropped.join(', ');
  return mode === 'kosher-only'
    ? ` הערה: הורדו מקומות אכילה שאינם כשרים או שכשרותם לא ידועה (${list}) - המטייל שומר כשרות. אל תשבץ אותם שוב ואל תתנצל; אפשר להציע במקומם מקומות כשרים אם יש בעיר.`
    : ` הערה: לא שובצו מקומות כשרים (${list}) - העדפת כשרות לא נבחרה. אל תנסה לשבץ אותם שוב, ואל תשאל על כך; אם המשתמש יאמר במפורש שהוא שומר כשרות, קרא ל-set_preferences ואז שבץ.`;
}

/**
 * A deterministic route summary returned to the model after building: the
 * sequence of cities in day order with the real (haversine) distance between
 * every two consecutive cities, and an explicit warning if the route
 * zigzags - a city revisited after it was already left (except returning to
 * the arrival city on the last day(s), which is a legitimate loop structure).
 * The model does not compute distances well - we do, so we tell it what it
 * actually built.
 */
function routeSummary(days: TripDay[]): string {
  // city sequence without consecutive duplicates
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

  // Zigzag: a city that appears again after another city came in between.
  // Legitimate exception: the sequence ends in the city it started in (a loop
  // back to the arrival city).
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

/**
 * A location already resolved on the server for add_pin. Arrives as a
 * separate parameter and not inside input, deliberately: this way there is no
 * path by which the model can inject its own coordinates.
 */
export interface ResolvedPinLocation {
  lat: number;
  lng: number;
  address: string;
}

export function executeAgentTool(
  trip: Trip | null,
  name: string,
  input: Record<string, unknown>,
  exploredDestinations: Destination[] = [],
  resolved: ResolvedPinLocation | null = null,
  /**
   * This turn corrects the previous turn (see `lib/server/correction.ts`).
   *
   * The only meaning right now: **a rebuild replaces the open trip instead of
   * standing a second trip next to it.** Netanel corrected "Barcelona, not
   * Bratislava" and got an orphaned Bratislava trip in the list, because
   * `create_trip_full` always generates a new id, so `upsertTrip` on the
   * client adds instead of replacing.
   */
  isCorrection = false,
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
      let dropMode: 'not-opted-in' | 'kosher-only' = 'not-opted-in';
      plans.forEach((raw, i) => {
        const dp = (raw ?? {}) as Record<string, unknown>;
        const dest = destOf(String(dp.citySlug ?? ''));
        if (!dest) {
          errors.push(`יום ${i + 1}: citySlug לא מוכר "${dp.citySlug}". החוקיים: ${validSlugs()}.`);
          return;
        }
        const requested = [...new Set((Array.isArray(dp.placeIds) ? dp.placeIds : []).map(String))];
        // kosher only by explicit choice - otherwise filtered here, before all the other checks
        const gated = filterKosherUnlessOptedIn(requested, dest.slug, trip);
        droppedKosher.push(...gated.dropped);
        dropMode = gated.mode;
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
          notes: cleanNote(dp.notes, dest.slug, 200),
        });
      });
      if (errors.length > 0) {
        return fail(trip, `הקריאה נדחתה בשלמותה - תקן את השגיאות ונסה שוב:\n${errors.join('\n')}`);
      }
      /*
        **The trip id is the difference between a correction and an orphaned
        trip.** In a correction turn we keep the id (and `createdAt`, and the
        preferences and pins the traveler already gave) - and then `upsertTrip`
        on the client replaces that same row instead of adding one. In any
        other turn the behavior is unchanged: "build me a Rome trip too" still
        creates an additional trip, because the opposite direction would have
        clobbered an existing trip.
      */
      const replacing = isCorrection && trip ? trip : null;
      const next: Trip = {
        ...(replacing ?? {}),
        id: replacing?.id ?? newId(),
        name: tripName,
        citySlugs: [...new Set(days.map((d) => d.citySlug))],
        days,
        createdAt: replacing?.createdAt ?? Date.now(),
      };
      const totalStops = days.reduce((n, d) => n + d.placeIds.length, 0);
      const kosherNote = kosherDropNote(droppedKosher, dropMode);
      /*
        An empty day on screen is exactly what makes people leave (a real
        report: "day 2 - Energylandia" was built as an empty day with a text
        note, because the park is not in the catalog and the model did not
        explore it). The nudge sits in the tool result - the spot proven to
        get the highest compliance - and demands filling in the same turn,
        including the correct path for a day built around a place not in the
        catalog: explore_destination and then set_day_city + set_day_places
        with the explored places.
      */
      const emptyDays = days
        .map((d, i) => (d.placeIds.length === 0 ? i + 1 : 0))
        .filter(Boolean);
      const emptyNote =
        emptyDays.length > 0
          ? ` שים לב: יום ${emptyDays.join(' ויום ')} נשאר ללא עצירות - אסור לסיים את התור כך. אם היום מתוכנן סביב מקום שאינו בקטלוג (פארק שעשועים, עיירה, אתר), קרא עכשיו ל-explore_destination עם שמו, ואז שבץ את המקומות שנחקרו ליום הזה (set_day_city לעיר שנחקרה + set_day_places) - הערת טקסט לבדה אינה תחליף לעצירות על המפה.`
          : '';
      const built = replacing
        ? `הטיול הקיים עודכן ל"${tripName}"`
        : `נוצר "${tripName}"`;
      return {
        trip: next,
        ok: true,
        message: `${built}: ${days.length} ימים, ${totalStops} עצירות.${kosherNote}${emptyNote}${replacing ? ' זה תור של תיקון, ולכן הטיול הקיים עודכן במקומו ולא נוצר טיול שני. אמור למטייל שתיקנת את הטיול הקיים, לא שיצרת חדש.' : ''}${routeSummary(days)}${PROSE_DISCIPLINE}`,
        action: replacing
          ? `עדכנתי את הטיול: "${tripName}" (${days.length} ימים, ${totalStops} עצירות)`
          : `יצרתי טיול חדש: "${tripName}" (${days.length} ימים, ${totalStops} עצירות)`,
      };
    }

    case 'set_day_places': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל. צור אחד קודם עם create_trip_full.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const dest = destOf(day.citySlug);
      if (!dest) return fail(trip, `העיר של היום (${day.citySlug}) לא נמצאה בדאטה.`);
      const requestedIds = [...new Set((Array.isArray(input.placeIds) ? input.placeIds : []).map(String))];
      // kosher only by explicit choice (see filterKosherUnlessOptedIn)
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
        message: `יום ${n} עודכן: ${ids.length} עצירות${ids.length ? ` (${ids.join(' ← ')})` : ''}.${PROSE_DISCIPLINE}`,
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
        // The day is born empty - the demand to fill it in the same turn sits
        // here, in the tool result, for the same reason as in set_day_city and
        // create_trip_full: an empty day on screen is what makes people leave,
        // and the model was proven to stop after add_day without filling
        // ("add a day at Auschwitz" -> an empty day in Krakow while
        // Auschwitz-Birkenau is in Krakow's data).
        message: `נוסף יום ${next.days.length} ב${dest.name} - כרגע ריק. חובה למלא אותו עכשיו, באותו תור, עם set_day_places ומקומות אמיתיים מהדאטה של ${dest.name}. אם המשתמש ביקש את היום סביב מקום מסוים - שבץ אותו (ואם הוא לא בדאטה, explore_destination קודם). אסור לסיים תור עם יום ריק. הטיול כולל עכשיו ${next.days.length} ימים.${PROSE_DISCIPLINE}`,
        action: `הוספתי יום ${inHe(dest.name)} (יום ${next.days.length})`,
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

    /**
     * Moving an existing day to a different city.
     *
     * This tool was born from a real failure: a traveler booked a hotel in
     * Bratislava and asked for days 1-2 to be there instead of the High
     * Tatras. Days are pinned to a city, and set_day_places rejects any place
     * that is not in that day's city - so **there was no legal path** for
     * that request other than create_trip_full, which deletes the trip and
     * rebuilds it. The agent said exactly that ("the system does not allow
     * me"), and it was true; the only thing it COULD do was update notes, so
     * that is what it did.
     */
    case 'set_day_city': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const slug = String(input.citySlug ?? '');
      const dest = destOf(slug);
      if (!dest) return fail(trip, `citySlug לא מוכר: "${slug}". הערכים החוקיים: ${validSlugs()}.`);
      const n = Number(input.dayNumber);
      if (day.citySlug === slug) {
        return fail(trip, `יום ${n} כבר ב${dest.name} - אין מה לשנות.`);
      }
      const fromName = destOf(day.citySlug)?.name ?? day.citySlug;
      // The stops belong to the previous city and are therefore deleted. The
      // names are reported explicitly so the agent can tell the traveler what
      // was dropped and fill the day immediately.
      const dropped = day.placeIds.map((id) => placeName(day.citySlug, id));
      const days = trip.days.map((d) =>
        d.id === day.id ? { ...d, citySlug: slug, placeIds: [] } : d,
      );
      const next: Trip = { ...trip, days, citySlugs: citySlugsFromDays(days) };
      const droppedNote =
        dropped.length > 0
          ? ` העצירות שהיו בו (${dropped.join(', ')}) הוסרו כי הן ב${fromName} - אמור זאת למטייל.`
          : '';
      return {
        trip: next,
        ok: true,
        message:
          `יום ${n} עבר מ${fromName} ל${dest.name}.${droppedNote} עכשיו קרא ל-set_day_places ליום ${n} ומלא אותו במקומות של ${dest.name} באותו תור - אסור להשאיר יום ריק. סדר הימים: ${dayOrderSummary(days)}.${PROSE_DISCIPLINE}`,
        action: `העברתי את יום ${n} ל${dest.name}`,
      };
    }

    /** Reordering the days. The stops move with the day - nothing is deleted. */
    case 'move_day': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const total = trip.days.length;
      const from = Number(input.fromDay);
      const to = Number(input.toDay);
      if (!Number.isInteger(from) || from < 1 || from > total) {
        return fail(trip, `fromDay מחוץ לטווח. בטיול יש ${total} ימים.`);
      }
      if (!Number.isInteger(to) || to < 1 || to > total) {
        return fail(trip, `toDay מחוץ לטווח. בטיול יש ${total} ימים.`);
      }
      if (from === to) return fail(trip, 'fromDay ו-toDay זהים - אין מה להזיז.');
      const days = [...trip.days];
      const [moved] = days.splice(from - 1, 1);
      days.splice(to - 1, 0, moved);
      const next: Trip = { ...trip, days, citySlugs: citySlugsFromDays(days) };
      const cityName = destOf(moved.citySlug)?.name ?? moved.citySlug;
      return {
        trip: next,
        ok: true,
        message: `יום ${from} (${cityName}) הועבר למקום ${to}. סדר הימים עכשיו: ${dayOrderSummary(days)}.${PROSE_DISCIPLINE}`,
        action: `הזזתי את ${cityName} מיום ${from} ליום ${to}`,
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
        message: `${place.name} נוסף כעצירה ${day.placeIds.length + 1} ביום ${n}.${PROSE_DISCIPLINE}`,
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
        message: `הסדר עודכן: ${ids.join(' ← ')}.${PROSE_DISCIPLINE}`,
        action: `הזזתי את ${placeName(day.citySlug, moved)} למקום ${to} ביום ${n}`,
      };
    }

    case 'set_day_notes': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const day = dayAt(trip, input.dayNumber);
      if (!day) return fail(trip, `dayNumber מחוץ לטווח. בטיול יש ${trip.days.length} ימים.`);
      const raw = typeof input.notes === 'string' ? input.notes.trim().slice(0, 300) : '';
      const scrubbed = raw ? sanitizeDayNote(raw, day.citySlug) : { note: '', changed: false };
      const notes = scrubbed.note;
      const n = Number(input.dayNumber);
      const next: Trip = {
        ...trip,
        days: trip.days.map((d) => (d.id === day.id ? { ...d, notes: notes || undefined } : d)),
      };
      return {
        trip: next,
        ok: true,
        message: `ההערות של יום ${n} עודכנו.${scrubbed.changed ? NOTE_CLEANED : ''}`,
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

    case 'set_trip_dates': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל - התאריכים נשמרים על טיול.');
      const startDate = typeof input.startDate === 'string' ? input.startDate.trim() : '';
      const endDateRaw = typeof input.endDate === 'string' ? input.endDate.trim() : '';
      if (!isISODate(startDate)) {
        return fail(
          trip,
          'תאריך היציאה חייב להיות בפורמט YYYY-MM-DD ולהיות תאריך אמיתי. אל תנחש תאריך - אם המשתמש לא אמר, אל תקרא לכלי הזה.',
        );
      }
      if (endDateRaw && (!isISODate(endDateRaw) || rangeDays(startDate, endDateRaw) === null)) {
        return fail(trip, 'תאריך החזרה אינו תקין או מוקדם מתאריך היציאה.');
      }
      // one end is enough: the other is completed from the trip length, exactly as in the UI
      const dates = completeRange(trip.days.length, startDate, endDateRaw || undefined);
      const span = rangeDays(dates.startDate, dates.endDate);
      const gap = span !== null && trip.days.length > 0 ? span - trip.days.length : 0;
      // The gap is handed to the model as a fact, and explicitly without
      // permission to fix it on its own - adding or deleting days because of
      // a date is exactly the surprise that is forbidden here.
      const note =
        gap === 0
          ? ''
          : gap > 0
            ? ` שים לב: הטווח מכסה ${span} ימים והתוכנית היא ${trip.days.length} ימים. אמור זאת למשתמש במשפט אחד ושאל אם להוסיף ימים - אל תוסיף בעצמך.`
            : ` שים לב: בתוכנית ${trip.days.length} ימים והטווח מכסה ${span}. אמור זאת למשתמש במשפט אחד - אל תמחק ימים בעצמך.`;
      return {
        trip: { ...trip, ...dates },
        ok: true,
        message: `תאריכי הטיול נשמרו: ${dates.startDate} עד ${dates.endDate}.${note}`,
        action: `עדכנתי תאריכים: ${formatHebrewRange(dates.startDate, dates.endDate)}`,
      };
    }

    case 'set_booking_status': {
      if (!needTrip(trip)) {
        return fail(trip, 'אין טיול פעיל - מצב ההזמנות נשמר על טיול.');
      }
      const kinds: BookingKind[] = ['flights', 'stay', 'activities', 'esim', 'insurance', 'car'];
      const allowed: BookingStatus[] = ['have', 'need', 'not_needed'];
      /*
        Lodging and tickets belong to a city. `citySlug` is required for
        them, and rejected if it is not a city of this trip - **no fallback to
        the first city**: guessing here means recording "we have a hotel"
        against the wrong city, and that is exactly the kind of quiet error
        that ends with a traveler arriving with nowhere to sleep.
      */
      const rawCity = typeof input.citySlug === 'string' ? input.citySlug.trim() : '';
      const cityOk = rawCity && trip.citySlugs.includes(rawCity);
      let prefs: TripPreferences = { ...trip.preferences };
      const changed: string[] = [];
      for (const kind of kinds) {
        const v = input[kind];
        if (typeof v !== 'string' || !(allowed as string[]).includes(v)) continue;
        const perCity = bookingIsPerCity(kind);
        if (perCity && !cityOk) {
          return fail(
            trip,
            rawCity
              ? `"${rawCity}" אינה עיר של הטיול הזה. ${BOOKING_KIND_LABELS[kind]} נשמר לפי עיר - שלח citySlug מתוך ${JSON.stringify(trip.citySlugs)}.`
              : `${BOOKING_KIND_LABELS[kind]} שייך לעיר ולא לטיול. שלח citySlug מתוך ${JSON.stringify(trip.citySlugs)}, ושאל על עיר אחת בכל פעם.`,
          );
        }
        prefs = {
          ...prefs,
          ...setBookingStatus(prefs, kind, v as BookingStatus, {
            citySlug: perCity ? rawCity : undefined,
            citySlugs: trip.citySlugs,
          }),
        };
        changed.push(
          perCity
            ? `${BOOKING_KIND_LABELS[kind]} ${inHe(destOf(rawCity)?.name ?? rawCity)}`
            : BOOKING_KIND_LABELS[kind],
        );
      }
      if (changed.length === 0) return fail(trip, 'לא זוהה אף סוג הזמנה תקין בקלט.');
      const labels = changed.join(', ');
      return {
        trip: { ...trip, preferences: prefs },
        ok: true,
        // remind the model that the link is not its own - it is already shown in the UI
        message: `מצב ההזמנות עודכן: ${JSON.stringify({ booking: prefs.booking, byCity: prefs.bookingByCity })}. לינה וכרטיסים נשמרים לפי עיר. כפתורי ההזמנה מוצגים בממשק אוטומטית - אל תכתוב קישורים, מחירים או זמינות.`,
        action: `סימנתי: ${labels}`,
      };
    }

    /**
     * Events and closures on the traveler's own dates.
     *
     * Two behaviors, both honest: when the trip has dates, the entries
     * returned are those **overlapping their days in that city** (see
     * `matchTripWindows`); when there are no dates, whatever is stored for
     * the city is returned, with an explicit statement that it was not
     * matched to dates. In both cases an empty list comes back as an explicit
     * sentence - "we have nothing recorded" - and not as an error, because it
     * is not a malfunction.
     */
    case 'city_date_notes': {
      const slug = String(input.citySlug ?? '');
      const dest = destOf(slug);
      if (!dest) return fail(trip, `citySlug לא מוכר "${slug}". החוקיים: ${validSlugs()}.`);

      const RULES =
        'חובה: אל תוסיף תאריך, שם אמן, הרכב, מחיר כרטיס או קביעה אם משהו מתקיים השנה - גם לא מהידע שלך, גם אם המשתמש נקב בשם האירוע. מותר לצטט רק את מה שכתוב כאן. רשומה שהתאריכים שלה לא פורסמו - נאמרת בדיוק כך, במילים, ולא כתאריך. אין לצרף קישור לכרטיסים ואין להמליץ ללכת.';

      const cities = [{ slug, countrySlug: dest.countrySlug }];
      const dated = trip?.startDate ? matchTripCalendar(trip, calendar, cities) : null;

      /** one entry in the shape the model reads */
      const row = (e: CalendarEntry, extra: Record<string, string> = {}) => ({
        שם: e.name,
        סוג: impactLabel(e),
        משמעות: e.note,
        מקור: sourceLabel(e),
        ...extra,
      });

      if (dated) {
        const rows = [
          ...dated.dated.map((m) =>
            row(m.entry, {
              תאריכים: datedLabel(m),
              ודאות: 'תאריכים מאושרים',
              'ימים בטיול': dayRangeLabel(m.dayNumbers),
            }),
          ),
          ...dated.windows.map((w) =>
            row(w.entry, {
              'חלון משוער': w.entry.window ?? '',
              ודאות: `לא מאושר - ${NOT_PUBLISHED}`,
            }),
          ),
        ];
        if (rows.length === 0) {
          return {
            trip,
            ok: true,
            message: `אין לנו שום אירוע או תקופת סגירה רשומים ל${dest.name} בתאריכים של הטיול. אמור זאת בדיוק כך - שאין לנו מידע רשום לתאריכים האלה, ושכדאי לבדוק מקומית לקראת הנסיעה. אל תשלים מהידע שלך. ${RULES}`,
            action: undefined,
          };
        }
        return {
          trip,
          ok: true,
          eventNames: [
            ...dated.dated.map((m) => m.entry.name),
            ...dated.dated.map((m) => m.entry.nameLocal),
            ...dated.windows.map((w) => w.entry.name),
            ...dated.windows.map((w) => w.entry.nameLocal),
          ],
          message: `רשומות מלוח האירועים שנוגעות לימים של המטייל ב${dest.name}:\n${JSON.stringify(rows, null, 1)}\nהן כבר מוצגות למטייל מתחת לתוכנית, אז אין צורך לחזור על הכול - משפט או שניים על מה שרלוונטי לו. ${RULES}`,
          action: undefined,
        };
      }

      const all = calendar.filter(
        (e) => (e.destinationSlugs?.length ? e.destinationSlugs.includes(slug) : e.countrySlug === dest.countrySlug),
      );
      if (all.length === 0) {
        return {
          trip,
          ok: true,
          message: `אין לנו שום אירוע או תקופת סגירה רשומים ל${dest.name}. אמור זאת בדיוק כך - שאין לנו מידע רשום - ואל תשלים מהידע שלך. ${RULES}`,
          action: undefined,
        };
      }
      return {
        trip,
        ok: true,
        eventNames: [...all.map((e) => e.name), ...all.map((e) => e.nameLocal)],
        message: `לטיול אין תאריכים, ולכן זו רשימת מה ששמור על ${dest.name} **בלי התאמה לתאריכים**. אמור למטייל שברגע שיהיו תאריכים לטיול נוכל לומר לו מה מהם נופל עליהם.\n${JSON.stringify(
          all.map((e) =>
            row(e, e.datesConfirmed
              ? { תאריכים: (e.dates ?? []).map((d) => `${d.start} עד ${d.end}`).join(', ') }
              : { 'חלון משוער': e.window ?? '', ודאות: `לא מאושר - ${NOT_PUBLISHED}` }),
          ),
          null,
          1,
        )}\n${RULES}`,
        action: undefined,
      };
    }


    /**
     * A ready-made provider search. **The only tool that returns something
     * the user clicks on**, so it is also the place where it matters that
     * nothing from the model gets in besides two choices: kind and city.
     * There is no handling here of "what the model asked to have written" -
     * the card is built from the trip.
     *
     * Deliberate: **does not require an active trip.** "Find me a hotel in
     * Rome" before an itinerary was built is a legitimate request; there is
     * simply nothing to derive dates from, and the card says so instead of
     * inventing them.
     */
    case 'booking_search': {
      const kind = String(input.kind ?? '') as SearchKind;
      if (!SEARCH_KINDS.includes(kind)) {
        return fail(
          trip,
          `kind לא חוקי: "${input.kind}". החוקיים: ${SEARCH_KINDS.join(', ')}. מסעדות אינן נתמכות בכלי הזה - לאוכל יש להשתמש במקומות מהדאטה, בלי חיפוש מחירים.`,
        );
      }
      const slug = String(input.citySlug ?? '');
      const dest = destOf(slug);
      if (!dest) {
        return fail(trip, `citySlug לא מוכר "${slug}". החוקיים: ${validSlugs()}.`);
      }
      // Same rule as in BookingPanel: nameLocal is sometimes written
      // "Vienna / Wien", and a string with a slash returns empty results at
      // the providers
      const cityQuery = (dest.nameLocal || dest.name).split('/')[0].trim();
      const card = buildSearchCard(trip, kind, slug, cityQuery, dest.name, {
        kosher: input.kosher === true || undefined,
        accessible: input.accessible === true || undefined,
      });
      if (!card) {
        return fail(
          trip,
          'אין כרגע ספק מוגדר לסוג החיפוש הזה. אמור למטייל בכנות שאין לך דרך לפתוח חיפוש לזה, בלי להציע קישור משלך.',
        );
      }
      const missing = card.onProvider.length
        ? ` מה שלא נכנס לחיפוש ונקבע באתר הספק: ${card.onProvider.join(', ')}.`
        : '';
      return {
        trip,
        ok: true,
        // The result tells the model **what it must NOT write**. Same pattern
        // as PROSE_DISCIPLINE: the rule sits in the tool result, i.e. in the
        // last thing the model reads before it writes.
        message: `כרטיס חיפוש נוצר והוא מוצג למטייל בממשק, כולל גילוי נאות על עמלה. מה שכבר ממולא בחיפוש: ${card.understood.join(' · ')}.${missing}\nאל תכתוב מחיר, טווח מחירים, "בערך", זמינות, סוג חדר, דירוג כוכבים או שם מלון - אין לך נתונים כאלה והשרת מוריד אותם מהתשובה. אל תכתוב את הקישור: הוא כבר על המסך. אסור לומר "הזול ביותר" או "המחיר הטוב ביותר". תשובה נכונה כאן היא שתי שורות: שאתה לא יכול לבדוק מחירים וזמינות בעצמך, ומה החיפוש כבר כולל.`,
        action: `פתחתי חיפוש ${kind === 'stay' ? 'לינה' : 'חוויות'} ${inHe(dest.name)}`,
        search: card,
      };
    }

    case 'add_pin': {
      if (!needTrip(trip)) {
        return fail(trip, 'אין טיול פעיל - סיכה נשמרת על טיול קיים.');
      }
      const pinName = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
      if (!pinName) return fail(trip, 'name חסר או ריק.');
      const kindRaw = typeof input.kind === 'string' ? input.kind : '';
      if (!PIN_KIND_SET.has(kindRaw)) {
        return fail(trip, `kind חייב להיות אחד מ: ${PIN_KINDS.join(', ')}.`);
      }
      const kind = kindRaw as TripPinKind;
      // an unknown city does not fail the pin - it is simply saved with no city attribution
      const citySlug =
        typeof input.citySlug === 'string' && destOf(input.citySlug) ? input.citySlug : undefined;

      const pins = [...(trip.pins ?? [])];
      // same name in the same city = an update, not a duplicate
      const sameName = (p: TripPin) =>
        p.name.trim().toLowerCase() === pinName.toLowerCase() && p.citySlug === citySlug;
      const pin: TripPin = {
        id: pins.find(sameName)?.id ?? newId(),
        kind,
        name: pinName,
        citySlug,
        note: typeof input.note === 'string' ? input.note.trim().slice(0, 200) : undefined,
        ...(resolved
          ? { lat: resolved.lat, lng: resolved.lng, address: resolved.address, source: 'geocoded' as const }
          : {}),
        createdAt: Date.now(),
      };
      const existing = pins.findIndex(sameName);
      if (existing >= 0) pins[existing] = pin;
      else pins.push(pin);
      if (pins.length > MAX_PINS) {
        return fail(trip, `יש כבר ${MAX_PINS} סיכות בטיול - הסר אחת עם remove_pin לפני שמוסיפים.`);
      }

      /*
        A saved lodging pin also changes the booking status: there is no
        point offering a hotel search for a city that already has a hotel.
        The other kinds do not touch it.

        **For the pin's city only.** This comment said "for the city" from
        day one, but the storage only knew a whole trip - so a hotel pin in
        Vienna also marked Bratislava as settled, and the traveler stopped
        getting an offer to search there. A pin without a city changes
        nothing: there is nobody to attribute it to.
      */
      const preferences =
        kind === 'stay' && pin.citySlug
          ? {
              ...trip.preferences,
              ...setBookingStatus(trip.preferences, 'stay', 'have', {
                citySlug: pin.citySlug,
                citySlugs: trip.citySlugs,
              }),
            }
          : trip.preferences;

      const label = PIN_KIND_LABELS[kind];
      const updated: Trip = { ...trip, pins, preferences };
      // Real distances to that city's stops - so the model quotes a correct
      // number instead of inventing proximity. See pinDistances.
      const near = pinDistances(updated, pin);
      const nearLine =
        near.length > 0
          ? ` מרחקים אמיתיים מהסיכה לעצירות בעיר (אווירי, לא הליכה): ${near
              .slice(0, 6)
              .map((n) => `${n.name} - ${n.away}`)
              .join('; ')}. מותר לצטט רק את המספרים האלה, תמיד עם המילה "אווירי", ואסור להמיר אותם לדקות הליכה.`
          : '';
      return {
        trip: updated,
        ok: true,
        message: resolved
          ? `הסיכה נשמרה ומוקמה על המפה: ${pinName} (${resolved.address}). אל תכתוב קואורדינטות בתשובה - המפה כבר מציגה אותה. נשמרו רק שם, עיר, הכתובת הזו והערה חופשית: אין בסיכה תאריכים, שעות צ׳ק-אין או מחיר, אז אל תגיד שנשמרו.${nearLine}`
          : `הסיכה נשמרה אבל לא הצלחנו לאתר את המיקום המדויק. אמור למטייל שהיא מסומנת "מיקום לא אומת" ושהוא יכול לגרור אותה למקום הנכון על המפה. אל תנחש היכן היא נמצאת ואל תתאר את הסביבה בכלל.`,
        action: resolved ? `הוספתי למפה: ${label} · ${pinName}` : `שמרתי ${label}: ${pinName} (מיקום לא אומת)`,
      };
    }

    case 'remove_pin': {
      if (!needTrip(trip)) return fail(trip, 'אין טיול פעיל.');
      const target = typeof input.name === 'string' ? input.name.trim().toLowerCase() : '';
      if (!target) return fail(trip, 'name חסר או ריק.');
      const pins = trip.pins ?? [];
      const match = pins.find((p) => p.name.trim().toLowerCase() === target);
      if (!match) {
        const names = pins.map((p) => p.name).join(', ') || 'אין סיכות בטיול';
        return fail(trip, `לא נמצאה סיכה בשם "${input.name}". הסיכות הקיימות: ${names}.`);
      }
      return {
        trip: { ...trip, pins: pins.filter((p) => p.id !== match.id) },
        ok: true,
        message: `הסיכה "${match.name}" הוסרה.`,
        action: `הסרתי סיכה: ${match.name}`,
      };
    }

    default:
      return fail(trip, `כלי לא מוכר: ${name}.`);
  }
}

/**
 * The preferences without the travel style. See the comment at the point of
 * use: the style exists solely for a cost display computed in code, and the
 * model has no use for it.
 */
export function withoutTravelStyle(prefs: TripPreferences | undefined): TripPreferences {
  if (!prefs) return {};
  const rest = { ...prefs };
  delete rest.travelStyle;
  return rest;
}

/** The trip state as the model sees it - days numbered 1-based, places with name+id */
export function serializeTripForModel(trip: Trip | null): string {
  if (!trip) return 'null (אין טיול פעיל - השתמש ב-create_trip כדי להתחיל)';
  return JSON.stringify({
    name: trip.name,
    // The dates as a fact, including the exact date of every day below:
    // without this the model "computes" dates itself, which is exactly the
    // kind of number it invents with confidence.
    ...(trip.startDate ? { startDate: trip.startDate, endDate: trip.endDate } : {}),
    // `travelStyle` is removed here deliberately. It is used **only** to show
    // a daily spend figure from stored data, and its arithmetic is done in
    // code. If the model saw it, it would tend to explain it and name a
    // number of its own - which is exactly the number that must not be here.
    // What it does not see it cannot describe.
    preferences: withoutTravelStyle(trip.preferences),
    // The pins the traveler already provided - so the agent does not ask
    // again about a city that already has lodging, and does not offer a
    // search for a saved place. locatedOnMap=false means the location was not
    // verified and the traveler needs to place it themselves.
    pins: (trip.pins ?? []).map((p) => ({
      kind: p.kind,
      name: p.name,
      citySlug: p.citySlug,
      locatedOnMap: typeof p.lat === 'number' && typeof p.lng === 'number',
      note: p.note,
      // The distances ride along on every turn, not only on the turn the pin
      // was added: live testing showed the "within walking distance"
      // invention happened precisely on a later turn, with no add_pin call,
      // when the model had no real number in hand.
      airDistancesToStops: pinDistances(trip, p).slice(0, 6),
    })),
    days: trip.days.map((d, i) => ({
      day: i + 1,
      ...(trip.startDate ? { date: dayDate(trip, i) } : {}),
      citySlug: d.citySlug,
      city: destOf(d.citySlug)?.name ?? d.citySlug,
      places: d.placeIds.map((id) => ({ id, name: placeName(d.citySlug, id) })),
      notes: d.notes,
    })),
  });
}

/**
 * Pins coming back from the client. A coordinate is kept only if it is a
 * valid in-range number - a corrupt value is dropped and the pin stays
 * "unverified" instead of being drawn in the sea.
 */
function sanitizePins(raw: unknown): TripPin[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const pins: TripPin[] = [];
  for (const p of raw.slice(0, MAX_PINS)) {
    if (!p || typeof p !== 'object') continue;
    const pp = p as Record<string, unknown>;
    const name = typeof pp.name === 'string' ? pp.name.trim().slice(0, 80) : '';
    if (!name) continue;
    if (typeof pp.kind !== 'string' || !PIN_KIND_SET.has(pp.kind)) continue;
    const lat = typeof pp.lat === 'number' && Number.isFinite(pp.lat) ? pp.lat : undefined;
    const lng = typeof pp.lng === 'number' && Number.isFinite(pp.lng) ? pp.lng : undefined;
    const located =
      lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    pins.push({
      id: typeof pp.id === 'string' ? pp.id : newId(),
      kind: pp.kind as TripPinKind,
      name,
      citySlug:
        typeof pp.citySlug === 'string' && destOf(pp.citySlug) ? pp.citySlug : undefined,
      address: typeof pp.address === 'string' ? pp.address.slice(0, 200) : undefined,
      ...(located ? { lat, lng } : {}),
      source: pp.source === 'manual' || pp.source === 'geocoded' ? pp.source : undefined,
      note: typeof pp.note === 'string' ? pp.note.slice(0, 200) : undefined,
      createdAt: typeof pp.createdAt === 'number' ? pp.createdAt : undefined,
    });
  }
  return pins.length > 0 ? pins : undefined;
}

/** Light validation of the trip that arrived from the client - structure only, no content invented */
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
    // the client sends its own trip; a date that is not a valid YYYY-MM-DD simply drops out
    ...safeDates(t as { startDate?: unknown; endDate?: unknown }),
    pins: sanitizePins(t.pins),
    preferences:
      t.preferences && typeof t.preferences === 'object'
        ? (t.preferences as Trip['preferences'])
        : undefined,
  };
}
