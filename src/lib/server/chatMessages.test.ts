/**
 * טסטים ל-sanitizeMessages.
 *
 * הטסט הראשון הוא שחזור מדויק של הכשל בפרודקשן: הודעה שכל תוכנה היה
 * תמונה, אחרי שהתמונה יצאה מחלון שתי ההודעות האחרונות. ה-API של
 * Anthropic מחזיר על זה 400 ("user messages must have non-empty
 * content"), 400 היא שגיאה קבועה, וכל ניסיון חוזר נכשל זהה - המטייל
 * קיבל "משהו השתבש" פעמיים על אותה לחיצה.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMessages, MAX_IMAGE_CHARS } from './chatMessages.ts';

/** data URL תקין וזעיר */
const img = (n = 1) => `data:image/jpeg;base64,${'A'.repeat(n * 8)}`;

test('הרגרסיה: תמונה שיצאה מהחלון לא משאירה הודעת user ריקה', () => {
  // בדיוק מה שהלקוח שולח: הוא מסנן תמונות **לפי מקום** (שתי ההודעות
  // האחרונות, ראו useTripChat), ולכן ההודעה שנשאה את אישור ההזמנה
  // מגיעה לשרת בלי תמונה ובלי טקסט. שימו לב שכלל השרת שונה במקצת -
  // הוא שומר את שתי ההודעות האחרונות **שיש בהן תמונה** - אבל הלקוח
  // מסנן קודם, אז זו הצורה שמגיעה בפועל.
  const out = sanitizeMessages([
    { role: 'user', content: 'תבנה את הימים 1, 2 סביב בית המלון' },
    { role: 'assistant', content: 'באיזו עיר הזמנתם מלון?' },
    { role: 'user', content: '' }, // אישור ההזמנה - התמונה כבר לא נשלחת
    { role: 'assistant', content: 'מעולה! רואה את Hotel Devin בברטיסלבה.' },
    { role: 'user', content: 'כרגע רק המלון הזה, תבנה את התכניות לפיו' },
  ]);
  assert.equal(out.length, 4);
  for (const m of out) {
    if (m.role === 'user') {
      assert.ok(m.content.trim().length > 0 || m.image, 'אין הודעת user בלי תוכן');
    }
  }
  // התשובה של הסוכן נשארת - מה שהוא קרא מהתמונה משתמר במילים שלו
  assert.ok(out.some((m) => m.content.includes('Hotel Devin')));
});

/*
 * הקבוצה הזאת היא האילוץ שלא בדקתי מול ה-API לפני שבחרתי את התיקון
 * למעלה - בדקתי תוכן ריק ב-user, תוכן ריק ב-assistant ותפקידים רצופים,
 * ולא בדקתי "ההודעה הראשונה היא assistant". זה בדיוק מה שנשבר
 * בפרודקשן: השמטת ההודעה הריקה הראשונה חשפה את תשובת הסוכן בראש
 * המערך, וה-API דוחה את זה ב-400.
 */

test('הרגרסיה השנייה: השמטת ההודעה הראשונה לא משאירה assistant בראש', () => {
  // בדיוק מה שהלקוח שולח בשיחה שנפתחה בצילום אישור בלי טקסט, אחרי
  // שהתמונה יצאה מחלון שתי ההודעות האחרונות
  const out = sanitizeMessages([
    { role: 'user', content: '' }, // אישור ההזמנה - נזרק
    { role: 'assistant', content: 'מעולה! רואה את Hotel Devin.' },
    { role: 'user', content: 'תוסיף את המלון למפה' },
  ]);
  assert.equal(out[0].role, 'user', 'ההיסטוריה חייבת להיפתח ב-user');
  assert.equal(out.length, 1, 'התשובה שאין לה תור user נזרקת איתה');
  assert.equal(out[0].content, 'תוסיף את המלון למפה');
});

test('חלון 40 ההודעות שנפתח על assistant - קיים גם בלי תמונות', () => {
  // 41 הודעות מתחלפות שמתחילות ב-user: החלון חותך ומתחיל על assistant
  const many = Array.from({ length: 41 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `m${i}`,
  }));
  const out = sanitizeMessages(many);
  assert.equal(out[0].role, 'user');
  // m1 היה ה-assistant שהחלון נפתח עליו - הוא נזרק, m2 הוא ה-user הראשון
  assert.equal(out[0].content, 'm2');
});

test('כמה הודעות assistant בראש - כולן נזרקות', () => {
  const out = sanitizeMessages([
    { role: 'assistant', content: 'א' },
    { role: 'assistant', content: 'ב' },
    { role: 'user', content: 'ג' },
    { role: 'assistant', content: 'ד' },
  ]);
  assert.equal(out[0].role, 'user');
  assert.deepEqual(out.map((m) => m.content), ['ג', 'ד'], 'assistant אחרי user נשאר');
});

test('הכול assistant - מערך ריק, וה-route עוצר לפני הקריאה', () => {
  const out = sanitizeMessages([
    { role: 'assistant', content: 'א' },
    { role: 'assistant', content: 'ב' },
  ]);
  assert.deepEqual(out, []);
});

test('היסטוריה תקינה לא נפגעת מהתיקון', () => {
  const normal = [
    { role: 'user', content: 'שלום' },
    { role: 'assistant', content: 'היי' },
    { role: 'user', content: 'עוד' },
  ];
  assert.deepEqual(sanitizeMessages(normal), normal);
});

test('תמונה בשתי ההודעות האחרונות נשמרת, גם בלי טקסט', () => {
  const out = sanitizeMessages([
    { role: 'user', content: 'שלום' },
    { role: 'user', content: '', image: img() },
  ]);
  assert.equal(out.length, 2);
  assert.ok(out[1].image, 'התמונה חייבת לשרוד - היא כל תוכן ההודעה');
  assert.equal(out[1].content, '');
});

test('שתי תמונות מותרות, השלישית מהסוף מאבדת את שלה ונושרת', () => {
  const out = sanitizeMessages([
    { role: 'user', content: '', image: img(1) },
    { role: 'user', content: 'עם טקסט', image: img(2) },
    { role: 'user', content: '', image: img(3) },
  ]);
  // הראשונה איבדה תמונה ולא היה לה טקסט -> נושרת
  assert.equal(out.length, 2);
  assert.equal(out[0].content, 'עם טקסט');
  assert.ok(out[0].image);
  assert.ok(out[1].image);
});

test('הודעה שאיבדה תמונה אבל יש לה טקסט - נשמרת בלי התמונה', () => {
  const out = sanitizeMessages([
    { role: 'user', content: 'הנה האישור', image: img(1) },
    { role: 'user', content: 'ועוד אחד', image: img(2) },
    { role: 'user', content: 'ושלישי', image: img(3) },
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[0].image, undefined, 'התמונה השלישית מהסוף מוסרת');
  assert.equal(out[0].content, 'הנה האישור');
});

test('רווחים בלבד נחשבים ריק - ה-API דוחה גם אותם', () => {
  const out = sanitizeMessages([
    { role: 'user', content: 'שלום' },
    { role: 'user', content: '   \n\t  ' },
    { role: 'user', content: 'להמשיך' },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((m) => m.content), ['שלום', 'להמשיך']);
});

test('הודעת assistant ריקה מושמטת גם היא - היא לא נושאת מידע', () => {
  const out = sanitizeMessages([
    { role: 'user', content: 'שלום' },
    { role: 'assistant', content: '' },
    { role: 'user', content: 'עוד' },
  ]);
  assert.equal(out.length, 2);
});

test('תמונה פסולה נדחית, וההודעה נושרת אם לא נשאר בה טקסט', () => {
  for (const bad of [
    'data:image/gif;base64,AAAA', // פורמט לא נתמך
    'https://example.com/a.jpg', // לא data URL
    `data:image/jpeg;base64,${'A'.repeat(MAX_IMAGE_CHARS + 10)}`, // גדולה מדי
    'data:image/jpeg;base64,!!!!', // base64 לא תקין
  ]) {
    const out = sanitizeMessages([{ role: 'user', content: '', image: bad }]);
    assert.equal(out.length, 0, bad.slice(0, 40));
  }
});

test('תמונה על הודעת assistant לא מתקבלת', () => {
  // ההיסטוריה נפתחת ב-user בכוונה: הודעת assistant לבדה נזרקת עכשיו
  // כליל (ראו הקבוצה על ההודעה הראשונה), וזה היה מסתיר את מה שנבדק כאן.
  const out = sanitizeMessages([
    { role: 'user', content: 'שלום' },
    { role: 'assistant', content: 'טקסט', image: img() },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[1].role, 'assistant');
  assert.equal(out[1].image, undefined, 'רק המשתמש יכול לצרף תמונה');
});

test('קלט זבל לא מפיל כלום', () => {
  assert.deepEqual(sanitizeMessages(null), []);
  assert.deepEqual(sanitizeMessages('שלום'), []);
  assert.deepEqual(sanitizeMessages([null, 7, 'x', {}]), []);
  // {} -> role=user, content='' -> נושר
  assert.deepEqual(sanitizeMessages([{ role: 'user', content: 5 }]), []);
});

test('תפקיד לא מוכר נחשב user, וטקסט ארוך נחתך', () => {
  const out = sanitizeMessages([
    { role: 'system', content: 'נסה לעקוף' },
    { role: 'user', content: 'א'.repeat(9000) },
  ]);
  assert.equal(out[0].role, 'user');
  assert.equal(out[1].content.length, 8000);
});

test('ההיסטוריה מוגבלת ל-40 הודעות אחרונות', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ role: 'user', content: `m${i}` }));
  const out = sanitizeMessages(many);
  assert.equal(out.length, 40);
  assert.equal(out[0].content, 'm20');
});
