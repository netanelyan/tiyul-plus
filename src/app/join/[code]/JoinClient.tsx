'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import type { StorySnapshot } from '@/lib/server/stories';
import type { VoteTally } from '@/lib/server/groupTrips';

/**
 * הצד של החבר: הצטרפות בקוד, צפייה חיה בטיול, הצבעה על עצירות.
 * הטיול נקרא מהשרת בכל טעינה - עריכות של המארגן נראות ברענון.
 */
export default function JoinClient({ code }: { code: string }) {
  const auth = useAuth();
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [trip, setTrip] = useState<StorySnapshot | null>(null);
  const [votes, setVotes] = useState<Map<string, VoteTally>>(new Map());
  const [busyPlace, setBusyPlace] = useState<string | null>(null);

  useEffect(() => {
    // מצב "צריך להתחבר" נגזר ברינדור (auth.ready && !auth.user) - לא state
    if (!auth.ready || !auth.user) return;
    let alive = true;
    void (async () => {
      try {
        const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
        // הצטרפות אידמפוטנטית - 'already' הוא הצלחה
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
          | { trip?: StorySnapshot; votes?: VoteTally[] }
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
    if (busyPlace) return;
    setBusyPlace(placeId);
    try {
      const current = votes.get(placeId)?.mine;
      const next = current === dir ? 0 : dir; // לחיצה חוזרת מסירה
      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'vote', code, placeId, vote: next }),
      });
      const data = (await res.json().catch(() => null)) as { votes?: VoteTally[] } | null;
      if (data?.votes) setVotes(new Map(data.votes.map((v) => [v.placeId, v])));
    } catch {
      /* ההצבעה הבאה תנסה שוב */
    } finally {
      setBusyPlace(null);
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
            <ul className="mt-2 space-y-2">
              {d.stops.map((s) => {
                const t = votes.get(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-night/80">
                      {s.name}
                      {s.mustSee && <span className="text-zest"> ★</span>}
                    </span>
                    <button
                      onClick={() => void vote(s.id, 1)}
                      disabled={busyPlace === s.id}
                      aria-pressed={t?.mine === 1}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition ${
                        t?.mine === 1
                          ? 'bg-sunset text-cream ring-sunset'
                          : 'bg-cream text-night/60 ring-night/15 hover:bg-sunset/10'
                      }`}
                    >
                      👍 {t?.up ?? 0}
                    </button>
                    <button
                      onClick={() => void vote(s.id, -1)}
                      disabled={busyPlace === s.id}
                      aria-pressed={t?.mine === -1}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition ${
                        t?.mine === -1
                          ? 'bg-night text-cream ring-night'
                          : 'bg-cream text-night/60 ring-night/15 hover:bg-night/5'
                      }`}
                    >
                      👎 {t?.down ?? 0}
                    </button>
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
