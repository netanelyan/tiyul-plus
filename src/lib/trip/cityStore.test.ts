/**
 * טסטים לאחסון הערים במכשיר - השכבה שהופכת "טיול שנפתח פעם אחת" ל-
 * "טיול שנפתח בלי רשת".
 *
 * מה שנבדק כאן הוא בדיוק מה שיכול להיכשל בשקט: רשומה פגומה שמפילה את
 * המסך במקום להיזרק, מטמון שגדל בלי גבול עד שהמכסה מתפוצצת, גיזום
 * שמוחק עיר שטיול חי עדיין צריך, ותאריך שמירה שנעלם - ובלעדיו מידע
 * כשרות ישן מוצג כאילו נבדק עכשיו.
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

/** localStorage מינימלי - node לא מספק אחד, והמודול עובד מולו ישירות */
function stubStorage(): void {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  // @ts-expect-error - סביבת דפדפן מזויפת לצורך הטסט
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
  // מסך שמראה את שתיהן הוא ותיק כמו הישנה מביניהן, לא כמו הטרייה
  assert.equal(oldestCachedAt(['vienna', 'rome']), 1_000);
  assert.equal(oldestCachedAt(['rome']), 5_000);
  // עיר שאינה שמורה בכלל לא מזייפת תאריך
  assert.equal(oldestCachedAt(['nope']), null);
});

test('רשומה פגומה נזרקת בשקט ולא מפילה את השאר', () => {
  saveCities([city('vienna')], 1_000);
  const raw = JSON.parse(window.localStorage.getItem(KEY)!);
  raw['broken'] = { city: { slug: 'broken' }, cachedAt: 'לא מספר' }; // אין places, אין תאריך
  raw['mismatch'] = { city: { slug: 'other', places: [] }, cachedAt: 2_000 }; // slug לא תואם
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
  // 20 ערים ותיקות, ואז אחת חדשה - הוותיקה ביותר היא זו שמפנה מקום
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
  // לא זורק - האפליקציה ממשיכה לעבוד, רק בלי המצב הלא-מקוון
  assert.doesNotThrow(() => saveCities([city('rome')], 2_000));
  assert.deepEqual(Object.keys(storedCities()), ['vienna']);
});

test('storageBytes מודד את מה שבאמת תופס מקום', () => {
  assert.equal(storageBytes(), 0);
  saveCities([city('vienna')], 1_000);
  const bytes = storageBytes();
  assert.ok(bytes > 0);
  // UTF-16: שני בתים לכל תו, כפי ש-localStorage סופר בפועל
  assert.equal(bytes, window.localStorage.getItem(KEY)!.length * 2);
});

test('בשרת (בלי window) הכול שקט ומחזיר ריק', () => {
  // @ts-expect-error - מדמים רינדור בשרת
  delete globalThis.window;
  assert.deepEqual(storedCities(), {});
  assert.deepEqual(loadCities(), {});
  assert.equal(storageBytes(), 0);
  assert.doesNotThrow(() => saveCities([city('vienna')], 1_000));
});
