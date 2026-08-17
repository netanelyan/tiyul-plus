/**
 * Tests for on-device city storage - the layer that turns "a trip that was opened once"
 * into "a trip that opens with no network".
 *
 * What is tested here is exactly what can fail silently: a malformed record that brings
 * the screen down instead of being discarded, a cache that grows without bound until the
 * quota blows, pruning that deletes a city a live trip still needs, and a save date that
 * disappears - without which stale kashrut information is shown as if just checked.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Destination } from '@/lib/types';
import {
  __clearCityStore,
  cachedAt,
  loadCities,
  oldestCachedAt,
  pruneCities,
  saveCities,
  storageBytes,
  storedCities,
} from './cityStore.ts';

const KEY = 'tiyul-plus:cities:v1';

/** A minimal localStorage - node does not provide one, and the module works against it directly */
function stubStorage(): void {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  // @ts-expect-error - a fake browser environment for the test
  globalThis.window = { localStorage: storage };
}

const city = (slug: string): Destination =>
  ({ slug, name: slug, places: [{ id: `${slug}-1` }] }) as unknown as Destination;

beforeEach(() => {
  stubStorage();
  __clearCityStore();
});

test('עיר שנשמרה נקראת בחזרה, עם תאריך השמירה שלה', () => {
  saveCities([city('vienna')], 1_700_000_000_000);
  assert.deepEqual(Object.keys(storedCities()), ['vienna']);
  assert.equal(cachedAt('vienna'), 1_700_000_000_000);
  assert.equal(cachedAt('rome'), null);
});

test('הוותק שמוצג הוא של הפריט הישן ביותר על המסך', () => {
  saveCities([city('vienna')], 1_000);
  saveCities([city('rome')], 5_000);
  // A screen showing both is as old as the older of them, not as the fresher one
  assert.equal(oldestCachedAt(['vienna', 'rome']), 1_000);
  assert.equal(oldestCachedAt(['rome']), 5_000);
  // A city that is not stored at all does not fake a date
  assert.equal(oldestCachedAt(['nope']), null);
});

test('רשומה פגומה נזרקת בשקט ולא מפילה את השאר', () => {
  saveCities([city('vienna')], 1_000);
  const raw = JSON.parse(window.localStorage.getItem(KEY)!);
  raw['broken'] = { city: { slug: 'broken' }, cachedAt: 'לא מספר' }; // no places, no date
  raw['mismatch'] = { city: { slug: 'other', places: [] }, cachedAt: 2_000 }; // slug does not match
  window.localStorage.setItem(KEY, JSON.stringify(raw));

  const got = storedCities();
  assert.deepEqual(Object.keys(got), ['vienna']);
});

test('JSON שבור לא זורק - פשוט אין מטמון', () => {
  window.localStorage.setItem(KEY, '{{{ לא JSON');
  assert.deepEqual(storedCities(), {});
  assert.equal(cachedAt('vienna'), null);
});

test('גיזום מוחק רק מה שאף טיול לא נוגע בו', () => {
  saveCities([city('vienna'), city('rome'), city('athens')], 1_000);
  pruneCities(['vienna', 'athens']);
  assert.deepEqual(Object.keys(storedCities()).sort(), ['athens', 'vienna']);
});

test('גיזום עם רשימה ריקה מפנה הכול - מחקו את כל הטיולים', () => {
  saveCities([city('vienna')], 1_000);
  pruneCities([]);
  assert.deepEqual(storedCities(), {});
});

test('תקרת ערים: הישנות יוצאות ראשונות', () => {
  // 20 old cities, then one new - the oldest is the one that makes room
  for (let i = 0; i < 20; i++) saveCities([city(`old-${i}`)], 1_000 + i);
  saveCities([city('new')], 9_999);
  const keys = Object.keys(storedCities());
  assert.equal(keys.length, 20);
  assert.ok(keys.includes('new'));
  assert.ok(!keys.includes('old-0'));
});

test('מכסה מלאה מוותרת על השמירה ולא על המסך', () => {
  saveCities([city('vienna')], 1_000);
  window.localStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  // Does not throw - the app keeps working, just without the offline mode
  assert.doesNotThrow(() => saveCities([city('rome')], 2_000));
  assert.deepEqual(Object.keys(storedCities()), ['vienna']);
});

test('storageBytes מודד את מה שבאמת תופס מקום', () => {
  assert.equal(storageBytes(), 0);
  saveCities([city('vienna')], 1_000);
  const bytes = storageBytes();
  assert.ok(bytes > 0);
  // UTF-16: two bytes per character, as localStorage actually counts
  assert.equal(bytes, window.localStorage.getItem(KEY)!.length * 2);
});

test('בשרת (בלי window) הכול שקט ומחזיר ריק', () => {
  // @ts-expect-error - simulating server-side rendering
  delete globalThis.window;
  assert.deepEqual(storedCities(), {});
  assert.deepEqual(loadCities(), {});
  assert.equal(storageBytes(), 0);
  assert.doesNotThrow(() => saveCities([city('vienna')], 1_000));
});
