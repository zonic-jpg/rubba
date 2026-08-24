import { supabase, hasBackend } from "./supabase";
import { getEffectiveDataMode } from "./content";
import {
  type AdminAccess,
  type AdminPermission,
  type AdminRegistry,
  type StaffMember,
  ALL_PERMISSIONS,
  buildAccess,
  defaultRegistry,
  normalizeEmail,
  SUPER_ADMIN_EMAIL,
} from "./permissions";

const LS_REGISTRY = "rubba_admin_registry";
const LS_STUDIO_UNLOCK = "rubba_studio_unlock";

/** Grant Admin/Studio access via the shared password (persists until sign-out). */
export function unlockStudioAccess(email: string | null) {
  try {
    localStorage.setItem(LS_STUDIO_UNLOCK, normalizeEmail(email || "studio-admin"));
  } catch {
    /* ignore */
  }
}

export function clearStudioUnlock() {
  try {
    localStorage.removeItem(LS_STUDIO_UNLOCK);
  } catch {
    /* ignore */
  }
}

function studioUnlockEmail(): string | null {
  try {
    return localStorage.getItem(LS_STUDIO_UNLOCK);
  } catch {
    return null;
  }
}

function loadMockRegistry(): AdminRegistry {
  try {
    const raw = localStorage.getItem(LS_REGISTRY);
    if (raw) return JSON.parse(raw) as AdminRegistry;
  } catch {
    /* use default */
  }
  return defaultRegistry();
}

function saveMockRegistry(registry: AdminRegistry) {
  localStorage.setItem(LS_REGISTRY, JSON.stringify(registry));
}

async function loadProdRegistry(): Promise<AdminRegistry> {
  if (!supabase) return defaultRegistry();

  const { data: superRow } = await supabase
    .from("admin_registry")
    .select("super_admin_email")
    .eq("id", 1)
    .maybeSingle();

  const { data: staffRows } = await supabase.from("admin_staff").select("*").order("granted_at");

  return {
    superAdminEmail: superRow?.super_admin_email ?? SUPER_ADMIN_EMAIL,
    staff: (staffRows ?? []).map((r) => ({
      email: r.email,
      permissions: r.permissions as AdminPermission[],
      grantedAt: r.granted_at,
      grantedBy: r.granted_by,
    })),
  };
}

async function loadRegistry(): Promise<AdminRegistry> {
  if (getEffectiveDataMode() === "mock" || !hasBackend) {
    return loadMockRegistry();
  }
  return loadProdRegistry();
}

export async function resolveAdminAccess(
  userId: string | null,
  email: string | null,
): Promise<AdminAccess> {
  const unlocked = studioUnlockEmail();
  if (unlocked) {
    return {
      email: email || unlocked,
      isSuperAdmin: true,
      permissions: [...ALL_PERMISSIONS],
      hasStudioAccess: true,
    };
  }
  if (!email && userId === "demo") {
    return buildAccess(SUPER_ADMIN_EMAIL, defaultRegistry());
  }
  const registry = await loadRegistry();
  return buildAccess(email, registry);
}

export async function getAdminRegistry(): Promise<AdminRegistry> {
  return loadRegistry();
}

export async function grantStaffAccess(
  actorEmail: string,
  targetEmail: string,
  permissions: AdminPermission[],
): Promise<{ ok: boolean; error?: string }> {
  const actor = buildAccess(actorEmail, await loadRegistry());
  if (!actor.isSuperAdmin) return { ok: false, error: "Only the super admin can grant access." };

  const email = normalizeEmail(targetEmail);
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (email === normalizeEmail(actorEmail)) return { ok: false, error: "You already have full access." };
  if (permissions.length === 0) return { ok: false, error: "Select at least one permission." };

  const registry = await loadRegistry();
  const existing = registry.staff.findIndex((s) => normalizeEmail(s.email) === email);
  const entry: StaffMember = {
    email,
    permissions,
    grantedAt: new Date().toISOString(),
    grantedBy: normalizeEmail(actorEmail),
  };

  if (existing >= 0) registry.staff[existing] = entry;
  else registry.staff.push(entry);

  if (getEffectiveDataMode() === "mock" || !hasBackend || !supabase) {
    saveMockRegistry(registry);
    return { ok: true };
  }

  await supabase.from("admin_staff").upsert({
    email,
    permissions,
    granted_at: entry.grantedAt,
    granted_by: entry.grantedBy,
  });

  return { ok: true };
}

export async function revokeStaffAccess(
  actorEmail: string,
  targetEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const actor = buildAccess(actorEmail, await loadRegistry());
  if (!actor.isSuperAdmin) return { ok: false, error: "Only the super admin can revoke access." };

  const email = normalizeEmail(targetEmail);
  const registry = await loadRegistry();
  registry.staff = registry.staff.filter((s) => normalizeEmail(s.email) !== email);

  if (getEffectiveDataMode() === "mock" || !hasBackend || !supabase) {
    saveMockRegistry(registry);
    return { ok: true };
  }

  await supabase.from("admin_staff").delete().eq("email", email);
  return { ok: true };
}

export async function transferSuperAdmin(
  actorEmail: string,
  newSuperEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const registry = await loadRegistry();
  const actor = buildAccess(actorEmail, registry);
  if (!actor.isSuperAdmin) return { ok: false, error: "Only the current super admin can transfer." };

  const next = normalizeEmail(newSuperEmail);
  if (!next.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (next === normalizeEmail(actorEmail)) return { ok: false, error: "That is already your email." };

  registry.superAdminEmail = next;
  registry.staff = registry.staff.filter((s) => normalizeEmail(s.email) !== next);

  if (getEffectiveDataMode() === "mock" || !hasBackend || !supabase) {
    saveMockRegistry(registry);
    return { ok: true };
  }

  await supabase.from("admin_registry").upsert({ id: 1, super_admin_email: next });
  await supabase.from("admin_staff").delete().eq("email", next);
  return { ok: true };
}

/** @deprecated use resolveAdminAccess */
export async function isAdmin(userId: string | null, email?: string | null): Promise<boolean> {
  const access = await resolveAdminAccess(userId, email ?? null);
  return access.hasStudioAccess;
}
