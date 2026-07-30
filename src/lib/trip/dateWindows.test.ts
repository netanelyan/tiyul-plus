/**
 * טסטים לחפיפה בין תאריכי הטיול לבין אירועים וסגירות.
 *
 * שני דברים נבדקים כאן, ושניהם על הכנות ולא על התצוגה:
 *
 * 1. **מה נחשב חפיפה.** ההחלטה היא יום-בעיר ולא טווח-מול-טווח, ולכן
 *    רוב הטסטים כאן הם דווקא מקרים שבהם התשובה הנכונה היא "לא להציג":
 *    העיר הלא נכונה, היום הלא נכון, טיול בלי תאריכים.
 * 2. **שחלון אופייני לא מתחזה לתאריך.** יש טסט שסורק את כל הדאטה
 *    ומוודא שכל רשומה לא-ודאית נושאת את המשפט שאומר זאת.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { cityDateWindows } from '@/data/dateWindows';
import { executeAgentTool } from './agent.ts';
import { isISODate } from './dates.ts';
import {
  dayRangeLabel,
  isConfirmed,
  matchTripWindows,
  typicalLabel,
  windowDatesLabel,
  windowsForCity,
  type CityDateWindow,
} from './dateWindows.ts';
import type { Trip } from './types';

const win = (over: Partial<CityDateWindow> = {}): CityDateWindow => ({
  id: 'w1',
  citySlug: 'munich',
  kind: 'event',
  name: 'אירוע בדיקה',
  dates: { kind: 'exact', start: '2026-09-19', end: '2026-10-04' },
  note: 'הערה.',
  source: { title: 'מקור', url: 'https://example.org', checked: '2026-07-30' },
  ...over,
});

/** טיול: יומיים במינכן ואז שלושה ברומא, מתאריך נתון */
const trip = (startDate: string | undefined, cities: string[]): Trip => ({
  id: 't',
  name: 'טיול',
  citySlugs: [...new Set(cities)],
  days: cities.map((c, i) => ({ id: `d${i}`, citySlug: c, placeIds: [] })),
  createdAt: 0,
  ...(startDate ? { startDate } : {}),
});

/* ---------- ההחלטה: חפיפה נמדדת מול הימים בעיר ---------- */

test('חופף רק אם המטייל נמצא באותה עיר באותו יום', () => {
  // 17-18 בספטמבר במינכן, ואז רומא. אוקטוברפסט נפתח ב-19 - הוא כבר לא שם.
  const before = trip('2026-09-17', ['munich', 'munich', 'rome', 'rome']);
  assert.deepEqual(matchTripWindows(before, [win()]), []);

  // אותם תאריכים בדיוק, אבל הוא נשאר במינכן עד ה-20
  const during = trip('2026-09-17', ['munich', 'munich', 'munich', 'munich']);
  const got = matchTripWindows(during, [win()]);
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].dayNumbers, [3, 4]); // 19-20 בספטמבר
});

test('העיר הנכונה בתאריך הנכון - ולא סתם תאריכי הטיול', () => {
  // כל התקופה חופפת לאוקטוברפסט, אבל המטייל ברומא
  const inRome = trip('2026-09-20', ['rome', 'rome', 'rome']);
  assert.deepEqual(matchTripWindows(inRome, [win()]), []);
});

test('טיול בלי תאריכים לא מייצר שום התראה', () => {
  assert.deepEqual(matchTripWindows(trip(undefined, ['munich', 'munich']), [win()]), []);
  assert.deepEqual(matchTripWindows(null, [win()]), []);
});

test('חזרה לאותה עיר בסוף הטיול לא הופכת לטווח רציף מדומה', () => {
  const t = trip('2026-09-19', ['munich', 'rome', 'rome', 'rome', 'munich']);
  const got = matchTripWindows(t, [win()]);
  assert.deepEqual(got[0].dayNumbers, [1, 5]);
  // "ימים 1-5" היה אומר חמישה ימים שלא היו
  assert.equal(dayRangeLabel(got[0].dayNumbers), 'ימים 1, 5');
  assert.equal(dayRangeLabel([3, 4, 5]), 'ימים 3-5');
  assert.equal(dayRangeLabel([2]), 'יום 2');
});

test('תאריך שנתי-חוזר תופס בכל שנה', () => {
  const annual = win({ dates: { kind: 'annual', start: '08-15', end: '08-15' }, citySlug: 'rome' });
  for (const year of ['2026', '2027', '2031']) {
    const t = trip(`${year}-08-14`, ['rome', 'rome', 'rome']);
    assert.equal(matchTripWindows(t, [annual]).length, 1, year);
  }
  const missed = trip('2026-08-16', ['rome', 'rome']);
  assert.deepEqual(matchTripWindows(missed, [annual]), []);
});

test('חלון שחוצה סוף שנה נתפס בשני צדדיו', () => {
  const xmas = win({
    citySlug: 'vienna',
    dates: { kind: 'annual', start: '11-15', end: '01-06' },
  });
  assert.equal(matchTripWindows(trip('2026-12-28', ['vienna']), [xmas]).length, 1);
  assert.equal(matchTripWindows(trip('2027-01-04', ['vienna']), [xmas]).length, 1);
  assert.equal(matchTripWindows(trip('2026-09-04', ['vienna']), [xmas]).length, 0);
});

test('הרשומות מוחזרות לפי סדר הפגישה איתן בטיול', () => {
  const a = win({ id: 'late', citySlug: 'rome', dates: { kind: 'annual', start: '08-15', end: '08-15' } });
  const b = win({ id: 'early', citySlug: 'rome', dates: { kind: 'annual', start: '08-12', end: '08-12' } });
  const t = trip('2026-08-11', ['rome', 'rome', 'rome', 'rome', 'rome']);
  assert.deepEqual(
    matchTripWindows(t, [a, b]).map((m) => m.window.id),
    ['early', 'late'],
  );
});

/* ---------- חלון אופייני לא מתחזה לתאריך ---------- */

test('חלון אופייני מוצג כמשפט, לא כתאריך', () => {
  const typical = win({
    citySlug: 'budapest',
    dates: { kind: 'typical', start: '08-01', end: '08-12', typical: 'בשבוע הראשון של אוגוסט' },
  });
  const t = trip('2026-08-03', ['budapest', 'budapest']);
  const m = matchTripWindows(t, [typical])[0];
  const label = windowDatesLabel(m);
  assert.equal(label, 'בדרך כלל בשבוע הראשון של אוגוסט · התאריכים לשנה הזו עדיין לא פורסמו');
  assert.equal(isConfirmed(typical), false);
  // אין בו תאריך מספרי שאפשר לטעות בו
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(label));
});

test('תאריך שנתי מוצג בשנה שבה המטייל באמת שם', () => {
  const annual = win({ citySlug: 'rome', dates: { kind: 'annual', start: '08-15', end: '08-15' } });
  const m = matchTripWindows(trip('2029-08-15', ['rome']), [annual])[0];
  assert.equal(windowDatesLabel(m), '15 באוגוסט');
  assert.equal(isConfirmed(annual), true);
});

test('תאריכים שפורסמו מוצגים כטווח קריא', () => {
  const m = matchTripWindows(trip('2026-09-19', ['munich']), [win()])[0];
  assert.equal(windowDatesLabel(m), '19 בספטמבר - 4 באוקטובר');
});

/* ---------- שלמות הדאטה עצמה ---------- */

test('כל רשומה בדאטה מצביעה על עיר קיימת, עם מקור ותאריך בדיקה', () => {
  const slugs = new Set(destinations.map((d) => d.slug));
  assert.ok(cityDateWindows.length > 0);
  const ids = new Set<string>();
  for (const w of cityDateWindows) {
    assert.ok(slugs.has(w.citySlug), `${w.id}: עיר לא קיימת "${w.citySlug}"`);
    assert.ok(!ids.has(w.id), `${w.id}: מזהה כפול`);
    ids.add(w.id);
    assert.ok(w.source.url.startsWith('https://'), `${w.id}: מקור חייב להיות קישור`);
    assert.ok(w.source.title.trim().length > 2, `${w.id}: למקור חייבת להיות כותרת`);
    assert.ok(isISODate(w.source.checked), `${w.id}: תאריך בדיקה לא תקין`);
    assert.ok(w.note.trim().length > 10, `${w.id}: חסרה שורת משמעות`);
    if (w.dates.kind === 'exact') {
      assert.ok(isISODate(w.dates.start) && isISODate(w.dates.end), `${w.id}: תאריכים לא תקינים`);
      assert.ok(w.dates.start <= w.dates.end, `${w.id}: סוף לפני התחלה`);
    } else {
      assert.ok(/^\d{2}-\d{2}$/.test(w.dates.start), `${w.id}: MM-DD לא תקין`);
      assert.ok(/^\d{2}-\d{2}$/.test(w.dates.end), `${w.id}: MM-DD לא תקין`);
    }
    if (w.dates.kind === 'typical') {
      assert.ok(w.dates.typical.trim().length > 3, `${w.id}: חסר ניסוח החלון האופייני`);
    }
  }
});

/**
 * הרשומות עצמן כפופות לאותו כלל שהשומר אוכף על הסוכן.
 *
 * שתי רשומות בגרסה הראשונה נכשלו כאן והתגלו דווקא בצילום מסך: אחת אמרה
 * שהמחירים ללינה עולים והשנייה שלינה "נתפסת חודשים מראש" - טענות מחיר
 * וזמינות שאין להן מקור, ושהשומר היה חותך אילו המודל היה כותב אותן.
 * מה שאסור לו לומר אסור גם לדאטה לומר בשמו.
 */
test('אין בדאטה מחיר, זמינות, קישור לכרטיסים או שכנוע ללכת', () => {
  const banned = [
    /₪|€|\$/,
    /כרטיס(ים)? ב/,
    /כדאי ל(לכת|בקר)/,
    /שווה ל(לכת|בקר)/,
    /מומלץ ל(לכת|בקר)/,
    /ticket/i,
    /יקר|זול|מחיר/,
    /נתפס|אזל|אין מקום|תפוס/,
  ];
  for (const w of cityDateWindows) {
    const text = `${w.name} ${w.note}`;
    for (const re of banned) {
      assert.ok(!re.test(text), `${w.id}: הרשומה חורגת מ"מה זה אומר לכם" - ${re}`);
    }
  }
});

/* ---------- הסוכן: אין מידע זו תשובה ---------- */

test('אין מידע לעיר ולתאריכים - הכלי אומר זאת במפורש ולא נכשל', () => {
  // פראג אינה בדאטה של החלונות
  const out = executeAgentTool(trip('2026-09-19', ['prague', 'prague']), 'city_date_notes', {
    citySlug: 'prague',
  });
  assert.equal(out.ok, true);
  assert.ok(out.message.includes('אין לנו'));
  assert.ok(out.message.includes('אל תשלים מהידע שלך'));
  assert.equal(out.eventNames, undefined);
});

test('כשיש חפיפה - הכלי מחזיר את הרשומה ואת שמה לרשימה הלבנה', () => {
  const out = executeAgentTool(trip('2026-09-19', ['munich', 'munich']), 'city_date_notes', {
    citySlug: 'munich',
  });
  assert.equal(out.ok, true);
  assert.ok(out.message.includes('אוקטוברפסט'));
  assert.ok(out.eventNames?.includes('אוקטוברפסט'));
  // הכללים נוסעים עם התוצאה, כי היא הדבר האחרון שהמודל קורא
  for (const rule of ['אל תוסיף תאריך', 'מחיר כרטיס', 'להמליץ ללכת']) {
    assert.ok(out.message.includes(rule), rule);
  }
});

test('טיול בלי תאריכים - נאמר במפורש שזו רשימה שלא הותאמה לתאריכים', () => {
  const out = executeAgentTool(trip(undefined, ['munich']), 'city_date_notes', {
    citySlug: 'munich',
  });
  assert.equal(out.ok, true);
  assert.ok(out.message.includes('בלי התאמה לתאריכים'));
});

test('עיר לא מוכרת נדחית', () => {
  const out = executeAgentTool(trip('2026-09-19', ['munich']), 'city_date_notes', {
    citySlug: 'atlantis',
  });
  assert.equal(out.ok, false);
});

test('הרשומות של עיר נשלפות גם בלי טיול', () => {
  assert.ok(windowsForCity('munich', cityDateWindows).length > 0);
  assert.deepEqual(windowsForCity('nowhere', cityDateWindows), []);
});

test('הניסוח הלא-ודאי הוא מחרוזת אחת משותפת - ולא מנוסח מחדש בכל מקום', () => {
  assert.equal(
    typicalLabel('בסוף ספטמבר'),
    'בדרך כלל בסוף ספטמבר · התאריכים לשנה הזו עדיין לא פורסמו',
  );
});
