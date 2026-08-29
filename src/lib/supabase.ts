import { createClient, SupabaseClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const hasBackend = Boolean(url && key);
export const supabase: SupabaseClient | null = hasBackend ? createClient(url!, key!) : null;
/** Only show/call Google OAuth when explicitly enabled — avoids missing-secret errors. */
export const googleAuthEnabled =
  String(import.meta.env.VITE_GOOGLE_AUTH ?? "").trim().toLowerCase() === "true";
