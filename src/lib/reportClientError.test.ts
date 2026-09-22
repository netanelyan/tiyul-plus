/**
 * One incident must produce one alert.
 *
 * This is not a theory: a deliberately throwing page, checked in a real
 * browser against a production build, sent **two** - the server's own report
 * carrying the real exception, and the browser's carrying React's production
 * placeholder ("The specific message is omitted in production builds..."). The
 * second one was pure noise attached to every server error on the site.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceCode, shouldReport } from './reportClientError';

test('שגיאת שרת לא מדווחת שוב מהדפדפן', () => {
  // A digest exists only on an error that came from the server, and the server
  // has already alerted on it with a better message.
  assert.equal(shouldReport({ digest: '2131416708' }), false);
});

test('שגיאה שקרתה רק בדפדפן כן מדווחת - אחרת איש לא יידע עליה', () => {
  assert.equal(shouldReport({}), true);
  assert.equal(shouldReport({ digest: undefined }), true);
});

test('קוד הייחוס: digest אמיתי מוצג כמו שהוא, וקוד מקומי נוצר כשאין', () => {
  // The digest is what appears in the Vercel log beside the stack trace, so it
  // is shown verbatim rather than re-hashed into something unsearchable.
  assert.equal(referenceCode('2131416708'), '2131416708');
  assert.equal(referenceCode('0123456789abcdef'), '0123456789ab', 'long digests are trimmed');

  const a = referenceCode();
  const b = referenceCode();
  assert.match(a, /^c[a-z0-9]+$/, 'a generated code is marked as client-side');
  assert.notEqual(a, b, 'two failures do not share one code');
});
