import { actorFrom, adminConfigured, denied, ok, signedInUserId } from '@/lib/server/admin';

/**
 * "Am I an admin?" - the only thing the /admin page asks before rendering
 * anything. The real gate is in each route separately; this is only so a
 * management screen is not shown to someone who has nothing to do in it.
 *
 * ## Why there is a third answer here, 503
 *
 * Netanel is an owner in the database - he checked himself - and still saw
 * the "page not found" screen, because `SUPABASE_SERVICE_ROLE_KEY` was not
 * in Vercel's env. Two completely different reasons looked identical: "you
 * have no permission" and "the server is not configured". This was the third
 * time that day that a valid-but-switched-off configuration state looked
 * exactly like a bug, so the page now says what is missing instead of
 * staying silent.
 *
 * What this exposes: to a **signed-in** user only, and only the fact that
 * the admin area is not configured. It grants nothing - without the key
 * there is nothing to attack at all - and the benefit (a founder who
 * understands why the screen is empty) outweighs the risk. For anyone not
 * signed in the answer remains 404.
 */
export async function GET(req: Request) {
  if (!adminConfigured()) {
    // Verify this is somebody signed in before telling them anything about the configuration
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
