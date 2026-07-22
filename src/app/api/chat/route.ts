import { NextResponse } from 'next/server';
import { destinations } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';
import { isKosher } from '@/lib/categories';

/**
 * צ׳אט הטיולים.
 *
 * שני מצבים:
 * 1. בלי מפתח API - עונה חכם מבוסס-חוקים מעל הדאטה האוצר (עובד מיד).
 * 2. עם ANTHROPIC_API_KEY ב-.env.local - עונה עם Claude, מוזן בדאטה
 *    של היעדים כ-grounding כדי שהתשובות יהיו מעוגנות במקומות אמיתיים.
 *
 * בשני המצבים התשובה כוללת placeIds כדי שהלקוח יציג מפה מתחת להודעה.
 */

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

HOW YOU WORK
- Understand before planning: if the request lacks key details, ask at most 1-2 short questions (dates/season, who's traveling, pace, interests). Never interrogate with a checklist.
- Preferences are options, never assumptions: kosher food, Shabbat-friendly pacing, budget level, kids, shopping - apply each only when the user asks or confirms. When kosher matters, use the kosher places in the data and ALWAYS add a short reminder to verify kashrut and hours with the venue before visiting.
- Itineraries: build day-by-day using the data's places, with a logical geographic flow. Format: a bold day title line (**יום 1 - ...**), then the stops separated by " ← ", then one practical tip line. Use ** for bold and plain newlines only - no markdown headers, tables or links.
- Israeli practicalities: when relevant, weave in the data's info on direct flights from TLV, visas, eSIM and payments.
- Point to the product when it helps: after building an itinerary, mention that in מתכנן המסלולים they can edit the trip, see it on the map, and open each day as navigation in Google Maps. Mention the wizard (האשף החכם) when someone wants a quick auto-plan.

BOUNDARIES
- You don't book, take payments, or hold personal data. For prices and reservations, point to the venue or official sites.
- Stay on travel topics; politely steer back if the conversation drifts far off.
- If you're not sure about something, say so plainly - trust is the product.

DATA (destinations, places, itineraries, practical info):
`;

async function claudeReply(messages: ChatMessage[]): Promise<ChatReply> {
  const grounding = {
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
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + JSON.stringify(grounding),
      messages,
    }),
  });

  if (!res.ok) {
    // נפילה חיננית למנוע החוקים
    return ruleBasedReply(messages[messages.length - 1]?.content ?? '');
  }

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '';
  const dest = findDestination(text);
  return { reply: text, destinationSlug: dest?.slug };
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  const last = messages[messages.length - 1]?.content ?? '';

  const result = process.env.ANTHROPIC_API_KEY
    ? await claudeReply(messages)
    : ruleBasedReply(last);

  return NextResponse.json(result);
}
