/**
 * Tests for the read-only mode's safety net.
 *
 * The interface disables the controls itself, so it is easy to think this layer is redundant. It is
 * not: a forgotten control, a keyboard shortcut or future code are exactly how an offline edit
 * quietly reaches the sync and deletes somebody's work. The tests here check the promise itself -
 * **no mutation gets through** - and not the screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TripApi } from './TripContext';
import { readOnlyIfOffline } from './readOnly.ts';

/** A spy: every call is recorded, so we can claim that nothing was called */
function spyApi(): { api: TripApi; calls: string[] } {
  const calls: string[] = [];
  const rec =
    (name: string, ret?: unknown) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.length})`);
      return ret;
    };
  const api = {
    trips: [],
    currentTrip: null,
    currentId: null,
    hydrated: true,
    deleted: {},
    applyRemoteTrips: rec('applyRemoteTrips'),
    applyRemoteDeletions: rec('applyRemoteDeletions'),
    setCurrentId: rec('setCurrentId'),
    createTrip: rec('createTrip', { id: 'real' }),
    createTripFrom: rec('createTripFrom'),
    upsertTrip: rec('upsertTrip'),
    duplicateTrip: rec('duplicateTrip'),
    deleteTrip: rec('deleteTrip'),
    renameTrip: rec('renameTrip'),
    setTripDates: rec('setTripDates'),
    addDay: rec('addDay'),
    removeDay: rec('removeDay'),
    setDayNotes: rec('setDayNotes'),
    addPlace: rec('addPlace', { dayIndex: 7 }),
    removePlace: rec('removePlace'),
    movePlace: rec('movePlace'),
    movePlaceToDay: rec('movePlaceToDay'),
  } as unknown as TripApi;
  return { api, calls };
}

/** Everything that changes data. If somebody adds a mutation to TripApi and not to this
 *  list, the last test here will fail - and that is exactly the point. */
const MUTATIONS: ((api: TripApi) => void)[] = [
  (a) => a.createTrip('x'),
  (a) => a.createTripFrom({} as never),
  (a) => a.upsertTrip({} as never),
  (a) => a.duplicateTrip('id'),
  (a) => a.deleteTrip('id'),
  (a) => a.renameTrip('id', 'x'),
  (a) => a.setTripDates('id', {}),
  (a) => a.addDay('vienna'),
  (a) => a.removeDay('d1'),
  (a) => a.setDayNotes('d1', 'x'),
  (a) => void a.addPlace('vienna', 'p1'),
  (a) => a.removePlace('d1', 'p1'),
  (a) => a.movePlace('d1', 0, 1),
  (a) => a.movePlaceToDay('d1', 'p1', 'd2'),
];

test('עם רשת - אותו אובייקט בדיוק, בלי עטיפה ובלי עלות', () => {
  const { api } = spyApi();
  assert.equal(readOnlyIfOffline(api, false), api);
});

test('בלי רשת - אף מוטציה לא מגיעה ל-API האמיתי', () => {
  const { api, calls } = spyApi();
  const guarded = readOnlyIfOffline(api, true);
  for (const mutate of MUTATIONS) mutate(guarded);
  assert.deepEqual(calls, []);
});

test('בלי רשת - מעבר בין טיולים שמורים עדיין עובד (זו קריאה)', () => {
  const { api, calls } = spyApi();
  readOnlyIfOffline(api, true).setCurrentId('other');
  assert.deepEqual(calls, ['setCurrentId(1)']);
});

test('בלי רשת - שדות הקריאה עוברים כמו שהם', () => {
  const { api } = spyApi();
  const guarded = readOnlyIfOffline(api, true);
  assert.equal(guarded.hydrated, api.hydrated);
  assert.equal(guarded.trips, api.trips);
  assert.equal(guarded.currentTrip, api.currentTrip);
  assert.equal(guarded.deleted, api.deleted);
});

test('addPlace מחזיר צורה תקינה ולא undefined', () => {
  const { api } = spyApi();
  // A caller that destructures the result immediately would blow up on undefined - the disabling
  // has to be quiet, not a crash
  const got = readOnlyIfOffline(api, true).addPlace('vienna', 'p1');
  assert.deepEqual(got, { dayIndex: 0 });
});

test('createTrip מחזיר טיול תקין שלא נשמר בשום מקום', () => {
  const { api, calls } = spyApi();
  const t = readOnlyIfOffline(api, true).createTrip('הטיול שלי');
  assert.deepEqual(calls, []);
  assert.deepEqual(t.days, []);
  assert.deepEqual(t.citySlugs, []);
});

test('כל פונקציה ב-TripApi היא או קריאה מוכרת או מוטציה חסומה', () => {
  const { api, calls } = spyApi();
  const guarded = readOnlyIfOffline(api, true);
  /** The functions allowed through: a read, or the result of a sync that requires a network anyway */
  const ALLOWED = new Set(['setCurrentId', 'applyRemoteTrips', 'applyRemoteDeletions']);
  const fnNames = Object.entries(api)
    .filter(([, v]) => typeof v === 'function')
    .map(([k]) => k);

  for (const name of fnNames) {
    if (ALLOWED.has(name)) continue;
    const before = calls.length;
    (guarded as unknown as Record<string, (...a: unknown[]) => unknown>)[name]();
    assert.equal(
      calls.length,
      before,
      `${name} עוברת ל-API האמיתי בלי רשת - להוסיף אותה ל-readOnlyIfOffline`,
    );
  }
});
