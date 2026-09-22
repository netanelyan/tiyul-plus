import { requestIp } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { runHealth } from '@/lib/server/health';

/**
 * `GET /api/health` - the endpoint an external uptime monitor polls.
 *
 * The site had no way for anyone to learn it was down except a person opening
 * it. This gives UptimeRobot, Better Stack or any equivalent something to
 * watch, and it answers with the **HTTP status code** rather than only a body,
 * because that is what every one of those services actually alerts on: 200
 * when the product works, **503 when the database is unreachable**.
 *
 * ## Public gets a verdict, not an inventory
 *
 * Anonymously the answer is `{status}` and nothing else. Which dependency is
 * configured, which is missing and how slow the database is are all facts
 * about our infrastructure, and a stranger polling a health endpoint has no
 * business collecting them. With `Authorization: Bearer $CRON_SECRET` - the
 * same secret the warm cron already uses - the full breakdown comes back.
 *
 * That split keeps monitoring trivial (a monitor only needs the code) while
 * the detail that makes an incident diagnosable stays behind a secret.
 *
 * `no-store` because a cached health check is not a health check. The work
 * itself is cached for 20s inside `runHealth`, so polling every 30 seconds
 * costs at most one database round trip per poll.
 */
export const dynamic = 'force-dynamic';

function detailed(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  // Generous, but a health endpoint is still an endpoint: one address should
  // not be able to make us probe the database in a loop.
  if (!checkLimit('health', requestIp(request), 60, 60_000).ok) {
    return new Response(JSON.stringify({ status: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const health = await runHealth();
  const body = detailed(request) ? health : { status: health.status };

  return new Response(JSON.stringify(body), {
    // Only a real outage is a failing status code. `degraded` stays 200 so a
    // missing optional key does not page anybody at three in the morning.
    status: health.status === 'down' ? 503 : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
