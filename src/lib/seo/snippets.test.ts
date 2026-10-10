/**
 * Search titles and descriptions for every catalog page: unique, within budget,
 * and stating nothing the page's own data does not.
 *
 * The fact rule is checked four ways, because each is a different way to be wrong:
 *
 * 1. Every number in a title or description appears in that page's data - as
 *    digits or as Hebrew number words ("twelve to sixteen hours" backs "12-16").
 * 2. "Visa-free for N days" appears only where the visa text says visa-free, and
 *    N is in the visa text itself, not merely somewhere on the page.
 * 3. Kosher wording matches the kashrut overview: a positive claim needs a
 *    positive overview, "no kosher restaurant" needs the overview to say so.
 * 4. A direct flight is claimed only where the flight sentence supports it.
 *
 * Hand-written overrides go through all four, plus a check that every quote they
 * cite really is in the field they name.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { SNIPPET_OVERRIDES } from '@/data/seoOverrides';
import { DEFINITE_FIRST_WORDS } from '@/lib/hebrew';
import { isDomestic } from '@/lib/domestic';
import { rolledOutItineraryPages, toDestLike } from './itineraries.ts';
import { firstSentence, flightFact, kosherFact, kosherNegated, seasonFact, visaFact, withoutAsides } from './facts.ts';
import {
  TITLE_BUDGET,
  TITLE_SUFFIX,
  countrySnippet,
  destinationSnippet,
  itineraryStops,
  itinerarySnippet,
  visaHeading,
  type Snippet,
} from './snippets.ts';
import type { Country, Destination } from '@/lib/types';

// ---------- Every indexable catalog page, with the data it is allowed to draw on ----------

interface Page {
  path: string;
  kind: 'destination' | 'country' | 'itinerary';
  snippet: Snippet;
  country: Country;
  /** The destination for destination and itinerary pages. */
  dest?: Destination;
  /** A country page's cities. */
  cities: Destination[];
  /** An itinerary page's length. */
  days?: number;
}

const countryOf = (d: Destination) => countries.find((c) => c.slug === d.countrySlug)!;
const citiesOf = (c: Country) => destinations.filter((d) => d.countrySlug === c.slug);

const pages: Page[] = [
  ...destinations.map((d) => ({
    path: `/destinations/${d.slug}`,
    kind: 'destination' as const,
    snippet: destinationSnippet(d, countryOf(d)),
    country: countryOf(d),
    dest: d,
    cities: [],
  })),
  ...countries.map((c) => ({
    path: `/countries/${c.slug}`,
    kind: 'country' as const,
    snippet: countrySnippet(c, citiesOf(c)),
    country: c,
    cities: citiesOf(c),
  })),
  ...rolledOutItineraryPages(destinations.map(toDestLike)).map((p) => {
    const d = destinations.find((x) => x.slug === p.slug)!;
    return {
      path: `/itinerary/${p.slug}/${p.days}`,
      kind: 'itinerary' as const,
      snippet: itinerarySnippet(d, countryOf(d), p.days),
      country: countryOf(d),
      dest: d,
      cities: [],
      days: p.days,
    };
  }),
];

const text = (p: Page) => `${p.snippet.head} ${p.snippet.description}`;

/** Day titles a page shows: all of them on a destination page, the first N on an itinerary page. */
const dayTitles = (d: Destination, days?: number) =>
  d.itinerary
    .slice(0, days ?? d.itinerary.length)
    .map((x) => x.title)
    .join(' | ');

function destFields(d: Destination, days?: number): Record<string, string> {
  return {
    flights: d.practical.flights,
    bestSeason: d.bestSeason,
    kosherOverview: d.practical.kosherOverview,
    summary: d.summary,
    tagline: d.tagline,
    itinerary: dayTitles(d, days),
  };
}

/** Every field a page's snippet may quote, by the names `seoOverrides.ts` documents. */
function fieldsOf(p: Page): Record<string, string> {
  const out: Record<string, string> = {
    visa: p.country.practical.visa,
    'country.summary': p.country.summary,
    'country.tagline': p.country.tagline,
  };
  if (p.dest) Object.assign(out, destFields(p.dest, p.days));
  for (const c of p.cities) {
    for (const [k, v] of Object.entries(destFields(c))) out[`${c.slug}.${k}`] = v;
  }
  return out;
}

// ---------- Numbers ----------

const UNITS: Record<string, number> = {
  אחת: 1, אחד: 1, שתיים: 2, שניים: 2, שתי: 2, שני: 2, שתים: 2, שלוש: 3, שלושה: 3, ארבע: 4,
  ארבעה: 4, חמש: 5, חמישה: 5, שש: 6, שישה: 6, שבע: 7, שבעה: 7, שמונה: 8, תשע: 9, תשעה: 9,
  עשר: 10, עשרה: 10, שעתיים: 2, יומיים: 2,
};
const TENS: Record<string, number> = {
  עשרים: 20, שלושים: 30, ארבעים: 40, חמישים: 50, שישים: 60, שבעים: 70, שמונים: 80, תשעים: 90,
};

/** A word with up to two prefix letters removed, so "about-four" and "and-five" are found. */
const bare = (w: string) => [w, w.replace(/^[כבלוהמש]/, ''), w.replace(/^[כבלוהמש]{2}/, '')];
const wordValue = (w: string, table: Record<string, number>) =>
  bare(w).map((f) => table[f]).find((v) => v !== undefined);

/** Every number a text states, as digits or as Hebrew number words. */
function numbersIn(s: string): Set<string> {
  const out = new Set<string>((s.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n))));
  const words = s.split(/[\s,.;:()\-–]+/).filter(Boolean);
  words.forEach((w, i) => {
    const u = wordValue(w, UNITS);
    const t = wordValue(w, TENS);
    const next = words[i + 1] ?? '';
    const half = words.slice(i + 1, i + 3).includes('וחצי');
    if (u !== undefined) {
      out.add(String(u));
      if (next === 'עשרה' || next === 'עשר') out.add(String(10 + u));
      if (half) out.add(String(u + 0.5));
    }
    if (t !== undefined) {
      out.add(String(t));
      const nu = wordValue(next, UNITS);
      if (next.startsWith('ו') && nu !== undefined) out.add(String(t + nu));
    }
  });
  return out;
}

function allowedNumbers(p: Page): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => numbersIn(s).forEach((n) => out.add(n));
  Object.values(fieldsOf(p)).forEach(add);
  const counts: number[] = [];
  if (p.dest) counts.push(p.dest.itinerary.length, p.dest.places.length);
  if (p.days && p.dest) counts.push(p.days, itineraryStops(p.dest, p.days));
  if (p.kind === 'country') counts.push(p.cities.length, ...p.cities.map((c) => c.itinerary.length));
  counts.forEach((n) => out.add(String(n)));
  return out;
}

// ---------- Uniqueness and length ----------

test('every catalog page has a title and description, and no two pages share either', () => {
  assert.ok(pages.length > 280, `only ${pages.length} pages - the page list lost a type`);
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const p of pages) {
    for (const [k, v] of [['title', p.snippet.title], ['description', p.snippet.description]] as const) {
      assert.ok(v.trim(), `${p.path}: empty ${k}`);
      const key = `${k}:${v}`;
      if (seen.has(key)) dupes.push(`${p.path} = ${seen.get(key)} (${k})`);
      seen.set(key, p.path);
    }
  }
  assert.deepEqual(dupes, []);
});

test(`every title fits ${TITLE_BUDGET} characters before the site name`, () => {
  const over = pages
    .filter((p) => p.snippet.head.length > TITLE_BUDGET)
    .map((p) => `${p.path} (${p.snippet.head.length}): ${p.snippet.head}`);
  assert.deepEqual(over, []);
  for (const p of pages) assert.equal(p.snippet.title, `${p.snippet.head}${TITLE_SUFFIX}`);
});

test('every description is 120-160 characters', () => {
  const off = pages
    .filter((p) => p.snippet.description.length < 120 || p.snippet.description.length > 160)
    .map((p) => `${p.path} (${p.snippet.description.length})`);
  assert.deepEqual(off, []);
});

test('no description opens with a generic invitation', () => {
  const generic = pages.filter((p) => /^(גלו|גלה|בואו|הכירו|ברוכים)/.test(p.snippet.description));
  assert.deepEqual(generic.map((p) => p.path), []);
});

// ---------- The fact rule ----------

test('every number in a title or description is in that page’s data', () => {
  const bad: string[] = [];
  for (const p of pages) {
    const allowed = allowedNumbers(p);
    for (const n of text(p).match(/\d+(?:\.\d+)?/g) ?? []) {
      if (!allowed.has(String(Number(n)))) bad.push(`${p.path}: ${n}`);
    }
  }
  assert.deepEqual(bad, []);
});

const CLAIMS_VISA_FREE = /ללא ויזה|פטור(?:ים)? מ(?:וויזה|אשרה)/;
const VISA_TEXT_FREE = /ללא ויזה|פטורים מוויזה|פטורים מאשרה|פטור מאשרה|לא צריכים ויזה/;

test('"visa-free" appears only where the visa text says so, with the visa text’s own span', () => {
  const bad: string[] = [];
  for (const p of pages) {
    const t = text(p);
    if (!CLAIMS_VISA_FREE.test(t)) continue;
    const visa = p.country.practical.visa;
    if (!VISA_TEXT_FREE.test(visa)) bad.push(`${p.path}: claims visa-free, visa text does not`);
    const visaNumbers = numbersIn(visa);
    for (const m of t.matchAll(/(?:ללא ויזה|פטור(?:ים)? מ(?:וויזה|אשרה)[^.]{0,30}?) עד (\d+) יום/g)) {
      if (!visaNumbers.has(m[1])) bad.push(`${p.path}: span ${m[1]} days is not in the visa text`);
    }
  }
  assert.deepEqual(bad, []);
});

test('where an Israeli passport is refused or restricted, every snippet says so and none says visa-free', () => {
  const kinds = (c: Country) => visaFact(c.practical.visa)?.kind;
  const refused = countries.filter((c) => kinds(c) === 'refused' || kinds(c) === 'restricted');
  assert.deepEqual(
    refused.map((c) => `${c.slug}:${kinds(c)}`).sort(),
    ['indonesia:restricted', 'malaysia:restricted', 'oman:refused'],
  );
  for (const p of pages.filter((x) => refused.includes(x.country))) {
    assert.ok(!CLAIMS_VISA_FREE.test(text(p)), `${p.path} says visa-free`);
    assert.match(text(p), /דרכון ישראלי/, `${p.path} does not mention the passport`);
    assert.match(p.snippet.head, /דרכון|כניסה/, `${p.path}: the title reads as an all-clear`);
  }
});

/** The overview a page's kashrut wording must agree with: its own, or any of a country's cities. */
const overviewsOf = (p: Page) =>
  p.dest ? [p.dest.practical.kosherOverview] : p.cities.map((c) => c.practical.kosherOverview);

test('kosher wording agrees with the kashrut overview', () => {
  const bad: string[] = [];
  for (const p of pages) {
    const t = text(p);
    const overviews = overviewsOf(p);
    // Positive: "kosher restaurants" / "N kosher places" not preceded by a negation.
    for (const m of t.matchAll(/(\S+ )?(מסעדות כשרות|מקומות כשרים)/g)) {
      if (m[1]?.trim() === 'אין') continue;
      const ok = overviews.some((o) =>
        m[2] === 'מסעדות כשרות' ? /מסעדות כשרות/.test(o) : /(מאות|עשרות) [^.]{0,50}כשר/.test(o),
      );
      if (!ok) bad.push(`${p.path}: "${m[2]}" with no overview saying so`);
    }
    if (/חב"ד|חב״ד/.test(t) && !overviews.some((o) => /חב"ד|חב״ד/.test(o))) {
      bad.push(`${p.path}: names Chabad, overview does not`);
    }
    // Negative: "no kosher restaurant(s)" needs the overview to say there are none.
    if (/אין מסעד(?:ה|ות) כשר/.test(t) && !overviews.some((o) => /אין[^.]{0,40}מסעד(?:ה|ות) כשר/.test(o))) {
      bad.push(`${p.path}: says no kosher restaurant, overview does not`);
    }
  }
  assert.deepEqual(bad, []);
});

test('a direct flight is claimed only where the flight sentence supports it', () => {
  const bad: string[] = [];
  for (const p of pages) {
    const t = text(p);
    const positive = [...t.matchAll(/(\S+ )?(?:טיסה ישירה|טיסות ישירות|טסים ישירות|קו ישיר)/g)].filter(
      (m) => m[1]?.trim() !== 'אין',
    );
    const negative = /אין (?:טיסה ישירה|טיסות ישירות|קו ישיר)/.test(t);
    const override = SNIPPET_OVERRIDES[p.path];
    const flightQuotes = override?.facts.filter((f) => /flights$/.test(f.source)).map((f) => f.quote) ?? [];
    const sources = p.dest ? [p.dest] : p.cities;

    if (positive.length) {
      const ok = override
        ? flightQuotes.some((q) => /ישיר/.test(q) && !/^אין/.test(q))
        : sources.some((s) => flightFact(s)?.kind === 'direct');
      if (!ok) bad.push(`${p.path}: claims a direct flight`);
    }
    if (negative) {
      const ok = override
        ? flightQuotes.some((q) => /^אין/.test(q) && /ישיר/.test(q))
        : sources.length > 0 && sources.every((s) => flightFact(s)?.kind === 'none');
      if (!ok) bad.push(`${p.path}: claims no direct flight`);
    }
  }
  assert.deepEqual(bad, []);
});

test('domestic pages never mention flights, visas or "for Israelis"', () => {
  const home = pages.filter((p) => (p.dest ? isDomestic(p.dest) : p.country.slug === 'israel'));
  assert.ok(home.length >= 10);
  for (const p of home) assert.doesNotMatch(text(p), /טיס|ויזה|אשרה|לישראלים/, p.path);
  assert.equal(visaHeading(countries.find((c) => c.slug === 'israel')!), null);
});

// ---------- The hand-written overrides ----------

test('every override belongs to a real page and cites quotes that are really in its data', () => {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const bad: string[] = [];
  for (const [path, o] of Object.entries(SNIPPET_OVERRIDES)) {
    const p = byPath.get(path);
    if (!p) {
      bad.push(`${path}: no such page`);
      continue;
    }
    assert.ok(p.snippet.overridden, `${path}: override not applied`);
    assert.equal(p.snippet.head, o.title);
    assert.ok(o.facts.length > 0, `${path}: no facts listed`);
    const fields = fieldsOf(p);
    for (const f of o.facts) {
      if (!(f.source in fields)) bad.push(`${path}: unknown source "${f.source}"`);
      else if (!fields[f.source].includes(f.quote)) bad.push(`${path}: "${f.quote}" is not in ${f.source}`);
    }
  }
  assert.deepEqual(bad, []);
  assert.equal(Object.keys(SNIPPET_OVERRIDES).length, 15);
});

// ---------- Headings ----------

test('headings match the query each page type answers', () => {
  for (const p of pages) {
    const h1 = p.snippet.h1;
    if (SNIPPET_OVERRIDES[p.path]?.h1) continue;
    if (p.kind === 'itinerary') assert.match(h1, /^טיול .+ \S+ ימים: מסלול יום-יום$/, p.path);
    if (p.kind === 'country') assert.match(h1, /^(טיול [לב]|.+ לישראלים$)/, p.path);
    if (p.kind === 'destination') assert.match(h1, /^(טיול ב|.+ לישראלים$)/, p.path);
  }
  const sicily = pages.find((p) => p.path === '/itinerary/sicily/5')!;
  assert.equal(sicily.snippet.h1, 'טיול לסיציליה 5 ימים: מסלול יום-יום');
  assert.equal(visaHeading(countries.find((c) => c.slug === 'iceland')!), 'צריך ויזה לאיסלנד?');
});

test('no title or heading keeps the definite article behind a prefix letter', () => {
  for (const p of pages) {
    for (const w of DEFINITE_FIRST_WORDS) {
      for (const pre of ['ל', 'ב']) {
        assert.ok(!`${p.snippet.title} ${p.snippet.h1}`.includes(pre + w), `${p.path}: ${pre}${w}`);
      }
    }
  }
});

// ---------- The extractors, against the cases that went wrong while building them ----------

const dest = (slug: string) => destinations.find((d) => d.slug === slug)!;
const country = (slug: string) => countries.find((c) => c.slug === slug)!;

test('every extracted fact quotes its field verbatim', () => {
  for (const d of destinations) {
    const f = flightFact(d);
    if (f) assert.ok(d.practical.flights.includes(f.quote), d.slug);
    if (f?.durationQuote) assert.ok(d.practical.flights.includes(f.durationQuote), d.slug);
    const s = seasonFact(d.bestSeason);
    if (s) assert.ok(withoutAsides(d.bestSeason).includes(s.quote!), d.slug);
    const k = kosherFact(d);
    if (k) assert.ok(d.practical.kosherOverview.includes(k.quote!), d.slug);
  }
  for (const c of countries) {
    const v = visaFact(c.practical.visa);
    if (v) assert.ok(c.practical.visa.includes(v.quote), c.slug);
  }
});

test('flights: a direct flight to a gateway city is not a direct flight to the destination', () => {
  for (const slug of ['interlaken', 'samarkand', 'rila-pirin', 'north-zealand', 'south-albania', 'south-holland', 'valais-zermatt']) {
    assert.equal(flightFact(dest(slug)), null, slug);
  }
  assert.equal(flightFact(dest('rome'))?.short, 'טיסה ישירה של כ-3.5 שעות');
  assert.equal(flightFact(dest('venice'))?.short, 'טיסה ישירה של כ-3.5 שעות'); // "about three hours and a half"
  assert.equal(flightFact(dest('athens'))?.short, 'טיסה ישירה של כשעתיים');
  assert.equal(flightFact(dest('paris'))?.short, 'טיסה ישירה מנתב"ג'); // 4h45: no rounded length
  assert.equal(flightFact(dest('munich'))?.kind, 'direct');
  assert.equal(flightFact(dest('florence')), null); // seasonal
  assert.equal(flightFact(dest('santorini-mykonos')), null); // "no direct flight MOST of the year"
  assert.equal(flightFact(dest('tasmania'))?.kind, 'none');
  assert.ok(firstSentence(dest('vienna').practical.flights).endsWith('כ-3.5 שעות'), 'a decimal is not a full stop');
});

test('seasons: the whole recommendation or nothing', () => {
  assert.equal(seasonFact(dest('tokyo').bestSeason)?.text, 'סוף מרץ-אפריל ואוקטובר-נובמבר');
  assert.equal(seasonFact(dest('amsterdam').bestSeason)?.text, 'אפריל-מאי וספטמבר-אוקטובר');
  assert.equal(seasonFact(dest('rome').bestSeason)?.text, 'מרץ-מאי, ספטמבר-נובמבר');
  assert.equal(seasonFact(dest('penang-perak').bestSeason), null); // west coast only
});

test('kashrut: the overview’s words, never a count of map entries', () => {
  assert.equal(kosherFact(dest('rome'))?.text, 'מסעדות כשרות');
  assert.equal(kosherFact(dest('new-york'))?.text, 'מאות מקומות כשרים');
  assert.equal(kosherFact(dest('vienna'))?.text, 'מסעדות כשרות'); // "no problem eating kosher" is not a negation
  assert.equal(kosherFact(dest('sicily')), null);
  assert.equal(kosherFact(dest('jutland')), null);
  assert.ok(kosherNegated(dest('tasmania').practical.kosherOverview));
});

test('visa: free only when plain, never past a pre-registration, never for a refusal', () => {
  assert.equal(visaFact(country('spain').practical.visa)?.text, 'ללא ויזה עד 90 יום');
  assert.equal(visaFact(country('georgia').practical.visa)?.text, 'ללא ויזה עד שנה');
  assert.equal(visaFact(country('kazakhstan').practical.visa)?.text, 'ללא ויזה עד 30 יום');
  for (const slug of ['usa', 'canada', 'united-kingdom', 'thailand', 'new-zealand', 'philippines', 'mauritius', 'egypt', 'chile', 'costa-rica']) {
    assert.notEqual(visaFact(country(slug).practical.visa)?.kind, 'free', slug);
  }
  assert.equal(visaFact(country('oman').practical.visa)?.kind, 'refused');
  assert.equal(visaFact(country('vietnam').practical.visa)?.kind, 'required');
  assert.equal(visaFact(country('jordan').practical.visa), null); // its first sentence is not the visa answer
});
