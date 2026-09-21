/**
 * The share card's photograph.
 *
 * Two things are guarded, and they pull against each other on purpose: the
 * image must be wide enough for Facebook and WhatsApp to draw a large card, and
 * it must never be wider than the original, because Commons 404s a thumbnail
 * bigger than its source and that is how 170 catalog URLs died once already.
 * A test that only checked the first would be satisfied by asking for 1200px
 * everywhere, which is precisely the bug.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { shareImage } from './photoCredit.ts';
import { MIRROR_WIDTH } from '../photoMirror.ts';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import credits from '../../../scripts/photo-credits.json' with { type: 'json' };

const MANIFEST = credits as Record<string, { width?: number | null; height?: number | null }>;

/**
 * Facebook's floor for a large card. Below it the link renders as a small
 * square thumbnail instead, which is the state this whole change is undoing.
 */
const LARGE_CARD_MIN = 600;

const U500 =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Colosseo_2020.jpg/500px-Colosseo_2020.jpg';

const fileOf = (url: string) => decodeURIComponent(url.split('/').slice(-2, -1)[0] ?? '');
const widthOf = (url: string) => {
  const m = /\/(\d+)px-/.exec(url);
  return m ? Number(m[1]) : null;
};

test('no photograph means no image, not an empty one', () => {
  assert.equal(shareImage(undefined, 'x'), null);
  assert.equal(shareImage('', 'x'), null);
});

test('a non-Commons photograph passes through with no invented dimensions', () => {
  // The Unsplash heroes are already requested at 1600px. We do not know their
  // aspect ratio, and a guessed height is worse for a scraper than none.
  const u = 'https://images.unsplash.com/photo-123?w=1600';
  assert.deepEqual(shareImage(u, 'alt'), { url: u, alt: 'alt' });
});

test('the alt text is carried through untouched', () => {
  assert.equal(shareImage(U500, 'רומא - העיר הנצחית')?.alt, 'רומא - העיר הנצחית');
});

test('every width it asks for is one Wikimedia will actually serve', () => {
  /*
    The assertion that matters most, because the failure is invisible from here:
    a width off Wikimedia's list is HTTP 400, not a smaller picture. Measured -
    640/800/1024/1200 all 400, 250/330/500/960/1280 all 200 - which is why
    `Math.min(ceiling, sourceWidth)` cannot be the rule however obvious it looks.
  */
  const allowed = new Set([250, 330, 500, 960, 1280]);
  const bad: string[] = [];
  const urls = [
    ...destinations.map((d) => d.photo),
    ...countries.map((c) => c.photo),
  ].filter((u): u is string => Boolean(u));

  for (const u of urls) {
    const asked = widthOf(shareImage(u, 'x')!.url);
    if (asked !== null && !allowed.has(asked)) bad.push(`${asked}px for ${u}`);
  }
  assert.deepEqual(bad, [], 'a non-standard thumbnail width is a guaranteed 400');
});

test('the declared size describes the file, not the original', () => {
  // Wikimedia upscales to a listed size, so a 604px original really does come
  // back as 960px of bytes. Declaring the ORIGINAL's width there would be the
  // mistake - the scraper trusts the tag over the pixels either way, so the tag
  // has to match what it will download.
  for (const u of countries.map((c) => c.photo).filter(Boolean).slice(0, 60)) {
    const img = shareImage(u, 'x')!;
    if (!img.width) continue;
    assert.equal(img.width, widthOf(img.url), `declared size disagrees with the URL: ${u}`);
  }
});

test('and never past our own ceiling', () => {
  const huge = shareImage(U500, 'x');
  assert.ok((widthOf(huge!.url) ?? 0) <= MIRROR_WIDTH);
});

test('every catalog page whose original allows it now gets a large card', () => {
  const pages = [
    ...destinations.map((d) => ({ what: `destinations/${d.slug}`, photo: d.photo })),
    ...countries.map((c) => ({ what: `countries/${c.slug}`, photo: c.photo })),
  ].filter((p) => p.photo);

  const small: string[] = [];
  for (const p of pages) {
    const img = shareImage(p.photo, 'x');
    const asked = widthOf(img!.url);
    if (asked === null) continue; // not a Commons thumb; sized by its own host
    const source = MANIFEST[fileOf(p.photo!)]?.width ?? null;
    // Too small is only acceptable when the ORIGINAL is too small. An unknown
    // source width counts as acceptable for the same reason widening refuses to
    // guess - but it must stay rare, which the next assertion pins.
    if (asked < LARGE_CARD_MIN && source !== null && source >= LARGE_CARD_MIN) {
      small.push(`${p.what}: ${asked}px from a ${source}px original`);
    }
  }
  assert.deepEqual(small.slice(0, 5), [], `${small.length} pages still share as a thumbnail`);
});

test('the fix actually reaches most of the catalog, not a handful of pages', () => {
  // Before this change every stored 500px thumb went out at 500. If a refactor
  // quietly stopped widening, the previous test would still pass on the pages
  // whose originals are genuinely small - this one would not.
  const photos = [...destinations.map((d) => d.photo), ...countries.map((c) => c.photo)].filter(
    (u): u is string => typeof u === 'string' && u.includes('upload.wikimedia.org'),
  );
  const large = photos.filter((u) => (widthOf(shareImage(u, 'x')!.url) ?? 0) >= LARGE_CARD_MIN);
  assert.ok(
    large.length > photos.length * 0.8,
    `only ${large.length} of ${photos.length} Commons photographs reach ${LARGE_CARD_MIN}px`,
  );
});

test('the declared height matches the original aspect ratio', () => {
  const withDims = countries
    .map((c) => ({ photo: c.photo, img: shareImage(c.photo, 'x') }))
    .filter((r) => r.img?.height);
  assert.ok(withDims.length > 50, 'dimensions are barely being declared at all');

  for (const { photo, img } of withDims.slice(0, 40)) {
    const rec = MANIFEST[fileOf(photo!)];
    const expected = Math.round((img!.width! * rec.height!) / rec.width!);
    assert.equal(img!.height, expected, `wrong height for ${photo}`);
  }
});

/**
 * The class guard. Passing `dest.photo` straight into `images:` is the bug this
 * change fixes, and it is one autocomplete away from coming back on the next
 * page that grows a share card.
 */
test('no route hands a raw catalog photo to openGraph', () => {
  const appDir = join(process.cwd(), 'src', 'app');
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
        const src = readFileSync(full, 'utf8');
        // `images: [ ... .photo` - the raw field, rather than a ShareImage.
        const m = /images:\s*\[[^\]]*\.photo\b/.exec(src);
        if (m) offenders.push(`${relative(process.cwd(), full).split(sep).join('/')}`);
      }
    }
  };
  walk(appDir);

  assert.deepEqual(offenders, [], 'pass the photo through shareImage() so it is wide enough');
});
