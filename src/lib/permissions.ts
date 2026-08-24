/** Canonical super admin — seeded in DB and mock registry */
export const SUPER_ADMIN_EMAIL = "oadeagbo@gmail.com";

/** Shared password that unlocks Admin/Studio access for any email (additive to
 *  the email-based super admin). Client-side unlock only empowers local editing;
 *  production writes remain protected by Supabase RLS. */
export const STUDIO_UNLOCK_PASSWORD = "rubbaxadmin1";

/** All passwords that unlock Admin/Studio access for any email. ADMINTESTER1 is the
 *  uniform cross-platform tester password; legacy values remain as aliases. */
export const STUDIO_UNLOCK_PASSWORDS = [STUDIO_UNLOCK_PASSWORD, "ADMINTESTER1"];

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
  edit_content: "Load & edit content (personas, footer, logo)",
  set_prices: "Set prices & plan limits",
  manage_brands: "Manage brand cards & sponsors",
  edit_messaging: "Edit site messaging & copy",
  toggle_data_mode: "Switch mock ↔ production data",
  publish_site: "Save & publish to live site",
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
    return {
      email: norm,
      isSuperAdmin: true,
      permissions: [...ALL_PERMISSIONS],
      hasStudioAccess: true,
    };
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
  return {
    superAdminEmail: SUPER_ADMIN_EMAIL,
    staff: [],
  };
}
