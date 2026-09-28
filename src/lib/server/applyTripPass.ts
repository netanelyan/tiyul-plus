/**
 * Writing a bought trip pass onto the buyer's profile.
 *
 * This is the one place money becomes access, so the whole file is about not
 * losing on either side of that: not granting without payment, and not taking
 * something away from somebody who has just paid.
 *
 * The arithmetic - never demote, extend rather than reset, refuse to shorten an
 * unlimited subscription - lives in `lib/tripPass.ts` as a pure function with its
 * own tests. This module is only the read-modify-write around it.
 */
import { adminInsert, adminSelect, adminUpdate } from './supabaseAdmin';
import { eq, pgLimit, pgQuery, pgSelect } from './pgrest';
import { tripPassGrant, type PlanRow } from '@/lib/tripPass';

export type ApplyTripPassResult =
  | { ok: true; until: string; plan: 'premium' | 'pro' }
  /** The account already has an unlimited paid plan - nothing to sell. */
  | { ok: false; reason: 'already-unlimited' }
  /** The database could not be read or written. The caller must NOT report success. */
  | { ok: false; reason: 'db-unavailable' };

/**
 * Grant the pass window on `profiles`.
 *
 * **Read-then-write, and deliberately not an RPC.** Two passes bought in the same
 * second could in principle interleave and lose one window. That is accepted here
 * rather than solved with a lock, for a specific reason: PayPal capture is the
 * gate upstream, a person cannot complete two approvals simultaneously, and the
 * failure mode is a buyer getting 60 days instead of 120 - visible, complainable
 * and fixable by hand from /admin. The alternative failure mode of a
 * `security definer` RPC written for a race that does not happen is a new
 * privileged surface on the table that holds everyone's plan. If passes ever get
 * bought in bulk this should become an RPC with `for update`, the way
 * `redeem_promo` already is.
 *
 * **Idempotency is the caller's job**, and it already has the right tool:
 * `markPaid` updates on `status = 'pending'`, so a duplicate webhook or a retried
 * capture matches zero rows the second time and this is never reached twice for
 * one order. That is the same conditional-update trick the check's receipt email
 * relies on.
 */
export async function applyTripPass(userId: string): Promise<ApplyTripPassResult> {
  const rows = await adminSelect<PlanRow>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['plan', 'plan_until', 'plan_source']), pgLimit(1)),
  );
  /*
    null means the request failed; [] means there is simply no profile row yet,
    which is an ordinary state for somebody who has never set a display name.
    Conflating the two would either refuse a legitimate first purchase or grant on
    top of a failed read - so they are separated explicitly.
  */
  if (rows === null) return { ok: false, reason: 'db-unavailable' };
  const current = rows[0] ?? null;

  const grant = tripPassGrant(current);
  if (!grant) return { ok: false, reason: 'already-unlimited' };

  const patch = {
    plan: grant.plan,
    plan_until: grant.plan_until,
    plan_source: grant.plan_source,
    updated_at: new Date().toISOString(),
  };

  let written = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', userId), patch);
  /*
    No row to update means the buyer has no profile row. Insert one - the same
    two-step the admin grant route uses, and for the same reason: a profile row is
    created lazily by the app, so a paying customer may genuinely not have one.
  */
  if (!written || written.length === 0) {
    written = await adminInsert<{ user_id: string }>(
      'profiles',
      { user_id: userId, ...patch },
      { upsert: true },
    );
  }
  if (!written || written.length === 0) return { ok: false, reason: 'db-unavailable' };

  return { ok: true, until: grant.plan_until, plan: grant.plan };
}
