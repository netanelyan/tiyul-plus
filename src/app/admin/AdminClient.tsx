'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authHeader } from '@/lib/auth/client';
import type { Role } from '@/lib/plans';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { daysHe } from '@/lib/duration';

/**
 * אזור הניהול, עברית RTL כמו כל האתר.
 *
 * ההרשאה לא נשמרת כאן ולא נסמכת על שום דבר בדפדפן: בכל טעינה שואלים את
 * /api/admin/me, וכל פעולה עוברת בנתיב שמאמת את התפקיד מחדש מול
 * הדאטהבייס. מי שאין לו הרשאה מקבל "לא נמצא" - אותה תשובה שמקבל מי
 * שלא מחובר בכלל, בלי לרמז שהאזור קיים.
 */

interface Me {
  role: Role;
  email: string | null;
}

interface UserInfo {
  found: boolean;
  email?: string;
  displayName?: string | null;
  role?: Role;
  plan?: 'free' | 'premium';
  planUntil?: string | null;
  planSource?: string | null;
  trips?: number;
  unitsToday?: number;
}

interface Stats {
  today: {
    identities: number;
    loggedIn: number;
    anonymous: number;
    units: number;
    nearCap: number;
    atCap: number;
    top: { kind: string; units: number }[];
  };
  week: { day: string; units: number }[];
  accounts: { total: number; capped?: boolean; withProfile?: number; premium: number; admins: number };
  freeCap: number;
}

interface PromoCode {
  code: string;
  days: number;
  max_redemptions: number;
  redeemed: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
}

const hebrewDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminClient() {
  const [me, setMe] = useState<Me | null | 'loading'>('loading');
  /** השרת ענה 503: הפיצ׳ר לא מוגדר, לא חוסר הרשאה. שני מצבים שונים לגמרי. */
  const [unconfigured, setUnconfigured] = useState(false);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const auth = await authHeader();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...auth, ...(init?.headers ?? {}) },
    });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => null)) as unknown };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { ok, status, data } = await api('/api/admin/me');
      if (!alive) return;
      if (status === 503 && (data as { error?: string })?.error === 'not_configured') {
        setUnconfigured(true);
        setMe(null);
        return;
      }
      setMe(ok ? (data as Me) : null);
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  if (me === 'loading') {
    return (
      <div className="mx-auto max-w-md py-20">
        <ThinkingIndicator label="בודק הרשאות" className="justify-center" />
      </div>
    );
  }

  /*
    למה מסך נפרד: נתנאל היה owner בדאטהבייס וראה "הדף לא נמצא", כי המפתח
    לא היה ב-env. שתי סיבות שונות לחלוטין נראו זהות. עמוד שיודע מה חסר
    שווה יותר מעמוד שמנחש בשבילך.
  */
  if (unconfigured) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <h1 className="display text-3xl text-night">אזור הניהול עוד לא מוגדר</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-night/70">
          התפקיד שלכם אולי כבר מוגדר בדאטהבייס, אבל השרת לא יכול לקרוא אותו: חסר המשתנה{' '}
          <code className="rounded bg-night/5 px-1.5 py-0.5 text-xs font-bold" dir="ltr">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          .
        </p>
        <ol className="mt-4 space-y-2 text-sm font-medium leading-relaxed text-night/70">
          <li>
            <b>1.</b> Supabase → Settings → API Keys → להעתיק את המפתח הסודי
            (service_role או sb_secret_).
          </li>
          <li>
            <b>2.</b> Vercel → הפרויקט → Settings → Environment Variables → להוסיף בשם
            הזה, ל-Production ול-Preview. שרת בלבד, בלי NEXT_PUBLIC_.
          </li>
          <li>
            <b>3.</b> <b>דיפלוי מחדש.</b> משתני סביבה לא נכנסים לתוקף בדיפלוי שכבר רץ - זה
            השלב שהכי קל לפספס.
          </li>
          <li>
            <b>4.</b> להריץ את <code dir="ltr">supabase-admin.sql</code> ב-SQL Editor, אם עוד
            לא.
          </li>
        </ol>
        <p className="mt-4 text-xs font-medium text-night/45">
          המסך הזה מוצג רק למשתמש מחובר, והוא לא חושף שום מפתח או נתון.
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="display text-3xl text-night">הדף לא נמצא</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-night/60">
          אין כאן מה לראות. אם הגעתם לכאן בטעות, אפשר לחזור{' '}
          <Link href="/" className="font-bold text-sunset-deep underline">
            לדף הבית
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rise-in mx-auto max-w-5xl space-y-5 py-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="display text-3xl text-night">אזור הניהול</h1>
        <span className="rounded-full bg-sunset/10 px-3 py-1 text-xs font-bold text-sunset-deep ring-1 ring-sunset/25">
          {me.role === 'owner' ? '👑 בעלים' : '🛠️ אדמין'}
        </span>
        <span className="text-xs font-medium text-night/45">{me.email}</span>
      </header>

      {/*
        המצטבר ראשון, האישי אחריו. זה לא רק סדר: המסך הראשי אמור לענות
        על "מה קורה באתר", והחיפוש הוא כלי שנכנסים אליו בכוונה.
      */}
      <OverviewCard api={api} />
      <TripLookupCard api={api} />
      <UserCard api={api} role={me.role} />
      <SpendCard api={api} />
      <StatsCard api={api} />
      <PromoCard api={api} />
      <FlagsCard api={api} />

      <p className="rounded-xl bg-night/[0.03] px-4 py-3 text-xs font-medium leading-relaxed text-night/55">
        כל פעולה כאן נרשמת ביומן ביקורת עם המייל שלכם והזמן - כולל חיפוש של מטייל. היומן נקרא רק
        מהדאטהבייס, בכוונה: הוא לא אמור להיות משהו שאפשר לערוך מהממשק שכותב אליו.
      </p>
    </div>
  );
}

/* ---------- מטייל: חיפוש, הענקה, תפקיד ---------- */
function UserCard({
  api,
  role,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
  role: Role;
}) {
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');

  const lookup = async () => {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await api('/api/admin/user', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!ok) return setMsg('החיפוש נכשל.');
    const d = data as UserInfo;
    setInfo(d);
    if (!d.found) setMsg('אין חשבון עם המייל הזה. חיפוש מייל דורש כתובת מדויקת.');
  };

  const setPlan = async (action: 'grant' | 'revoke') => {
    setBusy(true);
    setMsg(null);
    const n = days.trim() === '' ? 30 : Number(days);
    const { ok, data } = await api('/api/admin/plan', {
      method: 'POST',
      body: JSON.stringify({ email: info?.email ?? email, action, days: n, note }),
    });
    setBusy(false);
    if (!ok) return setMsg('הפעולה נכשלה.');
    const d = data as { until: string | null };
    setMsg(
      action === 'revoke'
        ? 'הפרימיום נשלל.'
        : d.until
          ? `פרימיום עד ${hebrewDate(d.until)}.`
          : 'פרימיום ללא תאריך סיום.',
    );
    void lookup();
  };

  const setRole = async (next: Role) => {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await api('/api/admin/role', {
      method: 'POST',
      body: JSON.stringify({ email: info?.email ?? email, role: next }),
    });
    setBusy(false);
    const err = (data as { error?: string })?.error;
    if (!ok) {
      setMsg(
        err === 'cannot_change_own_role'
          ? 'אי אפשר לשנות את התפקיד של עצמך - זו הגנה, לא באג.'
          : err === 'cannot_demote_owner'
            ? 'אי אפשר להוריד בעלים מהממשק.'
            : 'שינוי התפקיד נכשל.',
      );
      return;
    }
    setMsg(next === 'admin' ? 'התפקיד עודכן לאדמין.' : 'התפקיד הוחזר למשתמש רגיל.');
    void lookup();
  };

  return (
    <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="text-lg font-bold text-night">🔎 מטייל</h2>
      <p className="mt-1 text-sm font-medium text-night/55">
        חיפוש לפי מייל מדויק. מוצגים תוכנית, תפקיד, מספר טיולים ושימוש היום - לא תוכן הטיולים ולא
        השיחות.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void lookup();
          }}
          dir="ltr"
          placeholder="name@example.com"
          aria-label="מייל המטייל"
          className="min-w-0 flex-1 rounded-xl bg-cream px-4 py-2.5 text-base sm:text-sm text-night outline-none ring-1 ring-night/10 focus:ring-2 focus:ring-sunset"
        />
        <button
          onClick={() => void lookup()}
          disabled={busy || !email.includes('@')}
          className="rounded-xl bg-sunset px-4 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:bg-sunset/50"
        >
          חיפוש
        </button>
      </div>

      {msg && <p className="mt-3 rounded-xl bg-night/5 px-3 py-2 text-sm font-semibold text-night/70">{msg}</p>}

      {info?.found && (
        <div className="mt-4 space-y-3 rounded-xl bg-cream p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-night" dir="ltr">
              {info.email}
            </span>
            {info.displayName && <span className="text-night/55">· {info.displayName}</span>}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                info.plan === 'premium' ? 'bg-sunset text-cream' : 'bg-night/10 text-night/60'
              }`}
            >
              {info.plan === 'premium' ? 'פרימיום' : 'חינם'}
            </span>
            {info.role !== 'user' && (
              <span className="rounded-full bg-night px-2.5 py-0.5 text-xs font-bold text-cream">
                {info.role === 'owner' ? 'בעלים' : 'אדמין'}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs font-medium text-night/60 sm:grid-cols-4">
            <div>
              <dt className="text-night/40">פג בתאריך</dt>
              <dd className="font-bold text-night/75">{hebrewDate(info.planUntil)}</dd>
            </div>
            <div>
              <dt className="text-night/40">מקור</dt>
              <dd className="font-bold text-night/75">
                {info.planSource === 'stripe'
                  ? 'מנוי בתשלום'
                  : info.planSource === 'grant'
                    ? 'הענקה'
                    : info.planSource === 'promo'
                      ? 'קוד הטבה'
                      : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-night/40">טיולים</dt>
              <dd className="font-bold text-night/75">{info.trips}</dd>
            </div>
            <div>
              <dt className="text-night/40">יחידות AI היום</dt>
              <dd className="font-bold text-night/75">{(info.unitsToday ?? 0).toLocaleString('he-IL')}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-end gap-2 border-t border-night/10 pt-3">
            <label className="text-xs font-bold text-night/50">
              ימים
              <input
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                aria-label="מספר ימים להענקה"
                className="mt-1 block w-20 rounded-lg bg-shell px-2.5 py-1.5 text-base sm:text-sm font-semibold text-night ring-1 ring-night/10"
              />
            </label>
            <label className="min-w-[8rem] flex-1 text-xs font-bold text-night/50">
              הערה (נשמרת ביומן)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="למשל: משפיען, בודק בטא"
                className="mt-1 block w-full rounded-lg bg-shell px-2.5 py-1.5 text-base sm:text-sm text-night ring-1 ring-night/10"
              />
            </label>
            <button
              onClick={() => void setPlan('grant')}
              disabled={busy}
              className="rounded-xl bg-night px-3.5 py-2 text-sm font-bold text-cream transition hover:bg-night-soft disabled:opacity-50"
            >
              {days === '0' ? 'פרימיום לתמיד' : `פרימיום ל-${days || 30} ימים`}
            </button>
            <button
              onClick={() => void setPlan('revoke')}
              disabled={busy}
              className="rounded-xl bg-shell px-3.5 py-2 text-sm font-bold text-sunset-deep ring-1 ring-night/10 transition hover:bg-sunset/10 disabled:opacity-50"
            >
              שלילה
            </button>
          </div>
          <p className="text-xs font-medium text-night/45">
            0 ימים = ללא תאריך סיום. ברירת המחדל היא 30 בכוונה: הענקה שפגה מעצמה לא הופכת בשקט
            למנוי חינם לנצח.
          </p>

          {role === 'owner' && info.role !== 'owner' && (
            <div className="flex flex-wrap items-center gap-2 border-t border-night/10 pt-3">
              <span className="text-xs font-bold text-night/50">תפקיד (בעלים בלבד):</span>
              {info.role === 'admin' ? (
                <button
                  onClick={() => void setRole('user')}
                  disabled={busy}
                  className="rounded-xl bg-shell px-3 py-1.5 text-xs font-bold text-night/70 ring-1 ring-night/10 hover:bg-night/5"
                >
                  הסרת אדמין
                </button>
              ) : (
                <button
                  onClick={() => void setRole('admin')}
                  disabled={busy}
                  className="rounded-xl bg-shell px-3 py-1.5 text-xs font-bold text-night/70 ring-1 ring-night/10 hover:bg-night/5"
                >
                  מינוי לאדמין
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- לוח מצב ---------- */
function StatsCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    void (async () => {
      const { ok, data } = await api('/api/admin/stats');
      if (ok) setS(data as Stats);
      else setErr(true);
    })();
  }, [api]);

  if (err) return null;
  if (!s) {
    return (
      <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
        <ThinkingIndicator label="טוען נתוני שימוש" />
      </section>
    );
  }

  const peak = Math.max(1, ...s.week.map((d) => d.units));

  return (
    <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="text-lg font-bold text-night">📊 שימוש ועלות</h2>
      <p className="mt-1 text-sm font-medium text-night/55">
        נגזר מאותו מונה שמשמש למכסות - אין כאן איסוף חדש ואין מידע מזהה.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['משתמשים היום', s.today.identities.toLocaleString('he-IL')],
          ['יחידות AI היום', s.today.units.toLocaleString('he-IL')],
          ['קרובים למכסה', String(s.today.nearCap)],
          ['נחסמו במכסה', String(s.today.atCap)],
          [
            'חשבונות',
            `${s.accounts.total.toLocaleString('he-IL')}${s.accounts.capped ? '+' : ''}`,
          ],
          ['פרימיום פעיל', String(s.accounts.premium)],
          ['אדמינים', String(s.accounts.admins)],
          ['מחוברים / אנונימיים', `${s.today.loggedIn} / ${s.today.anonymous}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-cream p-3">
            <div className="text-xs font-bold text-night/45">{label}</div>
            <div className="text-lg font-bold text-night">{value}</div>
          </div>
        ))}
      </div>

      {s.week.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold text-night/45">שבעה ימים אחרונים</div>
          <div className="mt-2 flex h-24 items-end gap-1.5">
            {s.week.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-sunset/70"
                  style={{ height: `${Math.round((d.units / peak) * 100)}%` }}
                  title={`${d.day}: ${d.units.toLocaleString('he-IL')} יחידות`}
                />
                <span className="text-[10px] font-medium text-night/40">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/*
        ההפרש בין חשבונות לבין "מתוכם עם פרופיל" הוא מי שנכנס ולא נגע
        באזור האישי. הצגתי אותו כי בלעדיו המספר "חשבונות" נראה כמו טעות:
        לנתנאל היו כמה חשבונות של בני משפחה והלוח הראה 1, כי ספרתי שורות
        ב-profiles במקום ב-auth.users.
      */}
      {typeof s.accounts.withProfile === 'number' && s.accounts.withProfile < s.accounts.total && (
        <p className="mt-3 text-xs font-medium text-night/45">
          מתוך {s.accounts.total.toLocaleString('he-IL')} החשבונות,{' '}
          {s.accounts.withProfile.toLocaleString('he-IL')} שמרו פרופיל (שם, תמונה או דרכון מדינות).
          השאר נכנסו ולא נגעו באזור האישי - הם חשבונות לכל דבר.
        </p>
      )}
      {s.today.atCap > 0 && (
        <p className="mt-3 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-semibold text-sunset-deep ring-1 ring-sunset/25">
          {s.today.atCap} מטיילים נחסמו היום במכסה. הם רואים הודעה מנומסת עם הפניה לפרימיום - שווה
          לבדוק שזו לא קבוצה שכדאי לתת לה הענקה.
        </p>
      )}
    </section>
  );
}

/* ---------- קודי הטבה ---------- */
function PromoCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [code, setCode] = useState('');
  const [days, setDays] = useState('30');
  const [max, setMax] = useState('50');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { ok, data } = await api('/api/admin/promo');
    if (ok) setCodes((data as { codes: PromoCode[] }).codes);
  }, [api]);

  useEffect(() => {
    // IIFE ולא `void load()` ישירות: הכלל react-hooks/set-state-in-effect
    // מזהה קריאה סינכרונית לפונקציה שכותבת state, וזו הצורה שבה שאר
    // הכרטיסים בקובץ הזה כבר עושים את זה.
    void (async () => {
      await load();
    })();
  }, [load]);

  const create = async () => {
    setMsg(null);
    const { ok, data } = await api('/api/admin/promo', {
      method: 'POST',
      body: JSON.stringify({ code, days: Number(days), max: Number(max), note }),
    });
    if (!ok) {
      setMsg((data as { error?: string })?.error === 'bad_code' ? 'קוד חייב להיות 3-24 אותיות באנגלית וספרות.' : 'הקוד תפוס או שהיצירה נכשלה.');
      return;
    }
    setMsg(`הקוד ${code.toUpperCase()} נוצר.`);
    setCode('');
    void load();
  };

  const toggle = async (c: PromoCode) => {
    await api('/api/admin/promo', { method: 'PATCH', body: JSON.stringify({ code: c.code, active: !c.active }) });
    void load();
  };

  return (
    <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="text-lg font-bold text-night">🎁 קודי הטבה</h2>
      <p className="mt-1 text-sm font-medium text-night/55">
        קוד שמטייל פודה בעצמו ומקבל פרימיום ל-X ימים. הפדיון אטומי ומוגבל לפעם אחת לכל חשבון - גם
        אם הקוד מסתובב ברשת.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-night/50">
          קוד
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24))}
            dir="ltr"
            placeholder="ARMY30"
            className="mt-1 block w-32 rounded-lg bg-cream px-2.5 py-1.5 text-base sm:text-sm font-bold text-night ring-1 ring-night/10"
          />
        </label>
        <label className="text-xs font-bold text-night/50">
          ימים
          <input
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            className="mt-1 block w-20 rounded-lg bg-cream px-2.5 py-1.5 text-base sm:text-sm font-semibold text-night ring-1 ring-night/10"
          />
        </label>
        <label className="text-xs font-bold text-night/50">
          מקסימום פדיונות
          <input
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            className="mt-1 block w-24 rounded-lg bg-cream px-2.5 py-1.5 text-base sm:text-sm font-semibold text-night ring-1 ring-night/10"
          />
        </label>
        <label className="min-w-[8rem] flex-1 text-xs font-bold text-night/50">
          הערה
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="למשל: פוסט אינסטגרם"
            className="mt-1 block w-full rounded-lg bg-cream px-2.5 py-1.5 text-base sm:text-sm text-night ring-1 ring-night/10"
          />
        </label>
        <button
          onClick={() => void create()}
          disabled={code.length < 3}
          className="rounded-xl bg-night px-3.5 py-2 text-sm font-bold text-cream transition hover:bg-night-soft disabled:opacity-50"
        >
          יצירה
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-night/70">{msg}</p>}

      {codes && codes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
              <span className="font-bold text-night" dir="ltr">
                {c.code}
              </span>
              <span className="text-night/55">
                {c.days} ימים · {c.redeemed}/{c.max_redemptions} נפדו
              </span>
              {c.note && <span className="text-xs text-night/40">· {c.note}</span>}
              <button
                onClick={() => void toggle(c)}
                className={`ms-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  c.active ? 'bg-sunset/15 text-sunset-deep' : 'bg-night/10 text-night/50'
                }`}
              >
                {c.active ? 'פעיל · לכיבוי' : 'כבוי · להדלקה'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- מפסק חירום ---------- */
function FlagsCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { ok, data } = await api('/api/admin/flags');
      if (ok) {
        const flags = (data as { flags: Record<string, unknown> }).flags;
        setEnabled(flags.agent_enabled === false ? false : true);
      }
    })();
  }, [api]);

  if (enabled === null) return null;

  const flip = async () => {
    setBusy(true);
    const next = !enabled;
    const { ok } = await api('/api/admin/flags', {
      method: 'POST',
      body: JSON.stringify({ key: 'agent_enabled', value: next }),
    });
    setBusy(false);
    if (ok) setEnabled(next);
  };

  return (
    <section
      className={`rounded-2xl p-5 ring-1 ${
        enabled ? 'bg-shell ring-night/10' : 'bg-sunset/10 ring-sunset/40'
      }`}
    >
      <h2 className="text-lg font-bold text-night">🛑 מפסק חירום</h2>
      <p className="mt-1 text-sm font-medium leading-relaxed text-night/60">
        כיבוי הסוכן החכם מפיל את הצ׳אט לתשובות מבוססות הכללים - האתר ממשיך לעבוד, המפה והמסלולים
        נשארים, וההוצאה על המודל נעצרת מיד. בלי דיפלוי, תוך חצי דקה. זה מה שעושים כשקמפיין מביא
        מאות אנשים בבת אחת או כשמשהו נראה חשוד.
      </p>
      <button
        onClick={() => void flip()}
        disabled={busy}
        className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
          enabled
            ? 'bg-shell text-sunset-deep ring-1 ring-sunset/40 hover:bg-sunset/10'
            : 'bg-sunset text-cream hover:bg-sunset-deep'
        }`}
      >
        {enabled ? 'כיבוי הסוכן החכם' : 'הפעלת הסוכן החכם מחדש'}
      </button>
      {!enabled && (
        <p className="mt-2 text-sm font-bold text-sunset-deep">
          הסוכן כבוי כרגע. מטיילים מקבלים תשובות בסיסיות בלבד.
        </p>
      )}
    </section>
  );
}

/* ============================================================
   כמה ה-AI עולה, בכסף
   ============================================================ */

interface Spend {
  budget: {
    limit: number;
    spent: number;
    ratio: number;
    exceeded: boolean;
    alertAt: number;
    source: string;
    anonSpent: number;
    anonLimit: number;
    userSpent: number;
    userLimit: number;
    callerLimit: number;
    stale: boolean;
  };
  today: { usd: number; requests: number; chat: number; anonymous: number; loggedIn: number; trips: number };
  days: { day: string; usd: number; requests: number }[];
  perTrip: { median: number; max: number; counted: number };
  topUsers: { kind: string; usd: number; requests: number }[];
  topTrips: { usd: number; requests: number }[];
  models: { model: string; usd: number; requests: number }[];
  stored: boolean | null;
}

const money = (n: number) => `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`;

/**
 * הכרטיס שנתנאל ביקש: כמה הוצאנו, כמה נשאר עד התקרה, וכמה עולה
 * **טיול אחד** - הנתון שמחליף ניחוש במספר.
 *
 * התקרה נערכת מכאן ישירות. זה המסלול המיועד לשינוי בלי דיפלוי.
 */
function SpendCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [d, setD] = useState<Spend | null>(null);
  /*
    `null` = לא נגעו בשדה, ואז מוצג הערך מהשרת. שמירת מחרוזת ריקה
    כברירת מחדל הייתה מחייבת setState נוסף בטעינה - וזה בדיוק הדפוס
    שה-lint מסמן כאן.
  */
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
    ריענון אחרי שמירה נעשה דרך מונה ולא דרך קריאה לפונקציה מתוך
    האפקט: זה הדפוס שכבר קיים בכרטיסים האחרים כאן, והוא גם מה
    שמונע את אזהרת cascading renders.
  */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void (async () => {
      const { ok, data } = await api('/api/admin/spend');
      if (ok) setD(data as Spend);
    })();
  }, [api, tick]);

  const shown = draft ?? (d ? String(d.budget.limit) : '');

  const save = async () => {
    const n = Number(shown);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    await api('/api/admin/flags', {
      method: 'POST',
      body: JSON.stringify({ key: 'ai_daily_budget_usd', value: n }),
    });
    setDraft(null);
    setTick((t) => t + 1);
    setBusy(false);
  };

  if (!d) return null;
  const pct = Math.min(100, Math.round(d.budget.ratio * 100));
  const near = d.budget.ratio >= d.budget.alertAt;
  const maxDay = Math.max(0.0001, ...d.days.map((x) => x.usd));

  return (
    <section
      className={`rounded-2xl p-5 ring-1 ${
        d.budget.exceeded ? 'bg-sunset/10 ring-sunset/40' : 'bg-shell ring-night/10'
      }`}
    >
      <h2 className="text-lg font-bold text-night">💸 תקרת הוצאה</h2>

      {/* ---------- היום מול התקרה ---------- */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-black text-night" dir="ltr">
          {money(d.budget.spent)}
        </span>
        <span className="text-sm font-semibold text-night/50" dir="ltr">
          / {money(d.budget.limit)}
        </span>
        <span
          className={`text-sm font-bold ${
            d.budget.exceeded ? 'text-sunset-deep' : near ? 'text-sunset-deep' : 'text-night/45'
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-night/10">
        <div
          className={`h-full rounded-full transition-all ${
            d.budget.exceeded || near ? 'bg-sunset' : 'bg-lagoon'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* ---------- שני הארנקים ---------- */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          {
            label: 'אנונימיים',
            spent: d.budget.anonSpent,
            limit: d.budget.anonLimit,
            note: 'ארנק נפרד - לא יכול לכבות את הסוכן למחוברים',
          },
          {
            label: 'מחוברים',
            spent: d.budget.userSpent,
            limit: d.budget.userLimit,
            note: 'כל מה שאנונימיים לא הוציאו, ולפחות 70% מהיום',
          },
        ].map((p) => {
          const r = p.limit > 0 ? Math.min(100, Math.round((p.spent / p.limit) * 100)) : 100;
          return (
            <div key={p.label} className="rounded-xl bg-cream p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-night">{p.label}</span>
                <span className="text-xs font-semibold text-night/50" dir="ltr">
                  {money(p.spent)} / {money(p.limit)}
                </span>
                <span className="ms-auto text-xs font-bold text-night/45">{r}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-night/10">
                <div
                  className={`h-full rounded-full ${r >= 100 ? 'bg-sunset' : 'bg-lagoon'}`}
                  style={{ width: `${r}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-medium text-night/45">{p.note}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] font-medium text-night/45">
        תקרה לזהות בודדת: <span dir="ltr">{money(d.budget.callerLimit)}</span> ליום (אנונימי -
        פחות). אף אחד לא יכול לקחת חלק גדול מהיום.
      </p>

      {d.budget.stale && (
        <p className="mt-2 rounded-xl bg-sunset/10 px-3 py-2 text-sm font-bold text-sunset-deep">
          אין סכום הוצאה משותף כרגע (הדאטהבייס לא נגיש). הסוכן נעול עד שהחיבור יחזור - עדיף
          להיות למטה מאשר להוציא בלי לדעת כמה.
        </p>
      )}

      {d.budget.exceeded && (
        <p className="mt-2 text-sm font-bold text-sunset-deep">
          הסוכן לא מקבל בקשות חדשות כרגע. הוא יחזור מעצמו בחצות UTC, או מיד אם תעלה את התקרה.
        </p>
      )}
      {!d.budget.exceeded && near && (
        <p className="mt-2 text-sm font-bold text-sunset-deep">
          מתקרבים לתקרה ({Math.round(d.budget.alertAt * 100)}% ומעלה). התראה נשלחה.
        </p>
      )}

      {/* ---------- שינוי התקרה, בלי דיפלוי ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-night/55" htmlFor="budget-input">
          תקרה יומית ($)
        </label>
        <input
          id="budget-input"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="decimal"
          dir="ltr"
          className="w-24 rounded-xl bg-cream px-3 py-2 text-base text-night ring-1 ring-night/15 outline-none focus:ring-2 focus:ring-sunset sm:text-sm"
        />
        <button
          onClick={() => void save()}
          disabled={busy || shown === String(d.budget.limit)}
          className="rounded-xl bg-night px-3 py-2 text-xs font-bold text-cream transition hover:bg-night/85 disabled:opacity-40"
        >
          שמירה
        </button>
        <span className="text-[11px] font-medium text-night/40">
          חל מיד. 0 = הסוכן כבוי לגמרי.
        </span>
      </div>

      {/* ---------- כמה עולה טיול ---------- */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'טיול חציוני', v: money(d.perTrip.median) },
          { label: 'הטיול היקר ביותר', v: money(d.perTrip.max) },
          { label: 'טיולים היום', v: String(d.today.trips) },
          { label: 'קריאות היום', v: String(d.today.requests) },
        ].map((x) => (
          <div key={x.label} className="rounded-xl bg-cream p-3">
            <div className="text-lg font-black text-night" dir="ltr">
              {x.v}
            </div>
            <div className="text-[11px] font-semibold text-night/50">{x.label}</div>
          </div>
        ))}
      </div>

      {/* ---------- 14 יום ---------- */}
      <div className="mt-4">
        <div className="text-xs font-bold text-night/55">הוצאה יומית (14 יום)</div>
        <div className="mt-2 flex h-16 items-end gap-1">
          {d.days.map((x) => (
            <div key={x.day} className="flex-1" title={`${x.day}: ${money(x.usd)}`}>
              <div
                className="w-full rounded-t bg-night/25"
                style={{ height: `${Math.max(3, (x.usd / maxDay) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- מי מוציא ---------- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-bold text-night/55">הכי יקרים היום ובשבועיים</div>
          <ul className="mt-1.5 space-y-1">
            {d.topUsers.slice(0, 5).map((u, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-semibold text-night/70">
                <span className="rounded-full bg-night/[0.06] px-2 py-0.5 text-[11px]">
                  {u.kind === 'user' ? 'מחובר' : 'אנונימי'}
                </span>
                <span dir="ltr">{money(u.usd)}</span>
                <span className="text-night/40">{u.requests} קריאות</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-bold text-night/55">לפי מודל</div>
          <ul className="mt-1.5 space-y-1">
            {d.models.map((m) => (
              <li key={m.model} className="flex items-center gap-2 text-xs font-semibold text-night/70">
                <span dir="ltr">{m.model}</span>
                <span dir="ltr" className="ms-auto">
                  {money(m.usd)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {d.stored === null && (
        <p className="mt-3 rounded-xl bg-night/[0.04] px-3 py-2 text-xs font-semibold text-night/50">
          אין עדיין היסטוריה שמורה. אם המספרים נשארים ריקים אחרי שימוש, כנראה שצריך להריץ את
          supabase-ai-spend.sql - התקרה עצמה עובדת גם בלעדיו, לכל instance בנפרד.
        </p>
      )}
    </section>
  );
}

/* ============================================================
   התצוגה המצטברת - המסך הראשי
   ============================================================ */

interface Overview {
  windowDays: number;
  trips: {
    total: number;
    travelers: number;
    withStops: number;
    medianDays: number;
    medianStops: number;
    perDay: { day: string; trips: number }[];
    truncated: boolean;
  };
  places: {
    cities: { slug: string; label: string; trips: number }[];
    countries: { slug: string; label: string; trips: number }[];
  };
  sharing: {
    shares: number;
    perDay: { day: string; shares: number }[];
    exports: { kind: string; count: number }[];
    exportsTracked: boolean;
  };
  accounts: { total: number; capped: boolean };
  ai: { budget: number; spent: number; anonSpent: number; userSpent: number; ratio: number; stale: boolean } | null;
  scope: string;
}

const EXPORT_LABEL: Record<string, string> = {
  print: 'הדפסה',
  pdf: 'PDF',
  whatsapp: 'וואטסאפ',
  share: 'קישור',
  maps: 'ניווט',
};

/** עמודות פשוטות. גובה יחסי למקסימום, כי המספרים כאן קטנים ומשתנים. */
function Bars({ data, label }: { data: { day: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-night/55">{label}</span>
        <span className="text-xs font-black text-night" dir="ltr">
          {total}
        </span>
      </div>
      <div className="mt-2 flex h-14 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.day} className="flex-1" title={`${d.day}: ${d.n}`}>
            <div
              className="w-full rounded-t bg-lagoon/60"
              style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [d, setD] = useState<Overview | null>(null);

  useEffect(() => {
    void (async () => {
      const { ok, data } = await api('/api/admin/overview');
      if (ok) setD(data as Overview);
    })();
  }, [api]);

  if (!d) return null;

  const topShare = Math.max(1, ...d.places.countries.map((c) => c.trips));

  return (
    <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="text-lg font-bold text-night">📈 מה קורה באתר</h2>
      <p className="mt-1 text-sm font-medium text-night/55">
        {d.windowDays} הימים האחרונים. מספרים מצטברים בלבד - אין כאן אף אדם מסוים.
      </p>

      {/* ---------- המספרים שנתנאל ביקש ---------- */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'טיולים', v: String(d.trips.total) },
          { label: 'מטיילים', v: String(d.trips.travelers) },
          { label: 'אורך טיפוסי', v: daysHe(d.trips.medianDays) },
          { label: 'עצירות טיפוסי', v: String(d.trips.medianStops) },
          { label: 'נרשמו', v: `${d.accounts.total}${d.accounts.capped ? '+' : ''}` },
          { label: 'שיתופים', v: String(d.sharing.shares) },
          { label: 'הוצאת AI היום', v: d.ai ? money(d.ai.spent) : '—' },
          { label: 'טיול עם עצירות', v: String(d.trips.withStops) },
        ].map((x) => (
          <div key={x.label} className="rounded-xl bg-cream p-3">
            <div className="text-lg font-black text-night" dir="ltr">
              {x.v}
            </div>
            <div className="text-[11px] font-semibold text-night/50">{x.label}</div>
          </div>
        ))}
      </div>

      {/* ---------- לאורך זמן ---------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Bars
          label="טיולים שנוצרו"
          data={d.trips.perDay.map((x) => ({ day: x.day, n: x.trips }))}
        />
        <Bars
          label="קישורי שיתוף"
          data={d.sharing.perDay.map((x) => ({ day: x.day, n: x.shares }))}
        />
      </div>

      {/* ---------- לאן מתכננים ---------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          { title: 'מדינות', rows: d.places.countries },
          { title: 'ערים', rows: d.places.cities },
        ].map((g) => (
          <div key={g.title}>
            <div className="text-xs font-bold text-night/55">{g.title}</div>
            <ul className="mt-1.5 space-y-1">
              {g.rows.length === 0 && (
                <li className="text-xs font-medium text-night/40">אין עדיין נתונים</li>
              )}
              {g.rows.map((r) => (
                <li key={r.slug} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs font-semibold text-night/70">
                    {r.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-night/[0.06]">
                    <span
                      className="block h-full rounded-full bg-sunset/60"
                      style={{ width: `${Math.round((r.trips / topShare) * 100)}%` }}
                    />
                  </span>
                  <span className="w-6 text-end text-[11px] font-bold text-night/45">{r.trips}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ---------- ייצוא ---------- */}
      <div className="mt-4">
        <div className="text-xs font-bold text-night/55">ייצוא ושיתוף</div>
        {d.sharing.exportsTracked ? (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {d.sharing.exports.length === 0 && (
              <span className="text-xs font-medium text-night/40">אף אחד עוד לא ייצא טיול</span>
            )}
            {d.sharing.exports.map((e) => (
              <span
                key={e.kind}
                className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-night/70"
              >
                {EXPORT_LABEL[e.kind] ?? e.kind} · {e.count}
              </span>
            ))}
          </div>
        ) : (
          /*
            null ולא אפס: הטבלה לא קיימת עדיין. "0 הדפסות" הוא מספר שקרי
            שנראה בדיוק כמו מספר אמיתי.
          */
          <p className="mt-1.5 rounded-xl bg-night/[0.04] px-3 py-2 text-xs font-semibold text-night/50">
            מונה הייצוא עוד לא פעיל - צריך להריץ את supabase-admin-dash.sql. עד אז אין כאן אפס,
            אין כאן כלום.
          </p>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-night/[0.03] px-3 py-2 text-[11px] font-medium leading-relaxed text-night/50">
        {d.scope}
        {d.trips.truncated && ' · הגענו לתקרת השורות, המספרים חלקיים.'}
      </p>
    </section>
  );
}

/* ============================================================
   החיפוש הצר - חיפוש ותצוגה, לא דפדוף
   ============================================================ */

type LookupMode = 'email' | 'place' | 'name';

interface TripHit {
  userId: string;
  id: string;
  name: string;
  email: string | null;
  days: number;
  stops: number;
  cities: string[];
  updatedAt: string;
}

interface TripViewData {
  id: string;
  view: {
    name: string;
    startDate?: string;
    endDate?: string;
    days: {
      n: number;
      cityName: string;
      countryName: string | null;
      stops: { id: string; name: string; mustSee?: boolean; unknown?: boolean }[];
      notes?: string;
    }[];
    pins: { name: string; kind: string; located: boolean }[];
    preferences: { label: string; value: string }[];
  } | null;
  owner: { userId: string; email: string | null };
  updatedAt: string;
}

const MODE_LABEL: Record<LookupMode, string> = {
  email: 'מייל של מטייל',
  place: 'יעד או מדינה',
  name: 'שם הטיול',
};

const MODE_HINT: Record<LookupMode, string> = {
  email: 'כתובת מלאה ומדויקת',
  place: 'שם מהקטלוג - למשל רומא או איטליה',
  name: 'חלק מהשם שהמטייל נתן',
};

/**
 * החיפוש הצר. **בכוונה לא חוויית דפדוף**: אין רשימה שנפתחת מעצמה, אין
 * "כל הטיולים", ואי אפשר להגיע לטיול של מישהו בלי לחפש אותו קודם.
 */
function TripLookupCard({
  api,
}: {
  api: (p: string, i?: RequestInit) => Promise<{ ok: boolean; status: number; data: unknown }>;
}) {
  const [mode, setMode] = useState<LookupMode>('email');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [hits, setHits] = useState<TripHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<TripViewData | null>(null);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setNote(null);
    setOpen(null);
    const { ok, data } = await api(
      `/api/admin/trips?mode=${mode}&q=${encodeURIComponent(q.trim())}`,
    );
    setBusy(false);
    if (!ok) {
      setHits(null);
      return setNote('החיפוש נכשל.');
    }
    const d = data as { results?: TripHit[]; total?: number; note?: string; truncated?: boolean };
    setHits(d.results ?? []);
    setTotal(d.total ?? 0);
    setNote(
      d.note ??
        (d.results?.length === 0
          ? 'אין תוצאות.'
          : d.truncated
            ? `מוצגות ${d.results?.length} מתוך ${d.total}. אפשר לצמצם את החיפוש.`
            : null),
    );
  };

  const openTrip = async (h: TripHit) => {
    setBusy(true);
    const { ok, data } = await api(
      `/api/admin/trips?id=${encodeURIComponent(h.id)}&user=${encodeURIComponent(h.userId)}`,
    );
    setBusy(false);
    if (ok) setOpen(data as TripViewData);
  };

  return (
    <section className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="text-lg font-bold text-night">🔍 טיול בודד</h2>
      <p className="mt-1 text-sm font-medium text-night/55">
        לעזרה לאדם מסוים או לבדיקת תקלה. קריאה בלבד - אין כאן עריכה ואין מחיקה. פתיחת טיול נרשמת
        ביומן.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(MODE_LABEL) as LookupMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setHits(null);
              setNote(null);
              setOpen(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              mode === m
                ? 'bg-night text-cream'
                : 'bg-cream text-night/60 ring-1 ring-night/10 hover:text-night'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search();
          }}
          dir={mode === 'email' ? 'ltr' : 'auto'}
          maxLength={80}
          placeholder={MODE_HINT[mode]}
          className="min-w-56 flex-1 rounded-xl bg-cream px-3 py-2 text-base text-night ring-1 ring-night/15 outline-none focus:ring-2 focus:ring-sunset sm:text-sm"
        />
        <button
          onClick={() => void search()}
          disabled={busy || !q.trim()}
          className="rounded-xl bg-night px-4 py-2 text-sm font-bold text-cream transition hover:bg-night/85 disabled:opacity-40"
        >
          חיפוש
        </button>
      </div>

      {note && <p className="mt-2 text-xs font-semibold text-night/55">{note}</p>}

      {hits && hits.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {hits.map((h) => (
            <li key={`${h.userId}:${h.id}`}>
              <button
                onClick={() => void openTrip(h)}
                className={`flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl px-3 py-2 text-start transition ${
                  open?.id === h.id ? 'bg-sunset/10 ring-1 ring-sunset/30' : 'bg-cream hover:bg-night/[0.04]'
                }`}
              >
                <span className="text-sm font-bold text-night">{h.name}</span>
                <span className="text-xs font-semibold text-night/50" dir="ltr">
                  {h.email ?? '—'}
                </span>
                <span className="ms-auto text-[11px] font-semibold text-night/40">
                  {daysHe(h.days)} · {h.stops} עצירות · {hebrewDate(h.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length > 0 && total > hits.length && (
        <p className="mt-1.5 text-[11px] font-medium text-night/40">
          {total} תוצאות בסך הכול.
        </p>
      )}

      {open?.view && (
        <div className="mt-4 rounded-2xl bg-cream p-4 ring-1 ring-night/10">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base font-black text-night">{open.view.name}</h3>
            <span className="text-xs font-semibold text-night/50" dir="ltr">
              {open.owner.email ?? open.owner.userId}
            </span>
            <button
              onClick={() => setOpen(null)}
              className="ms-auto rounded-full bg-night/[0.06] px-3 py-1 text-[11px] font-bold text-night/60"
            >
              סגירה
            </button>
          </div>
          {(open.view.startDate || open.view.preferences.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {open.view.startDate && (
                <span className="rounded-full bg-night/[0.05] px-2.5 py-1 text-[11px] font-bold text-night/60" dir="ltr">
                  {open.view.startDate} → {open.view.endDate ?? '?'}
                </span>
              )}
              {open.view.preferences.map((p) => (
                <span
                  key={p.label}
                  className="rounded-full bg-night/[0.05] px-2.5 py-1 text-[11px] font-bold text-night/60"
                >
                  {p.label}: {p.value}
                </span>
              ))}
            </div>
          )}

          <ol className="mt-3 space-y-2">
            {open.view.days.map((day) => (
              <li key={day.n} className="rounded-xl bg-shell p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-night">יום {day.n}</span>
                  <span className="text-xs font-semibold text-night/60">
                    {day.cityName}
                    {day.countryName ? ` · ${day.countryName}` : ''}
                  </span>
                </div>
                {day.stops.length === 0 ? (
                  <p className="mt-1 text-xs font-medium text-night/40">אין עצירות ביום הזה</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {day.stops.map((s, i) => (
                      <li key={`${s.id}-${i}`} className="text-xs font-semibold text-night/70">
                        {i + 1}. {s.name}
                        {s.mustSee && <span className="text-zest"> ★</span>}
                        {s.unknown && (
                          <span className="text-night/35"> · לא בקטלוג</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {day.notes && (
                  <p className="mt-1.5 rounded-lg bg-night/[0.04] px-2 py-1 text-[11px] font-medium text-night/55">
                    {day.notes}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {open.view.pins.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-night/55">סיכות של המטייל</div>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {open.view.pins.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-shell px-2.5 py-1 text-[11px] font-semibold text-night/65"
                  >
                    {p.name}
                    {!p.located && <span className="text-night/35"> · מיקום לא אומת</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-[11px] font-medium text-night/40">
            עדכון אחרון: {hebrewDate(open.updatedAt)} · הפתיחה הזאת נרשמה ביומן.
          </p>
        </div>
      )}
    </section>
  );
}
