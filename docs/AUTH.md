# Rubba auth — Zonic orbit standard (5 rules)

See MyYangaX `AUTH.md` for the full orbit standard.

## Rule 1 — Owner always in

`oadeagbo@gmail.com` → owner + super_admin immediately. Never pending. Never invalid credentials.
Works with `admintester1` / `ADMINTESTER1` / `admin123` / `rubbaxadmin1` (case-insensitive) + Google/normal passwords.

## Rule 2 — ADMINTESTER queue

Any other email + admin password → **PENDING** with awaiting-approval message (not invalid credentials).

## Rule 3 — Owner queue on login

Owner login → scroll/open **ADMINTESTER approvals** (`#admintester-queue`) in Admin Studio.

## Rule 4 — Approved = full access

Approved testers unlock full Studio (upload, edit, all admin features).

## Rule 5 — Owner allocates rights

Owner grants/revokes staff permissions via Admin Studio access control.

## Module

`src/lib/adminTesterApproval.ts` · UI: `src/components/AdminTesterQueuePanel.tsx`
