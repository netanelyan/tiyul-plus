/**
 * The photo archive's two pure decisions.
 *
 * `archiveUrl` is the only place in this repo that deliberately asks Wikimedia
 * for a WIDER thumbnail than a URL already names. Widening is what killed 170
 * catalog URLs in an earlier session - Commons serves no thumbnail wider than
 * the source - so the rule that makes it safe is worth a guard rather than a
 * comment: never past the known source width, and never at all without one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIVE_WIDTH,
  archiveUrl,
  blobPath,
  fileNameFromUrl,
} from '../../scripts/lib/archive-url.mjs';

const U500 =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Colosseo_2020.jpg/500px-Colosseo_2020.jpg';

test('with no known source width, the URL is left exactly as it is', () => {
  // The width already in the URL is the only one proven to exist.
  assert.deepEqual(archiveUrl(U500, null), { url: U500, width: 500 });
  assert.deepEqual(archiveUrl(U500, undefined), { url: U500, width: 500 });
  assert.deepEqual(archiveUrl(U500, 0), { url: U500, width: 500 });
});

test('it never asks for a width the source cannot supply', () => {
  /*
    A 700px original must not be asked for 960, however much we would like it -
    and it must not be asked for 700 either, which is what this test used to
    expect. Wikimedia serves only a fixed list of widths and answers HTTP 400
    for anything else (measured: 640/800/1024/1200 all 400, 250/330/500/960/1280
    all 200). So the rounding has to go DOWN to a listed width, and for a 700px
    original the largest listed width that fits is the 500 it already has.
  */
  assert.deepEqual(archiveUrl(U500, 700), { url: U500, width: 500 });
  // A source narrower than what the URL already asks for changes nothing.
  assert.deepEqual(archiveUrl(U500, 320), { url: U500, width: 500 });
});

test('every width it produces is one Wikimedia will actually serve', () => {
  // The guard for the failure above, as a class: any source size at all, and
  // the asked-for width is always on the list.
  const allowed = new Set([250, 330, 500, 960, 1280]);
  for (let source = 200; source <= 5000; source += 37) {
    const { url } = archiveUrl(U500, source);
    const asked = Number(/\/(\d+)px-/.exec(url)![1]);
    assert.ok(allowed.has(asked), `source ${source} produced a ${asked}px request`);
  }
});

test('it widens to the archive ceiling when the source genuinely allows it', () => {
  const { url, width } = archiveUrl(U500, 4000);
  assert.equal(width, ARCHIVE_WIDTH);
  assert.ok(url.includes(`${ARCHIVE_WIDTH}px-`));
  assert.ok(url.startsWith('https://upload.wikimedia.org/'));
  // Only the width segment moves - the hash path and filename are untouched.
  assert.equal(url.replace(`${ARCHIVE_WIDTH}px-`, '500px-'), U500);
});

test('a URL that is not a Commons thumb is passed through untouched', () => {
  const other = 'https://images.unsplash.com/photo-123';
  assert.deepEqual(archiveUrl(other, 4000), { url: other, width: null });
});

test('the filename is recovered and percent-decoding is undone', () => {
  assert.equal(fileNameFromUrl(U500), 'Colosseo_2020.jpg');
  const encoded =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Mus%C3%A9e_d%27Orsay.jpg/500px-Mus%C3%A9e_d%27Orsay.jpg';
  assert.equal(fileNameFromUrl(encoded), "Musée_d'Orsay.jpg");
  assert.equal(fileNameFromUrl('https://example.com/nope.png'), null);
});

test('the path is deterministic, so re-running overwrites rather than duplicates', () => {
  const a = blobPath('Colosseo_2020.jpg');
  assert.equal(a, blobPath('Colosseo_2020.jpg'));
  assert.notEqual(a, blobPath('Something_else.jpg'));
  // The width is in the path as a namespace, not as a claim about this file -
  // about 200 originals are narrower than the ceiling and are stored as they are.
  assert.match(a, new RegExp(`^catalog-photos/${ARCHIVE_WIDTH}/[0-9a-f]{8}-`));
});

test('the path carries no character that needs escaping in a URL', () => {
  // This is what lets the browser DERIVE the URL instead of looking it up: if
  // the path needed percent-encoding, the store's encoding and ours would have
  // to agree exactly, and a disagreement would 404 every image on the site.
  for (const name of ["Musée_d'Orsay.jpg", 'Café (Wien).JPG', 'שוק.jpg', 'a b+c%d.png']) {
    const p = blobPath(name);
    assert.equal(p, encodeURI(p), name);
    assert.ok(!/[^A-Za-z0-9/._-]/.test(p), `${name} -> ${p}`);
  }
});

test('a name that is nothing but non-Latin characters still gets a usable path', () => {
  // The Hebrew and Japanese filenames in the catalog sanitise to an empty
  // string; without the fallback segment they would all collide on one path.
  const a = blobPath('שוק.jpg');
  const b = blobPath('マーケット.png');
  assert.notEqual(a, b);
  assert.ok(a.length > `catalog-photos/${ARCHIVE_WIDTH}/`.length + 8);
});
