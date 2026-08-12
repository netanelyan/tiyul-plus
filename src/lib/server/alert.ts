/**
 * שרת בלבד - התראה חיצונית כללית (Slack/Discord/כל שירות שממיר בקשה
 * למייל), **אותו דפוס בדיוק** כמו `post()` הפרטי ב-`server/budget.ts`
 * - הוצא לכאן כי כעת יש לו שני קוראים משני פיצ'רים שונים.
 *
 * `PURCHASE_ALERT_WEBHOOK` קודם, ואם לא הוגדר נופל ל-`AI_BUDGET_ALERT_WEBHOOK`
 * הקיים - כדי שלא יהיה צורך בערוץ חדש אם אחד כבר מוגדר, ועדיין אפשר
 * להפריד אותם אם ירצו.
 */
export function postAlert(text: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[alert] ${text}`);
  const hook = process.env.PURCHASE_ALERT_WEBHOOK ?? process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) return;
  fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, content: text, ...extra }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}
