# Rubba on AWS — deployment guide

Rubba is a **static React SPA**. AWS hosts the frontend only. Supabase (Postgres, Auth, Edge Functions) and payment gateways stay external.

## Architecture

```
User → Route 53 → CloudFront (HTTPS) → S3 (dist/)
                    ↓
              Browser calls:
              • Supabase (auth, data)
              • Supabase Edge Functions (payment-init / payment-webhook)
              • Paystack / Flutterwave / Stripe (redirect checkout)
```

## Prerequisites

| Item | Where |
|------|--------|
| Supabase project | [supabase.com](https://supabase.com) |
| Migrations `0001`–`0003` | Run in SQL editor or `supabase db push` |
| Edge functions | `payment-init`, `payment-webhook` |
| Edge secrets | `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| AWS account | S3, CloudFront, ACM, IAM |
| Domain (optional) | Route 53 or external DNS |

## 1. Supabase (before AWS)

```bash
# From project root, with Supabase CLI linked to your project:
supabase db push
supabase functions deploy payment-init
supabase functions deploy payment-webhook
```

Set secrets in Supabase Dashboard → Edge Functions → Secrets.

Add **Auth redirect URL**: `https://your-production-domain.com`

## 2. Production build env

Create `deploy/aws/production.env` (do not commit):

```bash
VITE_DATA_MODE=production
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# Optional — defaults to SUPABASE_URL/functions/v1
# VITE_PAYMENT_API_URL=
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Build:

```bash
export $(grep -v '^#' deploy/aws/production.env | xargs)
npm ci
npm run build
```

## 3. AWS one-time setup

### S3 bucket

- Name: e.g. `rubba-app-prod`
- Block all public access (CloudFront OAC will read objects)
- Enable versioning (optional)

### CloudFront distribution

- Origin: S3 bucket (Origin Access Control)
- Default root object: `index.html`
- Compress objects: Yes
- Viewer protocol: Redirect HTTP → HTTPS
- Alternate domain + ACM cert (us-east-1) if using custom domain

> Rubba uses a single-page app with **query-param routing** (`?payment=return`). No special 404→index rule is required unless you add client-side routes later.

### IAM deploy user/role

Permissions needed:

- `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the bucket
- `cloudfront:CreateInvalidation` on the distribution

## 4. Deploy

```bash
chmod +x deploy/aws/deploy.sh
./deploy/aws/deploy.sh rubba-app-prod E1234567890ABC
```

Or manually:

```bash
aws s3 sync dist/ s3://rubba-app-prod/ --delete
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

## 5. Payment gateway callbacks

Set return URLs in each dashboard to your production domain:

- Paystack / Flutterwave: `https://your-domain.com/?payment=return`
- Stripe success URL is set by `payment-init` edge function

## 6. Verify

```bash
npm run verify          # build + seed checks
npm run simulate:aws    # full AWS preflight + preview server test
```

## Cost estimate (low traffic)

| Service | ~Monthly |
|---------|----------|
| S3 + CloudFront | $1–5 |
| Route 53 hosted zone | $0.50 |
| Supabase free tier | $0 (upgrade as needed) |
| WAF (optional) | $5+ |

## CI/CD (CodePipeline sketch)

1. **Source**: GitHub
2. **Build**: CodeBuild — `npm ci && npm run build` with `VITE_*` from Secrets Manager
3. **Deploy**: `aws s3 sync` + CloudFront invalidation

See `buildspec.yml` for a CodeBuild example.
