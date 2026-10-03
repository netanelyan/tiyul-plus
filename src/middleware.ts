import { NextResponse, type NextRequest } from 'next/server';
import { publicTripStatus } from '@/lib/server/publicTripStatus';

/**
 * The only job of this middleware: answer **410 Gone** for a published trip the
 * owner has withdrawn.
 *
 * ## Why middleware at all
 *
 * Next 16 can produce 404 (`notFound()`), 403 (`forbidden()`) and 401
 * (`unauthorized()`) from a page, and **not 410** - there is no `gone()`. A page
 * component cannot set its own status code. So the one place in the request path
 * that can is here.
 *
 * It matters which of 404 and 410 we send. 404 means "not here, try again some
 * time"; 410 means "this is finished, drop it". When somebody withdraws a page
 * about their own holiday, "drop it, and stop re-checking" is precisely the
 * instruction we want to give, and it is what the owner was promised.
 *
 * ## Deliberately narrow, and deliberately fail-open
 *
 * The matcher covers `/trips/` and nothing else, so no other route pays for this.
 * `publicTripStatus` returns `'unknown'` on **every** failure - unconfigured,
 * timeout, bad response - and only an explicit `'gone'` produces a 410. A live
 * page must never be told to disappear because a database call was slow.
 *
 * `/t/` and `/join/` are untouched by this file, as are the robots rules.
 */

/** Matches /trips/<slug> and nothing deeper. The embed route has its own path. */
const TRIP_PATH = /^\/trips\/([^/]+)\/?$/;

export async function middleware(request: NextRequest) {
  const match = TRIP_PATH.exec(request.nextUrl.pathname);
  if (!match) return NextResponse.next();

  const status = await publicTripStatus(decodeURIComponent(match[1]));
  if (status !== 'gone') return NextResponse.next();

  /*
    A readable body rather than an empty 410: a person who followed a bookmark
    deserves a sentence, and a crawler reads the status rather than the body
    either way. `noindex` is belt and braces - a 410 already removes the URL.
  */
  return new NextResponse(
    `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">` +
      `<meta name="robots" content="noindex"><title>הטיול הוסר | טיול+</title></head>` +
      `<body style="font-family:system-ui;background:#fdf6ec;color:#241b4d;text-align:center;padding:4rem 1.5rem">` +
      `<h1 style="font-size:1.5rem">הטיול הזה הוסר מהאתר</h1>` +
      `<p style="opacity:.75">מי שפרסם אותו בחר להוריד אותו, וזו זכותו המלאה.</p>` +
      `<p><a href="/" style="color:#ff5941;font-weight:700">לדף הבית של טיול+</a></p>` +
      `</body></html>`,
    { status: 410, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } },
  );
}

export const config = {
  matcher: '/trips/:path*',
};
