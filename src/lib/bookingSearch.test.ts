/**
 * Tests for the prepared provider search.
 *
 * Two questions are tested here, both about the promise and not the design:
 *
 * 1. **What goes into the URL** - only what is derived from the trip, and no
 *    invented parameter. In particular: no price filter, because we have no
 *    documented format for one, and a wrong parameter would show the
 *    traveler "filtered by your budget" without that having happened.
 * 2. **What the tool refuses to do** - restaurants, an unknown city, and any
 *    attempt to pass a number (no such field exists in the schema, and this
 *    is tested here explicitly).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { AGENT_TOOLS, executeAgentTool } from './trip/agent.ts';
import { bookingProviders, buildBookingUrl } from './booking.ts';
import { SEARCH_DISCLOSURE, adultsFromParty, buildSearchCard, cityStayRange } from './bookingSearch.ts';
import type { Trip } from './trip/types';

const dest = (slug: string) => destinations.find((d) => d.slug === slug)!;

/** A real two-city trip: 3 days in Rome then 2 in Vienna, from August 10 */
function twoCityTrip(over: Partial<Trip> = {}): Trip {
  return {
    id: 't1',
    name: 'איטליה ואוסטריה',
    citySlugs: ['rome', 'vienna'],
    days: [
      { id: 'd1', citySlug: 'rome', placeIds: [] },
      { id: 'd2', citySlug: 'rome', placeIds: [] },
      { id: 'd3', citySlug: 'rome', placeIds: [] },
      { id: 'd4', citySlug: 'vienna', placeIds: [] },
      { id: 'd5', citySlug: 'vienna', placeIds: [] },
    ],
    createdAt: 0,
    startDate: '2026-08-10',
    endDate: '2026-08-14',
    preferences: { party: 'couple' },
    ...over,
  };
}

const card = (trip: Trip | null, kind: 'stay' | 'activities', slug: string, extra = {}) =>
  buildSearchCard(trip, kind, slug, (dest(slug).nameLocal || dest(slug).name).split('/')[0].trim(), dest(slug).name, extra)!;

/* ---------- Dates: per city, not per trip ---------- */

test('טווח השהייה נגזר מהימים של אותה עיר, לא מהטיול כולו', () => {
  const trip = twoCityTrip();
  // Rome is days 1-3 => check-in 10/8, check-out 13/8 (three nights)
  assert.deepEqual(cityStayRange(trip, 'rome'), { checkIn: '2026-08-10', checkOut: '2026-08-13' });
  // Vienna is days 4-5 => 13/8 to 15/8
  assert.deepEqual(cityStayRange(trip, 'vienna'), { checkIn: '2026-08-13', checkOut: '2026-08-15' });
});

test('צ׳ק-אאוט הוא היום שאחרי היום האחרון בעיר', () => {
  const one = twoCityTrip({
    days: [{ id: 'd1', citySlug: 'rome', placeIds: [] }],
    citySlugs: ['rome'],
  });
  // One day in the city = one night
  assert.deepEqual(cityStayRange(one, 'rome'), { checkIn: '2026-08-10', checkOut: '2026-08-11' });
});

test('טיול בלי תאריכים לא ממציא אותם', () => {
  const trip = twoCityTrip({ startDate: undefined, endDate: undefined });
  assert.equal(cityStayRange(trip, 'rome'), null);
  const c = card(trip, 'stay', 'rome');
  assert.ok(c.onProvider.includes('תאריכים'));
  assert.ok(!c.url.includes('checkin'));
});

test('עיר שאינה בטיול - אין ממה לגזור תאריך, והכרטיס עדיין עובד', () => {
  const c = card(twoCityTrip(), 'stay', 'prague');
  assert.ok(c.onProvider.includes('תאריכים'));
  assert.equal(c.cityLabel, 'פראג');
});

test('בלי טיול בכלל - "תמצא לי מלון ברומא" עדיין מקבל חיפוש', () => {
  const c = card(null, 'stay', 'rome');
  assert.ok(c.url.includes('Rome'));
  assert.ok(c.onProvider.includes('תאריכים'));
});

/* ---------- Guests: only when it is unambiguous ---------- */

test('מספר אורחים נשלח רק כשהוא נגזר בוודאות', () => {
  assert.equal(adultsFromParty('solo'), 1);
  assert.equal(adultsFromParty('couple'), 2);
  // "friends" and "family" do not state a number - better not to send than to invent
  assert.equal(adultsFromParty('friends'), null);
  assert.equal(adultsFromParty('family'), null);
  assert.equal(adultsFromParty(undefined), null);
});

test('משפחה: אין group_adults בכתובת, והכרטיס אומר שזה נקבע אצל הספק', () => {
  const c = card(twoCityTrip({ preferences: { party: 'family' } }), 'stay', 'rome');
  assert.ok(!c.url.includes('group_adults'));
  assert.ok(c.onProvider.includes('מספר אורחים'));
});

/* ---------- The URL: no invented parameter ---------- */

test('כתובת הלינה נושאת אך ורק פרמטרים מוכרים', () => {
  const c = card(twoCityTrip(), 'stay', 'rome');
  const params = [...new URL(c.url).searchParams.keys()].sort();
  assert.deepEqual(params, ['checkin', 'checkout', 'group_adults', 'ss']);
  const u = new URL(c.url);
  assert.equal(u.searchParams.get('ss'), 'Rome'); // the slash in nameLocal is trimmed
  assert.equal(u.searchParams.get('checkin'), '2026-08-10');
  assert.equal(u.searchParams.get('group_adults'), '2');
});

test('תקציב מוצג כטקסט ולא מסונן בכתובת - אין לנו פורמט מתועד', () => {
  const c = card(twoCityTrip({ preferences: { party: 'couple', budget: 'low' } }), 'stay', 'rome');
  assert.ok(c.understood.includes('תקציב חסכוני'));
  assert.ok(c.onProvider.includes('סינון לפי מחיר'));
  // The important thing: no guessed price parameter is sent
  assert.ok(!/price|nflt|budget/i.test(c.url));
});

test('כשרות ונגישות נאמרות כאילוץ שהובן, ומסומנות כמשהו שמסננים אצל הספק', () => {
  const c = card(twoCityTrip(), 'stay', 'rome', { kosher: true, accessible: true });
  assert.ok(c.understood.includes('מטבח כשר'));
  assert.ok(c.understood.includes('נגישות'));
  assert.ok(c.onProvider.includes('סינון כשרות'));
  assert.ok(c.onProvider.includes('סינון נגישות'));
});

test('חוויות: רק שאילתת חיפוש, בלי תאריכים שלא אומתו אצל הספק', () => {
  const c = card(twoCityTrip(), 'activities', 'rome');
  assert.deepEqual([...new URL(c.url).searchParams.keys()], ['q']);
  assert.equal(new URL(c.url).searchParams.get('q'), 'Rome');
});

test('הכרטיס אינו מכיל שום מספר מחיר או שם נכס', () => {
  const c = card(twoCityTrip({ preferences: { party: 'couple', budget: 'high' } }), 'stay', 'rome');
  const text = [c.title, c.cta, c.provider, ...c.understood, ...c.onProvider].join(' ');
  assert.ok(!/₪|€|\$/.test(text));
  assert.ok(!/Hotel|Hostel|Resort/i.test(text));
});

test('הגילוי הנאות אומר במפורש עמלה, ושהיא לא משפיעה על ההמלצות', () => {
  assert.ok(SEARCH_DISCLOSURE.includes('עמלה'));
  assert.ok(SEARCH_DISCLOSURE.includes('לא משפיע'));
});

/* ---------- The tool: what it refuses to do ---------- */

const tool = AGENT_TOOLS.find((t) => t.name === 'booking_search')!;

test('בסכימת הכלי אין שום שדה שאפשר להקליד בו מספר, שם או טקסט חופשי', () => {
  const props = tool.input_schema.properties as unknown as Record<
    string,
    { type: string; enum?: string[] }
  >;
  assert.deepEqual(Object.keys(props).sort(), ['accessible', 'citySlug', 'kind', 'kosher']);
  // citySlug is an identifier validated against the data; the rest are enums and booleans
  assert.deepEqual(props.kind.enum, ['stay', 'activities']);
  assert.equal(props.kosher.type, 'boolean');
  assert.equal(props.accessible.type, 'boolean');
  // There is no numeric field, and no price/date/guests field under any name
  const numeric = Object.values(props).filter((p) => p.type === 'number' || p.type === 'integer');
  assert.deepEqual(numeric, []);
  assert.ok(!/price|budget|date|guests|nights|name/i.test(Object.keys(props).join(',')));
});

test('מסעדות אינן בתחום - הכלי מסרב ומסביר למה', () => {
  const out = executeAgentTool(twoCityTrip(), 'booking_search', { kind: 'food', citySlug: 'rome' });
  assert.equal(out.ok, false);
  assert.ok(out.message.includes('מסעדות'));
  assert.equal(out.search, undefined);
});

test('עיר לא מוכרת נדחית ולא מומצאת', () => {
  const out = executeAgentTool(twoCityTrip(), 'booking_search', { kind: 'stay', citySlug: 'atlantis' });
  assert.equal(out.ok, false);
  assert.equal(out.search, undefined);
});

test('הצלחה מחזירה כרטיס, ותוצאת הכלי אוסרת על המודל לנקוב במספר', () => {
  const out = executeAgentTool(twoCityTrip(), 'booking_search', { kind: 'stay', citySlug: 'vienna' });
  assert.equal(out.ok, true);
  assert.ok(out.search);
  assert.equal(out.search!.cityLabel, 'וינה');
  // The tool result is the last thing the model reads before it writes - the rule sits there
  for (const banned of ['מחיר', 'זמינות', 'שם מלון', 'הזול ביותר']) {
    assert.ok(out.message.includes(banned), `תוצאת הכלי חייבת לאסור "${banned}"`);
  }
  assert.ok(out.message.includes('גילוי נאות'));
});

test('מספר שהמודל בכל זאת מצרף לקלט לא נכנס לשום מקום', () => {
  const out = executeAgentTool(twoCityTrip(), 'booking_search', {
    kind: 'stay',
    citySlug: 'rome',
    // The model "invents" fields that are not in the schema
    maxPrice: 300,
    hotelName: 'Hotel Artemide',
    checkin: '2030-01-01',
  });
  assert.equal(out.ok, true);
  assert.ok(!out.search!.url.includes('300'));
  assert.ok(!out.search!.url.includes('Artemide'));
  assert.ok(!out.search!.url.includes('2030'));
  assert.equal(out.search!.url.includes('2026-08-10'), true); // the date from the trip
});

/* ---------- Trust: a commission cannot influence ranking ---------- */

/**
 * This test is the reason there is no ranking function here at all.
 *
 * The provider order is a fixed literal in the config, decided by what a
 * traveler needs (flights and lodging first), and there is not even one
 * field that a commercial preference could hang on. The test will fail if
 * somebody adds `priority` / `payout` / `commission` to a provider - and
 * that is exactly the goal: catching the moment the commission **starts**
 * to have influence, not afterward.
 */
test('אין בקונפיג של הספקים שום שדה שאפשר לדרג לפיו', () => {
  /*
    `perCity` was added to the list deliberately, and it is not a commercial
    signal: it says **whom the booking belongs to** - the city or the trip -
    and not how much it is worth to us. It enters no sort and no selection;
    the order is still the literal in the next test. A separate test in
    bookingStatus.test.ts pins it to whichever provider's search takes a
    destination, so that its meaning cannot drift silently either.
  */
  const allowed = ['kind', 'perCity', 'emoji', 'title', 'blurb', 'cta', 'question', 'provider', 'affiliate', 'publicUrl'];
  for (const p of bookingProviders) {
    assert.deepEqual(
      Object.keys(p).filter((k) => !allowed.includes(k)),
      [],
      `שדה חדש בקונפיג הספק ${p.kind} - אם הוא מסחרי, הוא לא יכול להשפיע על סדר או על בחירה`,
    );
  }
});

test('סדר הספקים הוא ליטרל קבוע ולא נגזר מקישורי שותפים', () => {
  assert.deepEqual(
    bookingProviders.map((p) => p.kind),
    ['flights', 'stay', 'activities', 'esim', 'insurance', 'car'],
  );
});

test('בלי מזהה שותפים אמיתי לא נוצר פרמטר מעקב מומצא', () => {
  const url = buildBookingUrl('stay', 'Rome', { checkin: '2026-08-10' })!;
  assert.ok(!/aid=|label=|partner|affiliate/i.test(url));
  assert.ok(url.startsWith('https://www.booking.com/'));
});

test('פרמטרים לא מצורפים לחיפוש בלי יעד - חיפוש ריק עם תאריכים הוא רעש', () => {
  const url = buildBookingUrl('stay', '', { checkin: '2026-08-10' })!;
  assert.equal(url, 'https://www.booking.com');
});
