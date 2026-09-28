/**
 * Emit the Israel entries into `src/data/countries.ts` and `src/data/destinations.ts`.
 *
 * Generated rather than hand-written for one reason: the coordinates. They come from
 * `israel-coords.json`, which was collected from OSM and then checked against each
 * destination's centre - copying 102 of them by hand into a 68,000-line file is a
 * transcription error waiting to happen, and a transcription error here is a pin in the
 * wrong city that no test would catch.
 *
 * Idempotent: it refuses to run twice by checking for the marker comment first, so a
 * re-run cannot append a second copy of the catalog.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { COUNTRY, DESTINATIONS } from './israel-seed.mjs';
import { DESTINATIONS_NORTH } from './israel-seed-north.mjs';

const ALL = [...DESTINATIONS, ...DESTINATIONS_NORTH];
const coords = JSON.parse(readFileSync('scripts/israel-coords.json', 'utf8'));
const MARKER = '// ---------- Israel (domestic) ----------';

/** Single-quoted TS string, escaping what must be escaped and nothing else. */
const s = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Six decimals is ~0.1m and the geocoder's own precision does not justify it. Five is
 * ~1m and still an order of magnitude finer than `coordPrecision.test.ts` demands,
 * which is three. Trimmed for readability, not for correctness.
 */
const round5 = (n) => Number(n.toFixed(5));

function placeTs(p) {
  const c = coords[p.id];
  if (!c) throw new Error(`no coordinate for ${p.id} - run israel-geocode.mjs first`);
  const bits = [
    `      id: ${s(p.id)}`,
    `      name: ${s(p.name)}`,
    `      nameLocal: ${s(p.nameLocal)}`,
    `      category: ${s(p.category)}`,
    `      lat: ${round5(c.lat)}`,
    `      lng: ${round5(c.lng)}`,
    `      description: ${s(p.description)}`,
  ];
  if (p.durationMin) bits.push(`      durationMin: ${p.durationMin}`);
  if (p.priceLevel !== undefined) bits.push(`      priceLevel: ${p.priceLevel}`);
  if (p.tags?.length) bits.push(`      tags: [${p.tags.map(s).join(', ')}]`);
  if (p.mustSee) bits.push(`      mustSee: true`);
  return `    {\n${bits.join(',\n')},\n    }`;
}

function dayTs(d) {
  const notes = d.notes ? `,\n      notes: ${s(d.notes)}` : '';
  return `    {\n      day: ${d.day},\n      title: ${s(d.title)},\n      placeIds: [${d.placeIds
    .map(s)
    .join(', ')}]${notes},\n    }`;
}

function destTs(d) {
  return `  {
    slug: ${s(d.slug)},
    name: ${s(d.name)},
    nameLocal: ${s(d.nameLocal)},
    countrySlug: 'israel',
    flag: '🇮🇱',
    center: { lat: ${d.center.lat}, lng: ${d.center.lng} },
    zoom: ${d.zoom},
    tagline: ${s(d.tagline)},
    summary: ${s(d.summary)},
    bestSeason: ${s(d.bestSeason)},
    places: [
${d.places.map(placeTs).join(',\n')},
    ],
    itinerary: [
${d.itinerary.map(dayTs).join(',\n')},
    ],
    practical: {
      flights: ${s(d.practical.flights)},
      gettingAround: ${s(d.practical.gettingAround)},
      kosherOverview: ${s(d.practical.kosherOverview)},
    },
  }`;
}

// ---------- countries.ts ----------
{
  const f = 'src/data/countries.ts';
  let src = readFileSync(f, 'utf8');
  if (src.includes("slug: 'israel'")) {
    console.log('countries.ts: israel already present, skipped');
  } else {
    const entry = `  {
    slug: 'israel',
    name: ${s(COUNTRY.name)},
    nameLocal: ${s(COUNTRY.nameLocal)},
    flag: '🇮🇱',
    tagline: ${s(COUNTRY.tagline)},
    summary: ${s(COUNTRY.summary)},
    practical: {
      visa: ${s(COUNTRY.practical.visa)},
      currency: ${s(COUNTRY.practical.currency)},
      sim: ${s(COUNTRY.practical.sim)},
      payments: ${s(COUNTRY.practical.payments)},
    },
  },
`;
    // Before the array's closing bracket, which is the last `];` in the file body.
    const at = src.lastIndexOf('];');
    src = src.slice(0, at) + entry + src.slice(at);
    writeFileSync(f, src, 'utf8');
    console.log('countries.ts: added israel');
  }
}

// ---------- destinations.ts ----------
{
  const f = 'src/data/destinations.ts';
  let src = readFileSync(f, 'utf8');
  if (src.includes(MARKER)) {
    console.log('destinations.ts: already generated, skipped (delete the marker to redo)');
  } else {
    const block = `${MARKER}\n  // Coordinates collected from OpenStreetMap and range-checked against each\n  // destination's centre - see scripts/israel-geocode.mjs. Domestic destinations carry\n  // no flight facts: \`practical.flights\` answers "how do I get there" instead, and the\n  // UI label changes for the home country.\n${ALL.map(destTs).join(',\n')},\n`;
    const at = src.lastIndexOf('];');
    src = src.slice(0, at) + block + src.slice(at);
    writeFileSync(f, src, 'utf8');
    const places = ALL.reduce((n, d) => n + d.places.length, 0);
    console.log(`destinations.ts: added ${ALL.length} destinations, ${places} places`);
  }
}
