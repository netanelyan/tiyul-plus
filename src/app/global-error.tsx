'use client';

import { useEffect, useRef, useState } from 'react';
import { referenceCode, reportClientError, shouldReport } from '@/lib/reportClientError';

/**
 * The last resort: the root layout itself failed.
 *
 * `app/error.tsx` renders **inside** the layout, so it can only help when the
 * layout worked. When the failure is in the layout - the providers, the fonts,
 * the nav - Next throws that boundary away and renders this one instead,
 * replacing the whole document. Which is why this file declares its own
 * `<html>` and `<body>`: there is no layout left to supply them.
 *
 * ## Everything here is inline, and that is the design
 *
 * No Tailwind class, no imported component, no CSS file, no image. By the time
 * this renders, whatever the app relies on has already failed once, and every
 * dependency added here is another way for the error page itself to be blank.
 * The colours are the brand tokens written out as hex for the same reason - a
 * `var(--color-night)` resolves to nothing if `globals.css` is the thing that
 * did not load, and the text would render invisible.
 *
 * `dir="rtl"` and `lang="he"` are set here too: they normally come from the
 * layout, and without them this page would be the one screen on the site that
 * renders Hebrew left to right.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reported = useRef(false);
  const [code] = useState(() => referenceCode(error.digest));

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    console.error('[global-error]', error);
    if (!shouldReport(error)) return;
    reportClientError({
      kind: 'client-fatal',
      message: error.message || 'unknown root error',
      path: typeof window === 'undefined' ? undefined : window.location.pathname,
    });
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fdf6ec',
          color: '#241b4d',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          padding: '24px',
        }}
      >
        <main style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', lineHeight: 1 }} aria-hidden>
            ✈️
          </div>
          <h1 style={{ fontSize: '24px', margin: '16px 0 0', fontWeight: 800 }}>
            האתר נתקל בתקלה
          </h1>
          <p style={{ margin: '14px 0 0', lineHeight: 1.7, color: '#4a4270' }}>
            זו תקלה אצלנו. <strong style={{ color: '#241b4d' }}>הטיול שלכם שמור</strong> - הוא
            נשמר במכשיר שלכם, ותקלה בטעינת האתר לא מוחקת אותו. אפשר לרענן, ואם זה חוזר -
            לנסות שוב בעוד כמה דקות.
          </p>

          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#c9301c',
                color: '#fdf6ec',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              לנסות שוב
            </button>
            {/*
              A plain <a>, not next/link, and the lint rule is overridden
              rather than obeyed.

              `<Link>` does a client-side navigation, which reuses the very
              JavaScript runtime that just failed fatally enough to destroy the
              root layout. A full document load is the point: it throws all of
              that away and starts clean. This is the one screen on the site
              where the slower navigation is the correct one.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#fffdf8',
                color: '#241b4d',
                fontWeight: 700,
                fontSize: '16px',
                textDecoration: 'none',
                border: '1px solid rgba(36,27,77,0.12)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              חזרה לדף הבית
            </a>
          </div>

          <p style={{ marginTop: '28px', fontSize: '12px', color: '#5b5384' }}>
            קוד לתמיכה:{' '}
            <code dir="ltr" style={{ userSelect: 'all', fontFamily: 'monospace' }}>
              {code}
            </code>
          </p>
        </main>
      </body>
    </html>
  );
}
