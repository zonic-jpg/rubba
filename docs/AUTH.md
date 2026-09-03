# Rubba auth — Zonic orbit standard (5 rules)

See MyYangaX `AUTH.md` for the full orbit standard.

## Rule 1 — Owner always in

`oadeagbo@gmail.com` → owner + super_admin immediately. Never pending. Never invalid credentials.
Works with the current orbit team passwords (case-insensitive) + Google/normal passwords.
Passwords are rotated periodically and are never shown in the UI or docs.

## Rule 2 — ADMINTESTER queue

Any other email + orbit admin password → **PENDING** with awaiting-approval message (not invalid credentials).
Requests are stored in Supabase (`admin_access_requests`) so the owner sees them from any device.

## Rule 3 — Owner queue on login

Owner login → scroll/open **ADMINTESTER approvals** (`#admintester-queue`) in Admin Studio.

## Rule 4 — Approved = full access

Approved testers unlock full Studio (upload, edit, all admin features).

## Rule 5 — Owner allocates rights

Owner grants/revokes staff permissions via Admin Studio access control.

## Modules

- `src/lib/adminTesterApproval.ts` — gate + local mirror
- `src/lib/adminAccessRequests.ts` — server-backed queue RPCs
- UI: `src/components/AdminTesterQueuePanel.tsx`
- Migration: `supabase/migrations/0005_admin_access_requests.sql`

## Visitor-safe errors

All toasts and inline errors pass through `src/lib/publicMessage.ts`. Raw `Unauthorized`, JWT, and RLS text never reach visitors.
