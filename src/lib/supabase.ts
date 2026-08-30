import { createClient, SupabaseClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const hasBackend = Boolean(url && key);
export const supabase: SupabaseClient | null = hasBackend ? createClient(url!, key!) : null;
/** Only show/call Google OAuth when explicitly enabled — avoids missing-secret errors. */
export const googleAuthEnabled =
  String(import.meta.env.VITE_GOOGLE_AUTH ?? "").trim().toLowerCase() === "true";

/**
 * H4 (audit): in a production build the app must NOT silently fall back to the
 * demo/super-admin sandbox when it is SUPPOSED to be live but the backend is
 * missing. This trips only when production data mode is requested yet no backend
 * is configured — the intentional mock/demo deploy keeps working (and, per the
 * admin.ts fix, no longer auto-grants super-admin to visitors).
 */
const wantsProduction =
  String((import.meta as any).env?.VITE_DATA_MODE ?? "") === "production";
export const backendMisconfigured =
  Boolean((import.meta as any).env?.PROD) && wantsProduction && !hasBackend;
