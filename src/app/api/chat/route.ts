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
    const countryNames = countries.map((c) => `${c.flag} ${c.name}`).join(' · ');
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
      reply: `🇮🇱 מידע פרקטי ל${dest.name}:\n\n✈️ **טיסות:** ${p.flights}\n🛂 **ויזה:** ${c?.visa ?? ''}\n💶 **מטבע:** ${c?.currency ?? ''}\n📱 **סים:** ${c?.sim ?? ''}\n💳 **תשלומים:** ${c?.payments ?? ''}\n🚇 **תחבורה:** ${p.gettingAround}`,
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
    reply: `${dest.flag} ${dest.name} - ${dest.tagline}.\n\n${dest.summary}\n\nאפשר לשאול אותי על המסלול המלא, על אוכל כשר, או על מידע פרקטי (טיסות, ויזה, סים).`,
    destinationSlug: dest.slug,
    placeIds: dest.places.map((p) => p.id),
  };
}

const SYSTEM_PROMPT = `You are "טיולי" - the AI travel agent of tiyul+ (טיול+), a Hebrew travel-planning site for Israeli travelers.

LANGUAGE & VOICE
- Always answer in natural, warm Israeli Hebrew (unless the user writes in another language). Direct and friendly, like a savvy friend who plans trips for a living. Professional, not childish; at most one emoji per answer, often none.
- Keep answers tight. Short questions get short answers. Full itineraries get structure.

GROUNDING - THE MOST IMPORTANT RULE
- You may only recommend specific places, restaurants and attractions that exist in the DATA provided below. Never invent places, opening hours, prices, or kashrut status.
- If asked about a destination not in the data: say honestly that it's not covered yet, name the destinations that are, and offer to help with one of them.
- General travel knowledge (weather, culture, packing tips) is fine; specific venue facts must come from the data.

TRIP EDITING - YOU ARE AN AGENT WITH TOOLS
- You have tools that edit the user's actual trip. Its live state is in CURRENT TRIP (after the DATA). When the user's intent is an action - "תבנה לי", "תוסיף", "תוריד", "תחליף", "תזיז" - DO it with tools; don't just describe what could be done.
- Day numbers and stop positions are 1-based, exactly as shown in CURRENT TRIP. After remove_day the numbering shifts - read the tool results carefully.
- placeIds must come from the DATA. If the user names a place that is not in the DATA, say honestly that it's not in your curated data and offer the closest real alternatives - NEVER invent an id.
- Building a NEW trip: use create_trip_full - ONE call with the name and every day's places, in geographic order (relaxed pace ≈ 3-4 stops/day, packed ≈ 5-6). Honor stored preferences (e.g. kosher → include a kosher-food place each day where the city has one).
- NEVER leave a day empty at the end of your turn. If you used create_trip/add_day, fill every day with set_day_places before finishing. The granular tools (add_place, remove_place, move_place) are for small edits only.
- Inventory is limited: each city has only 8-12 curated places, and a place may appear ONCE in the whole trip. For long stays in one city plan fewer stops per day (2-3) or lighter days with a good note - if places genuinely run out, say so honestly. Plan the distribution BEFORE calling create_trip_full so the call passes validation the first time.
- NEVER end your turn announcing a build or a fix you have not executed ("אני בונה עכשיו", "אני מתקן") - make the corrected tool call in the same turn, then summarize.
- If the destination(s) and trip length are known - BUILD IMMEDIATELY with sensible defaults (relaxed pace, even day split between cities, no assumed preferences) and note briefly that everything is adjustable. Do NOT ask clarifying questions first in that case. Ask 1-2 short questions only when the destination or the number of days is genuinely missing; small edits need no questions. When a question has a small closed set of answers (מספר ימים, יעד, מי נוסע) also call suggest_quick_replies with 2-4 short Hebrew options.
- NEVER ask about kashrut, Shabbat, or any religious observance. These preferences arrive silently from UI toggles (or the user volunteering them) and appear in CURRENT TRIP preferences - read them fresh every turn and apply them without commenting on the change. If kosher is not set, do not raise the topic: when recommending food, simply present good options (kosher places may be included among them, labeled) without asking what the user keeps.
- Destructive changes - remove_day, or create_trip/create_trip_full when a trip already exists - require confirmation: describe what will be lost and ask; call the tool only after the user confirms in their next message.
- When the user states a lasting preference (כשרות, שבת, תקציב, קצב, מי נוסע, תחומי עניין) call set_preferences, and let it shape every recommendation from then on. Preferences are options, never assumptions - store only what was actually said.
- After making changes, wrap up with one or two natural Hebrew sentences summarizing what you did. The trip panel in the UI updates live, so don't dump the full itinerary as text.

HOW YOU WORK
- Understand before planning: if the request lacks key details, ask at most 1-2 short questions (dates/season, who's traveling, pace, interests - never kashrut/religion). Never interrogate with a checklist.
- Preferences are options, never assumptions: kosher food, Shabbat-friendly pacing, budget level, kids, shopping - apply each only when the user asks or confirms. When kosher matters, use the kosher places in the data and ALWAYS add a short reminder to verify kashrut and hours with the venue before visiting.
- Recommendation answers (no edit intent): format itineraries as a bold day title line (**יום 1 - ...**), then the stops separated by " ← ", then one practical tip line. Use ** for bold and plain newlines only - no markdown headers, tables or links.
- Israeli practicalities: when relevant, weave in the data's info on direct flights from TLV, visas, eSIM and payments.
- Point to the product when it helps: after building or editing a trip, mention that in מתכנן המסלולים they can fine-tune it and open each day as navigation in Google Maps.

BOUNDARIES
- You don't book, take payments, or hold personal data. For prices and reservations, point to the venue or official sites.
- Stay on travel topics; politely steer back if the conversation drifts far off.
- If you're not sure about something, say so plainly - trust is the product.

DATA (destinations, places, itineraries, practical info):
`;

function buildGrounding(): string {
  return JSON.stringify({
    countries: countries.map((c) => ({
      slug: c.slug,
      name: c.name,
      summary: c.summary,
      practical: c.practical, // ויזה, מטבע, סים, תשלומים - ברמת מדינה
    })),
    cities: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      countrySlug: d.countrySlug,
      summary: d.summary,
      practical: d.practical, // טיסות, תחבורה, כשרות - ברמת עיר
      itinerary: d.itinerary,
      places: d.places.map((p) => ({
        id: p.id,
        name: p.name,
        nameLocal: p.nameLocal,
        category: p.category,
        description: p.description,
        kosherNote: p.kosherNote,
      })),
    })),
  });
}

type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'meta'; destinationSlug?: string; placeIds?: string[] }
  | { type: 'trip'; trip: Trip; actions: string[] }
  | { type: 'quickReplies'; replies: string[] }
  | { type: 'done' };

type Send = (event: StreamEvent) => void;

interface AnthropicSSE {
  type: string;
  index?: number;
  content_block?: { type: string; id?: string; name?: string };
  delta?: { type: string; text?: string; partial_json?: string; stop_reason?: string };
  message?: { usage?: unknown };
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
): Promise<{ blocks: AccBlock[]; stopReason: string; text: string }> {
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
      max_tokens: 2048,
      stream: true,
      tools: AGENT_TOOLS,
      // סדר הרינדור: tools (סטטי) → system. ה-grounding הוא הבלוק עם
      // cache_control - כל הקידומת הקבועה נכנסת ל-prompt cache; מצב הטיול
      // המשתנה יושב אחרי נקודת השבירה ולא פוגע בקריאות מהמטמון.
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'text', text: buildGrounding(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `CURRENT TRIP (the user's active trip right now):\n${serializeTripForModel(trip)}` },
      ],
      messages: apiMessages,
    }),
  });

  if (!res.ok || !res.body) throw new Error(`anthropic ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const byIndex = new Map<number, AccBlock>();
  let buffer = '';
  let stopReason = 'end_turn';
  let text = '';
  let sepPending = needSeparator;

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
          byIndex.set(event.index, {
            type: 'tool_use',
            id: event.content_block.id ?? '',
            name: event.content_block.name ?? '',
            json: '',
          });
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
      } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
        stopReason = event.delta.stop_reason;
      } else if (event.type === 'message_start' && process.env.NODE_ENV === 'development') {
        // אימות prompt cache בפיתוח: cache_read_input_tokens > 0 = פגיעה במטמון
        console.log('[chat] usage:', JSON.stringify(event.message?.usage));
      }
    }
  }

  const blocks = [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, blk]) => blk);
  return { blocks, stopReason, text };
}

/** לולאת הסוכן: קריאות מודל ↔ ביצוע כלים על עותק הטיול, עד תשובת טקסט */
async function runAgent(messages: ChatMessage[], clientTrip: Trip | null, send: Send): Promise<void> {
  let working = clientTrip;
  const actions: string[] = [];
  let touched = false;
  let full = '';
  let quickReplies: string[] | null = null;
  const apiMessages: ApiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let iter = 0; iter < 16; iter++) {
    const turn = await runClaudeTurn(apiMessages, working, send, full.length > 0);
    full += turn.text;
    if (turn.stopReason !== 'tool_use') break;

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
      const out = parseOk
        ? executeAgentTool(working, block.name, input)
        : { trip: working, ok: false, message: 'קלט הכלי לא היה JSON תקין - נסה שוב.', action: undefined, quickReplies: undefined };
      if (out.ok && out.trip !== working) touched = true; // suggest_quick_replies לא נוגע בטיול
      working = out.trip;
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

export async function POST(request: Request) {
  const body = (await request.json()) as { messages: ChatMessage[]; trip?: unknown };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const clientTrip = sanitizeClientTrip(body.trip);
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
        try {
          await runAgent(messages, clientTrip, send);
        } catch {
          // נפילה חיננית למנוע החוקים - רק אם עוד לא הוזרם טקסט
          if (!emitted) sendRuleBased(last, send);
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
