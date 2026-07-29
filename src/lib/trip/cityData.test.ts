/**
 * טסטים למטמון הערים.
 *
 * מה שנבדק כאן הוא בדיוק מה שהופך את השינוי לבטוח: שהמסך לא מבקש
 * מהשרת את אותה עיר פעמיים, שבקשות מקבילות מתאחדות לבקשה אחת, ושעיר
 * שלא קיימת לא נכנסת ללולאת בקשות. בלי זה, "רק הערים של הטיול" היה
 * הופך בקלות ליותר תעבורה מהקטלוג המלא, לא לפחות.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCities, cachedCity, __resetCityCache } from './cityData.ts';

const city = (slug: string) => ({ slug, name: slug, places: [] });
let calls: string[] = [];

beforeEach(() => {
  __resetCityCache();
  calls = [];
  // @ts-expect-error - stub של fetch לצורך הטסט
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

/* ---------- פתיחה מחדש בלי רשת ---------- */

/**
 * זה **הטסט של הפיצ׳ר כולו**: העיר נטענה פעם אחת כשהייתה רשת, האפליקציה
 * נסגרה (המטמון בזיכרון נמחק), והיא נפתחת שוב בלי רשת בכלל. אם המסלול לא
 * מצויר כאן, מי שעומד ברחוב בעיר זרה מקבל מסך טעינה שלא ייגמר.
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

  // --- מחוברים: העיר נטענת ונשמרת ---
  await fetchCities(['rome']);
  assert.equal(calls.length, 1);

  // --- האפליקציה נסגרה ונפתחה: אין מטמון בזיכרון, ואין רשת בכלל ---
  __resetCityCache();
  globalThis.fetch = async () => {
    calls.push('network-while-offline');
    throw new Error('offline');
  };

  assert.equal(cachedCity('rome')?.slug, 'rome');
  // ולא נשלחה שום בקשה כדי לגלות את זה
  assert.equal(calls.length, 1);

  // @ts-expect-error - ניקוי, כדי לא לדלוף לטסטים אחרים בקובץ
  delete globalThis.window;
});
