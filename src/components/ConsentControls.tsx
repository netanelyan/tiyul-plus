'use client';

import { useSyncExternalStore } from 'react';
import {
  clearConsent,
  gaId,
  setConsent,
  storedConsent,
  subscribeConsent,
  type ConsentChoice,
} from '@/lib/analytics';

/**
 * Shows the current analytics choice on `/cookies`, and lets it be changed.
 *
 * A consent that cannot be withdrawn is not a consent, and a banner that
 * appears once and is then unreachable forever is the usual way that happens.
 * This is the place it stays reachable.
 *
 * Renders `null` when no measurement id is configured - there is nothing to
 * consent to, and a control offering to change a setting that does not exist
 * would be its own small lie.
 */
export default function ConsentControls() {
  // Same reasoning as the banner: read through a subscription rather than
  // setting state inside an effect. It also means pressing a button here
  // updates the banner's view of the world for free.
  const choice = useSyncExternalStore(
    subscribeConsent,
    () => storedConsent(),
    () => 'loading' as const,
  );

  if (!gaId() || choice === 'loading') return null;

  const label =
    choice === 'granted'
      ? 'אישרתם מדידה עם עוגיות.'
      : choice === 'denied'
        ? 'סירבתם. לא נכתבת אף עוגייה, ואנחנו סופרים ביקור אנונימי בלבד.'
        : 'עוד לא בחרתם. ברירת המחדל היא סירוב - לא נכתבת אף עוגייה.';

  const apply = (next: ConsentChoice) => setConsent(next);

  return (
    <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
      <p className="text-sm font-semibold text-night">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {choice !== 'granted' && (
          <button
            type="button"
            onClick={() => apply('granted')}
            className="min-h-[44px] rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
          >
            לאשר מדידה
          </button>
        )}
        {choice !== 'denied' && (
          <button
            type="button"
            onClick={() => apply('denied')}
            className="min-h-[44px] rounded-xl bg-night/5 px-4 py-2 text-sm font-bold text-night ring-1 ring-night/10 transition hover:bg-night/10"
          >
            לבטל מדידה
          </button>
        )}
        {choice !== null && (
          <button
            type="button"
            onClick={() => clearConsent()}
            className="min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold text-night/65 underline decoration-night/20 underline-offset-4 transition hover:text-night"
          >
            לשכוח את הבחירה ולשאול שוב
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-night/65">
        ביטול מונע מאיתנו לכתוב עוגיות חדשות. עוגיות שכבר נכתבו נמחקות מהגדרות הדפדפן, או
        בכפתור המחיקה המלאה בהמשך העמוד.
      </p>
    </div>
  );
}
