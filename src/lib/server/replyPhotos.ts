/**
 * ---------- Photographs for a reply, resolved from the catalog ----------
 *
 * The agent answers in prose and names real places. This turns the names it
 * actually wrote into the photographs we already hold for them, so a
 * recommendation arrives with a picture instead of only a bolded string.
 *
 * ## The model never supplies a photo, and never picks one
 *
 * It does not receive photo URLs at all (`buildGroundingIndex` does not
 * serialize them - which is also why photo work costs zero index budget), and
 * nothing here asks it to choose. The match is deterministic and runs on the
 * server, on the reply text the traveller is actually reading: a card appears
 * only when the name in the sentence is a name in our catalog. The same
 * "compute the fact instead of asking the model not to get it wrong" rule as
 * `pinDistances` and the coverage counts.
 *
 * ## A photo is shown only when the reply also PLACES it
 *
 * Plenty of cities have a place called "the old town" or "the central market",
 * and a name being unique in our catalog is not the same as being unique in the
 * world. The first draft of this proved it: a sentence about Bratislava came
 * back with a photograph of Warsaw's old town, because Warsaw happens to be the
 * only destination with a place under that name.
 *
 * So a card is emitted only when the reply also names the place's destination.
 * That is what turns "a name we recognise" into "the place the sentence is
 * about", and it is the same omission-beats-approximation rule the rest of the
 * catalog follows: a wrong-city photograph is worse than no photograph. The
 * price is that a place named with no city around it gets no picture, which is
 * the side to be wrong on.
 */

import { destinations } from '@/data/destinations';
import { HE_LETTER } from '@/lib/hebrewMatch';
import type { ReplyPhoto } from '@/lib/types';

/** How many cards a reply may carry. Above this it stops being an answer and becomes a gallery. */
const MAX_PHOTOS = 4;

/**
 * Shorter PLACE names are skipped. Not a style rule: a two or three letter
 * Hebrew name is a substring of ordinary prose far more often than it is a
 * reference to the place.
 */
const MIN_NAME = 5;

/**
 * Destination names get a lower bar than place names, because plenty of the
 * cities people actually ask about are four letters in Hebrew - Rome, Vienna,
 * Prague, Warsaw. They are proper nouns and they go through the same
 * whole-word check, so the risk the higher bar guards against is not there.
 */
const MIN_CITY_NAME = 3;

interface Candidate {
  name: string;
  slug: string;
  card: ReplyPhoto;
}

interface Index {
  /** Place names, grouped by name - a name shared by several destinations stays ambiguous */
  places: Map<string, Candidate[]>;
  /** Destinations that can be a card of their own */
  cities: Candidate[];
  /** Per destination: the Hebrew and Latin strings that count as naming it */
  anchors: Map<string, { he: string[]; latin: string[] }>;
}

let cached: Index | null = null;

/**
 * Hebrew letters only - the same problem `hebrewMatch.ts` exists for. A name
 * must not be matched inside a longer Hebrew word, and the Hebrew prefixes
 * (in/the/and/to/from...) attach to the front of the word, so a short run of
 * them in front is allowed.
 */
const HE = new RegExp(`[${HE_LETTER}]`);
const PREFIX = /[בהוכלשמ]/;

/** Whether the hit at `at` is the whole word rather than a fragment of a longer one */
function isWholeWord(text: string, at: number, len: number): boolean {
  const after = text[at + len];
  if (after && HE.test(after)) return false;
  const before = text[at - 1];
  if (!before || !HE.test(before)) return true;
  /*
    Up to two attached prefix letters, as long as the run is itself
    free-standing. Two rather than one because of the doubling rule this
    project already met in `hePrefix`: a word beginning with vav doubles it
    after a prefix, so "in Warsaw" carries two letters in front of the name.
  */
  if (!PREFIX.test(before)) return false;
  const two = text[at - 2];
  if (!two || !HE.test(two)) return true;
  const three = text[at - 3];
  return PREFIX.test(two) && !(three && HE.test(three));
}

/** Where this name is first named in the text as a whole word, or -1 */
function firstMention(text: string, name: string): number {
  let from = 0;
  for (;;) {
    const at = text.indexOf(name, from);
    if (at === -1) return -1;
    if (isWholeWord(text, at, name.length)) return at;
    from = at + 1;
  }
}

/**
 * The leading segment of a compound destination name - "Interlaken and the
 * Jungfrau valley" is written in a reply simply as "Interlaken", and "Lake Bled
 * and the Julian Alps" as "Lake Bled". Splitting on the Hebrew "and" prefix
 * attached to a word, or on a dash, gives the city itself.
 */
function leadingSegment(name: string): string | null {
  const cut = name.search(new RegExp(` [ו][${HE_LETTER}]|[-,] `));
  if (cut <= 0) return null;
  const head = name.slice(0, cut).trim();
  return head.length >= MIN_NAME ? head : null;
}

function buildIndex(): Index {
  const byName = new Map<string, Candidate[]>();
  const cities: Candidate[] = [];
  const anchors = new Map<string, { he: string[]; latin: string[] }>();

  for (const d of destinations) {
    /*
      The destination itself only - **not its country**. Anchoring on the
      country was the first draft and it leaked badly: "the Spanish Steps" in a
      Rome answer names Spain, which anchored Madrid and Barcelona and put their
      photographs under a sentence about Rome. A city is named or it is not.
    */
    anchors.set(d.slug, {
      he: [d.name, leadingSegment(d.name)].filter(
        (s): s is string => Boolean(s) && (s as string).length >= MIN_CITY_NAME,
      ),
      latin: [d.nameLocal, d.slug],
    });
  }

  for (const d of destinations) {
    // The city itself: its own hero photo, or the landmark that represents it
    const cityPhoto = d.photo ?? d.iconicLandmark?.photo;
    if (cityPhoto && d.name.length >= MIN_CITY_NAME) {
      cities.push({
        name: d.name,
        slug: d.slug,
        card: {
          id: `city:${d.slug}`,
          name: d.iconicLandmark?.name ?? d.name,
          cityName: d.name,
          photo: cityPhoto,
          href: `/destinations/${d.slug}`,
        },
      });
    }

    for (const p of d.places) {
      if (!p.photo || p.name.length < MIN_NAME) continue;
      const entry: Candidate = {
        name: p.name,
        slug: d.slug,
        card: {
          id: p.id,
          name: p.name,
          cityName: d.name,
          photo: p.photo,
          href: `/destinations/${d.slug}?place=${p.id}`,
        },
      };
      const list = byName.get(p.name);
      if (list) list.push(entry);
      else byName.set(p.name, [entry]);
    }
  }

  return { places: byName, cities, anchors };
}

function index(): Index {
  if (!cached) cached = buildIndex();
  return cached;
}

/**
 * The photographs for one reply, in the order the places are named in it.
 *
 * Bold markers are stripped first: the agent writes place names in `**bold**`,
 * and the marks sit between the prefix letter and the name.
 */
export function photoCardsForReply(reply: string, limit = MAX_PHOTOS): ReplyPhoto[] {
  const text = (reply ?? '').replace(/\*\*/g, '');
  if (text.length < MIN_NAME) return [];
  const idx = index();

  const hits: { at: number; card: ReplyPhoto }[] = [];
  const seen = new Set<string>();
  const add = (at: number, card: ReplyPhoto) => {
    if (at < 0 || seen.has(card.id)) return;
    seen.add(card.id);
    hits.push({ at, card });
  };

  /*
    Which destinations the reply actually places. This is the gate, not a
    tie-breaker: without it "the old town" in a sentence about Bratislava is
    answered with a photograph of Warsaw.
  */
  const lower = text.toLowerCase();
  const anchored = new Set<string>();
  for (const [slug, a] of idx.anchors) {
    if (
      a.he.some((n) => firstMention(text, n) >= 0) ||
      a.latin.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}\\b`, 'i').test(lower))
    ) {
      anchored.add(slug);
    }
  }
  if (anchored.size === 0) return [];

  for (const [name, list] of idx.places) {
    const at = firstMention(text, name);
    if (at < 0) continue;
    const owners = list.filter((c) => anchored.has(c.slug));
    // Exactly one placed destination owns this name - anything else is a guess
    if (owners.length === 1) add(at, owners[0].card);
  }

  /*
    Cities come last on purpose. A named place is the more specific answer, and
    when a reply names both a city and a place inside it, two cards of the same
    subject would be a repetition rather than more information.
  */
  if (hits.length < limit) {
    for (const c of idx.cities) {
      if (!anchored.has(c.slug)) continue;
      if (hits.some((h) => h.card.href.startsWith(`/destinations/${c.slug}`))) continue;
      const at = idx.anchors.get(c.slug)?.he.map((n) => firstMention(text, n)).find((i) => i >= 0);
      if (at !== undefined) add(at, c.card);
    }
  }

  return hits
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((h) => h.card);
}
