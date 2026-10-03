import { destinations } from '@/data/destinations';
import { canonical } from '@/lib/seo/site';
import { getPublicTrip } from '@/lib/server/publicTrips';
import { monthLabel } from '@/lib/trip/publicTrip';
import { sharePreview } from '@/lib/trip/sharePreview';
import { daysHe } from '@/lib/duration';
import { escapeHtml, safeUrlAttr } from '@/lib/html';

/**
 * `/embed/trip/<slug>` - the inside of somebody else's iframe.
 *
 * ## Why a Route Handler and not a page
 *
 * A page inherits the root layout, and the root layout is the whole site: header,
 * nav, footer, fonts, analytics, the accessibility widget. Dropped into a
 * blogger's article that is a second website loading inside theirs, with a
 * navigation bar that goes nowhere useful from inside a frame. Next's app router
 * gives no way to opt a route out of the root layout short of restructuring every
 * route into groups with their own `<html>`.
 *
 * So this returns a complete, standalone document: no React, no hydration, no
 * client bundle, one stylesheet inline. "Lightweight" was the requirement and
 * this is the only shape that actually delivers it.
 *
 * ## noindex, pointing at the real page
 *
 * The URL we want ranked is `/trips/<slug>`, which is where the snippet's visible
 * `<a>` points. An indexable embed would compete with it for identical content.
 * The canonical link here says the same thing to anything that crawls it anyway.
 *
 * ## The trademark signature is present
 *
 * Hard rule: `<blackz-signature>` appears on every page. It is loaded `defer` so
 * it costs the embedding article nothing before paint.
 */

export const dynamic = 'force-dynamic';

/*
  Text and URLs are escaped by the shared helpers in `lib/html.ts`, not by a
  local pair written here. `safeUrlAttr` does more than escape: it refuses
  anything that is not https or a site-relative path, so a `javascript:` URL
  cannot reach an href even if one ever found its way into a slug. A class guard
  scans for URLs interpolated into attributes without it - and it caught this
  file when the hrefs went through plain escaping.
*/
const esc = escapeHtml;

const notFoundHtml = () =>
  `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">` +
  `<meta name="robots" content="noindex"><title>לא נמצא</title></head>` +
  `<body style="font-family:system-ui;padding:2rem;text-align:center;color:#241b4d">` +
  `<p>המסלול הזה לא זמין יותר.</p></body></html>`;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getPublicTrip(slug);
  if (found.state !== 'live') {
    return new Response(notFoundHtml(), {
      status: found.state === 'gone' ? 410 : 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
    });
  }

  const { record } = found;
  const preview = sharePreview({ name: '', days: record.snapshot.days });
  const month = monthLabel(record.snapshot.month);
  const pageUrl = canonical(`/trips/${record.slug}`);

  const dayRows = record.snapshot.days
    .map((d, i) => {
      const dest = destinations.find((x) => x.slug === d.citySlug);
      const names = d.placeIds
        .map((id) => dest?.places.find((p) => p.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      return (
        `<li class="day"><p class="dayTitle">יום ${i + 1}${dest ? ` · ${esc(dest.name)}` : ''}</p>` +
        `<p class="stops">${names.length ? esc(names.join(' · ')) : 'יום חופשי'}</p></li>`
      );
    })
    .join('');

  const meta = `${daysHe(record.snapshot.days.length)} · ${record.stopCount} עצירות${month ? ` · ${month}` : ''}`;

  const html =
    `<!doctype html><html lang="he" dir="rtl"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,follow">` +
    `<link rel="canonical" href="${safeUrlAttr(pageUrl)}">` +
    `<title>${esc(preview.title)} | טיול+</title>` +
    `<style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:12px;background:#fdf6ec;color:#241b4d;
        font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
      .card{background:#fffdf8;border:1px solid rgba(36,27,77,.1);border-radius:16px;padding:14px}
      h1{margin:.15rem 0 0;font-size:1.15rem;line-height:1.3}
      .kicker{margin:0;font-size:.7rem;font-weight:700;color:#e8482f}
      .meta{margin:.35rem 0 0;font-size:.78rem;font-weight:600;opacity:.72}
      ol{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
      .day{background:#fffdf8;border:1px solid rgba(36,27,77,.1);border-radius:12px;padding:10px}
      .dayTitle{margin:0;font-size:.85rem;font-weight:700}
      .stops{margin:.2rem 0 0;font-size:.78rem;line-height:1.5;opacity:.75}
      .cta{display:block;margin-top:10px;padding:11px;border-radius:12px;background:#ff5941;
        color:#fdf6ec;text-align:center;font-weight:700;text-decoration:none;font-size:.85rem}
      .sig{margin-top:10px;text-align:center}
    </style></head><body>` +
    `<div class="card"><p class="kicker">מסלול בטיול+</p>` +
    `<h1>${esc(preview.title)}</h1><p class="meta">${esc(meta)}</p></div>` +
    `<ol>${dayRows}</ol>` +
    /*
      target="_top" is the one navigation rule an embed must get right: without it
      the click loads our site inside the blogger's article.
    */
    `<a class="cta" href="${safeUrlAttr(pageUrl)}" target="_top" rel="noopener">למסלול המלא עם מפה בטיול+</a>` +
    `<div class="sig"><blackz-signature></blackz-signature></div>` +
    `<script src="/blackz-signature.js" defer></script>` +
    `</body></html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, follow',
      /*
        **The framing headers are NOT set here.** They were, and it did nothing:
        `next.config.ts` applies a blanket security-header rule to every path,
        and it replaced this route's CSP with the site-wide `frame-ancestors
        'self'` - plus an `x-frame-options: SAMEORIGIN` this route could not
        override at all. The iframe rendered blank, and the only evidence was a
        console message on the embedding site.

        The exclusion and the embed's own (narrower) policy now live in
        `next.config.ts`, which is the only layer that can actually win. Read
        that before changing anything about how this route is framed.
      */
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
