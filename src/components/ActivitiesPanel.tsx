'use client';

import { useEffect, useRef, useState } from 'react';
import PanelSection from '@/components/PanelSection';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import { formatDurationHe } from '@/lib/duration';
import { hePrefix } from '@/lib/hebrew';

/**
 * "Bookable activities" - **partner content, marked as such.**
 *
 * ## What this component does NOT do
 *
 * It invents no price, converts no currency, translates no title and does
 * no ranking. Every number and every name comes from Viator's response as
 * is, and the server has already dropped any product missing one of them.
 * There is also no writing here: the activities do not enter the trip, the
 * local storage or the account - they live in the component's state until
 * the screen is closed.
 *
 * ## The section opens on click, not by itself
 *
 * That is not just request frugality. A commercial section that opens
 * itself inside a trip plan is an advertisement; a section that opens when
 * asked is a tool. It is also collapsed by default like the other blocks
 * in this area.
 *
 * ## The marking during development
 *
 * In sandbox mode Viator's data is **fictional**. Nobody can be trusted to
 * remember that, so there is an unmissable warning bar above the list
 * **and** a tag on each individual card - and the booking button is
 * disabled, because there is nothing to book.
 */

interface Offer {
  code: string;
  title: string;
  fromPrice: number | null;
  currency: string | null;
  rating: number | null;
  reviews: number | null;
  durationMinutes: number | null;
  image: string | null;
  url: string;
  sandbox: boolean;
}

interface Result {
  mode: 'off' | 'sandbox' | 'production';
  offers: Offer[];
  reason: string;
}

/** Exactly what was returned: their number and currency, no conversion and no rounding */
const price = (n: number | null, cur: string | null) =>
  n === null || !cur ? null : `${cur} ${n % 1 === 0 ? n : n.toFixed(2)}`;

export default function ActivitiesPanel({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [open, setOpen] = useState(false);
  /*
    The result carries with it the city it belongs to, instead of an effect
    that resets it when the city changes. That both prevents a flash of the
    previous city's activities, and removes an effect whose entire job was
    to clean up state.
  */
  const [state, setState] = useState<{ city: string; result: Result } | null>(null);
  const [loading, setLoading] = useState(false);
  const data = state && state.city === citySlug ? state.result : null;
  /*
    The ref is what prevents a duplicate request, and deliberately not
    `loading`.

    In the first version `loading` was both the guard and a dependency of
    the effect, so `setLoading(true)` changed a dependency, the effect
    re-ran, **the cleanup marked the in-flight request as irrelevant**, and
    the second run bailed out immediately because of the guard. The result:
    the request succeeded, a 200 came back, and nobody wrote the response -
    the section stayed on the "checking what's in the city" state forever.
    The API worked; only the screen was stuck, so no server-side check could
    ever see it. A real browser caught it.

    A ref updates synchronously and is not a dependency, so the effect runs
    exactly once per city. On failure it resets, so another opening tries
    again.
  */
  const askedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || askedRef.current === citySlug) return;
    askedRef.current = citySlug;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/activities?city=${encodeURIComponent(citySlug)}`);
        const json = (await res.json()) as Result;
        if (alive) setState({ city: citySlug, result: json });
      } catch {
        // Silent failure: the section simply says there is nothing right now, and the screen goes on
        askedRef.current = null;
        if (alive) setState({ city: citySlug, result: { mode: 'off', offers: [], reason: 'unavailable' } });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, citySlug]);

  const offers = data?.offers ?? [];
  const sandbox = offers.some((o) => o.sandbox);

  /*
    When there is nothing to show the section does not vanish after being
    opened - it simply says there is nothing, and that is the honest
    answer. What it does not do: it does not try to explain why, and it
    does not show an error.
  */
  const emptyLine =
    data && offers.length === 0
      ? 'לא נמצאו פעילויות להזמנה בעיר הזו כרגע.'
      : null;

  return (
    <PanelSection
      panelKey="activities"
      icon="🎟️"
      title={`פעילויות ${hePrefix('ב', cityName)}`}
      meta={<span className="text-[11px] font-medium text-night/45">להזמנה דרך Viator</span>}
      ariaLabel={`פעילויות להזמנה ${hePrefix('ב', cityName)}`}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        {sandbox && (
          /* Impossible to miss, and that is the point */
          <div
            data-sandbox-banner
            className="mb-3 rounded-xl bg-sunset px-3 py-2 text-xs font-black text-cream"
          >
            ⚠️ מצב בדיקה (sandbox) - הפעילויות והמחירים כאן מומצאים ואינם אמיתיים. לא להזמנה.
          </div>
        )}

        {loading && <ThinkingIndicator label="בודק מה יש בעיר" />}

        {emptyLine && <p className="text-sm font-medium text-night/55">{emptyLine}</p>}

        {offers.length > 0 && (
          <ul className="space-y-2">
            {offers.map((o) => {
              const p = price(o.fromPrice, o.currency);
              const dur = formatDurationHe(o.durationMinutes ?? undefined);
              return (
                <li
                  key={o.code}
                  data-offer
                  data-sandbox={o.sandbox ? '1' : undefined}
                  className="flex items-center gap-3 rounded-xl bg-cream p-2.5"
                >
                  {o.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.image}
                      alt=""
                      loading="lazy"
                      className="h-14 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {/*
                      Two lines and not `truncate`: the product name is
                      exactly what we must not invent, so we must not cut it
                      into "Fictional Col…" either. At 390 a single line cut
                      every real name mid-word.
                    */}
                    {/*
                      `bdi` and not `dir="auto"`: an English name with
                      `dir="auto"` flips the whole block to LTR, so the title
                      sticks to the left while the price line beneath it
                      stays on the right - and the card looks broken. `bdi`
                      isolates the text direction inward and keeps the page's
                      alignment.
                    */}
                    <div className="line-clamp-2 text-sm font-bold text-night">
                      <bdi>{o.title}</bdi>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-night/50">
                      {/* Only the number and currency are LTR; the "starting from" prefix is Hebrew and stays RTL */}
                      {p && (
                        <span>
                          החל מ-
                          <span dir="ltr">{p}</span>
                        </span>
                      )}
                      {o.rating !== null && (
                        <span>
                          ★ {o.rating.toFixed(1)}
                          {o.reviews !== null && ` (${o.reviews.toLocaleString('he-IL')})`}
                        </span>
                      )}
                      {dur && <span>{dur}</span>}
                      {o.sandbox && (
                        <span className="rounded-full bg-sunset/20 px-1.5 py-0.5 text-sunset-deep">
                          נתון בדיוני
                        </span>
                      )}
                    </div>
                  </div>
                  {o.sandbox ? (
                    <span className="shrink-0 rounded-xl bg-night/10 px-3 py-2 text-xs font-bold text-night/40">
                      חסום בבדיקה
                    </span>
                  ) : (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener nofollow sponsored"
                      className="shrink-0 rounded-xl bg-sunset px-3 py-2 text-xs font-bold text-cream transition hover:bg-sunset-deep"
                    >
                      להזמנה ←
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/*
          The disclosure, and not in fine print: who owns the content, where
          the booking happens, and that we earn from the link. The price is
          hedged too - "starting from" is what they return, and the final
          price is set on their side.
        */}
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-night/45">
          הפעילויות, המחירים והדירוגים מוצגים כפי שהתקבלו מ-Viator ועשויים להשתנות. ההזמנה והתשלום
          מתבצעים באתר של Viator ולא כאן, ואנחנו עשויים לקבל עמלה על הזמנה שבוצעה דרך הקישור. אין
          לזה שום השפעה על מה שהמתכנן ממליץ.
        </p>
      </div>
    </PanelSection>
  );
}
