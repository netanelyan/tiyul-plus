import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata, canonical, SITE_URL } from './site';

/**
 * These assert the two failures that actually shipped, not the happy path.
 *
 * The first is the reported bug: sixteen pages inherited the root layout's
 * canonical and told Google they were copies of the homepage. The second is
 * the one that fixing the first could easily have introduced - Next replaces
 * a parent's `openGraph` wholesale, so a page that declares one loses the
 * share image unless it repeats it.
 */

test('a page canonicalises to itself, never to the homepage', () => {
  const m = pageMetadata({ path: '/countries', title: 'יעדים' });
  assert.equal(m.alternates?.canonical, 'https://www.tiyulplus.com/countries');
  assert.notEqual(m.alternates?.canonical, SITE_URL);
});

test('og:url matches the canonical - a share names the page it opens', () => {
  for (const path of ['/countries', '/kosher', '/about', '/contact', '/terms']) {
    const m = pageMetadata({ path, title: 't' });
    assert.equal(m.openGraph?.url, canonical(path), `og:url wrong for ${path}`);
    assert.equal(m.alternates?.canonical, m.openGraph?.url, `canonical and og:url differ for ${path}`);
  }
});

test('the share image survives declaring openGraph', () => {
  // Measured on production: /collections declares openGraph and serves no
  // og:image, because a child's openGraph replaces the parent's rather than
  // merging into it. A page built by this helper must not repeat that.
  const m = pageMetadata({ path: '/about', title: 'אודות' });
  const images = m.openGraph?.images;
  assert.ok(Array.isArray(images) && images.length > 0, 'openGraph.images is missing');
  assert.ok(Array.isArray(m.twitter?.images) && m.twitter.images.length > 0, 'twitter images missing');
});

test('a page with its own photo overrides the default card', () => {
  const m = pageMetadata({ path: '/x', title: 't', images: ['https://example.com/a.jpg'] });
  assert.deepEqual(m.openGraph?.images, ['https://example.com/a.jpg']);
});

test('noindex is opt-in, and always keeps follow', () => {
  assert.equal(pageMetadata({ path: '/about', title: 't' }).robots, undefined);
  const hidden = pageMetadata({ path: '/account', title: 't', noindex: true });
  assert.deepEqual(hidden.robots, { index: false, follow: true });
});

test('a missing description is omitted, not emitted empty', () => {
  const m = pageMetadata({ path: '/planner', title: 'מתכנן' });
  assert.equal('description' in m, false);
  assert.equal('description' in (m.openGraph ?? {}), false);
});

test('the homepage path gives the bare origin, with no trailing slash', () => {
  const m = pageMetadata({ path: '/', title: 't' });
  assert.equal(m.alternates?.canonical, SITE_URL);
  assert.equal(m.openGraph?.url, SITE_URL);
});
