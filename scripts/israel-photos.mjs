/**
 * Hero photographs for the Israel entries, from Wikimedia.
 *
 * Nine destinations plus the country would otherwise render as gradient placeholders
 * beside 166 photographed ones - the fallback works, but a country page of grey cards
 * reads as unfinished rather than as new.
 *
 * The width is the trap here, and it is recorded in CLAUDE.md: Wikimedia serves thumbs
 * only at listed widths, and an unlisted one returns HTTP 400. So the URL is not
 * hand-assembled - it is taken from the API's own thumbnail response at a listed width,
 * which is the only way to be sure the file's path hashes are right too.
 */
const TARGETS = [
  ['country:israel', 'Israel'],
  ['jerusalem', 'Jerusalem'],
  ['tel-aviv', 'Tel Aviv'],
  ['dead-sea', 'Dead Sea'],
  ['eilat', 'Eilat'],
  ['mitzpe-ramon', 'Makhtesh Ramon'],
  ['galilee-kinneret', 'Sea of Galilee'],
  ['golan', 'Golan Heights'],
  ['haifa-carmel', 'Haifa'],
  ['akko-caesarea', 'Acre, Israel'],
];

const WIDTH = 960; // a listed width - 250/330/500/960 are the ones that do not 400.
const UA = 'tiyul-plus-catalog/1.0 (natikyan153@gmail.com)';

const out = {};
for (const [slug, article] of TARGETS) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages' +
    `&piprop=thumbnail&pithumbsize=${WIDTH}&titles=${encodeURIComponent(article)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const body = await res.json();
  const pages = body?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const thumb = page?.thumbnail?.source;
  if (!thumb) {
    console.log(`${slug.padEnd(20)} NO IMAGE for "${article}"`);
    continue;
  }
  // Confirm it actually serves before it goes anywhere near the catalog.
  const head = await fetch(thumb, { method: 'GET', headers: { 'User-Agent': UA } });
  console.log(`${slug.padEnd(20)} ${head.status}  ${thumb.slice(0, 110)}`);
  if (head.ok) out[slug] = thumb;
  await new Promise((r) => setTimeout(r, 300));
}

console.log('\n--- resolved ---');
console.log(JSON.stringify(out, null, 2));
