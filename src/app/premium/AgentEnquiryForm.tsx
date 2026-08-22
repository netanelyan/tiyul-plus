'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The travel-agent enquiry form, opened from the agent card on the pricing
 * page. Five fields, three of them optional.
 *
 * **Short on purpose, and the shortness is the feature.** The people this is
 * aimed at are running a business; a form that asks for a company number and a
 * preferred contact window gets abandoned, and everything past "who are you,
 * how do we reach you, what do you need" is something we can ask in the reply.
 *
 * The contact field takes **an email or a phone number**, whichever they
 * prefer, and the server works out which it got - asking somebody to classify
 * their own phone number in a dropdown is a question a regex can answer.
 *
 * `text-base sm:text-sm` on every input is not a style choice: iOS Safari
 * zooms the whole page when a field under 16px is focused, and does not zoom
 * back. See the session log entry that found seven of these.
 */

const TRIPS_OPTIONS = ['עד 10', '10-30', '30-100', 'יותר מ-100'];

export default function AgentEnquiryForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [contact, setContact] = useState('');
  const [tripsPerYear, setTripsPerYear] = useState('');
  const [needs, setNeeds] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only where a keyboard is the input device - autofocus on a phone opens the
    // keyboard over the form the moment it appears. Same guard as HeroPrompt.
    if (window.matchMedia('(pointer: fine)').matches) firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, business, contact, tripsPerYear, needs }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (data?.ok) {
        setDone(true);
        return;
      }
      /*
        Every failure says something true and different. "not-configured" in
        particular must never render as success - the enquiry was not saved,
        and the honest answer is an address they can write to instead.
      */
      if (data?.error === 'bad-contact') setError('המייל או הטלפון לא נראים תקינים - אפשר לתקן ולשלוח שוב.');
      else if (data?.error === 'missing-fields') setError('חסרים שם ושם העסק.');
      else if (data?.error === 'rate-limited') setError('נשלחו כבר כמה פניות מהמכשיר הזה. נסו שוב מאוחר יותר.');
      else if (data?.error === 'not-configured')
        setError('הטופס לא זמין כרגע. אפשר לכתוב לנו ישירות ונחזור אליכם.');
      else setError('משהו השתבש בשליחה - אפשר לנסות שוב עוד רגע.');
    } catch {
      setError('אין חיבור כרגע - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-2xl bg-lagoon/15 p-5 text-center ring-1 ring-lagoon/30">
        <p className="text-base font-black text-night">קיבלנו. תודה 🙏</p>
        <p className="mt-1.5 text-sm leading-relaxed text-night/65">
          נחזור אליכם עם הצעה שמתאימה לכם - לפי מספר הטיולים ומה שכתבתם שאתם צריכים.
        </p>
        <button
          onClick={onClose}
          className="mt-3 rounded-xl bg-night px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-night/85"
        >
          סגירה
        </button>
      </div>
    );
  }

  const field = 'mt-1 w-full rounded-xl bg-cream px-3 py-2.5 text-base text-night ring-1 ring-night/15 outline-none transition focus:ring-2 focus:ring-sunset/40 sm:text-sm';

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl bg-cream/60 p-4 ring-1 ring-night/10">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ae-name" className="text-xs font-bold text-night/60">
            שם <span className="text-sunset-deep">*</span>
          </label>
          <input
            id="ae-name"
            ref={firstRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ae-business" className="text-xs font-bold text-night/60">
            שם העסק <span className="text-sunset-deep">*</span>
          </label>
          <input
            id="ae-business"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            required
            maxLength={120}
            autoComplete="organization"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ae-contact" className="text-xs font-bold text-night/60">
            מייל או טלפון <span className="text-sunset-deep">*</span>
          </label>
          <input
            id="ae-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            maxLength={120}
            dir="ltr"
            className={`${field} text-start`}
          />
        </div>
        <div>
          <label htmlFor="ae-trips" className="text-xs font-bold text-night/60">
            כמה טיולים בערך בשנה
          </label>
          <select
            id="ae-trips"
            value={tripsPerYear}
            onChange={(e) => setTripsPerYear(e.target.value)}
            className={field}
          >
            <option value="">לא בטוח / משתנה</option>
            {TRIPS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="ae-needs" className="mt-3 block text-xs font-bold text-night/60">
        מה אתם צריכים?
      </label>
      <textarea
        id="ae-needs"
        value={needs}
        onChange={(e) => setNeeds(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="למשל: קבוצות שומרות שבת וכשרות, כמה טיולים במקביל, מסמך מסודר לשלוח ללקוח"
        className={`${field} resize-y`}
      />

      {error && (
        <p className="mt-3 rounded-xl bg-sunset/15 px-3 py-2 text-sm font-semibold text-sunset-deep">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-night px-5 py-3 font-bold text-cream transition hover:bg-night/85 disabled:opacity-60"
        >
          {busy ? 'שולח…' : 'שליחת הפנייה'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-3 text-sm font-bold text-night/55 transition hover:text-night"
        >
          ביטול
        </button>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-night/45">
        הפרטים נשמרים אצלנו כדי לחזור אליכם בלבד. אין כאן חיוב, אין התחייבות, ולא נשלח לכם דיוור.
      </p>
    </form>
  );
}
