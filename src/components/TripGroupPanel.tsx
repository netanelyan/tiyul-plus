'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import PanelSection from '@/components/PanelSection';
import type { VoteTally } from '@/lib/server/groupTrips';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';

/**
 * הצד של המארגן בטיול משותף: יצירת קישור הזמנה (פרימיום), מונה חברים,
 * ותוצאות ההצבעה של החברים לצד שמות העצירות האמיתיים.
 */
export default function TripGroupPanel({
  trip,
  destOf,
}: {
  trip: Trip;
  destOf: (slug: string) => Destination | undefined;
}) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [votes, setVotes] = useState<VoteTally[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = auth.profile?.plan === 'premium';

  // תוצאות + מונה חברים - בכל פתיחה, כדי שהמארגן יראה הצבעות טריות
  useEffect(() => {
    if (!open || !auth.user) return;
    let alive = true;
    void (async () => {
      try {
        const headers = await authHeader();
        const res = await fetch(`/api/group?tripId=${encodeURIComponent(trip.id)}`, { headers });
        const data = (await res.json().catch(() => null)) as
          | { members?: number; votes?: VoteTally[] }
          | null;
        if (alive && data) {
          setMembers(data.members ?? 0);
          setVotes(data.votes ?? []);
        }
      } catch {
        /* הפתיחה הבאה תנסה שוב */
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, auth.user, trip.id]);

  async function makeInvite() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'invite', tripId: trip.id }),
      });
      const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
      if (data?.code) {
        setInviteUrl(`${window.location.origin}/join/${data.code}`);
      } else if (data?.error === 'premium-required') {
        setError('הזמנת חברים לטיול היא פיצ׳ר מנוי.');
      } else if (data?.error === 'trip-not-found') {
        setError('הטיול צריך להיות שמור בחשבון קודם (מתחברים והוא נשמר לבד).');
      } else {
        setError('משהו השתבש - נסו שוב עוד רגע.');
      }
    } catch {
      setError('משהו השתבש - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  /** שם עצירה אמיתי לתוצאה - הצבעות בלי שם לא מוצגות */
  function placeName(placeId: string): string | null {
    for (const d of trip.days) {
      if (!d.placeIds.includes(placeId)) continue;
      const p = destOf(d.citySlug)?.places.find((x) => x.id === placeId);
      if (p) return p.name;
    }
    return null;
  }

  const namedVotes = votes
    .map((v) => ({ ...v, name: placeName(v.placeId) }))
    .filter((v): v is VoteTally & { name: string } => v.name !== null)
    .sort((a, b) => b.up - b.down - (a.up - a.down));

  return (
    <PanelSection
      panelKey="trip-group"
      icon="🤝"
      title="טיול משותף"
      ariaLabel="טיול משותף"
      badge={
        members !== null && members > 0 ? (
          <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-[11px] font-bold text-lagoon">
            {members} חברים
          </span>
        ) : (
          <span className="rounded-full bg-sunset/15 px-2 py-0.5 text-[11px] font-bold text-sunset-deep">
            פרימיום ★
          </span>
        )
      }
      open={open}
      onToggle={() => setOpen((v) => !v)}
      className="print:hidden"
    >
      <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        {!auth.user && (
          <p className="text-sm font-semibold text-night/70">
            הטיול המשותף קשור לחשבון - צריך להתחבר קודם (למעלה בניווט).
          </p>
        )}

        {auth.user && !isPremium && (
          <>
            <p className="text-sm font-semibold leading-relaxed text-night/75">
              מתכננים עם עוד אנשים? שולחים קישור אחד - הם רואים את הטיול חי ומצביעים 👍/👎
              על כל עצירה. בלי צילומי מסך בוואטסאפ, בלי ויכוחים בעל-פה.
            </p>
            <a
              href="/premium"
              className="mt-3 inline-block rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
            >
              זמין במנוי הפרימיום ←
            </a>
          </>
        )}

        {auth.user && isPremium && (
          <div className="space-y-3">
            {!inviteUrl ? (
              <>
                <p className="text-sm font-semibold leading-relaxed text-night/75">
                  קישור אחד למשפחה או לחברים: הם רואים את הטיול (גם אחרי שתערכו אותו)
                  ומצביעים על העצירות. ההצטרפות אצלם בחינם.
                </p>
                <button
                  onClick={() => void makeInvite()}
                  disabled={busy}
                  className="rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
                >
                  {busy ? 'רגע…' : 'יצירת קישור הזמנה'}
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-cream px-3 py-2 text-xs text-night/70" dir="ltr">
                  {inviteUrl}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="rounded-xl bg-sunset px-3.5 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
                >
                  {copied ? '✓ הועתק' : 'העתקה'}
                </button>
              </div>
            )}

            {namedVotes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-night/55">מה החברים חושבים:</p>
                <ul className="mt-1.5 space-y-1">
                  {namedVotes.map((v) => (
                    <li key={v.placeId} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-night/80">{v.name}</span>
                      <span className="text-xs font-bold text-night/60">
                        👍 {v.up} · 👎 {v.down}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {members !== null && members === 0 && namedVotes.length === 0 && inviteUrl && (
              <p className="text-xs font-medium text-night/45">
                עוד לא הצטרף אף אחד - שלחו את הקישור בוואטסאפ.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-bold text-sunset-deep">
            {error}
          </p>
        )}
      </div>
    </PanelSection>
  );
}
