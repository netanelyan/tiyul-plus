import type { PhotoCredit } from '@/lib/server/photoCredit';

/**
 * The photo credits for a page.
 *
 * ## Why a collapsed block rather than a caption per image
 *
 * Both satisfy the licence. A caption under every card would put a line of
 * attribution under 38 photographs on a destination page, which buries the
 * content the page is for - and CC BY is satisfied by attribution that is
 * "reasonable to the medium", which for a gallery is a credits list that names
 * every photograph and links each to its source.
 *
 * What it must not be is hidden from a crawler or from a reader without
 * JavaScript, so it is a plain `<details>` element: closed by default, in the
 * HTML the server sends, opened without a single line of script.
 *
 * ## What each row says, and why
 *
 * The licence requires the author and the licence name, and expects a link to
 * the licence deed and to the original. All four are here. A file whose author
 * Commons does not record says so rather than inventing one - 48 of 2,978 -
 * and public-domain files are listed too, where the credit is a courtesy
 * rather than a condition.
 */
export default function PhotoCredits({ credits }: { credits: PhotoCredit[] }) {
  if (credits.length === 0) return null;

  return (
    <details className="mt-10 rounded-2xl bg-night/[0.03] p-4 print:hidden">
      <summary className="cursor-pointer text-sm font-bold text-night/70">
        קרדיטים לתמונות ({credits.length})
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-night/70">
        התמונות בעמוד הזה מגיעות מוויקישיתוף (Wikimedia Commons), ומוצגות בהתאם לרישיון של כל
        תמונה. לחיצה על שם הקובץ פותחת את עמוד המקור עם פרטי הרישיון המלאים.
      </p>
      {/*
        `break-all` on the filename, and it is a real fix rather than tidying.

        A Commons filename is one unbroken token and some are very long - e.g.
        "(Venice)_Doge's_Palace_and_campanile_of_St._Mark's_Basilica_...". With no
        break opportunity the link extends past the viewport: measured at 390px it ran
        from x=-103 to x=342 in a 390px viewport, i.e. off the start edge of an RTL
        page. The page did not scroll horizontally (something upstream clips it), which
        is exactly why this survived - it is invisible to a page-level overflow check
        and visible to anyone actually reading the credits on a phone.

        Pre-existing on every page that renders credits, which includes the 30 promoted
        destination pages already in the sitemap. `break-all` rather than `break-words`
        because the latter will not break a single token that has no spaces in it.
      */}
      <ul className="mt-3 space-y-1.5">
        {credits.map((c) => (
          <li key={c.file} className="text-xs leading-relaxed text-night/70">
            <a
              href={c.descriptionUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="break-all font-semibold text-night/75 underline-offset-2 hover:text-sunset-deep hover:underline"
            >
              {c.file}
            </a>
            {' · '}
            {c.artist ? (
              <span dir="auto">{c.artist}</span>
            ) : (
              <span className="text-night/65">היוצר לא מצוין בוויקישיתוף</span>
            )}
            {c.license && (
              <>
                {' · '}
                {c.licenseUrl ? (
                  <a
                    href={c.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer license"
                    dir="ltr"
                    className="underline-offset-2 hover:text-sunset-deep hover:underline"
                  >
                    {c.license}
                  </a>
                ) : (
                  <span dir="ltr">{c.license}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
