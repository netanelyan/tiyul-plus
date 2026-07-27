/**
 * טסטים לפאסטים של דפדפן היעדים.
 *
 * שני דברים נבדקים כאן, ושניהם על הדאטה האמיתית ולא על פיקסטורה: שכל
 * יעד מקבל יבשת (פילטר שמאבד יעדים הוא גרוע מפילטר שלא קיים), ושהסינון
 * באמת מסנן - סף שגוי היה מסמן כמעט כל יעד כ"טבע" והצ׳יפ היה מעטר את
 * הממשק בלי לעשות כלום.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTINENTS,
  EMPTY_FACETS,
  VIBES,
  availableVibes,
  buildDestinationCards,
  continentCounts,
  filterDestinations,
} from './destinationFacets.ts';

const cards = buildDestinationCards();

test('לכל יעד יש יבשת - אחרת הוא נעלם מהדפדפן', () => {
  const orphans = cards.filter((c) => c.continent === null);
  assert.equal(
    orphans.length,
    0,
    `יעדים בלי יבשת: ${orphans.map((c) => `${c.name} (${c.countrySlug})`).join(', ')}`,
  );
});

test('סכום היבשות שווה למספר היעדים - בלי כפילויות ובלי נשמטים', () => {
  const sum = CONTINENTS.reduce(
    (n, c) => n + cards.filter((x) => x.continent === c).length,
    0,
  );
  assert.equal(sum, cards.length);
});

test('המונה על טאב "העולם כולו" הוא מספר היעדים בפועל', () => {
  assert.equal(continentCounts(cards, EMPTY_FACETS).all, cards.length);
});

test('כל צ׳יפ אופי שמוצג באמת מסנן: לא הכל ולא כלום', () => {
  const shown = availableVibes(cards);
  assert.ok(shown.length >= 4, 'פחות מארבעה צ׳יפים - הפילטר לא שווה את המקום');
  for (const key of shown) {
    const label = VIBES.find((v) => v.key === key)?.label ?? key;
    const n = filterDestinations(cards, { ...EMPTY_FACETS, vibes: [key] }).length;
    assert.ok(n >= 5, `${label}: ${n} יעדים בלבד - צ׳יפ כמעט ריק`);
    assert.ok(
      n < cards.length * 0.55,
      `${label}: ${n} מתוך ${cards.length} - רחב מדי, הצ׳יפ כמעט לא מסנן`,
    );
  }
});

test('אופי שאין לו מספיק יעדים לא מוצג בכלל', () => {
  const shown = new Set(availableVibes(cards));
  for (const v of VIBES) {
    if (shown.has(v.key)) continue;
    const n = filterDestinations(cards, { ...EMPTY_FACETS, vibes: [v.key] }).length;
    assert.ok(n < 5, `${v.label} הוסתר למרות ${n} יעדים`);
  }
});

test('שני אופיים הם AND ולא OR', () => {
  const a = filterDestinations(cards, { ...EMPTY_FACETS, vibes: ['outdoors'] }).length;
  const both = filterDestinations(cards, { ...EMPTY_FACETS, vibes: ['outdoors', 'nightlife'] });
  assert.ok(both.length <= a);
  for (const c of both) {
    assert.ok(c.vibes.includes('outdoors') && c.vibes.includes('nightlife'));
  }
});

test('מוני היבשות מחושבים בהינתן שאר הסינון - מספר על טאב לא משקר', () => {
  const f = { ...EMPTY_FACETS, vibes: ['nightlife' as const] };
  const counts = continentCounts(cards, f);
  for (const c of CONTINENTS) {
    const actual = filterDestinations(cards, { ...f, continent: c }).length;
    assert.equal(counts[c], actual, `${c}: המונה אמר ${counts[c]} ובפועל ${actual}`);
  }
});

test('חיפוש חופשי עובד בעברית, בלטינית ולפי מדינה', () => {
  const byHebrew = filterDestinations(cards, { ...EMPTY_FACETS, query: 'וינה' });
  assert.ok(byHebrew.some((c) => c.slug === 'vienna'));
  const bySlug = filterDestinations(cards, { ...EMPTY_FACETS, query: 'vienna' });
  assert.ok(bySlug.some((c) => c.slug === 'vienna'));
  const byCountry = filterDestinations(cards, { ...EMPTY_FACETS, query: 'אוסטריה' });
  assert.ok(byCountry.length > 0 && byCountry.every((c) => c.country === 'אוסטריה'));
});

test('רצועת המחיר קיימת כמעט לכל יעד, ואף רצועה אינה ריקה', () => {
  const missing = cards.filter((c) => c.price === null);
  assert.ok(missing.length <= 3, `${missing.length} יעדים בלי רצועת מחיר`);
  for (const band of ['free', 'low', 'high'] as const) {
    assert.ok(
      cards.some((c) => c.price === band),
      `הרצועה ${band} ריקה - הצ׳יפ יוביל למסך ריק`,
    );
  }
});

test('עונה: אין דאטה, ולכן אין תוצאות - וזו הסיבה שהפילטר מוסתר', () => {
  // כשסשן הדאטה יוסיף bestMonths הטסט הזה ייפול, וזה בדיוק הרגע להסיר
  // את ההסתרה בממשק. כישלון כאן הוא בשורה טובה, לא רגרסיה.
  assert.equal(
    cards.filter((c) => c.seasons.length > 0).length,
    0,
    'יש עכשיו דאטת עונות - להפעיל את הפילטר ולעדכן את הטסט הזה',
  );
});

test('סינון ריק מחזיר את הכל, וסינון שאין לו תשובה מחזיר ריק בלי לקרוס', () => {
  assert.equal(filterDestinations(cards, EMPTY_FACETS).length, cards.length);
  assert.equal(
    filterDestinations(cards, { ...EMPTY_FACETS, query: 'עיר שלא קיימת בכלל' }).length,
    0,
  );
});
