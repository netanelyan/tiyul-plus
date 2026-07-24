import { quickServices } from '@/lib/services';

/**
 * גישה מהירה לשירותי נסיעה - 4 כרטיסים (שורה בדסקטופ, טור במובייל)
 * בשפת ה-card-pop/סטיקר של האתר. כל כרטיס: אייקון, כותרת, משפט קצר
 * וכפתור. מקור הקישור מגיע מ-`src/lib/services.ts` (config), כך שאפשר
 * להדביק קישור שותפים אמיתי מאוחר יותר בלי לגעת כאן.
 *
 * כנות: כרגע אין אפיליאייט - הכפתורים מפנים לאתר הספק הציבורי (בלי
 * פרמטרי מעקב), או מציגים "בקרוב" כשעדיין לא נבחר ספק.
 */
export default function QuickServices() {
  return (
    <section className="py-10">
      <div className="mb-5 text-center">
        <h2 className="display text-2xl text-night sm:text-3xl">הכול לטיול, במקום אחד</h2>
        <p className="mt-1.5 text-sm text-night/55">
          טיסות, לינה, חוויות ורכב - להשלים את מה שהסוכן תכנן.
        </p>
      </div>

      {/* 2×2 במובייל, 4 בשורה בדסקטופ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {quickServices.map((s) => {
          const href = s.affiliateUrl ?? s.publicUrl;
          const comingSoon = href === null;
          return (
            <div
              key={s.key}
              className="card-pop flex flex-col rounded-2xl bg-shell p-4 ring-1 ring-night/10 sm:p-5"
            >
              <span
                aria-hidden
                className="badge h-10 w-10 items-center justify-center rounded-xl bg-zest/20 text-xl sm:h-11 sm:w-11 sm:text-2xl"
              >
                {s.emoji}
              </span>
              <h3 className="mt-2.5 text-sm font-bold leading-snug text-night sm:mt-3 sm:text-base">
                {s.title}
              </h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-night/60 sm:text-sm">
                {s.description}
              </p>

              {comingSoon ? (
                <span className="mt-3 inline-flex items-center justify-center rounded-xl bg-night/5 px-3 py-2.5 text-sm font-bold text-night/45 sm:mt-4 sm:px-4">
                  {s.cta}
                </span>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer nofollow sponsored"
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-sunset px-3 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep sm:mt-4 sm:px-4"
                >
                  {s.cta} ↗
                </a>
              )}

              {s.provider && !comingSoon && (
                <span className="mt-2 text-[11px] font-medium text-night/35">דרך {s.provider}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
