'use client';

import { useEffect, useRef, useState } from 'react';
import PromptChips from '@/components/PromptChips';

const KOSHER_KEY = 'tiyul-plus:kosher-pref';

/**
 * The shared hero input (homepage + chat landing): a large field, a button that is
 * always coloured, an ideas dropdown - and beside it a quiet "kosher food" toggle.
 * Sensitive preferences are buttons, not questions (hence a verified-check icon, not
 * a plate): the toggle rides along with the submission and the agent reads it
 * silently. The toggle state is stored in localStorage (default: off).
 */
export default function HeroPrompt({
  onSubmit,
  extraChips,
}: {
  onSubmit: (text: string, kosher: boolean) => void;
  // Extra pills in the same row (for example the quick questionnaire, homepage only) -
  // they go into PromptChips' `trailing` so they all sit as uniform siblings.
  extraChips?: React.ReactNode;
}) {
  const [text, setText] = useState('');
  const [kosher, setKosher] = useState(false);
  // A shortened placeholder on mobile - the long one with the example is cut off at 390px
  const [placeholder, setPlaceholder] = useState(
    'ספרו לי על החופשה שאתם מדמיינים… למשל: שבוע באיטליה עם ילדים',
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = text.trim().length > 0;

  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      setPlaceholder('ספרו לי על החופשה שאתם מדמיינים…');
    }
    /*
      Autofocus only on devices with a physical keyboard.

      Netanel reported: "when opening the website on mobile, the textboxes are being
      opened automatically". The field carried a bare `autoFocus`, so every arrival at
      the homepage or the /chat landing from a phone popped the keyboard immediately -
      it covers about half the screen, pushes the heading and the chips out of view,
      and forces the traveller to dismiss it before they can even see where they
      landed. Instead of inviting them to type, it hid the explanation of what to type.

      Exactly the same fix as in AccountButton (the login modal) and CityCombobox -
      it was already solved there, and the hero simply was never updated. On desktop
      the focus stays, because there it saves a click and costs nothing.
    */
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
    try {
      setKosher(window.localStorage.getItem(KOSHER_KEY) === '1');
    } catch {
      /* storage blocked - stay with the default */
    }
  }, []);

  const toggleKosher = () => {
    setKosher((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(KOSHER_KEY, next ? '1' : '0');
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasText) onSubmit(text.trim(), kosher);
        }}
        className="rise-in-late mt-8 w-full max-w-2xl"
      >
        {/* Below sm: a full-width field with a full-width button under it. From sm: the button sits inside the field */}
        <div className="relative">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-night/15 bg-shell px-5 py-4 text-base text-night shadow-[inset_0_2px_6px_rgba(36,27,77,0.05)] outline-none transition placeholder:text-night/45 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15 sm:py-5 sm:pe-28 sm:ps-6 sm:text-lg"
          />
          <button
            type="submit"
            disabled={!hasText}
            className={`mt-2 w-full rounded-xl px-6 py-3 font-bold text-cream transition sm:absolute sm:end-3 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-y-1/2 sm:py-2.5 ${
              hasText ? 'bg-sunset hover:bg-sunset-deep' : 'bg-sunset/60'
            }`}
          >
            לתכנן
          </button>
        </div>
      </form>

      <PromptChips
        onPick={(picked) => {
          setText(picked);
          inputRef.current?.focus();
        }}
        trailing={
          <>
          <button
            type="button"
            onClick={toggleKosher}
            aria-pressed={kosher}
            title="ההעדפה עוברת לסוכן בשקט - הוא לא ישאל על זה בשיחה"
            className={`badge rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition ${
              kosher
                ? 'bg-sunset text-cream ring-sunset'
                : 'bg-shell text-night/70 ring-night/10 hover:bg-sunset/5 hover:text-night hover:ring-sunset/30'
            }`}
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
            אוכל כשר
          </button>
          {extraChips}
          </>
        }
      />
    </>
  );
}
