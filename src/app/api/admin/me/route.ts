import { actorFrom, denied, ok } from '@/lib/server/admin';

/**
 * "האם אני אדמין?" - הדבר היחיד שהעמוד /admin שואל לפני שהוא מרנדר
 * משהו. הגייט האמיתי הוא בכל נתיב בנפרד; זה רק כדי לא להציג מסך ניהול
 * למי שאין לו מה לעשות בו.
 */
export async function GET(req: Request) {
  const actor = await actorFrom(req);
  if (!actor || actor.role === 'user') return denied();
  return ok({ role: actor.role, email: actor.email });
}
