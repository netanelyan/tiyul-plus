'use client';

import { useState } from 'react';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import { buildTripFromImport } from '@/lib/trip/importedTrip';
import { authHeader } from '@/lib/auth/client';

/**
 * Importing a map from Google My Maps into a new trip.
 *
 * The user pastes a link to a map shared as "anyone with the link"; the server fetches the
 * KML, parses the points, and returns an explored-style destination. Here we build a new trip
 * from it (up to 4 stops per day, following the order of the points on the map) and hand it on.
 *
 * TripAdvisor: it has no public export of saved maps or trips - said honestly in the modal
 * rather than pretending it is supported.
 */

export default function ImportMapModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Receives the destination and the ready trip - the caller stores explored and creates the trip */
  onImported: (dest: Destination, trip: Trip) => void;
}) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function doImport() {
    const trimmed = url.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/import-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as {
        destination?: Destination;
        truncated?: number;
        error?: string;
      };
      if (!data.destination) {
        setError(data.error ?? 'משהו השתבש - נסו שוב.');
        return;
      }
      onImported(data.destination, buildTripFromImport(data.destination));
      setUrl('');
      onClose();
    } catch {
      setError('משהו השתבש בחיבור - נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-shell p-6 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="ייבוא מפה מ-Google My Maps"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-night">📍 ייבוא מפה מ-Google My Maps</h2>
            <p className="mt-1 text-sm leading-relaxed text-night/60">
              הדביקו קישור למפה שלכם - כל הנקודות שסימנתם יהפכו לטיול חדש עם ימים ומפה.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-1.5 text-night/50 transition hover:bg-night/5 hover:text-night"
          >
            ✕
          </button>
        </div>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void doImport()}
          placeholder="https://www.google.com/maps/d/…"
          dir="ltr"
          className="mt-4 w-full rounded-2xl border border-night/15 bg-cream px-4 py-3 text-base sm:text-sm text-night shadow-inner outline-none placeholder:text-night/35 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />

        {error && (
          <p className="mt-3 rounded-xl bg-sunset/10 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-sunset-deep">
            {error}
          </p>
        )}

        <button
          onClick={() => void doImport()}
          disabled={busy || !url.trim()}
          className="mt-4 w-full rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-50"
        >
          {busy ? 'מושך את המפה…' : 'ייבוא לטיול חדש'}
        </button>

        <div className="mt-4 space-y-1.5 text-xs leading-relaxed text-night/45">
          <p>
            💡 המפה צריכה להיות משותפת: ב-My Maps → שיתוף → &quot;כל מי שיש לו הקישור יכול
            להציג&quot;.
          </p>
          <p>
            לגבי TripAdvisor - אין לו כרגע ייצוא ציבורי של מפות שמורות, אז אי אפשר לייבא משם.
            אם יש לכם רשימה, אפשר פשוט להדביק את שמות המקומות בצ׳אט והסוכן יבנה מהם טיול.
          </p>
        </div>
      </div>
    </div>
  );
}
