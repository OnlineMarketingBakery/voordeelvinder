#!/usr/bin/env bash
# Build and (re)start the site on the Ploi server. Ploi's deploy script pulls the repo and
# then runs this file, so the deploy steps are versioned with the code.
#
# The running site keeps serving the previous build until the new one is ready:
# - dependencies are reinstalled only when package-lock.json or the Node version changed
#   (npm ci deletes node_modules under the live process);
# - the build goes to dist.next and replaces dist only when it succeeded;
# - the deploy succeeds only when /api/health answers with the new commit; otherwise the
#   previous build is restored.
set -euo pipefail

cd "$(dirname "$0")/.."

# Ploi starts one deploy per push, so quick merges overlap. Run them one at a time.
exec 9>"${HOME}/.voordeelvinder-deploy.lock"
if ! flock -w 600 9; then
  echo "Another deploy has been running for 10 minutes; giving up." >&2
  exit 1
fi

APP=voordeelvinder

if [ ! -f .env ]; then
  echo "Missing .env in $(pwd). Set it in Ploi: Edit environment." >&2
  exit 1
fi

# Read PORT exactly the way server.mjs does (Node's .env parser).
PORT="$(node -e 'process.loadEnvFile(".env"); process.stdout.write(process.env.PORT ?? "")')"
if [[ ! "$PORT" =~ ^[0-9]+$ ]]; then
  echo "PORT in .env must be a number (got: '${PORT}')." >&2
  exit 1
fi

COMMIT="$(git rev-parse --short HEAD)"
echo "Deploying ${COMMIT} with Node $(node -v), npm $(npm -v)"

DEPS_STAMP="$(node -v) $(node -e 'process.stdout.write(require("node:crypto").createHash("sha256").update(require("node:fs").readFileSync("package-lock.json")).digest("hex"))')"
if [ -d node_modules ] && [ "$(cat node_modules/.deploy-stamp 2>/dev/null)" = "$DEPS_STAMP" ]; then
  echo "Dependencies unchanged; skipping npm ci."
else
  npm ci --no-audit --no-fund
  echo "$DEPS_STAMP" >node_modules/.deploy-stamp
fi

rm -rf dist.next
npm run build -- --outDir dist.next

rm -rf dist.prev
if [ -d dist ]; then mv dist dist.prev; fi
mv dist.next dist

healthy() {
  local body=""
  for _ in $(seq 1 30); do
    body="$(curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || true)"
    if [[ $body == *"\"commit\":\"$1\""* ]]; then
      echo "Healthy: ${body}"
      return 0
    fi
    sleep 1
  done
  echo "No healthy response for commit $1 on port ${PORT} (last: ${body:-none})." >&2
  return 1
}

pm2 startOrReload ecosystem.config.cjs --update-env
if healthy "$COMMIT"; then
  pm2 save
  exit 0
fi

pm2 logs "$APP" --lines 40 --nostream >&2 || true
if [ -d dist.prev ]; then
  echo "Restoring the previous build." >&2
  rm -rf dist.failed
  mv dist dist.failed
  mv dist.prev dist
  pm2 startOrReload ecosystem.config.cjs --update-env || true
fi
exit 1
