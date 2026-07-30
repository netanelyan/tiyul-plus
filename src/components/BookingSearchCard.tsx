'use client';

import type { BookingSearchCard as Card } from '@/lib/bookingSearch';
import { SEARCH_DISCLOSURE } from '@/lib/bookingSearch';
import { OFFLINE_HINT, useOnline } from '@/lib/offline/online';

/**
 * כרטיס "חיפוש מוכן אצל ספק", בתוך השיחה.
 *
 * הרכיב הזה **לא מקבל שום טקסט מהמודל**: הכותרת, הצ׳יפים, הכתובת ושם
 * הספק נבנו בשרת מתוך הטיול ומהקונפיג (`bookingSearch.ts`). כלומר אין
 * מסלול שבו מספר או שם מלון מגיע למסך דרך הכרטיס - הוא מרנדר דאטה.
 *
 * הגילוי הנאות על העמלה הוא חלק מהכרטיס ולא הערת שוליים אופציונלית.
 */
export default function BookingSearchCardView({ card }: { card: Card }) {
  const online = useOnline();

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-shell ring-1 ring-sunset/25">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">
            {card.kind === 'stay' ? '🏨' : '🎟️'}
          </span>
          <h4 className="text-sm font-bold text-night">{card.title}</h4>
        </div>

        {/* מה כבר ממולא בחיפוש - הכול נגזר מהטיול */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.understood.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-night/[0.06] px-2.5 py-1 text-[11px] font-semibold text-night/70"
            >
              {chip}
            </span>
          ))}
        </div>

        {card.onProvider.length > 0 && (
          // נאמר במפורש מה **לא** נשלח לספק. הבטחה שאנחנו לא יכולים לקיים
          // בכתובת החיפוש לא תוצג כאילו קוימה.
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-night/50">
            נקבע באתר הספק: {card.onProvider.join(' · ')}
          </p>
        )}

        {online ? (
          <a
            href={card.url}
            target="_blank"
            rel={`noopener noreferrer nofollow${card.isAffiliate ? ' sponsored' : ''}`}
            // 44px גובה מלא - זה נלחץ בטלפון, וזה המקום שבו הפיצ׳ר הזה חי
            className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-night px-3 py-3 text-sm font-bold text-cream transition hover:bg-night/85"
          >
            {card.cta}
            <span className="font-semibold text-cream/70">· {card.provider}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
              <path d="M7 17 17 7M17 7H9m8 0v8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ) : (
          <p
            className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-night/[0.04] px-3 py-3 text-center text-xs font-semibold text-night/45"
            title={OFFLINE_HINT}
          >
            {card.cta} · דורש חיבור
          </p>
        )}
      </div>

      {/* גילוי נאות - חובה, ולכן הוא חלק מהכרטיס ולא טקסט שאפשר לשכוח */}
      <p className="border-t border-night/10 bg-night/[0.03] px-3 py-2 text-[11px] font-medium leading-relaxed text-night/50">
        {SEARCH_DISCLOSURE}
      </p>
    </div>
  );
}
