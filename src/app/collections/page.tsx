import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo/site';
import { HUBS, hubMembers } from '@/lib/seo/hubs';
import { promotedMembers } from '@/lib/seo/hubData';

const TITLE = 'אוספי יעדים - לפי אופי הטיול | טיול+';
const DESCRIPTION =
  'יעדים מסודרים לפי מה שמחפשים: אוכל כשר, טיול משפחתי, טבע, היסטוריה, אמנות, חופשה קצרה - כל אוסף בנוי מהמקומות שבאמת יש בכל יעד.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonical('/collections') },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'טיול+',
    url: canonical('/collections'),
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

/**
 * The hub index.
 *
 * Its job is structural as much as editorial: it gives every hub one inbound
 * link from a page that is itself in the sitemap, so a crawler reaches all
 * twelve from the homepage in two hops.
 */
export default function CollectionsIndex() {
  const members = promotedMembers();

  return (
    <div className="mx-auto max-w-5xl">
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

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUBS.map((hub) => {
          const count = hubMembers(hub, members).length;
          return (
            <li key={hub.slug}>
              <Link
                href={`/collections/${hub.slug}`}
                className="block h-full rounded-2xl bg-shell p-5 ring-1 ring-night/10 transition hover:ring-night/30"
              >
                <h2 className="font-bold text-night">
                  <span aria-hidden="true">{hub.emoji}</span> {hub.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-night/70">{hub.intro}</p>
                <p className="mt-3 text-xs font-bold text-night/50">{count} יעדים</p>
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
