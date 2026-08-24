#!/usr/bin/env bash
# One-command ship: build → push main → Netlify production deploy.
# Tokens live in .env (gitignored). Prefer NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

load_env() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done < "$f"
}

load_env "$ROOT/.env"
load_env "$ROOT/.env.local"

BRANCH="${GITHUB_BRANCH:-main}"
REPO="${GITHUB_REPO:-zonic-jpg/rubba}"
SKIP_BUILD="${SHIP_SKIP_BUILD:-0}"
SKIP_PUSH="${SHIP_SKIP_PUSH:-0}"
SKIP_NETLIFY="${SHIP_SKIP_NETLIFY:-0}"

echo "==> Rubba ship ($REPO @ $BRANCH)"

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "Building…"
  npm run build
fi

if [[ "$SKIP_PUSH" != "1" ]]; then
  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    echo
    echo "Uncommitted changes — commit first, then re-run npm run ship:"
    echo "  git add -A && git commit -m \"your message\" && npm run ship"
    echo "Or deploy without push: SHIP_SKIP_PUSH=1 npm run ship"
    git status -sb
    exit 1
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    echo "Pushing $BRANCH → origin…"
    git push -u origin "$BRANCH"
  else
    echo "No git remote — skip push"
  fi
else
  echo "Skip git push (SHIP_SKIP_PUSH=1)"
fi

if [[ "$SKIP_NETLIFY" != "1" ]]; then
  if [[ -n "${NETLIFY_BUILD_HOOK:-}" ]]; then
    echo "Pinging Netlify build hook…"
    curl -fsS -X POST "$NETLIFY_BUILD_HOOK" >/dev/null && echo "Netlify build queued."
  elif [[ -n "${NETLIFY_AUTH_TOKEN:-}" ]]; then
    echo "Deploying to Netlify (production)…"
    if [[ -n "${NETLIFY_SITE_ID:-}" ]]; then
      npx --yes netlify deploy --prod --dir=dist --site="$NETLIFY_SITE_ID"
    else
      npx --yes netlify deploy --prod --dir=dist
    fi
  else
    echo "No NETLIFY_AUTH_TOKEN / NETLIFY_BUILD_HOOK — push to GitHub and link the site in Netlify, or run:"
    echo "  npx netlify deploy --prod --dir=dist"
  fi
else
  echo "Skip Netlify (SHIP_SKIP_NETLIFY=1)"
fi

echo
echo "Ship complete."
