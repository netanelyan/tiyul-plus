'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import PanelSection from '@/components/PanelSection';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { OFFLINE_HINT } from '@/lib/offline/online';
import { checkOfferEligibility, priceLabel, type PreDepartureReport } from '@/lib/predeparture';
import { todayISO } from '@/lib/trip/dates';
import type { Trip } from '@/lib/trip/types';

/**
 * "בדיקה לפני הנסיעה" - המוצר הראשון בתשלום באתר. תמיד יושב כפאנל
 * אחד, לא מוצג בכלל כשאין מה להציע וכשלא כבר נרכש - בדיוק כמו
 * `TripDateNotes` הסמוך לו.
 *
 * ## איך זה נשאר בטוח, בקצרה (הפירוט ב-server/*)
 *
 * הרכיב הזה **לעולם לא קובע שהתשלום הצליח**. הוא שולח לשרת, מציג מה
 * שהשרת אומר, ומסקר `/api/checks/status` עד שהוא רואה `paid` - וזה
 * קורה רק אחרי שה-webhook המאומת של PayPal עדכן את הדאטהבייס. חזרה
 * מ-PayPal (`?checkReturn=1`) לא "מצליחה" בעצמה; היא רק מפעילה לכידה
 * ועוברת למצב "מאמתים".
 */

type Phase =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'need-auth' }
  | { kind: 'offer' }
  | { kind: 'processing'; note: string }
  | { kind: 'result'; report: PreDepartureReport; paidAt: string | null }
  | { kind: 'notice'; message: string };

const POLL_MS = 3000;
const POLL_CEILING = 40; // ~2 דקות לפני שעוברים למצב "רגוע" בלי לפרוץ קריאות

export default function PreDepartureCheck({
  trip,
  offline = false,
}: {
  trip: Trip;
  offline?: boolean;
}) {
  const auth = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [mode, setMode] = useState<'off' | 'sandbox' | 'production' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const returnHandled = useRef(false);

  // מצב sandbox/production - עצמאי מכל שאר הזרימה, כדי שהפס יופיע מיד
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch('/api/checks/mode');
        const data = (await res.json().catch(() => null)) as { mode?: string } | null;
        if (alive && data?.mode) setMode(data.mode as 'off' | 'sandbox' | 'production');
      } catch {
        /* בלי מצב ידוע - פשוט לא מוצג פס */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollStatus = () => {
    stopPolling();
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const headers = await authHeader();
        const res = await fetch(`/api/checks/status?tripId=${encodeURIComponent(trip.id)}`, { headers });
        const data = (await res.json().catch(() => null)) as
          | { status?: string; report?: PreDepartureReport; paidAt?: string | null }
          | null;
        if (data?.status === 'paid' && data.report) {
          stopPolling();
          setPhase({ kind: 'result', report: data.report, paidAt: data.paidAt ?? null });
          return;
        }
      } catch {
        /* ניסיון הבא */
      }
      if (attempts >= POLL_CEILING) {
        stopPolling();
        setPhase({
          kind: 'notice',
          message:
            'התשלום עדיין בטיפול. אפשר לרענן את הדף בעוד כמה דקות - הבדיקה תופיע אוטומטית ברגע שהיא מוכנה.',
        });
      }
    }, POLL_MS);
  };

  useEffect(() => stopPolling, []);

  useEffect(() => {
    if (!auth.ready) return;
    stopPolling();

    void (async () => {
      setError(null);
      // פרמטרי חזרה מ-PayPal נצרכים פעם אחת בלבד, ולא נבדקים שוב בכל
      // מעבר בין טיולים - הם שייכים לטעינת הדף, לא לטיול הפעיל.
      if (!returnHandled.current) {
        returnHandled.current = true;
        const params = new URLSearchParams(window.location.search);
        const checkReturn = params.get('checkReturn') === '1';
        const checkCancel = params.get('checkCancel') === '1';
        const purchaseId = params.get('purchaseId');
        if (checkReturn || checkCancel) {
          params.delete('checkReturn');
          params.delete('checkCancel');
          params.delete('purchaseId');
          const clean = params.toString();
          window.history.replaceState(null, '', window.location.pathname + (clean ? `?${clean}` : ''));
        }
        if (checkReturn && purchaseId && auth.user) {
          setPhase({ kind: 'processing', note: 'משלימים את התשלום מול PayPal…' });
          try {
            const headers = await authHeader();
            const res = await fetch('/api/checks/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ purchaseId }),
            });
            const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (data?.error === 'declined') {
              setPhase({ kind: 'notice', message: 'PayPal לא אישר את התשלום. אפשר לנסות שוב בכל רגע.' });
              return;
            }
          } catch {
            /* ה-capture עצמו לא הצליח מסיבה זמנית - עדיין שווה לסקר, ייתכן שה-webhook כבר בדרך */
          }
          setPhase({ kind: 'processing', note: 'התשלום נשלח לאימות - זה יכול לקחת כמה שניות…' });
          pollStatus();
          return;
        }
        if (checkCancel) {
          setPhase({ kind: 'notice', message: 'התשלום בוטל. אפשר לנסות שוב בכל רגע.' });
          return;
        }
      }

      if (!auth.user) {
        evaluateOffer();
        return;
      }

      try {
        const headers = await authHeader();
        const res = await fetch(`/api/checks/status?tripId=${encodeURIComponent(trip.id)}`, { headers });
        const data = (await res.json().catch(() => null)) as
          | { status?: string; report?: PreDepartureReport; paidAt?: string | null }
          | null;
        if (data?.status === 'paid' && data.report) {
          setPhase({ kind: 'result', report: data.report, paidAt: data.paidAt ?? null });
          return;
        }
        if (data?.status === 'pending') {
          setPhase({ kind: 'processing', note: 'התשלום עדיין בטיפול…' });
          pollStatus();
          return;
        }
      } catch {
        /* אין תשובה מהשרת - מתייחסים כאילו לא נרכש, ההצעה עדיין עובדת */
      }
      evaluateOffer();
    })();

    function evaluateOffer() {
      const eligibility = checkOfferEligibility(trip, todayISO());
      if (!eligibility.eligible) {
        setPhase({ kind: 'hidden' });
        return;
      }
      if (!auth.user) {
        setPhase({ kind: 'need-auth' });
        return;
      }
      setPhase({ kind: 'offer' });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.user?.id, trip.id, trip.startDate, trip.endDate]);

  const isPremium = auth.profile?.plan === 'premium';

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/checks/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url: string | null; error?: string; mode?: string; included?: boolean }
        | null;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      /*
        פרימיום: אין PayPal ואין redirect - הדוח כבר נכתב בשרת ברגע
        שהתשובה חזרה. שאילתת status אחת מציגה אותו מייד, בדיוק כמו
        אחרי לכידה מוצלחת של PayPal - אותו מנגנון תצוגה, מקור שונה.
      */
      if (data?.included) {
        setPhase({ kind: 'processing', note: 'מכינים את הדוח…' });
        const statusHeaders = await authHeader();
        const statusRes = await fetch(`/api/checks/status?tripId=${encodeURIComponent(trip.id)}`, {
          headers: statusHeaders,
        });
        const statusData = (await statusRes.json().catch(() => null)) as
          | { status?: string; report?: PreDepartureReport; paidAt?: string | null }
          | null;
        if (statusData?.status === 'paid' && statusData.report) {
          setPhase({ kind: 'result', report: statusData.report, paidAt: statusData.paidAt ?? null });
        } else {
          // לא אמור לקרות (הכתיבה סינכרונית), אבל אם כן - הסקר הרגיל יתפוס את זה
          pollStatus();
        }
        return;
      }
      if (data?.error === 'not-configured') setError('התשלום עדיין לא מוגדר באתר - ממש בקרוב.');
      else if (data?.error === 'already-purchased') setError('הבדיקה כבר נרכשה לטיול הזה.');
      else if (data?.error === 'sandbox-blocked') setError('הרכישה כבויה כרגע באתר החי (מצב בדיקה).');
      else if (data?.error === 'not-eligible') setError('הבדיקה רלוונטית רק בסמוך לתאריך היציאה.');
      else setError('משהו השתבש - נסו שוב עוד רגע.');
    } catch {
      setError('משהו השתבש - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  };

  if (phase.kind === 'hidden' || phase.kind === 'loading') return null;

  return (
    <PanelSection
      panelKey="predeparture"
      icon="🛫"
      title="בדיקה לפני הנסיעה"
      ariaLabel="בדיקה לפני הנסיעה"
      // רק תוצאה אמיתית שווה הדפסה - הצעה/עיבוד/הודעה הן מסך, לא מסמך
      className={phase.kind === 'result' ? '' : 'print:hidden'}
    >
      {mode === 'sandbox' && (
        <div
          data-sandbox-banner
          className="mb-3 rounded-xl bg-sunset px-3 py-2 text-xs font-black text-cream print:hidden"
        >
          ⚠️ מצב בדיקה (sandbox) - שום כסף אמיתי לא זז, והתשלום עצמו הוא מדומה.
        </div>
      )}

      {phase.kind === 'result' ? (
        <ResultView report={phase.report} paidAt={phase.paidAt} />
      ) : (
        <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
          {phase.kind === 'need-auth' && (
            <p className="text-sm font-semibold text-night/70">
              הבדיקה קשורה לחשבון (כדי שנוכל לשלוח קבלה ולשחזר אותה בכל מכשיר) - צריך להתחבר קודם,
              כפתור ההתחברות למעלה בניווט.
            </p>
          )}

          {phase.kind === 'processing' && <ThinkingIndicator label={phase.note} />}

          {phase.kind === 'notice' && (
            <p className="text-sm font-semibold text-night/70">{phase.message}</p>
          )}

          {phase.kind === 'offer' && (
            <>
              <p className="text-sm font-semibold leading-relaxed text-night/75">
                לפני שיוצאים - עוברים על הטיול פעם אחרונה: כל מקום נבדק מחדש מול הקטלוג שלנו, רשומות
                הכשרות נקראות שוב עם הפרטים העדכניים, סגירות ואירועים מותאמים לתאריכים המדויקים
                שלכם, וסדר הימים נבדק שהוא הגיוני. בסוף מקבלים מסמך אחד נקי לשמור.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void buy()}
                  disabled={busy || offline}
                  title={offline ? OFFLINE_HINT : undefined}
                  className="rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'רגע…' : isPremium ? 'בדיקה לפני הנסיעה · כלול בפרימיום ★' : `בדיקה לפני הנסיעה · ${priceLabel()}`}
                </button>
                <span className="text-xs font-medium text-night/45">
                  {isPremium ? 'בלי תשלום נוסף - כלול במנוי שלכם' : 'תשלום חד-פעמי, לטיול הזה בלבד'}
                </span>
              </div>
            </>
          )}

          {error && (
            <p className="mt-2 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-bold text-sunset-deep">{error}</p>
          )}

          {phase.kind === 'offer' && (
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-night/40">
              {isPremium
                ? 'הדוח נפתח מייד - אין תשלום ואין העברה לאתר חיצוני.'
                : 'התשלום מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי כרטיס. הגישה נפתחת ברגע שהתשלום מאומת אצלנו, לרוב תוך כמה שניות.'}
            </p>
          )}
        </div>
      )}
    </PanelSection>
  );
}

function ResultView({ report, paidAt }: { report: PreDepartureReport; paidAt: string | null }) {
  const clean = report.placesFlagged.length === 0 && report.routeOk && report.calendarFindings.length === 0;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <p className="text-sm font-bold text-night">
          {clean ? '✓ הכול נראה תקין' : 'הבדיקה מצאה כמה דברים לבדוק'}
        </p>
        <p className="mt-1 text-xs font-medium text-night/50">
          נבדק ב-{new Date(report.generatedAt).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {paidAt ? '' : ' (הוענק ידנית)'}
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-night/75">
          <li>
            {report.placesFlagged.length === 0 ? '✓' : '⚠️'} {report.placesChecked} מקומות נבדקו מול
            הקטלוג
            {report.placesFlagged.length > 0 && ` · ${report.placesFlagged.length} לא נמצאו יותר`}
          </li>
          <li>
            ✓ {report.kosherChecked} רשומות כשרות נקראו מחדש
            {report.kosherChecked > 0 && ' (ראו פירוט למטה - תמיד לוודא מול המקום)'}
          </li>
          <li>
            {report.calendarFindings.length === 0 ? '✓' : '⚠️'} סגירות ואירועים בתאריכים שלכם
            {report.calendarFindings.length > 0 ? `: ${report.calendarFindings.length} נמצאו` : ': לא נמצא דבר'}
          </li>
          <li>{report.routeOk ? '✓ סדר הימים תקין' : `⚠️ ${report.routeNote}`}</li>
        </ul>

        {report.placesFlagged.length > 0 && (
          <p className="mt-3 rounded-xl bg-sunset/10 px-3 py-2 text-xs font-semibold text-sunset-deep">
            {report.placesFlagged.length} עצירות בטיול כבר לא קיימות בקטלוג שלנו - כדאי לבדוק אותן
            בתוכנית לפני היציאה.
          </p>
        )}

        {report.calendarFindings.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {report.calendarFindings.map((f) => (
              <li key={`${f.name}-${f.dayNumbers.join(',')}`} className="rounded-xl bg-cream p-2.5 text-xs">
                <span className="font-bold text-night">{f.name}</span>
                <span className="ms-1.5 rounded-full bg-night/[0.06] px-2 py-0.5 font-semibold text-night/55">
                  {f.impact}
                </span>
                <p className="mt-1 font-semibold text-night/60">{f.dates}</p>
                <p className="mt-0.5 text-night/55">{f.note}</p>
              </li>
            ))}
          </ul>
        )}

        {report.kosherNotes.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold text-night/55">
              פירוט הכשרות שנקראה מחדש ({report.kosherNotes.length})
            </summary>
            <ul className="mt-1.5 space-y-1.5">
              {report.kosherNotes.map((k) => (
                <li key={`${k.dayNumber}-${k.placeId}`} className="rounded-xl bg-cream p-2.5 text-xs">
                  <span className="font-bold text-night">{k.name}</span>
                  <span className="ms-1.5 text-night/45">יום {k.dayNumber}</span>
                  <p className="mt-1 text-night/60">{k.note}</p>
                </li>
              ))}
            </ul>
          </details>
        )}

        <button
          onClick={() => window.print()}
          className="mt-3 rounded-xl bg-night px-4 py-2 text-xs font-bold text-cream transition hover:bg-night/85 print:hidden"
        >
          שמירה / הדפסה של הדוח
        </button>
      </div>

      {/* גרסת ההדפסה: המסלול הנקי שנבדק, בלי כפתורים ובלי מצב הרגש */}
      <div className="hidden print:block">
        <h2 className="text-lg font-bold text-night">בדיקה לפני הנסיעה - {report.tripName}</h2>
        <p className="text-xs text-night/60">נבדק ב-{report.generatedAt.slice(0, 10)}</p>
        {report.itinerary.map((day) => (
          <div key={day.dayNumber} className="mt-3">
            <h3 className="text-sm font-bold text-night">
              יום {day.dayNumber} · {day.cityName}
              {day.date ? ` · ${day.date}` : ''}
            </h3>
            <ol className="mt-1 space-y-0.5 text-xs text-night/75">
              {day.stops.map((s, i) => (
                <li key={i}>
                  {i + 1}. {s.name}
                  {s.mustSee ? ' ★' : ''}
                  {s.unknown ? ' (לא בקטלוג יותר)' : ''}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
