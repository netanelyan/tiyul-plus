'use client';

import { useState } from 'react';

/**
 * Newsletter signup, in the footer. One line and a field - no popup, no promise, no
 * "sign up and receive".
 *
 * Addresses are stored in `newsletter_signups` in Supabase via `/api/newsletter` (see
 * `supabase-newsletter.sql`). The form does not touch the database directly.
 *
 * **Failure is stated, not hidden.** Without the service role key configured the route
 * returns 503, and the form says signup is unavailable - instead of drawing a green tick
 * and throwing the address away. A form that lies about success is the one thing here that
 * would be worse than not existing.
 */

/**
 * The line above the field, and it is doing legal work as well as marketing
 * work.
 *
 * It was a bracketed to-be-filled placeholder. It never reached anybody, but
 * only by accident: nothing rendered this component at all, so the footer's
 * "newsletter signup" comment reserved a place for a form that did not exist.
 * The other half is that section 30A of the Communications Law wants
 * consent given **after** being told what will be sent and that it can be
 * refused at any time. A bare field and a "sign up" button is not that.
 *
 * So the sentence says what arrives, roughly how often, and that leaving takes
 * one click - and the button underneath says "send me a confirmation", because
 * that is what pressing it actually does.
 */
const LINE =
  'עדכונים לעיתים רחוקות: יעדים חדשים, שינויים שמשפיעים על טיולים, ופיצ׳רים חדשים. בלי ספאם, והסרה בלחיצה אחת מכל מייל.';

type State = 'idle' | 'sending' | 'done' | 'error';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending' || !email.trim()) return;
    setState('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      if (res.ok) {
        setState('done');
        setEmail('');
        return;
      }
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      setState('error');
      setMessage(
        error === 'bad-email'
          ? 'הכתובת לא נראית תקינה.'
          : error === 'rate-limited'
            ? 'נסו שוב בעוד קצת.'
            : error === 'send-failed'
              ? 'לא הצלחנו לשלוח את מייל האישור. אפשר לנסות שוב.'
              : 'ההרשמה לא זמינה כרגע.',
      );
    } catch {
      setState('error');
      setMessage('אין חיבור כרגע.');
    }
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <p className="text-xs font-medium leading-relaxed text-cream/50">{LINE}</p>
      <div className="mt-2 flex gap-1.5">
        <label htmlFor="newsletter-email" className="sr-only">
          כתובת אימייל
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== 'idle') setState('idle');
          }}
          placeholder="האימייל שלכם"
          // 16px on mobile, otherwise iOS shifts the whole page on focus (entry n)
          className="min-w-0 flex-1 rounded-xl bg-cream/10 px-3 py-2 text-base text-cream outline-none ring-1 ring-cream/15 transition placeholder:text-cream/50 focus:ring-2 focus:ring-sunset sm:text-sm"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-xl bg-cream/15 px-3 py-2 text-sm font-bold text-cream transition enabled:hover:bg-cream/25 disabled:opacity-50"
        >
          {state === 'sending' ? '…' : 'הרשמה'}
        </button>
      </div>
      {state === 'done' && (
        /*
          Not "you are signed up" - **they are not, yet.** Pressing the button
          sends a confirmation link, and only the click on that link puts the
          address on the list. Saying "signed up" here would be the form lying
          about what it did, and would also leave somebody waiting for emails
          that will never arrive because they ignored the confirmation.
        */
        <p role="status" className="mt-1.5 text-xs font-semibold text-cream/70">
          שלחנו לכם מייל לאישור. לחיצה על הקישור שבו משלימה את ההרשמה.
        </p>
      )}
      {state === 'error' && (
        <p role="status" className="mt-1.5 text-xs font-semibold text-sunset">
          {message}
        </p>
      )}
    </form>
  );
}
