import Link from 'next/link';

/**
 * A shell for the site's content pages (terms, privacy, about, contact...).
 *
 * **It contains a heading and structure only, and deliberately holds no content.** Netanel
 * writes the text of each of these pages himself; a shell that arrives with "example"
 * wording is exactly what leaves generic legal text on a site until somebody gets sued.
 *
 * What is guaranteed here: the direction, the typography, the width, the link back, and
 * that the page will look like the rest of the site the moment it has content.
 */
export default function PageShell({
  title,
  children,
}: {
  title: string;
  /** The content Netanel will write. Empty = the "not written yet" state is shown. */
  children?: React.ReactNode;
}) {
  const empty = children === undefined || children === null || children === false;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl text-night sm:text-4xl">{title}</h1>

      {empty ? (
        /*
          The "not written yet" state, clearly marked.
          It looks like a placeholder and not like content - nobody will mistake it for the
          policy, and it is easy to see from the page list what is still missing.
        */
        <p className="mt-6 rounded-2xl bg-shell p-5 text-sm font-semibold leading-relaxed text-night/45 ring-1 ring-dashed ring-night/15">
          [למילוי] תוכן העמוד הזה עדיין לא נכתב.
        </p>
      ) : (
        <div className="mt-4 space-y-3 leading-relaxed text-night/75">{children}</div>
      )}

      <Link href="/" className="mt-10 inline-block font-bold text-sunset-deep hover:underline">
        ← חזרה לדף הבית
      </Link>
    </div>
  );
}
