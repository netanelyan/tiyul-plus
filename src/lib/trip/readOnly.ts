'use client';

import type { TripApi } from './TripContext';
import type { Trip } from './types';

/**
 * Read-only mode when offline, as a safety net beneath the interface.
 *
 * **The decision behind this file, stated explicitly:** with no connection, a trip is
 * read and not edited. The alternative - allowing edits and syncing them back - sounds
 * more generous and fails silently: syncing to the account resolves "latest wins" by
 * `updatedAt`, which is **the device clock**. A phone abroad with a wrong clock, or a
 * second device that edited the same trip meanwhile, turns that into a silent deletion
 * of somebody's work. An edit that disappears is worse than an edit that was not
 * allowed, and that is the direction chosen.
 *
 * The interface disables the controls itself, so the functions here are almost never
 * called. They exist so that a forgotten control, a keyboard shortcut or future code
 * cannot write anyway - **structural protection, not a message to the user.**
 *
 * Two operations are deliberately **not** blocked here:
 * `setCurrentId` - switching between saved trips is a read, and must work with no
 * network; and `applyRemoteTrips`/`applyRemoteDeletions`, which are only called when
 * there is a network anyway (they are the *result* of syncing, not a local edit).
 */

/** The empty trip returned by the blocked `createTrip`. It is not stored anywhere -
 *  it exists only so a caller expecting a `Trip` does not receive `undefined`. */
function noTrip(): Trip {
  return { id: '', name: '', citySlugs: [], days: [], createdAt: 0 };
}

export function readOnlyIfOffline(api: TripApi, offline: boolean): TripApi {
  if (!offline) return api;
  return {
    ...api,
    createTrip: noTrip,
    createTripFrom: () => {},
    upsertTrip: () => {},
    duplicateTrip: () => {},
    deleteTrip: () => {},
    renameTrip: () => {},
    setTripDates: () => {},
    addDay: () => {},
    removeDay: () => {},
    setDayNotes: () => {},
    // `addPlace` returns { dayIndex } - a caller expecting an object must not receive
    // undefined and blow up, so a valid shape is returned.
    addPlace: () => ({ dayIndex: 0 }),
    removePlace: () => {},
    movePlace: () => {},
    movePlaceToDay: () => {},
  };
}
