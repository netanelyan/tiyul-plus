/**
 * טסטים לשומר המחירים.
 *
 * מה שנבדק כאן הוא ההבטחה עצמה, ולא הפרומפט: **מספר מחיר, שם מלון,
 * זמינות או "הזול ביותר" לא יכולים לצאת מהסוכן**, גם אם המודל יכתוב
 * אותם. חצי מהטסטים הם דווקא בכיוון ההפוך - שהפילטר לא חותך משפטים
 * לגיטימיים ("המטבע הוא אירו", "אוטובוס 29", "3 לילות", "יום פנוי").
 * פילטר שחותך יותר מדי היה נעלם מהמוצר תוך שבוע.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  GuardedTextStream,
  NO_EVENT_LINE,
  NO_PRICE_LINE,
  NO_PRICE_LINE_BARE,
  guardText,
  violationOf,
} from './priceGuard.ts';

const clean = (s: string) => guardText(s).redactions.length === 0;

/* ---------- מה שחייב להיחתך ---------- */

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
  // גם כשהמטייל אמר את זה קודם - אנחנו לא סורקים את כל הספקים
  assert.equal(violationOf('הכי זול שיש', { userText: 'מה הכי זול' }), 'superlative');
});

test('שם מלון שהמטייל לא נתן נחתך', () => {
  assert.equal(violationOf('אני ממליץ על Hotel Artemide.'), 'property-name');
  assert.equal(violationOf('שווה לבדוק את Trastevere Suites.'), 'property-name');
  assert.equal(violationOf('מלון Devin הוא אפשרות טובה.'), 'property-name');
});

/* ---------- אירועים ומועדים: רק ממה שהדאטה החזירה ---------- */

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
  // אירוע אחר, שלא הוחזר, עדיין נחסם - וזו הנקודה
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
  // בלי מועד מסוים - זו לא טענה שאפשר לבדוק, וגם לא כזו שמטעה
  assert.ok(clean('בעיר יש הרבה אירועים לאורך השנה.'));
  assert.ok(clean('הרובע שקט יותר בערבים.'));
  // מועד בלי אירוע - זה פשוט המסלול
  assert.ok(clean('יום 3 · 12 באוגוסט, מתחילים בקתדרלה.'));
  assert.ok(clean('הוספתי יום בספטמבר.'));
  // סגירה שבועית קבועה אינה טענה על מועד בשנה
  assert.ok(clean('המוזיאון סגור בימי שני.'));
});

/* ---------- הרשימה הלבנה: מה שהמטייל עצמו אמר ---------- */

test('מספר שהמטייל נקב בו חוזר אליו', () => {
  const allow = { userText: 'התקציב שלנו הוא 400 ש״ח ללילה' };
  assert.equal(violationOf('התקציב שציינתם, 400 ש״ח ללילה, נכנס לחיפוש.', allow), null);
  // מספר אחר באותו הקשר - לא
  assert.equal(violationOf('אפשר גם ב-250 ש״ח ללילה.', allow), 'per-unit-price');
});

test('שם מלון שהמטייל נתן, או סיכה בטיול, מותר', () => {
  assert.equal(violationOf('המלון שלכם, Hotel Devin, על גדת הדנובה.', { pinNames: ['Hotel Devin'] }), null);
  assert.equal(violationOf('בדקתי את Hotel Bristol שהזכרת.', { userText: 'הזמנתי את Hotel Bristol' }), null);
});

/* ---------- מה שאסור להיחתך (רגרסיות אמיתיות) ---------- */

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

/* ---------- הנוסח המחליף חייב לשרוד את עצמו ---------- */

test('שורות ההחלפה עצמן עוברות את הפילטר', () => {
  assert.equal(violationOf(NO_PRICE_LINE), null);
  assert.equal(violationOf(NO_PRICE_LINE_BARE), null);
  assert.equal(violationOf(NO_EVENT_LINE), null);
  // אידמפוטנטיות: הרצה שנייה לא משנה כלום
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

/* ---------- הזרמה: החלק שבלעדיו כל השאר לא שווה כלום ---------- */

function streamAll(deltas: string[], allow = {}): { out: string; redactions: string[] } {
  const s = new GuardedTextStream(allow);
  let out = '';
  for (const d of deltas) out += s.push(d);
  out += s.end();
  return { out, redactions: s.redactions };
}

test('מחיר שנחתך בין שני delta נתפס בכל זאת', () => {
  // בדיוק הצורה שבה סטרימינג מגיע: המספר בחתיכה אחת, המטבע בבאה
  const { out, redactions } = streamAll(['מלון במרכז עולה ', 'בערך 4', '50', ' ש״ח', ' ללילה.']);
  assert.ok(redactions.length > 0);
  assert.ok(!out.includes('450'));
  assert.ok(!out.includes('ש״ח'));
});

test('בהזרמה השורה הכנה נאמרת פעם אחת, לא פעם לכל משפט', () => {
  // באג אמיתי שנתפס בהרצת הדגמה: כל משפט משתחרר בקריאה נפרדת לפילטר,
  // ולכן מונה מקומי חשב בכל פעם שהוא הראשון - והמטייל קיבל את אותו
  // משפט התנצלות פעמיים ברצף.
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

/* ---------- שמירה על הנוסח: הטסט שמונע חזרה של "הזול ביותר" ---------- */

/**
 * שמירת הנוסח, כשומר מחלקה ולא כמשמעת.
 *
 * הסריקה מכוונת ל**קופי שאנחנו מציגים כטענה שלנו על חיפוש** - רכיבי
 * הממשק ושכבת ההזמנות. שני אזורים מוחרגים במפורש, ולא מטעמי נוחות:
 *
 * - `src/data/**` - פרוזה עורכית שאדם כתב על **יעדים** ("היעד הזול
 *   ביותר באירופה" על בולגריה). זו לא טענת מחיר על מלון ולא תוצאה של
 *   חיפוש, והיא נחקרה ידנית. שינוי שלה הוא החלטה עורכית על הקטלוג,
 *   ולא עניינו של הפיצ׳ר הזה.
 * - טקסט פרומפט ותופסי regex - שם הביטוי מופיע דווקא כדי **לאסור**
 *   אותו. סריקה שמפילה את האיסור על עצמו היא סריקה חסרת תועלת.
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
        // שורת הערה אינה קופי שמוצג למישהו
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
