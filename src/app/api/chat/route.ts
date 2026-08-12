import { destinations } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';
import { isKosher } from '@/lib/categories';
import {
  AGENT_TOOLS,
  executeAgentTool,
  sanitizeClientTrip,
  serializeTripForModel,
  type ResolvedPinLocation,
} from '@/lib/trip/agent';
import { geocodePlace } from '@/lib/server/geocode';
import { isTransient } from '@/lib/server/transient';
import { agentEnabled } from '@/lib/server/flags';
import { coverageLine } from '@/lib/server/catalogSummary';
import {
  IMAGE_DATA_URL,
  sanitizeMessages,
  type ChatMessage,
} from '@/lib/server/chatMessages';
import {
  buildLightGrounding,
  buildExploredGrounding,
  buildGroundingDetail,
  kosherAllowed,
  kosherAllowedNames,
  kosherIntentText,
  relevantCitySlugs,
} from '@/lib/server/grounding';
import {
  LOOKUP_TOOL,
  getCachedLookup,
  lookupBudgetLeft,
  lookupEligible,
  rememberLookup,
  todayIso,
} from '@/lib/server/webLookup';

/** תקרת גוף הבקשה - לפני JSON.parse, כדי שגוף ענק לא יפיל את הפונקציה */
const MAX_BODY_CHARS = 6_000_000;
import type { Trip } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { exploreDestination, type ExploreScope } from '@/lib/explore/resolver';
import { exploredToDestination, sanitizeExploredDestinations } from '@/lib/explore/adapter';
import { checkLimit, aiUnitsUsedToday, recordAiUnits } from '@/lib/server/limits';
import { IP_BACKSTOP_MULTIPLE, budgetFor, maybeAlert, recordSpend } from '@/lib/server/budget';
import { MAX_TURN_USD } from '@/lib/server/chatGuards';
import {
  BUDGET_MESSAGE,
  MAX_MESSAGE_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_USER_MESSAGES,
  OFF_TOPIC_MESSAGE,
  TOO_LONG_MESSAGE,
  TOO_MANY_TURNS_MESSAGE,
  sameOriginOk,
  topicOk,
} from '@/lib/server/chatGuards';
import {
  MAX_LIGHT_ITERATIONS,
  classifyTurn,
  isLightTool,
  shouldEscalate,
} from '@/lib/server/modelRoute';
import { resolveCaller, type Caller } from '@/lib/server/identity';
import { PLAN_LIMITS, aiUnits } from '@/lib/plans';
import type { BookingSearchCard } from '@/lib/bookingSearch';
import {
  GuardedTextStream,
  LOOKUP_ANCHOR,
  NO_PRICE_LINE,
  NO_PRICE_LINE_BARE,
  type GuardAllowlist,
} from '@/lib/priceGuard';
import { CACHE_TTL, SYSTEM_PROMPT, anthropicBase, cachedPrefix } from '@/lib/server/agentPrefix';

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
    // מספר + כמה דוגמאות, לא כל הקטלוג - ראו lib/server/catalogSummary.ts
    const coverage = coverageLine(
      countries.map((c) => c.name),
      Object.fromEntries(countries.map((c) => [c.slug, c.name])),
    );
    return {
      reply: `היי! אני עוזר הטיולים של טיול+ 🧭 ${coverage}\n\nלאן חשבתם לטוס? אפשר גם פשוט לבקש - למשל "תבנה לי מסלול ל-4 ימים בוינה".`,
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



/**
 * הכללים הקשים על אורך התשובה, בבלוק נפרד שנשלח **אחרון** במערך ה-system.
 * ראו ההסבר בנקודת השימוש: אותם כללים בתוך SYSTEM_PROMPT לא החזיקו.
 */
const OUTPUT_DISCIPLINE = `OUTPUT DISCIPLINE - re-read this before every reply, it overrides any urge to be thorough:
1. SHORT BY DEFAULT. Two to four sentences. A factual question gets one or two. Long is a defect here, not generosity.
2. NO LISTS OF PLACES OR DESTINATIONS. Asked what you cover: the real counts from the index, then at most four or five example cities in ONE line, then ask where they want to go. Never a breakdown by continent or region, never bullets of city names, never a second or third line of them. This is the single most common way your answer becomes unreadable.
3. NEVER RE-WRITE THE PLAN. If a tool changed the trip this turn, the panel already shows every day and stop. One sentence about what changed. No day list, no **יום N** lines.
4. NO CLOSING OFFER. Don't end with "אם תרצו, אשמח..." or a menu of what else you could do. The user knows they can ask. Stop at the answer.`;


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
    case 'set_day_city':
      return `מעביר את יום${day} לעיר אחרת…`;
    case 'move_day':
      return 'משנה את סדר הימים…';
    case 'rename_trip':
      return 'מעדכן את שם הטיול…';
    case 'set_preferences':
      return 'שומר את ההעדפות…';
    case 'set_trip_dates':
      return 'שומר את התאריכים…';
    case 'explore_destination': {
      const name = typeof input.query === 'string' ? input.query : '';
      const area = input.scope === 'area' ? ' והאזור סביבו' : '';
      return `חוקר את היעד ${name}${area}…`.replace(/\s+…$/, '…');
    }
    case 'set_booking_status':
      return 'מעדכן מה כבר סגור…';
    case 'booking_search':
      return input.kind === 'activities' ? 'מכין חיפוש חוויות…' : 'מכין חיפוש לינה…';
    case 'city_date_notes':
      return 'בודק מה קורה בתאריכים שלכם…';
    case 'add_pin': {
      const pin = typeof input.name === 'string' ? input.name : '';
      return pin ? `מאתר את ${pin} על המפה…` : 'מאתר את המקום על המפה…';
    }
    case 'remove_pin':
      return 'מסיר סיכה מהמפה…';
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
  // כרטיס חיפוש מוכן אצל ספק - נבנה בשרת, הלקוח רק מרנדר אותו
  | { type: 'search'; search: BookingSearchCard }
  | { type: 'done' };

type Send = (event: StreamEvent) => void;

interface AnthropicUsage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
  /** כמה קריאות web_search רצו בקריאה הזאת - ראו webLookup.ts */
  server_tool_use?: { web_search_requests?: number };
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
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ApiContentBlock[];
}

/**
 * כשל HTTP מול Anthropic. הקוד חייב לשרוד כאובייקט ולא רק כטקסט בהודעה:
 * `isTransient` מחליטה לפי `status` אם לנסות שוב, ו-`new Error('anthropic 529')`
 * החזיק את הקוד רק בתוך המחרוזת - כך ש-529/429/500 סווגו כשגיאה קבועה
 * והניסיון השני לא רץ אף פעם. זה בדיוק המסלול שהפיל תור אמיתי בפרודקשן.
 */
class AnthropicHttpError extends Error {
  readonly status: number;
  constructor(status: number, detail = '') {
    // גוף התשובה נכנס להודעה בכוונה: `anthropic 400` לבד לא אומר כלום,
    // ו-400 אמיתי בפרודקשן עלה בסיבוב שלם של דיאגנוסטיקה כי לא היה כתוב
    // איזה שדה נפסל. Anthropic מחזיר שם נתיב שדה ("messages.2: ...") ולא
    // תוכן של המשתמש, ובכל זאת חותכים - לוג הוא לא מקום לגוף תשובה מלא.
    super(detail ? `anthropic ${status}: ${detail.slice(0, 400)}` : `anthropic ${status}`);
    this.name = 'AnthropicHttpError';
    this.status = status;
  }
}

/**
 * איטרציה אחת מול Claude בסטרימינג: טקסט מוזרם ללקוח מיד; בלוקים של
 * tool_use נצברים (partial_json) ומוחזרים לביצוע. needSeparator מוסיף
 * שורה ריקה לפני הטקסט הראשון כשכבר הוזרם טקסט מאיטרציה קודמת.
 */
/**
 * ההנחיה היחידה שנוספת במסלול הקל.
 *
 * היא לא מנסה למנוע מהמודל לעשות דברים - הכלים כבר עושים את זה. היא
 * אומרת לו מה כן לעשות כשהוא **לא** יכול: לומר זאת במשפט אחד ולעצור.
 * תשובה בלי קריאת כלי היא בדיוק מה ש-`shouldEscalate` מחפש, ולכן
 * "אני לא יכול" הופך אוטומטית לתור מחדש על המודל החזק - בלי שהמודל
 * הזול יידע שקיים מודל אחר, ובלי מילת קסם שאפשר לשכוח.
 */
const LIGHT_TURN_NOTE = [
  'QUICK EDIT TURN. Your ONLY job is the tool call.',
  'The traveller asked for one small change to the trip that already exists.',
  'Make exactly that change with one tool call. Do not write an explanation:',
  'the app tells the traveller what changed, from the change itself. Any prose you write is discarded.',
  'You do NOT have the full catalog here, only the places listed for the cities already in this trip.',
  'If the request needs anything you cannot do with these tools, or names a place that is not listed,',
  'do not improvise and do not guess: call NO tool and say so in a few words.',
].join('\n');


async function runClaudeTurn(
  apiMessages: ApiMessage[],
  trip: Trip | null,
  send: Send,
  needSeparator: boolean,
  maxTokens: number,
  iter: number,
  kosherHint: boolean,
  groundingDetail: string,
  kosherOk: boolean,
  /** מה שהמטייל עצמו אמר - הרשימה הלבנה של שומר המחירים */
  guardAllow: GuardAllowlist,
  /** האם הוצג כבר כרטיס חיפוש בתור הזה (משנה רק את נוסח ההחלפה) */
  searchShown: boolean,
  /**
   * המסלול הקל: מודל זול, כלים מוגבלים, **ובלי אינדקס הקטלוג**.
   * ראו `src/lib/server/modelRoute.ts` - הכלים המוגבלים הם מה שמאפשר
   * להשמיט את האינדקס, לא להפך.
   */
  light: boolean,
  /**
   * האם לצרף את `LOOKUP_TOOL` לקריאה הזאת. **הערובה המבנית** נגד חיפוש
   * על כשרות: תור שנשאל על כשרות מגיע לכאן עם `false`, ולכן הכלי פשוט
   * לא קיים בשביל המודל - לא הנחיה, עובדה. ראו webLookup.ts.
   */
  allowLookup: boolean,
  /** תאריך היום, או תשובה קודמת ממטמון - בלוק system נפרד ומשתנה */
  lookupNote: string,
): Promise<{ blocks: AccBlock[]; stopReason: string; text: string; usage: AnthropicUsage; model: string }> {
  const model = light
    ? (process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5')
    : (process.env.ANTHROPIC_MODEL_AGENT ?? 'claude-sonnet-4-5');
  // טוגל כשרות מה-UI לפני שקיים טיול: מוסרים לסוכן בשקט דרך בלוק המצב
  const kosherNote =
    kosherHint && !trip
      ? '\n\nUI PREFERENCE TOGGLE: the user switched ON "אוכל כשר" in the interface before any trip exists. Treat kosher=true from your first plan (include a kosher-food place per day where the city has one, with the usual verify-before-visiting reminder), and call set_preferences {kosher: true} immediately after creating a trip. Never ask about it.'
      : '';
  const callApi = (ttl: '1h' | null): Promise<Response> =>
    fetch(`${anthropicBase()}/v1/messages`, {
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
      // כלי שלא נשלח לא קיים בשביל המודל. זו הערובה, ולא הנחיה בפרומפט -
      // ובאותו עיקרון בדיוק, `allowLookup=false` (כל תור שנשמע כמו שאלת
      // כשרות) פירושו ש-LOOKUP_TOOL פשוט לא במערך, בלי קשר למה שכתוב לו.
      tools: light
        ? AGENT_TOOLS.filter((t) => isLightTool(t.name))
        : allowLookup
          ? [...AGENT_TOOLS, LOOKUP_TOOL]
          : AGENT_TOOLS,
      // סדר הרינדור: tools (סטטי) → system. ה-grounding הוא הבלוק עם
      // cache_control - כל הקידומת הקבועה נכנסת ל-prompt cache; מצב הטיול
      // המשתנה יושב אחרי נקודת השבירה ולא פוגע בקריאות מהמטמון.
      system: [
        /*
          **הקידומת הנשמרת נבנית במקום אחד** (`agentPrefix.ts`), כי גם
          נתיב החימום בונה אותה - וקידומת שנבדלת בתו אחד היא מטמון אחר,
          כלומר חימום שמשלם על עצמו ולא מחמם כלום.

          **ההשמטה במסלול הקל היא החיסכון הגדול, לא המודל.** האינדקס הוא
          כ-240 אלף תווים (~80 אלף טוקנים) של כל הקטלוג, ונשלח כדי שהמודל
          יוכל למצוא מקום חדש. עריכה מכנית פועלת על מה שכבר בטיול, ולכן
          אין בו מה לחפש. אינדקס בלי המסלול הקל = תור זול שעולה יותר מזה
          שהוא החליף, כי כתיבת מטמון על מודל שני יקרה מקריאה ממטמון חם.
        */
        ...(light
          ? [{ type: 'text' as const, text: SYSTEM_PROMPT }]
          : cachedPrefix(kosherOk).map((b) =>
              ttl === null && b.cache_control
                ? { ...b, cache_control: { type: 'ephemeral' as const } }
                : b,
            )),
        // הפירוט משתנה לפי השיחה -> אחרי נקודת השבירה, בלי cache_control
        { type: 'text', text: groundingDetail },
        ...(light ? [{ type: 'text' as const, text: LIGHT_TURN_NOTE }] : []),
        // תאריך היום/תשובת מטמון לחיפוש - נגזר מהשעון בזמן הבקשה, ולכן
        // חייב לשבת כאן ולא בקידומת השמורה (ראו webLookup.ts, todayIso).
        ...(lookupNote ? [{ type: 'text' as const, text: lookupNote }] : []),
        { type: 'text', text: `CURRENT TRIP (the user's active trip right now):\n${serializeTripForModel(trip)}${kosherNote}` },
        // האחרון בכוונה. הכללים האלה קיימים למעלה ב-LANGUAGE & VOICE
        // ונבלעו בבדיקה חיה: הפרומפט ארוך, והמודל הפיק פירוק לפי יבשות
        // עם עשרות שמות ערים אף על פי ששני סעיפים אסרו את זה במפורש.
        // כאן הם הדבר האחרון שנקרא לפני השיחה - אותו עיקרון שגרם
        // ל-PROSE_DISCIPLINE לעבוד מתוך תוצאת הכלי.
        { type: 'text', text: OUTPUT_DISCIPLINE },
      ],
      messages: apiMessages,
    }),
  });

  /*
    **נסיגה אם ה-API לא מכיר את `ttl`.** לא ניתן היה לבדוק את זה חי
    בסביבה הזאת, ובקשה שנדחית פירושה סוכן מת - לא תור יקר. אז 400
    שמזכיר את השדה מנסה שוב בלעדיו, פעם אחת. אם השדה תקין, השורה הזאת
    לא תרוץ אף פעם.
  */
  let res = await callApi(CACHE_TTL);
  if (!res.ok && res.status === 400 && CACHE_TTL) {
    const body = await res.clone().text().catch(() => '');
    if (/ttl|cache_control/i.test(body)) {
      console.warn('[chat] 1h cache ttl rejected, retrying without it');
      res = await callApi(null);
    }
  }

  if (!res.ok || !res.body) {
    // קריאת הגוף לא יכולה להפיל את הטיפול בשגיאה עצמו
    const detail = await res.text().catch(() => '');
    throw new AnthropicHttpError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const byIndex = new Map<number, AccBlock>();
  let announcedTool = false;
  let buffer = '';
  let stopReason = 'end_turn';
  let text = '';
  let sepPending = needSeparator;
  const usage: AnthropicUsage = {};

  /**
   * שומר המחירים, על הזרם.
   *
   * הטקסט לא נשלח יותר delta-אחר-delta: הוא עובר דרך `GuardedTextStream`,
   * שמשחרר **רק משפטים שלמים**. בלי זה אין שום דרך לסנן טענת מחיר - מה
   * שנשלח נשלח, ו-"400" ו-"ש״ח ללילה" יכולים להגיע בשני delta נפרדים
   * ולעבור כל בדיקה שרצה על אחד מהם. המחיר הוא השהיה של משפט אחד; מצב
   * הטיול ממשיך להישלח מיד כמו קודם, ולכן הקנבס לא מחכה.
   */
  const guardStream = new GuardedTextStream(guardAllow, {
    price: searchShown ? NO_PRICE_LINE : NO_PRICE_LINE_BARE,
  });
  const emit = (chunk: string) => {
    if (!chunk) return;
    if (sepPending) {
      send({ type: 'text', text: '\n\n' });
      text += '\n\n';
      sepPending = false;
    }
    send({ type: 'text', text: chunk });
    text += chunk;
  };

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
          // הבלוק שומר את הטקסט הגולמי - הוא חוזר להיסטוריה של המודל.
          // המשתמש מקבל את מה שיוצא מהשומר.
          if (block?.type === 'text') block.text += event.delta.text;
          emit(guardStream.push(event.delta.text));
        } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
          if (block?.type === 'tool_use') block.json += event.delta.partial_json;
        }
      } else if (event.type === 'message_delta') {
        if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
        if (event.usage?.output_tokens !== undefined) usage.output_tokens = event.usage.output_tokens;
        // מספר החיפושים ידוע רק אחרי שהם רצו - כלומר בסוף, ב-message_delta,
        // לא בתחילת הקריאה. בלי זה חיפוש עולה כסף בלי שהוא נרשם בשום מקום.
        if (event.usage?.server_tool_use) usage.server_tool_use = event.usage.server_tool_use;
      } else if (event.type === 'message_start' && event.message?.usage) {
        Object.assign(usage, event.message.usage);
      }
    }
  }

  // מה שנשאר בחוצץ בסוף הזרם (המשפט האחרון, שאין אחריו פיסוק)
  emit(guardStream.end());

  // חתיכה שנחתכה היא מידע תפעולי אמיתי: היא אומרת שהמודל ניסה לנקוב
  // במספר. נרשם בכל הסביבות ולא רק בפיתוח - זה הסימן שכדאי לבדוק פרומפט.
  if (guardStream.redactions.length > 0) {
    console.warn(`[chat] price guard redacted: ${guardStream.redactions.join(', ')}`);
  }

  // ניטור עלויות בפיתוח: cached > 0 מאיטרציה 2 ומטור 2 = ה-prompt cache עובד
  /*
    שורת השימוש. הייתה עד היום ב-development בלבד, וזה בדיוק המצב שבו
    אי אפשר לדעת כמה הניתוב חוסך בפועל: הפרודקשן הוא המקום שבו יש
    תעבורה אמיתית ומטמון חם. היא לא מכילה שום דבר של המשתמש - שם מודל
    ומספרים.
  */
  if (process.env.NODE_ENV === 'development' || process.env.CHAT_USAGE_LOG === 'on') {
    console.log(
      `[chat] ${model} iter=${iter} max=${maxTokens} in=${usage.input_tokens ?? 0} cached=${usage.cache_read_input_tokens ?? 0} cacheWrite=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens ?? 0}`,
    );
  }

  const blocks = [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, blk]) => blk);
  return { blocks, stopReason, text, usage, model };
}

/** לולאת הסוכן: קריאות מודל ↔ ביצוע כלים על עותק הטיול, עד תשובת טקסט */
async function runAgent(
  messages: ChatMessage[],
  clientTrip: Trip | null,
  send: Send,
  kosherHint: boolean,
  explored: Destination[],
  meter: { units: number; usd: number },
  caller: Caller,
): Promise<void> {
  let working = clientTrip;
  /**
   * שני הכלים היחידים שיוצאים לשירות חיצוני בחינם (ויקיפדיה, OpenStreetMap),
   * ולכן שני הכלים היחידים שאפשר להפעיל דרכם עומס על מישהו אחר. מכסה יומית
   * לאדם, **ותקרה נוספת לתור אחד** - תור אחד יכול להריץ עד 16 איטרציות, ואין
   * שום בקשה אמיתית שצריכה בתוכה יותר משלוש חקירות או שישה איתורים.
   */
  const perTurn = { explores: 0, geocodes: 0 };
  const MAX_EXPLORES_PER_TURN = 3;
  const MAX_GEOCODES_PER_TURN = 6;
  /**
   * כרטיסי חיפוש בתור אחד.
   *
   * המכסות הקיימות של הצ׳אט (פרץ לדקה, בקשות ליום, תקציב יחידות AI)
   * מכסות את המסלול הזה במלואו - הכלי רץ **רק** בתוך `/api/chat`, אחרי
   * שכל השערים האלה נבדקו, ואין דרך אחרת להגיע אליו. מכסה יומית נפרדת
   * לא נוספה בכוונה: בשונה מחקירת יעד או איתור מיקום, הכלי הזה לא יוצא
   * לשום שירות חיצוני - הוא מרכיב מחרוזת מקומית, בלי עלות ובלי עומס על
   * אף אחד. מה שכן צריך גבול הוא **חוויית המשתמש**: תור שמדביק ארבעה
   * כרטיסי אפיליאייט קורא כמו מכירה, וזה לא המוצר.
   */
  let searchesShown = 0;
  const MAX_SEARCHES_PER_TURN = 2;
  /**
   * הרשימה הלבנה של שומר המחירים: מה שהמטייל עצמו כתב, ושמות הסיכות
   * שהוא כבר נתן. **רק מהן** יכולים לצאת מספר או שם מלון בתשובה.
   */
  const guardAllow: GuardAllowlist = {
    userText: messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' \n '),
    pinNames: (clientTrip?.pins ?? []).map((p) => p.name),
  };
  const planLimits = PLAN_LIMITS[caller.plan];
  const actions: string[] = [];
  let touched = false;
  let full = '';
  let quickReplies: string[] | null = null;
  // הודעה עם תמונה נשלחת כמערך בלוקים (תמונה ואז טקסט); בלי תמונה
  // נשארת מחרוזת פשוטה, בדיוק כמו קודם.
  const apiMessages: ApiMessage[] = messages.map((m) => {
    const match = m.image?.match(IMAGE_DATA_URL);
    if (!match) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        { type: 'image', source: { type: 'base64', media_type: `image/${match[1]}`, data: match[2] } },
        // הודעה ריקה מטקסט אינה חוקית מול ה-API, ובכל מקרה כדאי שהמודל
        // יידע במפורש שהמשתמש צירף תמונה ולא כתב כלום.
        { type: 'text', text: m.content || 'צירפתי תמונה - תסתכל עליה.' },
      ],
    };
  });

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

  /*
    ---------- חיפוש חי: שעות/מחיר-כניסה/קיום ----------

    `kosherAsk` בודק את ההודעה **הזאת בלבד**, ולא את חלון שש ההודעות
    שהשער הכללי של הכשרות משתמש בו - שאלה עובדתית לא-קשורה בהמשך שיחה
    שהזכירה כשרות פעם אחת לא צריכה להיחסם. אבל כשההודעה **הזאת** נשמעת
    כמו שאלת כשרות, זה מנצח הכול: `allowLookup` יורד ל-false בלי קשר
    למה ש-`lookupEligible` היה אומר, ו-LOOKUP_TOOL פשוט לא נכנס לקריאה.
  */
  const kosherAsk = kosherIntentText(lastUser);
  const lookupQuotaOk =
    !process.env.ANTHROPIC_API_KEY ||
    checkLimit('lookup-day', caller.id, planLimits.lookupsPerDay, 24 * 60 * 60 * 1000).ok;
  const lookupWanted = !kosherAsk && lookupQuotaOk && lookupEligible(lastUser) && lookupBudgetLeft(messages);
  const cachedLookup = lookupWanted ? getCachedLookup(lastUser) : null;
  /** האם לצרף בפועל את `LOOKUP_TOOL` - לא כשיש כבר תשובה במטמון */
  const allowLookup = lookupWanted && !cachedLookup;
  const lookupNote = cachedLookup
    ? `A fresh, still-valid answer to this exact question was already looked up earlier - reuse it instead of searching again, with its citation:\n"""\n${cachedLookup}\n"""`
    : allowLookup
      ? `TODAY'S DATE, for citing when you checked something (never compute or guess this yourself): ${todayIso()}.`
      : '';

  // האם קריאת כלי כלשהי בפועל שינתה את הטיול בסיבוב הזה - נבדל מ-touched
  // (ששיקוף מהצד גם רמז כשרות שדורש להחזיר את הטיול ללקוח, גם בלי כלי).
  let toolBuiltSomething = false;
  let forcedBuildRetry = false;
  // האם התור כבר נקטע פעם אחת בגלל max_tokens (מרחיב את התקרה ומנחה
  // לקריאות קטנות יותר, פעם אחת בלבד - כדי שלא ייווצר לופ)
  let truncatedRetry = false;
  // פירוט רק לערים שהשיחה נוגעת בהן (ראו buildGroundingDetail); היעדים
  // שנחקרו מצורפים בכל איטרציה מחדש - חקירה באיטרציה N זמינה ב-N+1
  const relevant = relevantCitySlugs(messages, clientTrip);
  // שני וריאנטים לכל היותר לכל בקשה (עם כשרות/בלי), נבנים לפי דרישה:
  // המודל יכול להדליק את ההעדפה באמצע התור עם set_preferences, ואז
  // האיטרציה הבאה חייבת לקבל את שכבת הכשרות באמת ולא רק את ההרשאה.
  const detailCache = new Map<boolean, string>();
  const detailFor = (ok: boolean) => {
    const hit = detailCache.get(ok);
    if (hit !== undefined) return hit;
    const built = buildGroundingDetail(relevant, ok);
    detailCache.set(ok, built);
    return built;
  };

  /*
    ---------- ניתוב המודל ----------

    ההחלטה מתקבלת פעם אחת, לפני הלולאה, מהטקסט ומהטיול - ולא מהמודל.
    `light` פירושו: מודל זול, כלים מוגבלים לרשימה הלבנה, ובלי אינדקס
    הקטלוג. ראו `src/lib/server/modelRoute.ts`.
  */
  const lastMsg = messages[messages.length - 1];
  /*
    מפסק. ברירת המחדל דלוקה, אבל `CHAT_MODEL_ROUTING=off` מחזיר את
    ההתנהגות הקודמת בדיוק בלי דיפלוי של קוד - וזה גם מה שמאפשר למדוד
    את שני המסלולים על אותה בקשה בדיוק.
  */
  const routingOn = process.env.CHAT_MODEL_ROUTING !== 'off';
  const route = routingOn
    ? classifyTurn(lastUser, clientTrip, Boolean(lastMsg?.image))
    : { light: false, reason: 'ניתוב כבוי' };

  /*
    במסלול הקל **שום דבר לא נשלח ללקוח עד שהתור הוכיח את עצמו**.

    זה לא זהירות יתר: אם התור מוסלם, המודל החזק מריץ הכול מחדש מאפס,
    וטקסט או מצב-טיול שכבר הגיעו למסך היו הופכים להבהוב של עריכה שלא
    קרתה. תור קל הוא ממילא משפט אחד, אז ההשהיה זניחה. `status` כן עובר
    - הוא רק אומר "עובד על זה", ואין בו מה לבטל.
  */
  const buffered: StreamEvent[] = [];
  let capturing = false;
  const outSend: Send = (e) => {
    if (capturing && e.type !== 'status') buffered.push(e);
    else send(e);
  };

  /** מצב שצריך לחזור לאחור בהסלמה. מה שאינו כאן לא יכול להשתנות במסלול
   *  הקל, כי הכלים שנוגעים בו פשוט לא נשלחו (חקירה, כרטיס חיפוש, סיכות). */
  const snapshot = () => ({
    working,
    full,
    actions: [...actions],
    touched,
    toolBuiltSomething,
    quickReplies,
    apiMessages: apiMessages.length,
  });
  const restore = (s: ReturnType<typeof snapshot>) => {
    working = s.working;
    full = s.full;
    actions.length = 0;
    actions.push(...s.actions);
    touched = s.touched;
    toolBuiltSomething = s.toolBuiltSomething;
    quickReplies = s.quickReplies;
    apiMessages.length = s.apiMessages;
    buffered.length = 0;
    // דגלי הניסיון-החד-פעמי שייכים לניסיון שנזרק, לא לזה שמתחיל עכשיו
    truncatedRetry = false;
    forcedBuildRetry = false;
  };

  let light = route.light;
  let escalated = false;
  let lightStopReason = '';
  let lightToolFailed = false;
  let lightIterations = 0;
  let lightProseDropped = false;
  let suppressActions = false;
  const before = snapshot();
  capturing = light;

  if (light) {
    console.log(`[chat] route=light (${route.reason})`);
  } else {
    console.log(`[chat] route=heavy (${route.reason})`);
  }

  /**
   * גוף הלולאה, כפונקציה, כדי שאפשר יהיה להריץ אותו **פעמיים**:
   * פעם קלה, ואם היא לא הצליחה - פעם כבדה על מצב משוחזר.
   */
  const runLoop = async () => {
  for (let iter = 0; iter < 16; iter++) {
    // נקרא מחדש בכל איטרציה: `working` משתנה תוך כדי התור.
    const kosherOk = kosherAllowed(working, messages, kosherHint);
    // אותו עיקרון: `set_preferences` יכול להדליק כשרות באמצע תור, אז
    // הרשימה הלבנה של שומר המחירים (`kosher-claim`) נבנית כאן מחדש בכל
    // איטרציה ולא פעם אחת בתחילת runAgent - ראו kosherAllowedNames.
    guardAllow.kosherNames = kosherAllowedNames(
      light ? (clientTrip?.citySlugs ?? []) : Array.from(new Set([...relevant, ...(clientTrip?.citySlugs ?? [])])),
      kosherOk,
    );
    // אחרי קטיעה נותנים תקרה גבוהה יותר: ההנחיה לקריאות קטנות היא העיקר,
    // אבל אין סיבה להיחתך שוב על אותה מגבלה בזמן שמתקנים.
    /*
      תקרה קטנה למסלול הקל. הוא מפיק קריאת כלי אחת ומשפט קצר, והתקרה
      הנמוכה היא גם מגן: קריאה שנקטעת היא `max_tokens`, וזה כבר טריגר
      להסלמה. 512 מספיקים בנוחות לכל אחד מהכלים ברשימה הלבנה.
    */
    const maxTokens = Math.min(
      MAX_OUTPUT_TOKENS,
      light ? 512 : truncatedRetry ? 4096 : editIntent || iter > 0 ? 2048 : 1024,
    );
    if (iter === 0) send({ type: 'status', text: 'קורא את הבקשה…' });
    const turn = await runClaudeTurn(
      apiMessages,
      working,
      outSend,
      full.length > 0,
      maxTokens,
      iter,
      kosherHint,
      light
        ? buildLightGrounding(clientTrip?.citySlugs ?? [], kosherOk)
        : detailFor(kosherOk) + buildExploredGrounding(explored),
      kosherOk,
      guardAllow,
      searchesShown > 0,
      light,
      // המסלול הקל לא מקבל חיפוש בשום מקרה - הוא כבר מוגבל לרשימה
      // לבנה של כלים שלא כוללת אותו, וזה כאן רק כדי שהכוונה תהיה מפורשת.
      !light && allowLookup,
      light ? '' : lookupNote,
    );
    /*
      חיפוש נודע רק בדיעבד (server_tool_use ב-usage, ראו runClaudeTurn),
      ולכן משוטח כאן פעם אחת לפני שהוא נכנס גם ליחידות וגם לדולרים - שני
      השערים היחידים שקיימים על ההוצאה הזאת, ראו webLookup.ts.
    */
    const usageFlat = {
      ...turn.usage,
      web_search_requests: turn.usage.server_tool_use?.web_search_requests,
    };
    meter.units += aiUnits(usageFlat);
    /*
      העלות האמיתית, לצד היחידות. היחידות הן מכסה אישית; הדולרים הם
      התקרה הגלובלית ומה שנתנאל יראה באזור הניהול - כמה עולה טיול.
    */
    meter.usd += recordSpend({
      identity: caller.id,
      userId: caller.userId,
      tripId: clientTrip?.id ?? null,
      route: 'chat',
      model: turn.model,
      usage: usageFlat,
      // אם התשובה נקטעה לפני message_delta אין output_tokens, והטקסט
      // שכן הוזרם הוא הבסיס לאומדן שמרני במקום אפס
      streamedChars: turn.text.length,
    });
    full += turn.text;

    /*
      תקרת עלות לתור בודד. הסכנה איננה תשובה ארוכה אלא **לולאה**: 16
      איטרציות שכל אחת שולחת את הקידומת מחדש. תור אמיתי עולה
      $0.01-$0.13, ולכן התקרה רחוקה מכל שימוש אמיתי - היא קיימת כדי
      שבאג לא ישרוף את התקציב היומי בבקשה אחת.
    */
    if (meter.usd > MAX_TURN_USD) {
      console.warn(`[budget] turn aborted at $${meter.usd.toFixed(3)} (iter ${iter})`);
      break;
    }
    if (light) {
      lightIterations = iter + 1;
      lightStopReason = turn.stopReason;
    }

    if (turn.stopReason !== 'tool_use') {
      // max_tokens אינו tool_use, ולכן עד עכשיו הוא פשוט שבר את הלולאה:
      // קריאת כלי שנקטעה באמצע ה-JSON נזרקה בשקט, בלי שגיאה ובלי ניסיון
      // נוסף, והמטייל קיבל כלום. זה פוגע דווקא בבנייה מחדש של טיול שלם -
      // ה-JSON הגדול ביותר שהמודל מפיק, ובעברית שהיא יקרה בטוקנים.
      if (turn.stopReason === 'max_tokens' && !truncatedRetry) {
        truncatedRetry = true;
        if (turn.text) apiMessages.push({ role: 'assistant', content: turn.text });
        apiMessages.push({
          role: 'user',
          content:
            'תזכורת מערכת: התשובה הקודמת שלך נקטעה באמצע כי היא הייתה ארוכה מדי, וקריאת הכלי שהתחלת לא הושלמה ולכן לא בוצעה. עשה את אותה עבודה בכמה קריאות כלי קטנות במקום אחת גדולה - למשל set_day_city ואחריו set_day_places ליום אחד בכל פעם, במקום create_trip_full לכל הטיול - וכתוב תשובה קצרה.',
        });
        continue;
      }
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
        } else if (
          perTurn.explores >= MAX_EXPLORES_PER_TURN ||
          !checkLimit('explore-day', caller.id, planLimits.exploresPerDay, 24 * 60 * 60 * 1000).ok
        ) {
          // המכסה נאמרת למודל כתוצאת כלי, והוא זה שמסביר אותה למטייל בשיחה -
          // זה הרבה יותר טוב מהודעת שגיאה, כי הוא יכול להציע במקום זה יעדים
          // מהקטלוג. חשוב שיהיה כתוב במפורש שזו מכסה ולא תקלה, אחרת הוא
          // ינסה שוב באיטרציה הבאה.
          out = {
            trip: working,
            ok: false,
            message:
              'הגעתם למכסת חקירת היעדים להיום (חקירה פונה למקורות ציבוריים חינמיים, ולכן היא מוגבלת). זו מכסה ולא תקלה - אל תנסה שוב בתור הזה. אמור למטייל בעברית ובנימוס שמכסת חקירת היעדים להיום נגמרה ושהיא מתאפסת מחר, והצע שני-שלושה יעדים מהקטלוג שכן זמינים עכשיו.',
            action: undefined,
            quickReplies: undefined,
          };
        } else {
          perTurn.explores += 1;
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
      } else if (block.name === 'add_pin') {
        // הכלי האסינכרוני השני: איתור המיקום נעשה כאן, מול OpenStreetMap,
        // ועובר ל-executeAgentTool כפרמטר נפרד. המודל מספק שם בלבד -
        // אין שום מסלול שבו הוא מזריק קואורדינטות משלו. כישלון איתור
        // אינו כישלון של הכלי: הסיכה נשמרת ומסומנת "לא אומת".
        const pinName = typeof input.name === 'string' ? input.name.trim() : '';
        // slug מדויק, לא ההתאמה הרכה של findDestination: כאן זה מזהה
        // ולא טקסט חופשי. ההקשר נבנה בשמות הלטיניים, שהם מה שהמפות מכירות.
        const city = destinations.find((d) => d.slug === input.citySlug);
        const country = city ? countries.find((c) => c.slug === city.countrySlug) : undefined;
        const context = city
          ? [city.nameLocal || city.name, country?.nameLocal].filter(Boolean).join(', ')
          : undefined;
        // מעל המכסה הסיכה עדיין נשמרת - פשוט בלי מיקום, ומסומנת "לא אומת",
        // בדיוק כמו כישלון איתור. אין שום סיבה שמכסה תמנע מהמטייל לרשום
        // שהוא הזמין מלון.
        const geoAllowed =
          perTurn.geocodes < MAX_GEOCODES_PER_TURN &&
          checkLimit('geocode-day', caller.id, planLimits.geocodesPerDay, 24 * 60 * 60 * 1000).ok;
        let located: ResolvedPinLocation | null = null;
        if (geoAllowed && pinName) {
          perTurn.geocodes += 1;
          try {
            located = await geocodePlace(pinName, context);
          } catch {
            located = null;
          }
        }
        out = executeAgentTool(working, block.name, input, explored, located);
      } else if (block.name === 'booking_search' && searchesShown >= MAX_SEARCHES_PER_TURN) {
        out = {
          trip: working,
          ok: false,
          message:
            'הצגת כבר את מספר כרטיסי החיפוש המותר בתור הזה. זו מכסה ולא תקלה - אל תנסה שוב עכשיו. אם המטייל צריך עוד חיפוש, בקש ממנו לומר לאיזו עיר בתור הבא.',
          action: undefined,
          quickReplies: undefined,
        };
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
        outSend({ type: 'trip', trip: working, actions: [...actions] });
      }
      // רשומות שהוחזרו מהדאטה נכנסות לרשימה הלבנה של שומר הטענות: מרגע
      // זה המודל רשאי לדבר על **אותן** רשומות בשמן, ורק עליהן. מוסיפים
      // לאותו אובייקט שהאיטרציה הבאה תקרא, ולא יוצרים חדש.
      if (out.ok && out.eventNames?.length) {
        guardAllow.eventNames = [...(guardAllow.eventNames ?? []), ...out.eventNames.filter(Boolean)];
      }
      if (out.ok && out.action) actions.push(out.action);
      if (out.ok && out.quickReplies) quickReplies = out.quickReplies;
      // הכרטיס נשלח מיד: הוא התשובה האמיתית לבקשה, ואין סיבה שיחכה לסוף
      // הפרוזה. הוא נבנה כולו בשרת מהטיול - ראו bookingSearch.ts.
      if (out.ok && out.search) {
        searchesShown += 1;
        send({ type: 'search', search: out.search });
      }
      if (!out.ok && light) lightToolFailed = true;
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

    /*
      תקרת איטרציות למסלול הקל. לא break אלא יציאה שמובילה להסלמה:
      מודל שמגשש כבר בסיבוב הרביעי הוא בדיוק המקרה שהמסלול הקל לא
      אמור לטפל בו.
    */
    /*
      **תור קל = קריאת מודל אחת.** אחרי שהכלי בוצע אין למודל מה להוסיף:
      המשפט למטייל נבנה מהפעולה עצמה ולא ממנו, וסיבוב שני היה שולח את
      כל הקידומת פעם נוספת רק כדי לקבל טקסט שנזרק ממילא. במדידה הראשונה
      זה היה חצי מעלות התור.

      כל הכלים ברשימה הלבנה הם פעולה אחת שלמה, ולכן אין כאן מקרה שנחתך
      באמצע - בשונה מהמסלול הכבד, שבו set_day_city גורר set_day_places.
    */
    if (light && toolBuiltSomething) break;
    if (light && iter + 1 >= MAX_LIGHT_ITERATIONS) break;
  }
  };

  await runLoop();

  /*
    ---------- ההסלמה ----------

    כל דבר שאינו הצלחה נקייה חוזר למודל החזק, והתור מורץ **מאפס**:
    ההיסטוריה, הטיול והטקסט משוחזרים למצב שלפני הניסיון הקל, כך שהמודל
    החזק לא יורש חצי עריכה ולא צריך להבין מה קרה לפניו.

    התור הזול לא מוחזר למונה: הטוקנים באמת נשרפו, וספירה שמעגלת אותם
    למטה תגרום למדידה הבאה להיראות טובה משהיא.
  */
  if (light) {
    const why = shouldEscalate({
      toolRan: toolBuiltSomething,
      toolFailed: lightToolFailed,
      stopReason: lightStopReason,
      iterations: lightIterations,
    });
    if (why) {
      console.log(`[chat] escalate -> heavy (${why})`);
      escalated = true;
      light = false;
      capturing = false;
      restore(before);
      send({ type: 'status', text: 'בודק את זה לעומק…' });
      await runLoop();
    } else {
      /*
        ---------- הפרוזה של המסלול הקל נזרקת ----------

        נמדד חי על שישה תרחישים: **כל שש העריכות בוצעו נכון**, ושלושה
        מהמשפטים שנכתבו עליהן היו שגויים - "השם כבר איטליה ואוסטריה"
        אחרי ששינה אותו, "ההערה כבר קיימת" אחרי שהוסיף אותה, ו"לא
        אוכל להוסיף" אחרי שהוסיף. המטייל קורא את המשפט.

        המסקנה היא לא "המודל הזול לא מתאים" אלא **לא לתת לו לכתוב**:
        קריאת הכלי היא מה שהוא עושה היטב, והמשפט כבר קיים בקוד -
        `out.action` נבנה בשרת מהעריכה שבוצעה בפועל ("הזזתי את רומא
        מיום 5 ליום 1"). זה אותו דפוס של `pinDistances` ו-`priceGuard`:
        למסור עובדה מחושבת במקום לבקש מהמודל לא לטעות.

        השבבים מושתקים בתור כזה כדי שהמשפט לא יופיע פעמיים - כאן הם
        *הם* המשפט.
      */
      capturing = false;
      const textEvents = buffered.filter((e) => e.type === 'text');
      for (const e of buffered) {
        if (e.type === 'text') continue;
        send(e.type === 'trip' ? { ...e, actions: [] } : e);
      }
      buffered.length = 0;
      if (actions.length > 0) {
        full = actions.join(' · ');
        send({ type: 'text', text: full });
        lightProseDropped = textEvents.length > 0;
        suppressActions = true;
      } else {
        // אין פעולות אבל גם לא הסלמנו - מצב שאמור להיות בלתי אפשרי
        // (`shouldEscalate` תופס `toolRan: false`). נשמר כרשת ביטחון.
        for (const e of textEvents) send(e);
      }
    }
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

  /*
    שורה אחת שמאפשרת למדוד את הניתוב בפרודקשן בלי הארנס: כמה תורים
    ירדו למסלול הקל, וכמה מהם הוסלמו בחזרה. יחס הסלמה גבוה פירושו
    שהמסווג רחב מדי - וזה הנתון שיגיד את זה, לא תחושה.
  */
  console.log(
    `[chat] turn route=${route.light ? 'light' : 'heavy'} escalated=${escalated} proseDropped=${lightProseDropped} reason=${route.reason}`,
  );

  /*
    שמירה במטמון - רק אם באמת הצענו את הכלי (`allowLookup`) ורק אם מה
    שיצא באמת נושא ציטוט אמיתי (שרד את שומר המחירים). תשובה שנחתכה
    לגמרי לא נשמרת - אין מה לתת בחזרה לשאלה הבאה.
  */
  if (allowLookup && LOOKUP_ANCHOR.test(full)) {
    rememberLookup(lastUser, full);
  }

  const dest = findDestination(full);
  send({ type: 'meta', destinationSlug: dest?.slug });
  if (touched && working) send({ type: 'trip', trip: working, actions: suppressActions ? [] : actions });
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

/**
 * תקלה בתור של הסוכן. חשוב שההודעה תגיד שהטיול עצמו לא נפגע: הטיול חי
 * ב-localStorage אצל הלקוח ולא נשלח לשום מקום בתור שנכשל, אז אין מה לאבד.
 */
const AGENT_ERROR_MESSAGE =
  'משהו השתבש אצלי באמצע התשובה 🙏\n\n' +
  'הטיול שלכם לא נפגע - הוא שמור כמו שהיה. אפשר לנסות לשלוח את אותה הודעה שוב.';

/**
 * כשהתור נפל *אחרי* שכבר הוזרם טקסט אין מה לנסות שוב (חלק מהתשובה כבר
 * על המסך), אבל גם אסור לשתוק: עד עכשיו התשובה פשוט נעצרה באמצע משפט
 * והמטייל לא ידע אם זה הסוף, אם הטיול השתנה, או אם כדאי לשאול שוב.
 */
/**
 * חריגה מחלון ההקשר. ההיסטוריה רק גדלה, ולכן זו שגיאה **קבועה לשיחה
 * הזאת**: כל תור נוסף בה ייכשל באותו אופן. "משהו השתבש, נסו שוב" מזמין
 * בדיוק את הדבר היחיד שלא יעבוד, ולכן ההודעה כאן אומרת את האמת ונותנת
 * את הפעולה שכן פותרת. תקציב ההיסטוריה ב-chatMessages.ts אמור למנוע את
 * זה מראש; זו רשת הביטחון.
 */
/*
 * הנוסח הקודם הציע "רעננו את הדף", ומטייל ענה מיד: "כשאני מרענן, הצ׳אט
 * נשאר". הוא צדק - ההיסטוריה נטענת מ-localStorage בכל טעינה, ולכן רענון
 * לא מנקה כלום. גם "טיול חדש" הייתה עצה גרועה: הוא פותח טיול אחר ומאבד
 * את התוכנית. עצה שלא עובדת גרועה מאין עצה, ולכן נוסף כפתור "ניקוי"
 * בכותרת השיחה וההודעה מפנה אליו.
 */
const CONTEXT_TOO_LONG_MESSAGE =
  'השיחה הזאת נעשתה ארוכה מדי בשבילי 🙏\n\n' +
  'הטיול שלכם שמור ולא נפגע. לחצו על "ניקוי" בראש חלון השיחה - זה מוחק את ההתכתבות בלבד, והתוכנית, המפה והסיכות נשארות בדיוק כמו שהן.';

/** מזהה את השגיאה לפי גוף התשובה של Anthropic, שנשמר בהודעת השגיאה */
function isContextTooLong(err: unknown): boolean {
  return /prompt is too long|context.{0,20}too long|maximum context/i.test(
    String((err as { message?: string })?.message ?? ''),
  );
}

const AGENT_TRUNCATED_MESSAGE =
  '\n\n---\nנקטעתי כאן באמצע 🙏 מה שכבר נשמר בטיול תקין. אפשר לבקש ממני להמשיך.';

const QUOTA_MESSAGE =
  'הגעתם למכסת השימוש היומית בסוכן החכם של התוכנית החינמית 🙏\n\n' +
  'המכסה מתאפסת פעם ביום. בינתיים אפשר להמשיך לערוך את הטיול ידנית במתכנן - להוסיף ימים, להזיז עצירות ולפתוח ניווט.\n\n' +
  'רוצים להמשיך לתכנן עם הסוכן בלי לחכות? טיול+ פרימיום מגדיל את המכסה פי 10 - כל הפרטים בעמוד "פרימיום" (tiyulplus.com/premium).';

const IMAGE_QUOTA_MESSAGE =
  `הגעתם למכסת התמונות היומית (${PLAN_LIMITS.free.imagesPerDay} תמונות ביום בתוכנית החינמית) 📷\n\n` +
  'קריאת תמונה יקרה הרבה יותר מקריאת טקסט, ולכן המכסה נמוכה. המכסה מתאפסת פעם ביום, ובינתיים אפשר פשוט לכתוב לי את הפרטים - שם המלון, התאריכים והעיר - ואטפל בזה בדיוק אותו דבר.\n\n' +
  'בטיול+ פרימיום המכסה גדולה בהרבה - כל הפרטים בעמוד "פרימיום" (tiyulplus.com/premium).';

const EMPTY_REQUEST_MESSAGE =
  'לא קיבלתי טקסט ולא תמונה שאני יכול לקרוא 🙏 כתבו לי מה תרצו שאעשה, או צרפו תמונה קטנה יותר.';

const IMAGE_TOO_BIG_MESSAGE =
  'התמונה כבדה מדי בשבילי 😅 נסו צילום מסך או תמונה קטנה יותר, או פשוט כתבו לי את הפרטים.';

export async function POST(request: Request) {
  /*
    ---------- השערים, מהזול ליקר ----------

    כל מה שכאן רץ **לפני** שנשלח משהו ל-API, ולכן עולה אפס. הסדר הוא
    לפי עלות הבדיקה: כותרת, זהות, מכסות בזיכרון, גוף, ורק בסוף התקרה
    הגלובלית שדורשת אולי קריאת דאטהבייס.

    אף אחד מהם לא נראה למטייל אמיתי. זה לא מקרי - זו הדרישה.
  */

  // בוט שפונה ישירות לנתיב, לפני הכול. דפדפן שולח Origin בכל POST.
  if (!sameOriginOk(request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // זיהוי הקורא (משתמש מחובר או IP) - לפני קריאת הגוף, כדי שגוף עצום
  // לא יעקוף את המכסות. ואז שערי המכסה, מהזול ליקר.
  const caller = await resolveCaller(request);
  const limits = PLAN_LIMITS[caller.tier];

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

    /*
      **תקרת ההוצאה, בשני ארנקים.** המכסות שמעל מגינות מפני משתמש אחד;
      זו מגינה מפני אלף - ובלי לתת לאף אחד מהם לכבות את המוצר לאחרים:
      לתנועה אנונימית יש ארנק משלה, ולאף זהות אין יותר מחלק קטן מהיום.
      ראו lib/server/budget.ts.
    */
    const budget = await budgetFor(caller.id);
    /*
      רשת ביטחון על ה-IP, **רחבה בכוונה**.

      המכסה האמיתית היא לפי דפדפן, כי IP משותף במפעילת סלולר הוא
      עשרות אלפי אנשים. ה-IP קיים רק כדי לתפוס מכונה אחת שמחליפה מזהי
      דפדפן בלולאה, ולכן התקרה שלו היא פי `IP_BACKSTOP_MULTIPLE`
      מהתקרה של אדם בודד. **כששני המדדים חלוקים - הדפדפן מנצח**, בדיוק
      כפי שנתנאל ביקש: לחסום אדם אמיתי יקר לנו יותר מבקשה מיותרת אחת.
    */
    let ipBlocked = false;
    if (caller.ip && caller.id !== caller.ip) {
      const ipState = await budgetFor(caller.ip);
      ipBlocked = ipState.callerSpent >= ipState.callerBudget * IP_BACKSTOP_MULTIPLE;
      if (ipBlocked) {
        console.warn(`[budget] ip backstop hit: ${caller.ip} $${ipState.callerSpent.toFixed(2)}`);
      }
    }
    if (ipBlocked) return singleMessageStream(BUDGET_MESSAGE);
    if (budget.exceeded) {
      console.warn(
        `[budget] blocked (${budget.reason}) caller=$${budget.callerSpent.toFixed(3)}/$${budget.callerBudget.toFixed(2)} day=$${budget.spent.toFixed(2)}/$${budget.budget.toFixed(2)}`,
      );
      return singleMessageStream(BUDGET_MESSAGE);
    }
    void maybeAlert(budget, caller.id);
  }

  // קוראים כטקסט קודם: גוף ענק נעצר לפני JSON.parse
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_CHARS) return singleMessageStream(IMAGE_TOO_BIG_MESSAGE);
  let body: { messages?: unknown; trip?: unknown; kosher?: unknown; explored?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'bad-request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  /*
    שני השערים האלה חייבים לרוץ על **הגוף הגולמי**, לפני הניקוי.
    `sanitizeMessages` חותך כל הודעה ל-8,000 תווים ולוקח רק את 40
    ההודעות האחרונות - כלומר אחריו ההודעה הענקית כבר קטנה והשיחה
    האינסופית כבר קצרה, ואין מה לתפוס. זה נתפס בהארנס: שתי הבדיקות
    עברו ירוקות בזמן שהן בדקו את התוצאה של החיתוך במקום את הקלט.
  */
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const rawLongest = Math.max(
    0,
    ...rawMessages.map((m) =>
      typeof (m as { content?: unknown })?.content === 'string'
        ? ((m as { content: string }).content.length)
        : 0,
    ),
  );
  if (rawLongest > MAX_MESSAGE_CHARS) return singleMessageStream(TOO_LONG_MESSAGE);

  const rawUserTurns = rawMessages.filter(
    (m) => (m as { role?: unknown })?.role !== 'assistant',
  ).length;
  if (rawUserTurns > MAX_USER_MESSAGES) return singleMessageStream(TOO_MANY_TURNS_MESSAGE);

  const messages = sanitizeMessages(body.messages);
  // אחרי הניקוי אפשר להישאר בלי כלום (הודעה ריקה, או תמונה שנפסלה על
  // גודל/פורמט). שליחת מערך ריק ל-API היא 400 מובטחת, אז עוצרים כאן
  // ואומרים את זה בעברית במקום להפיל את התור.
  if (messages.length === 0) return singleMessageStream(EMPTY_REQUEST_MESSAGE);

  // מכסת התמונות: נספרת רק על התמונה שצורפה עכשיו (ההודעה האחרונה),
  // כדי ששליחה חוזרת של ההיסטוריה לא תבזבז את המכסה.
  const freshImage = Boolean(messages[messages.length - 1]?.image);
  if (freshImage && process.env.ANTHROPIC_API_KEY) {
    const imgLimit = checkLimit('chat-images', caller.id, limits.imagesPerDay, 24 * 60 * 60 * 1000);
    if (!imgLimit.ok) return singleMessageStream(IMAGE_QUOTA_MESSAGE);
  }

  const clientTrip = sanitizeClientTrip(body.trip);
  const kosherHint = body.kosher === true;

  /*
    שער הנושא. מסרב **רק** כשיש סימן מובהק לנושא אחר, אין שום סימן
    לנסיעות, ואין טיול פעיל - ראו topicOk. הסירוב עולה אפס, וזו כל
    הנקודה: לא לשרוף קריאת מודל כדי להחליט שלא לענות.
  */
  if (process.env.ANTHROPIC_API_KEY) {
    const topic = topicOk(
      messages[messages.length - 1]?.content ?? '',
      Boolean(clientTrip && clientTrip.days.length > 0),
    );
    if (!topic.ok) {
      console.log(`[chat] off-topic (${topic.why})`);
      return singleMessageStream(OFF_TOPIC_MESSAGE);
    }
  }
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

      // מפסק החירום: כשהדגל agent_enabled כבוי, נופלים לתשובות מבוססות
      // הכללים בדיוק כמו במצב ללא מפתח - האתר עובד, ההוצאה על המודל
      // נעצרת מיד ובלי דיפלוי. ראו lib/server/flags.ts ו-/admin.
      if (process.env.ANTHROPIC_API_KEY && (await agentEnabled())) {
        const meter = { units: 0, usd: 0 };
        try {
          await runAgent(messages, clientTrip, send, kosherHint, explored, meter, caller);
        } catch (err) {
          // אסור להשתיק: בלי הלוג הזה אי אפשר לדעת מה נפל בפרודקשן
          console.error('[chat] agent turn failed', err);

          // ניסיון שני, רק אם עוד לא הוזרם טקסט: רוב הכשלים כאן הם
          // עומס או שגיאה חולפת של ה-API, ולמטייל אין שום דרך לדעת זאת.
          let recovered = false;
          if (!emitted && isTransient(err)) {
            try {
              await runAgent(messages, clientTrip, send, kosherHint, explored, meter, caller);
              recovered = true;
            } catch (retryErr) {
              console.error('[chat] agent retry failed', retryErr);
            }
          }

          // אם גם זה נכשל: אומרים את האמת. במפורש לא נופלים כאן למנוע
          // החוקים - הענף שלו ל"לא זוהה יעד" הוא ברכת פתיחה שמונה את כל
          // המדינות, ובאמצע שיחה היא נקראת כאילו הסוכן שכח את כל ההקשר
          // (וזה בדיוק מה שקרה למטייל שביקש לערוך את הטיול לפי המלון).
          if (!recovered) {
            // שלושה מצבים שונים: חריגה מחלון ההקשר היא שגיאה קבועה
            // לשיחה הזאת וצריכה הוראה אחרת לגמרי; תור שנקטע באמצע מקבל
            // סיומת קצרה (אחרת ההודעה הארוכה נקראת כאילו כל התשובה
            // שמעליה בוטלה); וכל השאר מקבל את ההסבר המלא.
            const text = isContextTooLong(err)
              ? CONTEXT_TOO_LONG_MESSAGE
              : emitted
                ? AGENT_TRUNCATED_MESSAGE
                : AGENT_ERROR_MESSAGE;
            send({ type: 'text', text });
          }
        } finally {
          // הרישום קורה גם כשהתור נכשל באמצע - הטוקנים כבר נצרכו
          recordAiUnits(caller.id, meter.units);
        }
      } else {
        // המצב חסר המפתח: כאן ברכת הפתיחה של מנוע החוקים במקומה
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
