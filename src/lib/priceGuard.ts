/**
 * ---------- שומר המחירים: מה שהמודל לא יוכל לומר, גם אם ינסה ----------
 *
 * ## למה זה קיים ולא עוד סעיף בפרומפט
 *
 * לסוכן אין בהקשר שלו **שום** נתון על מלונות: לא שם, לא מחיר, לא
 * זמינות. לכן כל מספר מחיר שהוא יכתוב הוא בהכרח המצאה. הפרומפט אוסר
 * את זה מזמן, והיומן של הפרויקט הזה מתעד שלושה מקרים שבהם איסור
 * בפרומפט לא החזיק - מרחקי הליכה, רשימות ערים, וכשרות שהתנדבה לפרוזה.
 * המסקנה שנכתבה שם היא הכלל שמופעל כאן: **כשהמודל מתעלם מכלל, לא
 * מנסחים את הכלל חזק יותר - מזיזים אותו למקום שבו הוא לא בחירה.**
 *
 * הפילטר הזה רץ על **כל** תשובה, בשרת, אחרי המודל ולפני המשתמש. הוא
 * דטרמיניסטי, נבדק ביחידות, ואי אפשר לשכנע אותו.
 *
 * ## העיקרון היחיד: מספר מותר רק אם המטייל אמר אותו
 *
 * במקום להכריע מה "סביר", הרשימה הלבנה היא **מה שהמשתמש עצמו כתב**.
 * מטייל שאמר "התקציב שלי 400 ש״ח ללילה" יכול לקבל את 400 בחזרה; מספר
 * שלא נאמר בשיחה לא יכול לצאת ממנה. אותו דבר לשמות: שם מלון מותר רק
 * אם הוא כבר סיכה בטיול או שהמטייל הקליד אותו.
 *
 * ## מה זה במפורש **לא** תופס
 *
 * שם מלון בדוי בכתיב עברי בלי שום מילת עוגן ("המלון ירושלים של מטה").
 * אין דרך להבדיל בין זה לבין פרוזה רגילה בלי מודל שני, וזה לא יהיה
 * דטרמיניסטי. שלוש שכבות אחרות מכסות את הסיכון הזה: אין לו נתוני
 * מלונות מהיכן להמציא, הפרומפט אוסר, וכל תשובה על לינה מגיעה עם כרטיס
 * חיפוש אמיתי שהמטייל לוחץ עליו.
 */

import { PREMIUM_PRICE_ILS } from './plans';

/** הנוסח שמחליף טענה שנחתכה. חייב לעבור את הפילטר בעצמו - יש טסט. */
export const NO_PRICE_LINE =
  'אני לא יכול לבדוק מחירים או זמינות בעצמי, ולכן לא אנקוב במספרים - החיפוש שמצורף כאן מראה את המצב האמיתי אצל הספק.';

/** אותו דבר, כשאין כרטיס חיפוש בתור הזה */
export const NO_PRICE_LINE_BARE =
  'אני לא יכול לבדוק מחירים או זמינות בעצמי, ולכן לא אנקוב במספרים - חיפוש אצל הספק יראה את המצב האמיתי.';

/**
 * ההחלפה לטענה על אירוע או סגירה. **חייבת להיות נפרדת מזו של המחיר**:
 * משפט על פסטיבל שמוחלף ב"אני לא יכול לבדוק מחירים" קורא כמו תקלה,
 * ולא כמו תשובה כנה.
 */
export const NO_EVENT_LINE =
  'אין לי מידע רשום על אירועים או סגירות בתאריכים האלה, ואני לא רוצה לנחש - כדאי לבדוק מקומית לקראת הנסיעה.';

/**
 * ההחלפה לטענת כשרות שלא נסמכת על שום דבר בקטלוג שלנו - ראו
 * `KOSHER_WORD`/`KOSHER_ASSERTION` למטה. **זה לא כלל נוסף בפרומפט אלא
 * מבנה**: גם אם המודל כתב משפט כזה, הוא לא יוצא מהסוכן, מאותה סיבה
 * בדיוק שמחיר בדוי לא יוצא.
 */
export const NO_KOSHER_LINE =
  'לגבי כשרות אני יכול להתייחס רק למקומות שמאומתים אצלנו בקטלוג, ואין לי נתון כזה כרגע - כדאי לוודא מול המקום עצמו, או לשאול על עיר אחרת שכן מכוסה אצלנו.';

/**
 * ההחלפה לטענת שעות/מחיר-כניסה/קיום שלא צמודה לציטוט - ראו `LOOKUP_ANCHOR`.
 * מנוסחת בהיפוך למה שהייתה עד היום ("אין לי דרך לבדוק") כי עכשיו יש: אם
 * המודל לא באמת חיפש (או שכח לצטט), זו ההצעה הכנה - לא סירוב קבוע.
 */
export const NO_LOOKUP_LINE =
  'לא בדקתי את זה בפועל בתור הזה, ולכן לא אכתוב שעות, מחיר כניסה או אם המקום עדיין קיים מהזיכרון שלי - אפשר לבקש שאבדוק את זה עכשיו.';

/** לאיזו שורת החלפה שייך כל כלל */
const CATEGORY: Record<string, 'price' | 'event' | 'kosher' | 'lookup'> = {
  superlative: 'price',
  availability: 'price',
  'room-type': 'price',
  stars: 'price',
  'per-unit-price': 'price',
  'currency-amount': 'price',
  'price-claim': 'price',
  'property-name': 'price',
  'event-claim': 'event',
  'closure-claim': 'event',
  'kosher-claim': 'kosher',
  'hours-claim': 'lookup',
  'existence-claim': 'lookup',
};

export interface GuardReplacements {
  price?: string;
  event?: string;
  kosher?: string;
  lookup?: string;
}

/** מטבעות. לבד הם לגיטימיים לחלוטין ("המטבע הוא אירו") - מספר לידם לא. */
const CURRENCY =
  /(₪|€|\$|£|\bILS\b|\bEUR\b|\bUSD\b|שקלים|שקל|ש"ח|ש״ח|אירו|יורו|דולרים|דולר)/;

/** מילות מחיר חזקות. "עולה" לא נכנס בכוונה - "המסלול עולה 300 מטר". */
const MONEY_WORD = /(מחיר|מחירים|עלות|עלויות|תעריף|תעריפים|דמי כניסה|כמה עולה|יעלה לכם|בתקציב של)/;

/** מספר שמוצמד ליחידת תמחור. תופס "400 ללילה" ולא "3 לילות". */
const PER_UNIT =
  /\d[\d.,]*\s*(?:₪|€|\$|£|ש"ח|ש״ח|שקל\w*|אירו|יורו|דולר\w*)?\s*(ללילה|לאדם|לזוג|לחדר|לאורח|בלילה|לכניסה)/;

/** דירוג כוכבים - אין לנו מלונות בדאטה, ולכן כל כוכב הוא המצאה */
const STARS = /(\d\s*כוכבים|חמישה כוכבים|ארבעה כוכבים|שלושה כוכבים|5 כוכבים|4 כוכבים)/;

/** סוגי חדר וארוחות - טענה על מלאי שאין לנו */
const ROOM_TYPE =
  /(סוויטה|סוויטות|חדר זוגי|חדר כפול|חדר משפחתי|חדר טווין|חצי פנסיון|פנסיון מלא|ארוחת בוקר כלולה|כולל ארוחת בוקר|הכל כלול|all[- ]inclusive)/i;

/**
 * זמינות. **מנוסח צר בכוונה**: "יום פנוי" בתוכנית הוא משפט תקין ונפוץ,
 * ולכן התופס דורש את המילה חדר/מקום/הזמנה לידו.
 */
const AVAILABILITY =
  /(חדרים פנויים|חדר פנוי|יש זמינות|אין זמינות|נותרו \d|נותר חדר|מקומות אחרונים|אזל|אזלו|חדרים אחרונים|זמין להזמנה|תפוס בתאריכים)/;

/**
 * "הזול ביותר" וחבריו. אסור **תמיד** ובלי רשימה לבנה: אנחנו לא סורקים
 * את כל הספקים ואי אפשר לטעון את זה, גם לא כתשובה לשאלה ישירה. משפט
 * שנחתך כאן מוחלף בהודעה הכנה, שאומרת בדיוק את מה שאמת.
 */
const SUPERLATIVE =
  /(הזול ביותר|הזולה ביותר|הזולים ביותר|הזולות ביותר|הכי זול|הכי זולה|המחיר הטוב ביותר|המשתלם ביותר|המשתלמת ביותר|העסקה הטובה ביותר|cheapest|best price|lowest price)/i;

/* ---------- אירועים ומועדים ---------- */

/** מילים שמסמנות שמדובר באירוע */
const EVENT_WORD =
  /(פסטיבל|קרנבל|ביאנלה|אוקטוברפסט|מצעד|תהלוכה|יריד|קונצרט|הופעה|הופעות|מופע|מופעים|תערוכה|מרתון|חגיגות|טקס|אירוע|אירועים)/;

/** מילים שמסמנות טענת סגירה */
const CLOSURE_WORD = /(סגור|סגורה|סגורים|סגורות|סגירה|סגירות|ייסגר|תיסגר|נסגר|שובת|שביתה)/;

/**
 * מועד **מסוים**: שם חודש, שנה או תאריך מספרי.
 *
 * במכוון אין כאן "השנה" או "בקיץ" לבדן. "יש בעיר הרבה אירועים לאורך
 * השנה" הוא משפט תקין לגמרי, וחסימה שלו הייתה הופכת את השומר לרעש
 * שמישהו יכבה תוך שבוע. "השנה" נספר רק כשהוא צמוד לפועל התקיימות.
 */
const SPECIFIC_TIME =
  /(בינואר|בפברואר|במרץ|באפריל|במאי|ביוני|ביולי|באוגוסט|בספטמבר|באוקטובר|בנובמבר|בדצמבר|ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|20\d{2}|\d{1,2}[./]\d{1,2})/;

/** "מתקיים השנה" / "יתקיים ב-" - טענה על עצם ההתרחשות */
const HAPPENING =
  /(מתקיים|מתקיימת|מתקיימים|יתקיים|יתקיימו|נערך|ייערך|חוזר)\s*(השנה|ב-?\d|בתאריך)|השנה\s*(מתקיים|יתקיים|נערך)/;

/** מילות עוגן שאחריהן מגיע שם של בית מלון */
const STAY_WORD = /(מלון|המלון|הוסטל|אכסניה|אכסניית|וילה|ריזורט|בית הארחה)/;

/** ריצה לטינית שנושאת מילת מלון - הצורה הנפוצה של שם נכס */
const LATIN_PROPERTY =
  /\b[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*\s*\b(Hotel|Hostel|Hostal|Inn|Resort|Suites?|Apartments?|Guesthouse|Motel|Riad|Ryokan|Palace|Plaza)\b|\b(Hotel|Hostel|Resort|Inn)\s+[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*/;

/** מילת עוגן + שם לטיני או שם במרכאות: "מלון Devin", 'מלון "הגלים"' */
const NAMED_STAY = new RegExp(
  `${STAY_WORD.source}\\s+(?:[A-Z][\\w&'.-]*|["״'][^"״']{2,40}["״'])`,
);

/* ---------- כשרות: לא מהזיכרון, לא מחיפוש - רק מהקטלוג ---------- */

/**
 * מילות כשרות. **אותה רשימה** כמו `KOSHER_ASK` ב-`grounding.ts` -
 * ראו `kosherIntentText` שם, שהיא הגרסה המשותפת. מוגדרת כאן שוב ולא
 * מיובאת, באותו סגנון שהקובץ הזה כבר מגדיר את כל התבניות שלו מקומית.
 */
const KOSHER_WORD =
  /כשר(ו|י|ה|ות)?|מהדרין|גלאט|בד["״'׳]?ץ|הכשר|השגחה|חב["״'׳]?ד|בית חב|kosher|chabad|glatt|hechsher/i;

/**
 * מילות **טענה** - לא כל משפט שמזכיר כשרות הוא טענה שצריך לחסום.
 * "כדאי לוודא כשרות מול המקום" היא הזהרה תקינה בלי שום עוגן; "יש שם
 * קהילה יהודית גדולה ומסעדות כשרות" היא טענה על מציאות שצריך לגבות.
 * בלי המילים האלה - השער לא נסגר, ולתזכורת הכנה יש מקום להישאר.
 */
const KOSHER_ASSERTION =
  /(יש\s|ישנ(ם|ה)|נמצא(ת|ים)?|ממוקמ(ת|ים)?|קיימ(ת|ים)|מציע(ה)?|מגיש(ה)?|מומלץ|ידוע(ה)?\s*(כ|בתור)|מרכז|רובע|שכונה|קהילה|בית כנסת|מסעדה כשר|חנות כשר|אין\s*(שם\s*)?(כשרות|מסעד|חנויות))/;

/* ---------- חיפוש חי: שעות/מחיר-כניסה/קיום, רק עם ציטוט צמוד ---------- */

/**
 * **הציטוט חייב להיות באותו משפט** - כי הזרמה היא משפט-אחר-משפט
 * (`GuardedTextStream`), ואי אפשר "לחכות למשפט הבא" באמצע סטרימינג.
 * הפרומפט מלמד את המודל לכתוב עובדה+ציטוט כמשפט אחד; מה שלא עומד בזה
 * נחתך, וזה הכיוון הבטוח - עדיף לאבד עובדה מגובה מלהראות אחת שלא.
 */
export const LOOKUP_ANCHOR =
  /נבדק ב-?\s*\d{1,2}[./]\d{1,2}([./]\d{2,4})?|נבדק היום|checked\s+(on|today)/i;

/** שעות פעילות - מספר עם נקודתיים, או "פתוח בין"/"נסגר ב-" */
const HOURS_CLAIM =
  /\d{1,2}:\d{2}|שעות\s*ה?(פתיחה|פעילות)\s*(הן|הם)?|פתוח(ה)?\s*(בין|מ-?\d)|נסגר(ת)?\s*ב-?\d{1,2}(:\d{2})?/;

/** האם מקום מסוים עדיין קיים/פתוח, או נסגר לצמיתות */
const EXISTENCE_CLAIM =
  /(עדיין\s*(פתוח|קיים|פועל|קיימת|פועלת)|נסגר(ה)?\s*לצמיתות|כבר לא (קיים|פועל)|is\s+(still\s+)?(open|closed)|has closed permanently|no longer exists)/i;

/**
 * הקשר של דמי כניסה - צר ומכוון, כדי שלא יתערב עם מחירי לינה.
 * `(ה)?` לפני "כניסה": "דמי הכניסה" עברית תקנית לגמרי, לא רק "דמי כניסה".
 */
const TICKET_CONTEXT =
  /(דמי\s*ה?כניסה|כרטיס\s*ה?כניסה|מחיר\s*ה?כניסה|עלות\s*ה?כניסה|entrance fee|admission (fee|price)|ticket price)/i;

export interface GuardAllowlist {
  /** טקסטים שהמטייל עצמו כתב בשיחה (כולל תיאורי תמונות שהוא צירף) */
  userText?: string;
  /** שמות סיכות שכבר שמורות בטיול - המטייל נתן אותן */
  pinNames?: string[];
  /**
   * שמות האירועים ותקופות הסגירה ש**הוחזרו מהדאטה בתור הזה**
   * (`city_date_notes`). זו הרשימה הלבנה של טענות על אירועים ומועדים.
   *
   * הכלל שנגזר מזה: משפט שמדבר על אירוע או סגירה עם מועד מסוים מותר
   * רק אם הוא **נוקב בשם הרשומה**. זה לא רק שומר - זה גם דוחף לייחוס:
   * "פרראגוסטו ב-15 באוגוסט" עובר, "ב-15 באוגוסט הרבה דברים סגורים"
   * לא, וזו התשובה הטובה יותר ממילא. כשהרשימה ריקה - כלומר לא הוחזר
   * כלום מהדאטה - שום טענה כזאת לא עוברת.
   */
  eventNames?: string[];
  /**
   * שמות שמותר לגבות בהם טענת כשרות: שמות מקומות כשרים ושמות ערים
   * **שנשלחו בפועל בתור הזה** - נבנה ב-`kosherAllowedNames` ב-grounding.ts
   * ומתעדכן בכל איטרציה, כי `set_preferences` יכול להדליק כשרות באמצע
   * תור. ריק = אף טענת כשרות לא עוברת, גם אם השער הכללי פתוח.
   */
  kosherNames?: string[];
}

export interface GuardResult {
  text: string;
  /** מה נחתך, לצורך לוג ובדיקות. ריק = כלום לא נחתך. */
  redactions: string[];
  /** אילו שורות החלפה הושתלו בקריאה הזאת (ראו `alreadyReplaced`) */
  replaced: Set<'price' | 'event' | 'kosher' | 'lookup'>;
}

/** כל רצף ספרות בטקסט */
const digitRuns = (s: string): string[] => s.match(/\d[\d.,]*/g)?.map((n) => n.replace(/[.,]$/, '')) ?? [];

/**
 * המספרים שמותר להחזיר: מה שהמטייל הקליד, ועוד מחיר הפרימיום - מספר
 * אמיתי ומאוחסן אצלנו, ואין סיבה שהסוכן לא יוכל לענות עליו.
 */
function allowedNumbers(allow: GuardAllowlist): Set<string> {
  const set = new Set<string>(digitRuns(allow.userText ?? ''));
  // **רק הצורות המדויקות.** הגרסה הראשונה הוסיפה גם את המחיר המעוגל,
  // וזה הכשיר בשקט את המספר "20" בכל תשובה באתר - טסט על הערת יום עם
  // "כ-20 יורו לכניסה" הוא מה שתפס את זה.
  for (const form of [
    String(PREMIUM_PRICE_ILS),
    String(PREMIUM_PRICE_ILS).replace('.', ','),
    PREMIUM_PRICE_ILS.toFixed(2),
    PREMIUM_PRICE_ILS.toFixed(2).replace('.', ','),
  ]) {
    set.add(form);
  }
  return set;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s"״'`.,-]/g, '');

/** האם כל המספרים בקטע הם מספרים שהמטייל עצמו נתן */
const numbersAreUserOwn = (segment: string, allowed: Set<string>): boolean => {
  const runs = digitRuns(segment);
  return runs.length > 0 && runs.every((n) => allowed.has(n));
};

/** האם השם שהופיע כאן הוא שם שהמטייל נתן (סיכה או הקלדה שלו) */
function nameIsUserOwn(segment: string, allow: GuardAllowlist): boolean {
  const hay = norm(`${allow.userText ?? ''} ${(allow.pinNames ?? []).join(' ')}`);
  if (!hay) return false;
  // כל ריצה לטינית של 3+ תווים בקטע צריכה להופיע במה שהמטייל נתן
  const tokens = segment.match(/[A-Za-z][A-Za-z&'.-]{2,}/g) ?? [];
  const named = tokens.filter((t) => !/^(hotel|hostel|resort|inn|suites?|apartments?|the|and)$/i.test(t));
  if (named.length === 0) {
    // שם במרכאות בכתיב עברי
    const quoted = segment.match(/["״']([^"״']{2,40})["״']/);
    return quoted ? hay.includes(norm(quoted[1])) : false;
  }
  return named.every((t) => hay.includes(norm(t)));
}

/**
 * בודק משפט אחד. מחזיר את שם הכלל שנשבר, או null אם הוא נקי.
 *
 * הסדר לא משנה לתוצאה (משפט נחתך בכל מקרה) אבל כן לשם שנרשם בלוג,
 * ולכן הכללים הקטגוריים קודמים - הם המדויקים יותר.
 */
export function violationOf(sentence: string, allow: GuardAllowlist = {}): string | null {
  const allowed = allowedNumbers(allow);

  /*
    כשרות קודם לכול. שער הכשרות (`kosherAllowed` ב-grounding.ts) יכול
    להיות פתוח בזמן שהעיר הספציפית שהמודל מדבר עליה לא נמצאת בכלל
    בקטלוג - וזה בדיוק המצב שבו הוא נוטה להשלים גיאוגרפיה כשרה מהזיכרון.
    הבדיקה כאן לא סומכת על השער; היא בודקת אם המשפט **הזה** נשען על שם
    אמיתי מהדאטה של התור הזה.
  */
  if (KOSHER_WORD.test(sentence) && KOSHER_ASSERTION.test(sentence) && !namesAllowedKosher(sentence, allow)) {
    return 'kosher-claim';
  }

  if (SUPERLATIVE.test(sentence)) return 'superlative';
  if (AVAILABILITY.test(sentence)) return 'availability';

  if (ROOM_TYPE.test(sentence)) {
    const m = sentence.match(ROOM_TYPE)![0];
    if (!norm(allow.userText ?? '').includes(norm(m))) return 'room-type';
  }

  if (STARS.test(sentence) && !numbersAreUserOwn(sentence.match(STARS)![0], allowed)) {
    return 'stars';
  }

  if (PER_UNIT.test(sentence) && !numbersAreUserOwn(sentence.match(PER_UNIT)![0], allowed)) {
    return 'per-unit-price';
  }

  const hasDigit = /\d/.test(sentence);
  /*
    דמי כניסה מצוטטים חורגים מהמחסום הכללי - **רק הם**, ורק כשהם צמודים
    לציטוט. `ROOM_TYPE`/`STARS`/`PER_UNIT` שנבדקו למעלה כבר תפסו כל
    ניסוח שנשמע כמו לינה, ולכן הפריצה הזאת לא יכולה "לעקוף" אותם -
    ההיתר מגיע רק אחרי שהם כבר לא מצאו כלום.
  */
  const admissionOk = hasDigit && TICKET_CONTEXT.test(sentence) && LOOKUP_ANCHOR.test(sentence);
  if (hasDigit && CURRENCY.test(sentence) && !numbersAreUserOwn(sentence, allowed) && !admissionOk) {
    return 'currency-amount';
  }
  if (hasDigit && MONEY_WORD.test(sentence) && !numbersAreUserOwn(sentence, allowed) && !admissionOk) {
    return 'price-claim';
  }

  const property = sentence.match(LATIN_PROPERTY) ?? sentence.match(NAMED_STAY);
  if (property && !nameIsUserOwn(property[0], allow)) return 'property-name';

  /**
   * טענה על אירוע או סגירה עם מועד מסוים.
   *
   * מותרת רק אם המשפט נוקב בשם רשומה שהוחזרה מהדאטה בתור הזה. כשלא
   * הוחזר כלום - אין לו על מה להישען, וכל טענה כזאת היא מהזיכרון שלו.
   */
  const timed = SPECIFIC_TIME.test(sentence) || HAPPENING.test(sentence);
  if (timed && !namesStoredEvent(sentence, allow)) {
    if (EVENT_WORD.test(sentence)) return 'event-claim';
    if (CLOSURE_WORD.test(sentence)) return 'closure-claim';
  }

  /*
    שעות פתיחה וקיום - אותו עיקרון כמו אירועים, אבל העוגן כאן הוא ציטוט
    ולא שם רשומה: אין "דאטה" קבועה לגבות בה שעות פתיחה, יש רק חיפוש חי
    שקרה או לא קרה בתור הזה. ראו `LOOKUP_ANCHOR`.
  */
  if (HOURS_CLAIM.test(sentence) && !LOOKUP_ANCHOR.test(sentence)) return 'hours-claim';
  if (EXISTENCE_CLAIM.test(sentence) && !LOOKUP_ANCHOR.test(sentence)) return 'existence-claim';

  return null;
}

/** האם המשפט נוקב בשם של רשומה שהוחזרה מהדאטה בתור הזה */
function namesStoredEvent(sentence: string, allow: GuardAllowlist): boolean {
  const names = allow.eventNames ?? [];
  if (names.length === 0) return false;
  const hay = norm(sentence);
  return names.some((n) => n.trim().length >= 3 && hay.includes(norm(n)));
}

/** האם המשפט נוקב בשם כשר אמיתי (מקום או עיר) שהוחזר מהדאטה בתור הזה */
function namesAllowedKosher(sentence: string, allow: GuardAllowlist): boolean {
  const names = allow.kosherNames ?? [];
  if (names.length === 0) return false;
  const hay = norm(sentence);
  return names.some((n) => n.trim().length >= 2 && hay.includes(norm(n)));
}

/**
 * פיצול למשפטים. שומר את הסימן בסוף המשפט כדי שהטקסט המורכב מחדש יהיה
 * זהה למקור כשאין מה לחתוך - יש טסט על זה.
 */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?:\n])/).filter((s) => s !== '');
}

/**
 * מריץ את הפילטר על טקסט. משפט שנשבר מוחלף בשורה הכנה - **פעם אחת**,
 * כדי שתשובה עם שלוש טענות מחיר לא תהפוך לשלוש חזרות של אותו משפט.
 */
export function guardText(
  text: string,
  allow: GuardAllowlist = {},
  replacements: GuardReplacements = {},
  /**
   * לאילו קטגוריות כבר נאמרה השורה הכנה **באותה תשובה**.
   *
   * זה לא פרט: בהזרמה כל משפט עובר בקריאה נפרדת, ולכן מונה מקומי היה
   * חושב בכל פעם שהוא הראשון - וזה בדיוק מה שקרה בהרצת הדגמה, שבה
   * המשתמש קיבל את אותו משפט התנצלות פעמיים ברצף. הספירה היא לפי
   * קטגוריה, כדי שתשובה שנגעה גם במחיר וגם באירוע תסביר את שניהם.
   */
  alreadyReplaced: Set<'price' | 'event' | 'kosher' | 'lookup'> = new Set(),
): GuardResult {
  const line = {
    price: replacements.price ?? NO_PRICE_LINE_BARE,
    event: replacements.event ?? NO_EVENT_LINE,
    kosher: replacements.kosher ?? NO_KOSHER_LINE,
    lookup: replacements.lookup ?? NO_LOOKUP_LINE,
  };
  const redactions: string[] = [];
  const replacedHere = new Set<'price' | 'event' | 'kosher' | 'lookup'>();
  const out = splitSentences(text).map((sentence) => {
    if (!sentence.trim()) return sentence;
    const bad = violationOf(sentence, allow);
    if (!bad) return sentence;
    redactions.push(bad);
    const cat = CATEGORY[bad] ?? 'price';
    if (alreadyReplaced.has(cat) || replacedHere.has(cat)) {
      return sentence.match(/\n+$/)?.[0] ?? '';
    }
    replacedHere.add(cat);
    // הפיצול משאיר את הרווח שאחרי הנקודה בתחילת המשפט הבא, ולכן אין
    // צורך להוסיף כאן רווח - רק לשמר שורות חדשות שנספחו לסוף.
    const tail = sentence.match(/\s+$/)?.[0] ?? '';
    return line[cat] + tail;
  });
  return { text: out.join(''), redactions, replaced: replacedHere };
}

/**
 * גרסת ה"הערות": חותכת את **הפסוקית** ולא את המשפט, ובלי להשתיל נוסח
 * התנצלות.
 *
 * הערת יום היא לא שיחה - אין בה מקום למשפט "אני לא יכול לבדוק מחירים",
 * והיא בדרך כלל משפט אחד עם פסיקים, כך שהחלפה ברמת משפט הייתה מוחקת גם
 * את החלק המועיל ("הקתדרלה שווה ביקור, כ-20 יורו לכניסה" הופך ל-
 * "הקתדרלה שווה ביקור"). זו גם ההתנהגות שכבר קיימת שם למספרי קווים:
 * מסירים את הפרט שאין לו כיסוי ומשאירים את המשפט.
 */
export function stripClaims(text: string, allow: GuardAllowlist = {}): GuardResult {
  const parts = text.split(/([,;.!?:\n]+)/);
  const redactions: string[] = [];
  let out = '';
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i];
    const sep = parts[i + 1] ?? '';
    if (!clause.trim()) {
      out += clause + sep;
      continue;
    }
    const bad = violationOf(clause, allow);
    if (bad) {
      redactions.push(bad);
      continue; // הפסוקית והמפריד שאחריה יוצאים יחד
    }
    out += clause + sep;
  }
  return { text: out.replace(/[\s,;]+$/, '').trim(), redactions, replaced: new Set() };
}

/**
 * ---------- הזרמה בטוחה ----------
 *
 * הטקסט מוזרם למשתמש תוך כדי כתיבה, ולכן אי אפשר לסנן "בסוף": מה שנשלח
 * נשלח. הפולט הזה משחרר **רק משפטים שלמים**, ולכן ביטוי מחיר לא יכול
 * להיחתך לשניים ולעבור חצי-חצי ("400" עכשיו, "ש״ח" אחר כך).
 *
 * העלות היא השהיה של משפט אחד, לא של התשובה כולה. במשפט פתולוגית ארוך
 * (יותר מ-`HARD_CAP` בלי סימן פיסוק) משחררים בכל זאת, אבל **מחזיקים
 * זנב** של כמה תווים, כדי שצמד "מספר + מטבע" שנחתך בגבול יישאר יחד.
 */
const HARD_CAP = 700;
const TAIL_KEEP = 48;

export class GuardedTextStream {
  private acc = '';
  private emitted = 0;
  private readonly allow: GuardAllowlist;
  private readonly replacements: GuardReplacements;
  /** כל שורה כנה נאמרת פעם אחת לתשובה, גם כשהיא מורכבת מכמה flush */
  private readonly replacedOnce = new Set<'price' | 'event' | 'kosher' | 'lookup'>();

  readonly redactions: string[] = [];

  // שדות מפורשים ולא constructor parameter properties: הטסטים רצים
  // ב-`--experimental-strip-types`, שלא תומך בתחביר הזה.
  constructor(allow: GuardAllowlist, replacements: GuardReplacements = {}) {
    this.allow = allow;
    this.replacements = replacements;
  }

  /** מוסיף delta ומחזיר את מה שמותר לשלוח עכשיו (יכול להיות ריק) */
  push(delta: string): string {
    this.acc += delta;
    const pending = this.acc.slice(this.emitted);
    let cut = pending.lastIndexOf('\n') + 1;
    for (const mark of ['. ', '! ', '? ', ': ', '.\n']) {
      const at = pending.lastIndexOf(mark);
      if (at >= 0) cut = Math.max(cut, at + mark.length);
    }
    // סוף משפט בסוף החוצץ בלי רווח אחריו נחשב גם הוא. הספרה שלפני
    // מוחרגת כדי ש-"19.90" לא ייחתך באמצע ל-"19." ול-"90 ש״ח".
    if (/(?<!\d)[.!?:]$/.test(pending)) cut = Math.max(cut, pending.length);
    if (cut === 0 && pending.length > HARD_CAP) {
      // משפט פתולוגי בלי פיסוק. משחררים ממנו רק אם **כולו** נקי - אחרת
      // מחזיקים הכול, כי חיתוך באמצע יכול להפריד מספר מהמטבע שלו ואז
      // שני החצאים עוברים בנפרד. עדיף להשהות מקרה קצה מלהחמיץ טענה.
      if (violationOf(pending, this.allow)) return '';
      cut = pending.length - TAIL_KEEP;
    }
    if (cut <= 0) return '';
    return this.flush(this.emitted + cut);
  }

  /** משחרר את מה שנשאר. נקרא פעם אחת בסוף הזרם. */
  end(): string {
    return this.flush(this.acc.length);
  }

  private flush(to: number): string {
    const chunk = this.acc.slice(this.emitted, to);
    this.emitted = to;
    if (!chunk) return '';
    const res = guardText(chunk, this.allow, this.replacements, this.replacedOnce);
    for (const cat of res.replaced) this.replacedOnce.add(cat);
    this.redactions.push(...res.redactions);
    return res.text;
  }
}
