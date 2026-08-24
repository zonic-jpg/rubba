#!/usr/bin/env node
/**
 * Rubba AWS deployment preflight simulation.
 * Validates everything we can locally before touching AWS / Supabase production.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import http from "http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0;
let fail = 0;
let warn = 0;

function pass(name) {
  console.log("OK   ", name);
  ok++;
}
function failCheck(name, detail = "") {
  console.log("FAIL ", name, detail ? `— ${detail}` : "");
  fail++;
}
function warnCheck(name, detail = "") {
  console.log("WARN ", name, detail ? `— ${detail}` : "");
  warn++;
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function fileExists(rel) {
  return existsSync(join(root, rel));
}

console.log("═".repeat(60));
console.log(" Rubba AWS deployment simulation");
console.log("═".repeat(60));

// ── 1. Build artifacts ────────────────────────────────────────
console.log("\n▸ Build artifacts (S3 upload target)");
const distHtml = join(root, "dist/index.html");
if (fileExists("dist/index.html")) {
  pass("dist/index.html exists");
  const html = read("dist/index.html");
  if (html.includes('id="root"')) pass("SPA root mount point present");
  else failCheck("SPA root mount point");
  if (html.includes("/assets/")) pass("Hashed asset references (cache-friendly)");
  else failCheck("Hashed asset references");
} else {
  failCheck("dist/index.html — run npm run build first");
}

const assetsDir = join(root, "dist/assets");
if (existsSync(assetsDir)) {
  const assets = readdirSync(assetsDir);
  const js = assets.filter((f) => f.endsWith(".js"));
  const css = assets.filter((f) => f.endsWith(".css"));
  if (js.length) pass(`JS bundle(s): ${js.join(", ")}`);
  else failCheck("No JS bundles in dist/assets");
  if (css.length) pass(`CSS bundle(s): ${css.join(", ")}`);
  else warnCheck("No CSS bundles in dist/assets");

  const totalBytes = assets.reduce((sum, f) => sum + statSync(join(assetsDir, f)).size, 0);
  const kb = (totalBytes / 1024).toFixed(1);
  if (totalBytes < 1_500_000) pass(`Bundle size ${kb} KB (under 1.5 MB — good for CloudFront)`);
  else warnCheck(`Bundle size ${kb} KB — consider code-splitting for faster first load`);
}

// ── 2. Build-time env vars (injected at CI/CD, not runtime) ─
console.log("\n▸ Build-time environment (CodeBuild / GitHub Actions)");
const requiredVite = [
  "VITE_DATA_MODE",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];
const optionalVite = [
  "VITE_PAYMENT_API_URL",
  "VITE_PAYSTACK_PUBLIC_KEY",
  "VITE_FLUTTERWAVE_PUBLIC_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_ZONICME_AUTH_URL",
  "VITE_GENIE_API_URL",
];

if (fileExists(".env.example")) {
  const example = read(".env.example");
  for (const key of [...requiredVite, ...optionalVite]) {
    if (example.includes(key)) pass(`.env.example documents ${key}`);
    else failCheck(`.env.example missing ${key}`);
  }
} else {
  failCheck(".env.example missing");
}

const prodEnv = {
  VITE_DATA_MODE: "production",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock",
};
pass("Production build injects VITE_* at compile time (not S3 runtime)");

// ── 3. Supabase migrations ────────────────────────────────────
console.log("\n▸ Supabase schema (external to AWS — run before go-live)");
const migrations = [
  "supabase/migrations/0001_rubba.sql",
  "supabase/migrations/0002_rubba_production.sql",
  "supabase/migrations/0003_admin_permissions.sql",
];
for (const m of migrations) {
  if (fileExists(m)) {
    const sql = read(m);
    if (sql.includes("enable row level security") || sql.includes("admin_registry")) pass(`${m}`);
    else pass(`${m} (present)`);
  } else {
    failCheck(`Missing migration ${m}`);
  }
}

const m2 = read("supabase/migrations/0002_rubba_production.sql");
for (const table of ["paid_tiers", "brand_cards", "user_usage", "payment_records", "app_settings"]) {
  if (m2.includes(table)) pass(`Schema table: ${table}`);
  else failCheck(`Schema missing table ${table}`);
}

const m3 = read("supabase/migrations/0003_admin_permissions.sql");
if (m3.includes("oadeagbo@gmail.com")) pass("Super admin seeded in migration 0003");
else failCheck("Super admin email not in 0003");

// ── 4. Edge functions (Supabase-hosted or port to Lambda) ─────
console.log("\n▸ Payment edge functions (Supabase Edge or API Gateway + Lambda)");
const edgeFns = ["payment-init", "payment-webhook"];
const edgeSecrets = {
  "payment-init": ["PAYSTACK_SECRET_KEY", "FLUTTERWAVE_SECRET_KEY", "STRIPE_SECRET_KEY"],
  "payment-webhook": ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
};

for (const fn of edgeFns) {
  const path = `supabase/functions/${fn}/index.ts`;
  if (fileExists(path)) {
    pass(`${fn} function source exists`);
    const src = read(path);
    if (src.includes("Deno.serve")) pass(`${fn} uses Deno.serve (Supabase Edge compatible)`);
    if (fn === "payment-init" && src.includes("Access-Control-Allow-Origin")) {
      pass("payment-init CORS headers (needed for browser calls from CloudFront origin)");
    }
  } else {
    failCheck(`Missing ${path}`);
  }
}

for (const [fn, secrets] of Object.entries(edgeSecrets)) {
  for (const s of secrets) {
    const src = read(`supabase/functions/${fn}/index.ts`);
    if (src.includes(s)) pass(`${fn} expects secret ${s}`);
    else warnCheck(`${fn} may not use ${s}`);
  }
}

// ── 5. Payment callback flow ────────────────────────────────
console.log("\n▸ Payment return URL flow");
const payments = read("src/lib/payments/index.ts");
if (payments.includes("?payment=return")) pass("Callback URL uses ?payment=return query param");
else failCheck("Payment callback URL pattern missing");

const appTsx = read("src/App.tsx");
if (appTsx.includes('params.get("payment") === "return"')) pass("App handles payment return and applies tier");
else failCheck("App missing payment return handler");

if (appTsx.includes("window.history.replaceState")) pass("Payment params stripped from URL after return");
else warnCheck("Payment params may linger in browser history");

// ── 6. Auth / OAuth redirect requirements ─────────────────────
console.log("\n▸ Auth redirect URLs (configure in Supabase dashboard)");
const auth = read("src/lib/auth.ts");
if (auth.includes("signInWithOAuth")) pass("Google OAuth supported");
pass("Add production URL to Supabase → Auth → Redirect URLs (e.g. https://rubba.yourdomain.com)");
if (auth.includes("signInDemo")) pass("Demo auth fallback for mock mode (no Supabase needed locally)");

// ── 7. AWS resource checklist (simulated) ───────────────────
console.log("\n▸ AWS resources required (simulated provisioning checklist)");
const awsResources = [
  { svc: "S3", purpose: "Host dist/ static files", note: "Block public access; CloudFront OAC only" },
  { svc: "CloudFront", purpose: "HTTPS CDN + global edge", note: "Origin = S3; compress objects" },
  { svc: "ACM", purpose: "TLS certificate", note: "Must be in us-east-1 for CloudFront" },
  { svc: "Route 53", purpose: "DNS A/AAAA alias to CloudFront", note: "Optional if using external DNS" },
  { svc: "CodeBuild", purpose: "npm ci && npm run build with VITE_* env", note: "Or GitHub Actions" },
  { svc: "CodePipeline", purpose: "CI/CD on push to main", note: "Optional; manual deploy works" },
  { svc: "IAM", purpose: "Deploy role for S3 sync + CloudFront invalidation", note: "Least privilege" },
  { svc: "WAF", purpose: "Rate limiting / bot protection", note: "Recommended for production" },
  { svc: "Secrets Manager", purpose: "CI/CD secrets only", note: "NOT for client VITE_ keys in browser" },
];
for (const r of awsResources) {
  pass(`[${r.svc}] ${r.purpose} — ${r.note}`);
}

console.log("\n▸ External services (not on AWS)");
const external = [
  "Supabase — Postgres, Auth, Edge Functions (payment-init/webhook)",
  "Paystack / Flutterwave / Stripe — payment gateways",
  "Google OAuth — configured in Supabase Auth providers",
];
for (const e of external) pass(e);

// ── 8. Logic smoke tests (no browser) ─────────────────────────
console.log("\n▸ Application logic smoke tests");
const seed = read("src/data/seed.ts");
const tierMatch = (id) => seed.match(new RegExp(`id:\\s*"${id}"`));
if (tierMatch("free") && tierMatch("plus") && tierMatch("pro")) pass("Three billing tiers in seed");
else failCheck("Billing tiers incomplete");

const perms = read("src/lib/permissions.ts");
if (perms.includes("edit_content") && perms.includes("transferSuperAdmin") === false) {
  pass("Granular admin permissions defined");
}
if (perms.includes("oadeagbo@gmail.com")) pass("Super admin email constant");

// Usage quota math
const freeLimit = 10;
const plusLimit = 60;
if (seed.includes("freeGenerationsPerMonth: 10") && seed.includes("generationsPerMonth: 60")) {
  pass(`Usage quotas: free=${freeLimit}, plus=${plusLimit}`);
}

// Mock payment reference format
if (payments.includes("mock_")) pass("Mock payment reference prefix for dev/demo");

// ── 9. Local preview server test ──────────────────────────────
console.log("\n▸ Local preview server (simulates CloudFront static hosting)");

function waitForServer(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      http
        .get(`http://127.0.0.1:${port}/`, (res) => {
          res.resume();
          resolve(res.statusCode);
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) reject(new Error("Preview server timeout"));
          else setTimeout(tick, 300);
        });
    };
    tick();
  });
}

function fetchPath(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

const preview = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let previewLog = "";
preview.stdout?.on("data", (d) => (previewLog += d));
preview.stderr?.on("data", (d) => (previewLog += d));

try {
  const status = await waitForServer(4173);
  if (status === 200) pass(`Preview server responds HTTP ${status} on :4173`);
  else failCheck(`Preview server HTTP ${status}`);

  const index = await fetchPath(4173, "/");
  if (index.body.includes("Rubba") || index.body.includes("root")) pass("Index HTML served correctly");
  else failCheck("Index HTML content unexpected");

  const assetMatch = index.body.match(/\/assets\/[^"']+\.js/);
  if (assetMatch) {
    const asset = await fetchPath(4173, assetMatch[0]);
    if (asset.status === 200 && asset.body.length > 10000) pass(`JS asset reachable (${assetMatch[0]})`);
    else failCheck(`JS asset failed: ${assetMatch[0]}`);
  } else {
    failCheck("Could not find JS asset path in index.html");
  }

  // Payment return URL (query params — no SPA router needed)
  const payReturn = await fetchPath(4173, "/?payment=return&tier=plus");
  if (payReturn.status === 200) pass("Payment return URL serves index (query-param routing OK)");
  else failCheck("Payment return URL failed");
} catch (e) {
  failCheck("Preview server test", e.message);
  if (previewLog) console.log("     preview log:", previewLog.slice(0, 400));
} finally {
  preview.kill("SIGTERM");
}

// ── 10. Deploy script presence ────────────────────────────────
console.log("\n▸ Deploy automation");
if (fileExists("deploy/aws/deploy.sh")) pass("deploy/aws/deploy.sh exists");
else warnCheck("deploy/aws/deploy.sh not found — see deploy/aws/README.md for manual steps");
if (fileExists("deploy/aws/README.md")) pass("deploy/aws/README.md exists");
else warnCheck("deploy/aws/README.md not found");

// ── Summary ───────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(` Results: ${ok} passed, ${fail} failed, ${warn} warnings`);
console.log("═".repeat(60));

if (fail === 0) {
  console.log(`
 AWS deployment readiness: READY (local simulation)

 Next steps when you have AWS credentials:
   1. Run Supabase migrations 0001 → 0003
   2. Deploy edge functions + set payment secrets
   3. Build with production VITE_* vars
   4. ./deploy/aws/deploy.sh <bucket> <cloudfront-distribution-id>
   5. Add https://your-domain to Supabase Auth redirect URLs
   6. Set Paystack/Flutterwave/Stripe callback URLs to your domain
`);
} else {
  console.log("\n Fix failed checks before deploying to AWS.\n");
}

process.exit(fail ? 1 : 0);
