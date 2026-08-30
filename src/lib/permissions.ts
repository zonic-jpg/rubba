/** Canonical super admin — authoritative copy lives in admin_registry (DB). */
export const SUPER_ADMIN_EMAIL = "oadeagbo@gmail.com";

/**
 * SECURITY (audit C3): shared admin passwords must never ship in client code —
 * frontend bundles are fully readable in the browser. Any "studio unlock" is now
 * a LOCAL DEVELOPER convenience only: it is disabled in production builds and,
 * even in dev, it only enables local (localStorage) editing. It NEVER grants
 * real admin rights against the live database — those are enforced server-side
 * by Supabase RLS keyed to the verified account email (see is_rubba_admin()).
 */
const DEV_UNLOCK = (import.meta as any).env?.VITE_DEV_STUDIO_PASSWORD as string | undefined;
const IS_PROD = Boolean((import.meta as any).env?.PROD);

/** Case-insensitive check for the dev-only studio unlock. Always false in prod. */
export function isStudioUnlockPassword(password: string | null | undefined): boolean {
  if (IS_PROD || !DEV_UNLOCK) return false;
  const candidate = String(password ?? "").trim();
  return candidate.length > 0 && candidate === DEV_UNLOCK;
}

export type AdminPermission =
  | "edit_content"
  | "set_prices"
  | "manage_brands"
  | "edit_messaging"
  | "toggle_data_mode"
  | "publish_site";

export const ALL_PERMISSIONS: AdminPermission[] = [
  "edit_content",
  "set_prices",
  "manage_brands",
  "edit_messaging",
  "toggle_data_mode",
  "publish_site",
];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  edit_content: "Edit site content (stories, footer, logo)",
  set_prices: "Set prices and plan limits",
  manage_brands: "Manage brand adverts and sponsors",
  edit_messaging: "Edit homepage and on-screen text",
  toggle_data_mode: "Switch between test/demo data and live data",
  publish_site: "Save changes and publish to the live site",
};

export type StaffMember = {
  email: string;
  permissions: AdminPermission[];
  grantedAt: string;
  grantedBy: string;
};

export type AdminRegistry = {
  superAdminEmail: string;
  staff: StaffMember[];
};

export type AdminAccess = {
  email: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  hasStudioAccess: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildAccess(email: string | null, registry: AdminRegistry): AdminAccess {
  const empty: AdminAccess = {
    email: email ?? "",
    isSuperAdmin: false,
    permissions: [],
    hasStudioAccess: false,
  };
  if (!email) return empty;

  const norm = normalizeEmail(email);
  const superEmail = normalizeEmail(registry.superAdminEmail);

  if (norm === superEmail) {
    return { email: norm, isSuperAdmin: true, permissions: [...ALL_PERMISSIONS], hasStudioAccess: true };
  }

  const staff = registry.staff.find((s) => normalizeEmail(s.email) === norm);
  if (!staff) return { ...empty, email: norm };

  return {
    email: norm,
    isSuperAdmin: false,
    permissions: staff.permissions,
    hasStudioAccess: staff.permissions.length > 0,
  };
}

export function can(access: AdminAccess, perm: AdminPermission): boolean {
  return access.isSuperAdmin || access.permissions.includes(perm);
}

export function defaultRegistry(): AdminRegistry {
  return { superAdminEmail: SUPER_ADMIN_EMAIL, staff: [] };
}

/** True only in a local dev build where the dev unlock is configured. */
export function devStudioUnlockEnabled(): boolean {
  return !IS_PROD && Boolean(DEV_UNLOCK);
}
