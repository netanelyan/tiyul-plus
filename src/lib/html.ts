/**
 * Escaping for HTML contexts. **Client-safe on purpose.**
 *
 * ## Why this file exists rather than reusing the mailer's copy
 *
 * A correct `escapeHtml` already lived in `server/mail.ts`, and it could not be used
 * where it was needed: `MapInner` is a client component, and importing a server module
 * to get a five-line string function would pull server code into the browser bundle.
 * The alternative - a second copy - is how two implementations of one rule drift until
 * only one of them is right.
 *
 * So the canonical one is here, and the mailer re-exports it.
 *
 * ## The bug that made this necessary
 *
 * `MapInner` builds Leaflet marker icons as raw HTML strings, because a `divIcon` takes
 * markup rather than a React node - so it is the one sink in this codebase where a
 * string becomes markup without React escaping it. It interpolated a place's photo URL
 * straight into a src attribute, and the only validation upstream accepted anything
 * matching "https://" followed by 5-300 characters, which does not exclude quotes.
 *
 * Proven exploitable before the fix: a photo value of
 *
 *   https://evil.test/a.jpg" onerror="alert(document.cookie)" x="
 *
 * closed the src attribute and injected a handler, and the INJECTED handler comes first,
 * so it wins - HTML keeps the first of a duplicated attribute. The site's CSP carries
 * 'unsafe-inline' in script-src, so nothing downstream blocked it either.
 */

/**
 * Escape a value for insertion into HTML text **or** a double/single-quoted attribute.
 *
 * All five characters matter and the order does: the ampersand must be replaced first,
 * or the escapes this function just introduced get escaped again and the reader sees a
 * literal "&amp;lt;".
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip ASCII control characters and spaces.
 *
 * Written as a codepoint filter rather than a regex character class deliberately: the
 * range needs backslash escapes, and an escape that gets mangled in transit produces a
 * class that silently matches the wrong thing - which is not a failure any test of the
 * happy path would notice. A comparison on `charCodeAt` cannot be mangled.
 */
const stripControl = (s: string): string =>
  [...s].filter((c) => {
    const code = c.charCodeAt(0);
    return code > 0x20 && code !== 0x7f;
  }).join('');

/**
 * A URL safe to place in an href/src attribute, or an empty string.
 *
 * Escaping alone protects the attribute boundary but not the URL's own scheme: a
 * `javascript:` or `data:text/html` value survives any amount of quote-escaping and
 * still executes when the attribute is followed. So the scheme is **allow-listed**
 * rather than denied - a denylist is defeated by a tab inside the scheme, embedded
 * newlines and unicode look-alikes, all of which browsers have historically accepted,
 * which is why the control characters come out before the scheme is read.
 *
 * Returns '' rather than throwing: a missing image is a missing image, and a pin with no
 * photograph is a state this UI already handles.
 */
export function safeUrlAttr(value: unknown): string {
  const cleaned = stripControl(String(value ?? ''));
  if (!cleaned) return '';
  // https, or a site-relative path. Nothing else - not http, not protocol-relative.
  if (!/^https:\/\//i.test(cleaned) && !/^\/[^/]/.test(cleaned)) return '';
  return escapeHtml(cleaned);
}
