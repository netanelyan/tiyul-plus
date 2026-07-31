'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSupabase } from '@/lib/auth/client';
import { fetchPublicProfile, type PublicProfile } from '@/lib/auth/profile';
import {
  CONTINENTS,
  WORLD_COUNTRIES,
  codeToFlagEmoji,
  travelerLevel,
} from '@/data/worldCountries';
import Flag from '@/components/Flag';
import ThinkingIndicator from '@/components/ThinkingIndicator';

/** פרופיל מטייל ציבורי: דרכון בלבד, לקריאה - עם "מדינות משותפות" כשמחוברים */
export default function TravelerClient({ userId }: { userId: string }) {
  const auth = useAuth();
  const [state, setState] = useState<'loading' | 'notfound' | 'ok'>('loading');
  const [traveler, setTraveler] = useState<PublicProfile | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(userId)) {
      setState('notfound');
      return;
    }
    let cancelled = false;
    fetchPublicProfile(supabase, userId).then((p) => {
      if (cancelled) return;
      if (!p) setState('notfound');
      else {
        setTraveler(p);
        setState('ok');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visited = useMemo(() => new Set(traveler?.visited ?? []), [traveler]);
  const myVisited = useMemo(() => new Set(auth.profile?.visited ?? []), [auth.profile]);
  const common = useMemo(
    () => WORLD_COUNTRIES.filter((c) => visited.has(c.code) && myVisited.has(c.code)),
    [visited, myVisited],
  );
  const theirCountries = useMemo(
    () => WORLD_COUNTRIES.filter((c) => visited.has(c.code)),
    [visited],
  );

  if (state === 'loading') {
    return (
      <div className="rounded-2xl bg-shell p-10 text-center ring-1 ring-night/10">
        <ThinkingIndicator label="טוען פרופיל מטייל" className="justify-center" />
      </div>
    );
  }

  if (state === 'notfound' || !traveler) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-shell p-10 text-center ring-1 ring-night/10">
        <h1 className="display text-2xl text-night">הפרופיל הזה פרטי או שאינו קיים</h1>
        <p className="mt-2 leading-relaxed text-night/60">
          מטיילים מופיעים כאן רק אם בחרו להיות גלויים בקהילה.
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep"
        >
          לאזור האישי שלי
        </Link>
      </div>
    );
  }

  const { current } = travelerLevel(visited.size);

  return (
    <div className="rise-in mx-auto max-w-2xl">
      {/* כרטיס המטייל */}
      <section className="overflow-hidden rounded-3xl bg-shell ring-1 ring-night/10">
        <div className="relative h-24 bg-night">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 120% at 15% 120%, rgba(255,89,65,0.4) 0%, rgba(255,197,49,0.15) 45%, transparent 70%)',
            }}
          />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-10">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sunset text-3xl font-black text-cream ring-4 ring-shell">
              {traveler.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={traveler.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                (traveler.displayName[0] ?? 'א').toUpperCase()
              )}
            </span>
          </div>
          <h1 className="display mt-3 text-2xl text-night">{traveler.displayName}</h1>
          <p className="mt-0.5 text-sm font-semibold text-night/55">
            {current.emoji} {current.title} · {visited.size} מדינות
          </p>

          {/* פירוק יבשות */}
          {visited.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-night/55">
              {CONTINENTS.map((cont) => {
                const got = theirCountries.filter((c) => c.continent === cont).length;
                if (got === 0) return null;
                const total = WORLD_COUNTRIES.filter((c) => c.continent === cont).length;
                return (
                  <span key={cont}>
                    {cont}: {got}/{total}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* מדינות משותפות - החיבור החברתי הכיפי */}
      {auth.user && common.length > 0 && (
        <section className="mt-5 rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
          <h2 className="font-bold text-night">
            🤝 ביקרתם שניכם ב-{common.length === 1 ? 'מדינה אחת' : `${common.length} מדינות`}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {common.map((c) => (
              <span
                key={c.code}
                className="flex items-center gap-1.5 rounded-full bg-lagoon/10 px-3 py-1.5 text-sm font-semibold text-night"
              >
                <Flag flag={codeToFlagEmoji(c.code)} label={c.name} size="sm" />
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* הדרכון שלהם */}
      <section className="mt-5 rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
        <h2 className="font-bold text-night">דרכון המדינות</h2>
        {theirCountries.length === 0 ? (
          <p className="mt-2 text-sm text-night/50">עוד אין חותמות בדרכון הזה</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {theirCountries.map((c) => (
              <span
                key={c.code}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  myVisited.has(c.code)
                    ? 'bg-lagoon/10 text-night'
                    : 'bg-night/[0.04] text-night/70 ring-1 ring-night/10'
                }`}
                title={myVisited.has(c.code) ? 'גם אתם הייתם כאן' : undefined}
              >
                <Flag flag={codeToFlagEmoji(c.code)} label={c.name} size="sm" />
                {c.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <p className="mt-5 text-center text-xs text-night/40">
        רוצים דרכון משלכם? מסמנים מדינות{' '}
        <Link href="/account" className="font-bold text-sunset-deep hover:underline">
          באזור האישי
        </Link>
      </p>
    </div>
  );
}
