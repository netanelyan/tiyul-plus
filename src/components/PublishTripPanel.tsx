'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { requestLogin } from '@/components/LoginGate';
import PanelSection from '@/components/PanelSection';
import { MIN_STOPS_TO_INDEX } from '@/lib/trip/publicTrip';
import type { Trip } from '@/lib/trip/types';

/**
 * "Publish this trip on the site" - the owner's switch, and the consent that
 * goes with it.
 *
 * ## The consent sentence is the feature
 *
 * Everything else here is plumbing. The one thing that must be right is that the
 * owner knows, before they tap, **what becomes public and what does not**. The
 * sentence itself is the highlighted paragraph in the panel body below, in
 * Netanel's wording: it names the two places the trip will appear, lists the
 * three things that are stripped, and ends with the promise that it can be
 * removed at any moment.
 *
 * It is shown **above** the switch rather than beneath it, is not inside a
 * `details`, and is not abbreviated when the panel is re-opened. A consent a
 * reader has to expand is not consent.
 *
 * The claim it makes is enforced in `lib/trip/publicTrip.ts`, which builds the
 * public version out of catalog ids rather than by removing fields from the trip
 * - so the sentence stays true as `Trip` grows new fields.
 *
 * ## Why this is quiet about the indexing rule
 *
 * A trip under `MIN_STOPS_TO_INDEX` stops still publishes - the owner asked -
 * but the page carries `noindex`. The panel says so **after** publishing, as a
 * fact about the result, rather than as a hurdle before it: "you need eight
 * stops" in front of somebody who has six reads as the product refusing them,
 * when what is actually true is that the page works and search engines are not
 * being pointed at it yet.
 */
export default function PublishTripPanel({ trip, offline = false }: { trip: Trip; offline?: boolean }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<
    { status: 'unknown' } | { status: 'off' } | { status: 'on'; url: string; indexable: boolean }
  >({ status: 'unknown' });
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** The trip whose status is currently loaded - so switching trips refetches. */
  const loadedFor = useRef<string | null>(null);

  const userId = auth.user?.id ?? null;

  /*
    The current status is fetched when the panel is OPENED, not on mount. This
    block sits on the trip screen beside half a dozen others, and a request per
    trip screen for a feature most people never touch is a cost paid by everyone
    for the few. Opening it is the signal that somebody cares.
  */
  const load = useCallback(async () => {
    if (!userId || offline) return;
    try {
      const res = await fetch(`/api/trips/publish?tripId=${encodeURIComponent(trip.id)}`, {
        headers: { ...(await authHeader()) },
      });
      const data = (await res.json()) as {
        published?: { url: string; indexable: boolean } | null;
        configured?: boolean;
      };
      if (data.configured === false) {
        setNotice('פרסום טיולים עדיין לא פעיל כאן.');
        setState({ status: 'off' });
        return;
      }
      setState(data.published ? { status: 'on', ...data.published } : { status: 'off' });
    } catch {
      // A failed status read leaves the switch in its unknown state rather than
      // showing "not published", which would invite a second publish.
      setNotice('לא הצלחנו לבדוק אם הטיול מפורסם. נסו שוב בעוד רגע.');
    }
  }, [trip.id, userId, offline]);

  useEffect(() => {
    if (!open || !userId) return;
    if (loadedFor.current === trip.id) return;
    loadedFor.current = trip.id;
    void load();
  }, [open, userId, trip.id, load]);

  async function publish() {
    if (!userId) {
      requestLogin('publish-trip');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/trips/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        indexable?: boolean;
        error?: string;
      };
      if (!data.ok || !data.url) {
        setNotice(errorText(data.error));
        return;
      }
      setState({ status: 'on', url: data.url, indexable: Boolean(data.indexable) });
    } catch {
      setNotice('הפרסום לא עבר. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/trips/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setNotice(errorText(data.error));
        return;
      }
      setState({ status: 'off' });
      setCopied(false);
    } catch {
      setNotice('ההסרה לא עברה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = state.status === 'on' ? `${location.origin}${state.url}` : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setNotice('הדפדפן לא נתן להעתיק. אפשר לסמן את הכתובת ולהעתיק ידנית.');
    }
  }

  return (
    <PanelSection
      panelKey="publish"
      icon="🌍"
      title="לפרסם את הטיול באתר"
      badge={
        state.status === 'on' ? (
          <span className="rounded-full bg-lagoon/20 px-2 py-0.5 text-[11px] font-bold text-night">
            מפורסם
          </span>
        ) : undefined
      }
      className="print:hidden"
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      {/*
        The consent, first and unabbreviated. Netanel's wording, kept verbatim.
      */}
      <p className="rounded-xl bg-zest/15 px-3 py-2.5 text-sm font-semibold leading-relaxed text-night">
        הטיול יופיע באתר טיול+ ובגוגל, בלי שמות, תגובות או תאריכים. אפשר להסיר בכל רגע.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-night/70">
        מה מתפרסם: המסלול עצמו - הימים, הערים והעצירות מתוך הקטלוג שלנו, והחודש שבו נסעתם.{' '}
        <b className="text-night">מה לא: השם שנתתם לטיול, ההערות שכתבתם, התאריכים המדויקים,
        המלון והנעיצות שלכם, ההעדפות, וכל מה שחברים הצביעו או כתבו.</b>
      </p>

      {offline ? (
        <p className="mt-3 text-sm font-semibold text-night/70">
          פרסום דורש חיבור לאינטרנט.
        </p>
      ) : !userId ? (
        <div className="mt-3">
          <p className="text-sm text-night/70">
            כדי לפרסם צריך חשבון - זה מה שמאפשר לכם להסיר את הדף אחר כך מכל מכשיר.
          </p>
          <button
            onClick={() => requestLogin('publish-trip')}
            className="mt-2 rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep"
          >
            התחברות
          </button>
        </div>
      ) : state.status === 'on' ? (
        <div className="mt-3">
          <p className="text-sm font-bold text-night">הטיול מפורסם בכתובת:</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate rounded-lg bg-shell px-3 py-2 text-sm font-semibold text-sunset-deep underline ring-1 ring-night/10"
            >
              {fullUrl}
            </a>
            <button
              onClick={() => void copy()}
              className="rounded-xl bg-night/5 px-4 py-2 text-sm font-bold text-night transition hover:bg-night/10"
            >
              {copied ? '✓ הועתק' : 'העתקת קישור'}
            </button>
          </div>
          {!state.indexable && (
            /*
              Stated as a fact about the page, not as an error. The page works and
              anyone with the link can read it; it is simply not being offered to
              search engines yet.
            */
            <p className="mt-2 text-xs leading-relaxed text-night/70">
              הדף פעיל וכל מי שיש לו הקישור יכול לראות אותו, אבל הוא עדיין לא מוצע
              למנועי חיפוש - לשם צריך לפחות {MIN_STOPS_TO_INDEX} עצירות מהקטלוג. הוסיפו
              עוד כמה עצירות ופרסמו שוב.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void publish()}
              disabled={busy}
              className="rounded-xl bg-night/5 px-4 py-2 text-sm font-bold text-night transition hover:bg-night/10 disabled:opacity-60"
            >
              {busy ? 'רגע…' : 'עדכון הדף למסלול הנוכחי'}
            </button>
            <button
              onClick={() => void unpublish()}
              disabled={busy}
              className="rounded-xl bg-sunset/10 px-4 py-2 text-sm font-bold text-sunset-deep transition hover:bg-sunset/20 disabled:opacity-60"
            >
              הסרה מהאתר
            </button>
          </div>
          <p className="mt-2 text-[11px] font-medium text-night/65">
            העדכון שומר על אותה כתובת. אחרי הסרה הכתובת מפסיקה לעבוד ויוצאת ממפת האתר.
          </p>
        </div>
      ) : (
        <button
          onClick={() => void publish()}
          disabled={busy}
          className="mt-3 rounded-xl bg-sunset px-5 py-3 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-60"
        >
          {busy ? 'רגע…' : 'פרסמו את הטיול'}
        </button>
      )}

      {notice && (
        <p role="alert" className="mt-3 rounded-xl bg-zest/20 px-3 py-2 text-sm font-semibold text-night">
          {notice}
        </p>
      )}
    </PanelSection>
  );
}

/** Server error codes, as sentences. An unknown code must still say something true. */
function errorText(code: string | undefined): string {
  switch (code) {
    case 'auth-required':
      return 'צריך להתחבר כדי לפרסם.';
    case 'trip-not-found':
      return 'הטיול הזה עוד לא נשמר בחשבון שלכם. פתחו אותו פעם אחת כשאתם מחוברים ונסו שוב.';
    case 'no-city':
      return 'אין בטיול אף עצירה מהקטלוג שלנו, אז אין מה לפרסם עדיין.';
    case 'rate-limited':
      return 'פרסמתם הרבה טיולים בזמן קצר. נסו שוב מאוחר יותר.';
    case 'not-configured':
      return 'פרסום טיולים עדיין לא פעיל כאן.';
    default:
      return 'משהו לא עבד. נסו שוב בעוד רגע.';
  }
}
