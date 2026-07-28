import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_POINTS_PER_LEG,
  googleMapsLegs,
  googleMapsUrl,
  travelModeFor,
  type NavPoint,
} from './mapsExport';

const pt = (i: number): NavPoint => ({ name: `עצירה ${i}`, lat: 48.2 + i / 100, lng: 16.3 + i / 100 });
const many = (n: number) => Array.from({ length: n }, (_, i) => pt(i + 1));

test('שתי נקודות: מקור ויעד, בלי waypoints', () => {
  const url = googleMapsUrl(many(2))!;
  const q = new URL(url).searchParams;
  assert.equal(q.get('api'), '1');
  assert.equal(q.get('origin'), '48.210000,16.310000');
  assert.equal(q.get('destination'), '48.220000,16.320000');
  assert.equal(q.get('waypoints'), null);
  assert.equal(q.get('travelmode'), 'walking');
});

test('הסדר נשמר: העצירות הן waypoints בין הראשונה לאחרונה', () => {
  const q = new URL(googleMapsUrl(many(4))!).searchParams;
  assert.equal(q.get('origin'), '48.210000,16.310000');
  assert.equal(q.get('destination'), '48.240000,16.340000');
  assert.deepEqual(q.get('waypoints')!.split('|'), ['48.220000,16.320000', '48.230000,16.330000']);
});

test('נקודה אחת או אפס: אין לאן לנווט', () => {
  assert.equal(googleMapsUrl(many(1)), null);
  assert.equal(googleMapsUrl([]), null);
  assert.deepEqual(googleMapsLegs(many(1)), []);
});

test('קואורדינטה לא תקינה נזרקת ולא מגיעה לקישור', () => {
  const bad: NavPoint[] = [
    { name: 'טוב', lat: 48.2, lng: 16.3 },
    { name: 'רע', lat: Number.NaN, lng: 16.4 },
    { name: 'מחוץ לטווח', lat: 200, lng: 16.5 },
    { name: 'טוב 2', lat: 48.3, lng: 16.6 },
  ];
  const q = new URL(googleMapsUrl(bad)!).searchParams;
  assert.equal(q.get('waypoints'), null, 'שתי הנקודות הפגומות לא נכנסו');
  assert.equal(q.get('destination'), '48.300000,16.600000');
});

test('אופן ההגעה נגזר מהרכב', () => {
  assert.equal(travelModeFor('have'), 'driving');
  assert.equal(travelModeFor('need'), 'driving');
  assert.equal(travelModeFor('not_needed'), 'walking');
  assert.equal(travelModeFor(undefined), 'walking');
  const q = new URL(googleMapsUrl(many(3), 'driving')!).searchParams;
  assert.equal(q.get('travelmode'), 'driving');
});

test('יום ארוך מפוצל לקטעים - ושום עצירה לא נעלמת', () => {
  const stops = many(14);
  const legs = googleMapsLegs(stops);
  assert.ok(legs.length > 1, 'התפצל');
  // כל נקודה מופיעה לפחות פעם אחת באחד הקטעים
  const seen = new Set<string>();
  for (const leg of legs) {
    const q = new URL(leg.url).searchParams;
    seen.add(q.get('origin')!);
    seen.add(q.get('destination')!);
    for (const w of (q.get('waypoints') ?? '').split('|').filter(Boolean)) seen.add(w);
  }
  for (const s of stops) assert.ok(seen.has(`${s.lat.toFixed(6)},${s.lng.toFixed(6)}`), s.name);
});

test('הקטעים חופפים בנקודה אחת - אין חור במסלול', () => {
  const legs = googleMapsLegs(many(14));
  for (let i = 1; i < legs.length; i++) {
    const prevEnd = new URL(legs[i - 1].url).searchParams.get('destination');
    const nextStart = new URL(legs[i].url).searchParams.get('origin');
    assert.equal(nextStart, prevEnd, `קטע ${i + 1} מתחיל בסוף הקודם`);
  }
});

test('אף קטע לא חורג ממה שגוגל מקבלת', () => {
  for (const leg of googleMapsLegs(many(40))) {
    assert.ok(leg.count <= MAX_POINTS_PER_LEG, String(leg.count));
    const q = new URL(leg.url).searchParams;
    const w = (q.get('waypoints') ?? '').split('|').filter(Boolean);
    assert.ok(w.length <= 9, `${w.length} נקודות ביניים`);
  }
});

test('יום של בדיוק 11 נקודות נשאר קטע אחד', () => {
  assert.equal(googleMapsLegs(many(MAX_POINTS_PER_LEG)).length, 1);
  assert.equal(googleMapsLegs(many(MAX_POINTS_PER_LEG + 1)).length, 2);
});
