'use client';

import { useRouter } from 'next/navigation';
import HeroPrompt from '@/components/HeroPrompt';

/**
 * ההירו של דף הבית - פורטל, לא סביבת עבודה: שליחה מנווטת ל-/chat עם
 * הטקסט ב-query. מאחורי ההירו שטיפת גרדיאנט חמה עדינה (קורל→זסט בשקיפות
 * נמוכה) - נגיעה אחת של חום, לא פוסטר.
 */
export default function HomeHero() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center px-2 py-12 sm:py-16">
      {/* שטיפת רקע חמה - צבעי הטוקנים sunset/zest בשקיפות נמוכה */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[380px] w-full max-w-4xl rounded-full bg-[radial-gradient(55%_55%_at_50%_38%,rgba(255,89,65,0.09),rgba(255,197,49,0.05)_55%,transparent_78%)]"
      />

      <h1 className="display rise-in text-center text-4xl text-night sm:text-6xl">
        לאן טסים הפעם?
      </h1>
      <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
        מספרים לי מה מדמיינים - ואני בונה טיול אמיתי, יום-אחרי-יום, על מפה. בעברית.
      </p>

      <HeroPrompt onSubmit={(text) => router.push(`/chat?q=${encodeURIComponent(text)}`)} />
    </div>
  );
}
