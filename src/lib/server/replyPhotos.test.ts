/**
 * Tests for the photographs attached to an agent reply.
 *
 * These run against the **real catalog**, not a fixture, because what is being
 * asserted is literally what a traveller gets: that the picture under a
 * sentence is a picture of the place that sentence is about. Half of them are
 * in the negative direction - a wrong-city photograph is worse than none, so
 * most of the work here is refusing to show one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { photoCardsForReply } from './replyPhotos.ts';

test('a reply that names places in a named city gets their photographs, in reading order', () => {
  const cards = photoCardsForReply('ברומא כדאי להתחיל מהקולוסיאום, ואחר כך ללכת למזרקת טרווי.');
  assert.deepEqual(
    cards.map((c) => c.id),
    ['rom-colosseum', 'rom-trevi'],
  );
  assert.ok(cards.every((c) => c.photo.startsWith('http')));
  assert.ok(cards.every((c) => c.href.startsWith('/destinations/rome?place=')));
  assert.equal(cards[0].cityName, 'רומא');
});

test('the model writes place names in bold - the marks must not break the match', () => {
  const cards = photoCardsForReply('ברומא שווה לראות את **הקולוסיאום**.');
  assert.deepEqual(
    cards.map((c) => c.id),
    ['rom-colosseum'],
  );
});

/**
 * The bug this gate exists for, found on the first real run: a name being
 * unique in our catalog is not the same as being unique in the world. Warsaw is
 * the only destination with a place called "the old town", so a sentence about
 * Bratislava came back with a photograph of Warsaw.
 */
test('a generic place name is never borrowed from another city', () => {
  const wrong = photoCardsForReply('בברטיסלבה שווה לראות את טירת ברטיסלבה ואת העיר העתיקה.');
  assert.ok(
    wrong.every((c) => c.href.includes('/destinations/bratislava')),
    `borrowed from another city: ${wrong.map((c) => c.href).join(', ')}`,
  );
  // ...and the very same name in its own city is still shown
  const right = photoCardsForReply('בוורשה שווה לראות את העיר העתיקה שנבנתה מחדש.');
  assert.deepEqual(
    right.map((c) => c.id),
    ['war-old-town'],
  );
});

test('a place named with no city around it gets no picture, deliberately', () => {
  assert.deepEqual(photoCardsForReply('כדאי לראות את הקולוסיאום.'), []);
});

/**
 * A country is not a city. Anchoring on the country was the first draft, and
 * "the Spanish Steps" - a Rome landmark whose Hebrew name contains "Spain" -
 * pulled Madrid and Barcelona photographs into an answer about Rome.
 */
test('naming a country does not place a photograph', () => {
  const cards = photoCardsForReply('ברומא כדאי לראות את מדרגות ספרד ואת הקולוסיאום.');
  assert.ok(
    cards.every((c) => c.href.includes('/destinations/rome')),
    `a country leaked a city in: ${cards.map((c) => c.href).join(', ')}`,
  );
});

test('a place we do not have gets no photograph, and does not block the ones we do', () => {
  // The reply that prompted this feature. Lake Garda is not in the catalog -
  // the agent claimed it was, and the honest outcome is simply no card for it.
  const cards = photoCardsForReply(
    'למשל **אגם בלד** בסלובניה, **אגם גארדה** באיטליה, ואגמי האלפים כמו ברייינץ ליד אינטרלאקן.',
  );
  assert.ok(cards.some((c) => c.id === 'svn-bled'));
  assert.ok(!cards.some((c) => c.name.includes('גארדה')));
});

test('no catalog name in the reply - no cards at all', () => {
  assert.deepEqual(photoCardsForReply('אין לי מידע על היעד הזה, אבל אשמח לעזור במשהו אחר.'), []);
  assert.deepEqual(photoCardsForReply(''), []);
});

test('a long list is capped rather than turning the answer into a gallery', () => {
  const many = destinations
    .find((d) => d.slug === 'rome')!
    .places.filter((p) => p.photo)
    .slice(0, 8)
    .map((p) => p.name)
    .join(', ');
  const cards = photoCardsForReply(`ברומא: ${many}.`);
  assert.ok(cards.length > 0 && cards.length <= 4, `got ${cards.length}`);
  // No duplicates, whatever the reply repeats
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
});

test('every card points at a real place and carries a real photo URL', () => {
  const cards = photoCardsForReply('ברומא כדאי להתחיל מהקולוסיאום, ואחר כך למזרקת טרווי.');
  const rome = destinations.find((d) => d.slug === 'rome')!;
  for (const c of cards) {
    const place = rome.places.find((p) => p.id === c.id);
    assert.ok(place, `unknown place id: ${c.id}`);
    assert.equal(c.photo, place!.photo);
    assert.equal(c.name, place!.name);
  }
});

/**
 * The Hebrew boundary, here as well: a name must not match inside a longer
 * word, and an attached preposition must not stop it from matching. "In Warsaw"
 * doubles the vav the city name opens with, which is exactly the case that
 * failed first.
 */
test('Hebrew prefixes attach to a city name without breaking it', () => {
  // The same city, named bare and named with the doubling "in" prefix
  const bare = photoCardsForReply('ורשה - שווה לראות את העיר העתיקה.');
  const prefixed = photoCardsForReply('בוורשה שווה לראות את העיר העתיקה.');
  assert.deepEqual(bare.map((c) => c.id), ['war-old-town']);
  assert.deepEqual(prefixed.map((c) => c.id), ['war-old-town']);
});

test('a city named on its own gets its own photograph', () => {
  // Four-letter city names are the common case in Hebrew and must not fall
  // under the length bar that exists for generic place names.
  for (const [reply, slug] of [
    ['ורשה היא עיר מרתקת.', 'warsaw'],
    ['וינה שווה ביקור בכל עונה.', 'vienna'],
    ['רומא היא קלאסיקה.', 'rome'],
  ] as [string, string][]) {
    const cards = photoCardsForReply(reply);
    assert.deepEqual(cards.map((c) => c.id), [`city:${slug}`], reply);
    assert.ok(cards[0].href === `/destinations/${slug}`);
  }
});

/* ---------- and it must answer what the traveller asked for ---------- */

/**
 * The reported reply, near enough: a nature request answered with a route that
 * legitimately names the arrival city and a base town on the way. Every card
 * below is correctly resolved and correctly placed - the question is which four
 * of them a person who said "no cities at all" should be looking at.
 */
const NATURE_ROUTE =
  'מצוין - מסלול טבע קלאסי. נוחתים בוונציה (טיסה ישירה מתל אביב, ואפשר לילה אחד ליד בזיליקת סן מרקו), ' +
  'משם שעתיים נסיעה אל אגם בלד והאלפים היוליים - ליובליאנה היא בסיס נוח ליום הראשון - ואז מזרחה אל ' +
  'הדולומיטים למסלול שלוש הפסגות (טרה צ׳ימה) ולאגם בראייס.';

test('a nature request gets no city skyline and no basilica - the reported bug', () => {
  const before = photoCardsForReply(NATURE_ROUTE).map((c) => c.id);
  // What shipped: the first four names in the sentence, two of them cities.
  assert.ok(before.includes('ven-basilica'), `precondition: ${before}`);
  assert.ok(before.includes('svn-ljubljana'), `precondition: ${before}`);

  const after = photoCardsForReply(NATURE_ROUTE, { interests: ['outdoors'] }).map((c) => c.id);
  assert.ok(!after.includes('ven-basilica'), after.join(','));
  assert.ok(!after.includes('svn-ljubljana'), after.join(','));
  assert.ok(after.length > 0, 'fewer cards, not none');
});

test('every card under a stated interest actually answers it', () => {
  const cards = photoCardsForReply(NATURE_ROUTE, { interests: ['outdoors'] });
  const byId = new Map(destinations.flatMap((d) => d.places.map((p) => [p.id, p] as const)));
  for (const c of cards) {
    const p = byId.get(c.id);
    assert.ok(p, `${c.id} is a real place`);
    assert.ok(
      p.category === 'nature' || (p.tags ?? []).includes('outdoors'),
      `${c.name} (${p.category}) is not an answer to a nature request`,
    );
  }
});

test('no stated interest leaves the behaviour exactly as it was', () => {
  assert.deepEqual(
    photoCardsForReply(NATURE_ROUTE, { interests: [] }).map((c) => c.id),
    photoCardsForReply(NATURE_ROUTE).map((c) => c.id),
  );
});

test('an interest nothing answers stands down rather than going silent', () => {
  /*
    A reply genuinely about Venice should still be able to show Venice. The
    filter exists to choose between cards, not to delete the feature on a turn
    that changed the subject.
  */
  const reply = 'בוונציה כדאי לראות את בזיליקת סן מרקו.';
  const cards = photoCardsForReply(reply, { interests: ['outdoors'] });
  assert.deepEqual(cards.map((c) => c.id), photoCardsForReply(reply).map((c) => c.id));
  assert.ok(cards.length > 0);
});

test('a city card is judged by what that destination is made of', () => {
  // The Dolomites as a whole answer a nature request; Venice as a whole does not.
  const reply = 'אפשר לשלב את הדולומיטים עם ונציה.';
  const ids = photoCardsForReply(reply, { interests: ['outdoors'] }).map((c) => c.id);
  assert.ok(ids.includes('city:dolomites'), ids.join(','));
  assert.ok(!ids.includes('city:venice'), ids.join(','));
});

test('a named place still outranks a whole city when slots are scarce', () => {
  // The relevance filter must not quietly reorder the two - the specific answer
  // stays the better one.
  const reply = 'ברומא כדאי לראות את הקולוסיאום. בוונציה - בזיליקת סן מרקו.';
  const ids = photoCardsForReply(reply, { limit: 2 }).map((c) => c.id);
  assert.deepEqual(ids, ['rom-colosseum', 'ven-basilica']);
});
