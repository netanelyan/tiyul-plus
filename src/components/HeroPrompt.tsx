'use client';

import { useEffect, useRef, useState } from 'react';
import PromptChips from '@/components/PromptChips';

const KOSHER_KEY = 'tiyul-plus:kosher-pref';

/**
 * קלט ההירו המשותף (דף הבית + נחיתת הצ׳אט): שדה גדול, כפתור שתמיד
 * צבעוני, dropdown רעיונות - ולידו טוגל שקט "🍽️ אוכל כשר". העדפות
 * רגישות הן כפתורים, לא שאלות (אייקון וי-מאומת, לא צלחת): הטוגל עובר עם השליחה והסוכן קורא אותו
 * בשקט. מצב הטוגל נשמר ב-localStorage (ברירת מחדל: כבוי).
 */
export default function HeroPrompt({
  onSubmit,
  extraChips,
}: {
  onSubmit: (text: string, kosher: boolean) => void;
  // גלולות נוספות באותה שורה (למשל "שאלון מהיר" בדף הבית בלבד) - נכנסות
  // ל-trailing של PromptChips כדי שכולן יישבו כאחיות אחידות.
  extraChips?: React.ReactNode;
}) {
  const [text, setText] = useState('');
  const [kosher, setKosher] = useState(false);
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
    try {
      setKosher(window.localStorage.getItem(KOSHER_KEY) === '1');
    } catch {
      /* אחסון חסום - נשארים בברירת המחדל */
    }
  }, []);

  const toggleKosher = () => {
    setKosher((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(KOSHER_KEY, next ? '1' : '0');
      } catch {
        /* אחסון חסום */
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
