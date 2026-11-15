#!/usr/bin/env bash
# Builds one release of the tiyul+ website on the VPS and makes it live.
#
# Run by scripts/deploy-vps.sh, as root, from inside the freshly extracted
# release directory:   bash deploy/release.sh <git-sha>
#
# Every step before the symlink swap can fail without the live site noticing:
#   1. npm ci + next build, inside a memory-capped cgroup. The box runs other
#      services too; if the build runs away, it has to be the thing the kernel
#      kills, not one of them.
#   2. a smoke run of the new build on a spare port.
#   3. swap `current`, restart, health check - and swap back if that fails.
set -euo pipefail

APP=/opt/tiyulplus-web
NODE_BIN=/opt/node24/bin
PORT=4800
SMOKE_PORT=4801
KEEP=4
BUILD_MEM=${BUILD_MEM:-1800M}
BUILD_SWAP=${BUILD_SWAP:-1G}

sha=${1:?usage: release.sh <git-sha>}
rel=$(pwd -P)
case "$rel" in
  "$APP"/releases/*) ;;
  *) echo "release.sh must run from inside $APP/releases/<id>" >&2; exit 1 ;;
esac
id=$(basename "$rel")
started=$(date +%s)

health() { # <port> <seconds>
  for _ in $(seq 1 "$2"); do
    curl -fsS -m 5 "http://127.0.0.1:$1/api/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

page_ok() { # <port> <path> - 200 and the trademark footer, i.e. a real page
  # Captured rather than piped: under pipefail, `curl | grep -q` fails whenever
  # grep stops reading early and curl dies of SIGPIPE.
  local body
  body=$(curl -fsS -m 30 "http://127.0.0.1:$1$2") && [[ $body == *blackz-signature* ]]
}

echo "==> release $id ($sha)"
echo "$sha" > REVISION
chown -R tiyulplus:tiyulplus "$rel"
# After the chown, so the chown cannot follow the link into the secrets file.
ln -sfn "$APP/shared/env" .env.production.local

echo "==> npm ci + next build (capped at $BUILD_MEM RAM + $BUILD_SWAP swap)"
systemd-run --scope --quiet --unit="tiyulplus-build-$$" \
  -p MemoryMax="$BUILD_MEM" -p MemorySwapMax="$BUILD_SWAP" -p CPUWeight=20 -p IOWeight=20 \
  runuser -u tiyulplus -- env -i \
    PATH="$NODE_BIN:/usr/bin:/bin" HOME="$APP/shared/home" NEXT_TELEMETRY_DISABLED=1 \
  bash -c '
    cd "$1"
    npm ci --no-audit --no-fund --loglevel=error && npm run build
    rc=$?
    peak=$(cat "/sys/fs/cgroup$(cut -d: -f3 /proc/self/cgroup)/memory.peak" 2>/dev/null || echo 0)
    echo "==> build peak memory: $((peak / 1048576)) MB"
    exit $rc
  ' _ "$rel"

# The image optimiser's cache outlives releases: a catalog photo at a given URL
# never changes (minimumCacheTTL is a year), so re-encoding all of them after
# every deploy would be pure waste.
install -d -o tiyulplus -g tiyulplus "$APP/shared/image-cache" .next/cache
rm -rf .next/cache/images
ln -sfn "$APP/shared/image-cache" .next/cache/images

echo "==> smoke run on :$SMOKE_PORT"
systemctl stop tiyulplus-smoke 2>/dev/null || true
systemd-run --quiet --unit=tiyulplus-smoke --collect \
  -p User=tiyulplus -p Group=tiyulplus -p WorkingDirectory="$rel" -p MemoryMax=1500M \
  -E NODE_ENV=production -E NEXT_TELEMETRY_DISABLED=1 -E HOME="$APP/shared/home" \
  -E PATH="$NODE_BIN:/usr/bin:/bin" \
  "$NODE_BIN/node" node_modules/next/dist/bin/next start -H 127.0.0.1 -p "$SMOKE_PORT"
trap 'systemctl stop tiyulplus-smoke 2>/dev/null || true' EXIT
if ! health "$SMOKE_PORT" 90 || ! page_ok "$SMOKE_PORT" / || ! page_ok "$SMOKE_PORT" /chat; then
  echo "!! smoke run failed - the live site was not touched" >&2
  journalctl -u tiyulplus-smoke -n 60 --no-pager >&2 || true
  exit 1
fi
systemctl stop tiyulplus-smoke
trap - EXIT

echo "==> going live"
prev=$(readlink -f "$APP/current" 2>/dev/null || true)
ln -sfn "$rel" "$APP/.current.new" && mv -Tf "$APP/.current.new" "$APP/current"
systemctl restart tiyulplus-web
if ! health "$PORT" 90; then
  echo "!! new release failed its health check after going live" >&2
  journalctl -u tiyulplus-web -n 60 --no-pager >&2 || true
  if [ -n "$prev" ] && [ -d "$prev" ]; then
    echo "!! putting $(basename "$prev") back" >&2
    ln -sfn "$prev" "$APP/.current.new" && mv -Tf "$APP/.current.new" "$APP/current"
    systemctl restart tiyulplus-web
  fi
  exit 1
fi
echo "$id" >> "$APP/shared/releases.log"

# Keep the newest $KEEP releases, and never the live one or the one before it
# (that is what `npm run deploy -- rollback` goes back to).
ls -1dt "$APP"/releases/*/ | tail -n +$((KEEP + 1)) | while read -r d; do
  d=${d%/}
  [ "$d" = "$rel" ] || [ "$d" = "$prev" ] || rm -rf "$d"
done

echo "==> live: $id in $(( $(date +%s) - started ))s"
