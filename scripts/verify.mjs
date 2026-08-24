#!/usr/bin/env node
/** Quick sanity checks for Rubba build artifacts and seed data */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    console.log("OK  ", name);
    ok++;
  } else {
    console.log("FAIL", name);
    fail++;
  }
}

check("dist/index.html exists", existsSync(join(root, "dist/index.html")));
check("dist/assets has JS", existsSync(join(root, "dist/assets")));

const seed = readFileSync(join(root, "src/data/seed.ts"), "utf8");
check("seed has 3 tiers", (seed.match(/id: "free"/) && seed.match(/id: "plus"/) && seed.match(/id: "pro"/)) !== null);
check("seed has brand cards", seed.includes('category: "car"'));
check("seed free limit is 10", seed.includes("freeGenerationsPerMonth: 10"));
check("plus tier is 60", seed.includes("generationsPerMonth: 60"));
check("pro tier is 70", seed.includes("generationsPerMonth: 70"));

const brands = ["piggyvest.com", "toyota.com.ng", "innosonvehicles.com"];
for (const url of brands) {
  check(`brand URL ${url}`, seed.includes(url));
}

check("payment-init function", existsSync(join(root, "supabase/functions/payment-init/index.ts")));
check("migration 0003 admin permissions", existsSync(join(root, "supabase/migrations/0003_admin_permissions.sql")));
check("super admin email seeded", readFileSync(join(root, "src/lib/permissions.ts"), "utf8").includes("oadeagbo@gmail.com"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
