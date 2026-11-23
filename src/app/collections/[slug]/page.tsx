import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flag from '@/components/Flag';
import CardPhoto from '@/components/CardPhoto';
import { canonical, metaDescription } from '@/lib/seo/site';
import { breadcrumbLd, collectionLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { HUBS, PESACH, hubBySlug, hubMembers } from '@/lib/seo/hubs';
import { heDateRange, heDayMonth, heWeekday } from '@/lib/seo/pesach';
import { isDomestic, travelFactTitle } from '@/lib/domestic';
import { promotedMembers } from '@/lib/seo/hubData';
import { daysHe } from '@/lib/duration';

export function generateStaticParams() {
  return HUBS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = hubBySlug(slug);
  if (!hub) return {};
  const members = hubMembers(hub, promotedMembers());
  const url = canonical(`/collections/${hub.slug}`);
  const title = `${hub.title} | טיול+`;
  // The count is in the description because it is true and because it is the
  // one thing a searcher wants to know before clicking a list.
  const description = metaDescription(`${members.length} יעדים.`, hub.intro);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'he_IL', siteName: 'טיול+', url, title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = hubBySlug(slug);
  if (!hub) notFound();
  const members = hubMembers(hub, promotedMembers());

  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'טיול+', path: '/' },
            { name: 'אוספי יעדים', path: '/collections' },
            { name: hub.title, path: `/collections/${hub.slug}` },
          ]),
          collectionLd(
            hub.title,
            `/collections/${hub.slug}`,
            members.map((m) => ({ name: m.card.name, slug: m.card.slug })),
          ),
        ]}
      />
      <nav aria-label="מיקום באתר" className="text-sm text-night/70">
        <Link href="/" className="transition hover:text-night">
          טיול+
        </Link>{' '}
        /{' '}
        <Link href="/collections" className="transition hover:text-night">
          אוספי יעדים
        </Link>{' '}
        / {hub.title}
      </nav>

      <h1 className="display mt-4 text-3xl text-night sm:text-4xl">
        <span aria-hidden="true">{hub.emoji}</span> {hub.title}
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-night/75">{hub.intro}</p>
      <p className="mt-2 text-sm text-night/70">{members.length} יעדים באוסף הזה.</p>

      {hub.slug === 'pesach' && PESACH && <PesachDates />}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map(({ card, dest }) => (
          <li key={card.slug}>
            <Link
              href={`/destinations/${card.slug}`}
              className="group block overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10 transition hover:ring-night/25"
            >
              <CardPhoto photo={card.photo} className="photo-bg relative h-32" />
              <div className="p-4">
                <h2 className="font-bold text-night">
                  {card.flag && <Flag flag={card.flag} label={card.country} className="me-2" />}
                  {card.name}
                </h2>
                <p className="mt-1 text-xs text-night/70">
                  {card.country} · {daysHe(card.days)} · {card.places} מקומות
                  {card.kosher > 0 && ` · ${card.kosher} כשרים`}
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-night/75">
                  {dest.tagline}
                </p>
                {/*
                  How far it is, which is the first thing an Israeli asks about
                  any destination. Abroad the text itself opens with the flight,
                  so it carries no label; a domestic member gets travelFactTitle's,
                  so it never reads as a flight.
                */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-night/65">
                  {isDomestic(dest) && <span className="font-semibold">{travelFactTitle(dest, '')} · </span>}
                  {dest.practical.flights}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hub.slug === 'pesach' && PESACH && (
        <div className="mt-8 rounded-2xl bg-night px-6 py-6 text-center">
          <p className="font-bold text-cream">יודעים כבר מי נוסע ולכמה ימים?</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-cream/70">
            ספרו לסוכן, והוא בונה מסלול לחופשת הפסח על מפה, עם המקומות הכשרים שיש לנו בקטלוג.
          </p>
          <Link
            href={`/chat?q=${encodeURIComponent(pesachQuestion())}`}
            className="mt-4 inline-block rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
          >
            מתכננים את פסח {PESACH.year}
          </Link>
        </div>
      )}

      {/*
        Sibling hubs. This is what turns twelve isolated lists into a browsable
        set - and it is also how a crawler that lands on one hub finds the other
        eleven without going back to the index.
      */}
      <div className="mt-12 border-t border-night/10 pt-8">
        <h2 className="display text-xl text-night">אוספים נוספים</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {HUBS.filter((h) => h.slug !== hub.slug).map((h) => (
            <li key={h.slug}>
              <Link
                href={`/collections/${h.slug}`}
                className="inline-block rounded-full bg-shell px-4 py-2 text-sm text-night/80 ring-1 ring-night/10 transition hover:ring-night/30"
              >
                <span aria-hidden="true">{h.emoji}</span> {h.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The opening line handed to the agent from the Pesach hub. */
function pesachQuestion(): string {
  if (!PESACH) return '';
  const range = PESACH.schoolBreak
    ? ` (${heDateRange(PESACH.schoolBreak.from, PESACH.schoolBreak.to)})`
    : '';
  return `אנחנו מתכננים טיול בחופשת פסח ${PESACH.year}${range}. איזה יעד מתאים לנו?`;
}

/** Two dates as "<day> and <day> <month>", or both in full across a month boundary. */
function twoDays(a: string, b: string): string {
  return a.slice(0, 7) === b.slice(0, 7)
    ? `${Number(a.slice(8, 10))} ו-${heDayMonth(b)}`
    : `${heDayMonth(a)} ו-${heDayMonth(b)}`;
}

/**
 * The dates a family plans Passover around. The festival is computed
 * (lib/seo/pesach.ts); the school break is the ministry's and is shown only for
 * a year that has been copied in and checked.
 */
function PesachDates() {
  if (!PESACH) return null;
  const p = PESACH;
  return (
    <section className="mt-6 rounded-2xl bg-shell p-5 ring-1 ring-night/10">
      <h2 className="font-bold text-night">התאריכים של פסח {p.year}</h2>
      <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-night">ליל הסדר</dt>
          <dd className="mt-1 leading-relaxed text-night/75">
            {heWeekday(p.seder)}, {heDayMonth(p.seder)} בערב
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-night">החג</dt>
          <dd className="mt-1 leading-relaxed text-night/75">
            {heDateRange(p.firstDay, p.seventhDay)}
            {p.secondDayAbroad && p.lastDayAbroad && (
              <>
                . בחו״ל שומרים גם יום שני של חג בתחילתו ובסופו ({twoDays(p.secondDayAbroad, p.lastDayAbroad)}),
                וישראלים שנמצאים שם נוהגים בזה בצורות שונות
              </>
            )}
          </dd>
        </div>
        {p.schoolBreak && (
          <div>
            <dt className="font-semibold text-night">חופשת בתי הספר</dt>
            <dd className="mt-1 leading-relaxed text-night/75">
              {heDateRange(p.schoolBreak.from, p.schoolBreak.to)}, וחוזרים ללימודים ב-
              {heDayMonth(p.schoolBreak.back)}, לפי{' '}
              <a href={p.schoolBreak.source} className="underline hover:text-night" rel="noopener" target="_blank">
                לוח החופשות של משרד החינוך
              </a>
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-night/75">
        מסעדות כשרות בחו״ל נוטות לסגור בפסח או לעבור לתפריט כשר לפסח, ובהרבה ערים בית חב״ד עורך
        סדר פתוח לציבור. זה משתנה משנה לשנה, אז כדאי לוודא מול המקום לפני שסוגרים טיסה.
      </p>
    </section>
  );
}
