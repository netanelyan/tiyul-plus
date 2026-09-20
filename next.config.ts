import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * HSTS is already set (by Vercel); these six were not. The one not to skip is
 * x-frame-options: the site has a login flow, and without it any page can be
 * framed and clickjacked.
 *
 * ## Why the CSP is report-only
 *
 * A content policy that blocks something real breaks the page silently for
 * every visitor, and this site loads from several origins it genuinely needs:
 * Leaflet's tiles, Google's fonts, Wikimedia and Unsplash photographs,
 * flagcdn, Supabase and the PayPal SDK. Report-only publishes exactly the same
 * policy and blocks nothing - violations appear in the browser console, so the
 * list below can be corrected against real traffic before it is enforced.
 *
 * To enforce it later: rename the header to `content-security-policy`. Do that
 * only after the console is quiet on the homepage, a destination page, the
 * trip screen and a real checkout.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  /*
    'unsafe-inline' is required rather than sloppy: Next injects inline
    bootstrap scripts, and this app adds its own (the accessibility settings
    are applied before first paint precisely to avoid a flash). Removing it
    needs per-request nonces, which a statically prerendered page cannot have.
  */
  "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  [
    "img-src 'self' data: blob:",
    'https://upload.wikimedia.org',
    'https://images.unsplash.com',
    'https://flagcdn.com',
    'https://tile.openstreetmap.org',
    'https://*.tile.openstreetmap.org',
    'https://www.paypalobjects.com',
  ].join(' '),
  "connect-src 'self' https://*.supabase.co https://*.supabase.in",
  "frame-src 'self' https://www.paypal.com",
  // The machine-readable twin of x-frame-options, and the one modern browsers
  // actually consult.
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://www.paypal.com",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'x-frame-options', value: 'SAMEORIGIN' },
  { key: 'x-content-type-options', value: 'nosniff' },
  { key: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
  /*
    Nothing here uses a camera, a microphone or payment request APIs, and the
    map never asks for location - the traveller types where they are going.
    Denying them costs nothing and removes them from any embedded third party.
  */
  {
    key: 'permissions-policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  /*
    same-origin-allow-popups rather than same-origin: the share action opens a
    WhatsApp window and then navigates it, and the strict value puts a popup in
    its own browsing-context group. This keeps the cross-origin isolation that
    matters and leaves that flow working.
  */
  { key: 'cross-origin-opener-policy', value: 'same-origin-allow-popups' },
  { key: 'content-security-policy-report-only', value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  // Turns off Next's floating dev indicator - it looks like a broken tab at the edge of
  // the screen when testing the dev server from a phone on the local network. Dev only anyway.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
