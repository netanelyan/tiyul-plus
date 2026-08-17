'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import PlaceThumb from '@/components/PlaceThumb';
import { categoryMeta } from '@/lib/categories';
import type { EnrichedSnapshot, EnrichedStop } from '@/lib/server/stories';
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
  /**
   * Which places have a vote in flight. A Set and not a single id: blocking
   * every button while one request runs made voting down a list feel like the
   * page had frozen. Only the place being voted on is guarded, and only to keep
   * two requests for the SAME place from racing each other.
   */
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

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
        setVotes(new Map((data.votes ?? []).map((v) => [v.placeId, v])));
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

  async function vote(placeId: string, dir: 1 | -1) {
    if (inFlight.has(placeId)) return;

    const before = votes;
    const current = votes.get(placeId)?.mine;
    const next = nextVote(current, dir);

    // Paint first, ask the server second.
    const optimistic = new Map(before);
    optimistic.set(placeId, applyVote(before.get(placeId), placeId, next));
    setVotes(optimistic);
    setInFlight((s) => new Set(s).add(placeId));

    try {
      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'vote', code, placeId, vote: next }),
      });
      const data = (await res.json().catch(() => null)) as { votes?: VoteTally[] } | null;
      // The server's tallies include everyone else's votes, so they replace the
      // guess rather than merely confirming it.
      if (data?.votes) setVotes(new Map(data.votes.map((v) => [v.placeId, v])));
      else throw new Error('no tallies');
    } catch {
      // Roll back just this place - keeping the optimistic number would be a
      // lie, and this is the one case where the count on screen is not real.
      setVotes((cur) => {
        const m = new Map(cur);
        const prev = before.get(placeId);
        if (prev) m.set(placeId, prev);
        else m.delete(placeId);
        return m;
      });
    } finally {
      setInFlight((s) => {
        const m = new Set(s);
        m.delete(placeId);
        return m;
      });
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
                    <PlaceThumb place={asPlace(s)} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
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
                      {/* The buttons sit under the text so a long description does not
                          squeeze them, and they stay reachable at 390px. */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => void vote(s.id, 1)}
                          aria-pressed={t?.mine === 1}
                          aria-label={`אהבתי - ${s.name}`}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition active:scale-95 ${
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
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition active:scale-95 ${
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
