import type { Trip } from './types';

/**
 * A thin storage layer over localStorage.
 * When there is a real backend (user accounts), only this file changes - the components
 * talk to TripContext and do not know where the data lives.
 */

const KEY = 'tiyul-plus:trips:v1';

/**
 * Tombstones: when each trip was deleted.
 *
 * **Why this has to be here and not merely "the row disappeared".** Every other change
 * to a trip carries `updatedAt`, so the merge with the account can resolve "latest
 * wins". A deletion, by contrast, used to be expressed only as an absence - and an
 * absence has no timestamp. Any remote copy, even from a snapshot read moments before
 * the deletion, "beat" the deletion and brought the trip back to life. That is the bug
 * Netanel reported: delete, refresh, and the trip returns.
 */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_TOMBSTONES = 200;

export interface TripState {
  trips: Trip[];
  currentId: string | null;
  /** id of a deleted trip -> when (ms). Pruned by age and by count. */
  deleted?: Record<string, number>;
  /**
   * **Whose data is sitting here right now.** `null` = anonymous (trips built with no
   * account), a string = the uuid of the account they were pulled from.
   *
   * This is not metadata: without this field, a shared device mixes people up. Signing
   * out did not clear storage, so the next sign-in merged the previous person's trips
   * into the new account - `mergeTrips` pushes up every local trip that is not on the
   * server, and that is exactly the shape of "a local trip that is not on the server".
   * See `AccountSync`.
   */
  accountId?: string | null;
}

const EMPTY: TripState = { trips: [], currentId: null, deleted: {}, accountId: null };

/** Pruning: a 90-day-old tombstone has nothing left to protect, and an uncapped list grows forever. */
export function pruneTombstones(
  deleted: Record<string, number> | undefined,
  now = Date.now(),
): Record<string, number> {
  if (!deleted) return {};
  const fresh = Object.entries(deleted)
    .filter(([, at]) => typeof at === 'number' && Number.isFinite(at) && now - at < TOMBSTONE_TTL_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOMBSTONES);
  return Object.fromEntries(fresh);
}

export function loadTrips(): TripState {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as TripState;
    if (!Array.isArray(parsed.trips)) return { ...EMPTY };
    return { ...parsed, deleted: pruneTombstones(parsed.deleted), accountId: parsed.accountId ?? null };
  } catch {
    return { ...EMPTY };
  }
}

export function saveTrips(state: TripState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...state, deleted: pruneTombstones(state.deleted) }),
    );
  } catch {
    // Storage full or blocked - ignore silently, the state stays in memory
  }
}
