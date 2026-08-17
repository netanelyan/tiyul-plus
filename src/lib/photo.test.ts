/**
 * This test exists because of entry (k) in the session log: once, `/500px-`
 * was swapped for `/960px-` on 170 URLs in one go, every one of them died
 * silently (the browser falls back to the gradient, so a 404 and a working
 * image look identical in code), and it took two sessions to diagnose.
 * The "only shrink, never enlarge" rule is the only thing preventing that,
 * which is why it is tested rather than merely written down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thumb, thumbSrcSet, thumbWidth } from './photo.ts';
import { destinations } from '../data/destinations.ts';

const URL500 =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Wien.jpg/500px-Wien.jpg';
const URL250 =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Wien.jpg/250px-Wien.jpg';

test('מקטין', () => {
  assert.equal(thumb(URL500, 250), URL250);
  assert.equal(thumbWidth(URL500), 500);
});

test('לעולם לא מרחיב - זה הבאג של ערך (k)', () => {
  assert.equal(thumb(URL250, 500), URL250);
  assert.equal(thumb(URL250, 960), URL250);
  assert.equal(thumb(URL500, 500), URL500);
});

test('כתובת שאינה thumb של ויקישיתוף חוזרת כמו שהיא', () => {
  const unsplash = 'https://images.unsplash.com/photo-1488646953014?w=1600';
  assert.equal(thumb(unsplash, 250), unsplash);
  assert.equal(thumbWidth(unsplash), null);
  assert.equal(thumbSrcSet(unsplash), undefined);
});

test('srcSet מכיל רק רוחבים קטנים מהמקור, ותמיד את המקור עצמו', () => {
  const s = thumbSrcSet(URL500)!;
  assert.ok(s.includes('250px-Wien.jpg 250w'));
  assert.ok(s.includes('330px-Wien.jpg 330w'));
  assert.ok(s.includes(`${URL500} 500w`));
  assert.ok(!s.includes('960'));
  // A really narrow source - nothing to shrink to, so no srcSet at all
  assert.equal(thumbSrcSet(URL250, [250, 330, 500]), undefined);
});

test('כל כתובת בקטלוג ניתנת לפירוק - כלומר הכלל באמת חל עליהן', () => {
  const urls = destinations
    .flatMap((d) => [d.photo, d.iconicLandmark?.photo, ...d.places.map((p) => p.photo)])
    .filter((u): u is string => Boolean(u) && u!.includes('upload.wikimedia.org'));
  assert.ok(urls.length > 1000, `expected the catalog to carry photos, got ${urls.length}`);
  const unparsed = urls.filter((u) => thumbWidth(u) === null);
  assert.deepEqual(unparsed, [], 'these URLs do not match the thumb pattern');
  // And shrinking preserves the filename - only the width segment changes
  for (const u of urls.slice(0, 50)) {
    const small = thumb(u, 250);
    assert.equal(small.split('/').pop()!.replace(/^\d+px-/, ''), u.split('/').pop()!.replace(/^\d+px-/, ''));
  }
});
