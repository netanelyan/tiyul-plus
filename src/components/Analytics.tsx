'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { analyticsActive, gaId, pageview, track } from '@/lib/analytics';

/**
 * Loads GA4 and reports page views and Web Vitals.
 *
 * ## It must not slow the site down, and here is precisely how that is met
 *
 * - **`strategy="afterInteractive"`** for gtag.js - which is Next's own
 *   recommendation for analytics, and it is an `async` script, so it still
 *   blocks nothing: not the first paint, not hydration.
 *
 *   It started as `lazyOnload`, which is later still. That was changed for a
 *   measured reason rather than a preference: **`lazyOnload` scripts are
 *   injected by the client after the load event, so the tag is nowhere in the
 *   HTML the server sends.** Google's own "we have not detected the tag"
 *   check, and every third-party tag scanner, looks at that HTML - so the site
 *   reported as having no analytics installed while the tag was working
 *   perfectly in a real browser. It also lost every visitor who left before
 *   the browser went idle.
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
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        onError={() => {
          console.info('[analytics] gtag.js did not load - continuing without it');
        }}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}',{send_page_view:false,anonymize_ip:true});`}
      </Script>
    </>
  );
}
