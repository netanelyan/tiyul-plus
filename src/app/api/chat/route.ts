import { NextResponse } from 'next/server';
import { destinations } from '@/data/destinations';
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
  return destinations.find(
    (d) => text.includes(d.name) || text.toLowerCase().includes(d.slug),
  );
}

function ruleBasedReply(text: string): ChatReply {
  const dest = findDestination(text);
  const wantsKosher = /כשר|כשרות|בשר|חלבי/.test(text);
  const wantsShopping = /שופינג|קניות|קניון|חנויות/.test(text);
  const wantsPractical = /טיסה|טיסות|ויזה|סים|esim|תשלום|מטבע|כסף/i.test(text);
  const wantsItinerary = /מסלול|ימים|יום|תכנון|תוכנית|לתכנן/.test(text);

  if (!dest) {
    return {
      reply:
        'היי! אני עוזר הטיולים של טיול+ 🧭\n\nכרגע יש לי מסלולים מלאים לוינה, ברטיסלבה ופראג. אפשר לשאול אותי למשל:\n• "תבנה לי מסלול ל-4 ימים בוינה"\n• "איפה אוכלים כשר בפראג?"\n• "מה צריך לדעת לפני טיסה לברטיסלבה?"',
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
    return {
      reply: `🇮🇱 מידע פרקטי ל${dest.name}:\n\n✈️ **טיסות:** ${p.flights}\n🛂 **ויזה:** ${p.visa}\n💶 **מטבע:** ${p.currency}\n📱 **סים:** ${p.sim}\n💳 **תשלומים:** ${p.payments}\n🚇 **תחבורה:** ${p.gettingAround}`,
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

async function claudeReply(messages: ChatMessage[]): Promise<ChatReply> {
  const grounding = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    summary: d.summary,
    practical: d.practical,
    itinerary: d.itinerary,
    places: d.places.map((p) => ({
      id: p.id,
      name: p.name,
      nameLocal: p.nameLocal,
      category: p.category,
      description: p.description,
      kosherNote: p.kosherNote,
    })),
  }));

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
      system:
        'אתה עוזר טיולים ישראלי של האתר "טיול+". ענה תמיד בעברית טבעית וידידותית. ' +
        'התבסס אך ורק על נתוני היעדים הבאים (JSON). אם שואלים על יעד שלא קיים בנתונים, אמור זאת בכנות והצע את היעדים הקיימים. ' +
        'הדגש מידע רלוונטי לישראלים: כשרות, טיסות מנתב"ג, ויזות. ' +
        'נתונים: ' +
        JSON.stringify(grounding),
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
