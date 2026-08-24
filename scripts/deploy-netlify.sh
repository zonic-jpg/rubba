#!/usr/bin/env bash
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
npm run build
# Prefer existing auth; create site named rubba if needed
if ! npx --yes netlify status >/dev/null 2>&1; then
  echo "Run: npx netlify login"
  exit 1
fi
npx --yes netlify deploy --prod --dir=dist --message "Rubba production"
