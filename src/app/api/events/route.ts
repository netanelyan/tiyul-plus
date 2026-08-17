import { adminRpc } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { sameOriginOk } from '@/lib/server/chatGuards';
import { dayKey } from '@/lib/server/limits';

/**
 * Event counter - **the answer to "how many trips get exported", without tracking**.
 *
 * Printing, PDF, WhatsApp sharing and navigation all happen in the browser
 * and leave no trace on the server, so the question could not be answered.
 * The solution here is **a counter, not a log**: only "on this day there
 * were N prints" is stored.
 *
 * What is deliberately **not** stored: who, which trip, exactly when, from
 * which address. A counter row cannot be attributed to any person, and that
 * is why it is allowed.
 *
 * The route is open to anyone browsing the site (these actions are
 * available without an account too), so it carries the same cheap
 * protections as the other routes: request origin and a rate quota. It
 * touches no model and costs no money.
 */

/**
 * The closed list of events a browser may report. The new growth events
 * (trip created, share opened, adoption, return visit) joined it;
 * `newsletter` **deliberately did not** - it is counted server-side only,
 * in the signup route, where a new address can be distinguished from a
 * duplicate. A client allowed to send it could inflate "emails collected"
 * in a loop without registering a single address.
 */
const KINDS = new Set([
  'print', 'pdf', 'whatsapp', 'share', 'maps',
  'trip_created', 'shared_open', 'shared_adopt', 'return_visit',
]);

export async function POST(req: Request) {
  /*
    **Every response here is a 204, rejection included.** In `/api/chat` a
    foreign origin gets 403 because there the response costs money and
    deserves a "no". Here there is nothing to protect except the counter's
    accuracy, so there is no reason the route should answer differently to
    different requests - and additionally `trackEvent` is sent mid-
    navigation, and an error response there is noise in the user's console
    for nothing.
  */
  const counted = sameOriginOk(req);
  if (!counted) return new Response(null, { status: 204 });

  const caller = await resolveCaller(req);
  // A generous ceiling: a person who prints five times is a person, not a problem
  if (!checkLimit('events', caller.id, 60, 60 * 60_000).ok) return new Response(null, { status: 204 });

  let kind = '';
  try {
    const body = (await req.json()) as { kind?: unknown };
    kind = typeof body.kind === 'string' ? body.kind : '';
  } catch {
    return new Response(null, { status: 204 });
  }
  // A closed list. A different value creates no new key - it simply is not counted.
  if (!KINDS.has(kind)) return new Response(null, { status: 204 });

  // fire and forget: a counter neither delays a print nor fails it
  void adminRpc('bump_event', { p_day: dayKey(), p_kind: kind });
  return new Response(null, { status: 204 });
}
