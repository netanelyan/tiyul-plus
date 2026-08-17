import { NextResponse } from 'next/server';
import type { Trip } from '@/lib/trip/types';
import { encodeTripShare } from '@/lib/trip/share';
import { decodeTripShare } from '@/lib/server/shareDecode';
import { createShareCode } from '@/lib/trip/shareStore';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { PLAN_LIMITS, periodMsFor } from '@/lib/plans';

/**
 * POST { trip } → { code | null }.
 * Encode the trip into the v1 payload (encodeTripShare), verify it can be
 * decoded at all against the curated data, and store it under a short code.
 * Without Supabase configured - return null and the client falls back to
 * the long link.
 */
export async function POST(req: Request) {
  // Quota. **Until 2026-08-11 this gate was bypassable**: the table carried
  // `insert to anon with check (true)`, so a browser could write to it
  // directly with the public key and skip everything written here. That
  // policy was removed and the write goes through the service role, so this
  // route is now the only way in - and the quota applies in practice, not
  // just in intent.
  // Exceeding it returns code:null - the client silently falls back to the
  // long link, which no quota blocks.
  const caller = await resolveCaller(req);
  const burst = checkLimit('share-burst', caller.id, 5, 10 * 60_000);
  const daily = checkLimit(
    'share-day',
    caller.id,
    PLAN_LIMITS[caller.plan].sharesPerDay,
    periodMsFor(),
  );
  if (!burst.ok || !daily.ok) {
    return NextResponse.json({ code: null, error: 'rate-limited' }, { status: 429 });
  }

  let trip: Trip;
  try {
    ({ trip } = (await req.json()) as { trip: Trip });
  } catch {
    return NextResponse.json({ code: null, error: 'bad-request' }, { status: 400 });
  }
  if (!trip?.days?.length) {
    return NextResponse.json({ code: null, error: 'empty-trip' }, { status: 400 });
  }

  const payload = encodeTripShare(trip);
  // Round-trip validation: if the payload does not open into a valid trip
  // against the data - do not store it
  if (!decodeTripShare(payload)) {
    return NextResponse.json({ code: null, error: 'invalid-trip' }, { status: 400 });
  }

  const code = await createShareCode(payload);
  return NextResponse.json({ code });
}
