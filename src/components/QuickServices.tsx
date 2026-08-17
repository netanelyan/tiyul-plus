import { quickServices } from '@/lib/services';
import { outboundAttrs } from '@/lib/outbound';

/**
 * Quick access to travel services - 4 cards (a row on desktop, a column on mobile) in the site's
 * card-pop/sticker language. Each card: an icon, a title, a short sentence and a button. The link
 * source comes from `src/lib/services.ts` (config), so a real affiliate link can be pasted in
 * later without touching this file.
 *
 * Honesty: there is no affiliate right now - the buttons point at the provider's public site (with
 * no tracking parameters), or show "coming soon" when no provider has been chosen yet.
 *
 * Which is also why `rel` comes from `outboundAttrs` and is not written by hand: the code here
 * marked all four links as `sponsored` while none of them was an affiliate link, and that is a
 * false declaration. Now the marking is derived from whether an `affiliateUrl` exists, i.e. it
 * will appear by itself the day there is an id - and not a moment before.
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

      {/* 2x2 on mobile, 4 across on desktop */}
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
                  {...outboundAttrs({ affiliate: s.affiliateUrl !== null })}
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
