import Link from 'next/link';
import Logo from '@/components/Logo';
import { catalogCounts } from '@/lib/server/footerLinks';

/**
 * The 404 body, shared by every not-found boundary on the site.
 *
 * It lives in a component because there is more than one boundary and they
 * were not the same page. `/nonexistent` rendered this; `/destinations/atlantis`
 * returned a correct 404 status and then shipped **no <h1> at all** - the
 * content existed only inside the RSC flight payload, so a crawler, or anyone
 * without JavaScript, got a blank page with a 404 on it.
 *
 * A segment that calls notFound() needs its own not-found boundary for the
 * body to be server-rendered into the HTML. Each one now renders this.
 */
export default function NotFoundView() {
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
      <p className="rise-in mt-4 max-w-md leading-relaxed text-night/70">
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
        className="mt-5 text-sm font-semibold text-night/65 underline decoration-night/20 underline-offset-4 transition hover:text-night"
      >
        או לגלוש בקטלוג היעדים ←
      </Link>
    </div>
  );
}
