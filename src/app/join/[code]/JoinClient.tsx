'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { ZoomablePhoto } from '@/components/PhotoLightbox';
import { categoryMeta } from '@/lib/categories';
import type { EnrichedSnapshot, EnrichedStop } from '@/lib/server/tripSnapshot';
import type { VoteTally } from '@/lib/server/groupTrips';
import { applyVote, nextVote } from '@/lib/trip/voteTally';
import type { Place } from '@/lib/types';

/** The shape PlaceThumb needs, from a snapshot stop (photo/category resolved on the server). */
function asPlace(s: EnrichedStop): Place {
  return {
    id: s.id,
    name: s.name,
    nameLocal: s.name,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    description: s.description ?? '',
    ...(s.photo ? { photo: s.photo } : {}),
  };
}


/**
 * The friend's side: joining by code, live viewing of the trip, voting on
 * stops. The trip is read from the server on every load - the organizer's
 * edits show up on refresh.
 */
export default function JoinClient({ code }: { code: string }) {
  const auth = useAuth();
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [trip, setTrip] = useState<EnrichedSnapshot | null>(null);
  const [votes, setVotes] = useState<Map<string, VoteTally>>(new Map());
  /** What is on screen right now - read synchronously so a fast second tap builds on the first. */
  const votesRef = useRef<Map<string, VoteTally>>(new Map());
  /** The last tally the SERVER gave for a place - the only honest thing to roll back to. */
  const serverRef = useRef<Map<string, VoteTally>>(new Map());
  /** Per-place click counter, so a reply that a newer tap superseded is ignored. */
  const seqRef = useRef<Map<string, number>>(new Map());
  /** Places whose write has not come back yet - their local number survives a merge. */
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // The "must sign in" state is derived at render (auth.ready && !auth.user) - not state
    if (!auth.ready || !auth.user) return;
    let alive = true;
    void (async () => {
      try {
        const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
        // Joining is idempotent - 'already' is a success
        const joinRes = await fetch('/api/group', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'join', code }),
        });
        const join = (await joinRes.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!join?.ok) {
          if (!alive) return;
          setErrorMsg(
            join?.error === 'expired'
              ? 'קישור ההזמנה פג - בקשו מהמארגן קישור חדש.'
              : join?.error === 'full'
                ? 'הקבוצה מלאה.'
                : 'הקישור לא נמצא - בדקו שהועתק במלואו.',
          );
          setPhase('error');
          return;
        }
        const res = await fetch(`/api/group?code=${encodeURIComponent(code)}`, { headers });
        const data = (await res.json().catch(() => null)) as
          | { trip?: EnrichedSnapshot; votes?: VoteTally[] }
          | null;
        if (!alive) return;
        if (!data?.trip) {
          setErrorMsg('הטיול לא נמצא - ייתכן שנמחק.');
          setPhase('error');
          return;
        }
        setTrip(data.trip);
        const initial = new Map((data.votes ?? []).map((v) => [v.placeId, v] as const));
        votesRef.current = initial;
        serverRef.current = new Map(initial);
        setVotes(initial);
        setPhase('ready');
      } catch {
        if (alive) {
          setErrorMsg('משהו השתבש - נסו לרענן.');
          setPhase('error');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.ready, auth.user, code]);

  /**
   * Voting. **No click is ever dropped, and no response may undo one.**
   *
   * The first optimistic version still felt laggy and sometimes ignored a tap,
   * and both had the same root: it treated one in-flight request as a lock.
   *
   * 1. `if (inFlight.has(placeId)) return` **discarded** any click made while a
   *    request was open. That window is a few hundred ms on a real network (the
   *    route reads the trip, writes the vote, then re-tallies), so a second tap
   *    in that window simply did nothing.
   * 2. A reply replaced the WHOLE tally map. Voting on one stop and then quickly
   *    on another meant the first reply overwrote the second stop's optimistic
   *    paint until its own reply arrived - the click visibly un-happened.
   *
   * So: every click paints immediately; a per-place sequence number means a
   * superseded reply is ignored instead of overwriting a newer intent; and a
   * reply merges, keeping the local value for any place whose write is still
   * open. Refs rather than state because a rapid second tap must read what the
   * first one just painted, not the previous render's value.
   */
  async function vote(placeId: string, dir: 1 | -1) {
    const next = nextVote(votesRef.current.get(placeId)?.mine, dir);

    const painted = new Map(votesRef.current);
    painted.set(placeId, applyVote(votesRef.current.get(placeId), placeId, next));
    votesRef.current = painted;
    setVotes(painted);

    const seq = (seqRef.current.get(placeId) ?? 0) + 1;
    seqRef.current.set(placeId, seq);
    pendingRef.current.add(placeId);

    try {
      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'vote', code, placeId, vote: next }),
      });
      const data = (await res.json().catch(() => null)) as { votes?: VoteTally[] } | null;
      if (seqRef.current.get(placeId) !== seq) return; // a newer tap already won
      if (!data?.votes) throw new Error('no tallies');

      for (const v of data.votes) serverRef.current.set(v.placeId, v);
      pendingRef.current.delete(placeId);

      // The reply carries everyone's votes, so it is the truth for every place
      // EXCEPT those whose own write has not come back yet - those keep the
      // number the traveller just saw appear.
      const merged = new Map(data.votes.map((v) => [v.placeId, v] as const));
      for (const id of pendingRef.current) {
        const local = votesRef.current.get(id);
        if (local) merged.set(id, local);
      }
      votesRef.current = merged;
      setVotes(merged);
    } catch {
      if (seqRef.current.get(placeId) !== seq) return;
      pendingRef.current.delete(placeId);
      // Fall back to the last thing the server actually said about this place.
      // Keeping the optimistic number would leave a vote on screen that does
      // not exist anywhere else.
      const truth = serverRef.current.get(placeId);
      const rolled = new Map(votesRef.current);
      if (truth) rolled.set(placeId, truth);
      else rolled.delete(placeId);
      votesRef.current = rolled;
      setVotes(rolled);
    }
  }

  if (auth.ready && !auth.user) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="display text-3xl text-night">הוזמנתם לטיול משותף 🎉</h1>
        <p className="mt-3 leading-relaxed text-night/60">
          כדי לראות את הטיול ולהצביע על העצירות צריך להתחבר - זה לוקח רגע, עם קוד למייל.
          כפתור ההתחברות למעלה בניווט.
        </p>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="py-20 text-center">
        <ThinkingIndicator label="מצטרפים לטיול" className="justify-center" />
      </div>
    );
  }

  if (phase === 'error' || !trip) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="display text-3xl text-night">אי אפשר להצטרף</h1>
        <p className="mt-3 text-night/60">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="rise-in mx-auto max-w-2xl pb-16">
      <header className="rounded-3xl bg-night px-6 py-8 text-center text-cream">
        <p className="text-xs font-bold text-zest">טיול משותף · הצביעו על מה שבא לכם</p>
        <h1 className="display mt-2 text-3xl">{trip.name}</h1>
        <p className="mt-2 text-sm font-semibold text-cream/70">
          {trip.days.length} ימים · לחצו 👍 על מה שאתם בעד ו-👎 על מה שפחות
        </p>
      </header>

      <ol className="mt-6 space-y-4">
        {trip.days.map((d) => (
          <li key={d.dayNumber} className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
            <h2 className="text-sm font-bold text-night">
              יום {d.dayNumber} · {d.cityName}
            </h2>
            <ul className="mt-3 space-y-3">
              {d.stops.map((s) => {
                const t = votes.get(s.id);
                return (
                  <li key={s.id} className="flex items-start gap-3">
                    <ZoomablePhoto place={asPlace(s)} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-night">
                        {s.name}
                        {s.mustSee && (
                          <span className="ms-1.5 text-sm text-zest" title="חובה לראות">
                            ★
                          </span>
                        )}
                        <span className="ms-2 whitespace-nowrap text-xs font-medium text-night/45">
                          {categoryMeta[s.category].label}
                        </span>
                      </p>
                      {s.description && (
                        <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-night/65">
                          {s.description}
                        </p>
                      )}
                      {/* The buttons sit under the text so a long description does not squeeze
                          them. 44px minimum: at py-1.5/text-xs they measured about 26px tall,
                          which is below the touch target this project uses everywhere else and
                          is why taps were being missed on a phone. */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => void vote(s.id, 1)}
                          aria-pressed={t?.mine === 1}
                          aria-label={`אהבתי - ${s.name}`}
                          className={`flex min-h-[44px] min-w-[64px] touch-manipulation items-center justify-center gap-1 rounded-full px-4 text-sm font-bold ring-1 transition active:scale-95 ${
                            t?.mine === 1
                              ? 'bg-sunset text-cream ring-sunset'
                              : 'bg-cream text-night/60 ring-night/15 hover:bg-sunset/10'
                          }`}
                        >
                          👍 {t?.up ?? 0}
                        </button>
                        <button
                          onClick={() => void vote(s.id, -1)}
                          aria-pressed={t?.mine === -1}
                          aria-label={`פחות בשבילי - ${s.name}`}
                          className={`flex min-h-[44px] min-w-[64px] touch-manipulation items-center justify-center gap-1 rounded-full px-4 text-sm font-bold ring-1 transition active:scale-95 ${
                            t?.mine === -1
                              ? 'bg-night text-cream ring-night'
                              : 'bg-cream text-night/60 ring-night/15 hover:bg-night/5'
                          }`}
                        >
                          👎 {t?.down ?? 0}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {d.stops.length === 0 && <li className="text-sm text-night/45">יום חופשי</li>}
            </ul>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-center text-xs font-medium text-night/45">
        ההצבעות נראות למארגן הטיול · הטיול מתעדכן כשמרעננים
      </p>
    </div>
  );
}
