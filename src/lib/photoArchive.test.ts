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
  // A 700px original must not be asked for 960, however much we would like it.
  const { url, width } = archiveUrl(U500, 700);
  assert.equal(width, 700);
  assert.ok(url.includes('700px-'));
  // And a source narrower than what the URL already asks for changes nothing.
  assert.deepEqual(archiveUrl(U500, 320), { url: U500, width: 500 });
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
  const a = blobPath('Colosseo_2020.jpg', 960);
  assert.equal(a, blobPath('Colosseo_2020.jpg', 960));
  assert.notEqual(a, blobPath('Colosseo_2020.jpg', 500));
  assert.notEqual(a, blobPath('Something_else.jpg', 960));
  assert.match(a, /^catalog-photos\/[0-9a-f]{2}\/[0-9a-f]{64}-960\.jpg$/);
});

test('the path carries no character that needs escaping in a URL', () => {
  for (const name of ["Musée_d'Orsay.jpg", 'Café (Wien).JPG', 'שוק.jpg', 'a b+c%d.png']) {
    const p = blobPath(name, 960);
    assert.equal(p, encodeURI(p), name);
    assert.ok(!/[^a-z0-9/.-]/.test(p), `${name} -> ${p}`);
  }
});
