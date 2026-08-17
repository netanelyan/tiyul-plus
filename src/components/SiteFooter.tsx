import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  coverageCountsLine,
  footerCountries,
  footerDestinations,
  type FooterLink,
} from '@/lib/server/footerLinks';

/**
 * The footer. **A server component** - and that is not a technical detail:
 *
 * The destination and country links here are real internal links, and they need
 * to be in the HTML the server serves for them to be worth anything. A client
 * component would both hide them until hydration and drag the whole catalog into
 * the browser bundle - exactly the path that once shipped 492kB to every page on
 * the site via `SiteNav`.
 *
 * ## Why columns and not rows
 *
 * The previous version was a centred row of links: it looked like a list that had
 * assembled itself, and every extra link made that worse. Columns with a quiet
 * heading say that somebody decided what belongs where. The headings use the small
 * type size and a muted colour - the footer stays the quiet part of the page, not
 * a second navigation.
 *
 * ## Alignment
 *
 * `text-right` on the container, including on mobile. RTL alone aligns text to the
 * right, but the `text-center` that used to be here overrode it - so the alignment
 * is set explicitly and was checked in a browser at 390 against the column's real
 * right edge.
 */

/** One link group = one column */
function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-cream/40">{title}</h2>
      <ul className="mt-2 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-xs font-semibold text-cream/70 underline-offset-2 transition hover:text-cream hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * One chip row: a quiet label, the links, and at the end the way through to the full catalog.
 *
 * `flex-wrap` and not horizontal scrolling: a row that scrolls hides half its links
 * behind a gesture, and is hard to search through as well. On mobile it breaks into
 * two or three short rows, which is still a quarter of the height of a column.
 */
function ChipRow({
  label,
  links,
  more,
}: {
  label: string;
  links: FooterLink[];
  more: FooterLink;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
      <span className="ms-1 text-[11px] font-bold text-cream/35">{label}</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] font-semibold text-cream/70 ring-1 ring-cream/10 transition hover:bg-cream/15 hover:text-cream"
        >
          {l.label}
        </Link>
      ))}
      <Link
        href={more.href}
        className="px-1 text-[11px] font-bold text-cream/50 underline-offset-2 transition hover:text-cream hover:underline"
      >
        {more.label} ←
      </Link>
    </nav>
  );
}

const SITE: FooterLink[] = [
  { href: '/chat', label: 'תכנון טיול' },
  { href: '/countries', label: 'קטלוג היעדים' },
  { href: '/kosher', label: 'כשרות' },
  { href: '/about', label: 'אודות' },
  { href: '/contact', label: 'יצירת קשר' },
];

const POLICY: FooterLink[] = [
  { href: '/terms', label: 'תנאי שימוש' },
  { href: '/privacy', label: 'מדיניות פרטיות' },
  { href: '/cookies', label: 'עוגיות ונתוני שימוש' },
  { href: '/affiliate-disclosure', label: 'קישורי שותפים' },
  { href: '/refunds', label: 'ביטולים והחזרים' },
  { href: '/accessibility', label: 'הצהרת נגישות' },
];

/** Social networks. An empty `href` = rendered as muted text rather than a broken link. */
const SOCIAL: FooterLink[] = [
  { href: 'https://instagram.com/tiyulplus', label: 'אינסטגרם' },
  { href: 'https://facebook.com/tiyulplus', label: 'פייסבוק' },
  { href: 'https://tiktok.com/@tiyulplus', label: 'טיקטוק' },
];

export default function SiteFooter() {
  // Derived, not hardcoded. On static pages this is fixed at build time, and every deploy refreshes it.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-night pb-7 pt-10 print:hidden">
      <div className="mx-auto max-w-6xl px-5 text-right">
        {/*
          Two columns already on a phone, not only from sm. Four lists in a single
          column are 31 links stacked, i.e. a footer taller than the screen - a
          "wall" in exactly the sense we set out to avoid. Measured in a screenshot
          at 390.
        */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-12">
          {/* Brand + the travel disclaimer (stays here) + newsletter signup */}
          <div className="col-span-2 lg:col-span-6">
            <div className="flex items-center gap-2 text-lg font-bold text-cream">
              <Logo reversed className="h-6 w-6" />
              <span>
                טיול<span className="text-sunset">+</span>
              </span>
            </div>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-cream/50">
              טיול+ הוא סוכן AI שבונה מסלולים אוטומטית. תמיד כדאי לאמת שעות פתיחה, מחירים,
              זמינות וכשרות מול המקומות עצמם לפני הנסיעה.
            </p>
          </div>

          <div className="lg:col-span-3">
            <Column title="האתר" links={SITE} />
          </div>
          <div className="lg:col-span-3">
            <Column title="מדיניות" links={POLICY} />
          </div>
        </div>

        {/*
          ---------- Destinations and countries: chip rows, not columns ----------

          Two long columns dominated the footer and made it heavy. Exactly the same
          links, in two horizontal rows: the same value to a reader and to search,
          at a third of the height.

          **Nothing here collapses or opens on click.** These are ordinary links in
          the HTML the server serves - which is the entire reason they are in the footer.
        */}
        <div className="mt-6 space-y-2">
          <ChipRow
            label="יעדים"
            links={footerDestinations}
            more={{ href: '/countries', label: 'כל היעדים' }}
          />
          <ChipRow
            label="מדינות"
            links={footerCountries}
            more={{ href: '/countries', label: 'כל המדינות' }}
          />
        </div>

        {/*
          ---------- The bottom row ----------
          Fully centred. The columns above are right-aligned because they are lists
          you read, and this row is a signature: coverage, copyright, disclosure and
          seal. Right-aligned it looked like one more column that ran out halfway.
        */}
        <div className="mt-7 border-t border-cream/10 pt-4 text-center">
          {/* Catalog coverage, counted from the data on every build */}
          <p className="text-xs font-semibold text-cream/45">{coverageCountsLine()}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-cream/45">
            <span>© {year} טיול+</span>
            <span aria-hidden className="text-cream/20">
              ·
            </span>
            {SOCIAL.map((s) =>
              s.href ? (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline-offset-2 transition hover:text-cream hover:underline"
                >
                  {s.label}
                </a>
              ) : (
                // With no real address: text, not a link that leads nowhere
                <span key={s.label} className="text-cream/25" title="בקרוב">
                  {s.label}
                </span>
              ),
            )}
          </div>

          {/*
            Affiliate disclosure - small and at the bottom, as Netanel asked. It is
            still on every page: someone who clicks a booking button does not
            necessarily pass through the dedicated page.

            **"May" and not "do", and that is precision rather than caution**: a
            commission is paid only on a link carrying a valid attribution, and right
            now all six providers in `bookingProviders` are clean public links with no
            identifier - there is not yet a single real affiliate id in the
            environment. The identical wording appears in `bookingSearch.ts` and in
            the panels, and there is a test asserting it says both "commission" and
            "does not affect".
          */}
          <p className="mt-3 text-[11px] leading-relaxed text-cream/30">
            חלק מהקישורים היוצאים מהאתר הם קישורי שותפים, ואנחנו עשויים לקבל עמלה - בלי שזה משפיע
            על מה שאנחנו ממליצים.{' '}
            <Link href="/affiliate-disclosure" className="underline hover:text-cream/60">
              פירוט מלא
            </Link>
            .
          </p>

          {/*
            BlackZ - the network's signature (trademark, appears on every page).

            **Bottom spacing, not just centring.** The floating accessibility button
            sits `fixed bottom-4 start-4`, i.e. in the bottom-right corner of the
            screen under RTL - exactly where the badge at the footer's right edge
            ended up. This was not only a phone problem: the container is `max-w-6xl`,
            so below about 1192px it touches the screen edge and the two overlap.
            Centring moves the badge away from the side the button occupies at every
            width, and the spacing adds margin even if the button grows.
          */}
          <div className="mt-4 pb-10 text-center sm:pb-6">
            <blackz-signature></blackz-signature>
          </div>
        </div>
      </div>
    </footer>
  );
}
