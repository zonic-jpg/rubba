# Rubba — AWS staging handoff

**App:** Rubba v2.0.0 — React SPA (static frontend)  
**What AWS hosts:** `dist/` only (S3 + CloudFront)  
**What AWS does NOT host:** Database, auth, payments API (Supabase + payment gateways)

---

## 1. What you are deploying

| Layer | Technology | AWS? |
|-------|------------|------|
| Frontend | React + Vite static build | **Yes** — S3 + CloudFront |
| API / DB / Auth | Supabase | No — external SaaS |
| Payment init/webhook | Supabase Edge Functions | No — deploy in Supabase |
| Paystack / Flutterwave / Stripe | Third-party checkout | No — redirect from browser |

**Architecture**

```
Browser → CloudFront → S3 (dist/)
              ↓
         Supabase (auth, content, usage)
              ↓
         Edge Functions: payment-init, payment-webhook
              ↓
         Paystack / Flutterwave / Stripe
```

---

## 2. Staging deliverables in this package

| Path | Purpose |
|------|---------|
| `dist/` | Pre-built static site — upload to S3 as-is for quick staging |
| `deploy/aws/deploy.sh` | S3 sync + CloudFront invalidation |
| `deploy/aws/buildspec.yml` | CodeBuild template for CI/CD |
| `deploy/aws/README.md` | Full deploy guide |
| `deploy/aws/production.env.example` | Build-time env vars (fill before rebuild) |
| `src/` + `package.json` | Source — only needed if rebuilding with staging env |
| `supabase/` | **Not AWS** — for backend team (migrations + edge functions) |

---

## 3. AWS setup checklist (staging)

### S3
- [ ] Create bucket, e.g. `rubba-staging`
- [ ] Block all public access
- [ ] Allow CloudFront Origin Access Control (OAC)

### CloudFront
- [ ] Origin → staging S3 bucket
- [ ] Default root object: `index.html`
- [ ] HTTPS only (redirect HTTP)
- [ ] Enable compression
- [ ] Staging domain, e.g. `staging.rubba.example.com`
- [ ] ACM certificate in **us-east-1** (required for CloudFront custom domain)

### DNS
- [ ] CNAME/A alias → CloudFront distribution

### IAM
- [ ] Deploy role: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `cloudfront:CreateInvalidation`

### Deploy (quick — use pre-built dist)
```bash
chmod +x deploy/aws/deploy.sh
./deploy/aws/deploy.sh rubba-staging E1234567890ABC
```

Or manual:
```bash
aws s3 sync dist/ s3://rubba-staging/ --delete --exclude "index.html"
aws s3 cp dist/index.html s3://rubba-staging/index.html \
  --cache-control "public,max-age=0,must-revalidate"
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

---

## 4. Build-time environment (if rebuilding from source)

Vite bakes these into the JS bundle at **build time** — not runtime on S3.

```bash
VITE_DATA_MODE=production
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...      # staging/test keys OK
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
# Optional:
# VITE_PAYMENT_API_URL=https://<project>.supabase.co/functions/v1
# VITE_ZONICME_AUTH_URL=https://auth.zonicme.com.ng
```

```bash
export $(grep -v '^#' deploy/aws/production.env | xargs)
npm ci
npm run build
# then deploy dist/ as above
```

**Do not put secret keys** (`PAYSTACK_SECRET_KEY`, etc.) in VITE_ vars — those go in Supabase Edge Function secrets only.

---

## 5. URLs to whitelist after staging domain is live

Give the staging URL to the product owner so they can configure:

| System | Setting | Example value |
|--------|---------|---------------|
| Supabase Auth | Redirect URLs | `https://staging.rubba.example.com` |
| Paystack | Callback URL | `https://staging.rubba.example.com/?payment=return` |
| Flutterwave | Redirect URL | same |
| Stripe | Success URL | set by edge function using callback |

Payment return flow uses query param: `?payment=return&tier=plus` — no SPA 404 rewrite needed.

---

## 6. What is NOT the AWS engineer's job

Handled separately (product owner / backend):

- [ ] Run Supabase migrations `0001` → `0003`
- [ ] Deploy `supabase/functions/payment-init` and `payment-webhook`
- [ ] Set Supabase edge secrets: `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Super admin: `oadeagbo@gmail.com` (seeded in migration 0003)

---

## 7. Verify staging

```bash
# After deploy — from any machine with the repo:
curl -I https://staging.rubba.example.com/
# Expect HTTP 200, index.html loads

# Full local preflight (optional):
npm run simulate:aws
```

**Smoke test in browser:**
1. Site loads, header shows **Live** (if production env baked in) or **Mock** (if mock build)
2. Login / sign-up opens (needs Supabase redirect URL configured)
3. Plans modal opens; billing UI renders
4. Admin Studio (bottom-right) — only for `oadeagbo@gmail.com` after auth

---

## 8. Contact / version

- **Version:** 2.0.0
- **Pre-built:** included in `dist/`
- **Last verified:** `npm run simulate:aws` — 64/64 checks passed
