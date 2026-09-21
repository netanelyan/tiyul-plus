/**
 * Validates every JSON-LD node this site emits against the real schema.org
 * vocabulary: each `@type` must be a Class, and each property must be a
 * Property whose `domainIncludes` covers the type it is used on, walking up
 * the class hierarchy.
 *
 * Committed because it found a real defect on its first run: every one of the
 * 30 promoted destination pages was emitting `isPartOf: { WebSite }` on a
 * TouristDestination. `isPartOf` has a domain of CreativeWork and a
 * TouristDestination is a Place, so the property was simply invalid there -
 * and nothing in the type system, the build or the test suite could see it,
 * because JSON-LD is just an object until a crawler reads it.
 *
 * It needs the network once to fetch the vocabulary, which is why it is a
 * script rather than a test: the suite runs offline. The vocabulary is cached
 * in .schemaorg.jsonld (gitignored) and reused.
 *
 * Usage:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-jsonld.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const CACHE = '.schemaorg.jsonld';
const VOCAB_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';
if (!existsSync(CACHE)) {
  const res = await fetch(VOCAB_URL);
  if (!res.ok) throw new Error(`could not fetch the schema.org vocabulary: HTTP ${res.status}`);
  writeFileSync(CACHE, await res.text());
}
const vocab = JSON.parse(readFileSync(CACHE, 'utf8'))['@graph'];
const byId = new Map(vocab.map((n) => [n['@id'], n]));
const arr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const isType = (n, t) => arr(n['@type']).includes(t);

const classes = new Set(vocab.filter((n) => isType(n, 'rdfs:Class')).map((n) => n['@id']));
const props = new Map(
  vocab.filter((n) => isType(n, 'rdf:Property')).map((n) => [n['@id'], n]),
);

function ancestors(id, seen = new Set()) {
  if (seen.has(id)) return seen;
  seen.add(id);
  const node = byId.get(id);
  for (const p of arr(node?.['rdfs:subClassOf'])) ancestors(p['@id'], seen);
  return seen;
}

// Properties that are part of JSON-LD itself, not the vocabulary.
const JSONLD_KEYS = new Set(['@context', '@type', '@id', '@graph', '@value', '@list']);

const problems = [];

function checkNode(node, path) {
  const types = arr(node['@type']);
  if (types.length === 0) {
    problems.push(`${path}: node has no @type`);
    return;
  }
  for (const t of types) {
    const id = `schema:${t}`;
    if (!classes.has(id)) {
      problems.push(`${path}: @type "${t}" is not a schema.org class`);
      return;
    }
  }
  const supers = new Set();
  for (const t of types) for (const a of ancestors(`schema:${t}`)) supers.add(a);

  for (const [key, value] of Object.entries(node)) {
    if (JSONLD_KEYS.has(key)) continue;
    const pid = `schema:${key}`;
    const prop = props.get(pid);
    if (!prop) {
      problems.push(`${path}: property "${key}" does not exist in schema.org`);
      continue;
    }
    const domains = arr(prop['schema:domainIncludes']).map((d) => d['@id']);
    if (domains.length && !domains.some((d) => supers.has(d))) {
      problems.push(
        `${path}: "${key}" is not valid on ${types.join('/')} (domain: ${domains
          .map((d) => d.replace('schema:', ''))
          .join(', ')})`,
      );
    }
    for (const v of arr(value)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        // A bare {"@id": ...} reference carries no type of its own; that is legal.
        if (Object.keys(v).length === 1 && '@id' in v) continue;
        checkNode(v, `${path} > ${key}`);
      }
    }
  }
}

const { organizationLd, webSiteLd, collectionPageLd, breadcrumbLd, collectionLd, countryLd, touristDestinationLd, faqPairs, faqLd } = await import(
  '../src/lib/seo/jsonLd.ts'
);
const { destinations } = await import('../src/data/destinations.ts');
const { countries } = await import('../src/data/countries.ts');
const dest = destinations.find((d) => d.slug === 'rome');
const country = countries.find((c) => c.slug === 'italy');

const samples = [
  ['organizationLd', organizationLd()],
  ['webSiteLd', webSiteLd()],
  [
    'collectionPageLd',
    collectionPageLd({
      name: 'n',
      description: 'd',
      path: '/countries',
      items: [{ name: 'Rome', path: '/destinations/rome' }],
    }),
  ],
];

samples.push(['breadcrumbLd', breadcrumbLd([{ name: 'a', path: '/' }, { name: 'b', path: '/countries' }])]);
samples.push(['collectionLd', collectionLd('t', '/collections/x', [{ name: 'Rome', slug: 'rome' }])]);
samples.push(['countryLd', countryLd(country, 5)]);
samples.push(['touristDestinationLd', touristDestinationLd(dest, country)]);
const fq = faqLd(faqPairs(dest, country));
if (fq) samples.push(['faqLd', fq]);
for (const [name, node] of samples) checkNode(node, name);

if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
} else {
  console.log(`OK - ${samples.length} nodes valid against schema.org`);
}
