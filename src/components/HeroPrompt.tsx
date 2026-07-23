'use client';

import { useRef, useState } from 'react';
import PromptChips from '@/components/PromptChips';

/**
 * קלט ההירו המשותף (דף הבית + נחיתת הצ׳אט): שדה גדול שמזמין הקלדה -
 * מסגרת עדינה וצל פנימי שמבדילים אותו מהרקע, placeholder מזמין וגלוי,
 * וכפתור שתמיד צבעוני: קורל מלא כשיש טקסט, קורל מעומעם (לעולם לא
 * אפור-מנוטרל) כשהשדה ריק. צ׳יפ ממלא את השדה וממקד - לא שולח.
 */
export default function HeroPrompt({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = text.trim().length > 0;

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasText) onSubmit(text.trim());
        }}
        className="rise-in-late mt-8 w-full max-w-2xl"
      >
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ספרו לי על החופשה שאתם מדמיינים… למשל: שבוע באיטליה עם ילדים"
            className="w-full rounded-2xl border border-night/15 bg-shell py-5 pe-28 ps-6 text-lg text-night shadow-[inset_0_2px_6px_rgba(36,27,77,0.05)] outline-none transition placeholder:text-night/45 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
          />
          <button
            type="submit"
            disabled={!hasText}
            className={`absolute end-3 top-1/2 -translate-y-1/2 rounded-xl px-6 py-2.5 font-bold text-cream transition ${
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
      />
    </>
  );
}
