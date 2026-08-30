// Shared server-side security helpers for the payment functions.
// NOTE: these run only in Supabase Edge Functions (Deno) with server secrets.

import { createClient } from "jsr:@supabase/supabase-js@2";

export const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Lock CORS to configured origins; falls back to same-origin-deny if unset. */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))
      ? origin
      : ALLOWED_ORIGINS[0] ?? "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/** Service-role client — bypasses RLS. Use only after all checks pass. */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Require and verify the caller's Supabase auth JWT. Returns the user or null. */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Constant-time hex compare. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(algo: "SHA-256" | "SHA-512", secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify a Paystack webhook: HMAC-SHA512 of the raw body with the secret key. */
export async function verifyPaystack(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret || !signature) return false;
  const expected = await hmacHex("SHA-512", secret, rawBody);
  return timingSafeEqualHex(expected, signature.toLowerCase());
}

/** Verify a Flutterwave webhook: the configured verif-hash must match the header. */
export function verifyFlutterwave(signature: string | null): boolean {
  const expected = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
  if (!expected || !signature) return false;
  return timingSafeEqualHex(expected, signature);
}

/** Verify a Stripe webhook signature (t + v1 scheme, HMAC-SHA256). */
export async function verifyStripe(rawBody: string, sigHeader: string | null): Promise<boolean> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  const expected = await hmacHex("SHA-256", secret, `${parts.t}.${rawBody}`);
  return timingSafeEqualHex(expected, parts.v1);
}

/** Look up the authoritative price + tier from the DB (never trust the client). */
export async function lookupTierPrice(tierId: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("paid_tiers")
    .select("id, price_ngn, price_usd")
    .eq("id", tierId)
    .maybeSingle();
  if (error || !data) return null;
  return { tierId: data.id as string, priceNgn: data.price_ngn as number, priceUsd: data.price_usd as number };
}
