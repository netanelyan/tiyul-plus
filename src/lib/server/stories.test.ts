import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, enrichSnapshot, newStorySlug, parsePhotoDataUrl, MAX_PHOTO_DATAURL } from './stories.ts';

test('buildSnapshot: שמות ומיקומים מהקטלוג האמיתי, לא מהקלט', () => {
  const snap = buildSnapshot({
    name: 'טיול לוינה',
    startDate: '2026-09-01',
    days: [{ citySlug: 'vienna', placeIds: ['vie-schonbrunn', 'no-such-place'] }],
  });
  assert.equal(snap.days.length, 1);
  assert.equal(snap.days[0].cityName, 'וינה');
  // A nonexistent id is silently skipped - we don't invent a stop
  assert.equal(snap.days[0].stops.length, 1);
  assert.ok(snap.days[0].stops[0].name.length > 0);
  assert.ok(Number.isFinite(snap.days[0].stops[0].lat));
});

test('buildSnapshot: שם ארוך נחתך, עיר לא מוכרת מקבלת את ה-slug כשם', () => {
  const snap = buildSnapshot({
    name: 'א'.repeat(200),
    days: [{ citySlug: 'explored-somewhere', placeIds: ['xp-1'] }],
  });
  assert.ok(snap.name.length <= 80);
  assert.equal(snap.days[0].cityName, 'explored-somewhere');
  assert.equal(snap.days[0].stops.length, 0); // Explored places are not in the catalog - not invented
});

test('newStorySlug: צורה יציבה שהעמוד הציבורי מאמת מולה', () => {
  for (let i = 0; i < 20; i++) {
    assert.match(newStorySlug(), /^st[a-z2-9]{6,12}$/);
  }
});

test('parsePhotoDataUrl: מקבל jpeg/png/webp תקינים, דוחה כל השאר', () => {
  const tiny = Buffer.from([0xff, 0xd8, 0xff]).toString('base64');
  assert.ok(parsePhotoDataUrl(`data:image/jpeg;base64,${tiny}`));
  assert.ok(parsePhotoDataUrl(`data:image/png;base64,${tiny}`));
  assert.equal(parsePhotoDataUrl(`data:image/svg+xml;base64,${tiny}`), null); // svg = scripts
  assert.equal(parsePhotoDataUrl(`data:text/html;base64,${tiny}`), null);
  assert.equal(parsePhotoDataUrl('https://example.com/x.jpg'), null); // We don't fetch URLs
  assert.equal(parsePhotoDataUrl(`data:image/jpeg;base64,not!!valid`), null);
});

test('parsePhotoDataUrl: גודל מוגבל - מעל התקרה נדחה', () => {
  const big = 'A'.repeat(MAX_PHOTO_DATAURL + 10);
  assert.equal(parsePhotoDataUrl(`data:image/jpeg;base64,${big}`), null);
});

/*
  enrichSnapshot - the catalog content the public story page displays.

  The claim worth locking down is NOT "a photo comes back" but the split: the
  illustrative fields are resolved live from the catalog, while the NAME stays
  exactly as the snapshot recorded it. A published story must not be silently
  rewritten because a place was renamed in the catalog afterwards.
*/
test('enrichSnapshot: תמונה, תיאור וקטגוריה מגיעים מהקטלוג האמיתי לפי המזהה', () => {
  const enriched = enrichSnapshot({
    name: 'טיול לוינה',
    days: [
      {
        dayNumber: 1,
        cityName: 'וינה',
        stops: [{ id: 'vie-schonbrunn', name: 'ארמון שנברון', lat: 48.18, lng: 16.31 }],
      },
    ],
  });
  const stop = enriched.days[0].stops[0];
  assert.ok(stop.photo && stop.photo.startsWith('http'), 'a real photo URL is attached');
  assert.ok(stop.description && stop.description.length > 20, 'the catalog description is attached');
  assert.equal(stop.category, 'attraction');
  // Coordinates and the day shell are untouched
  assert.equal(stop.lat, 48.18);
  assert.equal(enriched.days[0].cityName, 'וינה');
});

test('enrichSnapshot: השם נשאר של ה-snapshot ולא נדרס מהקטלוג', () => {
  const enriched = enrichSnapshot({
    name: 'טיול',
    days: [
      {
        dayNumber: 1,
        cityName: 'וינה',
        // Deliberately a name that is NOT the catalog's, to prove it survives
        stops: [{ id: 'vie-schonbrunn', name: 'הארמון שבו התארסנו', lat: 48.18, lng: 16.31 }],
      },
    ],
  });
  assert.equal(enriched.days[0].stops[0].name, 'הארמון שבו התארסנו');
  assert.ok(enriched.days[0].stops[0].photo, 'and it is still enriched');
});

test('enrichSnapshot: מקום שכבר לא בקטלוג נשאר קריא - בלי תמונה ובלי המצאה', () => {
  const enriched = enrichSnapshot({
    name: 'טיול',
    days: [
      {
        dayNumber: 1,
        cityName: 'עיר',
        stops: [
          { id: 'no-such-place-anymore', name: 'מקום שהוסר', lat: 1, lng: 2, mustSee: true },
          // An old snapshot from before stops carried an id at all
          { id: '', name: 'בלי מזהה', lat: 3, lng: 4 },
        ],
      },
    ],
  });
  for (const s of enriched.days[0].stops) {
    assert.equal(s.photo, undefined);
    assert.equal(s.description, undefined);
    assert.equal(s.category, 'attraction'); // the neutral default, never a guess
    assert.ok(s.name.length > 0);
  }
  assert.equal(enriched.days[0].stops[0].mustSee, true);
});

test('enrichSnapshot: לא משנה את מספר הימים או העצירות', () => {
  const snap = buildSnapshot({
    name: 'רומא ווינה',
    days: [
      { citySlug: 'vienna', placeIds: ['vie-schonbrunn', 'vie-stephansdom'] },
      { citySlug: 'rome', placeIds: [] },
    ],
  });
  const enriched = enrichSnapshot(snap);
  assert.equal(enriched.days.length, snap.days.length);
  enriched.days.forEach((d, i) => assert.equal(d.stops.length, snap.days[i].stops.length));
  assert.equal(enriched.name, snap.name);
});
