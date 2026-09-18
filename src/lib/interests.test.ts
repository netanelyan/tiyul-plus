import test from 'node:test';
import assert from 'node:assert/strict';

import {
  destinationCharacters,
  interestsOfConversation,
  interestsOfPlace,
  interestsOfText,
  type Interest,
} from '@/lib/interests';
import { destinations } from '@/data/destinations';
import type { Place } from '@/lib/types';

const place = (over: Partial<Place>): Place => ({
  id: 'x-1',
  name: 'מקום',
  nameLocal: 'Place',
  category: 'attraction',
  lat: 0,
  lng: 0,
  description: '',
  ...over,
});

/* ---------- reading the request ---------- */

test('the reported request reads as outdoors', () => {
  assert.deepEqual(
    interestsOfText('אני רוצה טיול טבע באירופה - הרים, אגמים ומסלולי הליכה. לא בא לי על ערים בכלל.'),
    ['outdoors'],
  );
});

test('Hebrew prefixes attach to the word, and a suffix does not break the match', () => {
  for (const s of ['בטבע', 'להרים', 'שמסלולים', 'האגמים', 'ולמפלים']) {
    assert.deepEqual(interestsOfText(s), ['outdoors'], s);
  }
});

test('several interests in one sentence all come back', () => {
  assert.deepEqual(interestsOfText('רוצה מוזיאונים והיסטוריה'), ['history', 'art']);
});

/*
  The word-boundary cases. Every one of these is a Hebrew word that contains an
  interest word and means something else - the same class that produced nine
  live false positives in the reply guard (see hebrewMatch.ts).
*/
test('an interest word inside a longer, unrelated word does not count', () => {
  const traps: [string, string][] = [
    ['הרבה אנשים אמרו לי שזה שווה', 'har (mountain) inside harbe (a lot)'],
    // Not "I bought a ring at the market" - "at the market" is a real match for
    // foodie, and a fixture carrying two traps at once tests neither.
    ['קניתי טבעת', 'teva (nature) inside tabaat (a ring)'],
    ['נופש של שבוע', 'nof (view) inside nofesh (a holiday)'],
    ['אני רוצה שוקולד', 'shuk (market) inside shokolad (chocolate)'],
    ['8 ימים בלבד', 'plural suffixes must not read as words'],
  ];
  for (const [text, why] of traps) assert.deepEqual(interestsOfText(text), [], why);
});

test('a word that points two ways is not a matcher at all', () => {
  // kanyon = canyon AND a shopping mall; bira = beer AND a capital city;
  // alafim = the Alps AND thousands; layla = a night out AND one night's sleep.
  assert.deepEqual(interestsOfText('קניון גדול'), []);
  assert.deepEqual(interestsOfText('בירה טובה'), []);
  assert.deepEqual(interestsOfText('רוצה לישון לילה אחד בוונציה'), []);
});

test('a plain build request states no interest, and that is not a failure', () => {
  assert.deepEqual(interestsOfText('תבנה לי טיול 5 ימים לפריז'), []);
});

/* ---------- reading the conversation ---------- */

test('who is travelling is not an interest, and must not replace one', () => {
  /*
    The regression this was written for. The agent is required to ask who is
    travelling before the first build, so "a couple" turns up in almost every
    planning conversation - and while it was scored as `romantic`, the message
    answering that question wiped out the nature request made one turn earlier.
  */
  const turns = [
    'אני רוצה טיול טבע באירופה - הרים, אגמים ומסלולי הליכה. לא בא לי על ערים בכלל.',
    '8 ימים, זוג, עם רכב',
  ];
  assert.deepEqual(interestsOfText(turns[1]), []);
  assert.deepEqual(interestsOfConversation(turns), ['outdoors']);
});

test('a newer interest replaces an older one rather than adding to it', () => {
  assert.deepEqual(
    interestsOfConversation(['רוצה טיול טבע', '5 ימים', 'בעצם בא לי יותר על אוכל ושווקים']),
    ['foodie'],
  );
});

test('nothing stated anywhere is empty, not a guess', () => {
  assert.deepEqual(interestsOfConversation(['היי', 'תבנה לי טיול לוינה']), []);
  assert.deepEqual(interestsOfConversation([]), []);
});

test('an interest older than the look-back window has expired', () => {
  const turns = ['רוצה טבע', '1', '2', '3', '4', '5', '6'];
  assert.deepEqual(interestsOfConversation(turns, 6), []);
});

/* ---------- reading a place ---------- */

test('the category counts even when the tag is missing', () => {
  // 51 of the 594 nature/viewpoint places in the catalog carry no `outdoors`
  // tag; reading only the tags would drop them out of a nature answer.
  assert.deepEqual(interestsOfPlace(place({ category: 'nature' })), ['outdoors']);
});

test('a viewpoint is scored on its tags, because the category means two things', () => {
  // A mountain lookout and an observation deck on a tower are the same category.
  assert.deepEqual(interestsOfPlace(place({ category: 'viewpoint' })), []);
  assert.deepEqual(interestsOfPlace(place({ category: 'viewpoint', tags: ['outdoors'] })), [
    'outdoors',
  ]);
});

test('category and tags combine without duplicating', () => {
  const out = interestsOfPlace(place({ category: 'market', tags: ['foodie', 'history'] }));
  assert.deepEqual([...out].sort(), ['foodie', 'history', 'shopping']);
});

/* ---------- the character of a destination, against the real catalog ---------- */

/*
  Computed once for the whole catalog, because the rule is relative - a
  destination carries a trait when its share stands out against the others, so
  there is no such thing as the character of one destination on its own. See
  `CHARACTER_TOP_SHARE` for why a fixed per-destination threshold was abandoned.
*/
const character = destinationCharacters(destinations);

test('the nature-led destinations come out as outdoors', () => {
  for (const slug of ['dolomites', 'interlaken', 'salzburg', 'lofoten', 'bohemian-switzerland']) {
    const d = destinations.find((x) => x.slug === slug);
    assert.ok(d, slug);
    assert.ok(character.get(slug)?.includes('outdoors'), `${slug}: ${character.get(slug)}`);
  }
});

test('a big city with parks and observation decks is NOT a nature destination', () => {
  /*
    This is what the first version of `destinationCharacter` got wrong: with
    `viewpoint` read as nature and tags counted alongside categories, New York
    and Barcelona both came out as outdoors, and 131 of the 166 destinations
    carried the trait - which separates nothing.
  */
  for (const slug of ['new-york', 'barcelona', 'rome', 'venice', 'prague']) {
    const d = destinations.find((x) => x.slug === slug);
    assert.ok(d, slug);
    assert.ok(!character.get(slug)?.includes('outdoors'), `${slug}: ${character.get(slug)}`);
  }
});

test('the trait stays a label: at most three, strongest first, and it distinguishes', () => {
  let outdoors = 0;
  for (const d of destinations) {
    const c = character.get(d.slug) ?? [];
    assert.ok(c.length <= 3, `${d.slug} has ${c.length} traits`);
    assert.equal(new Set(c).size, c.length, `${d.slug} repeats a trait`);
    if (c.includes('outdoors')) outdoors++;
  }
  // A trait four destinations in five share is not a trait. The bound is
  // deliberately loose so an ordinary data pass does not fail this, and a
  // re-tuning that makes the field meaningless does.
  assert.ok(outdoors > 30 && outdoors < 110, `${outdoors} of ${destinations.length} are outdoors`);
});

test('every character is a usable answer - none dominates and none is dead', () => {
  /*
    The half of the failure that a bound on `outdoors` alone cannot see, and the
    reason this test exists: a fixed 25%-of-all-places threshold did not merely
    over-fire on the common traits as the catalog grew to 3,116 places, it left
    the rare ones at nothing at all - outdoors 124 and history 98 of 166, but art
    1, foodie 2 and **shopping 0**. "Which of ours are shopping destinations" had
    no answer, which is a silent failure: the directory looked populated because
    the two big traits filled it.

    So both ends are asserted for every trait. A trait no destination has is
    unusable; a trait most destinations have cannot separate them.
  */
  const traits: Interest[] = ['outdoors', 'history', 'art', 'foodie', 'shopping'];
  const total = destinations.length;
  for (const trait of traits) {
    const n = destinations.filter((d) => character.get(d.slug)?.includes(trait)).length;
    assert.ok(n >= 8, `${trait} describes only ${n} of ${total} - too rare to answer with`);
    assert.ok(n <= total * 0.6, `${trait} describes ${n} of ${total} - it separates nothing`);
  }
});

test('a destination with no readable places gets no character rather than a default', () => {
  const none = destinationCharacters([{ slug: 'empty', places: [] }]);
  assert.deepEqual(none.get('empty'), []);

  /*
    `attraction` maps to no character on purpose, so a destination made only of
    them is unreadable rather than characterless-by-accident. It must not fall
    through to a default, and it must not divide by zero.
  */
  const opaque = destinationCharacters([
    { slug: 'opaque', places: [place({ category: 'attraction' }), place({ category: 'attraction' })] },
  ]);
  assert.deepEqual(opaque.get('opaque'), []);
});
