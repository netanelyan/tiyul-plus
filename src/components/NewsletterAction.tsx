'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * The landing page for the two links that arrive by email: confirming a
 * mailing-list subscription, and leaving it.
 *
 * ## Why there is a button here instead of acting on load
 *
 * The obvious version does the job the moment the page opens - one click from
 * the email and done. It is wrong for a reason that stays invisible until it
 * bites: **corporate mail scanners and link previewers fetch every URL in a
 * message before the recipient sees it.** An auto-acting page therefore means
 * some people are subscribed, and others silently unsubscribed, by software
 * they do not control and without ever having clicked.
 *
 * One button, no questions, no form, no login. For unsubscribing that is also
 * what the law asks for - simple and free - and Gmail's own Unsubscribe button
 * still works in a single click, because the email carries the RFC 8058 header
 * that posts straight to the API.
 *
 * The token never appears on screen. It is a bearer credential for one address,
 * and a screenshot of this page should not hand it to anybody.
 */
type Mode = 'confirm' | 'unsubscribe';
type State = 'ready' | 'working' | 'done' | 'error';

const COPY = {
  confirm: {
    lead: 'עוד לחיצה אחת ואתם רשומים לעדכונים.',
    cta: 'כן, לרשום אותי',
    working: 'רושמים…',
    done: 'נרשמתם. תודה.',
    doneBody:
      'נשלח מייל לעיתים רחוקות - יעדים חדשים, שינויים שמשפיעים על טיולים, ופיצ׳רים חדשים. בכל מייל יש קישור הסרה בלחיצה אחת.',
  },
  unsubscribe: {
    lead: 'להסיר את הכתובת הזו מרשימת התפוצה.',
    cta: 'להסיר אותי מהרשימה',
    working: 'מסירים…',
    done: 'הוסרתם מרשימת התפוצה.',
    doneBody:
      'לא נשלח אליכם יותר עדכונים. זה לא משפיע על מיילים שקשורים לחשבון או לרכישה - קבלה, אישור מנוי וכדומה - שהם חלק מהשירות עצמו.',
  },
} as const;

const ERRORS: Record<string, string> = {
  'bad-token': 'הקישור אינו תקין. ייתכן שהוא נחתך בדרך - כדאי להעתיק אותו במלואו מהמייל.',
  expired: 'הקישור פג תוקף. אפשר להירשם שוב בתחתית כל עמוד באתר ויישלח קישור חדש.',
  'not-configured': 'השירות אינו זמין כרגע. אפשר לפנות אלינו ונטפל בזה ידנית.',
  'store-failed': 'משהו השתבש אצלנו. אפשר לנסות שוב, או לפנות אלינו ונטפל בזה ידנית.',
  'rate-limited': 'יותר מדי ניסיונות. כדאי לנסות שוב בעוד כמה דקות.',
};

/*
  Read from `window` rather than `useSearchParams`: that hook opts the whole
  route out of static rendering, and this page has no reason to be dynamic.
  Same call as the `?place=` handling on the destination pages.

  Read at click time rather than into state on mount. That keeps the server and
  the first client render identical - so no hydration mismatch and no setState
  in an effect - and the value cannot change in between, because changing the
  query string means navigating away from this render.
*/
function tokenFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

export default function NewsletterAction({ mode }: { mode: Mode }) {
  const [state, setState] = useState<State>('ready');
  const [error, setError] = useState<string>('');
  const copy = COPY[mode];

  const run = async () => {
    if (state === 'working') return;
    const token = tokenFromUrl();
    if (!token) {
      setError(
        'הקישור חסר. כדאי לפתוח אותו ישירות מהמייל שקיבלתם, או לפנות אלינו ונטפל בזה ידנית.',
      );
      setState('error');
      return;
    }
    setState('working');
    try {
      const res = await fetch(`/api/newsletter/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const { error: code } = (await res.json().catch(() => ({}))) as { error?: string };
      setError(ERRORS[code ?? ''] ?? 'משהו השתבש. אפשר לפנות אלינו ונטפל בזה ידנית.');
      setState('error');
    } catch {
      setError('אין חיבור לאינטרנט כרגע.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
        <p className="text-lg font-bold text-night">{copy.done}</p>
        <p className="mt-2 leading-relaxed text-night/70">{copy.doneBody}</p>
        <Link href="/" className="mt-4 inline-block font-bold text-sunset-deep hover:underline">
          ← לדף הבית
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <p className="leading-relaxed text-night/75">{copy.lead}</p>
      <button
        onClick={() => void run()}
        disabled={state === 'working'}
        className="mt-4 min-h-11 rounded-xl bg-sunset px-6 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
      >
        {state === 'working' ? copy.working : copy.cta}
      </button>
      {state === 'error' && (
        <p role="alert" className="mt-3 font-semibold leading-relaxed text-sunset-deep">
          {error}{' '}
          <Link href="/contact" className="font-bold underline">
            צרו קשר
          </Link>
        </p>
      )}
    </div>
  );
}
