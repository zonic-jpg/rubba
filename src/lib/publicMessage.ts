/**
 * Public message guard — ported from MyYangaX (src/lib/publicMessage.js).
 *
 * House rule: the only messages a visitor may see are ones that explain a
 * feature, ask them to fix their own input, or describe an empty state.
 * Build/infrastructure detail must never reach a visitor.
 *
 * Diagnostics still matter for admins/owners via `setDiagnosticsAudience`.
 */

export const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Shown instead of raw 401/403/RLS text, which means nothing to a visitor. */
export const SIGN_IN_MESSAGE = "Please sign in to continue.";

const INTERNAL_TERMS = [
  "supabase",
  "netlify",
  "edge function",
  "edge functions",
  "anon key",
  "service role",
  "service_role",
  "api key",
  "apikey",
  "access token",
  "bearer token",
  "rls",
  "migration",
  "migrations",
  "deploy",
  "deployed",
  "redeploy",
  "localhost",
  "functions/v1",
  "not configured",
  "misconfigured",
  "not connected",
  "demo mode",
  "demo data",
  "demo build",
  "test mode",
  "testing mode",
  "mock",
  "mocks",
  "mocked",
  "stub",
  "stubbed",
  "seeded",
  "seed data",
  "placeholder",
  "todo",
  "fixme",
  "fallback",
  "stack trace",
  "unhandled",
  "console",
  "env var",
  "environment variable",
  "feature gate",
  "db",
  "database",
  "postgres",
  "sql",
  "schema",
  "relation",
  "constraint",
  "duplicate key",
  "null value",
  "does not exist",
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_RE = new RegExp(`\\b(?:${INTERNAL_TERMS.map(escapeRe).join("|")})\\b`, "i");

const INTERNAL_SHAPES = [
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /\b127\.0\.0\.1\b/,
  /\bat\s+\w+\s*\([^)]*:\d+:\d+\)/,
  /[{[]\s*"[\w-]+"\s*:/,
  /\b(?:error|status|code|http)\s*[:#]?\s*[45]\d{2}\b/i,
  /\b[45]\d{2}\s+(?:error|status|response)\b/i,
  /\b(?:select\s+\*|insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i,
  /\b(?:0|zero)\s+rows?\b/i,
];

const AUTH_TERMS = [
  "unauthorized",
  "unauthorised",
  "not authorized",
  "not authorised",
  "jwt",
  "permission denied",
  "row-level security",
  "row level security",
  "auth session missing",
  "invalid claim",
  "invalid api key",
  "invalid token",
  "access token",
  "refresh token",
  "admin required",
  "admin sign-in required",
  "sign in required",
  "super admin required",
];

const AUTH_RE = new RegExp(`\\b(?:${AUTH_TERMS.map(escapeRe).join("|")})\\b`, "i");

export function isAuthMessage(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  return !!text && AUTH_RE.test(text);
}

let diagnosticsAudience = false;

export function setDiagnosticsAudience(isAdmin: boolean) {
  diagnosticsAudience = !!isAdmin;
}

export function hasDiagnosticsAudience(): boolean {
  return diagnosticsAudience;
}

export function isInternalMessage(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return false;
  if (TERM_RE.test(text)) return true;
  return INTERNAL_SHAPES.some((re) => re.test(text));
}

type PublicMessageOptions = {
  fallback?: string;
  authFallback?: string;
  force?: boolean;
};

export function publicMessage(raw: unknown, opts: PublicMessageOptions = {}): string {
  const { fallback = GENERIC_ERROR, authFallback = SIGN_IN_MESSAGE, force = false } = opts;
  const text = String((raw as Error)?.message ?? raw ?? "").trim();
  if (!text) return "";
  if (diagnosticsAudience && !force) return text;
  if (isAuthMessage(text)) return authFallback;
  return isInternalMessage(text) ? fallback : text;
}

export function publicError(err: unknown, fallback: string = GENERIC_ERROR): string {
  return publicMessage(err, { fallback, authFallback: fallback }) || fallback;
}
