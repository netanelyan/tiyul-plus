/**
 * שרת בלבד - גישה לטבלת `purchases` (ראו `supabase-purchases.sql`).
 * REST ישיר עם ה-service role דרך `supabaseAdmin.ts`, פילטרים דרך
 * `pgrest.ts` בלבד - אותו דפוס בדיוק כמו `server/admin.ts`.
 *
 * ## האידמפוטנטיות יושבת כאן, במשפט אחד
 *
 * `markPaid` הוא `UPDATE ... WHERE paypal_order_id = X AND status = 'pending'`.
 * שתי בקשות webhook בו-זמניות לאותה הזמנה: רק אחת מהן פוגעת בשורה
 * שעדיין `pending` ומעדכנת אותה; השנייה מעדכנת אפס שורות. Postgres
 * מבטיח את זה ברמת ה-UPDATE הבודד - אין כאן צורך בנעילה מפורשת. גם
 * `paypal_capture_id unique` בטבלה עצמה הוא קו הגנה שני, זול, למקרה
 * שאי-פעם ינסו לכתוב את אותה לכידה תחת שתי שורות הזמנה שונות.
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

/** יצירת שורת רכישה חדשה במצב pending. מחזיר `null` כשה-DB לא זמין. */
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
 * הרכישה הרלוונטית ביותר עבור (משתמש, טיול): `paid` תמיד קודם - זה מה
 * שקובע "כבר נרכש, מציגים תוצאה ולא הצעה" - אחרת השורה העדכנית ביותר.
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
 * הענקה אמיתית - **הקריאה היחידה בקוד שאמורה לקרוא לזה היא נתיב ה-webhook**,
 * אחרי אימות חתימה. עדכון מותנה: משנה שורה רק אם היא עדיין `pending`,
 * ולכן קריאה כפולה (webhook שנשלח פעמיים) היא no-op בפעם השנייה.
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
 * הבדיקה **כלולה בפרימיום** - הפיצ'ר הממשי הראשון שמנוי פרימיום מקבל
 * ואין לאף אחד אחר. `amount: 0` ו-`source: 'premium_included'` בכוונה
 * (מקביל ל-`adminGrant` למטה): זו לא הכנסה אמיתית, ו-`computeStats`
 * חייב להבדיל בינה לבין הענקת תמיכה אנושית כדי שהדוח הפיננסי יישאר
 * מדויק. **הקריאה היחידה שאמורה לקרוא לזה** היא `/api/checks/create-order`,
 * אחרי שהוא עצמו וידא ש-`caller.plan === 'premium'` מהטוקן המאומת -
 * לא מגוף הבקשה.
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

/** נכשל בפועל (למשל אי-התאמת סכום) - לא מעניק, אבל כן משאיר עקבה */
export async function markFailed(orderId: string, note: string, rawWebhook?: unknown): Promise<boolean> {
  const rows = await adminUpdate<{ id: string }>(
    'purchases',
    pgQuery(eq('paypal_order_id', orderId), eq('status', 'pending')),
    { status: 'failed', note, raw_webhook: rawWebhook ?? null, updated_at: nowIso() },
  );
  return Boolean(rows && rows.length > 0);
}

/* ============================================================
   אדמין - הענקה/שלילה ידנית
   ============================================================ */

/**
 * הענקה ידנית. `amount: 0` ו-`source: 'admin_grant'` בכוונה - זו לא
 * הכנסה אמיתית, ואסור שהדוח הפיננסי יספור אותה ככזאת.
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

/** שלילה - הופכת רכישות ששולמו ל-revoked. **לא מוחקת** את רשומת התשלום. */
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
   אדמין - רשימה וסטטיסטיקה
   ============================================================ */

const MAX_ROWS = 2000;

export async function recentPurchases(limit = 500): Promise<PurchaseRow[]> {
  const rows = await adminSelect<PurchaseRow>(
    'purchases',
    pgQuery(pgSelect(COLUMNS), pgOrder('created_at', 'desc'), pgLimit(Math.min(limit, MAX_ROWS))),
  );
  return rows ?? [];
}

export interface PurchaseStats {
  revenueILS: number;
  paidCount: number;
  pendingCount: number;
  /** ממתינות מעל 15 דקות - זה מה שאמור להיראות, לא רק להיספר */
  stuckPending: { id: string; userId: string; tripId: string; createdAt: string; ageMinutes: number }[];
  failedCount: number;
  adminGrantCount: number;
  /** בדיקות שניתנו כהטבת מנוי אוטומטית - לא תמיכה אנושית ולא הכנסה */
  premiumIncludedCount: number;
}

const STUCK_AFTER_MS = 15 * 60_000;

export function computeStats(rows: PurchaseRow[]): PurchaseStats {
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
      // רק paypal הוא הכנסה אמיתית - admin_grant ו-premium_included
      // שניהם amount=0 בעיצוב, אבל לא אותו דבר: אחד תמיכה אנושית,
      // השני הטבת מנוי אוטומטית. שני מונים נפרדים כדי שהתמונה תישאר מדויקת.
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
