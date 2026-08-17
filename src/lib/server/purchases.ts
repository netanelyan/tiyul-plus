/**
 * Server only - access to the `purchases` table (see `supabase-purchases.sql`).
 * Direct REST with the service role via `supabaseAdmin.ts`, filters via
 * `pgrest.ts` only - the exact same pattern as `server/admin.ts`.
 *
 * ## The idempotence lives here, in one sentence
 *
 * `markPaid` is `UPDATE ... WHERE paypal_order_id = X AND status = 'pending'`.
 * Two concurrent webhook requests for the same order: only one of them hits
 * a row that is still `pending` and updates it; the other updates zero rows.
 * Postgres guarantees this at the single-UPDATE level - no explicit lock is
 * needed here. `paypal_capture_id unique` on the table itself is also a
 * second, cheap defense line, in case anyone ever tries to write the same
 * capture under two different order rows.
 */

import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import type { PreDepartureReport } from '@/lib/predeparture';
import type { PaypalMode } from '@/lib/server/paypal';

export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'revoked';
export type PurchaseSource = 'paypal' | 'admin_grant' | 'premium_included';

export interface PurchaseRow {
  id: string;
  user_id: string;
  trip_id: string;
  product: string;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  source: PurchaseSource;
  mode: PaypalMode;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_payer_email: string | null;
  report: PreDepartureReport | null;
  raw_webhook: unknown;
  note: string | null;
  granted_by: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
}

const COLUMNS = [
  'id', 'user_id', 'trip_id', 'product', 'amount', 'currency', 'status', 'source', 'mode',
  'paypal_order_id', 'paypal_capture_id', 'paypal_payer_email', 'report', 'raw_webhook',
  'note', 'granted_by', 'created_at', 'paid_at', 'updated_at',
];

const nowIso = () => new Date().toISOString();

/** Creates a new purchase row in pending state. Returns `null` when the DB is unavailable. */
export async function createPendingPurchase(input: {
  userId: string;
  tripId: string;
  amount: number;
  currency: string;
  mode: PaypalMode;
}): Promise<PurchaseRow | null> {
  const rows = await adminInsert<PurchaseRow>('purchases', {
    user_id: input.userId,
    trip_id: input.tripId,
    product: 'predeparture-check',
    amount: input.amount,
    currency: input.currency,
    status: 'pending',
    source: 'paypal',
    mode: input.mode,
  });
  return rows?.[0] ?? null;
}

export async function setOrderId(purchaseId: string, orderId: string): Promise<boolean> {
  const rows = await adminUpdate<{ id: string }>(
    'purchases',
    eq('id', purchaseId),
    { paypal_order_id: orderId, updated_at: nowIso() },
  );
  return Boolean(rows && rows.length > 0);
}

export async function findByOrderId(orderId: string): Promise<PurchaseRow | null> {
  const rows = await adminSelect<PurchaseRow>(
    'purchases',
    pgQuery(eq('paypal_order_id', orderId), pgSelect(COLUMNS), pgLimit(1)),
  );
  return rows?.[0] ?? null;
}

export async function findById(purchaseId: string): Promise<PurchaseRow | null> {
  const rows = await adminSelect<PurchaseRow>(
    'purchases',
    pgQuery(eq('id', purchaseId), pgSelect(COLUMNS), pgLimit(1)),
  );
  return rows?.[0] ?? null;
}

/**
 * The most relevant purchase for (user, trip): `paid` always first - that is
 * what decides "already purchased, show a result and not an offer" -
 * otherwise the most recent row.
 */
export async function findForUserTrip(userId: string, tripId: string): Promise<PurchaseRow | null> {
  const rows = await adminSelect<PurchaseRow>(
    'purchases',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId), pgSelect(COLUMNS), pgOrder('created_at', 'desc'), pgLimit(20)),
  );
  if (!rows || rows.length === 0) return null;
  return rows.find((r) => r.status === 'paid') ?? rows[0];
}

/**
 * The real grant - **the only call site in the code that should call this is
 * the webhook route**, after signature verification. Conditional update: it
 * changes a row only if it is still `pending`, so a double call (a webhook
 * sent twice) is a no-op the second time.
 */
export async function markPaid(
  orderId: string,
  patch: {
    captureId: string;
    payerEmail: string | null;
    report: PreDepartureReport;
    rawWebhook: unknown;
  },
): Promise<PurchaseRow | null> {
  const rows = await adminUpdate<PurchaseRow>(
    'purchases',
    pgQuery(eq('paypal_order_id', orderId), eq('status', 'pending')),
    {
      status: 'paid',
      paypal_capture_id: patch.captureId,
      paypal_payer_email: patch.payerEmail,
      report: patch.report,
      raw_webhook: patch.rawWebhook,
      paid_at: nowIso(),
      updated_at: nowIso(),
    },
  );
  return rows?.[0] ?? null;
}

/**
 * The check is **included in premium** - the first tangible feature a
 * premium subscriber gets that nobody else has. `amount: 0` and
 * `source: 'premium_included'` on purpose (parallel to `adminGrant` below):
 * this is not real revenue, and `computeStats` must distinguish it from a
 * human support grant so the financial report stays accurate. **The only
 * call site that should call this** is `/api/checks/create-order`, after it
 * has itself verified that `caller.plan === 'premium'` comes from the
 * verified token - not from the request body.
 */
export async function grantPremiumIncluded(input: {
  userId: string;
  tripId: string;
  report: PreDepartureReport;
}): Promise<PurchaseRow | null> {
  const rows = await adminInsert<PurchaseRow>('purchases', {
    user_id: input.userId,
    trip_id: input.tripId,
    product: 'predeparture-check',
    amount: 0,
    currency: 'ILS',
    status: 'paid',
    source: 'premium_included',
    mode: 'production',
    report: input.report,
    paid_at: nowIso(),
  });
  return rows?.[0] ?? null;
}

/** Failed for real (e.g. an amount mismatch) - grants nothing, but does leave a trace */
export async function markFailed(orderId: string, note: string, rawWebhook?: unknown): Promise<boolean> {
  const rows = await adminUpdate<{ id: string }>(
    'purchases',
    pgQuery(eq('paypal_order_id', orderId), eq('status', 'pending')),
    { status: 'failed', note, raw_webhook: rawWebhook ?? null, updated_at: nowIso() },
  );
  return Boolean(rows && rows.length > 0);
}

/* ============================================================
   Admin - manual grant/revoke
   ============================================================ */

/**
 * A manual grant. `amount: 0` and `source: 'admin_grant'` on purpose - this
 * is not real revenue, and the financial report must not count it as such.
 */
export async function adminGrant(input: {
  userId: string;
  tripId: string;
  grantedBy: string;
  note: string;
  report: PreDepartureReport;
}): Promise<PurchaseRow | null> {
  const rows = await adminInsert<PurchaseRow>('purchases', {
    user_id: input.userId,
    trip_id: input.tripId,
    product: 'predeparture-check',
    amount: 0,
    currency: 'ILS',
    status: 'paid',
    source: 'admin_grant',
    mode: 'production',
    report: input.report,
    note: input.note || null,
    granted_by: input.grantedBy,
    paid_at: nowIso(),
  });
  return rows?.[0] ?? null;
}

/** Revocation - turns paid purchases into revoked. **Does not delete** the payment record. */
export async function adminRevoke(input: {
  userId: string;
  tripId: string;
  grantedBy: string;
  note: string;
}): Promise<PurchaseRow[] | null> {
  return adminUpdate<PurchaseRow>(
    'purchases',
    pgQuery(eq('user_id', input.userId), eq('trip_id', input.tripId), eq('status', 'paid')),
    { status: 'revoked', note: input.note || null, granted_by: input.grantedBy, updated_at: nowIso() },
  );
}

/* ============================================================
   Admin - listing and statistics
   ============================================================ */

const MAX_ROWS = 2000;

/**
 * A lean row for the dashboard: everything the statistics and the list need,
 * **without** `report` and `raw_webhook` - two jsonb fields of a few KB each,
 * which rode on 500 rows on every dashboard load (megabytes from Supabase
 * for 15 displayed rows). The full report is fetched only when a single
 * purchase is opened (`findForUserTrip`/`findById`).
 */
export type PurchaseListRow = Omit<PurchaseRow, 'report' | 'raw_webhook'>;
const LIST_COLUMNS = COLUMNS.filter((c) => c !== 'report' && c !== 'raw_webhook');

export async function recentPurchases(limit = 500): Promise<PurchaseListRow[]> {
  const rows = await adminSelect<PurchaseListRow>(
    'purchases',
    pgQuery(pgSelect(LIST_COLUMNS), pgOrder('created_at', 'desc'), pgLimit(Math.min(limit, MAX_ROWS))),
  );
  return rows ?? [];
}

export interface PurchaseStats {
  revenueILS: number;
  paidCount: number;
  pendingCount: number;
  /** Pending for over 15 minutes - this is what should be seen, not just counted */
  stuckPending: { id: string; userId: string; tripId: string; createdAt: string; ageMinutes: number }[];
  failedCount: number;
  adminGrantCount: number;
  /** Checks given as an automatic subscriber perk - not human support and not revenue */
  premiumIncludedCount: number;
}

const STUCK_AFTER_MS = 15 * 60_000;

export function computeStats(rows: PurchaseListRow[]): PurchaseStats {
  const now = Date.now();
  let revenueILS = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let adminGrantCount = 0;
  let premiumIncludedCount = 0;
  const stuckPending: PurchaseStats['stuckPending'] = [];

  for (const r of rows) {
    if (r.status === 'paid') {
      paidCount += 1;
      // Only paypal is real revenue - admin_grant and premium_included are
      // both amount=0 by design, but not the same thing: one is human
      // support, the other an automatic subscriber perk. Two separate
      // counters so the picture stays accurate.
      if (r.source === 'paypal') revenueILS += Number(r.amount) || 0;
      else if (r.source === 'premium_included') premiumIncludedCount += 1;
      else adminGrantCount += 1;
    } else if (r.status === 'pending') {
      pendingCount += 1;
      const ageMs = now - Date.parse(r.created_at);
      if (Number.isFinite(ageMs) && ageMs > STUCK_AFTER_MS) {
        stuckPending.push({
          id: r.id,
          userId: r.user_id,
          tripId: r.trip_id,
          createdAt: r.created_at,
          ageMinutes: Math.round(ageMs / 60_000),
        });
      }
    } else if (r.status === 'failed') {
      failedCount += 1;
    }
  }
  return {
    revenueILS: Math.round(revenueILS * 100) / 100,
    paidCount,
    pendingCount,
    stuckPending,
    failedCount,
    adminGrantCount,
    premiumIncludedCount,
  };
}
