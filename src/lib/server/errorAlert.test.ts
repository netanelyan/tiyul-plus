/**
 * The claim being protected is not "an alert is sent" - that part is one
 * `fetch`. It is that **a broken deploy produces one message, not a thousand**,
 * because a channel that floods is a channel that gets muted, and a muted
 * channel is exactly the state this feature was built to end.
 *
 * The webhook is captured rather than called, so the assertions are about what
 * would actually be posted.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanLine,
  fingerprint,
  reportError,
  resetErrorAlertsForTest,
  trackedFingerprints,
  seenCount,
  MAX_ALERTS_PER_WINDOW,
  DEDUPE_MS,
} from './errorAlert';

const realFetch = globalThis.fetch;
const SAVED_HOOK = process.env.AI_BUDGET_ALERT_WEBHOOK;
let posted: string[] = [];

beforeEach(() => {
  posted = [];
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hook.example/test';
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    posted.push(String(init?.body ?? ''));
    return new Response('ok', { status: 200 });
  }) as typeof fetch;
  resetErrorAlertsForTest();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (SAVED_HOOK === undefined) delete process.env.AI_BUDGET_ALERT_WEBHOOK;
  else process.env.AI_BUDGET_ALERT_WEBHOOK = SAVED_HOOK;
});

test('שגיאה חדשה נשלחת, וכוללת את הנתיב ואת הקוד', () => {
  const out = reportError({
    kind: 'server',
    message: 'Cannot read properties of undefined',
    path: '/destinations/[slug]',
    digest: 'abc123',
  });
  assert.equal(out.sent, true);
  assert.equal(posted.length, 1);
  assert.match(posted[0], /destinations/);
  assert.match(posted[0], /abc123/);
});

test('אותה שגיאה שוב ושוב - הודעה אחת, וספירה', () => {
  const same = { kind: 'server' as const, message: 'boom', digest: 'same-digest' };
  for (let i = 0; i < 500; i++) reportError(same);
  assert.equal(posted.length, 1, 'חמש מאות כשלים זהים = הודעה אחת');
  assert.equal(seenCount(same), 500);
});

test('מזהים בתוך ההודעה לא הופכים כל מופע לאירוע חדש', () => {
  /*
    Without this, a message carrying a row id or a uuid is unique every time
    and the dedupe never fires - which is precisely the flood it exists to
    prevent, wearing a disguise.
  */
  reportError({ kind: 'server', message: 'row 10293 not found in trip 7741' });
  reportError({ kind: 'server', message: 'row 55512 not found in trip 9002' });
  assert.equal(posted.length, 1, 'numeric ids');

  resetErrorAlertsForTest();
  posted = [];
  reportError({ kind: 'server', message: 'trip 3f2a9c0e-1111-4222-8333-444455556666 missing' });
  reportError({ kind: 'server', message: 'trip 88887777-6666-4555-8444-333322221111 missing' });
  assert.equal(posted.length, 1, 'uuids');
});

test('הגבול של הכלל, כתוב במפורש: רק מספר בן שלוש ספרות ומעלה מוכלל', () => {
  /*
    This is a threshold, so it has a wrong side in both directions, and it is
    worth pinning which one was chosen rather than discovering it during an
    incident.

    THREE OR MORE digits are treated as an id and collapsed. That deliberately
    takes HTTP status codes with it - a 500 and a 404 from the same dependency
    in the same hour produce one alert, carrying whichever arrived first. The
    alternative is worse: a service failing with a rotating id would send a
    separate message every time, which is the flood.

    ONE OR TWO digits stay distinct, because at that size a number is far more
    likely to be meaningful ("day 3", "attempt 2") than an identifier.
  */
  reportError({ kind: 'server', message: 'upstream returned 500' });
  reportError({ kind: 'server', message: 'upstream returned 404' });
  assert.equal(posted.length, 1, 'status codes collapse - a known, accepted cost');

  resetErrorAlertsForTest();
  posted = [];
  reportError({ kind: 'server', message: 'day 3 has no city' });
  reportError({ kind: 'server', message: 'day 4 has no city' });
  assert.equal(posted.length, 2, 'small numbers are not treated as ids');
});

test('שגיאות שונות באמת נשלחות בנפרד', () => {
  reportError({ kind: 'server', message: 'database unreachable' });
  reportError({ kind: 'server', message: 'paypal returned 500' });
  assert.equal(posted.length, 2);
  assert.equal(trackedFingerprints(), 2);
});

test('אותו טקסט משרת ומדפדפן הם שני אירועים', () => {
  // They need different handling and they are found in different logs.
  reportError({ kind: 'server', message: 'x is not a function' });
  reportError({ kind: 'client', message: 'x is not a function' });
  assert.equal(posted.length, 2);
});

test('תקרה לחלון: באג שמייצר הודעה אקראית לא מציף', () => {
  for (let i = 0; i < MAX_ALERTS_PER_WINDOW + 30; i++) {
    reportError({ kind: 'server', message: `unique failure ${String.fromCharCode(97 + i)}` });
  }
  assert.equal(posted.length, MAX_ALERTS_PER_WINDOW);
});

test('חלון חדש פותח מחדש - כשל שנמשך שעה מדווח שוב', () => {
  const base = 1_700_000_000_000;
  const report = { kind: 'server' as const, message: 'still broken', digest: 'd1' };
  reportError(report, base);
  reportError(report, base + 1000);
  assert.equal(posted.length, 1);
  // An hour later it is news again: a failure that is STILL happening is worth
  // saying, or a long outage goes quiet after its first minute.
  reportError(report, base + DEDUPE_MS + 1);
  assert.equal(posted.length, 2);
});

test('הטקסט מנוקה - שורה אחת, באורך סביר', () => {
  const nasty = ['line one', 'line two', 'tabbed'].join(String.fromCharCode(10, 9, 0));
  const clean = cleanLine(nasty);
  assert.ok(!clean.includes(String.fromCharCode(10)), 'a newline would split the alert in two');
  assert.ok(!clean.includes(String.fromCharCode(0)), 'a NUL breaks some chat clients');
  assert.equal(clean, 'line one line two tabbed');
  assert.ok(cleanLine('x'.repeat(5000)).length <= 300);
});

test('טקסט ריק או לא-מחרוזת לא מפיל את המדווח', () => {
  // An error without a message is common (a thrown string, a rejected
  // non-Error). Empty is the right answer; the route treats it as nothing to
  // report rather than posting the word "undefined" to somebody's channel.
  assert.equal(cleanLine(undefined), '');
  assert.equal(cleanLine(null), '');
  assert.equal(cleanLine(''), '');
  assert.equal(cleanLine(42), '42');
});

test('המדווח לא זורק גם כשה-webhook נופל', () => {
  globalThis.fetch = (() => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  // Called from inside an error handler: throwing here would replace a handled
  // failure with an unhandled one and hide the original.
  assert.doesNotThrow(() => reportError({ kind: 'server', message: 'anything' }));
});

test('אותו digest גובר על טקסט שונה', () => {
  // Next derives the digest from the error itself, so it is the stronger signal.
  assert.equal(
    fingerprint({ kind: 'server', message: 'a', digest: 'z' }),
    fingerprint({ kind: 'client', message: 'b', digest: 'z' }),
  );
});
