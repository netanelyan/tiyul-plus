'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeroPrompt from '@/components/HeroPrompt';

/**
 * The homepage hero - a portal, not a workspace: submitting navigates to /chat with the
 * text (and the kashrut preference if it was turned on) in the query. A clean, typographic
 * hero - cream with only a subtle gradient wash; the page's colour is the destination grid
 * below it.
 */
export default function HomeHero() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center px-2 pb-8 pt-10 sm:pb-10 sm:pt-14">
      {/* A full-bleed background texture: subtle flight paths, fading to full transparency
          before the popular-destinations band - the margin technique for the breakout (not
          left-1/2 + translate, which causes horizontal scrolling when nested inside the
          centred main) */}
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
      {/* A subtle warm wash - the sunset/zest tokens at low opacity */}
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
        // A sibling pill in the same row: the guided questionnaire (homepage only - the
        // /chat landing stays minimal per CLAUDE.md). The explanation goes in a tooltip,
        // not in the text.
        extraChips={
          <Link
            href="/start"
            title="מילוי שאלון במקום התכתבות עם ה-AI - עונים על כמה שאלות והטיול נבנה לבד"
            className="badge whitespace-nowrap rounded-full bg-shell px-4 py-2.5 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-sunset/5 hover:text-night hover:ring-sunset/30"
          >
            <span aria-hidden>📋</span>
            שאלון במקום צ׳אט
          </Link>
        }
      />
    </div>
  );
}
