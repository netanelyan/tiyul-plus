'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeroPrompt from '@/components/HeroPrompt';

/**
 * ההירו של דף הבית - פורטל, לא סביבת עבודה: שליחה מנווטת ל-/chat עם
 * הטקסט (והעדפת הכשרות אם הודלקה) ב-query. הירו נקי וטיפוגרפי - קרם עם
 * שטיפת גרדיאנט עדינה בלבד; הצבע של הדף הוא רשת היעדים שמתחת.
 */
export default function HomeHero() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center px-2 pb-8 pt-10 sm:pb-10 sm:pt-14">
      {/* טקסטורת רקע full-bleed: נתיבי טיסה עדינים, דוהה לשקיפות מלאה לפני
          פס "יעדים פופולריים" - טכניקת ה-margin ל-breakout (לא left-1/2 +
          translate, שגורם לגלילה אופקית כשמקונן בתוך main הממורכז) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 -z-20 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] h-[460px] w-screen overflow-hidden opacity-[0.12] sm:h-[560px]"
        style={{
          backgroundImage: 'url(/patterns/flight-trails.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }}
      />
      {/* שטיפה חמה עדינה - צבעי הטוקנים sunset/zest בשקיפות נמוכה */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[340px] w-full max-w-4xl rounded-full bg-[radial-gradient(55%_55%_at_50%_35%,rgba(255,89,65,0.08),rgba(255,197,49,0.05)_55%,transparent_78%)]"
      />

      <span className="badge rise-in rounded-full bg-sunset/10 px-3.5 py-1 text-xs font-bold text-sunset-deep">
        🧭 סוכן הנסיעות החכם שלכם
      </span>
      <h1 className="display rise-in mt-3 text-center text-4xl text-night sm:text-6xl">
        לאן טסים הפעם?
      </h1>
      <p className="rise-in mt-4 max-w-xl text-center leading-relaxed text-night/60">
        לא עוד מדריך לגלול בו - מספרים לי מה מדמיינים, ואני בונה לכם טיול אמיתי,
        יום-אחרי-יום, על מפה. בעברית.
      </p>

      <HeroPrompt
        onSubmit={(text, kosher) =>
          router.push(`/chat?q=${encodeURIComponent(text)}${kosher ? '&kosher=1' : ''}`)
        }
        // גלולה אחות באותה שורה: שאלון מודרך (דף הבית בלבד - נחיתת /chat
        // נשארת מינימליסטית לפי CLAUDE.md). ההסבר עולה בטולטיפ, לא בטקסט.
        extraChips={
          <Link
            href="/start"
            title="מעדיפים לא לכתוב? עונים על כמה שאלות והטיול נבנה לבד"
            className="badge rounded-full bg-shell px-4 py-2.5 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-sunset/5 hover:text-night hover:ring-sunset/30"
          >
            <span aria-hidden>📋</span>
            שאלון מהיר
          </Link>
        }
      />
    </div>
  );
}
