'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSupabase } from '@/lib/auth/client';
import { useTrip } from '@/lib/trip/TripContext';
import { mergeTrips, pullRemoteTrips, pushTrips, writeTombstones } from '@/lib/trip/sync';

/**
 * An invisible component that syncs the trips with the account:
 * - on sign-in: pull from the server, a "latest wins" merge against local
 *   (the existing local trips go up to the account automatically - that is
 *   also the initial migration),
 * - on every local change: a push with a 1.5s debounce,
 * - a local deletion is written as a tombstone row on the server (see the
 *   explanation in `sync.ts`); that is the action that keeps the trip from
 *   coming back to life after a refresh.
 * Sits inside the two providers (layout) and touches no other component.
 */
export default function AccountSync() {
  const { user, ready } = useAuth();
  const trip = useTrip();

  const pulledForUser = useRef<string | null>(null);
  const pullDone = useRef(false);
  const knownTombstones = useRef<Record<string, number>>({});
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Trips just applied from the server - so we do not immediately push them back next round
  const applyingRef = useRef(false);
  const tripsRef = useRef(trip.trips);
  tripsRef.current = trip.trips;
  const deletedRef = useRef(trip.deleted);
  deletedRef.current = trip.deleted;

  // Sign-in / user switch: pull + merge + migration of local trips
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !ready || !trip.hydrated) return;
    if (!user) {
      pulledForUser.current = null;
      pullDone.current = false;
      knownTombstones.current = {};
      /*
        **Signing out clears that account's trips from the device.**
        Without this, the next sign-in on the same computer - by a
        different person - merged them into THEIR account, because the
        merge pushes any local trip that is not on the server. The trips
        are not lost: they live in the account and return on the next
        sign-in.
      */
      trip.switchAccount(null);
      return;
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    // A different account from the one sitting in storage? Clear before
    // the pull, not after. The returned value is synchronous - the state
    // has not re-rendered yet, and without this the merge below would
    // still see the previous person's trips and push them into this
    // account.
    const cleared = trip.switchAccount(user.id);

    (async () => {
      const pulled = await pullRemoteTrips(supabase);
      // Either way the pull is over: from here on a new deletion is
      // written immediately by the second effect, rather than waiting for
      // a pull that will no longer come.
      pullDone.current = true;
      if (pulled === null) return; // network error - we will retry on the next change
      // **The local tombstones are read through the ref, not from the
      // effect's closure.** That was exactly the bug: the pull takes off,
      // the user deletes a trip while it is in flight, and the merge
      // computed against a state from before the deletion.
      const { applyLocally, pushRemotely, writeRemotely, applyDeletions } = mergeTrips(
        cleared ? [] : tripsRef.current,
        pulled.trips,
        cleared ? {} : deletedRef.current,
        pulled.tombstones,
      );
      // **Not `upsertTrip`.** It stamps `updatedAt: Date.now()`, which
      // turned every sign-in into a fabricated edit that beat a real
      // deletion - see the explanation in TripContext.
      applyingRef.current = applyLocally.length > 0;
      trip.applyRemoteTrips(applyLocally);
      if (Object.keys(applyDeletions).length > 0) trip.applyRemoteDeletions(applyDeletions);
      if (Object.keys(writeRemotely).length > 0) {
        if (await writeTombstones(supabase, writeRemotely))
          knownTombstones.current = { ...knownTombstones.current, ...writeRemotely };
      }
      for (const [id, at] of Object.entries(pulled.tombstones)) knownTombstones.current[id] = at;
      if (pushRemotely.length > 0) await pushTrips(supabase, pushRemotely);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready, trip.hydrated]);

  // Every local change: a (debounced) push + tombstone writes for new deletions
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user || !trip.hydrated) return;

    // A new tombstone = a deletion the server does not know about yet.
    // Derived from the tombstones themselves rather than a diff between
    // two renders: after a refresh there is no "previous render", and the
    // previous version simply sent nothing in that state.
    const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const fresh = Object.fromEntries(
      Object.entries(trip.deleted)
        .filter(([id, at]) => (knownTombstones.current[id] ?? 0) < at && now - at < RECENT_MS)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50),
    );
    if (pullDone.current && Object.keys(fresh).length > 0) {
      void writeTombstones(supabase, fresh).then((ok) => {
        if (ok) knownTombstones.current = { ...knownTombstones.current, ...fresh };
      });
    }

    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const live = tripsRef.current.filter(
        (t) => (deletedRef.current[t.id] ?? 0) < (t.updatedAt ?? t.createdAt),
      );
      void pushTrips(supabase, live);
    }, 1500);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.trips, trip.deleted, user, trip.hydrated]);

  return null;
}
