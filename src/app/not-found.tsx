import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/Logo';
import { catalogCounts } from '@/lib/server/footerLinks';

/**
 * The global 404 - `app/not-found.tsx` is Next's convention for a route that does not exist
 * at all, so it runs on the server and returns a real 404 status, not just a page that looks
 * like one. Deliberately a server component, like SiteFooter: nothing here needs a client, and
 * the coverage numbers (`catalogCounts`) are already computed on the server anyway.
 *
 * `robots: noindex` because a broken URL should not accumulate in search results, but
 * `follow: true` so Google still follows from here back to the homepage and the catalog.
 */
export const metadata: Metadata = {
  title: 'הדף לא נמצא | טיול+',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center px-4 py-16 text-center sm:py-24">
      {/* A subtle warm wash, the same tokens as the homepage hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[320px] w-full max-w-3xl rounded-full bg-[radial-gradient(55%_55%_at_50%_35%,rgba(255,89,65,0.08),rgba(255,197,49,0.05)_55%,transparent_78%)]"
      />

      <div className="rise-in flex h-16 w-16 items-center justify-center rounded-2xl bg-shell ring-1 ring-night/10">
        <Logo className="h-8 w-8 rotate-[130deg]" />
      </div>

      <span className="badge rise-in mt-5 rounded-full bg-sunset/10 px-3.5 py-1 text-xs font-bold text-sunset-deep">
        ✈️ טיסה שירדה מהמסלול
      </span>
      <p className="display rise-in mt-4 text-5xl text-night sm:text-6xl">404</p>
      <h1 className="display rise-in mt-2 text-2xl text-night sm:text-3xl">הדף הזה לא נמצא</h1>
      <p className="rise-in mt-4 max-w-md leading-relaxed text-night/60">
        בדקנו מול כל {catalogCounts.destinations} היעדים ב-{catalogCounts.countries} המדינות
        שיש לנו - הכתובת הזו פשוט לא ביניהם. אולי הקישור נשבר בהעתקה, ואולי הוקלדה כתובת
        שלא קיימת.
      </p>

      <div className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
        >
          חזרה לדף הבית
        </Link>
        <Link
          href="/chat"
          className="rounded-xl bg-shell px-6 py-3 font-bold text-night ring-1 ring-night/10 transition hover:bg-night/5"
        >
          לשוחח עם הסוכן
        </Link>
      </div>
      <Link
        href="/countries"
        className="mt-5 text-sm font-semibold text-night/50 underline decoration-night/20 underline-offset-4 transition hover:text-night"
      >
        או לגלוש בקטלוג היעדים ←
      </Link>
    </div>
  );
}
