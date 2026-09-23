import { SOCIAL_PROFILES, type SocialKey } from '@/lib/seo/site';

/**
 * The brand's social accounts, as buttons.
 *
 * ## Why buttons rather than the words they were
 *
 * They were three words in the footer's signature row, at `text-cream/50`,
 * between the copyright and the affiliate disclosure - i.e. formatted exactly
 * like the small print they sat in. A social account is somewhere we want
 * people to actually go, and it read as a legal footnote.
 *
 * ## Icons are inline paths, not a dependency
 *
 * Same rule the rest of this codebase follows (the nav, the dropdown, the
 * action row): three glyphs do not justify an icon package, and a package
 * would ship every other glyph in it as well. They are `currentColor` so the
 * one hover rule below colours them.
 *
 * ## Accessibility
 *
 * The glyph is `aria-hidden` and the accessible name is the Hebrew label on
 * the link, because "Instagram" as an image has no meaning to a screen reader
 * and the icon alone would leave the link nameless. The target is 44px, the
 * same floor every other touch target on this site clears.
 */
const ICONS: Record<SocialKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.6 8.2V6.6c0-.8.5-1 .9-1h2.2V2.3h-3c-3 0-3.6 2.2-3.6 3.7v2.2H9v3.3h2.1V22h3.5v-10.5h2.6l.4-3.3z" />
  ),
  tiktok: (
    <path d="M16.2 2.5c.4 2.3 1.9 3.9 4.3 4.1v2.9c-1.5.1-2.9-.3-4.2-1.1v5.9c0 4.3-3.5 6.5-6.6 5.6-3-.9-4.4-4.2-3.3-7 .9-2.3 3.2-3.5 5.6-3.2v3c-.4-.1-.8-.2-1.2-.1-1.3.1-2.3 1.2-2.2 2.5.1 1.2 1.1 2.2 2.4 2.2 1.3 0 2.3-1 2.3-2.4V2.5z" />
  ),
};

export default function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="הרשתות החברתיות שלנו" className={`flex items-center gap-2 ${className}`}>
      {SOCIAL_PROFILES.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          title={s.label}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-cream/10 text-cream/80 ring-1 ring-cream/15 transition hover:bg-cream/20 hover:text-cream hover:ring-cream/40"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-5 w-5"
            /*
              Instagram is drawn as outlines and the other two as solid shapes,
              so the fill/stroke defaults are set per icon rather than once
              here - a single rule would either hollow out TikTok or blob the
              Instagram frame into a square.
            */
            fill={s.key === 'instagram' ? 'none' : 'currentColor'}
            stroke={s.key === 'instagram' ? 'currentColor' : 'none'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[s.key]}
          </svg>
        </a>
      ))}
    </nav>
  );
}
