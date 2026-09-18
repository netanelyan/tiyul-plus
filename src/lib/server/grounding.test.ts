/**
 * Tests for the kashrut gate in the grounding.
 *
 * The regression itself, from Netanel's report on the live site: "when I
 * ask about a restaurant in Rome, it starts talking about kosher places,
 * even though I did not switch the button on". The two names that appeared
 * in the reply - Ba'Ghetto and Yotvata - are exactly the two `kosher-food`
 * entries Rome has in the catalog, i.e. the model did not invent them: it
 * read them from the grounding.
 *
 * The tests run against the real catalog and not against a fixture,
 * because what is being asserted here is literally what gets sent to the
 * model.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGroundingDetail,
  buildGroundingIndex,
  kosherAllowed,
  kosherAllowedNames,
  kosherIntentText,
  relevantCitySlugs,
} from './grounding.ts';
import { destinations } from '../../data/destinations.ts';
import { isEating, isKosher, kosherStatusOf } from '../categories.ts';
import { destinationCharacters } from '../interests.ts';
import type { Trip } from '../trip/types.ts';

const rome = destinations.find((d) => d.slug === 'rome')!;
const romeKosher = rome.places.filter((p) => isKosher(p.category));
const msg = (content: string) => ({ role: 'user' as const, content });

test('לרומא באמת יש רשומות כשרות בקטלוג - אחרת הטסטים למטה חסרי משמעות', () => {
  assert.ok(romeKosher.length >= 2, `expected kosher places in rome, got ${romeKosher.length}`);
});

test('הרגרסיה: שאלה על מסעדה ברומא בלי העדפת כשרות - הרשומות הכשרות לא נשלחות בכלל', () => {
  const messages = [msg('איזה מקום לאכול יש ברומא')];
  const ok = kosherAllowed(null, messages);
  assert.equal(ok, false);

  const detail = buildGroundingDetail(relevantCitySlugs(messages, null), ok);
  for (const p of romeKosher) {
    assert.ok(!detail.includes(p.id), `${p.id} still in detail`);
    assert.ok(!detail.includes(p.name), `${p.name} still in detail`);
  }
  // The index too, which is the big, cached block
  const index = buildGroundingIndex(ok);
  for (const p of romeKosher) assert.ok(!index.includes(p.id), `${p.id} still in index`);
  // And Rome is still there: filtering, not silencing
  assert.ok(detail.includes('rom-colosseum'));
});

test('כשהכשרות כבויה, גם סקירת הכשרות של העיר ומזהים במסלול האוצר יורדים', () => {
  const detail = buildGroundingDetail(['rome'], false);
  assert.ok(!detail.includes(rome.practical.kosherOverview.slice(0, 40)));
  const withKosher = buildGroundingDetail(['rome'], true);
  assert.ok(withKosher.includes(rome.practical.kosherOverview.slice(0, 40)));
  // The itinerary is the back door: a kosher id inside a curated itinerary's day
  const inItinerary = rome.itinerary.some((d) =>
    d.placeIds.some((id) => romeKosher.some((p) => p.id === id)),
  );
  if (inItinerary) {
    for (const p of romeKosher) assert.ok(!detail.includes(`"${p.id}"`));
  }
});

test('העדפת כשרות דלוקה - הכול חוזר בדיוק כפי שהיה', () => {
  const trip = { preferences: { kosher: true } } as unknown as Trip;
  assert.equal(kosherAllowed(trip, [msg('איזה מקום לאכול יש ברומא')]), true);
  const detail = buildGroundingDetail(['rome'], true);
  for (const p of romeKosher) assert.ok(detail.includes(p.id));
});

test('המשתמש שואל במפורש - השער נפתח באותו תור, בלי טוגל', () => {
  for (const q of [
    'יש מסעדה כשרה ברומא?',
    'איפה יש אוכל כשר',
    'יש בית חב"ד בעיר?',
    'is there kosher food in rome',
    'מקום עם השגחת בד"ץ',
  ]) {
    assert.equal(kosherAllowed(null, [msg(q)]), true, q);
  }
});

test('טוגל ה-UI ו-shabbatAware פותחים גם הם', () => {
  assert.equal(kosherAllowed(null, [msg('משהו')], true), true);
  const trip = { preferences: { shabbatAware: true } } as unknown as Trip;
  assert.equal(kosherAllowed(trip, [msg('משהו')]), true);
});

test('תשובה של הסוכן לא פותחת את השער - אחרת הוא מאשר לעצמו', () => {
  const messages = [
    msg('איזה מקום לאכול יש ברומא'),
    { role: 'assistant' as const, content: 'יש מסעדות כשרות בגטו היהודי' },
    msg('ומה עם מוזיאונים?'),
  ];
  assert.equal(kosherAllowed(null, messages), false);
});

test('כשהשער סגור נמסרת מדיניות מפורשת - כדי שהמודל לא ימציא "אין כאן כשרות"', () => {
  const off = buildGroundingDetail(['rome'], false);
  assert.match(off, /kosherPolicy/);
  assert.match(off, /Do NOT say the city has no kosher food/);
});

test('הצד השני: כשהכשרות דלוקה, כל מקום אכילה נושא את הסטטוס שלו', () => {
  // Since the food/market categories, the catalog holds non-kosher eating
  // places. The tool layer blocks them; the prose needs the fact so it can
  // warn instead of recommend.
  const city = destinations.find((d) =>
    d.places.some((p) => isEating(p.category) && kosherStatusOf(p) !== 'kosher'),
  );
  if (!city) return;
  const on = JSON.parse(buildGroundingDetail([city.slug], true));
  const eating = on.cities[0].places.filter((p: { kosherStatus?: string }) => p.kosherStatus);
  assert.ok(eating.length > 0, 'no kosherStatus reached the model');
  assert.ok(eating.some((p: { kosherStatus: string }) => p.kosherStatus !== 'kosher'));
  assert.match(on.kosherPolicy, /Recommend ONLY kosherStatus="kosher"/);
  assert.match(on.kosherPolicy, /"unknown" is not "probably fine"/);
  // And when the gate is closed it has no business being there
  const off = JSON.parse(buildGroundingDetail([city.slug], false));
  assert.ok(!off.cities[0].places.some((p: { kosherStatus?: string }) => p.kosherStatus));
});

test('אזהרת "המקום הזה אינו כשר" על מקום לא-כשר נשארת בכל מצב', () => {
  // katz's delicatessen is explicitly marked not-kosher, and that is a warning - not a recommendation.
  const ny = destinations.find((d) => d.slug === 'new-york');
  const warned = ny?.places.find((p) => !isKosher(p.category) && p.kosherNote);
  if (!warned) return;
  const detail = buildGroundingDetail(['new-york'], false);
  assert.ok(detail.includes(warned.kosherNote!.slice(0, 30)));
});

test('שני וריאנטים בלבד לאינדקס, ושניהם יציבים - כדי ש-cache_control ימשיך לפגוע', () => {
  assert.equal(buildGroundingIndex(false), buildGroundingIndex(false));
  assert.equal(buildGroundingIndex(true), buildGroundingIndex(true));
  assert.notEqual(buildGroundingIndex(true), buildGroundingIndex(false));
  assert.ok(buildGroundingIndex(false).length < buildGroundingIndex(true).length);
});

/* ---------- kosherAllowedNames: priceGuard.ts's whitelist ---------- */

test('kosherAllowedNames ריקה לגמרי כשהשער סגור - גם על עיר עם כשרות אמיתית', () => {
  assert.deepEqual(kosherAllowedNames(['rome'], false), []);
});

test('kosherAllowedNames ריקה לעיר שלא נשלחה בכלל (לא בקטלוג, או לא ברשימה) - הבאג המדויק', () => {
  // The gate itself (kosherOk) can be open because the user asked, but if
  // the city they asked about is not in the list of cities sent this turn -
  // it has no name there to back a claim with, even if the general gate is
  // open.
  assert.deepEqual(kosherAllowedNames(['not-a-real-city-slug'], true), []);
  assert.deepEqual(kosherAllowedNames([], true), []);
});

test('kosherAllowedNames מחזירה שמות מקום ועיר אמיתיים כשהשער פתוח והעיר נשלחה', () => {
  const names = kosherAllowedNames(['rome'], true);
  assert.ok(names.includes(rome.name));
  assert.ok(romeKosher.some((p) => names.includes(p.name)));
});

test('kosherIntentText היא הגרסה החד-הודעתית - לא סורקת חלון שיחה', () => {
  assert.equal(kosherIntentText('יש מסעדה כשרה ברומא?'), true);
  assert.equal(kosherIntentText('מה שעות הפתיחה של הקולוסיאום?'), false);
});

test('the index says which of our destinations answer which kind of request', () => {
  /*
    Without this the index carried every city's name and place list and nothing
    about the character of any of them, so "I want a nature trip in Europe"
    could only be answered from what the model happens to recognise - and a live
    answer named four destinations, all four famous, out of the 84 that are
    nature-led. See `destinationsByCharacter`.
  */
  /*
    Read through the DEFAULT format, which is `tuple` - so a city row is
    [slug, name, countrySlug, places] and the slug is position 0. Reading it as
    `c.slug` (the pre-2026-09-18 object form) yields a set of `undefined` and
    the cross-check below passes without checking anything.
  */
  const idx = JSON.parse(buildGroundingIndex(true)) as {
    byCharacterLegend: string;
    byCharacter: Record<string, Record<string, string[]>>;
    cities: [string, string, string, unknown[]][];
  };

  assert.ok(idx.byCharacterLegend.includes('outdoors'), 'the vocabulary is explained once');

  const europe = idx.byCharacter['אירופה'];
  assert.ok(europe.outdoors.includes('dolomites'), europe.outdoors.join(','));

  /*
    A big city is not a NATURE destination however many parks it has - the
    reported bug. Asserted per trait rather than "absent from the directory
    altogether", which is what this once said: back when a fixed threshold left
    `art` and `foodie` firing for one or two destinations each, the two happened
    to mean the same thing. They do not now, and they should not - New York
    belongs under art and food, it just does not belong under nature.
  */
  const nature = Object.values(idx.byCharacter).flatMap((r) => r.outdoors ?? []);
  for (const slug of ['new-york', 'barcelona', 'prague', 'vienna']) {
    assert.ok(!nature.includes(slug), `${slug} is listed as a nature destination`);
  }

  const all = Object.values(idx.byCharacter).flatMap((r) => Object.values(r).flat());

  // Every slug in the directory is a real city in the same index.
  const known = new Set(idx.cities.map((c) => c[0]));
  assert.ok(known.has('dolomites'), 'the city rows are being read correctly');
  for (const slug of all) assert.ok(known.has(slug), slug);
});

test('grouping is what makes a count correct, because the model counts the list', () => {
  /*
    The defect this shape exists for: with `character` on each city row, the
    first live run opened with "we have 84 nature destinations in Europe" - 84
    is the worldwide figure and Europe is 32. Two wordings and a handed-over
    table of per-continent totals all failed to stop it. Grouped by continent,
    the obvious reading of the list is the right one: counting what sits under
    Europe gives Europe's number.
  */
  const idx = JSON.parse(buildGroundingIndex(true)) as {
    byCharacter: Record<string, Record<string, string[]>>;
  };
  const europe = idx.byCharacter['אירופה'].outdoors;
  const character = destinationCharacters(destinations);
  const worldwide = destinations.filter((d) => character.get(d.slug)?.includes('outdoors'));

  assert.ok(europe.length > 10, `Europe has ${europe.length} outdoors destinations`);
  assert.ok(
    europe.length < worldwide.length,
    'a continent cannot hold every nature destination there is',
  );

  // Every destination lands in exactly one continent, so the parts add up to
  // the whole. A new country that fails to map is caught here rather than as a
  // number that is quietly short.
  const summed = Object.values(idx.byCharacter).reduce((n, r) => n + (r.outdoors?.length ?? 0), 0);
  assert.equal(summed, worldwide.length);
});

test('the directory is on every index variant, and the index stays under its ceiling', () => {
  /*
    Both dimensions, because there are two: the kosher gate and the encoding.
    `json` is a rollback of how a PLACE is encoded and must not also roll back
    what the index knows about our destinations - that would turn one env var
    into a silent regression of a different feature.
  */
  for (const format of ['tuple', 'json'] as const) {
    for (const kosherOk of [true, false]) {
      const idx = buildGroundingIndex(kosherOk, format);
      assert.ok(idx.includes('"byCharacter"'), `${format}/${kosherOk}`);
      assert.ok(idx.includes('"byCharacterLegend"'), `${format}/${kosherOk} legend`);
    }
  }
  // The ceiling is 280,000 chars (see the budget section in CLAUDE.md). The
  // bound is here so that a data pass which pushes the index past it fails a
  // test rather than a request.
  assert.ok(buildGroundingIndex(true).length < 280_000, `index is ${buildGroundingIndex(true).length}`);
});
