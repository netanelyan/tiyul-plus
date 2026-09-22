import Link from 'next/link';
import SectionHead from '@/components/home/SectionHead';
import type { CollectionTile } from '@/lib/server/homeSections';

/**
 * Section 8 - the collection hubs as tiles.
 *
 * The hubs existed (they are the SEO layer's category pages) and nothing on
 * the homepage linked to them, so a visitor who thinks "somewhere for a family
 * with kids" rather than "Vienna" had no way in. The count on each tile is the
 * same number the hub page itself shows.
 */
export default function Collections({ tiles }: { tiles: CollectionTile[] }) {
  return (
    <section className="py-10">
      <SectionHead
        title="לפי סוג הטיול"
        subtitle="לא תמיד מחפשים עיר. לפעמים מחפשים חופשה עם ילדים, או אוכל, או היסטוריה."
        href="/collections"
        linkLabel="לכל האוספים"
      />

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.slug}>
            <Link
              prefetch={false}
              href={`/collections/${t.slug}`}
              className="card-pop flex h-full items-center gap-3 rounded-2xl bg-shell p-4 ring-1 ring-night/10 transition hover:ring-night/25"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zest/20 text-2xl"
              >
                {t.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold leading-snug text-night sm:text-base">
                  {t.title}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-night/70">{t.count} יעדים</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
