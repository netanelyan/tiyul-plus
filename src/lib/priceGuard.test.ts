/**
 * Tests for the price guard.
 *
 * What is tested here is the promise itself, not the prompt: **a price
 * number, a hotel name, availability or a "cheapest" claim cannot leave the
 * agent**, even if the model writes them. Half of the tests are actually in
 * the opposite direction - that the filter does not cut legitimate sentences
 * (the "the currency is euro", "bus 29", "3 nights", "a free day" kind).
 * A filter that cuts too much would have vanished from the product within a
 * week.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  GuardedTextStream,
  LOOKUP_ANCHOR,
  NO_EVENT_LINE,
  NO_KOSHER_LINE,
  NO_LOOKUP_LINE,
  NO_PRICE_LINE,
  NO_PRICE_LINE_BARE,
  guardText,
  violationOf,
} from './priceGuard.ts';

const clean = (s: string) => guardText(s).redactions.length === 0;

/* ---------- What must be cut ---------- */

test('מחיר עם מטבע לא יוצא מהסוכן', () => {
  const r = guardText('מלונות במרכז רומא בסביבות 450 ש״ח ללילה.');
  assert.deepEqual(r.redactions.length > 0, true);
  assert.ok(!r.text.includes('450'));
  assert.ok(!r.text.includes('ש״ח'));
  assert.ok(r.text.includes('לא יכול לבדוק מחירים'));
});

test('מספר צמוד ליחידת תמחור נחתך גם בלי סמל מטבע', () => {
  assert.equal(clean('אפשר למצוא משהו סביר ב-400 ללילה.'), false);
  assert.equal(clean('זה יוצא בערך 120 לאדם.'), false);
});

test('"בדרך כלל" ו"בערך" לא מכשירים מספר', () => {
  assert.equal(clean('בדרך כלל המחיר הוא 90 אירו.'), false);
  assert.equal(clean('העלות הטיפוסית היא כ-300 שקל.'), false);
});

test('זמינות היא טענה על נתון חי - נחתכת', () => {
  assert.equal(clean('יש חדרים פנויים בתאריכים שלכם.'), false);
  assert.equal(clean('אין זמינות בסופ״ש הזה.'), false);
});

test('דירוג כוכבים וסוג חדר נחתכים - אין לנו מלונות בדאטה', () => {
  assert.equal(clean('מלון 4 כוכבים ליד התחנה.'), false);
  assert.equal(clean('אפשר לקחת סוויטה עם ארוחת בוקר כלולה.'), false);
});

test('"הזול ביותר" אסור תמיד, גם כתשובה לשאלה ישירה', () => {
  assert.equal(violationOf('המלון הזול ביותר ברומא הוא בטרסטוורה.'), 'superlative');
  assert.equal(violationOf('אמצא לכם את המחיר הטוב ביותר.'), 'superlative');
  assert.equal(violationOf('This is the cheapest option.'), 'superlative');
  // Even when the traveler said it first - we do not scan all the providers
  assert.equal(violationOf('הכי זול שיש', { userText: 'מה הכי זול' }), 'superlative');
});

test('שם מלון שהמטייל לא נתן נחתך', () => {
  assert.equal(violationOf('אני ממליץ על Hotel Artemide.'), 'property-name');
  assert.equal(violationOf('שווה לבדוק את Trastevere Suites.'), 'property-name');
  assert.equal(violationOf('מלון Devin הוא אפשרות טובה.'), 'property-name');
});

/* ---------- Events and dates: only from what the data returned ---------- */

test('טענה על אירוע במועד מסוים נחסמת כשלא הוחזר כלום מהדאטה', () => {
  assert.equal(violationOf('אוקטוברפסט מתחיל ב-19 בספטמבר.'), 'event-claim');
  assert.equal(violationOf('הפסטיבל מתקיים השנה כרגיל.'), 'event-claim');
  assert.equal(violationOf('יש קרנבל גדול בפברואר.'), 'event-claim');
});

test('טענת סגירה עם מועד מסוים נחסמת גם היא', () => {
  assert.equal(violationOf('רוב החנויות סגורות ב-15 באוגוסט.'), 'closure-claim');
  assert.equal(violationOf('המוזיאונים סגורים ב-25.12.'), 'closure-claim');
});

test('אותה טענה עוברת כשהיא נוקבת בשם רשומה שהוחזרה', () => {
  const allow = { eventNames: ['אוקטוברפסט', 'פרראגוסטו'] };
  assert.equal(violationOf('אוקטוברפסט מתחיל ב-19 בספטמבר.', allow), null);
  assert.equal(violationOf('פרראגוסטו ב-15 באוגוסט - הרבה חנויות סגורות.', allow), null);
  // Another event, one that was not returned, is still blocked - and that is the point
  assert.equal(violationOf('יש גם פסטיבל אורות בדצמבר.', allow), 'event-claim');
});

test('החלפה של טענת אירוע היא משפט על אירועים, לא על מחירים', () => {
  const r = guardText('הקרנבל מתקיים בפברואר.');
  assert.ok(r.text.includes('אין לי מידע רשום על אירועים'));
  assert.ok(!r.text.includes('מחירים או זמינות'));
});

test('תשובה שנגעה גם במחיר וגם באירוע מסבירה את שניהם', () => {
  const r = guardText('הפסטיבל מתקיים בספטמבר. מלון יעלה בסביבות 400 ש״ח ללילה.');
  assert.ok(r.text.includes('אין לי מידע רשום על אירועים'));
  assert.ok(r.text.includes('לא יכול לבדוק מחירים'));
});

test('משפטים תמימים על זמן ועל אירועים לא נחתכים', () => {
  // Without a specific date - this is not a checkable claim, nor a misleading one
  assert.ok(clean('בעיר יש הרבה אירועים לאורך השנה.'));
  assert.ok(clean('הרובע שקט יותר בערבים.'));
  // A date without an event - that is simply the itinerary
  assert.ok(clean('יום 3 · 12 באוגוסט, מתחילים בקתדרלה.'));
  assert.ok(clean('הוספתי יום בספטמבר.'));
  // A fixed weekly closure is not a claim about a date in the year
  assert.ok(clean('המוזיאון סגור בימי שני.'));
});

/* ---------- The whitelist: what the traveler themselves said ---------- */

test('מספר שהמטייל נקב בו חוזר אליו', () => {
  const allow = { userText: 'התקציב שלנו הוא 400 ש״ח ללילה' };
  assert.equal(violationOf('התקציב שציינתם, 400 ש״ח ללילה, נכנס לחיפוש.', allow), null);
  // A different number in the same context - no
  assert.equal(violationOf('אפשר גם ב-250 ש״ח ללילה.', allow), 'per-unit-price');
});

test('שם מלון שהמטייל נתן, או סיכה בטיול, מותר', () => {
  assert.equal(violationOf('המלון שלכם, Hotel Devin, על גדת הדנובה.', { pinNames: ['Hotel Devin'] }), null);
  assert.equal(violationOf('בדקתי את Hotel Bristol שהזכרת.', { userText: 'הזמנתי את Hotel Bristol' }), null);
});

/* ---------- What must not be cut (real regressions) ---------- */

test('מטבע בלי מספר הוא מידע פרקטי אמיתי', () => {
  assert.ok(clean('המטבע במדינה הוא אירו, וכדאי לשלם בכרטיס.'));
  assert.ok(clean('בסלובקיה משתמשים באירו.'));
});

test('מספרים שאינם מחיר עוברים כמו שהם', () => {
  assert.ok(clean('לדווין - אוטובוס 29 מהמרכז.'));
  assert.ok(clean('3 לילות בוינה ואז 2 בפראג.'));
  assert.ok(clean('העיר העתיקה - 400 מ׳ אווירי מהמלון.'));
  assert.ok(clean('הוספתי 4 ימים למסלול.'));
  assert.ok(clean('המסלול עולה 300 מטר בעלייה מתונה.'));
  assert.ok(clean('יום 2 מתחיל ב-9:00 ליד הקתדרלה.'));
});

test('"פנוי" בהקשר של תוכנית אינו טענת זמינות', () => {
  assert.ok(clean('יש לכם יום פנוי ביום 4 - אפשר להוסיף טיול.'));
  assert.ok(clean('השארתי את הערב פנוי.'));
});

test('טקסט נקי חוזר תו-בתו', () => {
  const t = 'הוספתי יום בפראג.\n\nהמסלול מעודכן בפאנל, ואפשר לפתוח כל יום בניווט.';
  const r = guardText(t);
  assert.equal(r.text, t);
  assert.deepEqual(r.redactions, []);
});

test('שם לטיני של מקום מהקטלוג הוא לא שם מלון', () => {
  assert.ok(clean('Piazza Navona ואחריה Castel Sant Angelo.'));
  assert.ok(clean('St. Stephen Cathedral במרכז וינה.'));
});

/* ---------- The replacement wording must survive itself ---------- */

test('שורות ההחלפה עצמן עוברות את הפילטר', () => {
  assert.equal(violationOf(NO_PRICE_LINE), null);
  assert.equal(violationOf(NO_PRICE_LINE_BARE), null);
  assert.equal(violationOf(NO_EVENT_LINE), null);
  // Idempotence: a second run changes nothing
  const once = guardText('זה עולה בערך 300 אירו.').text;
  assert.deepEqual(guardText(once).redactions, []);
  assert.equal(guardText(once).text, once);
});

test('שתי טענות מחיר לא מייצרות שתי חזרות של אותו משפט', () => {
  const r = guardText('מלון זול הוא 300 ש״ח ללילה. מלון טוב הוא 800 ש״ח ללילה.');
  assert.equal(r.redactions.length, 2);
  const occurrences = r.text.split('לא יכול לבדוק מחירים').length - 1;
  assert.equal(occurrences, 1);
});

/* ---------- Streaming: the part without which all the rest is worth nothing ---------- */

function streamAll(deltas: string[], allow = {}): { out: string; redactions: string[] } {
  const s = new GuardedTextStream(allow);
  let out = '';
  for (const d of deltas) out += s.push(d);
  out += s.end();
  return { out, redactions: s.redactions };
}

test('מחיר שנחתך בין שני delta נתפס בכל זאת', () => {
  // Exactly the shape streaming arrives in: the number in one chunk, the currency in the next
  const { out, redactions } = streamAll(['מלון במרכז עולה ', 'בערך 4', '50', ' ש״ח', ' ללילה.']);
  assert.ok(redactions.length > 0);
  assert.ok(!out.includes('450'));
  assert.ok(!out.includes('ש״ח'));
});

test('בהזרמה השורה הכנה נאמרת פעם אחת, לא פעם לכל משפט', () => {
  // A real bug caught in a demo run: each sentence is released in a separate
  // call to the filter, so a local counter thought each time that it was the
  // first - and the traveler got the same apology sentence twice in a row.
  const attempt =
    'המלון הזול ביותר הוא Hotel Artemide, בסביבות 320 ש״ח ללילה. ' +
    'זה מלון 4 כוכבים ויש חדרים פנויים. ' +
    'רומא בספטמבר נעימה.';
  const { out } = streamAll(
    Array.from({ length: Math.ceil(attempt.length / 7) }, (_, i) => attempt.slice(i * 7, i * 7 + 7)),
  );
  assert.equal(out.split('לא יכול לבדוק מחירים').length - 1, 1);
  assert.ok(out.includes('רומא בספטמבר נעימה.'));
  assert.ok(!/320|כוכבים|Artemide|פנויים/.test(out));
});

test('הזרמה של טקסט נקי מחזירה בדיוק את המקור', () => {
  const t = 'הוספתי יום בפראג. המסלול מעודכן בפאנל.';
  const { out, redactions } = streamAll(['הוספתי יום ', 'בפראג. המס', 'לול מעודכן בפאנל.']);
  assert.equal(out, t);
  assert.deepEqual(redactions, []);
});

test('משפט ראשון משתחרר לפני שהשני נכתב - אין השהיה של כל התשובה', () => {
  const s = new GuardedTextStream({});
  const first = s.push('הוספתי יום בפראג. ');
  assert.ok(first.includes('הוספתי יום בפראג.'));
});

test('משפט ארוך בלי פיסוק שמכיל מחיר לא משתחרר בחלקים', () => {
  const long = 'א'.repeat(750) + ' 500 ש״ח ללילה';
  const { out } = streamAll([long]);
  assert.ok(!out.includes('500'));
});

/* ---------- Guarding the copy: the test that prevents "cheapest" from coming back ---------- */

/**
 * Guarding the copy, as a class guard and not as discipline.
 *
 * The scan targets **copy that we present as our own claim about a search** -
 * the UI components and the booking layer. Two areas are excluded explicitly,
 * and not for convenience:
 *
 * - `src/data/**` - editorial prose a human wrote about **destinations**
 *   (the "cheapest destination in Europe" line about Bulgaria). That is not
 *   a price claim about a hotel and not a search result, and it was
 *   researched by hand. Changing it is an editorial decision about the
 *   catalog, and not this feature's business.
 * - Prompt text and regex matchers - there the phrase appears precisely in
 *   order to **forbid** it. A scan that fails the prohibition on itself is a
 *   useless scan.
 */
test('שום קופי בשכבת ההזמנות לא אומר "הזול ביותר"', () => {
  const banned = [/הזול ביותר/, /הכי זול/, /המחיר הטוב ביותר/, /\bcheapest\b/i];
  const roots = ['src/components', 'src/lib/booking.ts', 'src/lib/bookingSearch.ts'];
  const offenders: string[] = [];
  const scanFile = (p: string) => {
    if (!/\.(ts|tsx)$/.test(p)) return;
    const rel = p.replace(/^.*?(src\/)/, '$1');
    readFileSync(p, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        // A comment line is not copy shown to anyone
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (banned.some((re) => re.test(line))) offenders.push(`${rel}:${i + 1}`);
      });
  };
  const walk = (p: string) => {
    if (statSync(p).isDirectory()) {
      for (const e of readdirSync(p)) walk(join(p, e));
    } else scanFile(p);
  };
  roots.forEach(walk);
  assert.deepEqual(offenders, [], `נוסח אסור ("הזול ביותר") הופיע ב: ${offenders.join(', ')}`);
});

/* ---------- Kashrut: not from memory, not from a search - only from the catalog ---------- */

test('הרגרסיה המדווחת: גיאוגרפיה כשרה כללית על אזור לא-מכוסה נחתכת', () => {
  // Exactly Netanel's description: the agent refuses a specific place, then
  // volunteers a "there is a Jewish community there" claim from its own
  // memory - with no city/place from the catalog in the text.
  assert.equal(
    violationOf('יש שם קהילה יהודית קטנה וכמה מסעדות כשרות באזור.'),
    'kosher-claim',
  );
  assert.equal(violationOf('האזור ידוע בתור מרכז כשרות בסביבה.'), 'kosher-claim');
  assert.equal(violationOf('יש בית חב"ד ומסעדה כשרה בעיר השכנה.'), 'kosher-claim');
});

test('אותה טענה עוברת רק כשהיא נוקבת בשם שהוחזר מהדאטה של התור הזה', () => {
  const allow = { kosherNames: ['רומא', 'Rome', 'בא-גטו'] };
  assert.equal(violationOf('ברומא יש קהילה יהודית ותיקה ומסעדות כשרות.', allow), null);
  assert.equal(violationOf('מומלץ לנסות את בא-גטו, שם יש השגחה טובה.', allow), null);
  // A different city that was not sent - still blocked, and that is the whole point
  assert.equal(
    violationOf('גם בברלין יש קהילה יהודית ומסעדות כשרות.', allow),
    'kosher-claim',
  );
});

test('שער כללי פתוח לא מכשיר עיר ספציפית שלא נשלחה בכלל - הבאג המדויק', () => {
  // kosherOk can be true (the user asked about kashrut), but if kosherNames
  // is empty for this city - because it is not in the catalog, or it is in
  // the catalog with no kosher data - no claim about it passes. This is
  // exactly the spot where the reported bug happened.
  const allow = { kosherNames: [] as string[] };
  assert.equal(violationOf('יש שם קהילה יהודית קטנה ומסעדה כשרה אחת.', allow), 'kosher-claim');
});

test('אזהרה כללית בלי טענת מציאות לא נחסמת - יש לה מקום להישאר', () => {
  assert.ok(clean('כדאי לוודא כשרות ושעות מול המקום עצמו.'));
  assert.ok(clean('לא בדקתי את הכשרות של המקום הזה.'));
});

test('החלפה של טענת כשרות היא המשפט הכנה, ולא נוסח המחיר או האירוע', () => {
  const r = guardText('יש שם קהילה יהודית גדולה ומסעדות כשרות רבות.');
  assert.ok(r.text.includes('רק למקומות שמאומתים אצלנו בקטלוג'));
  assert.ok(!r.text.includes('לא יכול לבדוק מחירים'));
  assert.ok(!r.text.includes('אירועים'));
});

test('GuardedTextStream חוסם טענת כשרות בהזרמה, בדיוק כמו מחיר', () => {
  const s = new GuardedTextStream({ kosherNames: [] });
  const out = s.push('יש שם קהילה יהודית ומסעדות כשרות. ') + s.end();
  assert.ok(!out.includes('קהילה יהודית'));
  assert.ok(out.includes(NO_KOSHER_LINE));
});

/* ---------- Live lookup: hours/admission-price/existence, only with an adjacent citation ---------- */

test('LOOKUP_ANCHOR מזהה את תבנית התאריך שהמודל מצווה לכתוב', () => {
  assert.ok(LOOKUP_ANCHOR.test('נבדק ב-12.8.2026'));
  assert.ok(LOOKUP_ANCHOR.test('checked on 2026-08-12'));
  assert.ok(!LOOKUP_ANCHOR.test('ביקרנו שם באוגוסט'));
});

test('שעות פתיחה בלי ציטוט צמוד נחתכות', () => {
  assert.equal(violationOf('הקולוסיאום פתוח בין 9:00 ל-19:00.'), 'hours-claim');
  assert.equal(violationOf('שעות הפתיחה הן 08:00 עד 17:00.'), 'hours-claim');
});

test('אותה טענת שעות עוברת כשהציטוט באותו משפט', () => {
  assert.equal(
    violationOf('הקולוסיאום פתוח בין 9:00 ל-19:00 (מקור: colosseo.it, נבדק ב-12.8.2026).'),
    null,
  );
});

test('טענת קיום ("עדיין פתוח/נסגר לצמיתות") נחתכת בלי ציטוט', () => {
  assert.equal(violationOf('המקום עדיין קיים וניתן לבקר בו.'), 'existence-claim');
  assert.equal(violationOf('המסעדה נסגרה לצמיתות בשנה שעברה.'), 'existence-claim');
  assert.equal(
    violationOf('המקום עדיין קיים (מקור: tripadvisor.com, נבדק ב-1.1.2026).'),
    null,
  );
});

test('מחיר כניסה מצוטט עובר, אבל רק הוא - מחיר לינה נשאר חסום לגמרי', () => {
  assert.equal(
    violationOf('דמי הכניסה למוזיאון הם 15 יורו (מקור: museum.it, נבדק ב-1.1.2026).'),
    null,
  );
  // The same wording, without a citation - blocked as usual via the general price gate
  assert.equal(violationOf('דמי הכניסה למוזיאון הם 15 יורו.'), 'currency-amount');
  // The loophole closed deliberately: a wording that mixes an admission
  // ticket with a lodging price, with a citation - PER_UNIT already caught
  // it above and it never reaches the exemption at all
  assert.equal(
    violationOf('כרטיס כניסה למלון 300 ש"ח ללילה (נבדק ב-1.1.2026).'),
    'per-unit-price',
  );
});

test('החלפה של טענת חיפוש היא הנוסח הכנה שלה, לא של מחיר/אירוע/כשרות', () => {
  const r = guardText('הקולוסיאום פתוח בין 9:00 ל-19:00.');
  assert.ok(r.text.includes(NO_LOOKUP_LINE));
});
