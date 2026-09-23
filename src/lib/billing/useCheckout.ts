'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { takePendingLogin } from '@/components/LoginGate';
import { authHeader } from '@/lib/auth/client';
import { track as gaTrack } from '@/lib/analytics';
import type { PaidPlan, Plan } from '@/lib/plans';

/**
 * Starting a subscription, from anywhere on the site.
 *
 * ## Why this is a hook and not a copy
 *
 * This logic lived inside `PremiumClient`, which meant `/premium` was the only
 * screen that could actually take money. Every other surface - the paid tools
 * on the trip screen, the group panel, the account menu - could only hand out
 * a link and hope. That is the longest possible path from "I want this" to
 * "I paid": read a card, follow a link, re-orient among three plans, find the
 * right one, press.
 *
 * The moment somebody opens the paid section of their own trip is the moment
 * their intent is highest, and it was the moment we sent them away.
 *
 * ## What must not be duplicated, and is the whole reason this is shared
 *
 * Four things here are easy to get subtly wrong, and a second hand-written
 * copy would get at least one of them wrong:
 *
 * 1. **The eight outcomes of `/api/billing/checkout`.** Only one is a
 *    redirect. `auth-required` is a door, `switch-requires-support` is a
 *    refusal that exists so nobody is charged twice, and the rest are states a
 *    user is owed an honest sentence about. A second implementation would
 *    almost certainly collapse them into "something went wrong".
 * 2. **The login round trip.** The magic-link path reloads the document, so
 *    the intent has to survive in storage and be replayed on the way back.
 * 3. **`checkout_started` fires on the press**, never on the redirect. The gap
 *    between those two numbers is the auth-required drop-off, which is the
 *    single most useful thing this funnel can tell us.
 * 4. **Nothing here grants a plan.** It asks PayPal for an approval URL and
 *    navigates. The plan is written by the verified webhook and nowhere else.
 *
 * ## Notices are values, not rendered here
 *
 * The hook returns `notice` and `needsLogin` and lets the caller place them.
 * A notice rendered far from the button that caused it is the reported bug
 * this project already fixed once on `/premium` ("tapping subscribe does
 * absolutely nothing" - it did, below the fold).
 */
export interface Checkout {
  /** The plan the signed-in user currently holds; 'free' when signed out. */
  plan: Plan;
  /** The plan whose request is in flight, or null. */
  busy: PaidPlan | null;
  /** A sentence to show the user, or null. */
  notice: string | null;
  /**
   * Set only for the one notice the user can act on: signing in. Everything
   * else the checkout can say is information, and offering a button for
   * information is noise.
   */
  needsLogin: PaidPlan | null;
  /** Start checkout. Navigates away on success. */
  upgrade: (wanted: PaidPlan) => Promise<void>;
  /** Drop the current notice - for a caller that wants a dismissable one. */
  clearNotice: () => void;
}

export interface CheckoutOptions {
  /**
   * Run just before a post-login resume fires. The caller uses it to make
   * itself visible again: on the trip screen the subscribe button lives inside
   * a collapsed section, and resuming into something nobody can see means any
   * notice that follows is invisible too.
   */
  onResume?: () => void;
  /**
   * False for a caller that must not consume the pending-login intent.
   *
   * `takePendingLogin` is a one-shot read, so if two instances of this hook
   * are mounted on one page they race and only one resumes. Any page in that
   * position should leave exactly one instance able to claim it. Today no page
   * mounts two, and this flag is what keeps that a decision rather than luck.
   */
  resumeAfterLogin?: boolean;
}

export function useCheckout(options: CheckoutOptions = {}): Checkout {
  const { onResume, resumeAfterLogin = true } = options;
  const auth = useAuth();
  const plan: Plan = auth.profile?.plan ?? 'free';
  const [busy, setBusy] = useState<PaidPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState<PaidPlan | null>(null);
  /** The plan to resume after a login - see the effect below for why it is a ref. */
  const resumeRef = useRef<PaidPlan | null>(null);
  /**
   * Kept in a ref so the resume effect does not depend on the caller's
   * identity - a caller passing an inline arrow would otherwise re-run the
   * resume on every render.
   *
   * Synced in an effect and not during render: writing `ref.current` while
   * rendering is the react-hooks/refs error, and it is declared BEFORE the
   * resume effect on purpose, because effects run in declaration order and
   * the resume must never read a ref that has not been filled yet.
   */
  const onResumeRef = useRef(onResume);
  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  async function upgrade(wanted: PaidPlan) {
    if (busy) return;
    setBusy(wanted);
    setNotice(null);
    setNeedsLogin(null);
    // Recorded on the press, not on the redirect: the gap between the two is
    // where the "auth-required" drop-off lives, and that is exactly the number
    // worth having.
    gaTrack('checkout_started', { product: wanted });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ plan: wanted }),
      });
      const data = (await res.json()) as { url: string | null; error?: string };
      if (data.url) {
        // assign() rather than writing location.href - same navigation, and it is
        // a method call rather than a mutation of a value defined outside the
        // component, which the react-hooks immutability rule (correctly) refuses.
        window.location.assign(data.url);
        return;
      }
      if (data.error === 'auth-required') {
        setNotice('המנוי נשמר בחשבון, אז קודם מתחברים - זה לוקח חצי דקה, בלי סיסמה.');
        setNeedsLogin(wanted);
      } else if (data.error === 'already-premium') setNotice('אתם כבר בתוכנית הזאת 🎉');
      else if (data.error === 'switch-requires-support')
        // Not a failure and not a fob-off: creating a second PayPal subscription
        // would charge them twice, so the switch is done by hand until the
        // revise flow exists. Saying that is better than taking the money.
        setNotice(
          'מעבר בין מנוי קיים למנוי אחר אנחנו עושים ידנית, כדי שלא תחויבו פעמיים בטעות. כתבו לנו בדף יצירת הקשר ונעביר אתכם - בלי חיוב כפול ובלי לאבד ימים ששילמתם עליהם.',
        );
      else if (data.error === 'sandbox-blocked')
        setNotice('ההרשמה כבויה כרגע באתר החי (מצב בדיקה) - ממש בקרוב.');
      else if (data.error === 'not-configured')
        setNotice('ההרשמה נפתחת ממש בקרוב - התשלומים בשלבי חיבור אחרונים.');
      else setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } catch {
      setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } finally {
      setBusy(null);
    }
  }

  /**
   * Back from the login modal, so finish what they were doing. The intent is
   * read from storage rather than state because the magic-link path reloads
   * the document, and takePendingLogin clears it, so a resume cannot run twice.
   */
  useEffect(() => {
    if (!auth.user || !resumeAfterLogin) return;
    /*
      Consumed into a ref before being acted on, because in StrictMode an
      effect runs, cleans up and runs again - and takePendingLogin is a
      one-shot read. Consuming straight into a local would leave the second
      run with nothing and the resume would silently never happen in dev.
    */
    if (!resumeRef.current) {
      resumeRef.current = takePendingLogin('checkout:premium')
        ? 'premium'
        : takePendingLogin('checkout:pro')
          ? 'pro'
          : null;
    }
    const wanted = resumeRef.current;
    if (!wanted) return;
    onResumeRef.current?.();
    /*
      A tick later on purpose: upgrade() sets state immediately, and doing that
      synchronously in an effect body is the cascading-render pattern the
      react-hooks rule rejects. It is a network call either way, so nothing is
      lost by scheduling it - and the cleanup makes it cancellable.
    */
    const t = setTimeout(() => {
      resumeRef.current = null;
      void upgrade(wanted);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, resumeAfterLogin]);

  return {
    plan,
    busy,
    notice,
    needsLogin,
    upgrade,
    clearNotice: () => setNotice(null),
  };
}
