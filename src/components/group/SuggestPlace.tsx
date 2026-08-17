'use client';

import { useMemo, useState } from 'react';
import { useCityData } from '@/lib/trip/cityData';
import PlaceThumb from '@/components/PlaceThumb';
import { categoryMeta } from '@/lib/categories';
import type { Place } from '@/lib/types';

/**
 * "What about X?" - the thing voting cannot express.
 *
 * Until now a friend could only approve or reject the organiser's plan. This is
 * the difference between commenting on somebody's trip and planning one together,
 * and it is the single feature most likely to make the shared trip worth paying
 * for.
 *
 * **Only real catalog places, and only from the trip's own cities.** The picker is
 * built from `useCityData`, the same per-city fetch the trip screen uses, so the
 * catalog is never shipped whole; and the server re-checks the place against the
 * catalog anyway, because a picker is a convenience and never the guarantee.
 * Places already in the trip are filtered out here and rejected there - suggesting
 * something already planned is noise, not a suggestion.
 */
export default function SuggestPlace({
  citySlugs,
  alreadyIn,
  onSuggest,
  disabled,
}: {
  citySlugs: string[];
  alreadyIn: ReadonlySet<string>;
  onSuggest: (citySlug: string, placeId: string, note: string) => Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
}) {
  const cities = useCityData(citySlugs);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<{ citySlug: string; placeId: string; name: string } | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const candidates = useMemo(() => {
    const out: { citySlug: string; cityName: string; place: Place }[] = [];
    for (const d of Object.values(cities.cities)) {
      for (const p of d.places) {
        if (alreadyIn.has(p.id)) continue;
        out.push({ citySlug: d.slug, cityName: d.name, place: p });
      }
    }
    const needle = q.trim();
    const list = needle
      ? out.filter((r) => r.place.name.includes(needle) || r.cityName.includes(needle))
      : out;
    return list.slice(0, 40);
  }, [cities.cities, alreadyIn, q]);

  async function submit() {
    if (!picked || sending) return;
    setSending(true);
    setErr(null);
    const res = await onSuggest(picked.citySlug, picked.placeId, note.trim());
    setSending(false);
    if (res.ok) {
      setPicked(null);
      setNote('');
      setQ('');
      setOpen(false);
    } else {
      setErr(
        res.error === 'already-in-trip'
          ? 'המקום כבר בטיול.'
          : res.error === 'duplicate'
            ? 'כבר הצעתם את המקום הזה.'
            : res.error === 'too-many'
              ? 'הגעתם למגבלת ההצעות בטיול הזה.'
              : 'לא נשלח - נסו שוב.',
      );
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="min-h-[44px] w-full rounded-xl bg-shell px-4 text-sm font-bold text-night ring-1 ring-night/15 transition hover:bg-sunset/10 disabled:opacity-50"
      >
        ＋ יש לכם רעיון? הציעו מקום להוסיף
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-night">הצעת מקום למארגן</p>
        <button
          onClick={() => setOpen(false)}
          className="min-h-[36px] px-2 text-xs font-bold text-night/45 transition hover:text-night"
        >
          סגירה
        </button>
      </div>

      {picked ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-night">
            {picked.name}{' '}
            <button
              onClick={() => setPicked(null)}
              className="ms-1 text-xs font-bold text-sunset-deep underline"
            >
              החלפה
            </button>
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="למה כדאי? (לא חובה)"
            className="mt-2 w-full resize-y rounded-lg border border-night/15 bg-cream px-3 py-2 text-base leading-relaxed text-night outline-none placeholder:text-night/35 focus:ring-4 focus:ring-sunset/15 sm:text-sm"
          />
          <button
            onClick={() => void submit()}
            disabled={sending}
            className="mt-2 min-h-[44px] rounded-xl bg-sunset px-5 text-sm font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
          >
            {sending ? 'שולח…' : 'שליחת ההצעה'}
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש מקום בערים של הטיול…"
            className="mt-3 min-h-[44px] w-full rounded-lg border border-night/15 bg-cream px-3 text-base text-night outline-none placeholder:text-night/35 focus:ring-4 focus:ring-sunset/15 sm:text-sm"
          />
          {cities.loading && <p className="mt-2 text-xs text-night/45">טוען מקומות…</p>}
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.place.id}>
                <button
                  onClick={() =>
                    setPicked({ citySlug: c.citySlug, placeId: c.place.id, name: c.place.name })
                  }
                  className="flex w-full items-start gap-2.5 rounded-xl p-1.5 text-start transition hover:bg-sunset/10"
                >
                  <PlaceThumb place={c.place} className="h-11 w-11 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-night">{c.place.name}</span>
                    <span className="block text-[11px] font-medium text-night/45">
                      {c.cityName} · {categoryMeta[c.place.category].label}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!cities.loading && candidates.length === 0 && (
              <li className="px-1 py-2 text-xs font-medium text-night/45">
                לא נמצא מקום מתאים - כל מה שיש בערים האלה כבר בטיול.
              </li>
            )}
          </ul>
        </>
      )}
      {err && <p className="mt-2 text-xs font-semibold text-sunset-deep">{err}</p>}
    </div>
  );
}
