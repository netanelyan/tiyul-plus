import { audit, badRequest, denied, ok, requireRole } from '@/lib/server/admin';
import { emailsByUserIds, userByEmail } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import {
  adminGrant,
  adminRevoke,
  computeStats,
  findForUserTrip,
  recentPurchases,
} from '@/lib/server/purchases';
import { buildPreDepartureReport } from '@/lib/server/predepartureReport';
import { findOwnTrip } from '@/lib/server/userTrips';

/**
 * Admin for the pre-departure check: a status board (GET with no params), the status of
 * a specific purchase (`?userId=&tripId=`, used inside the single-trip card), and manual
 * grant/revoke (POST) - **the exact same pattern as `/api/admin/plan`**.
 *
 * A manual grant builds a real report from the actual trip (not empty and not faked) and
 * is marked `source='admin_grant'` + `amount=0`, so it can never be counted as revenue.
 */

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const limit = checkLimit('admin-purchases', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const tripId = url.searchParams.get('tripId');

  if (userId && tripId) {
    const purchase = await findForUserTrip(userId, tripId);
    return ok({
      purchase: purchase
        ? {
            id: purchase.id,
            status: purchase.status,
            source: purchase.source,
            amount: purchase.amount,
            currency: purchase.currency,
            mode: purchase.mode,
            createdAt: purchase.created_at,
            paidAt: purchase.paid_at,
            note: purchase.note,
          }
        : null,
    });
  }

  const rows = await recentPurchases(500);
  const stats = computeStats(rows);
  const recentRows = rows.slice(0, 15);
  // In parallel, not a serial await loop - N network round trips to GoTrue became one
  const emails = await emailsByUserIds(recentRows.map((r) => r.user_id));

  return ok({
    stats,
    recent: recentRows.map((r) => ({
      id: r.id,
      email: emails.get(r.user_id) ?? null,
      tripId: r.trip_id,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      source: r.source,
      mode: r.mode,
      createdAt: r.created_at,
      paidAt: r.paid_at,
    })),
  });
}

export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { email?: unknown; tripId?: unknown; action?: unknown; note?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const tripId = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 100) : '';
  const action = body.action === 'revoke' ? 'revoke' : 'grant';
  const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';

  if (!email || !email.includes('@') || !tripId) return badRequest('bad_request');

  const user = await userByEmail(email);
  if (!user) return ok({ found: false });

  if (action === 'revoke') {
    const rows = await adminRevoke({ userId: user.id, tripId, grantedBy: actor.userId, note });
    if (!rows) return badRequest('db_unavailable');
    await audit(actor, 'revoke_predeparture_check', { userId: user.id, email: user.email }, { tripId, note, revoked: rows.length });
    return ok({ found: true, action: 'revoke', revoked: rows.length });
  }

  const trip = await findOwnTrip(user.id, tripId);
  if (!trip) return ok({ found: true, action: 'grant', granted: false, reason: 'trip_not_found' });

  const report = buildPreDepartureReport(trip);
  const purchase = await adminGrant({ userId: user.id, tripId, grantedBy: actor.userId, note, report });
  if (!purchase) return badRequest('db_unavailable');

  await audit(actor, 'grant_predeparture_check', { userId: user.id, email: user.email }, { tripId, note });
  return ok({ found: true, action: 'grant', granted: true, purchaseId: purchase.id });
}
