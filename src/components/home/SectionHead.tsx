import Link from 'next/link';

/**
 * One header for every homepage section: a heading, an optional line under
 * it, and a "see all" link at the far edge. Sections that were written one at
 * a time drifted into five different headers on the trip screen (2026-07-31
 * (ss)); the homepage gets the shared one from the start so it cannot.
 *
 * `tone="dark"` is for sections that sit on a night band.
 */
export default function SectionHead({
  title,
  subtitle,
  href,
  linkLabel = 'לכל הרשימה',
  tone = 'light',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className={`display text-2xl sm:text-3xl ${dark ? 'text-cream' : 'text-night'}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-1.5 text-sm sm:text-base ${dark ? 'text-cream/65' : 'text-night/70'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={`shrink-0 whitespace-nowrap text-sm font-bold transition ${
            dark ? 'text-zest hover:text-cream' : 'text-sunset-deep hover:text-night'
          }`}
        >
          {linkLabel} ←
        </Link>
      )}
    </div>
  );
}
