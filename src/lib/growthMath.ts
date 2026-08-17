/**
 * The growth-metric arithmetic - a shared file (the server serves rows, the client
 * computes ranges), pure and therefore unit-testable. The separation is deliberate: the
 * route returns the `app_events` rows as they are, and switching range (7/30/all) is a
 * local computation with no further request - the table is small (one row per day per
 * kind).
 */

export interface EventRow {
  day: string; // YYYY-MM-DD (UTC, like dayKey on the server)
  kind: string;
  count: number;
}

export type GrowthRange = 7 | 30 | 'all';

/**
 * The six metrics Netanel asked for. `kinds` is the list of event types summed into
 * the same metric - "shares" are both copy-link and WhatsApp, because both produce a
 * share link.
 */
export const GROWTH_METRICS = [
  { key: 'trips', label: 'טיולים שנוצרו', kinds: ['trip_created'] },
  { key: 'shares', label: 'קישורי שיתוף שנוצרו', kinds: ['share', 'whatsapp'] },
  { key: 'opens', label: 'פתיחות של קישור משותף', kinds: ['shared_open'] },
  { key: 'adopts', label: 'צפייה בשיתוף שהפכה לטיול', kinds: ['shared_adopt'] },
  { key: 'emails', label: 'הרשמות לרשימת התפוצה', kinds: ['newsletter'] },
  { key: 'returns', label: 'ביקורים חוזרים', kinds: ['return_visit'] },
] as const;

export type GrowthKey = (typeof GROWTH_METRICS)[number]['key'];

export interface GrowthValue {
  current: number;
  /** The preceding comparable range (the 7 days before the last 7) - null for "all" */
  previous: number | null;
}

/** Whole-day difference between two ISO dates, by UTC midnight */
export function daysBetween(laterIso: string, earlierIso: string): number {
  const later = Date.parse(laterIso);
  const earlier = Date.parse(earlierIso);
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return Number.NaN;
  return Math.round((later - earlier) / 86_400_000);
}

/**
 * The totals per metric over the requested range, alongside the preceding comparable range.
 *
 * Current window: `0 <= diff < N` (including today). Previous window: `N <= diff < 2N`.
 * A row with a future date (clock skew between servers) is counted in the current one -
 * better to count it than to make it disappear.
 */
export function computeGrowth(
  rows: EventRow[],
  todayIso: string,
  range: GrowthRange,
): Record<GrowthKey, GrowthValue> {
  const kindToKey = new Map<string, GrowthKey>();
  for (const m of GROWTH_METRICS) for (const k of m.kinds) kindToKey.set(k, m.key);

  const out = {} as Record<GrowthKey, GrowthValue>;
  for (const m of GROWTH_METRICS) out[m.key] = { current: 0, previous: range === 'all' ? null : 0 };

  for (const r of rows) {
    const key = kindToKey.get(r.kind);
    if (!key) continue; // the older export kinds (print/maps...) do not belong here
    const n = Number(r.count) || 0;
    if (n <= 0) continue;
    if (range === 'all') {
      out[key].current += n;
      continue;
    }
    const diff = daysBetween(todayIso, r.day);
    if (!Number.isFinite(diff)) continue;
    if (diff < range) out[key].current += n;
    else if (diff < range * 2) out[key].previous = (out[key].previous ?? 0) + n;
  }
  return out;
}

/** Whether a growth event was ever counted - the difference between "a quiet week" and "an old function" */
export function growthEverCounted(rows: EventRow[]): boolean {
  const growthKinds = new Set<string>(GROWTH_METRICS.flatMap((m) => [...m.kinds]));
  // share/whatsapp are long-standing kinds that were counted even before the feature -
  // they do not prove that bump_event's closed list was updated. Only the new kinds do.
  growthKinds.delete('share');
  growthKinds.delete('whatsapp');
  return rows.some((r) => growthKinds.has(r.kind) && Number(r.count) > 0);
}
