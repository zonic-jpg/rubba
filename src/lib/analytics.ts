// Soft, privacy-minded analytics. Everything here is best-effort and fail-open:
// a tracking failure must NEVER break a user flow. We anonymize before anything
// leaves the device (age → coarse band, no exact DOB, no PII by default).
//
// Wiring: if VITE_ZONICME_TRACK_URL is set we POST to the ZonicMe ingest via
// sendBeacon (falls back to fetch keepalive). Otherwise we no-op to console.debug.

const INGEST = (import.meta as any).env?.VITE_ZONICME_TRACK_URL as string | undefined;
const APP = "rubba";

export type AnalyticsEvent =
  | "page_view"
  | "value_zone_view"
  | "value_zone_search"
  | "offer_view"
  | "offer_expand"
  | "offer_cta_click"
  | "blog_view"
  | "blog_open"
  | "profile_completion"
  | "roadmap_generated";

/** Bucket an exact age into a coarse band so raw age never leaves the device. */
export function ageBand(age: number): string {
  if (!Number.isFinite(age)) return "unknown";
  if (age < 18) return "under-18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}

/** Strip anything that looks identifying; keep only coarse, aggregate-safe values. */
function sanitize(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) continue;
    // Never forward exact age / email / freeform text that could identify a user.
    if (k === "age" || k === "email" || k === "name" || k === "dob") continue;
    if (typeof v === "string" && v.length > 120) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: AnalyticsEvent, payload: Record<string, unknown> = {}): void {
  try {
    const body = {
      app: APP,
      event,
      ts: Date.now(),
      props: sanitize(payload),
    };

    if (!INGEST) {
      if ((import.meta as any).env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[zonic-track]", event, body.props);
      }
      return;
    }

    const json = JSON.stringify(body);
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(INGEST, new Blob([json], { type: "application/json" }));
      return;
    }
    void fetch(INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* fail-open: analytics must never break the app */
  }
}

/** How complete is a profile? Drives the incentive progress UI (0–100). */
export function profileCompletion(p: {
  age?: number;
  income?: number;
  savings?: number;
  city?: string;
  target?: number;
  occupation?: string;
  interests?: string[];
  employmentStatus?: string;
}): { pct: number; filled: number; total: number } {
  const checks = [
    Boolean(p.age && p.age > 0),
    Boolean(p.income && p.income > 0),
    Boolean(p.savings != null && p.savings >= 0 && p.income), // savings counts once income given
    Boolean(p.city),
    Boolean(p.target && p.target > (p.age ?? 0)),
    Boolean(p.occupation),
    Boolean(p.employmentStatus),
    Boolean(p.interests && p.interests.length > 0),
  ];
  const total = checks.length;
  const filled = checks.filter(Boolean).length;
  return { pct: Math.round((filled / total) * 100), filled, total };
}
