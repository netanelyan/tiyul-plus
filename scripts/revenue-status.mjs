/**
 * `npm run revenue` - what this site can and cannot currently be paid for.
 *
 * ## Why this exists as a command rather than a paragraph in a doc
 *
 * "The site earns nothing today" is the first line of LAUNCH-CHECKLIST.md, and it
 * was true when written. The problem with keeping that in prose is the problem
 * this repo has hit repeatedly: a sentence about a configuration state goes stale
 * silently the moment the state changes, and nobody knows which way. The catalog
 * counts in the marketing doc drifted by a factor of three exactly this way.
 *
 * So this reads the **actual configuration** and prints what is earning, what is
 * wired but switched off, and what has no partner at all. It is the revenue twin
 * of `sql/supabase-check.sql`, which earned its place by ending round-trips about
 * which migrations had been run.
 *
 * Run it against a real environment to get a real answer:
 *   npm run revenue                      # reads .env.local
 *   vercel env pull && npm run revenue   # reads what production actually has
 *
 * It reads configuration only. It never calls PayPal, Viator or Anthropic, so it
 * costs nothing and cannot be rate-limited.
 */
import { readFileSync, existsSync } from 'node:fs';

// ---- load .env.local the way Next would, without a dependency ----
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { bookingProviders } = await import('../src/lib/booking.ts');
const { PREMIUM_PRICE_ILS, PRO_PRICE_ILS, ils } = await import('../src/lib/plans.ts');
const { PRICE_ILS: CHECK_PRICE_ILS } = await import('../src/lib/predeparture.ts');

const set = (k) => Boolean((process.env[k] ?? '').trim());
const OK = 'EARNING ';
const OFF = 'OFF     ';
const NONE = 'NO PARTNER';

const lines = [];
const say = (s = '') => lines.push(s);

say('═'.repeat(74));
say('  tiyul+ revenue status');
say('═'.repeat(74));

/* ---------------- 1. Affiliate links ---------------- */
say('');
say('1. AFFILIATE LINKS - traffic we send out');
say('');

let monetised = 0;
let freeTraffic = 0;
let noPartner = 0;

for (const p of bookingProviders) {
  if (!p.provider || !p.publicUrl) {
    noPartner++;
    say(`   ${NONE}  ${p.kind.padEnd(11)} - no provider chosen; the card shows "בקרוב"`);
    continue;
  }
  /*
    Two things must BOTH be true to earn: a template in the config, and an id in
    the environment. Either alone sends free traffic, so they are reported
    separately - "I pasted the id" is the likely half-done state.
  */
  const hasTemplate = Boolean(p.affiliate);
  const hasId = hasTemplate && set(`NEXT_PUBLIC_AFFILIATE_${p.affiliate.idKey.toUpperCase()}`);
  if (hasTemplate && hasId) {
    monetised++;
    say(`   ${OK}  ${p.kind.padEnd(11)} - ${p.provider}`);
  } else {
    freeTraffic++;
    const why = !hasTemplate
      ? 'no affiliate template in src/lib/booking.ts'
      : `template set but NEXT_PUBLIC_AFFILIATE_${p.affiliate.idKey.toUpperCase()} is empty`;
    say(`   ${OFF}  ${p.kind.padEnd(11)} - ${p.provider}: ${why}`);
    say(`             -> clicks go to ${p.provider} and we are paid nothing`);
  }
}

/* ---------------- 2. Viator ---------------- */
say('');
say('2. VIATOR - the activities section (its own integration, not the booking panel)');
say('');
const vMode = (process.env.VIATOR_MODE ?? '').toLowerCase() || 'sandbox (default)';
const vKey = vMode.startsWith('production') ? set('VIATOR_API_KEY') : set('VIATOR_API_KEY_SANDBOX');
const vAttr = set('VIATOR_PARTNER_ID') && set('VIATOR_MCID');
if (vMode.startsWith('production') && vKey && vAttr) {
  say(`   ${OK}  mode=production, key set, attribution set`);
} else {
  say(`   ${OFF}  mode=${vMode}`);
  if (!vKey) say('             VIATOR_API_KEY' + (vMode.startsWith('production') ? '' : '_SANDBOX') + ' not set');
  if (!vAttr) say('             VIATOR_PARTNER_ID / VIATOR_MCID not set - without both there are no links AND no section at all');
  if (!vMode.startsWith('production')) say('             VIATOR_MODE is not "production", so the live key is never read even if present');
  say('             -> the activities section does not render; zero revenue and zero traffic');
}

/* ---------------- 3. Things people pay us for directly ---------------- */
say('');
say('3. DIRECT SALES');
say('');
const ppMode = (process.env.PAYPAL_MODE ?? '').toLowerCase() || '(unset)';
const ppCreds = set('PAYPAL_CLIENT_ID') && set('PAYPAL_CLIENT_SECRET');
const ppLive = ppMode === 'production' && ppCreds;
say(`   ${ppLive ? OK : OFF}  pre-departure check   ${ils(CHECK_PRICE_ILS)} ₪ one-off`);
say(`   ${ppLive ? OK : OFF}  premium subscription  ${ils(PREMIUM_PRICE_ILS)} ₪/month`);
say(`   ${ppLive ? OK : OFF}  pro subscription      ${ils(PRO_PRICE_ILS)} ₪/month`);
say(`             PayPal mode=${ppMode}, credentials ${ppCreds ? 'set' : 'NOT set'}`);
if (!ppLive) {
  say('             -> nothing can be charged from this environment.');
  say('             (expected locally; production has its own env - run after `vercel env pull`)');
}

/* ---------------- verdict ---------------- */
say('');
say('─'.repeat(74));
const earning = monetised > 0 || (vMode.startsWith('production') && vKey && vAttr) || ppLive;
if (!earning) {
  say('  VERDICT: nothing in this environment can generate revenue.');
} else {
  say('  VERDICT: some revenue paths are live - see above.');
}
say('');
say(`  affiliate links monetised      ${monetised} of ${bookingProviders.length}`);
say(`  sending free traffic           ${freeTraffic}`);
say(`  no partner chosen yet          ${noPartner}`);
say('');
if (freeTraffic > 0) {
  say('  The cheapest money on this list is the free-traffic row above: the links');
  say('  already exist, people already click them, and the only missing piece is an');
  say('  affiliate id per provider. Nothing in the UI changes when one arrives -');
  say('  fill `affiliate` in src/lib/booking.ts plus the env var, and the same button');
  say('  starts earning. See LAUNCH-CHECKLIST.md section 1.');
  say('');
  say('  Do NOT invent a tracking URL format to close a row here. A link with the');
  say('  wrong parameters is not attributed, looks identical, and is indistinguishable');
  say('  from this state - which is worse than a row that honestly says OFF.');
}
say('─'.repeat(74));

console.log(lines.join('\n'));
