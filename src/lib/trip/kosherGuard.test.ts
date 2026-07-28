/**
 * טסטים לשמירה ההפוכה: מטייל ששמר "כשר" לא מקבל מקום אכילה שאינו כשר.
 *
 * הרקע, וזה לא באג שנולד עם הפיצ׳ר הזה. עד עכשיו כל האוכל בקטלוג היה
 * בקטגוריות `kosher-*`, ולכן `filterKosherUnlessOptedIn` יכלה להסתפק
 * בחצי עבודה: לסנן כשרות למי שלא ביקש, ולהחזיר `return { ids }` מיד
 * כשההעדפה כן נבחרה. אבל כבר אז ישבו בקטלוג ארבע רשומות אוכל שאינן
 * כשרות בקטגוריה `cafe` (קפה צנטרל, און לוק יון, אלס קואטרה גאטס
 * ועוד) - ומטייל שסימן "כשר" יכול היה לקבל אותן ליום שלו בלי שום
 * מחסום. הוספת מסעדות לא כשרות רק הגדילה את הפער הזה.
 *
 * לכן הכלל כאן: **'unknown' נחסם בדיוק כמו 'not-kosher'.** "לא ידוע"
 * אינו "כנראה בסדר". זו ההחלטה היחידה שאפשר לקבל כשמישהו סומך עלינו
 * בכשרות.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { isEating, kosherStatusOf } from '@/lib/categories';
import { executeAgentTool } from './agent.ts';
import { tripFromTemplate } from './generate.ts';
import type { Trip } from './types';

const vienna = destinations.find((d) => d.slug === 'vienna')!;

/** מקומות אכילה לא כשרים אמיתיים מהקטלוג, לא פיקסצ׳ר. */
const nonKosherEating = vienna.places
  .filter((p) => isEating(p.category) && kosherStatusOf(p) !== 'kosher')
  .map((p) => p.id);
const kosherEating = vienna.places
  .filter((p) => p.category === 'kosher-food')
  .map((p) => p.id);

test('the fixture is real: Vienna genuinely has both kinds of eating place', () => {
  assert.ok(nonKosherEating.length >= 3, `expected non-kosher eating places, got ${nonKosherEating.length}`);
  assert.ok(kosherEating.length >= 1, `expected kosher eating places, got ${kosherEating.length}`);
});

test('every eating place in the whole catalog states its kashrut - none is blank', () => {
  const blank: string[] = [];
  for (const d of destinations)
    for (const p of d.places)
      if (isEating(p.category) && !p.category.startsWith('kosher') && !p.kosherStatus)
        blank.push(`${d.slug}/${p.id}`);
  assert.deepEqual(blank, [], `these eating places carry no kosherStatus: ${blank.join(', ')}`);
});

const kosherTrip = (): Trip => ({
  id: 't1',
  name: 'וינה',
  citySlugs: ['vienna'],
  days: [],
  createdAt: 0,
  preferences: { kosher: true },
});

test('create_trip_full: a kosher traveller does not receive a non-kosher restaurant', () => {
  const res = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    {
      name: 'וינה',
      dayPlans: [{ citySlug: 'vienna', placeIds: [...nonKosherEating, 'vie-stephansdom'] }],
    },
  );
  assert.equal(res.ok, true);
  const placed = res.trip!.days.flatMap((d) => d.placeIds);
  for (const id of nonKosherEating) assert.ok(!placed.includes(id), `${id} reached a kosher trip`);
  // מה שאינו אוכל נשאר - הסינון הוא על אכילה, לא על העיר
  assert.ok(placed.includes('vie-stephansdom'));
  // והמודל מקבל הסבר, אחרת הוא ינסה לשבץ אותם שוב בתור הבא
  assert.match(res.message, /שומר כשרות/);
});

test('create_trip_full: kosher places DO reach a kosher traveller', () => {
  const res = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: kosherEating }] },
  );
  assert.equal(res.ok, true);
  assert.deepEqual(res.trip!.days[0].placeIds, kosherEating);
});

test('the old direction still holds: no preference means no kosher places pushed', () => {
  const res = executeAgentTool(
    null,
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: [...kosherEating, 'vie-stephansdom'] }] },
  );
  assert.equal(res.ok, true);
  const placed = res.trip!.days.flatMap((d) => d.placeIds);
  for (const id of kosherEating) assert.ok(!placed.includes(id));
  assert.match(res.message, /העדפת כשרות לא נבחרה/);
});

test('the two explanations are not interchangeable', () => {
  const optedIn = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'x', dayPlans: [{ citySlug: 'vienna', placeIds: nonKosherEating }] },
  );
  const notOptedIn = executeAgentTool(
    null,
    'create_trip_full',
    { name: 'x', dayPlans: [{ citySlug: 'vienna', placeIds: kosherEating }] },
  );
  // מדובר על המשפט הפותח, לא על צירוף מילים כלשהו: ההודעה של
  // "לא בחר כשרות" מסתיימת ב"אם המשתמש יאמר במפורש שהוא שומר כשרות",
  // ולכן חיפוש נאיבי של "שומר כשרות" מוצא אותה - וזה בדיוק מה שהטסט
  // הזה תפס בגרסה הראשונה שלו.
  assert.ok(optedIn.message.includes('הורדו מקומות אכילה שאינם כשרים'));
  assert.ok(!optedIn.message.includes('לא שובצו מקומות כשרים'));
  assert.ok(notOptedIn.message.includes('לא שובצו מקומות כשרים'));
  assert.ok(!notOptedIn.message.includes('הורדו מקומות אכילה שאינם כשרים'));
});

test('tripFromTemplate: the curated itinerary loses only its non-kosher eating stops', () => {
  const trip = tripFromTemplate(vienna, { kosher: true });
  const placed = trip.days.flatMap((d) => d.placeIds);
  for (const id of nonKosherEating) assert.ok(!placed.includes(id), `${id} survived into a kosher template`);
  // ולא הפכנו את התבנית לריקה - זו הייתה "התיקון" הגרוע
  assert.ok(placed.length > 5, `template collapsed to ${placed.length} stops`);
});

test('add_place stays exempt: naming a place is itself an explicit request', () => {
  const base = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: ['vie-stephansdom'] }] },
  );
  const res = executeAgentTool(base.trip, 'add_place', { dayNumber: 1, placeId: nonKosherEating[0] });
  assert.equal(res.ok, true);
  assert.ok(res.trip!.days[0].placeIds.includes(nonKosherEating[0]));
});
