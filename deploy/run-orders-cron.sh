#!/bin/sh
set -eu

. /opt/foodhub-app/.env.cron
exec /usr/bin/curl --fail --silent --show-error --max-time 700 \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://127.0.0.1:3180/api/cron/orders
