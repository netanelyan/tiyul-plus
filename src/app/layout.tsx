import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import SiteFooter from '@/components/SiteFooter';
import { TripProvider } from '@/lib/trip/TripContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import AccountSync from '@/components/AccountSync';
import VisitPing from '@/components/VisitPing';
import LoginGate from '@/components/LoginGate';
import OfflineNotice from '@/components/OfflineNotice';
import SiteNav from '@/components/SiteNav';
import { cityNames } from '@/lib/server/cityNames';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import Logo from '@/components/Logo';
import { Heebo } from 'next/font/google';
import './globals.css';

/**
 * The site font, self-hosted by Next at build time.
 *
 * It used to be a render-blocking <link> to fonts.googleapis.com plus two
 * preconnects - 118KB over 6 requests from a third origin, before anything
 * could paint. Two things were measured and are gone rather than merely
 * moved: **Yellowtail and Space Grotesk were requested and used nowhere in
 * the codebase**, and Heebo 300 had no callers either (`font-light` appears
 * zero times).
 *
 * What is left is the five weights the site actually uses. Self-hosting also
 * removes an origin the browser had to contact on every visit, which is one
 * fewer third party in the privacy policy rather than only a speed change.
 */
const heebo = Heebo({
  // Hebrew first: it is the product's language and the subset that must not
  // arrive late.
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-heebo',
});

// Applies the saved accessibility settings before the first paint (no flash).
const A11Y_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('tiyul-plus:a11y')||'{}');var el=document.documentElement;if(s.contrast)el.classList.add('a11y-contrast');if(s.grayscale)el.classList.add('a11y-grayscale');if(s.underlineLinks)el.classList.add('a11y-underline-links');if(s.highlightLinks)el.classList.add('a11y-highlight-links');if(s.spacing)el.classList.add('a11y-spacing');if(s.bigCursor)el.classList.add('a11y-cursor');if(s.noMotion)el.classList.add('a11y-no-motion');if(s.fontLevel)el.style.setProperty('--a11y-font-scale',String(1+s.fontLevel*0.12));}catch(e){}})();`;

const SITE_URL = 'https://www.tiyulplus.com';
const SITE_TITLE = 'טיול+ | סוכן הנסיעות החכם לישראלים';
const SITE_DESCRIPTION =
  'לא עוד מדריך לגלול בו - סוכן AI שבונה לכם טיול אמיתי: מספרים לו לאן ועם מי, והוא מתכנן מסלול יום-אחרי-יום על מפה אינטראקטיבית, בעברית - כולל שכבת אוכל כשר וכל מה שצריך לדעת מנתב"ג: ויזות, סים ותשלומים.';

/**
 * Link previews in WhatsApp and Facebook.
 *
 * ## The bug
 *
 * Netanel shared a link to the site in WhatsApp and got **the Vercel logo**
 * - a black circle with a triangle - next to tiyul+'s correct title and
 * description. Two things composed it:
 *
 * 1. There was no `og:image` anywhere on the site, so WhatsApp's scraper
 *    fell back to the icon.
 * 2. `src/app/favicon.ico` was still **the create-next-app default**, i.e.
 *    the Next/Vercel triangle. `icon.svg` (the paper plane) was added in an
 *    earlier session but the ico was never replaced, and the browser
 *    prefers the svg - which is why it never showed on the site itself and
 *    was only discovered through a share.
 *
 * Both were fixed: `public/og.png` is a 1200x630 share image in the site's
 * palette, and the ico was built from the real logo. The composition is
 * **centered on purpose** - WhatsApp crops the small preview to a square,
 * and as long as the name and the mark are in the center they survive the
 * crop.
 *
 * `metadataBase` must be absolute: relative does not work in scrapers, and
 * it is also what turns `images: ['/og.png']` into a full URL.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'טיול+',
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // The width and height are declared so WhatsApp picks the large card
    // rather than the tiny image beside the title
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'טיול+ - סוכן הנסיעות החכם לישראלים' }],
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: ['/og.png'] },
  /**
   * ## Why there is a manifest here, and it is not cosmetic
   *
   * The service worker keeps the itinerary in cache, but **Safari deletes
   * storage written from JavaScript after about a week without interaction
   * with the site** (ITP) - localStorage and the Cache API alike. In other
   * words the feature's exact scenario - a traveler who opened the trip at
   * home and opens it again abroad - is the scenario in which the cache may
   * vanish.
   *
   * An app installed to the home screen is treated differently, so the
   * manifest and Apple's meta are what turn "might survive" into "will
   * survive". `start_url` is `/chat` because that is the screen a trip
   * opens from - not the homepage.
   *
   * `apple-touch-icon` is declared explicitly: Apple has no file convention
   * here and ignores the manifest's own `icons`.
   */
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'טיול+', statusBarStyle: 'default' },
  // `icon` is declared here explicitly rather than relying on the file
  // convention: it was **measured** that the moment `icons` exists in
  // metadata, the link to `icon.svg` derived from the file disappears from
  // the HTML and only the ico remains. An explicit declaration brings back
  // both.
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  // Next emits only the unprefixed `mobile-web-app-capable`. iOS honors
  // `display: standalone` from the manifest since 11.3, and this is here
  // for older devices - one line that removes doubt.
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'impact-site-verification': '69f26c97-ed70-44c2-913f-3376cc0b34f2',
  },
  /**
   * Canonical for the homepage. Child routes override this with their own; the
   * point of having it here is that the site had **no canonical tag anywhere**,
   * so any URL that picked up a tracking parameter was a separate page as far
   * as a crawler was concerned.
   */
  alternates: { canonical: SITE_URL },
  /**
   * Google Search Console site verification.
   *
   * The value is read from an env var so it can be filled in without a code
   * change - paste the content string (the bare token, not the whole tag) into
   * `NEXT_PUBLIC_GSC_VERIFICATION` in the Vercel project settings and redeploy.
   * When it is unset the key is omitted entirely rather than emitted empty: an
   * empty verification tag is not neutral, it is a tag Google reads and
   * rejects.
   *
   * `NEXT_PUBLIC_` is required because this is inlined at build time. The token
   * is not a secret - it ends up in the served HTML by design.
   *
   * Note this is only needed for the HTML-tag verification method. If the
   * domain is verified by DNS instead, leave it unset - see SEO_NEXT_STEPS.md,
   * which recommends DNS for this setup.
   */
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <head>
        {/* Applies saved accessibility settings before paint - no flash */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      {/* flex column: main stretches and the footer always sits flush at the bottom - no empty band beneath it */}
      <body className="flex min-h-screen flex-col antialiased">
        <AuthProvider>
        <TripProvider>
        {/*
          Skip to content. First in the tab order, invisible until it has
          focus, and then a real visible control - a skip link that stays
          hidden while focused is the classic non-fix, because a sighted
          keyboard user cannot see where they are.

          It matters more here than on a typical site: the header carries a
          search control, five nav links, the trips menu and the account
          button, so without it every page begins with the same eight stops
          before the content.
        */}
        <a
          href="#main"
          className="sr-only z-[90] rounded-xl bg-night px-4 py-2.5 font-bold text-cream focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          דילוג לתוכן הראשי
        </a>
        <AccountSync />
        <VisitPing />
        {/*
          Mounted once, here, rather than per surface: a modal is a singleton by
          nature, and anything below can open it by calling requestLogin(). It
          renders nothing until something does.
        */}
        <LoginGate />
        <header className="sticky top-0 z-50 border-b border-night/10 bg-cream/85 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-night">
              <Logo className="h-7 w-7" />
              <span>
                טיול<span className="text-sunset">+</span>
              </span>
              <span className="hidden self-center text-xs font-medium text-night/40 sm:inline">
                · סוכן הנסיעות החכם
              </span>
            </Link>
            <SiteNav cityNames={cityNames()} />
          </div>
        </header>
        <OfflineNotice />
        {/*
          page-main carries the bottom clearance for the accessibility button
          and the device's safe area - see globals.css. It replaces the bottom
          half of py-8, so the top padding is set on its own.
        */}
        <main id="main" tabIndex={-1} className="page-main mx-auto w-full max-w-6xl flex-1 px-4 pt-8">{children}</main>
        </TripProvider>
        </AuthProvider>
        <AccessibilityWidget />
        <SiteFooter />
        {/*
          lazyOnload rather than afterInteractive: this is a 12KB branding
          badge in the footer, and afterInteractive makes Next preload it on
          every page - so it competed for bandwidth with the content on a
          screen it is not even on yet. lazyOnload drops the preload and waits
          for idle. The custom element renders nothing until it is defined,
          so arriving late costs nothing.
        */}
        <Script src="/blackz-signature.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
