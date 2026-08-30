# Rubba — Hostile Audit

**Scope:** Full adversarial review of the reconstructed `main` branch (React + Vite frontend, Supabase Postgres + RLS, Supabase Edge Functions for payments).
**Verdict:** The payment and entitlement system provides **no real enforcement** — there are three independent ways to get a paid tier for free. Admin access is gated by passwords hard-coded in client-readable code. Fix the Critical items before taking real money or storing real user data.

Severity key: **Critical** = exploitable now, real money/data at stake · **High** = serious, likely exploitable · **Medium** = weakness / broken-by-design · **Low** = hygiene.

---

## CRITICAL

### C1 — Payment webhook has no signature verification (free upgrades for anyone)
`supabase/functions/payment-webhook/index.ts`

The webhook accepts a plain JSON body `{ gateway, reference, tierId, userId, status }` and, if `status` is `"success"`, upserts `payment_records` as completed and upserts `user_usage` with the requested `tier_id`. It **never verifies the request came from Paystack / Flutterwave / Stripe** (no `x-paystack-signature`, `Stripe-Signature`, or Flutterwave `verif-hash` check) and it trusts the `userId` and `tierId` from the body.

Because the function runs with the **service role key** (bypasses all RLS), anyone who knows the URL can `POST { status:"success", tierId:"<any>", userId:"<any victim>" }` and instantly grant any tier to any account — free, and to other people's accounts.

**Fix:** Verify the provider signature against the raw request body using the provider's secret before trusting anything. Re-fetch the transaction from the provider's API by `reference` and confirm `amount` + `status` server-side. Derive `tierId`/price from that verified transaction, not from the body. Reject on mismatch.

### C2 — Tier is granted from an unverified URL parameter
`src/App.tsx:20-26`

On load, if the URL contains `?payment=return`, the app reads `tier` straight from the query string and calls `applyTier(tier)` with no check that any payment happened. Visiting `https://<site>/?payment=return&tier=premium` upgrades the visitor. `applyTier` is also purely client-side state.

**Fix:** Never grant entitlement from a URL param. On return, call the backend with the `reference`, have the backend verify the payment with the provider, and let the **server** (webhook, C1) be the only thing that writes `user_usage.tier_id`. The client should only *read* the resulting tier.

### C3 — Admin unlock passwords hard-coded in client source
`src/lib/permissions.ts`

`STUDIO_UNLOCK_PASSWORD = "rubbaxadmin1"` plus `"ADMINTESTER1"` and `"admin123"` are constants in the frontend. Frontend code is fully readable in the browser, so these are effectively public. Worse, `src/lib/admin.ts → resolveAdminAccess()` returns `isSuperAdmin: true` with **all permissions** for *anyone* who has unlocked with the shared password, regardless of email. So the admin UI, the data-mode toggle, and every admin panel are reachable by any visitor who reads the bundle.

Server-side damage is currently limited only *by accident* (see M1 — the RLS admin path is broken so writes fail anyway), which is not a security control you want to rely on.

**Fix:** Remove all shared passwords from the client. Gate admin purely on server-verified identity (Supabase auth user matching `admin_registry.super_admin_email`, or a real `role` claim). Admin actions must be authorized server-side (RLS or an edge function using the caller's JWT), never by a client boolean.

---

## HIGH

### H1 — Users can edit their own tier and usage directly
`supabase/migrations/0002_rubba_production.sql` — policy `own usage` on `user_usage` is `FOR ALL USING (auth.uid()::text = user_id)`.

That lets a logged-in user **write** their own usage row, including `tier_id`, `used`, and `bonus_generations`. A user can set `tier_id = 'premium'`, `used = 0`, `bonus_generations = 999999` on themselves — a free upgrade and unlimited generations, no payment path involved.

**Fix:** Split the policy. Allow users `SELECT` on their own row only. All writes to `user_usage` (tier, counters) must come from the service role via edge functions, never from the client.

### H2 — Payment amount is set by the client
`supabase/functions/payment-init/index.ts` + `src/lib/payments/index.ts`

`payment-init` takes `amountNgn` / `amountUsd` from the request body and charges exactly that. A user can initialize the premium tier while sending `amountNgn: 100`. The server never looks up the real price for `tierId`.

**Fix:** In `payment-init`, look up the tier's price from `paid_tiers` server-side by `tierId` and ignore any client-supplied amount.

### H3 — Generation quota is enforced only in the browser
`src/lib/usage.ts` (`canGenerate`, `consumeGeneration`) + `src/lib/genie.ts`

All limit checks run client-side, and `genieRoadmap` POSTs directly to `VITE_GENIE_API_URL` with the model/prompt. If that proxy does not itself enforce auth + per-user quota, anyone can call it unlimited times → uncapped Claude bill and a bypass of all tier limits. (The proxy isn't in this repo, so this needs confirming.)

**Fix:** Enforce auth and quota at the genie proxy, keyed to the verified user and their server-side `user_usage` — treat the client limit as UX only.

### H4 — Silent fallback to an open "super-admin demo" mode on misconfig
`src/lib/supabase.ts` (`hasBackend`), `src/lib/auth.ts` (`authReady`, `signInDemo`), `src/components/AuthModal.tsx`

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing or wrong, `hasBackend` is false and the app silently runs in demo mode: the login defaults to `SUPER_ADMIN_EMAIL` and treats the visitor as super admin, with data in `localStorage`. A single missing/typo'd env var on a production deploy turns the live site into an unauthenticated admin sandbox.

**Fix:** Fail loudly (block the app / show an error) when the backend isn't configured in a production build. Never let production silently degrade into demo/super-admin mode.

---

## MEDIUM

### M1 — Admin content writes are broken in production (and errors are swallowed)
`supabase/migrations/0001_rubba.sql` + `src/lib/admin.ts`

Write policies for `content`, `personas`, `pathways`, `app_settings`, `paid_tiers`, `brand_cards` all require a row in `user_roles` with `role='admin'`. **Nothing ever populates `user_roles`** — the `handle_new_user()` trigger only writes `profiles`, and there's no bootstrap insert. So even the real super admin's writes are rejected. Separately, `grantStaffAccess` / `revokeStaffAccess` / `transferSuperAdmin` / registry writes call `supabase.from(...).upsert(...)` **without checking the returned error** and then `return { ok: true }` — so failures look like success in the UI and silently don't persist.

**Fix:** Decide the admin model (populate `user_roles`, or switch these policies to the JWT-email check already used for `admin_registry`). Check and surface Supabase errors on every write instead of returning `ok:true` blindly.

### M2 — Payment edge functions are open (CORS `*`, no auth)
`payment-init` returns `Access-Control-Allow-Origin: *` and requires no caller auth, so any origin can spin up checkout sessions (abuse / spam / cost). **Fix:** Require the caller's Supabase JWT, verify it, and restrict CORS to your own origins.

### M3 — Staff list and super-admin email readable by any logged-in user
`0003_admin_permissions.sql` — `read admin_registry` and `read admin_staff` are `USING (true)` for all authenticated users, exposing every staff email + permission set. **Fix:** Restrict these SELECTs to the super admin, or expose only what the UI strictly needs.

### M4 — Financial projection math is inconsistent and over-claims "location-aware"
`src/lib/genie.ts → localRoadmap`

Inflation is compounded over `Math.min(years, 12)` for the future-value target but the savings projection compounds over the full `years`, biasing "coverage"/score upward for long horizons. Inflation (`0.15`) and growth (`1.16`) are hard-coded and **do not vary by city**, despite the product's "location-aware inflation engine, 40+ cities" claim — `localRoadmap` only varies the savings *rate* by income. Users are shown a funded-percentage and score that can mislead. The fallback roadmap also omits the "not regulated financial advice" line that the AI prompt includes. **Fix:** Use one consistent time horizon; make the city actually affect the numbers (or soften the marketing claim); show the disclaimer on all roadmap output.

---

## LOW

- **L1** — The committed `dist/` build appears out of sync with `src` (the current admin password constants weren't found in it). Rebuild and redeploy from source so what's live matches what's audited; don't hand-edit `dist`.
- **L2** — `AuthModal` pre-fills the email field with `SUPER_ADMIN_EMAIL`, nudging every visitor toward the owner account. Default it blank.
- **L3** — General CORS hygiene: lock all edge-function CORS to known origins once the app's domains are fixed.

---

## Suggested order of work
1. **C1 + C2 + H2** together — close the payment/entitlement path (webhook signature verification, server-verified tier, ignore client amount, no URL-param grants).
2. **H1** — lock down `user_usage` writes to the server.
3. **C3 + H4 + M1** — real server-side admin authorization; fail loudly on misconfig; fix the admin write path and stop swallowing errors.
4. **H3** — confirm/lock the genie proxy quota.
5. **Medium / Low** — hardening and correctness.

*Nothing here is legal or financial advice; it's an engineering review. Given the app gives money guidance to real users, consider a professional pen-test before launch.*
