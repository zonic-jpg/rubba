#!/usr/bin/env bash
# Deploy Rubba dist/ to S3 and invalidate CloudFront cache.
# Usage: ./deploy/aws/deploy.sh <s3-bucket> <cloudfront-distribution-id>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BUCKET="${1:?Usage: deploy.sh <s3-bucket> <cloudfront-distribution-id>}"
DIST_ID="${2:?Usage: deploy.sh <s3-bucket> <cloudfront-distribution-id>}"

if [[ ! -d dist ]]; then
  echo "dist/ not found — run: npm run build (with production VITE_* env)"
  exit 1
fi

echo "→ Syncing dist/ to s3://${BUCKET}/"
aws s3 sync dist/ "s3://${BUCKET}/" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --cache-control "public,max-age=0,must-revalidate" \
  --content-type "text/html"

echo "→ Invalidating CloudFront ${DIST_ID}"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"

echo "✓ Deploy complete"
