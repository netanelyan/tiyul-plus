'use client';

import { useRouter } from 'next/navigation';
import HeroPrompt from '@/components/HeroPrompt';

/**
 * ההירו של דף הבית - פורטל, לא סביבת עבודה: שליחה מנווטת ל-/chat עם
 * הטקסט ב-query. מאחורי הכותרת תמונת יעד אמיתית בשקיפות נמוכה שנמסכת
 * לקרם - אווירה, לא בילבורד. נראית גם במובייל מעל הקפל.
 */

// תמונת ההירו הישנה של האתר - Unsplash, נבדקה ועובדת (מפה, מצלמה, מזוודה)
const HERO_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=70';

export default function HomeHero() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center px-2 pb-8 pt-10 sm:pb-10 sm:pt-14">
      {/* תמונת אווירה מאחורי הכותרת: cover+center (חיתוך, לא מתיחה), גובה
          clamp רספונסיבי, ו-mask שממוסס את התחתית לקרם - בלי קו חיתוך. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-[clamp(260px,45vh,400px)] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
      >
        <div
          className="photo-bg h-full w-full opacity-[0.22]"
          style={{ backgroundImage: `url(${HERO_PHOTO})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream/30 via-cream/50 to-cream/80" />
      </div>

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
