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

/* TODO(Netanel): this sentence is yours. A placeholder only. */
const LINE = '[למילוי] שורה אחת שמסבירה למה כדאי להשאיר כתובת.';

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
            : 'ההרשמה לא זמינה כרגע.',
      );
    } catch {
      setState('error');
      setMessage('אין חיבור כרגע.');
    }
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <p className="text-xs font-medium leading-relaxed text-cream/45">{LINE}</p>
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
          className="min-w-0 flex-1 rounded-xl bg-cream/10 px-3 py-2 text-base text-cream outline-none ring-1 ring-cream/15 transition placeholder:text-cream/35 focus:ring-2 focus:ring-sunset sm:text-sm"
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
        <p role="status" className="mt-1.5 text-xs font-semibold text-cream/70">
          נרשמתם. תודה.
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
