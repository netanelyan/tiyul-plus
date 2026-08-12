import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * ---------- מי החליט שזאת ברטיסלבה? ----------
 *
 * נתנאל הקליד `ברסלוונה`. הסוכן החליט בשקט שזו ברטיסלבה, בנה מסלול
 * יומיים ויצר טיול. אף שורת קוד לא הייתה מעורבת בהחלטה הזאת:
 * `findDestination` דורש התאמת תת-מחרוזת מדויקת, ולכן הוא לא זיהה כלום -
 * **פרשנות השם קרתה כולה בתוך המודל**, מול אינדקס של 166 יעדים, בלי
 * שום שלב שאפשר לכתוב לו טסט.
 *
 * הקובץ הזה הוא אותו דפוס שכבר עבד כאן שלוש פעמים (`priceGuard`,
 * `filterKosherUnlessOptedIn`, `modelRoute`): **ערובה מבנית במקום
 * משמעת של פרומפט.** ההתאמה מחושבת בקוד, הפסק נמסר למודל כעובדה, ובמצב
 * "כמה אפשרויות" הכלים שבוחרים עיר פשוט **נחסמים לתור הזה** - כלומר
 * המודל לא יכול לבחור גם אם ירצה.
 *
 * ## שלוש התוצאות, בדיוק כפי שנתנאל ניסח אותן
 *
 * | תוצאה | מה קורה |
 * |---|---|
 * | `one` - התאמה אחת ברורה | משתמשים בה, ואומרים את זה במשפט קצר |
 * | `many` - כמה סבירות | שואלים באיזו, ומציעים אותן. הכלים חסומים |
 * | *כלום קרוב* | לא מחזירים פסק בכלל - זו מילה רגילה או עיר שאיננו מכסים, והכלל הקיים ("לא מכוסה, הנה מה שכן") מטפל בה |
 *
 * ## למה לא מחזירים `none` מפורש
 *
 * כי אי אפשר להבדיל בלי מודל בין "עיר שלא כיסינו" לבין מילה עברית
 * רגילה. טוקן שאין לו שום שכן קרוב בקטלוג פשוט לא מדווח - וזה הכיוון
 * הבטוח לטעות בו: פסק שגוי על מילה רגילה היה עוצר שיחה תקינה.
 */

/* ---------- נורמליזציה ---------- */

/** אותיות סופיות - כדי ש"וינ**ה**" ו"וינ**ה**" ייראו אותו דבר גם אחרי חיתוך */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * אותיות שימוש בתחילת מילה. `ב`/`ל`/`מ`/`ה`/`ו`/`ש`/`כ` הן הצורה שבה
 * ישראלי כותב עיר ברוב המשפטים ("בברצלונה", "לוינה"), ובלעדיהן כל
 * מרחק עריכה מתחיל בחוב של תו אחד.
 *
 * **נשמרת גם הצורה המלאה**: "מרוקו" מתחילה ב-מ׳ שאיננה אות שימוש, אז
 * ההשוואה נעשית מול שתי הצורות ונלקח הטוב מביניהן.
 */
const PREFIXES = /^[בלמהושכ]/;

export function normalizeName(s: string): string {
  return (s ?? '')
    .replace(/[֑-ׇ]/g, '') // ניקוד וטעמים
    .replace(/["'`״׳.,()\-–—]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** שתי הצורות שאותן משווים: כמו שנכתב, וגם בלי אות שימוש פותחת */
function forms(token: string): string[] {
  const n = normalizeName(token);
  const out = [n];
  // מ-4 ומעלה, כי "ביפן" הוא ארבע אותיות ו"יפן" הוא התשובה. בגרסה עם
  // הסף על 5 המטייל שכתב "שבוע ביפן" קיבל "הבנתי יפן (כתבת ביפן)".
  // עד שתי אותיות, כי "ולירושלים" ו"ובוינה" הן עברית רגילה.
  let cur = n;
  for (let i = 0; i < 2; i++) {
    if (cur.length >= 4 && PREFIXES.test(cur)) {
      cur = cur.slice(1);
      out.push(cur);
    } else break;
  }
  return out;
}

/* ---------- מרחק עריכה ---------- */

/**
 * Damerau-Levenshtein (עם החלפת שכנים).
 *
 * ההחלפה חשובה כאן ולא קישוט: `ברסלוונה` מול `ברצלונה` היא בדיוק
 * שגיאת הקלדה שבה אות אחת הוחלפה ואחת הוכפלה, וזה גם הדפוס של
 * "טיסלבה"/"טילסבה".
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let cur: number[] = [];
  let before: number[] = prev2;
  for (let i = 1; i <= a.length; i++) {
    cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, before[j - 2] + cost);
      }
      cur[j] = v;
    }
    before = prev;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * כמה שגיאות מותרות למילה באורך נתון.
 *
 * **סולם ולא מספר קבוע**, כי שתי שגיאות במילה בת ארבע אותיות הן מילה
 * אחרת לגמרי, ובמילה בת תשע הן הקלדה. הסולם הזה הוא מה שמונע מ"קייב"
 * (עיר שאיננו מכסים) להיתפס בטעות כ"קרקוב".
 */
function tolerance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

/* ---------- הקטלוג, פעם אחת ---------- */

export interface NameEntry {
  /** slug של יעד. למדינה - היעד הראשון שלה, בדיוק כמו `findDestination` */
  slug: string;
  /** השם שיוצג למטייל */
  label: string;
  /** מה שמשווים מולו */
  norm: string;
}

/** נבנה פעם אחת לתהליך - הקטלוג סטטי */
let entriesCache: NameEntry[] | null = null;
export function nameEntries(): NameEntry[] {
  if (entriesCache) return entriesCache;
  const out: NameEntry[] = [];
  const push = (slug: string, label: string, raw: string) => {
    const norm = normalizeName(raw);
    if (norm.length >= 3) out.push({ slug, label, norm });
  };
  for (const d of destinations) {
    push(d.slug, d.name, d.name);
    if (d.nameLocal) for (const part of d.nameLocal.split('/')) push(d.slug, d.name, part);
    push(d.slug, d.name, d.slug.replace(/-/g, ' '));
  }
  for (const c of countries) {
    const first = destinations.find((d) => d.countrySlug === c.slug);
    if (!first) continue;
    push(first.slug, c.name, c.name);
    if (c.nameLocal) push(first.slug, c.name, c.nameLocal);
  }
  entriesCache = out;
  return out;
}

/**
 * שם שקיים בקטלוג כפי שהוא - אין כאן שום דבר לפרש.
 *
 * **גם מילה שלמה בתוך שם מורכב נחשבת מדויקת**, וזה לא פינוק: שם היעד
 * בקטלוג הוא "טוקיו והר פוג׳י", ובלי הכלל הזה הטוקן `טוקיו` לא היה
 * מדויק, היה נמדד מול הקטלוג כולו, ונופל על **טורקיה** במרחק 2. שלחתי
 * מטייל ליפן לתורכיה בבדיקה הראשונה של הקובץ הזה.
 */
let wordCache: Set<string> | null = null;
function catalogWords(): Set<string> {
  if (wordCache) return wordCache;
  const set = new Set<string>();
  for (const e of nameEntries()) {
    set.add(e.norm);
    for (const w of e.norm.split(' ')) if (w.length >= 3) set.add(w);
  }
  wordCache = set;
  return set;
}

export function isExactName(token: string): boolean {
  const set = catalogWords();
  return forms(token).some((f) => set.has(f));
}

/* ---------- מילים שאינן שמות מקום ---------- */

/**
 * מילים נפוצות שנשארות אחרי הסינון ועלולות ליפול קרוב לשם בקטלוג.
 * כל שורה כאן נמדדה על משפטים אמיתיים ולא נוחשה: "ויזה" נפלה על וינה,
 * "המלצה" על מלטה, "היסטוריה" על איסטריה.
 *
 * **הרשימה היא מסנן רעש, לא הערובה.** הערובה היא `cityGate`, שחוסם רק
 * כשהכלי בחר עיר שקשורה לטוקן - ולכן פסק רועש על מילה שאיש לא בחר
 * לפיה לא עושה דבר. הרשימה קצרה בכוונה: כל מילה כאן היא הזדמנות
 * להחמיץ שם אמיתי.
 */
const STOPWORDS = new Set(
  [
    'טיול', 'טיולים', 'מסלול', 'מסלולים', 'ימים', 'יומיים', 'שבוע', 'שבועיים', 'חופשה', 'נופש',
    'לטייל', 'לטוס', 'טיסה', 'טיסות', 'מלון', 'מלונות', 'לינה', 'ילדים', 'משפחה', 'זוגי',
    'תקציב', 'כשר', 'כשרות', 'שבת', 'מוזיאון', 'מסעדה', 'מסעדות', 'שופינג', 'קניות', 'חוף',
    'הרים', 'מפה', 'עצירה', 'עצירות', 'בבקשה', 'תודה', 'רוצה', 'רוצים', 'אפשר', 'אולי',
    'תבנה', 'תכנן', 'תוסיף', 'תוריד', 'תזיז', 'תעביר', 'תמחק', 'התכוונתי', 'התכוונו',
    'סליחה', 'טעות', 'במקום', 'בעצם', 'אמרתי', 'כתבתי', 'ביקשתי', 'לילות', 'קיץ', 'חורף',
    'אביב', 'סתיו', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'סופש',
    'לילה', 'בוקר', 'ערב', 'צהריים', 'שעה', 'שעות', 'דקות', 'רגוע', 'רגועה',
    'ויזה', 'המלצה', 'המלצות', 'היסטוריה', 'שמונה', 'שבעה', 'שישה', 'חמישה',
    'ארבעה', 'שלושה', 'עשרה', 'עשרים', 'טבע', 'אגמים', 'סים',
  ].map(normalizeName),
);

/** מילת עצירה בכל אחת מצורות המילה - "בלילה" נגזר ל"לילה" ונפסל בזכותה */
const isStopword = (token: string): boolean => forms(token).some((f) => STOPWORDS.has(f));

/* ---------- הפסק ---------- */

export interface NameVerdict {
  /** מה המטייל הקליד, כפי שהקליד */
  typed: string;
  kind: 'one' | 'many';
  /** במצב `one` - ההתאמה. במצב `many` - האפשרויות, לפי קרבה */
  options: { slug: string; label: string }[];
}

/** התאמות ייחודיות לפי slug, ממוינות לפי מרחק */
function bestMatches(token: string): { slug: string; label: string; dist: number }[] {
  const byslug = new Map<string, { slug: string; label: string; dist: number }>();
  for (const form of forms(token)) {
    for (const e of nameEntries()) {
      /*
        **הסבילות נגזרת מהקצר מבין השניים**, ובלי זה הקובץ הזה רועש.
        נמדד על עשר הודעות עברית רגילות: "המלצה" נפלה על מלטה, "והרבה"
        על ורשה, "בינוני" על יוון - כולן מילים בנות חמש-שש אותיות
        שנמדדו בסבילות שלהן מול שם קטלוג בן ארבע. שם קצר חייב התאמה
        קרובה יותר, אחרת כל מילה עברית שנייה היא יעד.
      */
      /*
        ובנוסף **שגיאה אחת לכל ארבע אותיות לכל היותר**. זה מה שסילק את
        הרעש שנשאר: "איטלקי"→איטליה, "רומנטי"→רומניה, "המלצה"→מלטה,
        "יין"→יפן - כולן שתי שגיאות במילה בת חמש-שש, כלומר שליש מהמילה.
        שגיאת הקלדה אמיתית היא שבר קטן מהמילה, וסיומת עברית פרודוקטיבית
        היא לא.
      */
      const tol = Math.min(
        tolerance(form.length),
        tolerance(e.norm.length),
        Math.floor(0.25 * Math.max(form.length, e.norm.length)),
      );
      // הפרש אורך גדול מהסבילות לא יכול להשתפר - חיסכון אמיתי על 166 יעדים
      if (Math.abs(e.norm.length - form.length) > tol) continue;
      const dist = editDistance(form, e.norm);
      if (dist > tol) continue;
      const prev = byslug.get(e.slug);
      if (!prev || dist < prev.dist) byslug.set(e.slug, { slug: e.slug, label: e.label, dist });
    }
  }
  return [...byslug.values()].sort((a, b) => a.dist - b.dist || a.label.localeCompare(b.label));
}

/**
 * הפסק לטוקן אחד. `null` = אין מה לומר עליו.
 *
 * **"ברורה" מוגדרת כאן במספרים ולא בתחושה**, בשלושה תנאים:
 *
 * 1. התאמה יחידה, או
 * 2. השנייה רחוקה מהראשונה בשתי שגיאות לפחות, או
 * 3. **שגיאה אחת בלבד בראשונה, וכל השאר גרועות ממנה.** התנאי הזה נוסף
 *    אחרי מדידה: `מדריט` הפיק "מדריד או מצרים?" - מדריד במרחק 1 ומצרים
 *    במרחק 2, כלומר הפרש של אחת, כלומר "כמה סבירות" לפי הכלל הקודם.
 *    שאלה כזאת גרועה מבחירה. שגיאת הקלדה בודדת היא הצורה הכי מובהקת
 *    של התאמה, ולכן היא מכריעה מול כל מה שרחוק ממנה.
 *
 * מה שנשאר `many` הוא בדיוק המקרה שצריך: **תיקו**. `ויאנה` נמצאת במרחק
 * שגיאה אחת גם מוינה וגם מוילנה, ואין שום בסיס לבחור.
 */
export function resolveToken(token: string): NameVerdict | null {
  const norm = normalizeName(token);
  if (norm.length < 3 || isStopword(token)) return null;
  if (isExactName(token)) return null;
  const matches = bestMatches(token);
  if (matches.length === 0) return null;
  const clear =
    matches.length === 1 ||
    matches[1].dist - matches[0].dist >= 2 ||
    (matches[0].dist <= 1 && matches[1].dist > matches[0].dist);
  if (clear) {
    return { typed: token, kind: 'one', options: [{ slug: matches[0].slug, label: matches[0].label }] };
  }
  return {
    typed: token,
    kind: 'many',
    options: matches
      .filter((m) => m.dist - matches[0].dist <= 1)
      .slice(0, 4)
      .map((m) => ({ slug: m.slug, label: m.label })),
  };
}

/** מילים מועמדות מתוך הודעה: עברית או לטינית, שלוש אותיות ומעלה */
export function candidateTokens(text: string): string[] {
  const raw = (text ?? '').match(/[֐-׿A-Za-z][֐-׿A-Za-z'׳״-]{2,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const n = normalizeName(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }
  return out;
}

/**
 * הפסק להודעה שלמה. רץ **בכל תור**, לא רק בראשון - זה מה שנתנאל ביקש
 * במפורש, כי שם עיר מתפרש גם בתיקון ובאמצע שיחה.
 */
export function resolveMessage(text: string): NameVerdict[] {
  const out: NameVerdict[] = [];
  for (const token of candidateTokens(text)) {
    const v = resolveToken(token);
    if (v) out.push(v);
  }
  return out;
}

/** ה-slugים שאסור לבחור מתוכם לבד בתור הזה */
export function blockedSlugs(verdicts: NameVerdict[]): Set<string> {
  const out = new Set<string>();
  for (const v of verdicts) {
    if (v.kind !== 'many') continue;
    for (const o of v.options) out.add(o.slug);
  }
  return out;
}

/** האם ההודעה נוקבת בשם שקיים בקטלוג כמו שהוא */
export function namesCatalogExactly(text: string): boolean {
  return candidateTokens(text).some((t) => isExactName(t));
}

/* ---------- השער ---------- */

export type CityGate = { ok: true; note: string } | { ok: false; message: string };

/**
 * **השער עצמו, והוא הסיבה שהקובץ קיים.**
 *
 * הבלוק שנשלח למודל הוא הנחיה, וההיסטוריה של הפרויקט הזה אומרת שהנחיה
 * נבלעת. לכן ההכרעה נאכפת גם ברמת הכלי: לפני שכלי בוחר עיר מבוצע,
 * הבחירה שלו נמדדת מול מה שהמטייל **באמת הקליד**.
 *
 * שלוש תוצאות:
 *
 * 1. **המילה קרובה לכמה יעדים והכלי בחר אחד מהם** - נכשל. זה בדיוק
 *    "אסור לבחור", והמודל מקבל את האפשרויות בחזרה כדי שישאל.
 * 2. **המילה נפתרת ליעד אחד והכלי בחר יעד אחר** - נכשל. זה המקרה
 *    שקרה בפועל: `ברסלוונה` נפתרת לברצלונה, והמודל בחר ברטיסלבה.
 * 3. **אחרת** - עובר, ואם הייתה פרשנות מחזירים משפט קצר שהמודל חייב
 *    לומר ("הבנתי ברצלונה, כתבת ברסלוונה").
 *
 * `chosen` הם ה-slugים שהכלי עומד לכתוב. הבדיקה רצה רק כשההודעה
 * **אינה** נוקבת בשם מהקטלוג כמו שהוא: מי שכתב "רומא" נקי לא צריך שאף
 * אחד יפרש לו כלום, ופסק רועש על מילה אחרת באותה הודעה לא ייחסום אותו.
 */
export function cityGate(lastUserText: string, chosen: string[]): CityGate {
  const uniq = [...new Set(chosen.filter(Boolean))];
  if (uniq.length === 0) return { ok: true, note: '' };
  if (namesCatalogExactly(lastUserText)) return { ok: true, note: '' };

  const verdicts = resolveMessage(lastUserText);
  if (verdicts.length === 0) return { ok: true, note: '' };

  for (const v of verdicts) {
    const slugs = v.options.map((o) => o.slug);
    if (v.kind === 'many' && uniq.some((s) => slugs.includes(s))) {
      const list = v.options.map((o) => o.label).join(' או ');
      return {
        ok: false,
        message:
          `לא בוצע. המטייל כתב "${v.typed}", וזה קרוב באותה מידה ליותר מיעד אחד בקטלוג: ${list}. ` +
          `אסור לבחור עבורו. שאל אותו בעברית באיזה מהם התכוון, הצע בדיוק את האפשרויות האלה, וקרא ל-suggest_quick_replies עם השמות. ` +
          `אל תיצור ואל תשנה טיול עד שיענה.`,
      };
    }
    if (v.kind === 'one' && !uniq.includes(v.options[0].slug)) {
      return {
        ok: false,
        message:
          `לא בוצע. המטייל כתב "${v.typed}". ההתאמה בקטלוג היא ${v.options[0].label} (${v.options[0].slug}), ולא מה שבחרת. ` +
          `אם התכוונת ל${v.options[0].label} - קרא לכלי שוב עם ${v.options[0].slug}. אם אתה חושב שהמטייל התכוון למשהו אחר - שאל אותו, אל תבחר.`,
      };
    }
  }

  const one = verdicts.find((v) => v.kind === 'one' && uniq.includes(v.options[0].slug));
  return {
    ok: true,
    note: one
      ? ` המטייל כתב "${one.typed}" ולא בדיוק את שם היעד; אמור לו במשפט קצר שהבנת ${one.options[0].label}.`
      : '',
  };
}

/**
 * הבלוק שנשלח למודל. נשלח **אחרון** בסדרת ה-system, כמו
 * `OUTPUT_DISCIPLINE` - היומן של הפרויקט מתעד שכלל שיושב בראש פרומפט
 * ארוך נבלע, ושאותו כלל בסוף עובד.
 */
export function verdictBlock(verdicts: NameVerdict[]): string {
  if (verdicts.length === 0) return '';
  const lines = verdicts.map((v) => {
    if (v.kind === 'one') {
      return `- המטייל כתב "${v.typed}". ההתאמה היחידה הקרובה בקטלוג היא ${v.options[0].label} (${v.options[0].slug}). השתמש בה, ואמור זאת במשפט קצר - למשל "הבנתי ${v.options[0].label} (כתבת ${v.typed})". אל תשאל.`;
    }
    const list = v.options.map((o) => `${o.label} (${o.slug})`).join(' / ');
    return `- המטייל כתב "${v.typed}", וזה קרוב ליותר מיעד אחד: ${list}. **אסור לבחור עבורו.** שאל באיזו התכוון והצע בדיוק את האפשרויות האלה, וקרא ל-suggest_quick_replies עם השמות. אל תיצור ואל תשנה טיול בתור הזה עד שיענה.`;
  });
  return `PLACE NAME RESOLUTION - computed by the server from the catalog, not by you. This overrides any guess you would make:\n${lines.join('\n')}`;
}
