'use client';

import { useEffect, useRef } from 'react';
import { requestLogin } from '@/components/LoginGate';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCheckout } from '@/lib/billing/useCheckout';
import { PREMIUM_PRICE_ILS, PRO_PRICE_ILS, ils, planAtLeast, type PaidPlan } from '@/lib/plans';

/**
 * Start a subscription from wherever the user already is.
 *
 * ## Why this exists away from `/premium`
 *
 * Buying used to happen on one page. Everywhere else - the paid tools on a
 * trip screen, the group panel, the account menu - handed out a link, which
 * means the path from wanting the feature to paying for it was: read a card,
 * follow a link, land on a page with three plans and a comparison table,
 * work out which one you were just reading about, press. Every step is a
 * place to leave.
 *
 * This is the same button `/premium` renders, in the place the intent
 * actually formed.
 *
 * ## The price is ON the button, and that is a rule rather than a style
 *
 * `PaidTools` already states it: not leading with a price is marketing, and
 * hiding it until somebody has committed is a dark pattern. Nobody reaches a
 * PayPal screen from here without having read what it costs per month, and
 * the number comes from the constant so it cannot drift from the pricing
 * page.
 *
 * ## Renders nothing for somebody who already has it
 *
 * Ordinal, not equality - a `pro` subscriber must never be shown a premium
 * upsell, which is the bug `planAtLeast` exists to prevent. The caller
 * usually gates on this too; doing it here as well means a new call site
 * cannot get it wrong.
 */
export default function SubscribeButton({
  plan: wanted = 'premium',
  onResume,
  className = '',
  subline = true,
}: {
  /** Which plan this button sells. */
  plan?: PaidPlan;
  /** Called before a post-login resume - see `useCheckout`. */
  onResume?: () => void;
  className?: string;
  /** The cancel/PayPal reassurance line. Off where the surface is very tight. */
  subline?: boolean;
}) {
  const auth = useAuth();
  const checkout = useCheckout({ onResume });
  const { plan, busy, notice, needsLogin, upgrade } = checkout;
  const noticeRef = useRef<HTMLDivElement>(null);

  /**
   * Bring the notice to the user rather than trusting them to find it. The
   * reported symptom on `/premium` was that tapping subscribe "does absolutely
   * nothing" - it did, below the fold. Here the notice is adjacent to the
   * button, but this surface can sit inside a collapsed section or a long trip
   * screen, so the same guarantee is worth keeping.
   *
   * focus() first with preventScroll, then scroll ourselves: letting focus do
   * the scrolling gives a jump, and it ignores the reduced-motion preference.
   */
  useEffect(() => {
    const el = noticeRef.current;
    if (!notice || !el) return;
    (el.querySelector<HTMLElement>('button') ?? el).focus({ preventScroll: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }, [notice]);

  if (planAtLeast(plan, wanted)) return null;

  const price = wanted === 'pro' ? PRO_PRICE_ILS : PREMIUM_PRICE_ILS;
  const label = wanted === 'pro' ? 'מנוי פרו' : 'מנוי פרימיום';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void upgrade(wanted)}
        disabled={busy !== null}
        className={`w-full rounded-xl px-5 py-3 text-sm font-bold text-cream transition disabled:opacity-60 ${
          wanted === 'pro' ? 'bg-night hover:bg-night/85' : 'bg-sunset hover:bg-sunset-deep'
        }`}
      >
        {busy === wanted ? 'רגע…' : `${label} · ${ils(price)} ₪ לחודש`}
      </button>

      {subline && (
        <p className="mt-1.5 text-center text-[11px] font-medium text-night/65">
          ביטול בלחיצה, בכל רגע · בלי התחייבות · התשלום דרך PayPal
        </p>
      )}

      {notice && (
        /*
          role="alert" so it is announced rather than merely appearing, and
          tabIndex so focus can land here when there is no button to take it.
        */
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
                onClick={() =>
                  requestLogin(needsLogin === 'pro' ? 'checkout:pro' : 'checkout:premium')
                }
                className="mt-2 rounded-xl bg-sunset px-4 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
              >
                התחברות והמשך לתשלום
              </button>
            ) : (
              /* Auth is not configured in this environment - there is no modal
                 to open, so say where the button is instead of drawing a dead
                 one. */
              <p className="mt-1 text-[11px] font-medium text-night/70">
                כפתור ההתחברות נמצא למעלה בניווט.
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
