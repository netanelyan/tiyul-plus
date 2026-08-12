/**
 * טסטים לשער הכשרות שב-grounding.
 *
 * הרגרסיה עצמה, מהדיווח של נתנאל על האתר החי: "כשאני שואל על מסעדה
 * ברומא, הוא מתחיל לדבר על מקומות כשרים, למרות שלא הדלקתי את הכפתור".
 * שני השמות שהופיעו בתשובה - בא-גטו ויטבתה - הם בדיוק שתי הרשומות
 * ב-`kosher-food` שיש לרומא בקטלוג, כלומר המודל לא המציא אותן: הוא קרא
 * אותן ב-grounding.
 *
 * הטסטים רצים מול הקטלוג האמיתי ולא מול fixture, כי מה שנבדק כאן הוא
 * בדיוק מה שנשלח למודל.
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
  // גם האינדקס, שהוא הבלוק הגדול והמטומן
  const index = buildGroundingIndex(ok);
  for (const p of romeKosher) assert.ok(!index.includes(p.id), `${p.id} still in index`);
  // ורומא עדיין שם: סינון, לא השתקה
  assert.ok(detail.includes('rom-colosseum'));
});

test('כשהכשרות כבויה, גם סקירת הכשרות של העיר ומזהים במסלול האוצר יורדים', () => {
  const detail = buildGroundingDetail(['rome'], false);
  assert.ok(!detail.includes(rome.practical.kosherOverview.slice(0, 40)));
  const withKosher = buildGroundingDetail(['rome'], true);
  assert.ok(withKosher.includes(rome.practical.kosherOverview.slice(0, 40)));
  // המסלול הוא הדלת האחורית: מזהה כשר בתוך יום של מסלול אוצר
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
  // מאז קטגוריות food/market יש בקטלוג מקומות אכילה לא-כשרים. שכבת
  // הכלים חוסמת אותם; הפרוזה צריכה את העובדה כדי להזהיר במקום להמליץ.
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
  // וכשהשער סגור אין לזה מה לעשות שם
  const off = JSON.parse(buildGroundingDetail([city.slug], false));
  assert.ok(!off.cities[0].places.some((p: { kosherStatus?: string }) => p.kosherStatus));
});

test('אזהרת "המקום הזה אינו כשר" על מקום לא-כשר נשארת בכל מצב', () => {
  // katz's delicatessen מסומן במפורש כלא-כשר, וזו אזהרה - לא המלצה.
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

/* ---------- kosherAllowedNames: הרשימה הלבנה של priceGuard.ts ---------- */

test('kosherAllowedNames ריקה לגמרי כשהשער סגור - גם על עיר עם כשרות אמיתית', () => {
  assert.deepEqual(kosherAllowedNames(['rome'], false), []);
});

test('kosherAllowedNames ריקה לעיר שלא נשלחה בכלל (לא בקטלוג, או לא ברשימה) - הבאג המדויק', () => {
  // השער עצמו (kosherOk) יכול להיות פתוח כי המשתמש שאל, אבל אם העיר
  // שהוא שאל עליה לא ברשימת הערים שנשלחו בתור הזה - אין לה שם על מה
  // לגבות טענה, גם אם השער הכללי פתוח.
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
