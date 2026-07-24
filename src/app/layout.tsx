import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TripProvider } from '@/lib/trip/TripContext';
import SiteNav from '@/components/SiteNav';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import Logo from '@/components/Logo';
import './globals.css';

// מוחל את הגדרות הנגישות השמורות עוד לפני הצביעה הראשונה (בלי הבזק).
const A11Y_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('tiyul-plus:a11y')||'{}');var el=document.documentElement;if(s.contrast)el.classList.add('a11y-contrast');if(s.grayscale)el.classList.add('a11y-grayscale');if(s.underlineLinks)el.classList.add('a11y-underline-links');if(s.highlightLinks)el.classList.add('a11y-highlight-links');if(s.spacing)el.classList.add('a11y-spacing');if(s.bigCursor)el.classList.add('a11y-cursor');if(s.noMotion)el.classList.add('a11y-no-motion');if(s.fontLevel)el.style.setProperty('--a11y-font-scale',String(1+s.fontLevel*0.12));}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'טיול+ | סוכן הנסיעות החכם לישראלים',
  description:
    'לא עוד מדריך לגלול בו - סוכן AI שבונה לכם טיול אמיתי: מספרים לו לאן ועם מי, והוא מתכנן מסלול יום-אחרי-יום על מפה אינטראקטיבית, בעברית - כולל שכבת אוכל כשר וכל מה שצריך לדעת מנתב"ג: ויזות, סים ותשלומים.',
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
        {/* מחיל הגדרות נגישות שמורות לפני הצביעה - בלי הבזק */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      {/* flex column: main נמתח והפוטר תמיד צמוד לתחתית - בלי פס ריק מתחתיו */}
      <body className="flex min-h-screen flex-col antialiased">
        <TripProvider>
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
            <SiteNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        </TripProvider>
        <AccessibilityWidget />
        <footer className="mt-16 bg-night py-10 text-center print:hidden">
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-cream">
            <Logo reversed className="h-6 w-6" />
            <span>
              טיול<span className="text-sunset">+</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-cream/50">
            נתוני דוגמה להדגמה בלבד - לוודא כשרות, שעות ומחירים מול המקומות עצמם
          </p>
          <Link
            href="/accessibility"
            className="mt-3 inline-block text-xs font-semibold text-cream/70 underline-offset-2 transition hover:text-cream hover:underline"
          >
            הצהרת נגישות
          </Link>
          {/* BlackZ - חתימת הרשת (טריידמארק, מופיע בכל עמוד) */}
          <div className="mt-4">
            <blackz-signature></blackz-signature>
          </div>
        </footer>
        <Script src="/blackz-signature.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
