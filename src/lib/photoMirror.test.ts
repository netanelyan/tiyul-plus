/**
 * The mirror's URL derivation.
 *
 * This is the one piece of the photo mirror with no safety net: the browser
 * builds the storage URL from the Commons filename with no lookup, so if the
 * derivation and the uploader ever disagree, every photograph on the site 404s
 * at once. `mirror-photos.mjs` asserts the store agrees at upload time; these
 * assert the derivation itself is stable, ASCII-clean and collision-free across
 * the real catalog.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import {
  MIRROR_WIDTH,
  PHOTO_FALLBACK,
  fnv1a,
  mirrorEnabled,
  mirrorFileName,
  mirrorPathname,
  mirrorUrl,
  photoSrc,
} from './photoMirror.ts';
import { destinations } from '@/data/destinations';

const COMMONS =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Colosseo_2020.jpg/500px-Colosseo_2020.jpg';

test('with no mirror configured the site renders exactly as before', () => {
  // The most important property here. The Blob store has to exist and the script
  // has to finish before a single mirrored URL does, and a version of this that
  // switched itself on at deploy would have served thousands of 404s in between.
  assert.equal(mirrorEnabled(), false);
  assert.equal(mirrorUrl(COMMONS), null);
  assert.equal(photoSrc(COMMONS), COMMONS);
  assert.equal(photoSrc(undefined), undefined);
});

test('the filename is recovered, percent-decoding undone', () => {
  assert.equal(mirrorFileName(COMMONS), 'Colosseo_2020.jpg');
  assert.equal(
    mirrorFileName(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Mus%C3%A9e_d%27Orsay.jpg/500px-Mus%C3%A9e_d%27Orsay.jpg',
    ),
    "Musée_d'Orsay.jpg",
  );
  assert.equal(mirrorFileName('https://images.unsplash.com/photo-123'), null);
  assert.equal(mirrorFileName(undefined), null);
});

test('the path is deterministic and contains no character a URL would encode', () => {
  const p = mirrorPathname('Colosseo_2020.jpg');
  assert.equal(p, mirrorPathname('Colosseo_2020.jpg'));
  assert.ok(p.startsWith(`catalog-photos/${MIRROR_WIDTH}/`));
  for (const name of ["Musée_d'Orsay.jpg", 'Café (Wien).JPG', 'שוק.jpg', 'a b+c%d.png', '東京.jpg']) {
    const path = mirrorPathname(name);
    assert.equal(path, encodeURI(path), name);
    assert.ok(!/[^A-Za-z0-9/._-]/.test(path), `${name} -> ${path}`);
  }
});

test('fnv1a is eight stable hex characters and separates near-identical names', () => {
  assert.match(fnv1a('anything'), /^[0-9a-f]{8}$/);
  assert.equal(fnv1a('Colosseo_2020.jpg'), fnv1a('Colosseo_2020.jpg'));
  assert.notEqual(fnv1a('Colosseo_2020.jpg'), fnv1a('Colosseo_2021.jpg'));
  // Empty input must still produce a value rather than an empty path segment.
  assert.match(fnv1a(''), /^[0-9a-f]{8}$/);
});

test('no two catalog photographs map to the same storage path', () => {
  // A collision is one photograph silently overwriting another in the store, and
  // it would be invisible - the wrong picture on a card, nothing broken. Run
  // against the real catalog rather than a fixture, because the names that could
  // collide are the ones the sanitiser flattens: non-Latin scripts and the many
  // files whose names differ only in punctuation.
  const files = new Map<string, string>();
  const clashes: string[] = [];
  const urls = new Set<string>();
  for (const d of destinations) {
    for (const url of [d.photo, d.iconicLandmark?.photo, ...d.places.map((p) => p.photo)]) {
      if (url) urls.add(url);
    }
  }
  for (const url of urls) {
    const file = mirrorFileName(url);
    if (!file) continue;
    const path = mirrorPathname(file);
    const seen = files.get(path);
    if (seen && seen !== file) clashes.push(`${seen} <-> ${file}`);
    files.set(path, file);
  }
  assert.deepEqual(clashes, []);
  // Guards the guard: if the catalog stopped yielding filenames this would pass
  // by checking nothing.
  assert.ok(files.size > 2000, `only ${files.size} distinct photographs found`);
});

test('once configured, the URL is the base plus the derived path', async () => {
  process.env.NEXT_PUBLIC_PHOTO_MIRROR_BASE = 'https://store123.public.blob.vercel-storage.com/';
  // A fresh module instance: the base is read once at load, which is what lets it
  // be a constant in the browser bundle rather than a per-render lookup.
  const fresh = await import(`${pathToFileURL('src/lib/photoMirror.ts').href}?configured`);
  try {
    assert.equal(fresh.mirrorEnabled(), true);
    // The trailing slash on the env value must not produce a double slash.
    assert.equal(
      fresh.mirrorUrl(COMMONS),
      `https://store123.public.blob.vercel-storage.com/${fresh.mirrorPathname('Colosseo_2020.jpg')}`,
    );
    assert.equal(fresh.photoSrc(COMMONS), fresh.mirrorUrl(COMMONS));
    // Not a Commons thumb - the Unsplash country heroes stay where they are.
    const unsplash = 'https://images.unsplash.com/photo-123';
    assert.equal(fresh.photoSrc(unsplash), unsplash);
  } finally {
    delete process.env.NEXT_PUBLIC_PHOTO_MIRROR_BASE;
  }
});

test('the local fallback is a real file in public/', async () => {
  const { existsSync } = await import('node:fs');
  assert.ok(PHOTO_FALLBACK.startsWith('/'));
  assert.ok(existsSync(`public${PHOTO_FALLBACK}`), `missing public${PHOTO_FALLBACK}`);
});
