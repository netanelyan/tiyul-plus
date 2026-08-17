/**
 * Tests for sanitizeMessages.
 *
 * The first test is an exact reproduction of the production failure: a
 * message whose entire content was an image, after the image aged out of the
 * last-two-messages window. Anthropic's API returns 400 on this ("user
 * messages must have non-empty content"), 400 is a permanent error, and
 * every retry fails identically - the traveler got the generic "something
 * went wrong" twice for the same tap.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMessages, MAX_IMAGE_CHARS } from './chatMessages.ts';

/** A valid, tiny data URL */
const img = (n = 1) => `data:image/jpeg;base64,${'A'.repeat(n * 8)}`;

test('הרגרסיה: תמונה שיצאה מהחלון לא משאירה הודעת user ריקה', () => {
  // Exactly what the client sends: it strips images **by position** (the last
  // two messages, see useTripChat), so the message that carried the booking
  // confirmation reaches the server with no image and no text. Note the
  // server rule differs slightly - it keeps the last two messages **that have
  // an image** - but the client strips first, so this is the shape that
  // actually arrives.
  const out = sanitizeMessages([
    { role: 'user', content: 'תבנה את הימים 1, 2 סביב בית המלון' },
    { role: 'assistant', content: 'באיזו עיר הזמנתם מלון?' },
    { role: 'user', content: '' }, // the booking confirmation - the image is no longer sent
    { role: 'assistant', content: 'מעולה! רואה את Hotel Devin בברטיסלבה.' },
    { role: 'user', content: 'כרגע רק המלון הזה, תבנה את התכניות לפיו' },
  ]);
  assert.equal(out.length, 4);
  for (const m of out) {
    if (m.role === 'user') {
      assert.ok(m.content.trim().length > 0 || m.image, 'אין הודעת user בלי תוכן');
    }
  }
  // The agent's reply stays - what it read from the image is preserved in its own words
  assert.ok(out.some((m) => m.content.includes('Hotel Devin')));
});

/*
 * This group is the constraint I did NOT check against the API before
 * choosing the fix above - I checked empty user content, empty assistant
 * content and consecutive same-role messages, and did not check "the first
 * message is an assistant". That is exactly what broke in production:
 * dropping the first empty message exposed the agent's reply at the head of
 * the array, and the API rejects that with a 400.
 */

test('הרגרסיה השנייה: השמטת ההודעה הראשונה לא משאירה assistant בראש', () => {
  // Exactly what the client sends in a conversation opened with a
  // confirmation screenshot and no text, after the image aged out of the
  // last-two-messages window
  const out = sanitizeMessages([
    { role: 'user', content: '' }, // the booking confirmation - dropped
    { role: 'assistant', content: 'מעולה! רואה את Hotel Devin.' },
    { role: 'user', content: 'תוסיף את המלון למפה' },
  ]);
  assert.equal(out[0].role, 'user', 'ההיסטוריה חייבת להיפתח ב-user');
  assert.equal(out.length, 1, 'התשובה שאין לה תור user נזרקת איתה');
  assert.equal(out[0].content, 'תוסיף את המלון למפה');
});

test('חלון 40 ההודעות שנפתח על assistant - קיים גם בלי תמונות', () => {
  // 41 alternating messages starting with user: the window cuts and opens on an assistant
  const many = Array.from({ length: 41 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `m${i}`,
  }));
  const out = sanitizeMessages(many);
  assert.equal(out[0].role, 'user');
  // m1 was the assistant the window opened on - it is dropped, m2 is the first user
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
  // The first lost its image and had no text -> it drops out
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
    'data:image/gif;base64,AAAA', // unsupported format
    'https://example.com/a.jpg', // not a data URL
    `data:image/jpeg;base64,${'A'.repeat(MAX_IMAGE_CHARS + 10)}`, // too large
    'data:image/jpeg;base64,!!!!', // invalid base64
  ]) {
    const out = sanitizeMessages([{ role: 'user', content: '', image: bad }]);
    assert.equal(out.length, 0, bad.slice(0, 40));
  }
});

test('תמונה על הודעת assistant לא מתקבלת', () => {
  // The history opens with a user on purpose: a lone assistant message is now
  // dropped entirely (see the group about the first message), and that would
  // have hidden what is being tested here.
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
  // {} -> role=user, content='' -> drops out
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

/*
 * The history budget. The background: a real production log returned
 * "prompt is too long: 408754 tokens > 200000 maximum" - more than double
 * the context window. The previous limit was 40 messages x 8,000 chars = up
 * to 320,000 characters, and that looks reasonable only under the English
 * assumption of ~4 characters per token. In dense Hebrew a token is roughly
 * one character, so the history alone overflowed. And it is a persistent
 * error: a history only grows, so a conversation that crossed the ceiling
 * died forever.
 */

const long = (n: number) => 'א'.repeat(n);

test('הרגרסיה השלישית: היסטוריה ארוכה נחתכת לתקציב', () => {
  // 20 messages of 8,000 chars = 160,000 - three times the budget
  const many = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: long(8000),
  }));
  const out = sanitizeMessages(many);
  const total = out.reduce((n, m) => n + m.content.length, 0);
  assert.ok(total <= 50_000, `סך התווים ${total} חייב להיות בתוך התקציב`);
  assert.ok(out.length < many.length, 'חלק מההודעות נחתכו');
  assert.ok(out.length > 0, 'לא נחתך הכול');
});

test('ההודעות שנשמרות הן החדשות, כי שם ההקשר הרלוונטי', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    role: 'user',
    content: `${long(4000)}#${i}`,
  }));
  const out = sanitizeMessages(many);
  assert.match(out[out.length - 1].content, /#29$/, 'ההודעה האחרונה תמיד נשמרת');
  assert.ok(!out.some((m) => m.content.endsWith('#0')), 'הישנות נחתכות');
});

test('הודעה בודדת ענקית נחתכת ולא נזרקת', () => {
  // Two different cuts operate here, and it matters which comes first: the
  // single-message ceiling (8,000 chars) applies at read time, before the
  // history budget. Meaning a single message cannot exceed the budget at
  // all, and the "current turn always survives" guarantee is insurance for
  // the case that somebody raises the single-message ceiling above the
  // budget in the future.
  const out = sanitizeMessages([{ role: 'user', content: long(120_000) }]);
  assert.equal(out.length, 1, 'התור הנוכחי חייב לשרוד גם כשהוא ענק');
  assert.equal(out[0].content.length, 8000, 'תקרת ההודעה הבודדת חלה קודם');
});

test('היסטוריה קצרה עוברת שלמה - התקציב לא מתערב', () => {
  const normal = [
    { role: 'user', content: 'שלום' },
    { role: 'assistant', content: 'היי' },
    { role: 'user', content: 'תבנה טיול לווינה' },
  ];
  assert.deepEqual(sanitizeMessages(normal), normal);
});

test('החיתוך לא חושף assistant בראש המערך', () => {
  // After the budget cut, the first remaining message may be an assistant
  const many = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 0 ? 'assistant' : 'user',
    content: long(6000),
  }));
  const out = sanitizeMessages(many);
  assert.equal(out[0].role, 'user', 'שני הכללים חייבים לעבוד יחד');
});

test('ההיסטוריה מוגבלת ל-40 הודעות אחרונות', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ role: 'user', content: `m${i}` }));
  const out = sanitizeMessages(many);
  assert.equal(out.length, 40);
  assert.equal(out[0].content, 'm20');
});
