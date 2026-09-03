/**
 * Server-backed ADMINTESTER approval queue for Rubba.
 */
import { supabase } from "./supabase";

export const APP_ID = "rubba";

export type AccessStatus = "none" | "pending" | "approved" | "revoked" | "owner";

export type AccessRequestRow = {
  email: string;
  identity?: string | null;
  app?: string | null;
  status?: AccessStatus;
  requested_at?: string | null;
  decided_at?: string | null;
};

export type AccessQueue = {
  pending: AccessRequestRow[];
  approved: AccessRequestRow[];
  revoked: AccessRequestRow[];
};

export const EMPTY_QUEUE: AccessQueue = { pending: [], approved: [], revoked: [] };

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

export async function submitAccessRequest(email: string, identity?: string): Promise<AccessStatus | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("request_admin_access", {
      _email: email,
      _identity: identity ?? email,
      _app: APP_ID,
    });
    if (error) {
      console.warn("[access] request_admin_access", error.message);
      return null;
    }
    return (asRecord(data).status as AccessStatus) ?? "pending";
  } catch (err) {
    console.warn("[access] request_admin_access", err);
    return null;
  }
}

export async function fetchOwnAccessStatus(email: string): Promise<AccessStatus | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("admin_access_status", {
      _email: email,
      _app: APP_ID,
    });
    if (error) return null;
    return (asRecord(data).status as AccessStatus) ?? "none";
  } catch {
    return null;
  }
}

export type QueueResult =
  | { ok: true; queue: AccessQueue }
  | { ok: false; reason: "unauthenticated" | "unavailable" };

export async function fetchAccessQueue(): Promise<QueueResult> {
  if (!supabase) return { ok: false, reason: "unavailable" };
  try {
    const { data, error } = await supabase.rpc("list_admin_access_requests", { _app: APP_ID });
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      const unauthenticated =
        msg.includes("admin sign-in required") ||
        msg.includes("permission denied") ||
        msg.includes("jwt") ||
        msg.includes("row-level security");
      return { ok: false, reason: unauthenticated ? "unauthenticated" : "unavailable" };
    }
    const q = asRecord(data);
    const rows = (v: unknown) => (Array.isArray(v) ? (v as AccessRequestRow[]) : []);
    return {
      ok: true,
      queue: { pending: rows(q.pending), approved: rows(q.approved), revoked: rows(q.revoked) },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export type DecisionResult = { ok: boolean; serverApplied: boolean; message?: string };

export async function decideAccessRequest(
  email: string,
  decision: "approve" | "reject",
): Promise<DecisionResult> {
  if (!supabase) return { ok: false, serverApplied: false, message: "Backend unavailable" };
  try {
    const { data, error } = await supabase.rpc("decide_admin_access", {
      _email: email,
      _decision: decision,
      _app: APP_ID,
    });
    if (error) return { ok: false, serverApplied: false, message: error.message };
    const ok = asRecord(data).ok === true;
    return { ok, serverApplied: ok };
  } catch (err) {
    return { ok: false, serverApplied: false, message: (err as { message?: string })?.message };
  }
}
