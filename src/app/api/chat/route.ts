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

/** Request-body cap - before JSON.parse, so a huge body cannot bring down the function */
const MAX_BODY_CHARS = 6_000_000;
import type { Trip } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';
import { exploreDestination, type ExploreScope } from '@/lib/explore/resolver';
import { exploredToDestination, sanitizeExploredDestinations } from '@/lib/explore/adapter';
import { checkLimit, peekUsed, aiUnitsUsedToday, recordAiUnits } from '@/lib/server/limits';
import {
  IP_BACKSTOP_MULTIPLE,
  budgetFor,
  maybeAlert,
  maybeAlertPremium,
  monthKey,
  premiumBudgetFor,
  recordSpend,
} from '@/lib/server/budget';
import { MAX_TURN_USD } from '@/lib/server/chatGuards';
import {
  BUDGET_MESSAGE,
  MAX_MESSAGE_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_USER_MESSAGES,
  OFF_TOPIC_MESSAGE,
  PREMIUM_BUDGET_MESSAGE,
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
import { PLAN_LIMITS, PREMIUM_TRIP_BUILDS_PER_DAY, aiUnits, periodMsFor } from '@/lib/plans';
import type { BookingSearchCard } from '@/lib/bookingSearch';
import {
  GuardedTextStream,
  LOOKUP_ANCHOR,
  NO_PRICE_LINE,
  NO_PRICE_LINE_BARE,
  type GuardAllowlist,
} from '@/lib/priceGuard';
import { CACHE_TTL, SYSTEM_PROMPT, anthropicBase, cachedPrefix } from '@/lib/server/agentPrefix';
import { cityGate, resolveMessage, verdictBlock } from '@/lib/server/placeResolve';
import { CORRECTION_INSTRUCTION, detectCorrection } from '@/lib/server/correction';
import { fallbackUncoveredQuickReplies } from '@/lib/server/uncoveredReplies';

/**
 * The travel chat - a real agent over the user's trip.
 *
 * Two modes:
 * 1. Without an API key - a rule-based responder over the data (works
 *    immediately, no tool loop).
 * 2. With ANTHROPIC_API_KEY - a server-side tool-use loop: the client sends the
 *    current trip, the model gets it + grounding + tools, and runs actions
 *    (create_trip, add_day, add_place...) on an in-memory copy with strict
 *    validation (agent.ts). An invalid call returns a tool_result with is_error
 *    and the model corrects itself. Up to 8 iterations, then a final text answer.
 *
 * The response is always a text/event-stream of JSON events:
 *   {type:'text', text}                        - a streamed text chunk
 *   {type:'meta', destinationSlug?, placeIds?} - at the end, so the client can show a map
 *   {type:'trip', trip, actions}               - the updated trip + a Hebrew "what was done"
 *   {type:'done'}                              - end
 */

export const maxDuration = 60;

interface ChatReply {
  reply: string;
  destinationSlug?: string;
  placeIds?: string[];
}

/**
 * The slugs this tool call is about to write, if it picks a city at all.
 *
 * The list is deliberate: these are the tools where **the model chooses which
 * city**, i.e. the places where a name the traveler typed is translated into a
 * slug. Tools that act on a city already in the trip (`add_place`,
 * `move_place`, `set_day_notes`) are not included - there is nothing to
 * interpret in them, and blocking them would break valid edits.
 */
function citySlugsOf(name: string, input: Record<string, unknown>): string[] {
  const one = (v: unknown) => (typeof v === 'string' && v ? [v] : []);
  switch (name) {
    case 'create_trip_full':
      return (Array.isArray(input.dayPlans) ? input.dayPlans : []).flatMap((d) =>
        one((d as Record<string, unknown>)?.citySlug),
      );
    case 'create_trip':
      return (Array.isArray(input.citySlugs) ? input.citySlugs : []).flatMap(one);
    case 'add_day':
    case 'set_day_city':
      return one(input.citySlug);
    default:
      return [];
  }
}

function findDestination(text: string) {
  const lower = text.toLowerCase();
  const direct = destinations.find((d) => text.includes(d.name) || lower.includes(d.slug));
  if (direct) return direct;
  // A country-level question ("do I need a visa for Italy?") leads to one of its cities
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
    // A count + a few examples, not the whole catalog - see lib/server/catalogSummary.ts
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
 * The hard rules on answer length, in a separate block sent **last** in the
 * system array. See the explanation at the point of use: the same rules inside
 * SYSTEM_PROMPT did not hold.
 */
const OUTPUT_DISCIPLINE = `OUTPUT DISCIPLINE - re-read this before every reply, it overrides any urge to be thorough:
1. SHORT BY DEFAULT. Two to four sentences. A factual question gets one or two. Long is a defect here, not generosity.
2. NO LISTS OF PLACES OR DESTINATIONS. Asked what you cover: the real counts from the index, then at most four or five example cities in ONE line, then ask where they want to go. Never a breakdown by continent or region, never bullets of city names, never a second or third line of them. This is the single most common way your answer becomes unreadable.
3. NEVER RE-WRITE THE PLAN. If a tool changed the trip this turn, the panel already shows every day and stop. One sentence about what changed. No day list, no **יום N** lines.
4. NO CLOSING OFFER. Don't end with "אם תרצו, אשמח..." or a menu of what else you could do. The user knows they can ask. Stop at the answer.
5. EVERY CLOSED-SET QUESTION GETS BUTTONS. If your reply ends with a question that has a short, nameable set of likely answers - how many days, which city, yes/no, pick one of a few options you just listed - call suggest_quick_replies with those exact options as short Hebrew chips, in the SAME turn. This is not optional and not just for one scenario: an open-ended question ("מה דעתך על המסלול?") stays free text, but a question you could answer yourself with a short list doesn't get left as typing-only.`;


/** Real progress text based on the tool running right now - not rotating dummy messages */
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
  // Real progress from the tool loop - so a long wait does not look stuck
  | { type: 'status'; text: string }
  | { type: 'meta'; destinationSlug?: string; placeIds?: string[] }
  | { type: 'trip'; trip: Trip; actions: string[] }
  | { type: 'quickReplies'; replies: string[] }
  // A destination auto-explored this turn - the client stores it and renders the canvas with it
  | { type: 'explored'; destination: Destination }
  // A ready provider search card - built on the server, the client only renders it
  | { type: 'search'; search: BookingSearchCard }
  | { type: 'done' };

type Send = (event: StreamEvent) => void;

interface AnthropicUsage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
  /** How many web_search calls ran in this request - see webLookup.ts */
  server_tool_use?: { web_search_requests?: number };
}

interface AnthropicSSE {
  type: string;
  index?: number;
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type: string; text?: string; partial_json?: string; stop_reason?: string };
  usage?: AnthropicUsage; // On message_delta - the final output_tokens
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
 * An HTTP failure against Anthropic. The status code must survive as an object
 * property and not only as text in the message: `isTransient` decides by
 * `status` whether to retry, and `new Error('anthropic 529')` kept the code
 * only inside the string - so 529/429/500 were classified as a permanent error
 * and the second attempt never ran. This is exactly the path that killed a real
 * turn in production.
 */
class AnthropicHttpError extends Error {
  readonly status: number;
  constructor(status: number, detail = '') {
    // The response body goes into the message deliberately: `anthropic 400`
    // alone says nothing, and a real 400 in production cost a full round of
    // diagnostics because it did not say which field was rejected. Anthropic
    // returns a field path ("messages.2: ...") and not user content, yet we
    // still truncate - a log is no place for a full response body.
    super(detail ? `anthropic ${status}: ${detail.slice(0, 400)}` : `anthropic ${status}`);
    this.name = 'AnthropicHttpError';
    this.status = status;
  }
}

/**
 * One iteration against Claude, streaming: text is streamed to the client
 * immediately; tool_use blocks are accumulated (partial_json) and returned for
 * execution. needSeparator adds a blank line before the first text when text
 * was already streamed from a previous iteration.
 */
/**
 * The only instruction added on the light path.
 *
 * It does not try to stop the model from doing things - the tools already do
 * that. It tells it what to do when it **cannot**: say so in one sentence and
 * stop. A reply with no tool call is exactly what `shouldEscalate` looks for,
 * so "I can't" automatically becomes a re-run on the strong model - without the
 * cheap model knowing another model exists, and without a magic word that can
 * be forgotten.
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
  /** What the traveler themselves said - the price guard's whitelist */
  guardAllow: GuardAllowlist,
  /** Whether a search card was already shown this turn (only changes the replacement wording) */
  searchShown: boolean,
  /**
   * The light path: a cheap model, restricted tools, **and no catalog index**.
   * See `src/lib/server/modelRoute.ts` - the restricted tools are what makes
   * omitting the index possible, not the other way around.
   */
  light: boolean,
  /**
   * Whether to attach `LOOKUP_TOOL` to this call. **The structural guarantee**
   * against searching about kashrut: a turn that asks about kashrut arrives
   * here with `false`, so the tool simply does not exist for the model - not an
   * instruction, a fact. See webLookup.ts.
   */
  allowLookup: boolean,
  /** Today's date, or a previous cached answer - a separate, variable system block */
  lookupNote: string,
  /**
   * Verdicts the server computed about this message that the model must not
   * contradict: place-name interpretation (`placeResolve.ts`) and whether this
   * is a correction turn (`correction.ts`).
   *
   * Sent **after** `OUTPUT_DISCIPLINE`, i.e. last. The project's log records
   * twice that a rule at the top of a long prompt got swallowed and the same
   * rule at the end works.
   */
  serverVerdicts: string,
): Promise<{ blocks: AccBlock[]; stopReason: string; text: string; usage: AnthropicUsage; model: string }> {
  const model = light
    ? (process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5')
    : (process.env.ANTHROPIC_MODEL_AGENT ?? 'claude-sonnet-4-5');
  // Kosher toggle from the UI before any trip exists: passed to the agent quietly via the state block
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
      // A tool that is not sent does not exist as far as the model is concerned.
      // That is the guarantee, not a line in the prompt - and by exactly the same
      // principle, `allowLookup=false` (any turn that sounds like a kashrut
      // question) means LOOKUP_TOOL is simply absent from the array, regardless
      // of what the prompt says.
      tools: light
        ? AGENT_TOOLS.filter((t) => isLightTool(t.name))
        : allowLookup
          ? [...AGENT_TOOLS, LOOKUP_TOOL]
          : AGENT_TOOLS,
      // Render order: tools (static) -> system. The grounding block is the one
      // carrying cache_control - the whole fixed prefix goes into the prompt
      // cache; the changing trip state sits after the breakpoint, so it does not
      // spoil cache reads.
      system: [
        /*
          **The cached prefix is built in exactly one place** (`agentPrefix.ts`),
          because the warm-up path builds it too - and a prefix that differs by a
          single character is a different cache entry, i.e. a warm-up that pays
          for itself and warms nothing.

          **On the light route the omission is the big saving, not the model.**
          The index is ~240k characters (~80k tokens) of the entire catalog, sent
          so the model can find a place it does not already have. A mechanical
          edit operates on what is already in the trip, so there is nothing in it
          to search. The index on the light route = a cheap turn that costs more
          than the one it replaced, because a cache write on a second model is
          dearer than a read from a warm cache.
        */
        ...(light
          ? [{ type: 'text' as const, text: SYSTEM_PROMPT }]
          : cachedPrefix(kosherOk).map((b) =>
              ttl === null && b.cache_control
                ? { ...b, cache_control: { type: 'ephemeral' as const } }
                : b,
            )),
        // The detail block varies with the conversation -> after the breakpoint, no cache_control
        { type: 'text', text: groundingDetail },
        ...(light ? [{ type: 'text' as const, text: LIGHT_TURN_NOTE }] : []),
        // Today's date / cached lookup answer - derived from the clock at request
        // time, so it must sit here and not in the cached prefix (see webLookup.ts, todayIso).
        ...(lookupNote ? [{ type: 'text' as const, text: lookupNote }] : []),
        { type: 'text', text: `CURRENT TRIP (the user's active trip right now):\n${serializeTripForModel(trip)}${kosherNote}` },
        // Last on purpose. These rules also appear above under LANGUAGE & VOICE
        // and were swallowed in live testing: the prompt is long, and the model
        // produced a continent-by-continent breakdown naming dozens of cities
        // even though two separate sections forbade exactly that. Here they are
        // the last thing read before the conversation - the same principle that
        // made PROSE_DISCIPLINE work from inside the tool result.
        { type: 'text', text: OUTPUT_DISCIPLINE },
        ...(serverVerdicts ? [{ type: 'text' as const, text: serverVerdicts }] : []),
      ],
      messages: apiMessages,
    }),
  });

  /*
    **Fallback if the API does not recognise `ttl`.** This could not be verified
    live in this environment, and a rejected request means a dead agent - not an
    expensive turn. So a 400 that mentions the field retries once without it. If
    the field is valid, this line never runs.
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
    // Reading the body must not be able to break the error handling itself
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
   * The price guard, on the stream.
   *
   * Text is no longer sent delta-by-delta: it goes through `GuardedTextStream`,
   * which releases **only complete sentences**. Without that there is no way to
   * filter a price claim - what is sent is sent, and "400" and "ILS per night"
   * can arrive in two separate deltas and pass any check that runs on either of
   * them. The cost is one sentence of latency; trip state is still sent
   * immediately as before, so the canvas does not wait.
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
          // The tool name is already known here, before its input JSON streams
          // (the long part) - so we can tell the user what is about to happen
          // instead of leaving "thinking" on screen for 10 seconds. Only for the
          // first tool of the turn: the model opens all tool blocks in sequence,
          // and collapsing them all here would announce statuses before the
          // action preceding them had even run.
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
          // The block keeps the raw text - that is what goes back into the
          // model's history. The user gets whatever comes out of the guard.
          if (block?.type === 'text') block.text += event.delta.text;
          emit(guardStream.push(event.delta.text));
        } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
          if (block?.type === 'tool_use') block.json += event.delta.partial_json;
        }
      } else if (event.type === 'message_delta') {
        if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
        if (event.usage?.output_tokens !== undefined) usage.output_tokens = event.usage.output_tokens;
        // The number of searches is only known after they have run - i.e. at the
        // end, in message_delta, not at the start of the call. Without this a
        // search costs money without being recorded anywhere.
        if (event.usage?.server_tool_use) usage.server_tool_use = event.usage.server_tool_use;
      } else if (event.type === 'message_start' && event.message?.usage) {
        Object.assign(usage, event.message.usage);
      }
    }
  }

  // Whatever is left in the buffer at the end of the stream (the last sentence, with no punctuation after it)
  emit(guardStream.end());

  // A stripped chunk is real operational information: it says the model tried to
  // quote a number. Logged in every environment, not just development - this is
  // the signal that a prompt is worth looking at.
  if (guardStream.redactions.length > 0) {
    console.warn(`[chat] price guard redacted: ${guardStream.redactions.join(', ')}`);
  }

  // Cost monitoring in dev: cached > 0 from iteration 2 and turn 2 = the prompt cache is working
  /*
    The usage line. Until now it was development-only, which is exactly the
    situation where you cannot tell how much the routing actually saves:
    production is where the real traffic and the warm cache are. It contains
    nothing belonging to the user - a model name and numbers.
  */
  if (process.env.NODE_ENV === 'development' || process.env.CHAT_USAGE_LOG === 'on') {
    console.log(
      `[chat] ${model} iter=${iter} max=${maxTokens} in=${usage.input_tokens ?? 0} cached=${usage.cache_read_input_tokens ?? 0} cacheWrite=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens ?? 0}`,
    );
  }

  const blocks = [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, blk]) => blk);
  return { blocks, stopReason, text, usage, model };
}

/** The agent loop: model calls <-> tool execution on a copy of the trip, until a text reply */
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
   * The only two tools that reach a free external service (Wikipedia,
   * OpenStreetMap), and therefore the only two through which someone else's
   * service can be put under load. A daily per-person quota, **plus a ceiling
   * for a single turn** - one turn can run up to 16 iterations, and no real
   * request needs more than three explores or six geocodes inside it.
   */
  const perTurn = { explores: 0, geocodes: 0 };
  const MAX_EXPLORES_PER_TURN = 3;
  const MAX_GEOCODES_PER_TURN = 6;
  /**
   * search cards in a single turn.
   *
   * The chat's existing quotas (per-minute burst, requests per day, AI unit
   * budget) cover this path completely - the tool runs **only** inside
   * `/api/chat`, after all of those gates have been checked, and there is no
   * other way to reach it. A separate daily quota was deliberately not added:
   * unlike exploring a destination or geocoding a location, this tool does not
   * reach any external service - it assembles a local string, at no cost and
   * with no load on anyone. What does need a bound is the **user experience**:
   * a turn that pastes four affiliate cards reads like a sales pitch, and that
   * is not the product.
   */
  let searchesShown = 0;
  const MAX_SEARCHES_PER_TURN = 2;
  /**
   * The price guard's allowlist: what the traveller themselves wrote, plus the
   * names of pins they have already given. **Only from these** may a number or
   * a hotel name appear in the reply.
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
  // A message carrying an image is sent as an array of blocks (image then text);
  // without an image it stays a plain string, exactly as before.
  const apiMessages: ApiMessage[] = messages.map((m) => {
    const match = m.image?.match(IMAGE_DATA_URL);
    if (!match) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        { type: 'image', source: { type: 'base64', media_type: `image/${match[1]}`, data: match[2] } },
        // A message with no text is invalid against the API, and in any case the
        // model should be told explicitly that the user attached an image and
        // wrote nothing.
        { type: 'text', text: m.content || 'צירפתי תמונה - תסתכל עליה.' },
      ],
    };
  });

  // The kosher toggle from the UI: when a trip exists, merge it straight into
  // preferences (sensitive preferences are buttons; the agent reads them
  // silently and never asks)
  if (kosherHint && working && working.preferences?.kosher !== true) {
    working = { ...working, preferences: { ...working.preferences, kosher: true } };
    touched = true; // so the updated trip goes back to the client and is saved
  }

  // Output discipline: an ordinary text reply is capped at 1024; iterations with
  // tools (edit-intent detection, or continuing the loop after tool_results) get
  // 2048 for the JSON.
  const lastUser = messages[messages.length - 1]?.content ?? '';
  const hasVerbIntent =
    /תבנה|בנה לי|תבני|תכינו|תכין|תכנן|תכנון|תוסיף|תוסיפי|תוריד|תורידי|תחליף|תזיז|תמלא|תעדכן|תסדר|צור טיול|תקצר|תאריך/.test(
      lastUser,
    );
  /*
    Accepting the offer to build a trip (see SYSTEM_PROMPT, "CREATING THE FIRST
    TRIP NEEDS A CLEAR YES"): a message that is **entirely** a short
    confirmation - the recommended chip ("yes, build it for me") already matches
    hasVerbIntent via its verb, and this is here for a free-form "yes" the
    traveller typed themselves. `^...$` on purpose: "yes but tell me also
    about..." is going somewhere else and does not count as a plain acceptance.
  */
  const acceptsOffer = /^(כן|בטח|סבבה|קדימה|מעולה|אחלה|בשמחה|לגמרי|יאללה|נשמע טוב)[\s,.!]*$/.test(
    lastUser.trim(),
  );
  // A request like "an 8-day trip to Bratislava and Vienna" contains none of the
  // verbs listed above but is plainly a build request - a day count plus a
  // destination known from the data. It is deliberately *not* part of
  // buildAskIntent (below), because it is equally true of a question shaped like
  // "5 days in Italy, what is worth seeing" - and there it is not a build
  // request at all.
  const mentionsDaysAndDest = /\d+\s*ימים?/.test(lastUser) && Boolean(findDestination(lastUser));
  /*
    An explicit build/edit request in practice - a real verb, or acceptance of
    the offer. This is what decides whether a prose reply (**Day N**) with no
    tool call is pushed back into an actual build (describedInsteadOfBuilding,
    below), and it therefore has to stay narrow - a question that merely
    mentions days and a destination is not a build request, even though the
    broader `editIntent` (below, for token budgeting only) does count it.
  */
  const buildAskIntent = hasVerbIntent || acceptsOffer;
  const editIntent = buildAskIntent || mentionsDaysAndDest;

  /*
    ---------- Live lookups: hours / admission price / existence ----------

    `kosherAsk` inspects **this message only**, not the six-message window the
    general kashrut gate uses - an unrelated factual question later in a
    conversation that mentioned kashrut once should not be blocked. But when
    **this** message sounds like a kashrut question, that beats everything:
    `allowLookup` drops to false regardless of what `lookupEligible` would have
    said, and LOOKUP_TOOL simply never enters the call.
  */
  const kosherAsk = kosherIntentText(lastUser);
  const lookupQuotaOk =
    !process.env.ANTHROPIC_API_KEY ||
    checkLimit('lookup-day', caller.id, planLimits.lookupsPerDay, periodMsFor()).ok;
  const lookupWanted = !kosherAsk && lookupQuotaOk && lookupEligible(lastUser) && lookupBudgetLeft(messages);
  const cachedLookup = lookupWanted ? getCachedLookup(lastUser) : null;
  /** Whether to actually attach `LOOKUP_TOOL` - not when an answer is already cached */
  const allowLookup = lookupWanted && !cachedLookup;
  const lookupNote = cachedLookup
    ? `A fresh, still-valid answer to this exact question was already looked up earlier - reuse it instead of searching again, with its citation:\n"""\n${cachedLookup}\n"""`
    : allowLookup
      ? `TODAY'S DATE, for citing when you checked something (never compute or guess this yourself): ${todayIso()}.`
      : '';

  // Whether any tool call actually changed the trip this round - distinct from
  // touched (which also reflects a kashrut hint that requires returning the trip
  // to the client, even with no tool).
  let toolBuiltSomething = false;
  let forcedBuildRetry = false;
  // Whether the turn has already been truncated once by max_tokens (raises the
  // ceiling and asks for smaller calls, once only - so no loop can form)
  let truncatedRetry = false;
  // Detail only for the cities the conversation touches (see buildGroundingDetail);
  // explored destinations are re-attached on every iteration - an explore in
  // iteration N is groundable in N+1
  const relevant = relevantCitySlugs(messages, clientTrip);
  // At most two variants per request (with kashrut / without), built on demand:
  // the model can turn the preference on mid-turn with set_preferences, and the
  // next iteration must then genuinely receive the kashrut layer, not just the
  // permission.
  const detailCache = new Map<boolean, string>();
  const detailFor = (ok: boolean) => {
    const hit = detailCache.get(ok);
    if (hit !== undefined) return hit;
    const built = buildGroundingDetail(relevant, ok);
    detailCache.set(ok, built);
    return built;
  };

  /*
    ---------- Model routing ----------

    The decision is made once, before the loop, from the text and the trip - not
    by the model. `light` means: cheap model, tools limited to an allowlist, and
    no catalog index. See `src/lib/server/modelRoute.ts`.
  */
  const lastMsg = messages[messages.length - 1];
  /*
    A kill switch. The default is on, but `CHAT_MODEL_ROUTING=off` restores the
    previous behaviour exactly with no code deploy - and that is also what makes
    it possible to measure both routes against the very same request.
  */
  const routingOn = process.env.CHAT_MODEL_ROUTING !== 'off';
  const route = routingOn
    ? classifyTurn(lastUser, clientTrip, Boolean(lastMsg?.image))
    : { light: false, reason: 'ניתוב כבוי' };

  /*
    ---------- Two decisions the server computes, not the model ----------

    1. **Interpreting a place name.** A misspelling silently became Bratislava,
       and no line of code was involved: `findDestination` requires an exact
       match and so recognised nothing, and the decision fell entirely inside
       the model. Now it is measured in `placeResolve.ts`, handed to the model
       as a fact, **and enforced at the tool level**.
    2. **Whether this is a correction.** If so, rebuilding replaces the open
       trip instead of standing a second one beside it. See `correction.ts`.
  */
  const nameVerdicts = resolveMessage(lastUser);
  const correction = detectCorrection(messages, clientTrip);
  const serverVerdicts = [
    verdictBlock(nameVerdicts),
    correction.correction ? CORRECTION_INSTRUCTION : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  if (nameVerdicts.length > 0 || correction.correction) {
    console.log(
      `[chat] verdicts names=${nameVerdicts.map((v) => `${v.typed}:${v.kind}`).join(',') || '-'} correction=${correction.correction} (${correction.why})`,
    );
  }

  /*
    On the light route **nothing is sent to the client until the turn has proved itself**.

    This is not over-caution: if the turn escalates, the strong model reruns
    everything from scratch, and text or trip state already on screen would
    become a flicker of an edit that never happened. A light turn is one sentence
    anyway, so the delay is negligible. `status` does pass through - it only says
    "working on it", and there is nothing in it to undo.
  */
  const buffered: StreamEvent[] = [];
  let capturing = false;
  const outSend: Send = (e) => {
    if (capturing && e.type !== 'status') buffered.push(e);
    else send(e);
  };

  /** State that must be rolled back on escalation. Anything not here cannot change
   *  on the light route, because the tools that touch it were simply not sent
   *  (explore, search card, pins). */
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
    // The one-shot flags belong to the attempt being discarded, not the one starting now
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
   * The body of the loop, as a function, so it can be run **twice**: once light,
   * and if that did not succeed, once heavy on restored state.
   */
  const runLoop = async () => {
  for (let iter = 0; iter < 16; iter++) {
    // Re-read on every iteration: `working` changes during the turn.
    const kosherOk = kosherAllowed(working, messages, kosherHint);
    // Same principle: `set_preferences` can turn kashrut on mid-turn, so the
    // price guard's allowlist (`kosher-claim`) is rebuilt here on every
    // iteration rather than once at the start of runAgent - see kosherAllowedNames.
    guardAllow.kosherNames = kosherAllowedNames(
      light ? (clientTrip?.citySlugs ?? []) : Array.from(new Set([...relevant, ...(clientTrip?.citySlugs ?? [])])),
      kosherOk,
    );
    // After a truncation we allow a higher ceiling: the instruction to make
    // smaller calls is the main thing, but there is no reason to be cut off
    // again by the same limit while fixing it.
    /*
      A small ceiling for the light route. It produces one tool call and a short
      sentence, and the low ceiling is also a guard: a call that gets truncated
      is `max_tokens`, which is itself an escalation trigger. 512 is comfortably
      enough for every tool on the allowlist.
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
      // The light route never gets search under any circumstances - it is
      // already limited to a tool allowlist that excludes it, and this is here
      // only to make the intent explicit.
      !light && allowLookup,
      light ? '' : lookupNote,
      serverVerdicts,
    );
    /*
      A search is only known after the fact (server_tool_use in usage, see
      runClaudeTurn), so it is flattened here once before it feeds both the units
      and the dollars - the only two gates that exist on this spend, see
      webLookup.ts.
    */
    const usageFlat = {
      ...turn.usage,
      web_search_requests: turn.usage.server_tool_use?.web_search_requests,
    };
    meter.units += aiUnits(usageFlat);
    /*
      The real cost, alongside the units. Units are a personal quota; the dollars
      are the global ceiling and what the owner sees in the admin area - what a
      trip actually costs.
    */
    meter.usd += recordSpend({
      identity: caller.id,
      userId: caller.userId,
      tripId: clientTrip?.id ?? null,
      route: 'chat',
      model: turn.model,
      usage: usageFlat,
      // If the reply was cut off before message_delta there are no output_tokens,
      // and the text that did stream is the basis for a conservative estimate
      // rather than zero
      streamedChars: turn.text.length,
      // Charges the spend to the right wallet - see the full explanation in budget.ts
      premium: caller.plan === 'premium' && Boolean(caller.userId),
    });
    full += turn.text;

    /*
      A cost ceiling for a single turn. The danger is not a long answer but a
      **loop**: 16 iterations each resending the prefix. A real turn costs
      $0.01-$0.13, so the ceiling is far from any genuine use - it exists so that
      a bug cannot burn the daily budget in one request.
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
      // max_tokens is not tool_use, so until now it simply broke the loop: a tool
      // call truncated mid-JSON was dropped silently, with no error and no retry,
      // and the traveller got nothing. That hurts a full trip rebuild most - the
      // largest JSON the model produces, and in Hebrew, which is token-expensive.
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
      // This pattern happens in practice: the model describes a day-by-day
      // itinerary in text (in the **Day N** format the prompt teaches for
      // recommendation answers) but forgets to actually call the tool that builds
      // the trip, **after already receiving an explicit request to build**
      // (`buildAskIntent`) - the chat "promises" a plan while the panel and map
      // stay empty, because no tool_use ran. Rather than guessing what was
      // described and inventing a trip from the text, we push a one-time reminder
      // that forces the model to make the call itself against the real data - and
      // then continue the ordinary tool_use loop.
      //
      // Deliberately `buildAskIntent` and not the broader `editIntent`: a question
      // that merely mentions days and a destination ("5 days in Italy, what is
      // worth seeing") may legitimately be answered in that same **Day N** format
      // as a pure recommendation - and that is exactly the legal case that must
      // not be pushed into an actual build, see SYSTEM_PROMPT "CREATING THE FIRST
      // TRIP NEEDS A CLEAR YES". `!quickReplies` stays: a reply with an offer
      // attached (the "yes, build it" / "no, just asking" chips) is precisely the
      // case where the model *chose* not to build yet, rather than forgot.
      const describedInsteadOfBuilding =
        buildAskIntent &&
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
        // The only asynchronous tool - it runs here and not in executeAgentTool.
        // Curated always wins: if the query is really a city from the catalog, we return that.
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
          !checkLimit('explore-day', caller.id, planLimits.exploresPerDay, periodMsFor()).ok
        ) {
          // The quota is told to the model as a tool result, and the model is the
          // one that explains it to the traveller in conversation - far better
          // than an error box, because it can offer catalog destinations instead.
          // It must say explicitly that this is a quota and not a failure,
          // otherwise the model retries on the next iteration.
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
          // Explore radius: someone who has (or wants) a car is not limited to the
          // city radius. The model may override explicitly, and the default is
          // derived from the booking state.
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
            // Same slug already explored - replace, do not duplicate
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
        // The second asynchronous tool: geocoding happens here, against
        // OpenStreetMap, and is passed to executeAgentTool as a separate
        // parameter. The model supplies a name only - there is no path by which
        // it can inject coordinates of its own. A failed lookup is not a failed
        // tool: the pin is saved and marked "location not verified".
        const pinName = typeof input.name === 'string' ? input.name.trim() : '';
        // An exact slug, not findDestination's soft matching: here it is an
        // identifier, not free text. The context is built from the Latin names,
        // which are what maps recognise.
        const city = destinations.find((d) => d.slug === input.citySlug);
        const country = city ? countries.find((c) => c.slug === city.countrySlug) : undefined;
        const context = city
          ? [city.nameLocal || city.name, country?.nameLocal].filter(Boolean).join(', ')
          : undefined;
        // Over quota the pin is still saved - just without a location, and marked
        // "not verified", exactly like a failed lookup. There is no reason a quota
        // should stop a traveller recording that they booked a hotel.
        const geoAllowed =
          perTurn.geocodes < MAX_GEOCODES_PER_TURN &&
          checkLimit('geocode-day', caller.id, planLimits.geocodesPerDay, periodMsFor()).ok;
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
      } else if (
        block.name === 'create_trip_full' &&
        caller.plan === 'premium' &&
        peekUsed('trip-builds-day', caller.id) >= PREMIUM_TRIP_BUILDS_PER_DAY
      ) {
        /*
          The subscriber's full-build quota. `peekUsed` rather than `checkLimit` -
          the consumption itself happens only after a build that **succeeded**
          (below), so an attempt that failed validation does not burn one of the
          month's two builds. The message is a tool result - the model explains it
          to the traveller in conversation, without naming any monetary figure.
        */
        out = {
          trip: working,
          ok: false,
          message:
            `מכסת בניית הטיולים המלאים היומית של המנוי (${PREMIUM_TRIP_BUILDS_PER_DAY} ביום) נוצלה. זו מכסה ולא תקלה - אל תנסה שוב בתור הזה. אמור למטייל בעברית ובנימוס שמכסת הבניות המלאות להיום נוצלה ושהיא מתחדשת מחר, ושבינתיים אפשר להמשיך לערוך את הטיולים הקיימים בלי הגבלה כזאת, או לבנות טיול במתכנן המהיר.`,
          action: undefined,
          quickReplies: undefined,
        };
      } else {
        /*
          ---------- The names gate, at the tool level ----------

          The block sent to the model is guidance, and this log records again and
          again that guidance gets swallowed. So the choice is measured a second
          time **at the moment it is written**: a tool that picks a city is checked
          against what the traveller actually typed, and in the "several plausible"
          case it fails and hands the options back to the model. A tool that did
          not run cannot create a wrong trip - the same pattern as
          `filterKosherUnlessOptedIn`.

          The check applies only to the tools that pick a city. `add_place` /
          `move_place` operate on a city already in the trip, and carry no name
          to interpret.
        */
        const chosen = citySlugsOf(block.name, input);
        const gate = chosen.length > 0 ? cityGate(lastUser, chosen) : { ok: true as const, note: '' };
        if (!gate.ok) {
          console.log(`[chat] city gate blocked ${block.name} -> ${chosen.join(',')}`);
          out = { trip: working, ok: false, message: gate.message, action: undefined, quickReplies: undefined };
        } else {
          out = executeAgentTool(working, block.name, input, explored, null, correction.correction);
          // The interpretation is handed to the model along with the success, so it can state it to the traveller
          if (out.ok && gate.note) out = { ...out, message: out.message + gate.note };
        }
      }
      if (out.ok && out.trip !== working) {
        touched = true; // suggest_quick_replies does not touch the trip
        toolBuiltSomething = true;
      }
      // Consuming the subscriber's full-build quota - only on a build that actually
      // succeeded (see peekUsed at the gate above). The checkLimit here is the record itself.
      if (out.ok && block.name === 'create_trip_full' && caller.plan === 'premium') {
        checkLimit('trip-builds-day', caller.id, PREMIUM_TRIP_BUILDS_PER_DAY, periodMsFor());
      }
      working = out.trip;
      // We stream the trip immediately after every tool that changes it, not only
      // at the end of the turn: the canvas fills during the build instead of
      // staying empty for tens of seconds.
      if (out.ok && toolBuiltSomething && working) {
        outSend({ type: 'trip', trip: working, actions: [...actions] });
      }
      // Records returned from the data enter the claim guard's allowlist: from
      // this point the model may talk about **those** records by name, and only
      // those. We add to the same object the next iteration will read, rather
      // than creating a new one.
      if (out.ok && out.eventNames?.length) {
        guardAllow.eventNames = [...(guardAllow.eventNames ?? []), ...out.eventNames.filter(Boolean)];
      }
      if (out.ok && out.action) actions.push(out.action);
      if (out.ok && out.quickReplies) quickReplies = out.quickReplies;
      // The card is sent immediately: it is the real answer to the request, and
      // there is no reason for it to wait for the prose to finish. It is built
      // entirely on the server from the trip - see bookingSearch.ts.
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
      An iteration ceiling for the light route. Not a break but an exit that leads
      to escalation: a model still groping around on the fourth round is exactly
      the case the light route is not meant to handle.
    */
    /*
      **A light turn = one model call.** Once the tool has run there is nothing
      left for the model to add: the sentence shown to the traveller is built from
      the action itself and not by the model, and a second round would resend the
      whole prefix just to get text that is discarded anyway. In the first
      measurement that was half the cost of the turn.

      Every tool on the allowlist is one complete action, so there is no case here
      of being cut off halfway - unlike the heavy route, where set_day_city drags
      set_day_places along with it.
    */
    if (light && toolBuiltSomething) break;
    if (light && iter + 1 >= MAX_LIGHT_ITERATIONS) break;
  }
  };

  await runLoop();

  /*
    ---------- Escalation ----------

    Anything that is not a clean success goes back to the strong model, and the
    turn is run **from scratch**: history, trip and text are restored to the state
    before the light attempt, so the strong model never inherits half an edit and
    does not have to work out what happened before it.

    The cheap turn is not refunded to the counter: those tokens really were burnt,
    and a count that rounds them away would make the next measurement look better
    than it is.
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
        ---------- The light route's prose is discarded ----------

        Measured live over six scenarios: **all six edits were performed
        correctly**, and three of the sentences written about them were wrong -
        "the name is already X" after changing it, "that note already exists"
        after adding it, and "I cannot add it" after adding it. The traveller
        reads the sentence.

        The conclusion is not "the cheap model is unsuitable" but **do not let it
        write**: calling the tool is what it does well, and the sentence already
        exists in the code - `out.action` is built on the server from the edit
        that actually executed ("moved Rome from day 5 to day 1"). This is the
        same pattern as `pinDistances` and `priceGuard`: hand over a computed
        fact instead of asking the model not to get it wrong.

        The chips are suppressed on such a turn so the sentence does not appear
        twice - here they *are* the sentence.
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
        // No actions but we did not escalate either - a state that should be
        // impossible (`shouldEscalate` catches `toolRan: false`). Kept as a safety net.
        for (const e of textEvents) send(e);
      }
    }
  }

  /*
    ---------- A reply that ended mid-sentence ----------

    Netanel got exactly this: **"I have arranged a weekend in Barcelona for you:" and then nothing.**

    The reproduction (against a mock Anthropic server, on a production build)
    showed a turn of two model calls: in the first, the model wrote an opening
    sentence **together with the `create_trip_full` call**, the sentence streamed
    immediately (the price guard releases on `:`, which is why it stopped exactly
    there), and in the second call - the one that was supposed to carry the
    content - it wrote nothing at all. I checked the alternatives in the same
    harness: an ordinary sentence, a **Day N** list, and whitespace only - all of
    them reach the client intact. So nothing on the server swallowed text; text
    simply was never written.

    **The part that is ours is that nobody checked.** The safety net that used to
    be here catches only a **completely empty** reply. A sentence ending in a
    colon is, as far as the code is concerned, a perfectly valid reply - and so
    it passed.

    The fix is the same pattern as the light route: a real sentence already exists,
    built on the server from the edit that actually executed (`out.action`), and it
    is appended to the open tail. The traveller no longer gets a promise with
    nothing after it.
  */
  const trimmedFull = full.trim();
  const dangling = trimmedFull.length === 0 || /[:\-–—]$/.test(trimmedFull);
  if (dangling) {
    const tail =
      actions.length > 0
        ? actions.join(' · ')
        : touched
          ? 'עדכנתי את הטיול לפי הבקשה - הפירוט בפאנל הטיול.'
          : 'לא הצלחתי לנסח תשובה - נסו שוב.';
    const text = trimmedFull.length === 0 ? tail : `\n${tail}`;
    send({ type: 'text', text });
    full += text;
    // The chips are suppressed when they *are* the sentence, exactly as on the
    // light route - otherwise the same line appears twice, once as text and once
    // as a chip beneath it.
    if (actions.length > 0) suppressActions = true;
    if (trimmedFull.length > 0) console.log('[chat] dangling reply completed from actions');
  }

  // Safety net: the loop ended with an empty day - we say so honestly, without
  // auto-filling behind the traveller's back. Until 2026-08-16 the check required
  // that ALL days be empty, so a "Day 2 - Energylandia" built empty next to a full
  // day 1 passed silently - and that is exactly the screen that makes people leave.
  if (touched && working && working.days.length > 0) {
    const emptyDayNums = working.days
      .map((d, i) => (d.placeIds.length === 0 ? i + 1 : 0))
      .filter(Boolean);
    if (emptyDayNums.length === working.days.length) {
      const note = '\n\nשימו לב: הימים נוצרו אבל עדיין בלי מקומות. כתבו "תמלא את הימים" ואשבץ מקומות אמיתיים מהמאגר.';
      send({ type: 'text', text: note });
      full += note;
    } else if (emptyDayNums.length > 0) {
      const note = `\n\nשימו לב: יום ${emptyDayNums.join(' ויום ')} עדיין בלי עצירות על המפה. כתבו "תמלא את יום ${emptyDayNums[0]}" ואשבץ מקומות אמיתיים.`;
      send({ type: 'text', text: note });
      full += note;
    }
  }

  // Deterministic safety net: if the toggle is on and the agent did not call
  // set_preferences, we merge kashrut into the trip anyway - the preference must
  // be persisted on the object.
  if (kosherHint && working && working.preferences?.kosher !== true) {
    working = { ...working, preferences: { ...working.preferences, kosher: true } };
    touched = true;
  }

  /*
    One line that makes the routing measurable in production without a harness:
    how many turns went down the light route, and how many of those escalated
    back. A high escalation ratio means the classifier is too wide - and this is
    the figure that will say so, not a hunch.
  */
  console.log(
    `[chat] turn route=${route.light ? 'light' : 'heavy'} escalated=${escalated} proseDropped=${lightProseDropped} reason=${route.reason}`,
  );

  /*
    Caching - only if we actually offered the tool (`allowLookup`) and only if what
    came out genuinely carries a real citation (i.e. survived the price guard). A
    reply that was cut off entirely is not cached - there is nothing to hand back
    to the next question.
  */
  if (allowLookup && LOOKUP_ANCHOR.test(full)) {
    rememberLookup(lastUser, full);
  }

  const dest = findDestination(full);
  send({ type: 'meta', destinationSlug: dest?.slug });
  if (touched && working) send({ type: 'trip', trip: working, actions: suppressActions ? [] : actions });
  // Safety net: the prompt asks for buttons when offering to explore an uncovered
  // destination, but that is not reliably obeyed (see uncoveredReplies.ts) - when
  // the model attached nothing itself, this is an addition only, never an override.
  const effectiveQuickReplies = quickReplies ?? fallbackUncoveredQuickReplies(full);
  if (effectiveQuickReplies) send({ type: 'quickReplies', replies: effectiveQuickReplies });
}

function sendRuleBased(lastUserText: string, send: Send) {
  const r = ruleBasedReply(lastUserText);
  send({ type: 'text', text: r.reply });
  send({ type: 'meta', destinationSlug: r.destinationSlug, placeIds: r.placeIds });
}

/** A single-message stream reply - for quota messages (a chat experience, not an HTTP error) */
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
 * A failure in the agent's turn. The message must say that the trip itself is
 * unharmed: the trip lives in localStorage on the client and was not sent
 * anywhere by a failed turn, so there is nothing to lose.
 */
const AGENT_ERROR_MESSAGE =
  'משהו השתבש אצלי באמצע התשובה 🙏\n\n' +
  'הטיול שלכם לא נפגע - הוא שמור כמו שהיה. אפשר לנסות לשלוח את אותה הודעה שוב.';

/**
 * When the turn failed *after* text had already streamed there is nothing to
 * retry (part of the answer is already on screen), but staying silent is not an
 * option either: until now the reply simply stopped mid-sentence and the
 * traveller could not tell whether that was the end, whether the trip had
 * changed, or whether to ask again.
 */
/**
 * Exceeding the context window. History only grows, so this is an error that is
 * **permanent for this conversation**: every further turn in it will fail the
 * same way. "Something went wrong, try again" invites precisely the one thing
 * that cannot work, so the message here tells the truth and gives the action
 * that does resolve it. The history budget in chatMessages.ts should prevent
 * this in the first place; this is the safety net.
 */
/*
 * The previous wording suggested "refresh the page", and a traveller replied
 * immediately: "when I refresh, the chat stays". They were right - history is
 * loaded from localStorage on every load, so a refresh clears nothing. "New
 * trip" was bad advice too: it opens a different trip and loses the plan. Advice
 * that does not work is worse than no advice, so a "clear" button was added to
 * the conversation header and the message points at it.
 */
const CONTEXT_TOO_LONG_MESSAGE =
  'השיחה הזאת נעשתה ארוכה מדי בשבילי 🙏\n\n' +
  'הטיול שלכם שמור ולא נפגע. לחצו על "ניקוי" בראש חלון השיחה - זה מוחק את ההתכתבות בלבד, והתוכנית, המפה והסיכות נשארות בדיוק כמו שהן.';

/** Identifies the error from Anthropic's response body, which is kept in the error message */
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
  // No "a bigger quota" - since premium quotas are derived from the real cost,
  // that promise is simply untrue. And no leading with "the guaranteed lane"
  // either - the framing Netanel set is audience, not mechanism: the subscription
  // is for people who plan all the time, and the one-off check is the product for
  // most travellers.
  'ואם אתם מתכננים כל הזמן - למדריכים, מארגנים ומשפחות עם כמה טיולים בשנה יש את טיול+ פרימיום. כל המחירים בעמוד tiyulplus.com/premium.';

/**
 * Reaching the monthly **count** quota (messages / units) - rare, because the
 * dollar ceiling (`PREMIUM_BUDGET_MESSAGE` in chatGuards.ts) should be hit first
 * by any real usage. A separate message from `QUOTA_MESSAGE` because that text
 * offers an upgrade to premium - pointless for someone already there.
 */
const PREMIUM_QUOTA_MESSAGE =
  'הגעתם למכסת השימוש החודשית בתוכנית הפרימיום 🙏\n\n' +
  'המכסה מתאפסת בתחילת החודש. אפשר להמשיך לערוך את הטיול ידנית במתכנן בינתיים - להוסיף ימים, להזיז עצירות ולפתוח ניווט.';

const IMAGE_QUOTA_MESSAGE =
  `הגעתם למכסת התמונות היומית (${PLAN_LIMITS.free.imagesPerDay} תמונות ביום בתוכנית החינמית) 📷\n\n` +
  // No "a much bigger quota" promise for premium - it is no longer true (see
  // QUOTA_MESSAGE). The text simply says what can be done instead.
  'קריאת תמונה יקרה הרבה יותר מקריאת טקסט, ולכן המכסה נמוכה. המכסה מתאפסת פעם ביום, ובינתיים אפשר פשוט לכתוב לי את הפרטים - שם המלון, התאריכים והעיר - ואטפל בזה בדיוק אותו דבר.';

/** The same situation, for a premium subscriber - no upgrade offer, and with the right unit (a month) */
const PREMIUM_IMAGE_QUOTA_MESSAGE =
  `הגעתם למכסת התמונות החודשית של תוכנית הפרימיום (${PLAN_LIMITS.premium.imagesPerDay} תמונות בחודש) 📷\n\n` +
  'קריאת תמונה יקרה הרבה יותר מקריאת טקסט, ולכן יש מכסה גם כאן. המכסה מתאפסת עם החיוב הבא, ובינתיים אפשר פשוט לכתוב לי את הפרטים - שם המלון, התאריכים והעיר - ואטפל בזה בדיוק אותו דבר.';

const EMPTY_REQUEST_MESSAGE =
  'לא קיבלתי טקסט ולא תמונה שאני יכול לקרוא 🙏 כתבו לי מה תרצו שאעשה, או צרפו תמונה קטנה יותר.';

const IMAGE_TOO_BIG_MESSAGE =
  'התמונה כבדה מדי בשבילי 😅 נסו צילום מסך או תמונה קטנה יותר, או פשוט כתבו לי את הפרטים.';

export async function POST(request: Request) {
  /*
    ---------- The gates, cheapest to dearest ----------

    Everything here runs **before** anything is sent to the API, and therefore
    costs nothing. The order follows the cost of the check: header, identity,
    in-memory quotas, body, and only at the end the global ceiling, which may
    require a database read.

    None of them is visible to a real traveller. That is not incidental - it is the requirement.
  */

  // A bot hitting the route directly, before anything else. A browser sends Origin on every POST.
  if (!sameOriginOk(request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Identify the caller (signed-in user or IP) - before reading the body, so a
  // huge body cannot bypass the quotas. Then the quota gates, cheapest to dearest.
  const caller = await resolveCaller(request);
  const limits = PLAN_LIMITS[caller.tier];

  const burst = checkLimit('chat-burst', caller.id, limits.chatBurstPerMin, 60_000);
  if (!burst.ok) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(burst.retryAfterSec) },
    });
  }
  const isPremium = caller.plan === 'premium' && Boolean(caller.userId);
  const daily = checkLimit('chat-day', caller.id, limits.chatPerDay, periodMsFor());
  if (!daily.ok) return singleMessageStream(isPremium ? PREMIUM_QUOTA_MESSAGE : QUOTA_MESSAGE);
  if (process.env.ANTHROPIC_API_KEY) {
    const used = await aiUnitsUsedToday(caller.id);
    if (used >= limits.aiUnitsPerDay) {
      return singleMessageStream(isPremium ? PREMIUM_QUOTA_MESSAGE : QUOTA_MESSAGE);
    }

    if (isPremium) {
      /*
        **A premium subscriber never enters budgetFor at all.** That is the
        requirement: anonymous/free traffic exhausting the shared daily budget
        must not be able to block a paying subscriber, so it simply is not checked
        against it - their ceiling is exclusively `premiumBudgetFor`, monthly and
        personal, from an entirely separate table. See the full explanation in
        budget.ts.
      */
      const premiumBudget = await premiumBudgetFor(caller.userId!);
      if (premiumBudget.exceeded) {
        console.warn(
          `[budget] premium blocked user=${caller.userId} $${premiumBudget.spent.toFixed(2)}/$${premiumBudget.budget.toFixed(2)}`,
        );
        return singleMessageStream(PREMIUM_BUDGET_MESSAGE);
      }
      maybeAlertPremium(premiumBudget, caller.userId!, monthKey());
    } else {
      /*
        **The spend ceiling, in two wallets.** The quotas above protect against one
        user; this protects against a thousand - and without letting any of them
        switch the product off for everyone else: anonymous traffic has a wallet of
        its own, and no single identity gets more than a small fraction of the day.
        See lib/server/budget.ts.
      */
      const budget = await budgetFor(caller.id);
      /*
        An IP backstop, **deliberately wide**.

        The real quota keys on the browser, because a shared IP at a mobile carrier
        is tens of thousands of people. The IP exists only to catch a single machine
        cycling browser identifiers in a loop, so its ceiling is
        `IP_BACKSTOP_MULTIPLE` times a single person's. **When the two disagree, the
        browser wins** - exactly as Netanel asked: blocking a real person costs us
        more than one unnecessary request.
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
  }

  // Read as text first: a huge body is stopped before JSON.parse
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
    These two gates must run on the **raw body**, before sanitizing.
    `sanitizeMessages` truncates each message to 8,000 characters and keeps only
    the last 40 messages - so after it, the enormous message is already small and
    the endless conversation already short, and there is nothing left to catch.
    This was caught in the harness: both checks passed green while they were
    measuring the output of the truncation instead of the input.
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
  // After sanitizing we can be left with nothing (an empty message, or an image
  // rejected on size/format). Sending an empty array to the API is a guaranteed
  // 400, so we stop here and say so in Hebrew rather than failing the turn.
  if (messages.length === 0) return singleMessageStream(EMPTY_REQUEST_MESSAGE);

  // The image quota: counted only for the image attached now (the last message),
  // so resending the history does not spend the quota.
  const freshImage = Boolean(messages[messages.length - 1]?.image);
  if (freshImage && process.env.ANTHROPIC_API_KEY) {
    const imgLimit = checkLimit('chat-images', caller.id, limits.imagesPerDay, periodMsFor());
    if (!imgLimit.ok) {
      return singleMessageStream(isPremium ? PREMIUM_IMAGE_QUOTA_MESSAGE : IMAGE_QUOTA_MESSAGE);
    }
  }

  const clientTrip = sanitizeClientTrip(body.trip);
  const kosherHint = body.kosher === true;

  /*
    The topic gate. Refuses **only** when there is a clear signal of another
    subject, no travel signal at all, and no active trip - see topicOk. The refusal
    costs nothing, and that is the whole point: do not burn a model call to decide
    not to answer.
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
  // Destinations explored in previous turns - the client sends them back, the server does not trust the shape
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

      // The kill switch: when the agent_enabled flag is off we fall back to the
      // rule-based replies exactly as in the keyless mode - the site works, model
      // spend stops immediately and with no deploy. See lib/server/flags.ts and /admin.
      if (process.env.ANTHROPIC_API_KEY && (await agentEnabled())) {
        const meter = { units: 0, usd: 0 };
        try {
          await runAgent(messages, clientTrip, send, kosherHint, explored, meter, caller);
        } catch (err) {
          // Must not be silenced: without this log there is no way to know what failed in production
          console.error('[chat] agent turn failed', err);

          // A second attempt, only if no text has streamed yet: most failures here
          // are overload or a transient API error, and the traveller has no way to know that.
          let recovered = false;
          if (!emitted && isTransient(err)) {
            try {
              await runAgent(messages, clientTrip, send, kosherHint, explored, meter, caller);
              recovered = true;
            } catch (retryErr) {
              console.error('[chat] agent retry failed', retryErr);
            }
          }

          // If that fails too: tell the truth. We deliberately do NOT fall back to
          // the rule engine here - its "destination not recognised" branch is an
          // opening greeting that lists every country, and mid-conversation that
          // reads as if the agent had forgotten all context (which is exactly what
          // happened to the traveller who asked to edit the trip around their hotel).
          if (!recovered) {
            // Three different situations: exceeding the context window is a
            // permanent error for this conversation and needs entirely different
            // instructions; a turn cut off mid-reply gets a short tail (otherwise
            // the long message reads as if the whole answer above it had been
            // cancelled); and everything else gets the full explanation.
            const text = isContextTooLong(err)
              ? CONTEXT_TOO_LONG_MESSAGE
              : emitted
                ? AGENT_TRUNCATED_MESSAGE
                : AGENT_ERROR_MESSAGE;
            send({ type: 'text', text });
          }
        } finally {
          // Recorded even when the turn failed partway - the tokens were already spent
          recordAiUnits(caller.id, meter.units);
        }
      } else {
        // The keyless mode: here the rule engine's opening greeting is in its right place
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
