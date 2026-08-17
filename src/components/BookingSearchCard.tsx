'use client';

import type { BookingSearchCard as Card } from '@/lib/bookingSearch';
import { SEARCH_DISCLOSURE } from '@/lib/bookingSearch';
import { OFFLINE_HINT, useOnline } from '@/lib/offline/online';

/**
 * A "search ready at a provider" card, inside the conversation.
 *
 * This component **receives no text from the model at all**: the title, the chips, the URL
 * and the provider name were all built on the server from the trip and the config
 * (`bookingSearch.ts`). So there is no path by which a number or a hotel name reaches the
 * screen through this card - it renders data.
 *
 * The commission disclosure is part of the card and not an optional footnote.
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

        {/* What is already filled into the search - all of it derived from the trip */}
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
          // States explicitly what is **not** sent to the provider. A promise we cannot keep
          // in the search URL will not be presented as if it were kept.
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-night/50">
            נקבע באתר הספק: {card.onProvider.join(' · ')}
          </p>
        )}

        {online ? (
          <a
            href={card.url}
            target="_blank"
            rel={`noopener noreferrer nofollow${card.isAffiliate ? ' sponsored' : ''}`}
            // A full 44px height - this gets tapped on a phone, and that is where this feature lives
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

      {/* Disclosure - mandatory, so it is part of the card and not text somebody can forget */}
      <p className="border-t border-night/10 bg-night/[0.03] px-3 py-2 text-[11px] font-medium leading-relaxed text-night/50">
        {SEARCH_DISCLOSURE}
      </p>
    </div>
  );
}
