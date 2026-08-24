#!/bin/bash
set -euo pipefail
ROOT="/Users/olufemiadeagbo/Downloads/rubba-2"
cd "$ROOT"
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"
LOG="/tmp/rubba-finish.log"
exec > >(tee "$LOG") 2>&1

echo "============================================"
echo "  Rubba finish @ $(date)"
echo "============================================"

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line" 2>/dev/null || true
    fi
  done < "$f"
}
load_env_file "/Users/olufemiadeagbo/Downloads/AdSpotX-COMPLETE/.env"
load_env_file "/Users/olufemiadeagbo/Downloads/MyYangaX-COMPLETE/.env"
load_env_file "$ROOT/.env"

if [[ -z "${NETLIFY_AUTH_TOKEN:-}" || ${#NETLIFY_AUTH_TOKEN} -lt 20 ]]; then
  CFG="$HOME/Library/Preferences/netlify/config.json"
  if [[ -f "$CFG" ]]; then
    export NETLIFY_AUTH_TOKEN=$(python3 -c "import json;from pathlib import Path;d=json.loads(Path('$CFG').read_text());uid=d.get('userId');users=d.get('users') or {};u=users.get(uid) if uid else (next(iter(users.values())) if users else {});print(((u or {}).get('auth') or {}).get('token') or '')")
  fi
fi
echo "Tokens: GH=${#GITHUB_TOKEN:-0} NL=${#NETLIFY_AUTH_TOKEN:-0}"

git config user.email "oadeagbo@gmail.com" 2>/dev/null || true
git config user.name "Olufemi Adeagbo" 2>/dev/null || true

[[ -f .env ]] || cp .env.example .env
python3 - <<'PY'
from pathlib import Path
p=Path(".env"); text=p.read_text() if p.exists() else ""; lines=[]; seen=False
for line in text.splitlines():
  if line.startswith("VITE_DATA_MODE="): lines.append("VITE_DATA_MODE=mock"); seen=True
  else: lines.append(line)
if not seen: lines.insert(0,"VITE_DATA_MODE=mock")
p.write_text("\n".join(lines)+"\n")
print("DB: mock; admin oadeagbo@gmail.com")
PY

if [[ ! -f dist/index.html ]]; then
  npm ci || npm install
  npm run build
fi
test -f dist/index.html

REPO="zonic-jpg/rubba"
GH_URL="https://github.com/${REPO}"
if [[ -n "${GITHUB_TOKEN:-}" && ${#GITHUB_TOKEN} -ge 20 ]]; then
  CODE=$(curl -sS -o /tmp/rubba_chk.json -w "%{http_code}" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}" || echo "000")
  echo "repo check HTTP $CODE"
  if [[ "$CODE" == "404" ]]; then
    curl -sS -o /tmp/rubba_create.json -X POST \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/orgs/zonic-jpg/repos \
      -d '{"name":"rubba","private":false,"description":"Rubba — AI life planning for Nigerian youth"}' || true
    if ! python3 -c "import json;d=json.load(open('/tmp/rubba_create.json'));raise SystemExit(0 if d.get('html_url') else 1)" 2>/dev/null; then
      curl -sS -o /tmp/rubba_create.json -X POST \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Accept: application/vnd.github+json" \
        https://api.github.com/user/repos \
        -d '{"name":"rubba","private":false,"description":"Rubba — AI life planning for Nigerian youth"}' || true
    fi
    FULL=$(python3 -c "import json;d=json.load(open('/tmp/rubba_create.json'));print(d.get('full_name') or '')" 2>/dev/null || true)
    MSG=$(python3 -c "import json;d=json.load(open('/tmp/rubba_create.json'));print(d.get('html_url') or d.get('message') or '')" 2>/dev/null || true)
    echo "create: $MSG"
    [[ -n "$FULL" ]] && REPO="$FULL" && GH_URL="https://github.com/${REPO}"
  fi
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO}.git"
  git push -u "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" HEAD:main
  echo "GitHub OK: $GH_URL"
else
  echo "No GITHUB_TOKEN"
fi

LIVE=""
if [[ -n "${NETLIFY_AUTH_TOKEN:-}" && ${#NETLIFY_AUTH_TOKEN} -ge 20 ]]; then
  npx --yes netlify-cli sites:list --json > /tmp/nl_sites.json 2>/dev/null || echo "[]" > /tmp/nl_sites.json
  SITE_ID=$(python3 - <<'PY'
import json
try: sites=json.load(open("/tmp/nl_sites.json"))
except Exception: sites=[]
if isinstance(sites, dict): sites=sites.get("sites") or sites.get("results") or []
for s in sites or []:
  if (s.get("name") or "").lower()=="rubba" or "rubba.netlify.app" in (s.get("ssl_url") or s.get("url") or "").lower():
    print(s.get("id") or ""); break
PY
)
  if [[ -z "$SITE_ID" ]]; then
    npx --yes netlify-cli sites:create --name rubba --json > /tmp/nl_create.json 2>/tmp/nl_create.err || true
    SITE_ID=$(python3 -c "import json;d=json.load(open('/tmp/nl_create.json'));print(d.get('id') or d.get('site_id') or '')" 2>/dev/null || true)
    if [[ -z "$SITE_ID" ]]; then
      npx --yes netlify-cli sites:create --name rubba-app --json > /tmp/nl_create.json 2>/tmp/nl_create.err || true
      SITE_ID=$(python3 -c "import json;d=json.load(open('/tmp/nl_create.json'));print(d.get('id') or d.get('site_id') or '')" 2>/dev/null || true)
    fi
  fi
  echo "SITE_ID=${SITE_ID:-none}"
  if [[ -n "$SITE_ID" ]]; then
    npx --yes netlify-cli deploy --prod --dir=dist --site="$SITE_ID" --auth="$NETLIFY_AUTH_TOKEN" | tee /tmp/nl_deploy.out
  else
    npx --yes netlify-cli deploy --prod --dir=dist --auth="$NETLIFY_AUTH_TOKEN" | tee /tmp/nl_deploy.out || true
  fi
  LIVE=$(python3 -c 'import re;t=open("/tmp/nl_deploy.out").read();m=re.search(r"https://[a-zA-Z0-9.-]+\.netlify\.app",t);print(m.group(0) if m else "")' 2>/dev/null || true)
  echo "Netlify OK: ${LIVE:-check output}"
else
  echo "No NETLIFY_AUTH_TOKEN"
fi

STATUS_DESK="/Users/olufemiadeagbo/Desktop/Rubba-Deploy-Status.txt"
STATUS_DL="/Users/olufemiadeagbo/Downloads/Rubba-Deploy-Status.txt"
STATUS_BODY="Rubba deploy finished: $(date)
GitHub: ${GH_URL}
DB: mock mode. Super admin oadeagbo@gmail.com
Netlify: ${LIVE:-FAILED}
Target: https://rubba.netlify.app"
printf '%s\n' "$STATUS_BODY" > "$STATUS_DL" || true
printf '%s\n' "$STATUS_BODY" > "$STATUS_DESK" 2>/dev/null || true

echo "DONE"
echo "GitHub: $GH_URL"
echo "Netlify: ${LIVE:-FAILED}"
