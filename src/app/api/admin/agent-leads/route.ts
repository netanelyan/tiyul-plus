import { audit, badRequest, denied, ok, requireRole } from '@/lib/server/admin';
import { adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { eq, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';

/**
 * The travel-agent enquiries, for the admin dashboard.
 *
 * GET  -> the most recent enquiries, newest first, plus a count of the open ones.
 * POST { id, handled } -> mark one as dealt with, or reopen it.
 *
 * **There is no delete and no edit**, and that is structural rather than an
 * omission: an enquiry is somebody's message to us, `handled_at` is enough to
 * keep the list workable, and a dashboard that can erase inbound leads is a
 * dashboard that will erase one.
 *
 * Reading a lead is not audited - the whole card is a list of leads, so an
 * audit row per view would be one row per page load and a log nobody reads.
 * Marking one handled IS audited, because it changes state.
 */

interface LeadRow {
  id: string;
  created_at: string;
  name: string;
  business: string;
  contact: string;
  contact_kind: 'email' | 'phone';
  trips_per_year: string | null;
  needs: string | null;
  handled_at: string | null;
}

const MAX_ROWS = 100;

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const limit = checkLimit('admin-agent-leads', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  const rows = await adminSelect<LeadRow>(
    'agent_leads',
    pgQuery(
      pgSelect([
        'id',
        'created_at',
        'name',
        'business',
        'contact',
        'contact_kind',
        'trips_per_year',
        'needs',
        'handled_at',
      ]),
      pgOrder('created_at', 'desc'),
      pgLimit(MAX_ROWS),
    ),
  );

  /*
    `stored: false` is not the same as "no enquiries yet", and the card says so
    in words. Without this a missing table reads as an empty inbox, which is
    the one wrong answer that looks exactly like the right one.
  */
  if (!rows) return ok({ stored: false, leads: [], open: 0, truncated: false });

  return ok({
    stored: true,
    leads: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      business: r.business,
      contact: r.contact,
      contactKind: r.contact_kind,
      tripsPerYear: r.trips_per_year,
      needs: r.needs,
      handledAt: r.handled_at,
    })),
    open: rows.filter((r) => !r.handled_at).length,
    truncated: rows.length >= MAX_ROWS,
  });
}

export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { id?: unknown; handled?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }
  const id = typeof body.id === 'string' ? body.id.slice(0, 60) : '';
  if (!id) return badRequest('bad_request');
  const handled = body.handled !== false;

  const rows = await adminUpdate<{ id: string }>('agent_leads', eq('id', id), {
    handled_at: handled ? new Date().toISOString() : null,
  });
  if (!rows) return badRequest('db_unavailable');

  // No target user: a lead is not an account, so the target columns stay null
  await audit(actor, handled ? 'handle_agent_lead' : 'reopen_agent_lead', {}, { leadId: id });
  return ok({ updated: rows.length });
}
