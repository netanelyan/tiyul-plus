import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TripProvider } from '@/lib/trip/TripContext';
import TripChip from '@/components/TripChip';
import './globals.css';

export const metadata: Metadata = {
  title: 'טיול+ | תכנון טיולים חכם לישראלים',
  description:
    'מסלולים בעברית עם מפה אינטראקטיבית, שכבת אוכל כשר ומידע פרקטי לישראלים: טיסות מנתב"ג, ויזות, סים ותשלומים.',
};

const navLinks = [
  { href: '/countries', label: 'יעדים' },
  { href: '/planner', label: 'מתכנן מסלולים' },
  { href: '/chat', label: 'צ׳אט טיולים' },
];

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
      </head>
      <body className="min-h-screen antialiased">
        <TripProvider>
        <header className="sticky top-0 z-50 border-b border-night/10 bg-cream/85 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-night">
              <span className="badge rounded-lg bg-zest/90 px-1.5 py-0.5 text-lg">🧭</span>
              <span>
                טיול<span className="text-sunset">+</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
                >
                  {l.label}
                </Link>
              ))}
              <TripChip />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </TripProvider>
        <footer className="mt-16 bg-night py-10 text-center print:hidden">
          <div className="text-lg font-bold text-cream">
            טיול<span className="text-sunset">+</span>
          </div>
          <p className="mt-2 text-xs text-cream/50">
            נתוני דוגמה להדגמה בלבד - לוודא כשרות, שעות ומחירים מול המקומות עצמם
          </p>
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
