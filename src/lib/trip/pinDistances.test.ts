/**
 * טסטים ל-pinDistances - המרחקים האמיתיים מסיכה לעצירות של אותה עיר.
 *
 * הפונקציה נכתבה אחרי שבדיקה חיה מול המודל הראתה שהוא ממציא קרבה
 * ("במרחק הליכה מהמלון", "צמוד לגשר ה-UFO") כשאין לו נתון אמיתי, ושאיסור
 * בפרומפט לא החזיק. הטסט מוודא שהמספרים נכונים ושהכתובית תמיד אומרת
 * "אווירי" - כי זה מרחק אווירי ולא מרחק הליכה, וזו כל ההבטחה כאן.
 *
 * המרחקים נבדקים מול הדאטה האמיתית, לא מול פיקסטורה, כדי שהטסט ייפול
 * אם קואורדינטה בקטלוג תשתנה מתחתינו.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinDistances } from './agent.ts';
import { destinations } from '@/data/destinations';
import type { Trip } from './types.ts';

const bratislava = destinations.find((d) => d.slug === 'bratislava')!;
const castle = bratislava.places.find((p) => p.id === 'bts-castle')!;

const tripWith = (placeIds: string[]): Trip => ({
  id: 't1',
  name: 'בדיקה',
  citySlugs: ['bratislava'],
  createdAt: 0,
  days: [{ id: 'd1', citySlug: 'bratislava', placeIds }],
});

test('סיכה על הקואורדינטה של עצירה מחזירה 0 מ׳ אווירי', () => {
  const out = pinDistances(tripWith(['bts-castle']), {
    citySlug: 'bratislava',
    lat: castle.lat,
    lng: castle.lng,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].name, castle.name);
  assert.equal(out[0].away, '0 מ׳ אווירי');
});

test('כל תוצאה נושאת את המילה אווירי - זו ההבטחה למודל', () => {
  const out = pinDistances(tripWith(['bts-castle', 'bts-oldtown', 'bts-ufo', 'bts-devin']), {
    citySlug: 'bratislava',
    lat: 48.142,
    lng: 17.105,
  });
  assert.ok(out.length >= 3, 'צריך להחזיר את העצירות שיש להן קואורדינטות');
  for (const row of out) assert.match(row.away, /אווירי$/, row.name);
});

test('מסודר מהקרוב לרחוק', () => {
  const out = pinDistances(tripWith(['bts-devin', 'bts-castle', 'bts-oldtown']), {
    citySlug: 'bratislava',
    lat: 48.142,
    lng: 17.105,
  });
  const km = out.map((r) => Number(r.away.replace(/[^\d.]/g, '')) * (r.away.includes('מ׳') ? 0.001 : 1));
  assert.deepEqual(km, [...km].sort((a, b) => a - b), 'הסדר חייב להיות עולה');
  // דווין באמת רחוקה מהמרכז - היא חייבת להיות האחרונה
  assert.equal(out[out.length - 1].name, bratislava.places.find((p) => p.id === 'bts-devin')!.name);
});

test('מתחת לקילומטר במטרים, מעל לקילומטר בקילומטרים', () => {
  const near = pinDistances(tripWith(['bts-castle']), {
    citySlug: 'bratislava',
    lat: castle.lat + 0.002, // ~220 מ׳
    lng: castle.lng,
  });
  assert.match(near[0].away, /^\d+ מ׳ אווירי$/);
  const far = pinDistances(tripWith(['bts-castle']), {
    citySlug: 'bratislava',
    lat: castle.lat + 0.2, // ~22 ק"מ
    lng: castle.lng,
  });
  assert.match(far[0].away, /ק״מ אווירי$/);
});

test('סיכה בלי מיקום מאומת לא מייצרת שום מרחק', () => {
  assert.deepEqual(pinDistances(tripWith(['bts-castle']), { citySlug: 'bratislava' }), []);
  assert.deepEqual(
    pinDistances(tripWith(['bts-castle']), { citySlug: 'bratislava', lat: 48.14 }),
    [],
    'חצי קואורדינטה היא לא קואורדינטה',
  );
});

test('בלי עיר, או עיר שאינה בקטלוג - רשימה ריקה ולא קריסה', () => {
  assert.deepEqual(pinDistances(tripWith(['bts-castle']), { lat: 48.1, lng: 17.1 }), []);
  assert.deepEqual(
    pinDistances(tripWith(['bts-castle']), { citySlug: 'no-such-city', lat: 48.1, lng: 17.1 }),
    [],
  );
});

test('רק עצירות שבאמת בטיול, ורק של אותה עיר', () => {
  const out = pinDistances(tripWith(['bts-castle']), {
    citySlug: 'bratislava',
    lat: 48.142,
    lng: 17.105,
  });
  assert.equal(out.length, 1, 'טיול עם עצירה אחת לא מחזיר את כל הקטלוג');
});

test('עצירה כפולה בין ימים נספרת פעם אחת', () => {
  const trip: Trip = {
    id: 't2',
    name: 'בדיקה',
    citySlugs: ['bratislava'],
    createdAt: 0,
    days: [
      { id: 'd1', citySlug: 'bratislava', placeIds: ['bts-castle'] },
      { id: 'd2', citySlug: 'bratislava', placeIds: ['bts-castle', 'bts-oldtown'] },
    ],
  };
  const out = pinDistances(trip, { citySlug: 'bratislava', lat: 48.142, lng: 17.105 });
  assert.equal(out.length, 2);
  assert.equal(new Set(out.map((r) => r.name)).size, 2);
});
