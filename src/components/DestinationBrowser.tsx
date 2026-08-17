'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import CardPhoto from '@/components/CardPhoto';
import type { PlaceTag } from '@/lib/types';
import type { Continent } from '@/data/worldCountries';
import {
  CONTINENTS,
  EMPTY_FACETS,
  PRICE_BANDS,
  SEASONS,
  VIBES,
  availableVibes,
  continentCounts,
  filterDestinations,
  type DestinationCard,
  type Facets,
  type PriceBand,
} from '@/lib/destinationFacets';

/**
 * The destination browser: continent tabs with counts, chips for character and for
 * attraction prices, and a free-text search - all client-side over an array the
 * server has already computed, so the full catalog never enters the bundle.
 *
 * The count on each tab is computed **given the other filters**, so clicking a
 * number never leads to an empty screen.
 */
const CONTINENT_EMOJI: Record<Continent, string> = {
  אירופה: '🏰',
  אסיה: '⛩️',
  'אפריקה והמזרח התיכון': '🐘',
  אמריקה: '🗽',
  אוקיאניה: '🏄',
};

export default function DestinationBrowser({ cards }: { cards: DestinationCard[] }) {
  const [f, setF] = useState<Facets>(EMPTY_FACETS);

  const results = useMemo(() => filterDestinations(cards, f), [cards, f]);
  const counts = useMemo(() => continentCounts(cards, f), [cards, f]);
  // The season filter appears only if there is any season data at all - today there
  // is none, see the explanation in destinationFacets.ts. We do not show a filter
  // that filters everything away.
  const seasonAvailable = useMemo(() => cards.some((c) => c.seasons.length > 0), [cards]);
  // Same principle as the season: show only chips that have destinations behind them
  const vibes = useMemo(() => {
    const keys = availableVibes(cards);
    return VIBES.filter((v) => keys.includes(v.key));
  }, [cards]);

  const toggleVibe = (v: PlaceTag) =>
    setF((p) => ({
      ...p,
      vibes: p.vibes.includes(v) ? p.vibes.filter((x) => x !== v) : [...p.vibes, v],
    }));

  const active =
    f.continent !== 'all' || f.vibes.length > 0 || f.price !== null || f.season !== null || f.query.trim() !== '';

  return (
    <div>
      {/* ---------- Continent tabs ---------- */}
      {/*
        Wrap, do not scroll. The first version was `overflow-x-auto` at every width,
        and below 640px that **sliced cards mid-word** - a long continent name showed
        as a half, which reads like a fault rather than a hint to scroll. Now the
        tabs share the row and drop to the next one, and nothing is cut.
      */}
      <div className="flex flex-wrap gap-2">
        <ContinentTab
          label="העולם כולו"
          emoji="🌍"
          count={counts.all}
          active={f.continent === 'all'}
          onClick={() => setF((p) => ({ ...p, continent: 'all' }))}
        />
        {CONTINENTS.map((c) => (
          <ContinentTab
            key={c}
            label={c}
            emoji={CONTINENT_EMOJI[c]}
            count={counts[c] ?? 0}
            active={f.continent === c}
            onClick={() => setF((p) => ({ ...p, continent: p.continent === c ? 'all' : c }))}
          />
        ))}
      </div>

      {/* ---------- Character ---------- */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-night/40">אופי ·</span>
        {vibes.map((v) => (
          <Chip
            key={v.key}
            label={v.label}
            emoji={v.emoji}
            active={f.vibes.includes(v.key)}
            onClick={() => toggleVibe(v.key)}
          />
        ))}
      </div>

      {/* ---------- Attraction prices ---------- */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-night/40">מחירי אטרקציות ·</span>
        {PRICE_BANDS.map((b) => (
          <Chip
            key={b.key}
            label={b.label}
            emoji={b.emoji}
            active={f.price === b.key}
            onClick={() => setF((p) => ({ ...p, price: p.price === b.key ? null : (b.key as PriceBand) }))}
          />
        ))}
      </div>
      {/*
        A disclosure that is not decoration: the measure is derived from the
        priceLevel of the attractions in the catalog. Flights and lodging are most of
        a trip's cost and there is no data on them, so the chips talk about
        attractions and do not pretend to rank destinations as cheap.
      */}
      <p className="mt-1.5 text-xs font-medium text-night/40">
        לפי מחירי הכניסה לאטרקציות בקטלוג בלבד - לא כולל טיסות ולינה, שהן רוב עלות הטיול.
      </p>

      {/* ---------- Season: only when there is data ---------- */}
      {seasonAvailable && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-night/40">עונה ·</span>
          {SEASONS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              emoji={s.emoji}
              active={f.season === s.key}
              onClick={() => setF((p) => ({ ...p, season: p.season === s.key ? null : s.key }))}
            />
          ))}
        </div>
      )}

      {/* ---------- Search ---------- */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={f.query}
          onChange={(e) => setF((p) => ({ ...p, query: e.target.value }))}
          placeholder="חיפוש יעד או מדינה…"
          aria-label="חיפוש יעד או מדינה"
          className="min-w-0 flex-1 rounded-2xl border border-night/15 bg-shell px-4 py-3 text-base sm:text-sm text-night shadow-inner outline-none transition placeholder:text-night/40 focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15"
        />
        {active && (
          <button
            onClick={() => setF(EMPTY_FACETS)}
            className="rounded-2xl bg-shell px-4 py-3 text-sm font-bold text-night/60 ring-1 ring-night/15 transition hover:text-night"
          >
            ניקוי סינון
          </button>
        )}
      </div>

      <p className="mt-3 text-sm font-semibold text-night/50">
        {results.length === 0
          ? 'אין יעד שעונה על הסינון הזה.'
          : `${results.length} ${results.length === 1 ? 'יעד' : 'יעדים'}`}
      </p>

      {/* ---------- The results ---------- */}
      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-shell p-6 text-center ring-1 ring-night/10">
          <p className="text-sm font-medium leading-relaxed text-night/60">
            אפשר להסיר חלק מהסינון, או לשאול את הסוכן - הוא יודע לחקור יעד שעדיין לא בקטלוג ולומר
            בכנות מה ידוע עליו.
          </p>
          <Link
            href="/chat"
            className="mt-3 inline-block rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
          >
            לשאול את הסוכן ←
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <Link
              key={c.slug}
              href={`/destinations/${c.slug}`}
              className="card-pop group overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10"
            >
              {/* `<img loading="lazy">` and not background-image: 166 cards sent
                  166 image requests on open. See CardPhoto. */}
              <CardPhoto photo={c.photo}>
                <span className="badge absolute end-3 top-3 rounded-full bg-cream/95 px-2 py-0.5">
                  <Flag flag={c.flag} label={c.country} size="sm" />
                </span>
                {c.rating !== undefined && (
                  <span className="absolute start-3 top-3 rounded-full bg-night/70 px-2 py-0.5 text-xs font-bold text-cream">
                    {c.rating.toFixed(1)}
                  </span>
                )}
                <div className="absolute bottom-2.5 start-4 end-4">
                  <h3 className="display truncate text-xl text-cream drop-shadow">{c.name}</h3>
                  <div className="truncate text-xs font-medium text-cream/80">{c.country}</div>
                </div>
              </CardPhoto>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  {c.vibes.slice(0, 3).map((v) => {
                    const meta = VIBES.find((x) => x.key === v);
                    return (
                      <span
                        key={v}
                        className="rounded-full bg-night/5 px-2 py-0.5 text-xs font-semibold text-night/55"
                      >
                        {meta?.emoji} {meta?.label}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs font-medium text-night/45">
                  {c.days > 0 && <>מסלול ל-{c.days} ימים · </>}
                  {c.places} מקומות
                  {c.kosher > 0 && <> · {c.kosher} כשר</>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ContinentTab({
  label,
  emoji,
  count,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      // A count of 0 is deliberately not disabled: it is information ("there is
      // nothing here with this filter") and clicking it still switches continent,
      // which lets another filter be released. flex-1 with a minimum width: the tabs
      // share the row instead of being cut, and a long name wraps to two lines
      // inside the card.
      className={`flex min-w-[6.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-3 text-center text-sm font-bold transition ${
        active
          ? 'bg-shell text-night ring-2 ring-sunset'
          : 'bg-shell/70 text-night/60 ring-1 ring-night/10 hover:ring-night/25'
      }`}
    >
      <span aria-hidden className="text-lg">
        {emoji}
      </span>
      <span className="leading-tight">{label}</span>
      <span className={`text-xs font-semibold ${active ? 'text-sunset-deep' : 'text-night/35'}`}>
        {count}
      </span>
    </button>
  );
}

function Chip({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-sunset text-cream' : 'bg-night/5 text-night/60 hover:bg-night/10 hover:text-night'
      }`}
    >
      <span aria-hidden>{emoji}</span> {label}
    </button>
  );
}
