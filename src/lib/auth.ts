// ZonicMe shared identity.
// Every app points at the SAME ZonicMe Supabase project, so one account works
// across MyYanga, MyAfriart, AdSpot, Owanbe and the ZonicMe hub.
//
// Set these (identical in every app) to your single ZonicMe project:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
//
// True cross-domain SSO (logged into one app => logged into the next with no
// re-entry) additionally needs the apps to share an auth cookie domain — a DNS/
// deploy step done in your account; see ACTIVATION.md. The code below already
// gives one shared account everywhere.

import { supabase, hasBackend, googleAuthEnabled } from "./supabase";
import { SUPER_ADMIN_EMAIL } from "./permissions";

export type ZUser = { id: string; email: string | null; name: string | null };

const DEMO_USER_KEY = "rubba_demo_user";

function mapUser(u: any): ZUser | null {
  if (!u) return null;
  return { id: u.id, email: u.email ?? null, name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null };
}

export { googleAuthEnabled };

/** Continue with Google (redirects back to the app). */
export async function continueWithGoogle(redirectTo: string = window.location.origin) {
  if (!supabase) throw new Error("Auth not configured");
  if (!googleAuthEnabled) throw new Error("Google sign-in is not configured for this site.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

/** Email + password sign-up. Triggers an email OTP to verify. */
export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Auth not configured");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Supabase emails a confirmation code/link; we verify with the OTP below.
}

/** Email + password sign-in for returning users. */
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Auth not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return mapUser(data.user);
}

/** Send a one-time code to an email address. */
export async function sendEmailOtp(email: string) {
  if (!supabase) throw new Error("Auth not configured");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

/** Send a one-time code to a phone number (E.164, e.g. +234...). */
export async function sendPhoneOtp(phone: string) {
  if (!supabase) throw new Error("Auth not configured");
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/** Verify the code the user typed (email or phone). */
export async function verifyOtp(args: { email?: string; phone?: string; token: string }) {
  if (!supabase) throw new Error("Auth not configured");
  const { email, phone, token } = args;
  const { data, error } = await supabase.auth.verifyOtp(
    email ? { email, token, type: "email" } : { phone: phone!, token, type: "sms" }
  );
  if (error) throw error;
  return mapUser(data.user);
}

export async function signOut() {
  localStorage.removeItem(DEMO_USER_KEY);
  if (supabase) await supabase.auth.signOut();
}

function getDemoUser(): ZUser | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    if (raw) return JSON.parse(raw) as ZUser;
  } catch {
    /* ignore */
  }
  return null;
}

/** Mock sign-in for local dev — permissions resolved by email in admin registry */
export async function signInDemo(email: string = SUPER_ADMIN_EMAIL): Promise<ZUser> {
  const norm = email.trim().toLowerCase();
  const user: ZUser = {
    id: `demo-${norm}`,
    email: norm,
    name: norm.split("@")[0],
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  return user;
}

export async function getCurrentUser(): Promise<ZUser | null> {
  if (!supabase) return getDemoUser();
  const { data } = await supabase.auth.getUser();
  return mapUser(data.user);
}

/** Subscribe to auth changes (login/logout) across the app. */
export function onAuthChange(cb: (u: ZUser | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(mapUser(session?.user)));
  return () => data.subscription.unsubscribe();
}

/** Demo mode when no backend is wired, so the UI is testable pre-activation. */
export const authReady = hasBackend;
