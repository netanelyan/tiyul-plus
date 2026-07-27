import { actorFrom, adminConfigured, denied, ok, signedInUserId } from '@/lib/server/admin';

/**
 * "האם אני אדמין?" - הדבר היחיד שהעמוד /admin שואל לפני שהוא מרנדר משהו.
 * הגייט האמיתי הוא בכל נתיב בנפרד; זה רק כדי לא להציג מסך ניהול למי שאין
 * לו מה לעשות בו.
 *
 * ## למה יש כאן תשובה שלישית, 503
 *
 * נתנאל הוא owner בדאטהבייס - הוא בדק בעצמו - ובכל זאת ראה "הדף לא נמצא",
 * כי `SUPABASE_SERVICE_ROLE_KEY` לא היה ב-env של Vercel. שתי סיבות שונות
 * לחלוטין נראו זהות: "אין לך הרשאה" ו"השרת לא מוגדר". זו הפעם השלישית היום
 * שמצב תצורה תקין-אבל-כבוי נראה בדיוק כמו באג, ולכן העמוד אומר עכשיו מה
 * חסר במקום להשתיק.
 *
 * מה זה חושף: למשתמש **מחובר** בלבד, ורק את העובדה שאזור הניהול לא מוגדר.
 * זה לא מקנה כלום - בלי המפתח אין בכלל מה לתקוף - והתועלת (מייסד שמבין
 * למה המסך ריק) גדולה מהסיכון. למי שלא מחובר התשובה נשארת 404.
 */
export async function GET(req: Request) {
  if (!adminConfigured()) {
    // מאמתים שזה מישהו מחובר לפני שמספרים משהו על התצורה
    const userId = await signedInUserId(req);
    if (!userId) return denied();
    return new Response(
      JSON.stringify({
        error: 'not_configured',
        hint: 'SUPABASE_SERVICE_ROLE_KEY',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const actor = await actorFrom(req);
  if (!actor || actor.role === 'user') return denied();
  return ok({ role: actor.role, email: actor.email });
}
