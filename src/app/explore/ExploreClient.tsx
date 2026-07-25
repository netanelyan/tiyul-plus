'use client';

import { useState } from 'react';
import Link from 'next/link';
import { destinations } from '@/data/destinations';
import { categoryMeta } from '@/lib/categories';
import type { ExploredDestination } from '@/lib/explore/resolver';
import { saveExplored } from '@/lib/explore/storage';
import PlacesMap from '@/components/PlacesMap';
import ThinkingIndicator from '@/components/ThinkingIndicator';

/**
 * ה-UI של ה-AI Explorer: חיפוש עיר → אם היא בקטלוג, מפנים לדף האוצר
 * (עדיף תמיד); אחרת /api/explore בונה יעד ארעי מוויקיפדיה ומציג אותו
 * עם תיוג כן. היעד נשמר מקומית - מוכן לשלב הבא (תכנון טיול בו).
 */
export default function ExploreClient() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExploredDestination | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  // אם העיר כבר בקטלוג - הדף האוצר עדיף על חקירה גולמית
  const curatedMatch = (() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    return (
      destinations.find(
        (d) =>
          d.name.toLowerCase().includes(q) || d.nameLocal.toLowerCase().includes(q) || d.slug === q,
      ) ?? null
    );
  })();

  async function explore() {
    const q = query.trim();
    if (q.length < 2 || loading || curatedMatch) return;
    setLoading(true);
    setResult(null);
    setNotFound(null);
    try {
      const res = await fetch(`/api/explore?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { destination: ExploredDestination | null };
      if (data.destination) {
        setResult(data.destination);
        saveExplored(data.destination);
      } else {
        setNotFound(q);
      }
    } catch {
      setNotFound(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          explore();
        }}
        className="flex max-w-md gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="למשל: ליסבון, פורטו, סיאול…"
          aria-label="עיר לחקירה"
          className="w-full rounded-2xl border border-night/15 bg-shell px-5 py-3.5 text-night shadow-inner outline-none transition placeholder:text-night/45 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2 || Boolean(curatedMatch)}
          className="shrink-0 rounded-2xl bg-sunset px-6 py-3.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
        >
          חקירה
        </button>
      </form>

      {curatedMatch && (
        <div className="rise-in mt-4 max-w-md rounded-2xl bg-[#00a896]/10 px-5 py-4 ring-1 ring-[#00a896]/30">
          <p className="font-bold text-night">
            {curatedMatch.name} כבר בקטלוג האוצר שלנו - שם המידע בדוק ומלא יותר:
          </p>
          <Link
            href={`/destinations/${curatedMatch.slug}`}
            className="mt-1 inline-block font-bold text-sunset-deep hover:underline"
          >
            לדף של {curatedMatch.name} ←
          </Link>
        </div>
      )}

      {loading && (
        <div className="mt-8 rounded-2xl bg-shell p-8 text-center ring-1 ring-night/10">
          <ThinkingIndicator label="חוקר את היעד - מאתר אתרים אמיתיים" className="justify-center" />
        </div>
      )}

      {notFound && !loading && (
        <div className="rise-in mt-6 max-w-xl rounded-2xl bg-zest/15 px-5 py-5 ring-1 ring-zest/40">
          <p className="font-bold text-night">לא הצלחנו לחקור את &quot;{notFound}&quot;</p>
          <p className="mt-1.5 text-sm leading-relaxed text-night/70">
            לא נמצאו מספיק נתונים אמינים ממקורות ציבוריים. נסו איות אחר (עברית או
            אנגלית), או עיר גדולה יותר באזור.
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="rise-in mt-6">
          {/* תיוג כן - זה לא הקטלוג האוצר */}
          <div className="rounded-xl bg-night/5 px-4 py-2.5 text-sm font-semibold text-night/70">
            🔎 נחקר אוטומטית ממקורות ציבוריים (ויקיפדיה) · לא נבדק על ידי הצוות - לוודא
            פרטים לפני ביקור
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <h2 className="display text-2xl text-night">{result.name}</h2>
            <span className="text-sm font-semibold text-night/50">
              {result.places.length} אתרים שאותרו
            </span>
            {result.wikiUrl && (
              <a
                href={result.wikiUrl}
                target="_blank"
                rel="noreferrer"
                className="ms-auto text-xs font-semibold text-sunset-deep hover:underline"
              >
                המקור בוויקיפדיה ↗
              </a>
            )}
          </div>
          {result.summary && (
            <p className="mt-1 max-w-2xl leading-relaxed text-night/70">{result.summary}</p>
          )}

          <div className="mt-4 h-[320px] overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-[380px]">
            <PlacesMap center={{ lat: result.lat, lng: result.lng }} zoom={12} places={result.places} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.places.map((p) => (
              <div key={p.id} className="card-pop overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10">
                {p.photo && (
                  <div className="photo-bg h-32" style={{ backgroundImage: `url(${p.photo})` }} />
                )}
                <div className="p-4">
                  <p className="font-bold text-night">
                    {p.name}
                    <span className="ms-2 text-xs font-medium text-night/45">
                      {categoryMeta[p.category].label}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-night/65">
                    {p.description}
                  </p>
                  {p.externalUrl && (
                    <a
                      href={p.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-sunset-deep hover:underline"
                    >
                      לקריאה מלאה ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-night px-6 py-5 text-center">
            <p className="font-bold text-cream">
              רוצים שהסוכן יבנה טיול ביעד הזה? השילוב בדרך - היעד נשמר אצלכם והצוות
              יוסיף אותו לקטלוג האוצר אם יהיה ביקוש.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
