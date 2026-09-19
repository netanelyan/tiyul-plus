/**
 * The coverage guard, against the real catalog.
 *
 * The reported sentence is the first test, verbatim, because that is what this
 * exists for. The rest are the things it must NOT touch - which is where a
 * guard built out of a number set goes wrong, and where this project's log
 * already records nine live false positives from exactly this kind of matcher.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  coverageByScope,
  coverageCounts,
  coverageNumbers,
  destinationsPerCountry,
} from './coverageFacts.ts';
import { NO_COVERAGE_LINE, guardText, violationOf } from '@/lib/priceGuard.ts';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { buildDestinationCards as buildCards } from '@/lib/destinationCards.ts';

const allow = { coverageNumbers: coverageNumbers(), coverageByScope: coverageByScope() };

test('the reported sentence is cut: 66 nature destinations in Europe when there are 30', () => {
  const reported = 'לפי הנתונים שלי, יש לי 66 יעדים באירופה שמתאפיינים בטבע - הרים, אגמים ופיורדים.';
  assert.equal(violationOf(reported, allow), 'coverage-count');
  const out = guardText(reported, allow);
  assert.ok(!out.text.includes('66'), `the number survived: ${out.text}`);
  assert.ok(out.text.includes(NO_COVERAGE_LINE));
});

test('the true number for that same claim passes', () => {
  const europe = coverageCounts()['אירופה'];
  assert.ok(europe?.outdoors, 'Europe has no outdoors count - the grouping changed');
  const honest = `יש לי ${europe.outdoors} יעדי טבע באירופה.`;
  assert.equal(violationOf(honest, allow), null, honest);
});

test('every continent-and-character count the index publishes is a number the guard accepts', () => {
  // Otherwise the prompt hands the model a figure and the guard then cuts the
  // sentence quoting it, which is the worst of both.
  const nums = new Set(coverageNumbers());
  for (const [continent, row] of Object.entries(coverageCounts())) {
    for (const [trait, n] of Object.entries(row)) {
      assert.ok(nums.has(n as number), `${continent}/${trait} = ${n} is not in the allowed set`);
    }
  }
});

test('the two global totals pass, and they are the real ones', () => {
  const s = `יש לי ${destinations.length} יעדים ב-${countries.length} מדינות.`;
  assert.equal(violationOf(s, allow), null, s);
  assert.equal(violationOf('יש לי 500 יעדים ב-200 מדינות.', allow), 'coverage-count');
});

test('a number counting anything other than destinations is not compared', () => {
  /*
    The first version checked every digit run in the sentence. This is the case
    that killed it: 7 quantifies days, not destinations, and 7 is not a count
    anything in this catalog happens to have.
  */
  for (const s of [
    'יש לי 166 יעדים, ואפשר לבנות מהם מסלול של 7 ימים בוינה.',
    'בקטלוג שלנו יש מסלול של 9 ימים עם 23 עצירות.',
    'הטיול שלי כולל 12 עצירות טבע.',
  ]) {
    assert.equal(violationOf(s, allow), null, s);
  }
});

test('general knowledge about the world is not our business to cut', () => {
  /*
    "There are 44 countries in Europe" is a real answer to a real question, and
    a guard assembled from our catalog must not rule on it. This is the same
    species as the euro/Europe false positive: a matcher firing on a sentence
    that merely resembles the thing it guards.
  */
  for (const s of [
    'באירופה יש 44 מדינות.',
    'ביבשת אסיה יש 48 מדינות ריבוניות.',
    'איטליה מחולקת ל-20 מחוזות.',
  ]) {
    assert.equal(violationOf(s, allow), null, s);
  }
});

test('a number about places inside a city is out of scope', () => {
  // These rest on the detail block the model is actually handed, and admitting
  // every per-city-per-category count would make the set too dense to have teeth.
  for (const s of ['בוינה יש לי 26 מקומות.', 'ברומא יש 14 אתרים היסטוריים בקטלוג שלנו.']) {
    assert.equal(violationOf(s, allow), null, s);
  }
});

test('a number the traveller themselves used can be quoted back', () => {
  const s = 'יש לי 40 יעדים באירופה, כמו שאמרת.';
  assert.equal(
    violationOf(s, { ...allow, userText: 'יש לכם 40 יעדים באירופה?' }),
    null,
    'the traveller may be quoted',
  );
  assert.equal(violationOf(s, allow), 'coverage-count', 'but not out of nowhere');
});

test('a count with no ownership marker at all is left alone', () => {
  /*
    Worth its own test because it is the boundary the previous test walked into:
    "you said the 40 destinations in Europe interest you" carries a number and a
    coverage noun and is still nobody's claim about our catalog. Ownership is
    what turns a count into a claim, and without it the rule does not run.
  */
  assert.equal(violationOf('אמרת ש-40 היעדים באירופה מעניינים אותך.', allow), null);
});

test('with no facts wired the rule stays silent rather than cutting everything', () => {
  // Deliberately the opposite of kosherNames. See the note on coverageNumbers.
  assert.equal(violationOf('יש לי 66 יעדים באירופה שמתאפיינים בטבע.', {}), null);
  assert.equal(violationOf('יש לי 66 יעדים באירופה שמתאפיינים בטבע.', { coverageNumbers: [] }), null);
});

test('a true number wearing the wrong label is cut - "166 destinations in Italy"', () => {
  /*
    The live reply that made this necessary. Every digit is real - 166 is our
    worldwide total - and the sentence is false, so the flat number set passes it
    and only the scope comparison catches it.
  */
  const s = 'יש לנו 166 יעדים באיטליה.';
  assert.equal(violationOf(s, allow), 'coverage-count');
  const withoutScopes = { coverageNumbers: coverageNumbers() };
  assert.equal(
    violationOf(s, withoutScopes),
    null,
    'the flat set alone cannot catch this - that is why coverageByScope exists',
  );
});

test("and that country's real count passes in the same sentence shape", () => {
  const perCountry = destinationsPerCountry();
  const italy = perCountry['italy'];
  assert.ok(italy && italy > 1, `italy has ${italy} destinations - fixture stale`);
  assert.equal(violationOf(`יש לנו ${italy} יעדים באיטליה.`, allow), null);
});

test('a scope mentioned after a comma does not own the number', () => {
  /*
    The false positive this rule was designed around: without the comma ending
    the window, a recommendation reads as a count. Both of these are good
    sentences and both must survive.
  */
  for (const s of [
    'יש לנו 166 יעדים, ואני ממליץ במיוחד על איטליה.',
    'בקטלוג שלנו 166 יעדים. באיטליה יש כמה מהיפים שבהם.',
  ]) {
    assert.equal(violationOf(s, allow), null, s);
  }
});

test('an enumeration after the scope does not steal the scope', () => {
  /*
    Cut verbatim from a live run, and the reason `scopeAfter` takes the nearest
    name rather than the longest. The window reached past the dash into the list
    that follows, and Austria is one letter longer than Europe, so a true count
    for Europe was checked against Austria and cut.
  */
  const s =
    'אני מכסה 25 מדינות באירופה - אוסטריה, סלובקיה, צ׳כיה, הונגריה, איטליה, יוון, ספרד, גרמניה.';
  assert.equal(violationOf(s, allow), null, 'the nearest scope is Europe, not Austria');
});

test("Europe's own country count is a number it is allowed to claim", () => {
  // The sentence above only passes if this is true, so it is asserted directly
  // rather than left implicit in a prose fixture.
  const scopes = coverageByScope();
  const europeCountries = new Set(
    buildCards()
      .filter((c) => c.continent === 'אירופה')
      .map((c) => c.countrySlug),
  ).size;
  assert.ok(
    scopes['אירופה']?.includes(europeCountries),
    `Europe holds ${europeCountries} countries and that is not in its allowed set`,
  );
});

test('a scope before the number is never treated as owning it', () => {
  // "we visited Italy, and I have 166 destinations in the catalog" is fine.
  assert.equal(violationOf('טיילנו באיטליה ויש לנו 166 יעדים בקטלוג.', allow), null);
});

test('every count the model is handed is one the guard accepts, for every country', () => {
  /*
    The prompt now hands over a per-country destination count. If the guard
    rejected any of them it would cut the very sentence quoting a number we
    supplied - the worst of both, and invisible until a traveller happened to ask
    about that one country. So this walks all of them rather than sampling.
  */
  const scopes = coverageByScope();
  assert.ok(Object.keys(scopes).length > 50, `scope map has only ${Object.keys(scopes).length} entries`);
  const nameOf = new Map(buildCards().map((c) => [c.countrySlug, c.country]));
  for (const [slug, n] of Object.entries(destinationsPerCountry())) {
    const name = nameOf.get(slug);
    if (!name || n < 2) continue; // n=1 is below the rule's floor by design
    const s = `יש לנו ${n} יעדים ב${name}.`;
    assert.equal(violationOf(s, allow), null, `${name} (${slug}) has ${n} and the guard cut it: ${s}`);
  }
});

test('the replacement line survives its own filter', () => {
  assert.equal(violationOf(NO_COVERAGE_LINE, allow), null);
});

test('the chat route wires the facts - absence would silently disable the rule', () => {
  /*
    The rule fails open when `coverageNumbers` is missing, which is right for
    every other caller and wrong for this one. Since that cannot be caught by
    behaviour, it is asserted structurally.
  */
  const src = readFileSync('src/app/api/chat/route.ts', 'utf8');
  assert.match(src, /coverageNumbers:\s*coverageNumbers\(\)/);
});
