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

// מוחל את הגדרות הנגישות השמורות עוד לפני הצביעה הראשונה (בלי הבזק).
const A11Y_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('tiyul-plus:a11y')||'{}');var el=document.documentElement;if(s.contrast)el.classList.add('a11y-contrast');if(s.grayscale)el.classList.add('a11y-grayscale');if(s.underlineLinks)el.classList.add('a11y-underline-links');if(s.highlightLinks)el.classList.add('a11y-highlight-links');if(s.spacing)el.classList.add('a11y-spacing');if(s.bigCursor)el.classList.add('a11y-cursor');if(s.noMotion)el.classList.add('a11y-no-motion');if(s.fontLevel)el.style.setProperty('--a11y-font-scale',String(1+s.fontLevel*0.12));}catch(e){}})();`;

const SITE_URL = 'https://www.tiyulplus.com';
const SITE_TITLE = 'טיול+ | סוכן הנסיעות החכם לישראלים';
const SITE_DESCRIPTION =
  'לא עוד מדריך לגלול בו - סוכן AI שבונה לכם טיול אמיתי: מספרים לו לאן ועם מי, והוא מתכנן מסלול יום-אחרי-יום על מפה אינטראקטיבית, בעברית - כולל שכבת אוכל כשר וכל מה שצריך לדעת מנתב"ג: ויזות, סים ותשלומים.';

/**
 * תצוגה מקדימה בוואטסאפ ובפייסבוק.
 *
 * ## הבאג
 *
 * נתנאל שלח קישור לאתר בוואטסאפ וקיבל את **הלוגו של Vercel** - עיגול שחור
 * עם משולש - ליד הכותרת והתיאור הנכונים של טיול+. שני דברים הרכיבו את זה:
 *
 * 1. לא היה `og:image` בכלל באתר, ולכן הסורק של וואטסאפ נפל חזרה לאייקון.
 * 2. `src/app/favicon.ico` היה עדיין **ברירת המחדל של create-next-app**,
 *    כלומר המשולש של Next/Vercel. `icon.svg` (מטוס הנייר) נוסף בסשן קודם
 *    אבל ה-ico לא הוחלף, והדפדפן מעדיף את ה-svg - ולכן זה לא נראה באתר
 *    עצמו והתגלה רק דרך שיתוף.
 *
 * שניהם תוקנו: `public/og.png` הוא תמונת שיתוף 1200x630 בפלטת האתר, וה-ico
 * נבנה מהלוגו האמיתי. ההרכב **ממורכז בכוונה** - וואטסאפ חותך את התצוגה
 * המקדימה הקטנה לריבוע, וכל עוד השם והסמל במרכז הם שורדים את החיתוך.
 *
 * `metadataBase` חייב להיות מוחלט: יחסי לא עובד בסורקים, וזה גם מה שהופך
 * את `images: ['/og.png']` לכתובת מלאה.
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
    // הרוחב והגובה מוצהרים כדי שוואטסאפ יבחר בכרטיס הגדול ולא בתמונה
    // הזעירה שלצד הכותרת
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'טיול+ - סוכן הנסיעות החכם לישראלים' }],
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: ['/og.png'] },
  /**
   * ## למה יש כאן manifest, וזה לא קוסמטיקה
   *
   * ה-service worker מחזיק את המסלול במטמון, אבל **סאפארי מוחקת אחסון
   * שנכתב מ-JavaScript אחרי כשבוע בלי אינטראקציה עם האתר** (ITP) -
   * localStorage וגם Cache API. כלומר בדיוק התרחיש של הפיצ׳ר, מטייל
   * שפתח את הטיול בבית ופותח אותו שוב בחו״ל, הוא התרחיש שבו המטמון
   * עלול להיעלם.
   *
   * אפליקציה שהותקנה למסך הבית מטופלת אחרת, ולכן ה-manifest וה-meta
   * של אפל הם מה שהופך את "אולי יישמר" ל"יישמר". `start_url` הוא
   * `/chat` כי זה המסך שממנו נפתח טיול - לא דף הבית.
   *
   * `apple-touch-icon` מוצהר במפורש: לאפל אין קונבנציית קובץ כאן והיא
   * מתעלמת מ-`icons` שב-manifest.
   */
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'טיול+', statusBarStyle: 'default' },
  // `icon` מוצהר כאן במפורש ולא נשען על קונבנציית הקובץ: **נמדד** שברגע
  // ש-`icons` קיים ב-metadata, הקישור ל-`icon.svg` שנגזר מהקובץ נעלם
  // מה-HTML ונשאר רק ה-ico. הצהרה מפורשת מחזירה את שניהם.
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  // Next מפיק רק את `mobile-web-app-capable` הלא-מתוילג. iOS מכבד
  // `display: standalone` מה-manifest מאז 11.3, וזה כאן בשביל מכשירים
  // ישנים יותר - שורה אחת שמסירה ספק.
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
        {/* מחיל הגדרות נגישות שמורות לפני הצביעה - בלי הבזק */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      {/* flex column: main נמתח והפוטר תמיד צמוד לתחתית - בלי פס ריק מתחתיו */}
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
