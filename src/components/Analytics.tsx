'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { analyticsActive, gaId, pageview, track } from '@/lib/analytics';

/**
 * Loads GA4 and reports page views and Web Vitals.
 *
 * ## It must not slow the site down - and `afterInteractive` did
 *
 * This block used to claim that `strategy="afterInteractive"` on gtag.js
 * "blocks nothing: not the first paint, not hydration". That was reasoning
 * from the attribute rather than from a measurement, and it was wrong.
 *
 * Measured 2026-10-03 on the homepage, headless Edge at 390px, 4x CPU
 * throttle and a slow-4G profile - i.e. a mid-range phone - by blocking
 * googletagmanager at the network layer and changing nothing else:
 *
 * | | first contentful paint | main thread blocked before paint |
 * |---|---|---|
 * | gtag.js via afterInteractive | 6,700-8,732ms | 2,868-5,904ms |
 * | gtag.js blocked | 2,896-2,912ms | 1,343-1,588ms |
 *
 * **Analytics was costing about four seconds of blank cream screen**, and it
 * was the single largest cost on the page - a CPU profile put 1,511ms of self
 * time in gtag.js alone. `async` only means the script does not block the
 * HTML parser; it does not stop ~100KB of third-party JavaScript from
 * monopolising the main thread in the window where the browser would
 * otherwise have painted. On a desktop with a fast CPU the effect is
 * invisible, which is why it survived this long.
 *
 * ## What replaces it, without losing what afterInteractive was protecting
 *
 * `lazyOnload` is NOT the answer, for the reason recorded when it was removed:
 * it injects the tag from the client after the load event, so the tag is
 * nowhere in the HTML the server sends. Google's own "we have not detected
 * the tag" check and every third-party scanner read that HTML, so the site
 * reported as having no analytics at all. It also waits for full idle, which
 * on this page was ~10s - losing every visitor who left before then.
 *
 * So the two concerns are separated, because they were never actually the
 * same concern:
 *
 * - **The URL stays in the server HTML** as `<link rel="preload" as="script">`.
 *   A scanner reading the markup finds the exact gtag URL where it expects it,
 *   and the browser warms the connection and the cache - at `fetchPriority`
 *   low, so it never competes with the content for bandwidth. A preload does
 *   not execute, which is the entire point: downloading gtag.js was never the
 *   expensive part, running it was.
 * - **Execution waits for the first paint**, then runs on the first idle
 *   moment with a hard 2s cap, so a busy tab still reports rather than waiting
 *   for an idle that may never come. Because it was preloaded it starts from
 *   cache the instant it is asked for.
 *
 * **No hit is lost by arriving later.** The two inline scripts below still run
 * at `afterInteractive` and they are what defines `gtag()` and queues the
 * consent default, the `js` event and the `config` onto `dataLayer`. That is
 * an array. gtag.js replays the whole queue when it loads - that is how the
 * snippet is designed to work - so a visitor who leaves after one second is
 * recorded exactly as before.
 *
 * - **No `useSearchParams`.** This renders in the root layout, and
 *   `useSearchParams` in a layout opts **every statically generated page out
 *   of static rendering** - all 270 of them would start rendering per request.
 *   That would be a genuine, site-wide slowdown caused by the measurement.
 *   The query string is read from `window.location` inside the effect instead,
 *   which is the same information with none of the cost.
 * - **The inline scripts touch no network.** They push onto an array.
 *
 * ## Every failure mode is silent, on purpose
 *
 * - **No id, no script.** Without `NEXT_PUBLIC_GA_ID` this renders `null` and
 *   the site is byte-for-byte what it is today.
 * - **An ad blocker is expected, not an error.** Roughly a third of visitors
 *   will block gtag.js; `dataLayer.push` still succeeds into an array nobody
 *   reads, nothing throws, and the product does not notice.
 * - **`onError` is handled** rather than left to bubble - unhandled, it would
 *   now reach the error boundary and the alerting built in the previous
 *   session, i.e. measurement paging somebody because Google was blocked.
 *
 * ## Manual page views, and why
 *
 * `send_page_view: false`. GA's automatic pageview fires once on load, and
 * this is a single-page app - homepage to `/chat` to a trip to `/premium` is
 * zero page loads. Without this the entire site reports as one page view per
 * session, which is the most common way GA data on an app is quietly wrong.
 */
export default function Analytics() {
  const id = gaId();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  /*
    Load gtag.js itself, after the first paint rather than during it - see the
    measurement at the top of this file.

    `requestAnimationFrame` fires before the paint it belongs to, so the
    callback is pushed one task further out with `setTimeout`; by then the
    browser has painted. From there `requestIdleCallback` waits for a genuinely
    free moment, capped at 2s so a tab that never goes idle still reports.
    Safari only shipped requestIdleCallback recently, so it falls back to the
    timeout alone.

    The script is appended rather than rendered through next/script because
    next/script's strategies are exactly the two choices this is replacing.
  */
  useEffect(() => {
    if (!id) return;
    if (document.getElementById('ga-loader')) return;

    let cancelled = false;
    let waits = 0;
    const start = () => {
      if (cancelled) return;
      /*
        The consent default must be queued BEFORE gtag.js runs, or the first
        ping leaves under the wrong state. `ga-consent` is an afterInteractive
        inline script and in practice runs long before this idle callback - but
        "in practice" is not an ordering guarantee, so wait for the `gtag` it
        defines instead of racing it. Bounded at ~1s: if the inline script was
        blocked outright, loading anyway under the denied default is better
        than never loading.
      */
      if (typeof (window as { gtag?: unknown }).gtag !== 'function' && waits < 20) {
        waits += 1;
        window.setTimeout(start, 50);
        return;
      }
      const s = document.createElement('script');
      s.id = 'ga-loader';
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      // Handled rather than left to bubble: unhandled it reaches the error
      // boundary, i.e. measurement paging somebody because Google was blocked.
      s.onerror = () => console.info('[analytics] gtag.js did not load - continuing without it');
      document.head.appendChild(s);
    };

    const idle = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(start, { timeout: 2000 });
      } else {
        window.setTimeout(start, 1200);
      }
    };

    // One frame past the first paint, then idle.
    const raf = window.requestAnimationFrame(() => window.setTimeout(idle, 0));
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    /*
      Read the query string here rather than through useSearchParams - see the
      note above. `pathname` alone drives the effect, which is correct for this
      app: the only query strings that matter (`?q=`, `?trip=`) are consumed
      and then cleaned off the URL by the screen that reads them.
    */
    const path = pathname + (window.location.search || '');
    // A re-render on the same path is not a new page view.
    if (lastPath.current === path) return;
    lastPath.current = path;
    pageview(path);
  }, [id, pathname]);

  /*
    Web Vitals into the same property, so "is the site slow for real people" is
    answerable from the same dashboard as everything else - measured on real
    devices and real networks rather than in a lab.

    Rounded because CLS needs three decimals to mean anything and the
    millisecond metrics do not, and GA4 handles integer parameters better.
  */
  useReportWebVitals((metric) => {
    if (!analyticsActive()) return;
    track('web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating ?? 'unknown',
    });
  });

  if (!id) return null;

  return (
    <>
      {/*
        The consent default has to be queued BEFORE gtag.js runs, or the first
        ping leaves under the wrong state. This is an inline push onto
        dataLayer - no network, no parsing cost worth measuring - and it is
        ordered ahead of the loader.

        It reads localStorage directly rather than importing the helper,
        because it has to execute as a string in the page. `CONSENT_KEY` in
        lib/analytics.ts is the same literal, and a test asserts they match so
        the two copies cannot drift.

        It defines `gtag` and calls it, rather than pushing an array literal
        onto dataLayer. That is load-bearing, not cosmetic: gtag.js reads the
        `arguments` object its own snippet pushes and **silently ignores a real
        Array**. The first version of this file pushed an array, so the consent
        default never reached gtag at all - measured on production, where an
        array push produced zero `g/collect` requests and the arguments form
        produced one in the same page. See the note on `push()` in
        lib/analytics.ts.
      */}
      <Script id="ga-consent" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{analytics_storage:(function(){try{return localStorage.getItem('tiyul-plus:analytics-consent')==='granted'?'granted':'denied'}catch(e){return'denied'}})(),ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`}
      </Script>
      {/*
        The tag's URL, in the server-sent HTML, where scanners look for it -
        and a warm connection plus a primed cache for the deferred load above.
        `as="script"` with no execution; `fetchPriority="low"` so it yields to
        the content. React hoists this into <head>.
      */}
      <link
        rel="preload"
        as="script"
        href={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        fetchPriority="low"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}',{send_page_view:false,anonymize_ip:true});`}
      </Script>
    </>
  );
}
