import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flag from '@/components/Flag';
import CardPhoto from '@/components/CardPhoto';
import { canonical, metaDescription } from '@/lib/seo/site';
import { HUBS, hubBySlug, hubMembers } from '@/lib/seo/hubs';
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
      <nav aria-label="מיקום באתר" className="text-sm text-night/55">
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
      <p className="mt-2 text-sm text-night/55">{members.length} יעדים באוסף הזה.</p>

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
                <p className="mt-1 text-xs text-night/55">
                  {card.country} · {daysHe(card.days)} · {card.places} מקומות
                  {card.kosher > 0 && ` · ${card.kosher} כשרים`}
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-night/75">
                  {dest.tagline}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

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
