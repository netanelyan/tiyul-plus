/**
 * The admin area's search box - **hostile input**.
 *
 * The claim tested here is not "the string is well encoded" but **the user's
 * string does not travel onward at all**: an email becomes a uuid from GoTrue,
 * a destination becomes a slug from a closed list, and a trip name stays in
 * memory. Therefore every malicious payload must leave here as `invalid`, or
 * as a slug from the catalog - never as free text.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_QUERY_CHARS, nameMatches, normalizeNeedle, parseAdminQuery } from './adminSearch.ts';
import { destinations } from '../../data/destinations.ts';

/* ---------- Hostile payloads ---------- */

const HOSTILE = [
  "' or '1'='1",
  "1' or role=eq.owner--",
  '1&role=eq.owner',
  'x,y',
  '(select 1)',
  '../../admin/users',
  'a)&or=(role.eq.owner',
  '%00',
  '*',
  'user_id=eq.00000000-0000-0000-0000-000000000000',
  '<script>alert(1)</script>',
  '{"$ne":null}',
  'DROP TABLE user_trips;--',
];

test('מטען עוין לא הופך למייל ולא ליעד', () => {
  for (const raw of HOSTILE) {
    assert.equal(parseAdminQuery(raw, 'email').kind, 'invalid', `email: ${raw}`);
    const place = parseAdminQuery(raw, 'place');
    // If something does happen to be picked up as a destination - it must be a catalog slug, not the text
    if (place.kind === 'place') {
      for (const s of place.slugs) {
        assert.ok(
          destinations.some((d) => d.slug === s),
          `יעד שאינו בקטלוג יצא מ-${raw}: ${s}`,
        );
      }
    }
  }
});

test('חיפוש שם לא מוציא החוצה שום דבר מלבד needle מנורמל', () => {
  for (const raw of HOSTILE) {
    const q = parseAdminQuery(raw, 'name');
    if (q.kind !== 'name') continue;
    // The LIKE wildcard is stripped, and control characters are rejected even earlier
    assert.ok(!/[%_*]/.test(q.needle), `נשאר תו כללי ב-${raw}`);
    assert.ok(!/[\u0000-\u001f\u007f]/.test(q.needle), `נשאר תו בקרה ב-${raw}`);
  }
});

test('תווי בקרה, אורך ומצב לא מוכר נדחים', () => {
  assert.equal(parseAdminQuery('רומא\u0000', 'name').kind, 'invalid');
  assert.equal(parseAdminQuery('a\nb', 'name').kind, 'invalid');
  assert.equal(parseAdminQuery('x'.repeat(MAX_QUERY_CHARS + 1), 'name').kind, 'invalid');
  assert.equal(parseAdminQuery('רומא', 'anything').kind, 'invalid');
  assert.equal(parseAdminQuery(123, 'name').kind, 'invalid');
  assert.equal(parseAdminQuery(null, 'email').kind, 'invalid');
  assert.equal(parseAdminQuery('   ', 'name').kind, 'invalid');
});

/* ---------- The legitimate paths must work ---------- */

test('מייל תקין עובר ומנורמל לאותיות קטנות', () => {
  const q = parseAdminQuery('  Netanel@Example.COM ', 'email');
  assert.equal(q.kind, 'email');
  if (q.kind === 'email') assert.equal(q.email, 'netanel@example.com');
});

test('מייל חלקי נדחה - התאמה מדויקת בלבד, כדי שאי אפשר יהיה לסרוק כתובות', () => {
  for (const bad of ['netanel', 'netanel@', '@example.com', 'a b@c.com', 'a@b']) {
    assert.equal(parseAdminQuery(bad, 'email').kind, 'invalid', bad);
  }
});

test('יעד מהקטלוג מתורגם ל-slug, ומדינה מתורגמת לכל עריה', () => {
  const rome = parseAdminQuery('רומא', 'place');
  assert.equal(rome.kind, 'place');
  if (rome.kind === 'place') assert.deepEqual(rome.slugs, ['rome']);

  const italy = parseAdminQuery('איטליה', 'place');
  assert.equal(italy.kind, 'place');
  if (italy.kind === 'place') {
    assert.ok(italy.slugs.includes('rome'), 'חיפוש מדינה חייב למצוא את עריה');
    assert.ok(italy.slugs.length > 1);
  }
});

test('יעד שלא קיים נדחה במקום להפוך למחרוזת חיפוש', () => {
  assert.equal(parseAdminQuery('ניו יורק ניו יורק ניו יורק', 'place').kind, 'invalid');
  assert.equal(parseAdminQuery('zzzz', 'place').kind, 'invalid');
});

test('שם טיול קצר מדי נדחה, שם אמיתי עובר', () => {
  assert.equal(parseAdminQuery('א', 'name').kind, 'invalid');
  const q = parseAdminQuery('החופשה של אמא', 'name');
  assert.equal(q.kind, 'name');
});

/* ---------- The in-memory matching ---------- */

test('nameMatches מנרמל את שני הצדדים', () => {
  assert.ok(nameMatches('Roma  &  Venezia', 'roma & venezia'));
  assert.ok(nameMatches('טיול לרומא', 'רומא'));
  assert.ok(!nameMatches('טיול לוינה', 'רומא'));
  // A wildcard does not become a wildcard
  assert.ok(!nameMatches('טיול לוינה', normalizeNeedle('טיול*וינה')));
});
