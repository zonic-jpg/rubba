# Rubba — AI life planning for Nigerian youth

React + Vite + TypeScript + Supabase. Helps young people take stock of where they are, pick realistic inspiration paths, and track incremental milestones — with sponsored brand options at each step.

## Run locally (mock mode — no backend required)

```bash
npm install
cp .env.example .env    # VITE_DATA_MODE=mock by default
npm run dev             # http://localhost:5173
npm run verify          # build + sanity checks
```

**Mock mode** loads seed data, simulates payments instantly, and saves admin edits to `localStorage`. The header shows a **Mock** pill.

## Production activation

1. Run Supabase migrations: `0001_rubba.sql` then `0002_rubba_production.sql`
2. Set `.env`:
   - `VITE_DATA_MODE=production`
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
3. Deploy edge functions:
   - `supabase/functions/payment-init` — Paystack, Flutterwave, Stripe checkout
   - `supabase/functions/payment-webhook` — confirms payment & upgrades tier
4. Set edge secrets: `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. Run migration `0003_admin_permissions.sql` — seeds **oadeagbo@gmail.com** as super admin
6. Sign in as super admin → open **Admin Studio** (bottom-right)

Toggle **Mock ↔ Production** in Admin Studio without redeploying.

## Super admin & staff permissions

**Super admin:** `oadeagbo@gmail.com` (seeded in DB + mock registry)

| Permission | What it allows |
|------------|----------------|
| Load & edit content | Personas, footer, logo |
| Set prices | Plan limits, tiers, payment settings |
| Manage brand cards | Sponsored brand directory |
| Edit messaging | Hero copy, anti-hype text, etc. |
| Switch data mode | Mock ↔ production |
| Save & publish | Push changes live |

**Super admin only:**
- Grant tick-box rights to staff by email
- Revoke staff access
- **Transfer super admin** — enter new email + click **Transfer** (replaces you; no co-admin join)

In **demo/mock mode**, sign in with any email to test staff rights; use `oadeagbo@gmail.com` for full super admin.

## Plan limits & monetization

| Tier | Generations/month | Price (mock seed) |
|------|-------------------|-------------------|
| Free | 10 (admin-configurable) | ₦0 |
| Plus | 60 | ₦2,500 |
| Pro  | 70 | ₦4,500 |

When a user hits their limit they can wait for the monthly cycle reset or pay via **Paystack / Flutterwave / Stripe** (demo payment in mock mode).

## Features

- **As-is profile** → inspiration personas with milestone timelines → tier check → AI/local roadmap
- **Trackable steps** — tick off progress; brand cards appear per step category (savings, car, home, etc.)
- **Admin Studio** — tiers, limits, brand cards, messaging, personas, mock/production toggle
- **Genie fallback** — always works offline via `localRoadmap()`

## Brand cards

Sponsored mini-directory on each roadmap step. Admin adds cards with category, URL, and sponsor label. Seed includes PiggyVest, Toyota, Innoson, Mixta, BOI, etc. (mock URLs).

## Disclaimer

Rubba is a planning tool, not regulated financial advice. Brand listings are sponsored — users should verify before purchasing.
