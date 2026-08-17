/**
 * Tests for the city cache.
 *
 * What is tested here is exactly what makes the change safe: that the screen
 * does not ask the server for the same city twice, that concurrent requests
 * merge into one, and that a nonexistent city does not enter a request loop.
 * Without this, "only the trip's cities" would easily turn into MORE traffic
 * than the full catalog, not less.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCities, cachedCity, __resetCityCache } from './cityData.ts';

const city = (slug: string) => ({ slug, name: slug, places: [] });
let calls: string[] = [];

beforeEach(() => {
  __resetCityCache();
  calls = [];
  // @ts-expect-error - a fetch stub for the test
  globalThis.fetch = async (url: string) => {
    calls.push(url);
    const slugs = new URL(url, 'http://x').searchParams.get('slugs')!.split(',');
    return {
      ok: true,
      json: async () => ({ cities: slugs.filter((s) => s !== 'nope').map(city) }),
    };
  };
});

test('מביא את מה שביקשו, פעם אחת', async () => {
  const got = await fetchCities(['rome', 'venice']);
  assert.deepEqual(got.map((c) => c.slug), ['rome', 'venice']);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('rome') && calls[0].includes('venice'));
});

test('עיר שכבר במטמון לא נשלחת שוב לשרת', async () => {
  await fetchCities(['rome']);
  await fetchCities(['rome']);
  assert.equal(calls.length, 1);
  assert.equal(cachedCity('rome')?.slug, 'rome');
});

test('רק החדשות נשלחות בבקשה השנייה', async () => {
  await fetchCities(['rome']);
  await fetchCities(['rome', 'venice']);
  assert.equal(calls.length, 2);
  assert.ok(!calls[1].includes('rome'), calls[1]);
  assert.ok(calls[1].includes('venice'));
});

test('שתי קריאות במקביל על אותה עיר = בקשת רשת אחת', async () => {
  const [a, b] = await Promise.all([fetchCities(['rome']), fetchCities(['rome'])]);
  assert.equal(calls.length, 1);
  assert.equal(a[0].slug, 'rome');
  assert.equal(b[0].slug, 'rome');
});

test('slug שהשרת לא מכיר לא חוזר ולא נשאל שוב - אחרת זו לולאה', async () => {
  const got = await fetchCities(['nope']);
  assert.deepEqual(got, []);
  await fetchCities(['nope']);
  assert.equal(calls.length, 1);
});

test('כישלון רשת לא מסמן את העיר כחסרה - הניסיון הבא כן ינסה', async () => {
  globalThis.fetch = async () => {
    calls.push('boom');
    throw new Error('offline');
  };
  assert.deepEqual(await fetchCities(['rome']), []);
  assert.deepEqual(await fetchCities(['rome']), []);
  assert.equal(calls.length, 2);
});

/* ---------- Reopening without a network ---------- */

/**
 * This is **the test of the whole feature**: the city was loaded once while
 * there was a network, the app was closed (the in-memory cache is gone), and
 * it opens again with no network at all. If the itinerary does not render
 * here, somebody standing on a street in a foreign city gets a loading
 * screen that never ends.
 */
test('עיר שנטענה כשהייתה רשת נקראת אחרי סגירה ופתיחה מחדש - בלי רשת', async () => {
  const data = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  } as unknown as Window & typeof globalThis;

  // --- Online: the city loads and is persisted ---
  await fetchCities(['rome']);
  assert.equal(calls.length, 1);

  // --- The app was closed and reopened: no in-memory cache, and no network at all ---
  __resetCityCache();
  globalThis.fetch = async () => {
    calls.push('network-while-offline');
    throw new Error('offline');
  };

  assert.equal(cachedCity('rome')?.slug, 'rome');
  // And no request was sent to find that out
  assert.equal(calls.length, 1);

  // @ts-expect-error - cleanup, so we do not leak into other tests in the file
  delete globalThis.window;
});
