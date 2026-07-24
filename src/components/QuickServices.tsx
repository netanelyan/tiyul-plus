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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickServices.map((s) => {
          const href = s.affiliateUrl ?? s.publicUrl;
          const comingSoon = href === null;
          return (
            <div
              key={s.key}
              className="card-pop flex flex-col rounded-2xl bg-shell p-5 ring-1 ring-night/10"
            >
              <span
                aria-hidden
                className="badge h-11 w-11 items-center justify-center rounded-xl bg-zest/20 text-2xl"
              >
                {s.emoji}
              </span>
              <h3 className="mt-3 font-bold text-night">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-night/60">{s.description}</p>

              {comingSoon ? (
                <span className="mt-4 inline-flex items-center justify-center rounded-xl bg-night/5 px-4 py-2.5 text-sm font-bold text-night/45">
                  {s.cta}
                </span>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer nofollow sponsored"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-sunset px-4 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep"
                >
                  {s.cta} ↗
                </a>
              )}

              {s.provider && (
                <span className="mt-2 text-[11px] font-medium text-night/35">
                  {comingSoon ? '' : `דרך ${s.provider}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
