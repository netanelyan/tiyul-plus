'use client';

import { useState } from 'react';
import { canonical } from '@/lib/seo/site';
import { escapeHtml, safeUrlAttr } from '@/lib/html';

/**
 * The copy-paste block a blogger puts on their own page.
 *
 * ## The `<a>` below the iframe is the entire point
 *
 * An iframe is invisible to a search engine as a link: the embedding page gets a
 * nice widget and we get nothing but bandwidth. So the snippet ships **two**
 * elements, and the second is an ordinary anchor to the public trip page with
 * real anchor text. That is the link that is worth serving the widget for, and
 * it is why the snippet is not just an iframe tag.
 *
 * It is also honest for the reader: an embedded frame with no visible source is
 * a widget from nowhere. The line underneath says where it came from and goes
 * there.
 *
 * ## The absolute URL comes from `canonical`, not from `location`
 *
 * This renders on the server too, and `location.origin` would differ between
 * the server pass and the client pass - a hydration mismatch in a block whose
 * whole job is to be copied accurately. `canonical` is the same constant the
 * sitemap and every page's canonical tag use, so a snippet copied from a
 * preview deployment still points at production, which is what the copier meant.
 */
export default function EmbedSnippet({
  slug,
  title,
  className = '',
}: {
  slug: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const pageUrl = canonical(`/trips/${slug}`);
  const embedUrl = canonical(`/embed/trip/${slug}`);

  /*
    `loading="lazy"` so an embed far down somebody else's article costs them
    nothing until it is scrolled to, and a title on the iframe because an
    untitled frame is unreachable for a screen reader on their page as much as
    on ours.
  */
  /*
    Through `safeUrlAttr` and `escapeHtml`, exactly as if we were rendering it.
    It looks like a display string and it is not: this text is about to be pasted
    into somebody else's page, where it becomes live HTML on a domain we do not
    control. A class guard scans for URLs interpolated into attributes without
    the helper, and it caught this block - correctly.
  */
  const snippet =
    `<iframe src="${safeUrlAttr(embedUrl)}" width="100%" height="520" loading="lazy" ` +
    `style="border:0;border-radius:16px;max-width:100%" title="${escapeHtml(title)}"></iframe>\n` +
    `<p><a href="${safeUrlAttr(pageUrl)}">${escapeHtml(title)} - מסלול בטיול+</a></p>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={`rounded-2xl bg-shell ring-1 ring-night/10 print:hidden ${className}`}>
      <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-night">
        כותבים בלוג? אפשר להטמיע את המסלול הזה אצלכם
      </summary>
      <div className="px-5 pb-5">
        <p className="text-xs leading-relaxed text-night/70">
          העתיקו את הקוד לעמוד שלכם. מתקבלת תצוגה של המסלול עם מפה, ומתחתיה קישור רגיל
          לעמוד המלא כאן.
        </p>
        <pre
          dir="ltr"
          className="mt-3 overflow-x-auto rounded-xl bg-night/5 p-3 text-start text-[11px] leading-relaxed text-night/80"
        >
          <code>{snippet}</code>
        </pre>
        <button
          onClick={() => void copy()}
          className="mt-2 rounded-xl bg-night/5 px-4 py-2 text-sm font-bold text-night transition hover:bg-night/10"
        >
          {copied ? '✓ הועתק' : 'העתקת הקוד'}
        </button>
      </div>
    </details>
  );
}
