/** Per-service Free | Freemium | Paid — draft + activate pattern (Rubba). */
export type ServicePricingMode = "free" | "freemium" | "paid";

export type ServicePricingRow = {
  id: string;
  label: string;
  mode: ServicePricingMode;
  priceNgn: number;
  guestAllowance: number;
  memberCap: number;
  active: boolean;
};

const ACTIVE_KEY = "rubba_service_pricing_v1";
const DRAFT_KEY = "rubba_service_pricing_draft_v1";

export const RUBBA_SERVICE_CATALOG: Omit<ServicePricingRow, "active">[] = [
  { id: "roadmaps", label: "Member roadmaps", mode: "free", priceNgn: 0, guestAllowance: 3, memberCap: 10 },
  { id: "brand_placements", label: "Brand placements", mode: "free", priceNgn: 50000, guestAllowance: 0, memberCap: 0 },
  { id: "ai_generations", label: "AI generations", mode: "free", priceNgn: 0, guestAllowance: 5, memberCap: 20 },
];

function read(key: string): Record<string, ServicePricingRow> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function write(key: string, all: Record<string, ServicePricingRow>) {
  localStorage.setItem(key, JSON.stringify(all));
}

function defaults(): Record<string, ServicePricingRow> {
  return Object.fromEntries(
    RUBBA_SERVICE_CATALOG.map((s) => [s.id, { ...s, active: true }]),
  );
}

export function listActiveServicePricing(): ServicePricingRow[] {
  const base = defaults();
  const active = { ...base, ...read(ACTIVE_KEY) };
  return RUBBA_SERVICE_CATALOG.map((s) => ({ ...base[s.id], ...active[s.id], active: active[s.id]?.active !== false }));
}

export function getServiceDraft(id: string): ServicePricingRow {
  const active = listActiveServicePricing().find((s) => s.id === id);
  const draft = read(DRAFT_KEY)[id];
  return { ...(active || defaults()[id]), ...draft, id };
}

export function saveServiceDraft(id: string, patch: Partial<ServicePricingRow>): ServicePricingRow {
  const draft = read(DRAFT_KEY);
  const prev = getServiceDraft(id);
  draft[id] = { ...prev, ...patch, id, active: false };
  write(DRAFT_KEY, draft);
  return draft[id];
}

export function activateServicePricing(id: string): ServicePricingRow {
  const draft = read(DRAFT_KEY);
  const row = { ...getServiceDraft(id), ...(draft[id] || {}), active: true };
  const active = { ...defaults(), ...read(ACTIVE_KEY), [id]: row };
  write(ACTIVE_KEY, active);
  delete draft[id];
  write(DRAFT_KEY, draft);
  return row;
}

export function isServicePricingVisible(row: Pick<ServicePricingRow, "mode">): boolean {
  return row.mode !== "free";
}

export function servicePricingBlocksCheckout(mode: ServicePricingMode): boolean {
  return mode === "paid" || mode === "freemium";
}
