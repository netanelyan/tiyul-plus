'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PromptChips from '@/components/PromptChips';

/**
 * ההירו של דף הבית - פורטל, לא סביבת עבודה: שליחה מנווטת ל-/chat עם
 * הטקסט ב-query. השיחה עצמה חיה רק שם. לחיצה על צ׳יפ ממלאת את הקלט
 * ומתמקדת בו - המשתמש עורך ואז שולח בעצמו.
 */
export default function HomeHero() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const go = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-330px)] flex-col items-center justify-center py-12">
      <h1 className="display rise-in text-center text-4xl text-night sm:text-6xl">
        לאן טסים הפעם?
      </h1>
      <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
        מספרים לי מה מדמיינים - ואני בונה טיול אמיתי, יום-אחרי-יום, על מפה. בעברית.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(input);
        }}
        className="rise-in-late mt-9 w-full max-w-2xl"
      >
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ספרו לי על החופשה שאתם מדמיינים…"
            className="w-full rounded-2xl bg-shell py-5 pe-28 ps-6 text-lg text-night shadow-[var(--shadow-pop)] outline-none ring-1 ring-night/10 transition placeholder:text-night/35 focus:ring-2 focus:ring-sunset"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-xl bg-sunset px-6 py-2.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
          >
            לתכנן
          </button>
        </div>
      </form>

      <PromptChips
        onPick={(text) => {
          setInput(text);
          inputRef.current?.focus();
        }}
      />
    </div>
  );
}
