#!/usr/bin/env bash
# One-time setup of the VPS for the tiyul+ website. Idempotent - safe to rerun
# (it is how a changed .service or .timer file gets installed).
#
#   scp -r deploy tiyul-vps:/tmp/tiyulplus-deploy && ssh tiyul-vps bash /tmp/tiyulplus-deploy/bootstrap.sh
set -euo pipefail

APP=/opt/tiyulplus-web
HERE=$(cd "$(dirname "$0")" && pwd)

id tiyulplus >/dev/null 2>&1 ||
  useradd --system --home-dir "$APP/shared/home" --no-create-home --shell /usr/sbin/nologin tiyulplus

install -d -o root -g root -m 755 "$APP" "$APP/releases" "$APP/shared"
install -d -o tiyulplus -g tiyulplus -m 750 "$APP/shared/home" "$APP/shared/image-cache"
# The secrets. Readable by the app, writable only by root.
[ -f "$APP/shared/env" ] || install -o root -g tiyulplus -m 640 /dev/null "$APP/shared/env"
touch "$APP/shared/releases.log"

install -m 644 "$HERE/tiyulplus-web.service" "$HERE/tiyulplus-warm.service" \
  "$HERE/tiyulplus-warm.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable tiyulplus-web.service >/dev/null
systemctl enable --now tiyulplus-warm.timer >/dev/null
echo "bootstrap done: $APP, user tiyulplus, tiyulplus-web.service, tiyulplus-warm.timer"
