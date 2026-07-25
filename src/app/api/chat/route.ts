import { destinations } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';
import { isKosher } from '@/lib/categories';
import {
  AGENT_TOOLS,
  executeAgentTool,
  sanitizeClientTrip,
  serializeTripForModel,
} from '@/lib/trip/agent';
import type { Trip } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { exploreDestination, type ExploreScope } from '@/lib/explore/resolver';
import { exploredToDestination, sanitizeExploredDestinations } from '@/lib/explore/adapter';
import { checkLimit, aiUnitsUsedToday, recordAiUnits } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { PLAN_LIMITS, aiUnits } from '@/lib/plans';

/**
 * צ׳אט הטיולים - סוכן אמיתי מעל הטיול של המשתמש.
 *
 * שני מצבים:
 * 1. בלי מפתח API - עונה מבוסס-חוקים מעל הדאטה (עובד מיד, בלי לולאת כלים).
 * 2. עם ANTHROPIC_API_KEY - לולאת tool-use צד-שרת: הלקוח שולח את הטיול
 *    הנוכחי, המודל מקבל אותו + grounding + כלים, ומריץ פעולות (create_trip,
 *    add_day, add_place...) על עותק בזיכרון עם ולידציה קשיחה (agent.ts).
 *    קריאה לא-חוקית מחזירה tool_result עם is_error והמודל מתקן. עד 8
 *    איטרציות, ואז תשובת טקסט סופית.
 *
 * התשובה היא תמיד text/event-stream של אירועי JSON:
 *   {type:'text', text}                        - מקטע טקסט מוזרם
 *   {type:'meta', destinationSlug?, placeIds?} - בסוף, כדי שהלקוח יציג מפה
 *   {type:'trip', trip, actions}               - הטיול המעודכן + "מה בוצע" בעברית
 *   {type:'done'}                              - סיום
 */

export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatReply {
  reply: string;
  destinationSlug?: string;
  placeIds?: string[];
}

function findDestination(text: string) {
  const lower = text.toLowerCase();
  const direct = destinations.find((d) => text.includes(d.name) || lower.includes(d.slug));
  if (direct) return direct;
  // "צריך ויזה לאיטליה?" - שאלה ברמת מדינה מובילה לעיר שלה
  const country = countries.find((c) => text.includes(c.name) || lower.includes(c.slug));
  return country ? destinations.find((d) => d.countrySlug === country.slug) : undefined;
}

function ruleBasedReply(text: string): ChatReply {
  const dest = findDestination(text);
  const wantsKosher = /כשר|כשרות|בשר|חלבי/.test(text);
  const wantsShopping = /שופינג|קניות|קניון|חנויות/.test(text);
  const wantsPractical = /טיסה|טיסות|ויזה|סים|esim|תשלום|מטבע|כסף/i.test(text);
  const wantsItinerary = /מסלול|ימים|יום|תכנון|תוכנית|לתכנן/.test(text);

  if (!dest) {
    // טקסט בלבד: אימוג׳י דגל מוצג בווינדוס כקוד דו-אותי, ולכן רק השם
    const countryNames = countries.map((c) => c.name).join(' · ');
    return {
      reply: `היי! אני עוזר הטיולים של טיול+ 🧭\n\nכרגע יש לי מסלולים מלאים ב:\n${countryNames}\n\nאפשר לשאול אותי למשל:\n• "תבנה לי מסלול ל-4 ימים בוינה"\n• "איפה אוכלים כשר ברומא?"\n• "צריך ויזה לאיטליה?"`,
    };
  }

  if (wantsShopping) {
    const shops = dest.places.filter((p) => p.category === 'shopping');
    if (shops.length > 0) {
      const lines = shops.map((p) => `• **${p.name}** (${p.nameLocal}) - ${p.description}`);
      return {
        reply: `🛍️ שופינג ב${dest.name}:\n\n${lines.join('\n')}\n\nטיפ: באשף המסלולים אפשר לבחור "יותר שופינג" והמסלול ישבץ את זה אוטומטית. סימנתי על המפה 👇`,
        destinationSlug: dest.slug,
        placeIds: shops.map((p) => p.id),
      };
    }
  }

  if (wantsKosher) {
    const kosherPlaces = dest.places.filter((p) => isKosher(p.category));
    const lines = kosherPlaces.map(
      (p) => `• **${p.name}** (${p.nameLocal}) - ${p.description}${p.kosherNote ? `\n  ⚠️ ${p.kosherNote}` : ''}`,
    );
    return {
      reply: `✡️ ${'אוכל כשר ב' + dest.name}:\n\n${lines.join('\n')}\n\n${dest.practical.kosherOverview}\n\nסימנתי את הכול על המפה למטה 👇`,
      destinationSlug: dest.slug,
      placeIds: kosherPlaces.map((p) => p.id),
    };
  }

  if (wantsPractical) {
    const p = dest.practical;
    const c = getCountryBySlug(dest.countrySlug)?.practical;
    return {
      reply: `מידע פרקטי ל${dest.name}:\n\n✈️ **טיסות:** ${p.flights}\n🛂 **ויזה:** ${c?.visa ?? ''}\n💶 **מטבע:** ${c?.currency ?? ''}\n📱 **סים:** ${c?.sim ?? ''}\n💳 **תשלומים:** ${c?.payments ?? ''}\n🚇 **תחבורה:** ${p.gettingAround}`,
      destinationSlug: dest.slug,
    };
  }

  if (wantsItinerary) {
    const days = dest.itinerary.map((d) => {
      const names = d.placeIds
        .map((id) => dest.places.find((pl) => pl.id === id)?.name)
        .filter(Boolean)
        .join(' ← ');
      return `**יום ${d.day} - ${d.title}:** ${names}${d.notes ? `\n💡 ${d.notes}` : ''}`;
    });
    return {
      reply: `🗓️ המסלול המומלץ ל${dest.name} (${dest.itinerary.length} ימים):\n\n${days.join('\n\n')}\n\nכל העצירות מסומנות במפה למטה, ובמתכנן המסלולים אפשר לראות כל יום בנפרד עם ניווט 👇`,
      destinationSlug: dest.slug,
      placeIds: dest.itinerary.flatMap((d) => d.placeIds),
    };
  }

  return {
    reply: `${dest.name} - ${dest.tagline}.\n\n${dest.summary}\n\nאפשר לשאול אותי על המסלול המלא, על אוכל כשר, או על מידע פרקטי (טיסות, ויזה, סים).`,
    destinationSlug: dest.slug,
    placeIds: dest.places.map((p) => p.id),
  };
}

const SYSTEM_PROMPT = `You are "טיולי" - the AI travel agent of tiyul+ (טיול+), a Hebrew travel-planning site for Israeli travelers.

LANGUAGE & VOICE
- Always answer in natural, warm Israeli Hebrew (unless the user writes in another language). Direct and friendly, like a savvy friend who plans trips for a living. Professional, not childish; at most one emoji per answer, often none.
- Keep answers tight. Short questions get short answers. Full itineraries get structure. Hard discipline: a single reply stays well under ~250 Hebrew words - the UI shows the trip live, so never dump long lists that the panel already renders.

GROUNDING - THE MOST IMPORTANT RULE
- You may only recommend specific places, restaurants and attractions that exist in the DATA provided below. Never invent places, opening hours, prices, or kashrut status.
- If asked about a destination not in the data: call explore_destination ONCE with its name. On success you get an ephemeral auto-explored city (slug starts with "explored-") with real places from public sources - you may build/edit trips with it like any other city, but ALWAYS say clearly it was auto-explored and unverified ("נחקר אוטומטית - חשוב לוודא את הפרטים"), and never claim flight/visa/kosher facts for it. If exploration fails, say honestly it's not covered, name close destinations that are, and offer them.
- General travel knowledge (weather, culture, packing tips) is fine; specific venue facts must come from the data.

TRIP EDITING - YOU ARE AN AGENT WITH TOOLS
- You have tools that edit the user's actual trip. Its live state is in CURRENT TRIP (after the DATA). When the user's intent is an action - "תבנה לי", "תוסיף", "תוריד", "תחליף", "תזיז" - DO it with tools; don't just describe what could be done.
- Day numbers and stop positions are 1-based, exactly as shown in CURRENT TRIP. After remove_day the numbering shifts - read the tool results carefully.
- placeIds must come from the DATA. If the user names a place that is not in the DATA, say honestly that it's not in your curated data and offer the closest real alternatives - NEVER invent an id.
- Building a NEW trip: use create_trip_full - ONE call with the name and every day's places, in geographic order (relaxed pace ≈ 3-4 stops/day, packed ≈ 5-6). Honor stored preferences: kosher=true → include a kosher-food place each day where the city has one; kosher not set → include NO kosher places.
- ROUTE ORDER IS GEOGRAPHY, NOT A LIST. Day 1 starts where the user actually lands (if they said where they arrive - that city is day 1, no exceptions) and the last day ends at the departure city; when arrival = departure, plan a loop that travels outward and returns only at the end. Each city gets ONE contiguous block of days - never leave a city and come back to it mid-trip. Order the cities so each hop is the short next step, not a crossing of the whole country. After create_trip_full the tool result reports the REAL route with computed distances; if it carries a זגזוג warning, you got the order wrong - fix it with set_day_places in the SAME turn before replying.
- NEVER leave a day empty at the end of your turn. If you used create_trip/add_day, fill every day with set_day_places before finishing. The granular tools (add_place, remove_place, move_place) are for small edits only.
- Inventory is limited: each city has only 8-12 curated places, and a place may appear ONCE in the whole trip. For long stays in one city plan fewer stops per day (2-3) or lighter days with a good note - if places genuinely run out, say so honestly. Plan the distribution BEFORE calling create_trip_full so the call passes validation the first time.
- NEVER end your turn announcing a build or a fix you have not executed ("אני בונה עכשיו", "אני מתקן") - make the corrected tool call in the same turn, then summarize.
- If the destination(s) and trip length are known - BUILD IMMEDIATELY with sensible defaults (relaxed pace, even day split between cities, no assumed preferences) and note briefly that everything is adjustable. Do NOT ask clarifying questions first in that case. Ask 1-2 short questions only when the destination or the number of days is genuinely missing; small edits need no questions. When a question has a small closed set of answers (מספר ימים, יעד, מי נוסע) also call suggest_quick_replies with 2-4 short Hebrew options.
- NEVER ask about kashrut, Shabbat, or any religious observance. These preferences arrive silently from UI toggles (or the user volunteering them) and appear in CURRENT TRIP preferences - read them fresh every turn and apply them without commenting on the change. If kosher is not set, do not raise the topic AND do not put kosher-food/kosher-market places into the itinerary at all - not even one, not as a "nice option". Recommend ordinary places instead. (The tool layer strips kosher places from create_trip_full/set_day_places when the preference is not set, so planning them is wasted effort.) Only when the user explicitly asks about kosher - or sets the preference - do kosher places enter the plan.
- Destructive changes - remove_day, or create_trip/create_trip_full when a trip already exists - require confirmation: describe what will be lost and ask; call the tool only after the user confirms in their next message.
- When the user states a lasting preference (כשרות, שבת, תקציב, קצב, מי נוסע, תחומי עניין) call set_preferences, and let it shape every recommendation from then on. Preferences are options, never assumptions - store only what was actually said.
- After making changes, wrap up with one or two natural Hebrew sentences summarizing what you did. The trip panel in the UI updates live, so don't dump the full itinerary as text.

HOW YOU WORK
- Understand before planning: if the request lacks key details, ask at most 1-2 short questions (dates/season, who's traveling, pace, interests - never kashrut/religion). Never interrogate with a checklist.
- Preferences are options, never assumptions: kosher food, Shabbat-friendly pacing, budget level, kids, shopping - apply each only when the user asks or confirms. When kosher matters, use the kosher places in the data and ALWAYS add a short reminder to verify kashrut and hours with the venue before visiting.
- Recommendation answers (no edit intent): format itineraries as a bold day title line (**יום 1 - ...**), then the stops separated by " ← ", then one practical tip line. Use ** for bold and plain newlines only - no markdown headers, tables or links.
- Israeli practicalities: when relevant, weave in the data's info on direct flights from TLV, visas, eSIM and payments.
- DISTANCE IS NOT A LIMIT. Never refuse or water down a plan because a place is outside the city center. If the travelers have or want a car (preferences.booking.car = 'have' | 'need') or mention driving, out-of-town stops - nature, villages, castles, lakes, a day trip of up to about an hour's drive - are exactly what a car is for: plan them, mention the rough drive, and call explore_destination with scope 'area' so the wider area is searched too. Without a car, prefer places reachable on foot or by public transport, and when a great spot needs a car say so plainly and offer it as an option (a day tour / rental) instead of hiding it.
- "הטיול הגדול" / after-army trips: embrace it warmly - it's a rite of passage. Propose a long multi-country route from the COVERED countries only, at a budget pace: start with the cheaper destinations (בודפשט, ברטיסלבה, אתונה; פראג וברלין גם ידידותיות לתקציב), suggest lighter days and cheap-eats over fancy restaurants, and use create_trip_full for the whole route. Be honest that the classic הטיול הגדול destinations (דרום אמריקה, המזרח) aren't in your data yet - offer the European version proudly, not apologetically.
- Point to the product when it helps: after building or editing a trip, mention that in מתכנן המסלולים they can fine-tune it and open each day as navigation in Google Maps.

BOOKING - YOU RAISE IT, THE APP LINKS IT
- The trip has a booking state in CURRENT TRIP preferences.booking: flights / stay / activities / esim / insurance / car, each 'have' | 'need' | 'not_needed'. A missing key means the user was never asked.
- You decide WHAT to raise and WHEN; you NEVER produce a link, price, availability or discount. The app renders the actual booking buttons itself from its own affiliate config, right under the itinerary. Writing a URL yourself is a hard error - it would be an invented link.
- Timing: only AFTER a real itinerary exists and the user seems satisfied with it. Never in the first turn, never while still building, never instead of answering what was asked.
- Ask about at most ONE topic per turn, in one short sentence at the end of your reply, and attach suggest_quick_replies with the natural answers (למשל "יש לנו טיסות" / "עוד לא"). Pick the topic that fits the trip: flights and stay first; activities when the plan has must-see attractions that need advance tickets; car when the days include out-of-town nature stops; esim/insurance only if the user brings up connectivity or safety.
- The moment the user answers - even in passing, even mid-sentence about something else ("טיסות כבר יש לנו", "עוד לא סגרנו מלון") - call set_booking_status IN THAT SAME TURN, before writing your reply. Saying "רשמתי" without having called the tool is a hard error: nothing was recorded. If part of the sentence is vague ("הכל סגור חוץ מהכרטיסים"), still record the part that IS explicit (activities=need) and simply leave the vague part unset - partial is fine, guessing is not. Never ask again about a topic that already has a value - read preferences.booking fresh each turn. If the user shows no interest, drop the subject entirely; this is help, not sales.

BOUNDARIES
- You don't book, take payments, or hold personal data. You may say that booking options appear as buttons under the plan, but never write out a link, a price or an availability claim yourself.
- Stay on travel topics; politely steer back if the conversation drifts far off.
- If you're not sure about something, say so plainly - trust is the product.

DATA (destinations, places, itineraries, practical info):
`;

/**
 * ה-grounding בנוי בשתי שכבות, כי הקטלוג גדל ל-47 ערים ו-500+ מקומות:
 *
 * 1. INDEX - קבוע וזהה בכל קריאה, ולכן נושא את cache_control: כל עיר עם
 *    כל המקומות שלה ברמת id/שם/קטגוריה/תגיות. זה מה שהמודל חייב כדי
 *    לבנות ולתקף מסלול, ולעולם לא להמציא מזהה.
 * 2. DETAIL - רק לערים הרלוונטיות לתור הנוכחי (הערים שבטיול + ערים
 *    שהוזכרו בשיחה): תיאורי מקומות, מסלול אוצר, מידע פרקטי ומידע
 *    המדינה. הבלוק הזה קטן ומשתנה, ולכן יושב אחרי נקודת השבירה של
 *    המטמון.
 *
 * לפני הפיצול נשלחו ~118k טוקנים בכל קריאה - ובבניית טיול יש 5 קריאות
 * רצופות, כך שזה היה גורם הזמן הדומיננטי.
 */
function buildGroundingIndex(): string {
  return JSON.stringify({
    note: 'INDEX of every city and place. Use these ids verbatim. Detail for the relevant cities follows in the next block.',
    cities: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      countrySlug: d.countrySlug,
      places: d.places.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        ...(p.tags?.length ? { tags: p.tags } : {}),
        ...(p.priceLevel !== undefined ? { priceLevel: p.priceLevel } : {}),
        ...(p.mustSee ? { mustSee: true } : {}),
        ...(p.durationMin ? { durationMin: p.durationMin } : {}),
      })),
    })),
    countries: countries.map((c) => ({ slug: c.slug, name: c.name })),
  });
}

/** ערים שהשיחה נוגעת בהן: הטיול הפעיל + אזכור בשם עיר/מדינה/שם מקומי */
function relevantCitySlugs(messages: ChatMessage[], trip: Trip | null): string[] {
  const slugs = new Set<string>(trip?.citySlugs ?? []);
  const text = messages
    .slice(-6)
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  for (const d of destinations) {
    const country = countries.find((c) => c.slug === d.countrySlug);
    const needles = [d.name, d.nameLocal, d.slug, country?.name].filter(Boolean) as string[];
    if (needles.some((n) => text.includes(n.toLowerCase()))) slugs.add(d.slug);
  }
  // בלי שום רמז - נותנים פירוט על מדגם קטן כדי שהתשובה הראשונה לא תהיה עקרה
  if (slugs.size === 0) return destinations.slice(0, 6).map((d) => d.slug);
  return [...slugs];
}

/** בלוק grounding נפרד ליעדים שנחקרו - מסומן חד-משמעית כלא-מאומת */
function buildExploredGrounding(explored: Destination[]): string {
  if (explored.length === 0) return '';
  return `\n\nAUTO-EXPLORED (unverified, from public sources - label as such to the user):\n${JSON.stringify(
    explored.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary.slice(0, 200),
      places: d.places.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    })),
  )}`;
}

function buildGroundingDetail(citySlugs: string[]): string {
  const cities = destinations.filter((d) => citySlugs.includes(d.slug));
  const countrySlugs = new Set(cities.map((d) => d.countrySlug));
  return JSON.stringify({
    note: 'DETAIL for the cities this conversation touches. Other cities: use the INDEX above, and say plainly if you need specifics we did not load.',
    countries: countries
      .filter((c) => countrySlugs.has(c.slug))
      .map((c) => ({ slug: c.slug, name: c.name, summary: c.summary, practical: c.practical })),
    cities: cities.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary,
      practical: d.practical, // טיסות, תחבורה, כשרות - ברמת עיר
      itinerary: d.itinerary,
      places: d.places.map((p) => ({
        id: p.id,
        name: p.name,
        nameLocal: p.nameLocal,
        category: p.category,
        description: p.description.length > 90 ? `${p.description.slice(0, 90)}…` : p.description,
        kosherNote: p.kosherNote,
      })),
    })),
  });
}

/** טקסט התקדמות אמיתי לפי הכלי שרץ עכשיו - לא הודעות דמה מתחלפות */
function toolStatusText(name: string, input: Record<string, unknown>): string {
  const day = typeof input.dayNumber === 'number' ? ` ${input.dayNumber}` : '';
  switch (name) {
    case 'create_trip_full': {
      const plans = Array.isArray(input.dayPlans) ? input.dayPlans.length : 0;
      return plans ? `בונה מסלול של ${plans} ימים…` : 'בונה את המסלול…';
    }
    case 'create_trip':
      return 'פותח טיול חדש…';
    case 'add_day':
      return 'מוסיף יום…';
    case 'set_day_places':
      return `מסדר את העצירות ביום${day}…`;
    case 'add_place':
      return `מוסיף עצירה ליום${day}…`;
    case 'remove_place':
      return `מסיר עצירה מיום${day}…`;
    case 'move_place':
      return 'מזיז עצירה…';
    case 'remove_day':
      return 'מוחק יום…';
    case 'rename_trip':
      return 'מעדכן את שם הטיול…';
    case 'set_preferences':
      return 'שומר את ההעדפות…';
    case 'explore_destination': {
      const name = typeof input.query === 'string' ? input.query : '';
      const area = input.scope === 'area' ? ' והאזור סביבו' : '';
      return `חוקר את היעד ${name}${area}…`.replace(/\s+…$/, '…');
    }
    case 'set_booking_status':
      return 'מעדכן מה כבר סגור…';
    default:
      return 'עובד על זה…';
  }
}

type StreamEvent =
  | { type: 'text'; text: string }
  // התקדמות אמיתית מלולאת הכלים - כדי שהמתנה ארוכה לא תיראה תקועה
  | { type: 'status'; text: string }
  | { type: 'meta'; destinationSlug?: string; placeIds?: string[] }
  | { type: 'trip'; trip: Trip; actions: string[] }
  | { type: 'quickReplies'; replies: string[] }
  // יעד שנחקר אוטומטית בתור הזה - הלקוח שומר אותו ומרנדר איתו את הקנבס
  | { type: 'explored'; destination: Destination }
  | { type: 'done' };

type Send = (event: StreamEvent) => void;

interface AnthropicUsage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
}

interface AnthropicSSE {
  type: string;
  index?: number;
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type: string; text?: string; partial_json?: string; stop_reason?: string };
  usage?: AnthropicUsage; // על message_delta - output_tokens סופי
  message?: { usage?: AnthropicUsage };
}

type AccBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; json: string };

type ApiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ApiContentBlock[];
}

/**
 * איטרציה אחת מול Claude בסטרימינג: טקסט מוזרם ללקוח מיד; בלוקים של
 * tool_use נצברים (partial_json) ומוחזרים לביצוע. needSeparator מוסיף
 * שורה ריקה לפני הטקסט הראשון כשכבר הוזרם טקסט מאיטרציה קודמת.
 */
async function runClaudeTurn(
  apiMessages: ApiMessage[],
  trip: Trip | null,
  send: Send,
  needSeparator: boolean,
  maxTokens: number,
  iter: number,
  kosherHint: boolean,
  groundingDetail: string,
): Promise<{ blocks: AccBlock[]; stopReason: string; text: string; usage: AnthropicUsage }> {
  const model = process.env.ANTHROPIC_MODEL_AGENT ?? 'claude-sonnet-4-5';
  // טוגל כשרות מה-UI לפני שקיים טיול: מוסרים לסוכן בשקט דרך בלוק המצב
  const kosherNote =
    kosherHint && !trip
      ? '\n\nUI PREFERENCE TOGGLE: the user switched ON "אוכל כשר" in the interface before any trip exists. Treat kosher=true from your first plan (include a kosher-food place per day where the city has one, with the usual verify-before-visiting reminder), and call set_preferences {kosher: true} immediately after creating a trip. Never ask about it.'
      : '';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(50_000),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      tools: AGENT_TOOLS,
      // סדר הרינדור: tools (סטטי) → system. ה-grounding הוא הבלוק עם
      // cache_control - כל הקידומת הקבועה נכנסת ל-prompt cache; מצב הטיול
      // המשתנה יושב אחרי נקודת השבירה ולא פוגע בקריאות מהמטמון.
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        // האינדקס קבוע -> נשאר במטמון בין תורים ובין משתמשים
        { type: 'text', text: buildGroundingIndex(), cache_control: { type: 'ephemeral' } },
        // הפירוט משתנה לפי השיחה -> אחרי נקודת השבירה, בלי cache_control
        { type: 'text', text: groundingDetail },
        { type: 'text', text: `CURRENT TRIP (the user's active trip right now):\n${serializeTripForModel(trip)}${kosherNote}` },
      ],
      messages: apiMessages,
    }),
  });

  if (!res.ok || !res.body) throw new Error(`anthropic ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const byIndex = new Map<number, AccBlock>();
  let announcedTool = false;
  let buffer = '';
  let stopReason = 'end_turn';
  let text = '';
  let sepPending = needSeparator;
  const usage: AnthropicUsage = {};

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let event: AnthropicSSE;
      try {
        event = JSON.parse(line.slice(5)) as AnthropicSSE;
      } catch {
        continue;
      }
      if (event.type === 'content_block_start' && event.index !== undefined && event.content_block) {
        if (event.content_block.type === 'tool_use') {
          const name = event.content_block.name ?? '';
          byIndex.set(event.index, {
            type: 'tool_use',
            id: event.content_block.id ?? '',
            name,
            json: '',
          });
          // שם הכלי ידוע כבר כאן, לפני שה-JSON של הקלט מוזרם (החלק הארוך) -
          // אז אפשר לומר למשתמש מה עומד לקרות במקום להשאיר "חושב" 10 שניות.
          // רק לכלי הראשון בתור: המודל פותח את כל בלוקי הכלים ברצף, וכיווץ
          // כולם לכאן היה מקדים סטטוסים לפני שהפעולה שלפניהם בכלל רצה.
          if (name && !announcedTool) {
            announcedTool = true;
            send({ type: 'status', text: toolStatusText(name, {}) });
          }
        } else if (event.content_block.type === 'text') {
          byIndex.set(event.index, { type: 'text', text: '' });
        }
      } else if (event.type === 'content_block_delta' && event.index !== undefined && event.delta) {
        const block = byIndex.get(event.index);
        if (event.delta.type === 'text_delta' && event.delta.text) {
          if (sepPending) {
            send({ type: 'text', text: '\n\n' });
            text += '\n\n';
            sepPending = false;
          }
          send({ type: 'text', text: event.delta.text });
          text += event.delta.text;
          if (block?.type === 'text') block.text += event.delta.text;
        } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
          if (block?.type === 'tool_use') block.json += event.delta.partial_json;
        }
      } else if (event.type === 'message_delta') {
        if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
        if (event.usage?.output_tokens !== undefined) usage.output_tokens = event.usage.output_tokens;
      } else if (event.type === 'message_start' && event.message?.usage) {
        Object.assign(usage, event.message.usage);
      }
    }
  }

  // ניטור עלויות בפיתוח: cached > 0 מאיטרציה 2 ומטור 2 = ה-prompt cache עובד
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[chat] ${model} iter=${iter} max=${maxTokens} in=${usage.input_tokens ?? 0} cached=${usage.cache_read_input_tokens ?? 0} cacheWrite=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens ?? 0}`,
    );
  }

  const blocks = [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, blk]) => blk);
  return { blocks, stopReason, text, usage };
}

/** לולאת הסוכן: קריאות מודל ↔ ביצוע כלים על עותק הטיול, עד תשובת טקסט */
async function runAgent(
  messages: ChatMessage[],
  clientTrip: Trip | null,
  send: Send,
  kosherHint: boolean,
  explored: Destination[],
  meter: { units: number },
): Promise<void> {
  let working = clientTrip;
  const actions: string[] = [];
  let touched = false;
  let full = '';
  let quickReplies: string[] | null = null;
  const apiMessages: ApiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

  // טוגל הכשרות מה-UI: כשיש טיול - מטמיעים ישירות ב-preferences (העדפות
  // רגישות הן כפתורים; הסוכן קורא אותן בשקט ולעולם לא שואל)
  if (kosherHint && working && working.preferences?.kosher !== true) {
    working = { ...working, preferences: { ...working.preferences, kosher: true } };
    touched = true; // כדי שהטיול המעודכן יחזור ללקוח ויישמר
  }

  // משמעת פלט: תשובת טקסט רגילה מוגבלת ל-1024; איטרציות עם כלים (זיהוי
  // כוונת עריכה, או המשך לולאה אחרי tool_results) מקבלות 2048 בשביל JSON.
  const lastUser = messages[messages.length - 1]?.content ?? '';
  const hasVerbIntent =
    /תבנה|בנה לי|תבני|תכינו|תכין|תכנן|תכנון|תוסיף|תוסיפי|תוריד|תורידי|תחליף|תזיז|תמלא|תעדכן|תסדר|צור טיול|תקצר|תאריך/.test(
      lastUser,
    );
  // בקשה כמו "טיול של 8 ימים בברטיסלבה ווינה" לא כוללת אף פועל מהרשימה
  // למעלה אבל היא בבירור בקשת בנייה - מספר ימים + יעד מוכר מהדאטה.
  const mentionsDaysAndDest = /\d+\s*ימים?/.test(lastUser) && Boolean(findDestination(lastUser));
  const editIntent = hasVerbIntent || mentionsDaysAndDest;

  // האם קריאת כלי כלשהי בפועל שינתה את הטיול בסיבוב הזה - נבדל מ-touched
  // (ששיקוף מהצד גם רמז כשרות שדורש להחזיר את הטיול ללקוח, גם בלי כלי).
  let toolBuiltSomething = false;
  let forcedBuildRetry = false;
  // פירוט רק לערים שהשיחה נוגעת בהן (ראו buildGroundingDetail); היעדים
  // שנחקרו מצורפים בכל איטרציה מחדש - חקירה באיטרציה N זמינה ב-N+1
  const baseDetail = buildGroundingDetail(relevantCitySlugs(messages, clientTrip));

  for (let iter = 0; iter < 16; iter++) {
    const maxTokens = editIntent || iter > 0 ? 2048 : 1024;
    if (iter === 0) send({ type: 'status', text: 'קורא את הבקשה…' });
    const turn = await runClaudeTurn(
      apiMessages,
      working,
      send,
      full.length > 0,
      maxTokens,
      iter,
      kosherHint,
      baseDetail + buildExploredGrounding(explored),
    );
    meter.units += aiUnits(turn.usage);
    full += turn.text;

    if (turn.stopReason !== 'tool_use') {
      // הדפוס הזה קורה בפועל: המודל מתאר מסלול יום-אחר-יום בטקסט (בפורמט
      // **יום N** שהפרומפט מלמד לתשובות המלצה) אבל שוכח לקרוא בפועל לכלי
      // שבונה את הטיול - הצ׳אט "מבטיח" תוכנית, אבל הפאנל/המפה נשארים ריקים
      // כי אף tool_use לא בוצע. במקום לנחש מה תואר ולהמציא טיול מהטקסט,
      // דוחפים תזכורת חד-פעמית שמכריחה את המודל לבצע את הקריאה בעצמו על
      // הדאטה האמיתית - ואז ממשיכים את אותה לולאת ה-tool_use הרגילה.
      const describedInsteadOfBuilding =
        editIntent &&
        !toolBuiltSomething &&
        !quickReplies &&
        !forcedBuildRetry &&
        /\*\*יום\s*\d+/.test(turn.text);
      if (describedInsteadOfBuilding) {
        forcedBuildRetry = true;
        apiMessages.push({ role: 'assistant', content: turn.text });
        apiMessages.push({
          role: 'user',
          content:
            'תזכורת מערכת: תיארת עכשיו תוכנית מסלול בטקסט בלבד, בלי לקרוא לאף כלי (create_trip_full / set_day_places / add_place וכו׳) - הטיול בפועל לא נוצר/התעדכן. בצע עכשיו קריאת כלי אחת או יותר שמבצעת בדיוק את מה שתיארת, על סמך הדאטה האמיתית - בלי להסביר שוב במילים.',
        });
        continue;
      }
      break;
    }

    const assistantContent: ApiContentBlock[] = [];
    const results: ApiContentBlock[] = [];
    for (const block of turn.blocks) {
      if (block.type === 'text') {
        if (block.text) assistantContent.push({ type: 'text', text: block.text });
        continue;
      }
      let input: Record<string, unknown> = {};
      let parseOk = true;
      try {
        input = block.json ? (JSON.parse(block.json) as Record<string, unknown>) : {};
      } catch {
        parseOk = false;
      }
      assistantContent.push({ type: 'tool_use', id: block.id, name: block.name, input });
      send({ type: 'status', text: toolStatusText(block.name, input) });
      let out: ReturnType<typeof executeAgentTool>;
      if (!parseOk) {
        out = { trip: working, ok: false, message: 'קלט הכלי לא היה JSON תקין - נסה שוב.', action: undefined, quickReplies: undefined };
      } else if (block.name === 'explore_destination') {
        // הכלי היחיד שהוא אסינכרוני - רץ כאן ולא ב-executeAgentTool.
        // curated תמיד גובר: אם השאילתה היא בעצם עיר מהקטלוג, מחזירים אותה.
        const query = typeof input.query === 'string' ? input.query.trim() : '';
        const curated = findDestination(query);
        if (curated) {
          out = {
            trip: working,
            ok: true,
            message: `"${query}" כבר קיים בקטלוג האוצר כ-${curated.slug} - השתמש בו ישירות מה-DATA, אין צורך בחקירה.`,
            action: undefined,
            quickReplies: undefined,
          };
        } else {
          // טווח החקירה: מי שיש לו (או רוצה) רכב לא מוגבל לרדיוס העיר.
          // המודל יכול לדרוס במפורש, וברירת המחדל נגזרת ממצב ההזמנות.
          const car = working?.preferences?.booking?.car;
          const scope: ExploreScope =
            input.scope === 'area' || input.scope === 'city'
              ? input.scope
              : car === 'have' || car === 'need'
                ? 'area'
                : 'city';
          let exploredDest: Destination | null = null;
          try {
            const raw = query ? await exploreDestination(query, 12, scope) : null;
            exploredDest = raw ? exploredToDestination(raw) : null;
          } catch {
            exploredDest = null;
          }
          if (exploredDest) {
            // אותו slug שכבר נחקר - מחליפים, לא מכפילים
            const idx = explored.findIndex((d) => d.slug === exploredDest!.slug);
            if (idx >= 0) explored[idx] = exploredDest;
            else explored.push(exploredDest);
            send({ type: 'explored', destination: exploredDest });
            out = {
              trip: working,
              ok: true,
              message: `נחקר בהצלחה: ${JSON.stringify({
                slug: exploredDest.slug,
                name: exploredDest.name,
                places: exploredDest.places.map((pl) => ({ id: pl.id, name: pl.name, category: pl.category })),
              })}\nהיעד זמין עכשיו לכלי הטיול כמו כל עיר. זכור לומר למשתמש שהיעד נחקר אוטומטית ולא נבדק.`,
              action: `חקרתי את היעד ${exploredDest.name} (${exploredDest.places.length} אתרים ממקורות ציבוריים)`,
              quickReplies: undefined,
            };
          } else {
            out = {
              trip: working,
              ok: false,
              message: `החקירה של "${query}" נכשלה - לא נמצאו מספיק נתונים ממקורות ציבוריים. אמור למשתמש בכנות שהיעד לא מכוסה והצע יעדים קיימים.`,
              action: undefined,
              quickReplies: undefined,
            };
          }
        }
      } else {
        out = executeAgentTool(working, block.name, input, explored);
      }
      if (out.ok && out.trip !== working) {
        touched = true; // suggest_quick_replies לא נוגע בטיול
        toolBuiltSomething = true;
      }
      working = out.trip;
      // משדרים את הטיול מיד אחרי כל כלי שמשנה אותו, ולא רק בסוף התור:
      // הקנבס מתמלא תוך כדי הבנייה במקום להישאר ריק עשרות שניות.
      if (out.ok && toolBuiltSomething && working) {
        send({ type: 'trip', trip: working, actions: [...actions] });
      }
      if (out.ok && out.action) actions.push(out.action);
      if (out.ok && out.quickReplies) quickReplies = out.quickReplies;
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: out.message,
        ...(out.ok ? {} : { is_error: true }),
      });
    }
    if (results.length === 0) break;
    apiMessages.push({ role: 'assistant', content: assistantContent });
    apiMessages.push({ role: 'user', content: results });
  }

  if (!full) {
    const fallback = touched
      ? 'עדכנתי את הטיול לפי הבקשה - הפירוט בפאנל הטיול.'
      : 'לא הצלחתי לנסח תשובה - נסו שוב.';
    send({ type: 'text', text: fallback });
    full = fallback;
  }

  // רשת ביטחון: הלולאה הסתיימה עם ימים ריקים בלבד - אומרים זאת ביושר,
  // בלי למלא אוטומטית מאחורי הגב.
  if (
    touched &&
    working &&
    working.days.length > 0 &&
    working.days.every((d) => d.placeIds.length === 0)
  ) {
    const note = '\n\nשימו לב: הימים נוצרו אבל עדיין בלי מקומות. כתבו "תמלא את הימים" ואשבץ מקומות אמיתיים מהמאגר.';
    send({ type: 'text', text: note });
    full += note;
  }

  // רשת ביטחון דטרמיניסטית: אם הטוגל דלוק והסוכן לא קרא ל-set_preferences,
  // מטמיעים את הכשרות בטיול בכל מקרה - ההעדפה חייבת להישמר על האובייקט.
  if (kosherHint && working && working.preferences?.kosher !== true) {
    working = { ...working, preferences: { ...working.preferences, kosher: true } };
    touched = true;
  }

  const dest = findDestination(full);
  send({ type: 'meta', destinationSlug: dest?.slug });
  if (touched && working) send({ type: 'trip', trip: working, actions });
  if (quickReplies) send({ type: 'quickReplies', replies: quickReplies });
}

function sendRuleBased(lastUserText: string, send: Send) {
  const r = ruleBasedReply(lastUserText);
  send({ type: 'text', text: r.reply });
  send({ type: 'meta', destinationSlug: r.destinationSlug, placeIds: r.placeIds });
}

/** תשובת סטרים של הודעה אחת - להודעות מכסה (חוויית צ׳אט, לא שגיאת HTTP) */
function singleMessageStream(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

const QUOTA_MESSAGE =
  'הגעתם למכסת השימוש היומית בסוכן החכם של התוכנית החינמית 🙏\n\n' +
  'המכסה מתאפסת פעם ביום. בינתיים אפשר להמשיך לערוך את הטיול ידנית במתכנן - להוסיף ימים, להזיז עצירות ולפתוח ניווט.\n\n' +
  'רוצים להמשיך לתכנן עם הסוכן בלי לחכות? טיול+ פרימיום מגדיל את המכסה פי 10 - כל הפרטים בעמוד "פרימיום" (tiyulplus.com/premium).';

export async function POST(request: Request) {
  // זיהוי הקורא (משתמש מחובר או IP) - לפני קריאת הגוף, כדי שגוף עצום
  // לא יעקוף את המכסות. ואז שערי המכסה, מהזול ליקר.
  const caller = await resolveCaller(request);
  const limits = PLAN_LIMITS[caller.plan];

  const burst = checkLimit('chat-burst', caller.id, limits.chatBurstPerMin, 60_000);
  if (!burst.ok) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(burst.retryAfterSec) },
    });
  }
  const daily = checkLimit('chat-day', caller.id, limits.chatPerDay, 24 * 60 * 60 * 1000);
  if (!daily.ok) return singleMessageStream(QUOTA_MESSAGE);
  if (process.env.ANTHROPIC_API_KEY) {
    const used = await aiUnitsUsedToday(caller.id);
    if (used >= limits.aiUnitsPerDay) return singleMessageStream(QUOTA_MESSAGE);
  }

  const body = (await request.json()) as { messages: ChatMessage[]; trip?: unknown; kosher?: unknown; explored?: unknown };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const clientTrip = sanitizeClientTrip(body.trip);
  const kosherHint = body.kosher === true;
  // יעדים שנחקרו בתורים קודמים - הלקוח מחזיר אותם, השרת לא סומך על הצורה
  const explored = sanitizeExploredDestinations(body.explored);
  const last = messages[messages.length - 1]?.content ?? '';
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emitted = false;
      const send: Send = (event) => {
        if (event.type === 'text') emitted = true;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      if (process.env.ANTHROPIC_API_KEY) {
        const meter = { units: 0 };
        try {
          await runAgent(messages, clientTrip, send, kosherHint, explored, meter);
        } catch {
          // נפילה חיננית למנוע החוקים - רק אם עוד לא הוזרם טקסט
          if (!emitted) sendRuleBased(last, send);
        } finally {
          // הרישום קורה גם כשהתור נכשל באמצע - הטוקנים כבר נצרכו
          recordAiUnits(caller.id, meter.units);
        }
      } else {
        sendRuleBased(last, send);
      }
      send({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
