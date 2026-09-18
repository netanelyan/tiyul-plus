import Link from 'next/link';

/**
 * Section 6 - a dark call-to-action band between the light sections.
 *
 * It exists for rhythm as much as for the click: after the flagship band the
 * page runs light for two sections, and a page that stays one value from top
 * to bottom is the thing that reads as thin. The copy is the product's own
 * sentence - tell the agent where, get a real trip - not a slogan.
 */
export default function CtaBand() {
  return (
    <section className="rounded-3xl bg-night px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-2xl text-cream sm:text-3xl">
            מספרים לי לאן, ומקבלים טיול אמיתי. חינם.
          </h2>
          <p className="mt-2 text-sm text-cream/70 sm:text-base">
            יום-אחרי-יום, על מפה, רק ממקומות שאומתו - ואפשר לשנות הכול בשיחה. ההרשמה לא חובה.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-xl bg-sunset px-5 py-3 text-sm font-extrabold text-cream transition hover:bg-sunset-deep"
          >
            לתכנן טיול עכשיו
          </Link>
          <Link
            href="/planner"
            className="inline-flex items-center justify-center rounded-xl bg-cream/10 px-5 py-3 text-sm font-bold text-cream ring-1 ring-cream/25 transition hover:bg-cream/20"
          >
            בלי צ׳אט, עם כפתורים
          </Link>
        </div>
      </div>
    </section>
  );
}
