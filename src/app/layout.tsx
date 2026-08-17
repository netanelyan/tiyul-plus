import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import SiteFooter from '@/components/SiteFooter';
import { TripProvider } from '@/lib/trip/TripContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import AccountSync from '@/components/AccountSync';
import VisitPing from '@/components/VisitPing';
import OfflineNotice from '@/components/OfflineNotice';
import SiteNav from '@/components/SiteNav';
import { cityNames } from '@/lib/server/cityNames';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import Logo from '@/components/Logo';
import './globals.css';

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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Yellowtail&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        {/* Applies saved accessibility settings before paint - no flash */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      {/* flex column: main stretches and the footer always sits flush at the bottom - no empty band beneath it */}
      <body className="flex min-h-screen flex-col antialiased">
        <AuthProvider>
        <TripProvider>
        <AccountSync />
        <VisitPing />
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        </TripProvider>
        </AuthProvider>
        <AccessibilityWidget />
        <SiteFooter />
        <Script src="/blackz-signature.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
