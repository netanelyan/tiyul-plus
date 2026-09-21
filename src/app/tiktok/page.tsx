import type { Metadata } from 'next';
import {
  TIKTOK_REDIRECT_URI,
  TIKTOK_SCOPES,
  tiktokConfig,
} from '@/lib/server/tiktok';

/**
 * /tiktok - the connect entry point, and the first thing on camera.
 *
 * Not linked from the public navigation, as asked: it is reachable at a real
 * URL on the registered domain and presentable, which is what the review
 * needs. It is noindex so it does not accumulate in search results.
 *
 * It states what the connection grants before anybody presses the button,
 * because that is the screen a reviewer is looking at while deciding whether
 * the integration is what it claims to be.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'חיבור חשבון טיקטוק | טיול+',
  description: 'חיבור חשבון הטיקטוק של טיול+ לשירות הפרסום הפנימי.',
  robots: { index: false, follow: false },
};

export default async function TikTokConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const configError = one(sp.error) === 'config' ? one(sp.missing) : null;
  const cfg = tiktokConfig();
  const ready = cfg.ok;

  return (
    <div className="rise-in mx-auto max-w-lg">
      <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10 sm:p-8">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-night text-2xl"
        >
          🎵
        </span>
        <h1 className="display mt-4 text-2xl text-night sm:text-3xl">חיבור חשבון טיקטוק</h1>
        <p className="mt-3 leading-relaxed text-night/70">
          החיבור מאפשר לשירות הפרסום של טיול+ להעלות מצגות תמונות לחשבון הטיקטוק שלנו. זהו
          שימוש פנימי בחשבון שלנו בלבד - לא מתפרסם דבר בשם משתמשי האתר.
        </p>

        <div className="mt-5 rounded-2xl bg-cream p-4 ring-1 ring-night/10">
          <p className="text-xs font-bold text-night/45">ההרשאות שיתבקשו</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-start gap-2 text-sm text-night/75">
              <span aria-hidden className="mt-0.5 text-lagoon-deep">
                ✓
              </span>
              <span>
                <span dir="ltr" className="font-mono font-bold">
                  user.info.basic
                </span>{' '}
                - לזהות לאיזה חשבון התחברנו
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-night/75">
              <span aria-hidden className="mt-0.5 text-lagoon-deep">
                ✓
              </span>
              <span>
                <span dir="ltr" className="font-mono font-bold">
                  video.publish
                </span>{' '}
                - להעלות את המצגות
              </span>
            </li>
          </ul>
        </div>

        {configError && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-sunset/10 px-4 py-3 text-sm font-semibold text-sunset-deep"
          >
            החיבור לא מוגדר בשרת. חסר:{' '}
            <span dir="ltr" className="font-mono">
              {configError}
            </span>
          </p>
        )}

        {/*
          A plain link, not a form: /tiktok/connect is a GET that 302s to
          TikTok, and a link is what a reviewer expects to click.
        */}
        <a
          href="/tiktok/connect"
          aria-disabled={!ready}
          className={`mt-6 inline-block rounded-xl px-6 py-3.5 font-bold text-cream transition ${
            ready ? 'bg-sunset hover:bg-sunset-deep' : 'pointer-events-none bg-night/30'
          }`}
        >
          התחבר לטיקטוק
        </a>

        {!ready && !configError && (
          <p className="mt-3 text-sm font-semibold text-night/55">
            הכפתור יופעל אחרי שיוגדרו משתני הסביבה בשרת.
          </p>
        )}

        <p className="mt-6 border-t border-night/10 pt-4 text-xs leading-relaxed text-night/45">
          כתובת ההחזרה הרשומה:{' '}
          <span dir="ltr" className="font-mono">
            {TIKTOK_REDIRECT_URI}
          </span>
          <br />
          היקף ההרשאה:{' '}
          <span dir="ltr" className="font-mono">
            {TIKTOK_SCOPES}
          </span>
        </p>
      </div>
    </div>
  );
}
