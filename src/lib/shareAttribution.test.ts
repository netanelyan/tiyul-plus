/**
 * Share attribution: which link produced which trip.
 *
 * Two rules carry the weight, and both are about a number that would otherwise
 * only ever grow: **first link wins** (so the third trip somebody opens does
 * not steal credit from the one that actually brought them) and **consumed on
 * read** (so every trip they ever build is not stamped with the same origin).
 *
 * A Map-backed `localStorage` stub rather than a browser: the module reads the
 * global lazily, inside the functions, so swapping it per test is enough and no
 * DOM is involved.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/** Minimal Storage, plus a mode where every call throws - a locked-down browser. */
function stubStorage(mode: 'ok' | 'blocked' = 'ok') {
  const map = new Map<string, string>();
  const boom = () => {
    throw new Error('storage blocked');
  };
  const store = {
    getItem: (k: string) => (mode === 'blocked' ? boom() : (map.get(k) ?? null)),
    setItem: (k: string, v: string) => (mode === 'blocked' ? boom() : void map.set(k, v)),
    removeItem: (k: string) => (mode === 'blocked' ? boom() : void map.delete(k)),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  };
  (globalThis as { localStorage?: unknown }).localStorage = store;
  return map;
}

const KEY = 'tiyul-plus:share-source';
const dayStamp = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let store: Map<string, string>;
beforeEach(() => {
  store = stubStorage();
});

test('an arrival is recorded, and the trip built next carries it', async () => {
  const { rememberShareArrival, consumeShareSource } = await import('./shareAttribution.ts');
  rememberShareArrival('abc123');
  assert.deepEqual(consumeShareSource(), { ref: 'share', code: 'abc123' });
});

test('the FIRST link wins - a later one does not overwrite it', async () => {
  const { rememberShareArrival, consumeShareSource } = await import('./shareAttribution.ts');
  rememberShareArrival('first');
  rememberShareArrival('second');
  rememberShareArrival('third');
  assert.deepEqual(consumeShareSource(), { ref: 'share', code: 'first' });
});

test('it is consumed once - the second trip is not credited too', async () => {
  const { rememberShareArrival, consumeShareSource } = await import('./shareAttribution.ts');
  rememberShareArrival('abc123');
  assert.ok(consumeShareSource());
  assert.equal(consumeShareSource(), null, 'a second trip inherited the same origin');
});

test('nothing stored means nothing claimed', async () => {
  const { consumeShareSource } = await import('./shareAttribution.ts');
  assert.equal(consumeShareSource(), null);
});

test('a link opened more than a week ago no longer takes credit', async () => {
  const { consumeShareSource } = await import('./shareAttribution.ts');
  store.set(KEY, JSON.stringify({ code: 'stale', at: dayStamp(8) }));
  assert.equal(consumeShareSource(), null);
  assert.equal(store.get(KEY), undefined, 'an expired record should still be cleared');
});

test('a week-old link still counts - the boundary is not off by one', async () => {
  const { consumeShareSource } = await import('./shareAttribution.ts');
  store.set(KEY, JSON.stringify({ code: 'fresh', at: dayStamp(6) }));
  assert.deepEqual(consumeShareSource(), { ref: 'share', code: 'fresh' });
});

test('an inline (whole-trip) code is truncated, not stored in full', async () => {
  const { rememberShareArrival, consumeShareSource } = await import('./shareAttribution.ts');
  const huge = 'x'.repeat(4000);
  rememberShareArrival(huge);
  const got = consumeShareSource();
  assert.ok(got);
  assert.equal(got.code.length, 64, 'a full share payload was copied into a second storage key');
});

test('corrupt JSON is ignored rather than thrown', async () => {
  const { consumeShareSource } = await import('./shareAttribution.ts');
  store.set(KEY, 'not json {{{');
  assert.equal(consumeShareSource(), null);
});

test('a browser with storage blocked loses attribution and never throws', async () => {
  stubStorage('blocked');
  const { rememberShareArrival, consumeShareSource } = await import('./shareAttribution.ts');
  assert.doesNotThrow(() => rememberShareArrival('abc123'));
  assert.equal(consumeShareSource(), null);
});
