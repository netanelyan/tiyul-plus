import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, newStorySlug, parsePhotoDataUrl, MAX_PHOTO_DATAURL } from './stories.ts';

test('buildSnapshot: שמות ומיקומים מהקטלוג האמיתי, לא מהקלט', () => {
  const snap = buildSnapshot({
    name: 'טיול לוינה',
    startDate: '2026-09-01',
    days: [{ citySlug: 'vienna', placeIds: ['vie-schonbrunn', 'no-such-place'] }],
  });
  assert.equal(snap.days.length, 1);
  assert.equal(snap.days[0].cityName, 'וינה');
  // מזהה לא קיים מדולג בשקט - לא ממציאים עצירה
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
  assert.equal(snap.days[0].stops.length, 0); // מקומות שנחקרו אינם בקטלוג - לא מומצאים
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
  assert.equal(parsePhotoDataUrl(`data:image/svg+xml;base64,${tiny}`), null); // svg = סקריפטים
  assert.equal(parsePhotoDataUrl(`data:text/html;base64,${tiny}`), null);
  assert.equal(parsePhotoDataUrl('https://example.com/x.jpg'), null); // לא מושכים כתובות
  assert.equal(parsePhotoDataUrl(`data:image/jpeg;base64,not!!valid`), null);
});

test('parsePhotoDataUrl: גודל מוגבל - מעל התקרה נדחה', () => {
  const big = 'A'.repeat(MAX_PHOTO_DATAURL + 10);
  assert.equal(parsePhotoDataUrl(`data:image/jpeg;base64,${big}`), null);
});
