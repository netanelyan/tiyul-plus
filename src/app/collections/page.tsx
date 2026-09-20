import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo/site';
import { breadcrumbLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { HUBS, hubMembers } from '@/lib/seo/hubs';
import { promotedMembers } from '@/lib/seo/hubData';
import { leadPhotos } from '@/lib/seo/hubLead';
import CardPhoto from '@/components/CardPhoto';

const TITLE = 'אוספי יעדים - לפי אופי הטיול | טיול+';
const DESCRIPTION =
  'יעדים מסודרים לפי מה שמחפשים: אוכל כשר, טיול משפחתי, טבע, היסטוריה, אמנות, חופשה קצרה - כל אוסף בנוי מהמקומות שבאמת יש בכל יעד.';

/*
  Through the shared helper, which is what puts the share image back. This
  page had the canonical right and served no og:image at all: declaring an
  openGraph block replaces the parent's rather than merging into it, so its
  images went with it and a WhatsApp share of this page had no picture.
*/
export const metadata: Metadata = pageMetadata({
  path: '/collections',
  title: TITLE,
  description: DESCRIPTION,
});

/**
 * The hub index.
 *
 * Its job is structural as much as editorial: it gives every hub one inbound
 * link from a page that is itself in the sitemap, so a crawler reaches all
 * twelve from the homepage in two hops.
 */
export default function CollectionsIndex() {
  const members = promotedMembers();
  const lead = leadPhotos(members);

  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd
        data={breadcrumbLd([
          { name: 'טיול+', path: '/' },
          { name: 'אוספי יעדים', path: '/collections' },
        ])}
      />
      <nav aria-label="מיקום באתר" className="text-sm text-night/55">
        <Link href="/" className="transition hover:text-night">
          טיול+
        </Link>{' '}
        / אוספי יעדים
      </nav>

      <h1 className="display mt-4 text-3xl text-night sm:text-4xl">אוספי יעדים</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-night/75">
        לא תמיד מחפשים עיר - לפעמים מחפשים סוג של טיול. האוספים כאן בנויים מהמקומות שבאמת
        יש בכל יעד בקטלוג שלנו, ולא מרשימה שמישהו כתב מהזיכרון.
      </p>

      {/*
        Each collection leads with a photograph of a destination that is
        actually in it.

        This page used to be twelve text tiles, and it was the only page in the
        catalog layer with no pictures at all - on a travel site, where the
        collection pages it links to carry 38 photographs each. The photo is not
        decoration: it is the one part of the card that says what a collection
        like "nature" or "kosher food" looks like before you click, and it costs
        nothing: `hubMembers` already resolves every member and each card already
        carries its own verified `photo`.

        `CardPhoto` rather than a background-image, for the reason entry (ff)
        records: a background image cannot be lazily loaded, and twelve of them
        would all fetch on load.
      */}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUBS.map((hub) => {
          const inHub = hubMembers(hub, members);
          return (
            <li key={hub.slug}>
              <Link
                href={`/collections/${hub.slug}`}
                className="group block h-full overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10 transition hover:ring-night/30"
              >
                <CardPhoto photo={lead.get(hub.slug)} className="photo-bg relative h-28" />
                <div className="p-5">
                  <h2 className="font-bold text-night">
                    <span aria-hidden="true">{hub.emoji}</span> {hub.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-night/70">{hub.intro}</p>
                  <p className="mt-3 text-xs font-bold text-night/50">{inHub.length} יעדים</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-sm text-night/60">
        מחפשים לפי מדינה?{' '}
        <Link href="/countries" className="font-bold text-night underline">
          קטלוג המדינות
        </Link>{' '}
        · מחפשים אוכל כשר?{' '}
        <Link href="/kosher" className="font-bold text-night underline">
          מדריך הכשרות
        </Link>
      </p>
    </div>
  );
}
