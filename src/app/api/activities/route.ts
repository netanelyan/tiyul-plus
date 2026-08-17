import { activitiesForCity } from '@/lib/server/viator';
import { browserGetOk } from '@/lib/server/chatGuards';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';

/**
 * Bookable activities in the trip's city, from a live query against Viator.
 *
 * **This route exists so the key stays on the server.** The browser receives only
 * what is already filtered and ready to display, and the booking URL arrives fully
 * built - meaning our partner id is assembled here and not there.
 *
 * Three protections, all of them cheap:
 * 1. **Request origin** - `browserGetOk`, not `sameOriginOk`: on a same-origin GET a
 *    browser does **not** send `Origin`, so the chat's check would reject every real
 *    request here. The signal that does exist on a GET is `Sec-Fetch-Site`.
 * 2. **A per-caller quota**, on top of the outbound rate limiter in `viator.ts`. The
 *    quota is derived from the caller's tier as in every other route, so this cannot
 *    be used to run requests on our account.
 * 3. **Silent failure** - any state that is not a success returns 200 with an empty
 *    list and a reason. The trip screen should not need to know Viator exists, and
 *    certainly should not display an error.
 */

const SLUG = /^[a-z0-9-]{1,60}$/;

const empty = (reason: string) =>
  new Response(JSON.stringify({ mode: 'off', offers: [], reason }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function GET(req: Request) {
  if (!browserGetOk(req)) return empty('origin');

  const city = new URL(req.url).searchParams.get('city') ?? '';
  if (!SLUG.test(city)) return empty('bad-city');

  const caller = await resolveCaller(req);
  /*
    A fixed daily ceiling, **not derived from `exploresPerDay`**. Until premium moved
    to a monthly window (`periodMsFor`) that derivation was reasonable; now premium's
    `exploresPerDay` is a monthly figure, and multiplying it by 3 and applying it as a
    **daily** ceiling would have given ~450/day - by accident, not by intent. This
    route costs us nothing (Viator, with no AI call), so there is no economic reason
    for a complicated ceiling - generous and fixed for everyone, a little more for premium.
  */
  const perDay = caller.plan === 'premium' ? 120 : 60;
  if (!checkLimit('activities', caller.id, perDay, 24 * 60 * 60_000).ok) return empty('quota');
  if (!checkLimit('activities-burst', caller.id, 10, 60_000).ok) return empty('quota');

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const result = await activitiesForCity(city, host);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Our cache is in memory only. Nothing from Viator is stored on disk or in a CDN.
      'Cache-Control': 'no-store',
    },
  });
}
