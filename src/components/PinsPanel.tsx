'use client';

import type { Destination } from '@/lib/types';
import type { Trip, TripPin, TripPinKind } from '@/lib/trip/types';

/**
 * הסיכות של המטייל: המלון שהזמין, מסעדה ששמר בה שולחן, נקודות משלו.
 * הן נוצרות בעיקר בשיחה עם הסוכן (add_pin), והפאנל הזה הוא מקום
 * לראות אותן, להסיר, ובעיקר - לתקן מיקום שלא אותר.
 *
 * המיקום מגיע תמיד מחיפוש בשרת מול OpenStreetMap או מהאצבע של
 * המטייל. אין כאן ניחוש: סיכה בלי מיקום מוצגת ככזו, במפורש.
 */

const KIND_META: Record<TripPinKind, { emoji: string; label: string }> = {
  stay: { emoji: '🏨', label: 'לינה' },
  reservation: { emoji: '🍽️', label: 'הזמנה' },
  other: { emoji: '📍', label: 'סיכה' },
};

export const pinLocated = (p: TripPin): boolean =>
  typeof p.lat === 'number' && typeof p.lng === 'number';

export default function PinsPanel({
  trip,
  destinations,
  placingPinId,
  onStartPlacing,
  onRemovePin,
}: {
  trip: Trip;
  destinations: Destination[];
  placingPinId: string | null;
  onStartPlacing: (id: string | null) => void;
  onRemovePin: (id: string) => void;
}) {
  const pins = trip.pins ?? [];
  if (pins.length === 0) return null;

  const cityName = (slug?: string) =>
    slug ? (destinations.find((d) => d.slug === slug)?.name ?? '') : '';

  return (
    <section className="mt-5 rounded-2xl bg-shell p-4 ring-1 ring-night/10 print:hidden">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-night">הסיכות שלכם</h2>
        <span className="text-xs font-semibold text-night/45">
          מקומות שאתם סגרתם - מוצגים על המפה לצד המסלול
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {pins.map((pin) => {
          const located = pinLocated(pin);
          const placing = placingPinId === pin.id;
          const meta = KIND_META[pin.kind];
          const city = cityName(pin.citySlug);
          return (
            <li
              key={pin.id}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2.5"
            >
              <span aria-hidden className="text-lg">
                {meta.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-night">{pin.name}</div>
                <div className="truncate text-xs font-medium text-night/50">
                  {[meta.label, city, pin.address].filter(Boolean).join(' · ')}
                </div>
                {pin.note && (
                  <div className="mt-0.5 truncate text-xs text-night/60">{pin.note}</div>
                )}
              </div>

              {!located && (
                <span className="rounded-full bg-sunset/10 px-2.5 py-1 text-xs font-bold text-sunset-deep ring-1 ring-sunset/25">
                  מיקום לא אומת
                </span>
              )}

              <button
                onClick={() => onStartPlacing(placing ? null : pin.id)}
                aria-pressed={placing}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  placing
                    ? 'bg-sunset text-cream'
                    : 'bg-shell text-night/70 ring-1 ring-night/15 hover:ring-night/30'
                }`}
              >
                {placing ? 'בטלו' : located ? 'תיקון מיקום' : 'סימון על המפה'}
              </button>
              <button
                onClick={() => onRemovePin(pin.id)}
                aria-label={`הסרת ${pin.name}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-night/5 text-night/45 transition hover:bg-night/10 hover:text-night"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      {placingPinId && (
        <p className="mt-2 text-xs font-bold text-sunset-deep">
          לחצו על המפה במקום המדויק - או גררו את הסיכה עצמה.
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-night/45">
        המיקומים מגיעים מחיפוש ב-OpenStreetMap. כשהחיפוש לא מוצא את המקום אנחנו לא מנחשים -
        הסיכה מסומנת &quot;לא אומת&quot; עד שתניחו אותה בעצמכם.
      </p>
    </section>
  );
}
