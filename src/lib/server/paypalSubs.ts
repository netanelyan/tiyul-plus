/**
 * מנוי הפרימיום דרך PayPal Subscriptions - **המסלול שמחליף את Stripe
 * שמעולם לא חובר.** אותם עקרונות בדיוק כמו `paypal.ts` (הרכישה
 * החד-פעמית): REST ישיר בלי SDK, מפתחות שרת בלבד, timeout על כל קריאה,
 * והכלל המרכזי - **שום דבר כאן לא מעניק פרימיום.** יצירת מנוי רק שולחת
 * את המשתמש לאישור ב-PayPal; מה שקובע `plan='premium'` הוא ורק ה-webhook
 * המאומת (BILLING.SUBSCRIPTION.ACTIVATED ב-processCheckWebhook), באותו
 * מבנה שבו רכישת בדיקה הופכת ל"שולם" רק מ-PAYMENT.CAPTURE.COMPLETED.
 *
 * ## המחיר לא מגיע מהלקוח
 *
 * תוכנית החיוב נבנית מ-`PREMIUM_PRICE_ILS` בלבד - הקבוע היחיד
 * ב-lib/plans.ts, אותו כלל כמו PRICE_ILS ברכישה החד-פעמית.
 *
 * ## מזהה התוכנית נשמר ב-app_flags, לא בקוד
 *
 * PayPal דורש Product + Plan שנוצרים פעם אחת לכל סביבה. הם נוצרים
 * אוטומטית בקריאה הראשונה ונשמרים תחת `paypal_plan_id_<mode>` -
 * בלי צעד ידני בדשבורד של PayPal ובלי מזהה מקובע בקוד שנשבר בין
 * sandbox לחי.
 *
 * ## מי המשתמש? custom_id, לא טבלה
 *
 * המנוי נוצר עם `custom_id = userId` (uuid מ-GoTrue, לא מגוף הבקשה),
 * ו-PayPal מחזיר אותו על כל אירוע webhook של אותו מנוי - כולל ביטול.
 * כך ההפעלה וההורדה לא תלויות בשום עמודה חדשה: האירוע המאומת נושא
 * בעצמו את זהות המשתמש שאנחנו קבענו ביצירה.
 */

import { PREMIUM_PRICE_ILS } from '@/lib/plans';
import { accessToken, paypalApiBase, type PaypalMode } from '@/lib/server/paypal';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

const PLAN_FLAG = (mode: PaypalMode) => `paypal_plan_id_${mode}`;

async function storedPlanId(mode: PaypalMode): Promise<string | null> {
  const rows = await adminSelect<{ value: unknown }>(
    'app_flags',
    pgQuery(eq('key', PLAN_FLAG(mode)), pgSelect(['value'])),
  );
  const v = rows?.[0]?.value;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function storePlanId(mode: PaypalMode, planId: string): Promise<void> {
  await adminInsert('app_flags', { key: PLAN_FLAG(mode), value: planId }, { upsert: true });
}

/**
 * מזהה תוכנית החיוב לסביבה - נוצר בפעם הראשונה (Product ואז Plan) ונשמר.
 * כישלון בכל שלב מחזיר null והקורא עונה "לא זמין כרגע" - אף פעם לא
 * תוכנית מומצאת.
 */
export async function ensureSubscriptionPlan(mode: PaypalMode): Promise<string | null> {
  const existing = await storedPlanId(mode);
  if (existing) return existing;

  const token = await accessToken(mode);
  if (!token) return null;
  const base = paypalApiBase(mode);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const productRes = await fetch(`${base}/v1/catalogs/products`, {
      method: 'POST',
      headers: { ...auth, 'PayPal-Request-Id': `product:tiyul-premium:${mode}` },
      body: JSON.stringify({
        name: 'tiyul+ premium',
        description: 'מנוי חודשי לטיול+',
        type: 'SERVICE',
        category: 'TRAVEL',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!productRes.ok) {
      console.warn('[paypal subs] create product', productRes.status);
      return null;
    }
    const product = (await productRes.json()) as { id?: string };
    if (typeof product.id !== 'string') return null;

    const planRes = await fetch(`${base}/v1/billing/plans`, {
      method: 'POST',
      headers: { ...auth, 'PayPal-Request-Id': `plan:tiyul-premium:${mode}` },
      body: JSON.stringify({
        product_id: product.id,
        name: 'tiyul+ premium חודשי',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // עד ביטול
            pricing_scheme: {
              fixed_price: { value: PREMIUM_PRICE_ILS.toFixed(2), currency_code: 'ILS' },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 2,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!planRes.ok) {
      console.warn('[paypal subs] create plan', planRes.status);
      return null;
    }
    const plan = (await planRes.json()) as { id?: string };
    if (typeof plan.id !== 'string') return null;

    await storePlanId(mode, plan.id);
    return plan.id;
  } catch {
    return null;
  }
}

export interface CreatedSubscription {
  subscriptionId: string;
  approveUrl: string;
}

/** יצירת מנוי לאישור המשתמש. לא מעניקה כלום - רק מחזירה לאן לשלוח אותו. */
export async function createSubscription(
  mode: PaypalMode,
  input: { userId: string; returnUrl: string; cancelUrl: string },
): Promise<CreatedSubscription | null> {
  const planId = await ensureSubscriptionPlan(mode);
  if (!planId) return null;
  const token = await accessToken(mode);
  if (!token) return null;

  try {
    const res = await fetch(`${paypalApiBase(mode)}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // דאבל-קליק על "הרשמה" לא יוצר שני מנויים
        'PayPal-Request-Id': `sub:${input.userId}:${planId}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: input.userId,
        application_context: {
          brand_name: 'tiyul+',
          locale: 'he-IL',
          user_action: 'SUBSCRIBE_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn('[paypal subs] create subscription', res.status);
      return null;
    }
    const data = (await res.json()) as { id?: string; links?: { rel?: string; href?: string }[] };
    if (typeof data.id !== 'string') return null;
    const approve = data.links?.find((l) => l.rel === 'approve')?.href;
    if (!approve) return null;
    return { subscriptionId: data.id, approveUrl: approve };
  } catch {
    return null;
  }
}

/* ============ צד ה-webhook: הפעלה והורדה ============ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * הפעלת פרימיום ממנוי PayPal שאושר. נקראת **רק** מ-processCheckWebhook
 * אחרי אימות חתימה - custom_id הוא ה-uuid שאנחנו קבענו ביצירה, והבדיקה
 * כאן היא הגנת צורה בלבד (אירוע עם custom_id שאינו uuid מעולם לא נוצר
 * אצלנו, ולכן נבלע בלי לגעת בכלום).
 */
export async function activatePaypalPremium(userId: string, subscriptionId: string): Promise<boolean> {
  if (!UUID_RE.test(userId)) return false;
  const patch = {
    plan: 'premium',
    plan_until: null,
    plan_source: 'paypal',
    paypal_subscription_id: subscriptionId.slice(0, 60),
    updated_at: new Date().toISOString(),
  };
  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', userId), patch);
  // שילם לפני שאי פעם שמר פרופיל - אין שורה לעדכן, יוצרים אותה
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: userId, ...patch }, { upsert: true });
  }
  return Boolean(rows && rows.length > 0);
}

/**
 * הורדה בביטול/השעיה/פקיעה - **רק כשהפרימיום הנוכחי באמת הגיע מ-PayPal.**
 * בלי השמירה הזאת, ביטול מנוי ישן היה מוחק גם הענקה ידנית של אדמין או
 * פדיון קוד שניתנו אחרי הביטול - בדיוק הבאג ש-plan_source קיים למנוע.
 */
export async function cancelPaypalPremium(userId: string): Promise<boolean> {
  if (!UUID_RE.test(userId)) return false;
  const rows = await adminSelect<{ plan_source: string | null }>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['plan_source'])),
  );
  if (!rows || rows.length === 0) return false;
  if (rows[0].plan_source !== 'paypal') return false; // הענקה/פרומו/סטרייפ - לא שלנו להוריד
  const updated = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', userId), {
    plan: 'free',
    plan_until: null,
    plan_source: null,
    updated_at: new Date().toISOString(),
  });
  return Boolean(updated && updated.length > 0);
}
