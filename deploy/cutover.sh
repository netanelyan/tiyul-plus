#!/usr/bin/env bash
# Installs the www.tiyulplus.com Caddy blocks - as soon as DNS points here.
#
# Caddy can only get a certificate for a name that resolves to this box. Added
# before the DNS change, the blocks fail ACME and back off for up to hours, so
# the first visitors after the switch would get a TLS error. This waits until
# Porkbun's own nameservers answer with this server's address, then installs
# the blocks and reloads Caddy; the certificate follows within seconds.
#
#   bash cutover.sh            wait for DNS, then install (start it with systemd-run)
#   bash cutover.sh --now      install without waiting (also: re-sync the block)
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
BLOCK=$HERE/Caddyfile.tiyulplus
CF=/etc/caddy/Caddyfile
# This box's public address: the source address of its default route.
IP=${VPS_IP:-$(ip -4 route get 1.1.1.1 | sed -n 's/.* src \([0-9.]*\).*/\1/p')}
[ -n "$IP" ] || { echo "could not tell this box's public IP - set VPS_IP" >&2; exit 1; }

# Asks the zone's authoritative servers directly: a resolver cache would keep
# answering with Vercel's address for up to the record's TTL.
dns_here() {
  /opt/node24/bin/node -e '
    const dns = require("node:dns").promises;
    const [ip, ...names] = process.argv.slice(1);
    (async () => {
      const ns = await dns.resolveNs("tiyulplus.com");
      const servers = (await Promise.all(ns.map((n) => dns.resolve4(n).catch(() => [])))).flat();
      const r = new dns.Resolver();
      r.setServers(servers);
      for (const name of names) {
        const a = await r.resolve4(name).catch(() => []);
        if (a.length !== 1 || a[0] !== ip) process.exit(1);
      }
    })().catch(() => process.exit(1));
  ' "$IP" tiyulplus.com www.tiyulplus.com
}

if [ "${1:-}" != "--now" ]; then
  echo "waiting for tiyulplus.com and www.tiyulplus.com to point at $IP ..."
  until dns_here; do sleep 15; done
  echo "DNS points here"
fi

# Load whatever is in the env file now: the secrets Vercel would not release
# are typically filled in just before the DNS change. Server-side variables
# only - a NEXT_PUBLIC_* change still needs `npm run deploy`.
missing=$(for k in PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET PAYPAL_WEBHOOK_ID RESEND_API_KEY \
  PURCHASE_ALERT_WEBHOOK CRON_SECRET; do
  grep -qE "^$k=.+" /opt/tiyulplus-web/shared/env || printf '%s ' "$k"
done)
[ -z "$missing" ] || echo "!! going live WITHOUT: $missing- payments/mail/alerts are off until they are set" >&2
systemctl restart tiyulplus-web
for _ in $(seq 1 60); do
  curl -fsS -m 5 -o /dev/null http://127.0.0.1:4800/api/health && break
  sleep 1
done

cp -a "$CF" "$CF.bak-tiyulplus-$(date +%Y%m%d-%H%M%S)"
# `caddy validate` runs as root and creates a missing log file owned by root,
# mode 600; Caddy runs as `caddy`, cannot open it, and the reload fails
# (happened 2026-11-15). The file has to exist, and be Caddy's, first.
LOG=/var/log/caddy/tiyulplus.log
[ -e "$LOG" ] || install -o caddy -g caddy -m 644 /dev/null "$LOG"
chown caddy:caddy "$LOG"
tmp=$(mktemp)
# Everything outside this script's markers stays byte-for-byte as it was.
awk '/^# >>> tiyul\+ website/{skip=1} !skip{print} /^# <<< tiyul\+ website/{skip=0}' "$CF" > "$tmp"
{ printf '\n'; cat "$BLOCK"; } >> "$tmp"
caddy validate --adapter caddyfile --config "$tmp" >/dev/null
install -m 644 -o root -g root "$tmp" "$CF"
rm -f "$tmp"
systemctl reload caddy
echo "Caddy reloaded with the tiyul+ blocks"

# The certificate is the part that can still fail; say so loudly if it does.
# --resolve pins the check to this box: the local resolver may still hand out
# Vercel's address, which would make a broken setup look fine.
for _ in $(seq 1 24); do
  if curl -fsS -m 10 -o /dev/null --resolve www.tiyulplus.com:443:127.0.0.1 \
    "https://www.tiyulplus.com/api/health" 2>/dev/null; then
    echo "https://www.tiyulplus.com is served from this box, with a valid certificate"
    exit 0
  fi
  sleep 5
done
echo "!! no valid HTTPS answer after 2 minutes - journalctl -u caddy -n 100" >&2
exit 1
