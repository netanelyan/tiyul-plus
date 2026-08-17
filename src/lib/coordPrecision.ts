/**
 * Coordinate precision - how many decimal digits it really has, and what
 * error that implies.
 *
 * ## Why this is a separate file from `outbound.ts`
 *
 * `outbound.ts` answers "is there a valid coordinate?" (a finite number in
 * Earth range) - a binary question that decides whether a link is built at
 * all. The question here is different: "how much can the coordinate that
 * DOES exist be trusted?" A coordinate with two decimal digits
 * (`45.66,14`) passes the binary check easily and still misleads by
 * hundreds of meters up to a kilometer - exactly the kind of gap a
 * "working" link hides.
 *
 * This module is shared between `scripts/coarse-coords.mjs` (a
 * human-readable worklist) and `coordPrecision.test.ts` (a net that keeps
 * this gap from growing silently) - so the definition of "coarse" does not
 * split into two places and drift apart.
 *
 * ## Why the coarser axis decides
 *
 * A pair's precision is set by its weak side: `45.66666793823242, 14`
 * looks precise until you look at the second component. The first digit is
 * a float32 artifact, not a measurement. Hence the grading is by
 * `min(digits)`.
 *
 * Approximate latitude error: 0 digits ~111 km, 1 ~11 km, 2 ~1.1 km.
 *
 * ## A large area vs a point
 *
 * A national park or a lake is an area, and a coarse center for them is
 * legitimate. A synagogue or a restaurant is a point, and there a
 * kilometer is the difference between arriving and not. So every row is
 * marked 'area' or 'point' - and that is what decides whether it is really
 * work to do.
 */

/** Categories that are an area, not a point - a coarse center is reasonable for them */
export const AREA_CATEGORIES = new Set(['nature', 'viewpoint']);

/** Approximate km error at the latitude, by decimal digit count (0/1/2) */
export const KM_ERROR_BY_DECIMALS = [111, 11, 1.1] as const;

/**
 * Cutting float32 artifacts: `45.66666793823242` is really 45.666667 that
 * went through double rounding, and there is no point counting 14
 * significant digits nobody measured.
 */
export function coordDecimals(n: number): number {
  const s = String(n);
  const i = s.indexOf('.');
  if (i === -1) return 0;
  return Math.min(s.length - i - 1, 6);
}

export interface CoarsePlaceInput {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

export interface CoarseDestinationInput {
  slug: string;
  places?: CoarsePlaceInput[];
}

export interface CoarseCoordRow {
  destination: string;
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  /** min(lat digits, lng digits) */
  decimals: number;
  kmError: number;
  shape: 'area' | 'point';
}

/**
 * All places whose coordinate is coarser than (or equal to) `maxDecimals`
 * decimal digits, sorted coarse-to-fine. `maxDecimals` is always 0/1/2 in
 * practice - beyond that `KM_ERROR_BY_DECIMALS` is undefined.
 */
export function coarseCoordRows(destinations: CoarseDestinationInput[], maxDecimals = 2): CoarseCoordRow[] {
  const rows: CoarseCoordRow[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      const dec = Math.min(coordDecimals(p.lat), coordDecimals(p.lng));
      if (dec > maxDecimals) continue;
      rows.push({
        destination: d.slug,
        id: p.id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        decimals: dec,
        kmError: KM_ERROR_BY_DECIMALS[dec] ?? KM_ERROR_BY_DECIMALS[KM_ERROR_BY_DECIMALS.length - 1],
        shape: AREA_CATEGORIES.has(p.category) ? 'area' : 'point',
      });
    }
  }
  rows.sort((a, b) => a.decimals - b.decimals || a.destination.localeCompare(b.destination));
  return rows;
}
