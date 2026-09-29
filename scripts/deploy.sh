#!/usr/bin/env bash
# Build and (re)start the site on the Ploi server. Ploi's deploy script pulls the repo and
# then runs this file, so the deploy steps are versioned with the code.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env in $(pwd). Set it in Ploi: Edit environment." >&2
  exit 1
fi

PORT="$(sed -n 's/^PORT=//p' .env | tail -n 1)"
if [ -z "$PORT" ]; then
  echo "PORT is not set in .env." >&2
  exit 1
fi

echo "Node $(node -v), npm $(npm -v)"
npm ci --no-audit --no-fund
npm run build

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# Fail the deploy if the new build does not answer within ~30 seconds.
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "Healthy: $(curl -fsS "http://127.0.0.1:${PORT}/api/health")"
    exit 0
  fi
  sleep 1
done

echo "Health check failed on port ${PORT}. Last log lines:" >&2
pm2 logs voordeelvinder --lines 40 --nostream >&2 || true
exit 1
