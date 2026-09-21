import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * HSTS is already set (by Vercel); these six were not. The one not to skip is
 * x-frame-options: the site has a login flow, and without it any page can be
 * framed and clickjacked.
 *
 * ## The CSP is now ENFORCED, and what that did and did not cost
 *
 * It shipped report-only first, deliberately: a content policy that blocks
 * something real breaks the page silently for every visitor, and this site
 * loads from several origins it genuinely needs - Leaflet's tiles, Wikimedia
 * and Unsplash photographs, flagcdn and Supabase.
 *
 * Before enforcing, the policy was measured rather than reasoned about: every
 * page below was loaded in a real browser with the header ENFORCING and the
 * console captured, and the violation count was zero. What makes that cheap to
 * trust is a property of the two payment flows rather than of the list - **both
 * PayPal checkout and the TikTok authorize are top-level navigations**, and a
 * top-level navigation is not subject to CSP at all (`navigate-to` was removed
 * from the spec and never shipped). So the one flow that could not be exercised
 * from here is also the one the policy cannot break.
 *
 * `frame-src`/`form-action` still name PayPal, because those cover the shapes
 * a future embedded checkout would take, and removing them would make adding
 * one a silent breakage instead of a no-op.
 *
 * To roll back in a hurry: rename the header on line ~90 back to
 * `content-security-policy-report-only`. Nothing else has to change.
 */
const CSP = [
  "default-src 'self'",
  /*
    'unsafe-inline' is required rather than sloppy: Next injects inline
    bootstrap scripts, and this app adds its own (the accessibility settings
    are applied before first paint precisely to avoid a flash). Removing it
    needs per-request nonces, which a statically prerendered page cannot have.
  */
  "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com",
  "style-src 'self' 'unsafe-inline'",
  // Self-hosted since the font move - no Google origin to allow.
  "font-src 'self' data:",
  [
    "img-src 'self' data: blob:",
    // Our own photo mirror. Every catalog photograph is served from here once
    // NEXT_PUBLIC_PHOTO_MIRROR_BASE is set; upload.wikimedia.org stays allowed
    // because it is the fallback until the mirror is complete, and because the
    // map popup and the lightbox can still reach for the original.
    'https://*.public.blob.vercel-storage.com',
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
  { key: 'content-security-policy', value: CSP },
];

const nextConfig: NextConfig = {
  // Turns off Next's floating dev indicator - it looks like a broken tab at the edge of
  // the screen when testing the dev server from a phone on the local network. Dev only anyway.
  devIndicators: false,
  /**
   * Catalog photographs go through `next/image`.
   *
   * `remotePatterns` is an allowlist, not a convenience: without the entry the
   * optimiser refuses the URL outright, so a missing host is a page full of
   * broken images rather than a slow one.
   *
   * - the Blob store is our own mirror (see `src/lib/photoMirror.ts`)
   * - `upload.wikimedia.org` is what every catalog URL still points at, and is
   *   what renders until the mirror is populated and switched on
   * - Unsplash covers the handful of country heroes that never came from Commons
   *
   * `deviceSizes` is deliberately short. Next generates one transformation per
   * width per image, and the default list has eight entries - across ~3,000
   * catalog photographs that is a large number of billable transformations for
   * variants nobody can tell apart. Five widths, chosen to cover a phone at DPR
   * 2-3, a tablet and a wide hero, is the same visual result for a fraction of
   * the work. `minimumCacheTTL` is a year because a catalog photograph at a
   * given URL never changes: the mirror path is derived from the filename, so a
   * different photograph is a different URL.
   */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
