'use client';

import { useEffect, useRef, useState } from 'react';
import PromptChips from '@/components/PromptChips';

/**
 * קלט ההירו המשותף (דף הבית + נחיתת הצ׳אט): שדה גדול שמזמין הקלדה -
 * מסגרת עדינה וצל פנימי שמבדילים אותו מהרקע, placeholder מזמין וגלוי,
 * וכפתור שתמיד צבעוני: קורל מלא כשיש טקסט, קורל מעומעם (לעולם לא
 * אפור-מנוטרל) כשהשדה ריק. צ׳יפ ממלא את השדה וממקד - לא שולח.
 */
export default function HeroPrompt({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  // placeholder מקוצר במובייל - הארוך עם הדוגמה נחתך ב-390px
  const [placeholder, setPlaceholder] = useState(
    'ספרו לי על החופשה שאתם מדמיינים… למשל: שבוע באיטליה עם ילדים',
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = text.trim().length > 0;

  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      setPlaceholder('ספרו לי על החופשה שאתם מדמיינים…');
    }
  }, []);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasText) onSubmit(text.trim());
        }}
        className="rise-in-late mt-8 w-full max-w-2xl"
      >
        {/* מתחת ל-sm: שדה מלא + כפתור מלא מתחתיו. מ-sm: כפתור בתוך השדה */}
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
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
      />
    </>
  );
}
