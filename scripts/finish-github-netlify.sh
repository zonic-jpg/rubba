#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
source "/Users/olufemiadeagbo/Downloads/AdSpotX-COMPLETE/.env"
set +a
: "${GITHUB_TOKEN:?GITHUB_TOKEN missing in AdSpot .env}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi
if [ ! -f .git/config ]; then
  git init -b main || true
fi
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/zonic-jpg/rubba.git"

# Create repo if missing
code=$(curl -s -o /tmp/rubba_chk.json -w "%{http_code}" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/zonic-jpg/rubba)
if [ "$code" = "404" ]; then
  curl -fsS -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/orgs/zonic-jpg/repos \
    -d '{"name":"rubba","private":false}' \
  || curl -fsS -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d '{"name":"rubba","private":false}'
fi

git push -u "https://${GITHUB_TOKEN}@github.com/zonic-jpg/rubba.git" HEAD:main

if [ -n "${NETLIFY_AUTH_TOKEN:-}" ] && [ "${#NETLIFY_AUTH_TOKEN}" -gt 20 ]; then
  npx --yes netlify-cli sites:list --json >/tmp/nl_sites.json || true
  npx --yes netlify-cli deploy --prod --dir=dist --auth="$NETLIFY_AUTH_TOKEN" --site=rubba \
    || npx --yes netlify-cli sites:create --name=rubba --auth="$NETLIFY_AUTH_TOKEN" \
    && npx --yes netlify-cli deploy --prod --dir=dist --auth="$NETLIFY_AUTH_TOKEN"
  echo "Try: https://rubba.netlify.app"
else
  echo "No NETLIFY_AUTH_TOKEN — run after netlify login:"
  echo "cd /Users/olufemiadeagbo/Downloads/rubba-2 && npx --yes netlify-cli deploy --prod --dir=dist"
fi
