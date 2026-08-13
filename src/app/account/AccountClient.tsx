'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { getSupabase } from '@/lib/auth/client';
import { imageToAvatar, searchPublicProfiles, type PublicProfile } from '@/lib/auth/profile';
import { useTrip } from '@/lib/trip/TripContext';
import { tripLabel, type CityNames } from '@/lib/trip/label';
import {
  CONTINENTS,
  WORLD_COUNTRIES,
  codeToFlagEmoji,
  travelerLevel,
} from '@/data/worldCountries';
import { countries as catalogCountries } from '@/data/countries';
import Flag from '@/components/Flag';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { daysHe } from '@/lib/duration';

/**
 * האזור האישי - הבית של המשתמש המחובר:
 * פרופיל (תמונה, שם, טלפון) · דרכון המדינות ("איפה כבר הייתם" -
 * גיימיפיקציה קלה עם דרגות) · הטיולים המסונכרנים · הגדרות חשבון.
 * כל שינוי נשמר אוטומטית (debounce לשדות טקסט, מיידי לבחירות).
 */
export default function AccountClient({ cityNames }: { cityNames: CityNames }) {
  const auth = useAuth();
  const trip = useTrip();
  const router = useRouter();

  if (!auth.enabled) {
    return (
      <Shell>
        <p className="text-night/60">החשבונות אינם מוגדרים בסביבה הזו.</p>
      </Shell>
    );
  }
  if (!auth.ready || (auth.user && !auth.profile)) {
    return (
      <Shell>
        <div className="rounded-2xl bg-shell p-10 text-center ring-1 ring-night/10">
          <ThinkingIndicator label="טוען את האזור האישי" className="justify-center" />
        </div>
      </Shell>
    );
  }
  if (!auth.user) {
    return (
      <Shell>
        <div className="rounded-3xl bg-shell p-10 text-center ring-1 ring-night/10">
          <h2 className="display text-2xl text-night">האזור האישי מחכה לך</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-night/60">
            מתחברים בקוד חד-פעמי למייל (בלי סיסמאות) - והטיולים, הפרופיל ודרכון
            המדינות שלך נשמרים ועוברים איתך לכל מכשיר.
          </p>
          <p className="mt-5 text-sm font-semibold text-night/50">
            לחצו על כפתור <span className="font-bold text-night">התחברות</span> למעלה כדי להתחיל
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ProfileCard />
          <SettingsCard onDeletedAll={() => router.push('/')} />
        </div>
        <div className="space-y-6">
          <PassportCard />
          <CommunityCard />
          <TripsCard
            cityNames={cityNames}
            onOpen={(id) => {
              trip.setCurrentId(id);
              router.push('/chat');
            }}
          />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rise-in">
      <h1 className="display text-3xl text-night sm:text-4xl">האזור האישי</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/* ============================ כרטיס פרופיל ============================ */

function ProfileCard() {
  const auth = useAuth();
  const profile = auth.profile!;
  const [name, setName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone);
  const [saved, setSaved] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // שמירה אוטומטית של שדות הטקסט - שנייה אחרי שמפסיקים להקליד
  function queueSave(nextName: string, nextPhone: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ok = await auth.saveProfile({ displayName: nextName.trim(), phone: nextPhone.trim() });
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    }, 900);
  }

  async function pickAvatar(file: File | undefined) {
    if (!file || avatarBusy) return;
    setAvatarBusy(true);
    const avatar = await imageToAvatar(file);
    if (avatar) await auth.saveProfile({ avatar });
    setAvatarBusy(false);
  }

  const email = auth.user?.email ?? '';
  const initial = (name.trim()[0] ?? email[0] ?? 'א').toUpperCase();

  return (
    <section className="overflow-hidden rounded-3xl bg-shell ring-1 ring-night/10">
      {/* פס לילה עם התמונה יושבת עליו */}
      <div className="relative h-20 bg-night">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 120% at 15% 120%, rgba(255,89,65,0.4) 0%, rgba(255,197,49,0.15) 45%, transparent 70%)',
          }}
        />
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-10 flex items-end gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-sunset ring-4 ring-shell"
            aria-label="החלפת תמונת פרופיל"
            title="החלפת תמונת פרופיל"
          >
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-black text-cream">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-night/50 opacity-0 transition group-hover:opacity-100">
              {avatarBusy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
              ) : (
                <CameraIcon />
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="בחירת קובץ תמונה"
            onChange={(e) => void pickAvatar(e.target.files?.[0])}
          />
          <div className="min-w-0 pb-1">
            <p className="truncate text-sm font-medium text-night/50" dir="ltr">
              {email}
            </p>
            <p className="text-[11px] font-semibold text-lagoon-deep" aria-live="polite">
              {saved ? '✓ נשמר' : ' '}
            </p>
          </div>
        </div>

        <label htmlFor="pf-name" className="mt-4 block text-xs font-bold text-night/50">
          איך קוראים לך?
        </label>
        <input
          id="pf-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            queueSave(e.target.value, phone);
          }}
          placeholder="השם שיוצג בטיולים משותפים"
          className="mt-1.5 w-full rounded-xl border border-night/15 bg-cream px-4 py-2.5 text-night outline-none transition placeholder:text-night/30 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />

        <label htmlFor="pf-phone" className="mt-3 block text-xs font-bold text-night/50">
          טלפון <span className="font-medium text-night/35">(לעדכוני טיול עתידיים - לא חובה)</span>
        </label>
        <input
          id="pf-phone"
          value={phone}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d+\-\s]/g, '').slice(0, 20);
            setPhone(v);
            queueSave(name, v);
          }}
          placeholder="050-0000000"
          dir="ltr"
          inputMode="tel"
          className="mt-1.5 w-full rounded-xl border border-night/15 bg-cream px-4 py-2.5 text-night outline-none transition placeholder:text-night/30 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />
      </div>
    </section>
  );
}

/* ========================== דרכון המדינות ========================== */

function PassportCard() {
  const auth = useAuth();
  const profile = auth.profile!;
  const [query, setQuery] = useState('');
  const visited = useMemo(() => new Set(profile.visited), [profile.visited]);

  const { current, next } = travelerLevel(visited.size);
  const catalogSlugsByCode = useMemo(() => {
    // מדינות שיש לנו בקטלוג - כדי לקשר "יש לנו מסלולים שם"
    const map = new Map<string, string>();
    for (const c of catalogCountries) {
      const code = flagToCode(c.flag);
      if (code) map.set(code, c.slug);
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter((c) => c.name.includes(q) || c.code.includes(q.toLowerCase()));
  }, [query]);

  function toggle(code: string) {
    const next = visited.has(code)
      ? profile.visited.filter((c) => c !== code)
      : [...profile.visited, code];
    void auth.saveProfile({ visited: next });
  }

  const progress =
    next === null ? 100 : Math.min(100, Math.round((visited.size / next.min) * 100));

  return (
    <section className="rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display text-xl text-night">דרכון המדינות שלך</h2>
          <p className="mt-0.5 text-sm text-night/55">סמנו איפה כבר הייתם - ותראו כמה עולם נשאר</p>
        </div>
        <div className="rounded-2xl bg-night px-4 py-2.5 text-center">
          <p className="text-2xl font-black leading-none text-cream">{visited.size}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-cream/60">מתוך 195 מדינות בעולם</p>
        </div>
      </div>

      {/* דרגה + התקדמות */}
      <div className="mt-4 rounded-2xl bg-cream p-4 ring-1 ring-night/10">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-night">
            <span className="me-1.5">{current.emoji}</span>
            {current.title}
          </p>
          {next && (
            <p className="text-xs font-semibold text-night/50">
              עוד {next.min - visited.size} לדרגת ״{next.title}״
            </p>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-night/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-sunset to-zest transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* פירוק יבשות - רק כשיש מה להראות */}
        {visited.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-night/55">
            {CONTINENTS.map((cont) => {
              const total = WORLD_COUNTRIES.filter((c) => c.continent === cont).length;
              const got = WORLD_COUNTRIES.filter(
                (c) => c.continent === cont && visited.has(c.code),
              ).length;
              if (got === 0) return null;
              return (
                <span key={cont}>
                  {cont}: {got}/{total}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* חיפוש */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש מדינה…"
        aria-label="חיפוש מדינה"
        className="mt-4 w-full rounded-xl border border-night/15 bg-cream px-4 py-2.5 text-base sm:text-sm text-night outline-none transition placeholder:text-night/35 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
      />

      {/* רשת המדינות */}
      <div className="mt-3 grid max-h-[430px] grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3">
        {filtered.map((c) => {
          const on = visited.has(c.code);
          const inCatalog = catalogSlugsByCode.get(c.code);
          return (
            <button
              key={c.code}
              onClick={() => toggle(c.code)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition ${
                on
                  ? 'bg-sunset/10 text-night ring-2 ring-sunset'
                  : 'bg-night/[0.03] text-night/70 ring-1 ring-night/10 hover:ring-night/30'
              }`}
            >
              <Flag flag={codeToFlagEmoji(c.code)} label={c.name} size="sm" />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {on ? (
                <span className="shrink-0 text-xs text-sunset-deep">✓</span>
              ) : inCatalog ? (
                <span
                  className="shrink-0 rounded-full bg-zest/25 px-1.5 text-[9px] font-bold text-night/60"
                  title="יש לנו מסלולים במדינה הזו"
                >
                  בקטלוג
                </span>
              ) : null}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-night/45">
            לא מצאנו את &quot;{query.trim()}&quot; ברשימה
          </p>
        )}
      </div>

      {/* קריאה לפעולה עדינה - החיבור חזרה למוצר */}
      {visited.size > 0 && (
        <p className="mt-4 rounded-xl bg-night/[0.04] px-4 py-2.5 text-sm text-night/60">
          מחפשים את החותמת הבאה?{' '}
          <Link href="/countries" className="font-bold text-sunset-deep hover:underline">
            יש לנו מסלולים מוכנים ב-{catalogCountries.length} מדינות ←
          </Link>
        </p>
      )}
    </section>
  );
}

/** אמוג'י דגל → קוד ISO2 (הקטלוג שומר דגלים כאמוג'י) */
function flagToCode(flag: string): string | null {
  const points = [...flag].map((c) => c.codePointAt(0) ?? 0);
  if (points.length < 2) return null;
  const chars = points
    .filter((p) => p >= 0x1f1e6 && p <= 0x1f1ff)
    .map((p) => String.fromCharCode(97 + p - 0x1f1e6));
  return chars.length === 2 ? chars.join('') : null;
}

/* ========================== הטיולים שלי ========================== */

function TripsCard({ onOpen, cityNames }: { onOpen: (id: string) => void; cityNames: CityNames }) {
  const trip = useTrip();
  if (!trip.hydrated) return null;

  return (
    <section className="rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-xl text-night">הטיולים שלי</h2>
        <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold text-lagoon-deep">
          ✓ מסונכרנים לחשבון
        </span>
      </div>
      {trip.trips.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-cream p-6 text-center ring-1 ring-night/10">
          <p className="font-bold text-night">עוד אין טיולים</p>
          <p className="mt-1 text-sm text-night/55">מספרים לסוכן לאן חולמים לנסוע - והוא בונה</p>
          <Link
            href="/chat"
            className="mt-3 inline-block rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep"
          >
            לתכנון טיול ראשון
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {trip.trips.map((t) => {
            const stops = t.days.reduce((n, d) => n + d.placeIds.length, 0);
            return (
              <button
                key={t.id}
                onClick={() => onOpen(t.id)}
                className="card-pop flex w-full items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-start ring-1 ring-night/10"
              >
                <span className="text-xl" aria-hidden>
                  🧳
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-night">{t.name}</span>
                  <span className="block text-xs font-medium text-night/50">
                    {tripLabel(t, cityNames)} · {daysHe(t.days.length)} · {stops} עצירות
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-sunset-deep">פתיחה ←</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ============================ הגדרות ============================ */

function SettingsCard({ onDeletedAll }: { onDeletedAll: () => void }) {
  const auth = useAuth();
  const trip = useTrip();
  const profile = auth.profile!;
  const kosherDefault = profile.prefs.kosher === true;

  // ברירת המחדל של הכשרות מסונכרנת גם לטוגל של דף הבית (localStorage)
  useEffect(() => {
    try {
      localStorage.setItem('tiyul-plus:kosher-pref', JSON.stringify(kosherDefault));
    } catch {
      /* לא קריטי */
    }
  }, [kosherDefault]);

  function deleteAllTrips() {
    if (!confirm('למחוק את כל הטיולים מהחשבון ומהמכשיר הזה? אי אפשר לבטל.')) return;
    for (const t of [...trip.trips]) trip.deleteTrip(t.id);
    onDeletedAll();
  }

  return (
    <section className="rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
      <h2 className="display text-xl text-night">הגדרות</h2>

      <PromoRedeem />

      {/* תוכנית המנוי - לקריאה בלבד; משתנה דרך Stripe, הענקה או קוד הטבה */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-night/10">
        <div>
          <p className="text-sm font-bold text-night">התוכנית שלי</p>
          <p className="text-xs text-night/50">
            {profile.plan === 'premium'
              ? 'טיול+ פרימיום - מכסות מוגדלות פי 10'
              : 'תוכנית חינם - מספיקה לטיול מלא ועשרות עריכות ביום'}
          </p>
        </div>
        {profile.plan === 'premium' ? (
          <span className="shrink-0 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">★ פרימיום</span>
        ) : (
          <a
            href="/premium"
            className="shrink-0 rounded-full bg-sunset px-3.5 py-1.5 text-xs font-bold text-cream transition hover:bg-sunset-deep"
          >
            שדרוג
          </a>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-night/10">
        <div>
          <p className="text-sm font-bold text-night">פרופיל ציבורי</p>
          <p className="text-xs text-night/50">
            מטיילים יוכלו למצוא אותך בחיפוש ולראות שם, תמונה ודרכון - לא מייל, טלפון או
            טיולים
          </p>
          {profile.isPublic && !profile.displayName.trim() && (
            <p className="mt-1 text-xs font-semibold text-sunset-deep">
              כדי להופיע בחיפוש צריך למלא שם תצוגה למעלה
            </p>
          )}
        </div>
        <Toggle
          on={profile.isPublic}
          onChange={() => void auth.saveProfile({ isPublic: !profile.isPublic })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-night/10">
        <div>
          <p className="text-sm font-bold text-night">כשרות כברירת מחדל</p>
          <p className="text-xs text-night/50">טיולים חדשים ייבנו עם אוכל כשר, בלי לשאול</p>
        </div>
        <Toggle
          on={kosherDefault}
          onChange={() => void auth.saveProfile({ prefs: { ...profile.prefs, kosher: !kosherDefault } })}
        />
      </div>

      <button
        onClick={() => void auth.signOut()}
        className="mt-3 w-full rounded-2xl bg-night/5 px-4 py-3 text-start text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-night/10"
      >
        התנתקות מהמכשיר הזה
      </button>

      <button
        onClick={deleteAllTrips}
        className="mt-2 w-full rounded-2xl px-4 py-3 text-start text-sm font-semibold text-sunset-deep ring-1 ring-sunset/25 transition hover:bg-sunset/10"
      >
        מחיקת כל הטיולים שלי
      </button>
    </section>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-sunset' : 'bg-night/15'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-shell shadow transition-all ${
          on ? 'start-6' : 'start-1'
        }`}
      />
    </button>
  );
}

/* ======================== קהילת המטיילים ======================== */

function CommunityCard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // חיפוש חי עם debounce - שאילתה מול public_profiles (ציבוריים בלבד)
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    debounceRef.current = setTimeout(async () => {
      const supabase = getSupabase();
      const found = supabase ? await searchPublicProfiles(supabase, q) : [];
      setResults(found);
      setBusy(false);
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <section className="rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:p-6">
      <h2 className="display text-xl text-night">קהילת המטיילים</h2>
      <p className="mt-0.5 text-sm text-night/55">
        מחפשים חברים לפי שם או כתובת מייל מדויקת - ורואים איפה הם כבר היו ומה
        משותף לכם
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="שם או מייל מדויק…"
        aria-label="חיפוש מטייל"
        className="mt-4 w-full rounded-xl border border-night/15 bg-cream px-4 py-2.5 text-base sm:text-sm text-night outline-none transition placeholder:text-night/35 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
      />
      {busy && (
        <div className="mt-3">
          <ThinkingIndicator label="מחפש" />
        </div>
      )}
      {!busy && results !== null && results.length === 0 && (
        <p className="mt-3 rounded-xl bg-night/[0.04] px-4 py-2.5 text-sm text-night/55">
          לא נמצא מטייל כזה. מופיעים כאן רק מי שהדליקו &quot;פרופיל ציבורי&quot;
          בהגדרות; חיפוש מייל דורש כתובת מלאה ומדויקת.
        </p>
      )}
      {!busy && results !== null && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((r) => {
            const level = travelerLevel(r.visited.length).current;
            return (
              <Link
                key={r.userId}
                href={`/u/${r.userId}`}
                className="card-pop flex w-full items-center gap-3 rounded-2xl bg-cream px-4 py-2.5 ring-1 ring-night/10"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sunset text-base font-black text-cream">
                  {r.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.avatar}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (r.displayName[0] ?? 'א').toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-night">{r.displayName}</span>
                  <span className="block text-xs font-medium text-night/50">
                    {level.emoji} {level.title} · {r.visited.length} מדינות
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-sunset-deep">לפרופיל ←</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FDF6EC"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

/* ============================ קוד הטבה ============================ */
/**
 * פדיון קוד. מוצג לכולם - גם למי שכבר פרימיום, כי קוד מאריך תוקף קיים
 * ולא דורס אותו. ההודעות מכוונות להיות מדויקות: "כבר פדיתם את הקוד הזה"
 * הוא מצב שונה מ"הקוד לא תקף", והמטייל צריך לדעת מה מהם.
 */
function PromoRedeem() {
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        days?: number;
        error?: string;
        retryAfterSec?: number;
      };
      if (data.ok) {
        setMsg({ ok: true, text: `הקוד נפדה - ${data.days} ימי פרימיום נוספו לחשבון.` });
        setCode('');
        await auth.reloadProfile();
      } else {
        const minutes = Math.max(1, Math.ceil((data.retryAfterSec ?? 3600) / 60));
        const byError: Record<string, string> = {
          too_many_attempts: `ניסינו כמה קודים ברצף 🙏 אפשר לנסות שוב בעוד ${minutes} דקות. אם הקוד הגיע במייל, כדאי להעתיק אותו משם במקום להקליד.`,
          already_redeemed: 'כבר פדיתם את הקוד הזה.',
          not_signed_in: 'צריך להתחבר כדי לפדות קוד.',
          unavailable: 'הפדיון לא זמין כרגע. כדאי לנסות שוב בהמשך.',
        };
        setMsg({
          ok: false,
          text: byError[data.error ?? ''] ?? 'הקוד לא תקף, פג או נגמרו הפדיונות שלו.',
        });
      }
    } catch {
      setMsg({ ok: false, text: 'הפדיון נכשל. כדאי לנסות שוב.' });
    }
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-2xl bg-cream px-4 py-3 ring-1 ring-night/10">
      <p className="text-sm font-bold text-night">🎁 יש לי קוד הטבה</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && code.length >= 3) void redeem();
          }}
          dir="ltr"
          placeholder="ARMY30"
          aria-label="קוד הטבה"
          className="min-w-0 flex-1 rounded-xl bg-shell px-3 py-2 text-base sm:text-sm font-bold text-night ring-1 ring-night/10 focus:ring-2 focus:ring-sunset"
        />
        <button
          onClick={() => void redeem()}
          disabled={busy || code.length < 3}
          className="rounded-xl bg-night px-4 py-2 text-sm font-bold text-cream transition hover:bg-night-soft disabled:opacity-50"
        >
          פדיון
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-xs font-semibold ${msg.ok ? 'text-night/70' : 'text-sunset-deep'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
