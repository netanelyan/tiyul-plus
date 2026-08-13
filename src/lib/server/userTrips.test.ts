/**
 * `findOwnTrip` הוא הפרימיטיב שכל נתיב כסף (`checks/create-order`,
 * `checks/status`, בניית דוח לפני-הנסיעה) נשען עליו כדי לענות "האם זה
 * באמת הטיול של המשתמש הזה". הטסט כאן נועד לא לתת לזה לרדרג בשקט:
 * לא רק "אם התשובה תואמת" - אלא **מה נשלח בפועל ל-Supabase**, כי RLS
 * כבר לא מגן כאן (adminSelect משתמש ב-service role שעוקף RLS לגמרי -
 * הבידוד בין משתמשים חייב לבוא מהפילטר שהקוד עצמו שולח).
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

let calls: { url: string }[] = [];
let respond: () => Response = () => new Response('[]', { status: 200 });

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  calls = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push({ url: String(input) });
    return respond();
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

const load = () => import('./userTrips.ts?' + Math.random().toString(36).slice(2));

const TRIP = {
  id: 'trip-1',
  name: 'הטיול שלי',
  citySlugs: ['vienna'],
  days: [{ placeIds: ['vie-stephansdom'] }],
};

test('הבקשה ל-Supabase מסננת גם לפי user_id וגם לפי trip id - לא רק trip id', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response(JSON.stringify([{ data: TRIP }]), { status: 200 });
  await findOwnTrip('user-a', 'trip-1');

  const q = decodeURIComponent(calls[0].url);
  // זו הטענה המרכזית: השאילתה עצמה, לא רק הפונקציה, חייבת לדרוש את
  // שני התנאים. שאילתה שמסננת רק לפי trip id הייתה מחזירה את הטיול
  // הזה למי שרק ניחש/ראה את ה-id שלו, בלי קשר למי שביקש.
  assert.match(q, /user_id=eq\.user-a/);
  assert.match(q, /id=eq\.trip-1/);
});

test('טיול שקיים אבל שייך למשתמש אחר - השורה שחוזרת מ-Supabase (המסוננת כבר) לא נסמכת על user_id שהתקבל', async () => {
  /*
    בהינתן ש-RLS לא חל כאן (service role), הבידוד היחיד הוא הפילטר.
    הטסט הקודם מוודא שהפילטר נשלח נכון; זה כאן מוודא שהפונקציה לא
    "מתקנת" בעצמה תשובה ריקה לתוצאה - כלומר שאין נתיב שמחזיר טיול
    שלא חזר בפועל מהשאילתה המסוננת.
  */
  const { findOwnTrip } = await load();
  respond = () => new Response('[]', { status: 200 }); // כך Supabase עונה כש-user_id לא תואם
  const trip = await findOwnTrip('user-a', 'trip-owned-by-user-b');
  assert.equal(trip, null);
});

test('שורה עם data שלא נראה כמו Trip (למשל תמונת-מצב של מחיקה) לא מוחזרת בטעות', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response(JSON.stringify([{ data: { id: 'trip-1', deletedAt: 123 } }]), { status: 200 });
  const trip = await findOwnTrip('user-a', 'trip-1');
  assert.equal(trip, null);
});

test('כשל תקשורת/DB לא הופך בשקט לגישה - מחזיר null ולא זורק', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response('boom', { status: 500 });
  const trip = await findOwnTrip('user-a', 'trip-1');
  assert.equal(trip, null);
});
