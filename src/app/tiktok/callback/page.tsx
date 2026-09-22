import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  STATE_COOKIE,
  TIKTOK_REDIRECT_URI,
  forwardCodeToBot,
  stateMatches,
  tiktokConfig,
  type BotConnectResult,
} from '@/lib/server/tiktok';

/**
 * GET /tiktok/callback - where TikTok sends the user back.
 *
 * A page rather than a route handler on purpose: it is filmed for the app
 * review, so it has to be the site - Hebrew, RTL, the real header and footer -
 * rather than a bare JSON body or a white page.
 *
 * Four outcomes, and none of them is a stack trace:
 *   1. the user denied     -> TikTok sends `error` + `error_description`
 *   2. the state is wrong  -> refuse, do not touch the code
 *   3. the bot failed      -> say so, offer to retry
 *   4. connected           -> name the account and the granted scopes
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'חיבור לטיקטוק | טיול+',
  robots: { index: false, follow: false },
};

function Shell({
  tone,
  title,
  children,
}: {
  tone: 'ok' | 'bad';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rise-in mx-auto max-w-lg">
      <div
        className={`rounded-3xl bg-shell p-6 ring-1 sm:p-8 ${
          tone === 'ok' ? 'ring-lagoon/40' : 'ring-sunset/40'
        }`}
      >
        <span
          aria-hidden
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
            tone === 'ok' ? 'bg-lagoon/15' : 'bg-sunset/10'
          }`}
        >
          {tone === 'ok' ? '✓' : '!'}
        </span>
        <h1 className="display mt-4 text-2xl text-night">{title}</h1>
        <div className="mt-3 space-y-3 leading-relaxed text-night/70">{children}</div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/tiktok"
            className="rounded-xl bg-night px-4 py-2.5 text-sm font-bold text-cream transition hover:bg-night/85"
          >
            חזרה לעמוד החיבור
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-night/5 px-4 py-2.5 text-sm font-bold text-night/70 transition hover:bg-night/10"
          >
            לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

/** A granted scope, shown as a chip so the reviewer can read them at a glance. */
function Scopes({ scopes }: { scopes: string[] }) {
  if (scopes.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-night/65">ההרשאות שניתנו</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {scopes.map((s) => (
          <li
            key={s}
            dir="ltr"
            className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold text-lagoon-deep"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function TikTokCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const error = one(sp.error);
  const errorDescription = one(sp.error_description);
  const code = one(sp.code);
  const state = one(sp.state);
  // The docs call this `scopes` (plural) on the callback; the token response
  // calls the same thing `scope`. Both are read, the token one preferred.
  const callbackScopes = one(sp.scopes) ?? '';

  /* 1. The user said no, or TikTok refused. Not an error page - an outcome. */
  if (error) {
    return (
      <Shell tone="bad" title="החיבור לא הושלם">
        <p>
          לא אישרתם את החיבור, או שטיקטוק סירב לבקשה. לא נשמר כלום ואפשר לנסות שוב בכל רגע.
        </p>
        {errorDescription && (
          <p className="rounded-xl bg-night/[0.04] px-3 py-2 text-sm text-night/70" dir="auto">
            {errorDescription}
          </p>
        )}
      </Shell>
    );
  }

  /*
    2. CSRF. The cookie is scoped to /tiktok and lives ten minutes, so the
    usual cause of a mismatch is a stale tab or a link somebody pasted -
    both of which deserve the same answer: start again from the connect page.
    The code is deliberately not touched on this path.
  */
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  if (!stateMatches(expected, state)) {
    return (
      <Shell tone="bad" title="הבקשה לא אומתה">
        <p>
          הפרמטר שמאמת שהבקשה יצאה מכאן (<span dir="ltr">state</span>) לא תואם, או שפג תוקפו.
          זה קורה כשהדף היה פתוח יותר מעשר דקות, או כשנכנסים לכתובת הזאת ישירות במקום דרך
          כפתור החיבור.
        </p>
        <p className="font-semibold text-night">לא ביצענו שום פעולה מול טיקטוק.</p>
      </Shell>
    );
  }

  if (!code) {
    return (
      <Shell tone="bad" title="לא התקבל קוד הרשאה">
        <p>טיקטוק החזיר אותנו בלי קוד. אפשר לנסות להתחבר שוב.</p>
      </Shell>
    );
  }

  const cfg = tiktokConfig();
  if (!cfg.ok) {
    return (
      <Shell tone="bad" title="החיבור לא מוגדר בשרת">
        <p>
          חסרה הגדרה בצד השרת, ולכן לא ניתן להשלים את החיבור. המשתנים החסרים:{' '}
          <span dir="ltr" className="font-mono text-sm font-bold text-night">
            {cfg.missing.join(', ')}
          </span>
        </p>
      </Shell>
    );
  }

  /*
    3. Hand the code to the bot, which owns the client secret and performs the
    exchange. `code` here is already URL-decoded by Next, which is the form
    the token endpoint wants - decoding it again would corrupt it.
  */
  const outcome = await forwardCodeToBot(cfg.config, {
    code,
    scopes: callbackScopes,
    redirect_uri: TIKTOK_REDIRECT_URI,
  });

  if (outcome.kind !== 'ok') {
    return (
      <Shell tone="bad" title="ההרשאה התקבלה, אבל השמירה נכשלה">
        <p>
          טיקטוק אישר את החיבור, אבל לא הצלחנו להעביר אותו לשירות הפרסום.{' '}
          <strong>קוד ההרשאה תקף לזמן קצר בלבד</strong>, ולכן צריך להתחיל את החיבור מחדש ולא
          לרענן את הדף הזה.
        </p>
        <p className="rounded-xl bg-night/[0.04] px-3 py-2 text-sm text-night/70" dir="ltr">
          {outcome.kind === 'unreachable'
            ? `bot unreachable (${outcome.error})`
            : `bot responded ${outcome.status}: ${outcome.error}`}
        </p>
      </Shell>
    );
  }

  const r: BotConnectResult = outcome.result;
  const granted = (r.scope ?? callbackScopes)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  /*
    The account name comes from the bot only if it also called user.info. If it
    did not, the open_id is shown instead - naming an account we were not told
    about would be a caption invented for a camera.
  */
  const handle = r.username ?? r.display_name ?? null;

  return (
    <Shell tone="ok" title={handle ? `מחובר כ-@${handle}` : 'החיבור לטיקטוק הושלם'}>
      <p>
        חשבון הטיקטוק חובר בהצלחה לשירות הפרסום של טיול+, והרשאת הפרסום נשמרה בצד השרת.
      </p>
      <Scopes scopes={granted} />
      {!handle && r.open_id && (
        <p className="text-sm text-night/70">
          מזהה החשבון:{' '}
          <span dir="ltr" className="font-mono font-bold text-night/70">
            {r.open_id}
          </span>
        </p>
      )}
      {typeof r.expires_in === 'number' && (
        <p className="text-sm text-night/70">
          ההרשאה תקפה ל-{Math.round(r.expires_in / 3600)} שעות ומתחדשת אוטומטית.
        </p>
      )}
    </Shell>
  );
}
