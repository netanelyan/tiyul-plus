import { NextResponse } from 'next/server';
import { paypalMode } from '@/lib/server/paypal';

/**
 * GET → `{ mode }` only. **No secret** - which is exactly what this side
 * needs: to show the "test mode" warning bar before anyone tries to pay,
 * like `ActivitiesPanel` does for Viator. Requires no sign-in - this is not
 * private information.
 */
export async function GET() {
  // The answer is derived from environment variables only - it cannot
  // change without a deploy, and until now it was fetched on every load of
  // the trip screen by every visitor. 5 minutes of caching (browser + CDN)
  // is zero risk: after a deploy that switches the mode, the sandbox's
  // orange bar updates within minutes - and this is a screen that reloads
  // between purchases anyway.
  return NextResponse.json(
    { mode: paypalMode() },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
