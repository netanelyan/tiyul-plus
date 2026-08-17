/**
 * A stable browser identifier, client-side only.
 *
 * **Why it exists:** anonymous quotas that rely on the IP address alone
 * count all of a mobile carrier's customers as one person - CGNAT puts tens
 * of thousands of devices behind a small number of addresses. The result is
 * blocking people who have never visited the site, because of somebody else.
 *
 * This is **not** a user identifier and not a security mechanism: it holds
 * no personal data, is never sent to any third party, and resets when the
 * browser's storage is cleared. Its only role is to separate visitors for
 * the sake of a fair quota.
 *
 * Deleting it gains nothing: the server falls back to the per-IP quota,
 * which is the stricter of the two.
 */
const KEY = 'tiyul-plus:client-id';

let cached: string | null = null;

/** A local identifier (16 characters), created once and saved */
export function clientId(): string {
  if (cached) return cached;
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[a-z0-9]{16,64}$/.test(existing)) {
      cached = existing;
      return existing;
    }
    // crypto.randomUUID exists in every browser we support; without it there
    // is no identifier, and the server will simply use the IP.
    const id = (globalThis.crypto?.randomUUID?.() ?? '').replace(/-/g, '').slice(0, 32);
    if (!/^[a-z0-9]{16,64}$/.test(id)) return '';
    localStorage.setItem(KEY, id);
    cached = id;
    return id;
  } catch {
    // Storage blocked (certain private modes) - fall back to IP, and that is fine
    return '';
  }
}

/** The header attached to every request that costs money */
export function clientIdHeader(): Record<string, string> {
  const id = clientId();
  return id ? { 'x-client-id': id } : {};
}

/**
 * Whether an identifier already exists - **without creating one**.
 * `clientId()` generates an identifier when there is none, so it cannot be
 * used as an "is this browser a returning one" check: the check itself would
 * turn every new browser into a returning one. The returning-visits counter
 * (events.ts) is the consumer - a browser carrying an identifier from before
 * the feature was here earlier.
 */
export function hasClientId(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(KEY);
    return Boolean(v && /^[a-z0-9]{16,64}$/.test(v));
  } catch {
    return false;
  }
}
