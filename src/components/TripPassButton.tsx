'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { requestLogin, takePendingLogin } from '@/components/LoginGate';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { track as gaTrack } from '@/lib/analytics';
import { planAtLeast } from '@/lib/plans';
import { TRIP_PASS_DAYS, tripPassPriceLabel } from '@/lib/tripPass';
import { formatHebrewDate } from '@/lib/trip/dates';

/** The pending-login key. One per intent, so two surfaces cannot claim each other's. */
const LOGIN_INTENT = 'pass';

/**
 * Buy a trip pass from the trip it is for.
 *
 * ## Why this is not `SubscribeButton`
 *
 * `useCheckout` is built for subscriptions: it posts to `/api/billing/checkout`,
 * it is keyed on `PaidPlan`, and half its value is handling the eight outcomes of
 * that route - including `switch-requires-support`, which exists so a subscriber
 * is never charged twice. A pass is a one-off order against a specific trip and
 * has none of those states, so reusing that hook would have meant widening it to
 * carry a product it shares no branches with.
 *
 * What IS shared is the part worth not duplicating: the login round trip through
 * `requestLogin`/`takePendingLogin`, and the rule that a notice renders next to
 * the button that caused it (the reported bug on `/premium` was that tapping
 * subscribe "does absolutely nothing" - it did, below the fold).
 *
 * ## Nothing here grants anything
 *
 * This asks for an approval URL and navigates. The pass is written onto the
 * profile by the verified webhook and nowhere else - the same separation the
 * pre-departure check uses, and the reason a caller cannot talk their way into a
 * plan.
 *
 * ## Coming back from PayPal
 *
 * `?passReturn=1&purchaseId=...` triggers a capture through `/api/checks/capture`,
 * which is deliberately reused: that route is product-agnostic (it finds the
 * purchase by id, verifies ownership, captures, and leaves the row pending for the
 * webhook), so there is one proven capture path rather than two. Capture is not
 * success - the webhook is - so it then polls the profile until the plan appears,
 * with a bounded number of attempts and an honest message if it does not.
 */
export default function TripPassButton({
  tripId,
  onResume,
}: {
  tripId: string;
  /** Called before a post-login resume, so a collapsed container can reopen. */
  onResume?: () => void;
}) {
  const auth = useAuth();
  const plan = auth.profile?.plan ?? 'free';
  const planUntil = auth.profile?.planUntil ?? null;

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  const onResumeRef = useRef(onResume);
  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  /**
   * The current plan, readable from inside a long-lived async loop.
   *
   * The polling effect below cannot read `auth.profile`: it closes over the
   * context value from the render that created it, so `reloadProfile()` would
   * update state that the closure never sees. Synced in an effect rather than
   * during render, because writing a ref while rendering is the react-hooks
   * refs error.
   */
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  /* Bring the notice to the user - this surface can sit inside a collapsed section. */
  useEffect(() => {
    const el = noticeRef.current;
    if (!notice || !el) return;
    (el.querySelector<HTMLElement>('button') ?? el).focus({ preventScroll: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }, [notice]);

  const buy = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    setNeedsLogin(false);
    // On the press, never on the redirect: the gap between the two is the
    // auth-required drop-off, which is the most useful number this funnel has.
    gaTrack('checkout_started', { product: 'trip_pass' });
    try {
      const res = await fetch('/api/pass/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ tripId }),
      });
      const data = (await res.json()) as { url: string | null; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === 'auth-required') {
        setNotice('הכרטיס נשמר בחשבון, אז קודם מתחברים. זה לוקח חצי דקה, בלי סיסמה.');
        setNeedsLogin(true);
      } else if (data.error === 'already-covered') {
        setNotice('יש לכם כבר מנוי פעיל שכולל את הכול, אין צורך בכרטיס.');
      } else if (data.error === 'trip-not-found') {
        setNotice('לא מצאנו את הטיול הזה בחשבון שלכם. נסו לרענן את הדף.');
      } else if (data.error === 'sandbox-blocked') {
        setNotice('הרכישה כבויה כרגע באתר החי (מצב בדיקה). ממש בקרוב.');
      } else if (data.error === 'not-configured') {
        setNotice('הרכישה נפתחת ממש בקרוב. התשלומים בשלבי חיבור אחרונים.');
      } else if (data.error === 'rate-limited') {
        setNotice('רגע אחד, נסו שוב בעוד דקה.');
      } else {
        setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
      }
    } catch {
      setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }, [tripId]);

  /* Resume after a login round trip. Same shape as useCheckout's, and a ref for
     the same reason: StrictMode runs the effect twice and takePendingLogin is a
     one-shot read, so consuming into a local would lose it on the second run. */
  const resumeRef = useRef(false);
  useEffect(() => {
    if (!auth.user) return;
    if (!resumeRef.current) resumeRef.current = takePendingLogin(LOGIN_INTENT);
    if (!resumeRef.current) return;
    onResumeRef.current?.();
    const t = setTimeout(() => {
      resumeRef.current = false;
      void buy();
    }, 0);
    return () => clearTimeout(t);
  }, [auth.user, buy]);

  /* Back from PayPal: capture, then wait for the webhook to write the plan. */
  const returnedRef = useRef(false);
  useEffect(() => {
    if (!auth.ready || returnedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const returned = params.get('passReturn') === '1';
    const cancelled = params.get('passCancel') === '1';
    const purchaseId = params.get('purchaseId');
    if (!returned && !cancelled) return;
    returnedRef.current = true;

    /* Clean the URL first, so a refresh does not re-run the capture. */
    for (const k of ['passReturn', 'passCancel', 'purchaseId']) params.delete(k);
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));

    /*
      Both state writes below are scheduled a tick out rather than run in the
      effect body. That is the cascading-render pattern the react-hooks rule
      rejects, and `useCheckout` schedules its resume for the same reason. Nothing
      is lost: one is a message and the other precedes a network call.
    */
    if (cancelled) {
      const t = setTimeout(() => setNotice('התשלום בוטל ולא חויבתם. הכרטיס עוד כאן אם תרצו.'), 0);
      return () => clearTimeout(t);
    }
    if (!returned || !purchaseId || !auth.user) return;

    onResumeRef.current?.();
    const t0 = setTimeout(() => setVerifying(true), 0);
    void (async () => {
      try {
        await fetch('/api/checks/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ purchaseId }),
        });
      } catch {
        /* Transient - the webhook may already be on its way, so still poll. */
      }
      /*
        Poll the profile, because the webhook is what grants and it is asynchronous.
        Bounded at ~20s: a promise that resolves eventually is not a UI, and an
        honest "it is on its way, refresh in a moment" beats a spinner that never
        stops. The purchase is recorded either way - nothing is lost by giving up
        on the polling.
      */
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await auth.reloadProfile();
        /*
          Read through the ref, NOT through `auth.profile`.

          `auth` is the context value captured when this effect was created, so
          `auth.profile` here is frozen at that render forever. `reloadProfile()`
          updates React state, which produces a NEW context object on the next
          render - one this closure will never see. Reading `auth.profile` would
          therefore compare against the pre-purchase plan on every iteration and
          the poll could only ever time out, on a payment that had in fact
          succeeded. The ref is written by a sync effect, so each 2s tick sees the
          value the re-render just produced.
        */
        if (planAtLeast(planRef.current, 'premium')) {
          gaTrack('purchase_completed', { product: 'trip_pass' });
          setVerifying(false);
          return;
        }
      }
      setVerifying(false);
      setNotice('התשלום התקבל. ההרשאה נכנסת לתוקף תוך רגע, רעננו את הדף.');
    })();
    return () => clearTimeout(t0);
    // The poll reads planRef rather than auth.profile (see above), so profile is not a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.user]);

  /* ---------- An active pass: say when it ends, and sell nothing ---------- */
  if (planAtLeast(plan, 'premium')) {
    if (!planUntil) return null; // an unlimited subscription - PaidTools already says so
    const until = formatHebrewDate(planUntil.slice(0, 10), { year: true });
    return (
      <div className="rounded-2xl bg-shell px-3.5 py-3 ring-1 ring-night/10 print:hidden">
        <p className="text-center text-sm font-bold text-night">
          ✓ כרטיס הטיול פעיל{until ? ` עד ${until}` : ''}
        </p>
        <p className="mt-1 text-center text-[11px] font-medium text-night/70">
          הכול פתוח עד אז, ואין מה לבטל. הכרטיס פשוט נגמר.
        </p>
      </div>
    );
  }

  if (verifying) {
    return (
      <div
        role="status"
        className="rounded-2xl bg-shell px-3.5 py-3 text-center ring-1 ring-night/10 print:hidden"
      >
        <p className="text-sm font-bold text-night">מאמתים את התשלום…</p>
        <p className="mt-1 text-[11px] font-medium text-night/70">רגע אחד, לא לסגור את הדף.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-shell px-3.5 py-3 ring-1 ring-night/10 print:hidden">
      <button
        type="button"
        onClick={() => void buy()}
        disabled={busy}
        className="w-full rounded-xl bg-sunset px-5 py-3 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-60"
      >
        {busy ? 'רגע…' : `כרטיס לטיול הזה · ${tripPassPriceLabel()}`}
      </button>
      {/*
        The price is on the button and the terms are under it, from the constants.
        "One-off" is the load-bearing word: this replaced a monthly subscription, so
        somebody who remembers the old pricing has every reason to expect a
        recurring charge, and the honest difference is the reason to buy.
      */}
      <p className="mt-1.5 text-center text-[11px] font-medium text-night/70">
        תשלום חד-פעמי · {TRIP_PASS_DAYS} יום · בלי מנוי ובלי חיוב חוזר ·{' '}
        <Link href="/premium" className="font-bold text-sunset-deep underline hover:text-sunset">
          מה כלול?
        </Link>
      </p>

      {notice && (
        <div
          ref={noticeRef}
          role="alert"
          tabIndex={-1}
          className="mt-2.5 rounded-xl bg-zest/15 px-3.5 py-2.5 text-center text-xs font-semibold text-night outline-none"
        >
          <p>{notice}</p>
          {needsLogin &&
            (auth.enabled ? (
              <button
                type="button"
                onClick={() => requestLogin(LOGIN_INTENT)}
                className="mt-2 rounded-xl bg-sunset px-4 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
              >
                התחברות והמשך לתשלום
              </button>
            ) : (
              <p className="mt-1 text-[11px] font-medium text-night/70">
                כפתור ההתחברות נמצא למעלה בניווט.
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
