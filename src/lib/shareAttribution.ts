/**
 * Where a trip came from, when the answer is "somebody's shared link".
 *
 * ## Why this is not the existing share marker
 *
 * `events.ts` already stores a share marker (`SHARE_REF_KEY`) and already
 * counts the conversion - but it stores **a day and nothing else**, and it is
 * written only for a browser that holds no trips at all, because its question
 * is "did sharing bring a NEW person". That is a counter, and it is the right
 * shape for a counter.
 *
 * This answers a different question: *which* link brought this trip, recorded
 * **on the trip itself**, for a visitor who may well already have trips. The
 * two deliberately do not share storage - folding them together would mean
 * either the counter starts counting existing planners, or the attribution
 * stops being recorded for them. Both are worse than one extra key.
 *
 * ## localStorage, never a cookie
 *
 * `/privacy` promises no cookies without consent, and this is attribution, not
 * consent-worthy tracking: the value never leaves the browser, is not sent to
 * any endpoint, and names a share code rather than a person. It expires on its
 * own after `MAX_AGE_DAYS` so a link opened months ago cannot claim credit for
 * an unrelated trip.
 */
import type { TripSource } from '@/lib/trip/types';
import { localDay } from '@/lib/events';

const KEY = 'tiyul-plus:share-source';

/** A link that brought somebody here stops being the reason they planned, eventually. */
const MAX_AGE_DAYS = 7;

/**
 * How much of the code to keep.
 *
 * A short code is 6-12 chars, but `/t/` also accepts the **inline** v1 format,
 * where the whole trip is base64 in the URL and the "code" can be thousands of
 * characters. Storing that verbatim would put a trip's full payload into a
 * second storage key for no benefit, so it is truncated to the same prefix
 * length `events.ts` already uses for share ownership. A prefix is enough to
 * tell two links apart, which is all this is for.
 */
const CODE_PREFIX = 64;

interface StoredSource {
  code: string;
  /** Local day, `YYYY-MM-DD` - same convention as the rest of events.ts */
  at: string;
}

function read(): StoredSource | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as Partial<StoredSource>;
    if (typeof rec?.code !== 'string' || typeof rec?.at !== 'string') return null;
    return { code: rec.code, at: rec.at };
  } catch {
    return null;
  }
}

/**
 * Record that this visit came from a shared link.
 *
 * **First link wins.** Somebody who opens three shared trips before planning
 * their own was brought here by the first one; overwriting would credit
 * whichever they happened to look at last.
 */
export function rememberShareArrival(code: string): void {
  if (!code) return;
  try {
    if (read()) return;
    const rec: StoredSource = { code: code.slice(0, CODE_PREFIX), at: localDay() };
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* storage blocked - no attribution, and that is not an error worth raising */
  }
}

/** Days since the stored arrival, or null if there is nothing stored. */
function ageDays(rec: StoredSource): number | null {
  const ms = Date.now() - Date.parse(rec.at);
  return Number.isFinite(ms) ? ms / 86_400_000 : null;
}

/**
 * The source to stamp on a trip being created now, or null.
 *
 * **Consumed on read**, like the conversion marker: the first trip somebody
 * builds after arriving from a link is the one that link produced. Without
 * this, every trip they ever create in this browser would carry the same
 * origin and the number would only grow.
 */
export function consumeShareSource(): TripSource | null {
  const rec = read();
  if (!rec) return null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* cannot clear it - better to over-remove below than to credit forever */
  }
  const age = ageDays(rec);
  if (age === null || age < 0 || age > MAX_AGE_DAYS) return null;
  return { ref: 'share', code: rec.code };
}
