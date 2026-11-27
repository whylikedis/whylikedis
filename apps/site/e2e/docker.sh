#!/usr/bin/env bash
# Run the browser checks inside the official Playwright image whose version is the one installed
# here, so a laptop, a cloud agent and CI all render the same pixels. Build first:
#   npm run e2e:build
# Extra arguments go to `playwright test`, e.g.
#   npm run e2e:docker -- --update-snapshots --project=visual
#   npm run e2e:docker -- --project=ux --grep "daily"
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)" # apps/site
root="$(cd "$here/../.." && pwd)"        # repo root (node_modules live here)
version="$(node -p "require('$root/node_modules/@playwright/test/package.json').version")"
image="mcr.microsoft.com/playwright:v${version}-noble"

node "$here/e2e/require-build.mjs" || exit 1
if [ ! -f "$here/.next/BUILD_ID" ]; then
  echo "No built site. Run: npm run e2e:build --workspace @whylikedis/site" >&2
  exit 1
fi

exec docker run --rm --ipc=host --init \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e CI="${CI:-}" \
  -e SITE_E2E_DOCKER=1 \
  -v "$root:$root" \
  -w "$here" \
  "$image" \
  npx --no playwright test "$@"
