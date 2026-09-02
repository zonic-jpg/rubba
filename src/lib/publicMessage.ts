/**
 * Public message guard.
 *
 * House rule: the only messages a visitor may see are ones that explain a
 * feature, ask them to fix their own input, or describe an empty state.
 * Build/infrastructure detail (env var names, Supabase/Netlify wiring, demo and
 * testing state, raw driver errors) must never reach a visitor, so toasts,
 * banners and inline errors are filtered through here.
 *
 * Diagnostics still matter for the people who can act on them, so signed-in
 * admins keep the original text via `setDiagnosticsAudience`.
 */

export const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Words that only mean something to whoever builds or deploys the app.
 * Matched on word boundaries — a bare substring test would flag ordinary
 * planning copy ("mortgage" contains "rtg", "database" would catch "base").
 */
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
  // Database/driver errors that surface verbatim from the client library
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

/** Structural giveaways: screaming-snake env vars, code paths, JSON/stack dumps. */
const INTERNAL_SHAPES = [
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/, // VITE_SUPABASE_URL, VITE_PAYMENT_API_URL
  /\b127\.0\.0\.1\b/,
  /\bat\s+\w+\s*\([^)]*:\d+:\d+\)/, // stack frames
  /[{[]\s*"[\w-]+"\s*:/, // JSON payload dumps
  /\b(?:error|status|code|http)\s*[:#]?\s*[45]\d{2}\b/i, // "status 402", "error 501"
  /\b[45]\d{2}\s+(?:error|status|response)\b/i,
  /\b(?:select\s+\*|insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i, // SQL fragments
  /\b(?:0|zero)\s+rows?\b/i,
];

let diagnosticsAudience = false;

/**
 * Allow original (unsanitised) text through for admins who can act on it.
 * Called from the store whenever admin access changes.
 */
export function setDiagnosticsAudience(isAdmin: boolean) {
  diagnosticsAudience = !!isAdmin;
}

export function hasDiagnosticsAudience(): boolean {
  return diagnosticsAudience;
}

/** True when `raw` exposes build or infrastructure detail. */
export function isInternalMessage(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return false;
  if (TERM_RE.test(text)) return true;
  return INTERNAL_SHAPES.some((re) => re.test(text));
}

type PublicMessageOptions = {
  /** Shown instead when `raw` exposes internal detail. */
  fallback?: string;
  /** Bypass the admin passthrough — for surfaces a visitor always shares. */
  force?: boolean;
};

/** Visitor-safe version of `raw`; "" when there is nothing worth showing. */
export function publicMessage(raw: unknown, opts: PublicMessageOptions = {}): string {
  const { fallback = GENERIC_ERROR, force = false } = opts;
  const text = String((raw as Error)?.message ?? raw ?? "").trim();
  if (!text) return "";
  if (diagnosticsAudience && !force) return text;
  return isInternalMessage(text) ? fallback : text;
}

/** Convenience for catch blocks that need a non-empty, visitor-safe error. */
export function publicError(err: unknown, fallback: string = GENERIC_ERROR): string {
  return publicMessage(err, { fallback }) || fallback;
}
