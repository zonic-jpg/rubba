import type { AppSettings, MonetizationGates, PaidTier, UserUsage } from "../types";

const LS_USAGE = "rubba_usage";

function cycleKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysUntilNextCycle(d = new Date()): number {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return Math.ceil((next.getTime() - d.getTime()) / 86400000);
}

export function getTierLimit(tierId: string, tiers: PaidTier[], settings: AppSettings): number {
  const tier = tiers.find((t) => t.id === tierId);
  if (tier) return tier.generationsPerMonth;
  return settings.freeGenerationsPerMonth;
}

export function loadUsage(userId: string): UserUsage {
  const key = cycleKey();
  try {
    const raw = localStorage.getItem(`${LS_USAGE}_${userId}`);
    if (raw) {
      const u = JSON.parse(raw) as UserUsage;
      if (u.cycleKey === key) return u;
    }
  } catch {
    /* fresh cycle */
  }
  return { userId, cycleKey: key, used: 0, tierId: "free", bonusGenerations: 0 };
}

export function saveUsage(usage: UserUsage) {
  localStorage.setItem(`${LS_USAGE}_${usage.userId}`, JSON.stringify(usage));
}

export function usageSummary(
  usage: UserUsage,
  tiers: PaidTier[],
  settings: AppSettings,
  gates?: MonetizationGates,
) {
  if (gates && !gates.userGate.active) {
    return { limit: Infinity, remaining: Infinity, resetInDays: daysUntilNextCycle(), used: usage.used, unlimited: true as const };
  }
  const limit = getTierLimit(usage.tierId, tiers, settings) + usage.bonusGenerations;
  const remaining = Math.max(0, limit - usage.used);
  const resetInDays = daysUntilNextCycle();
  return { limit, remaining, resetInDays, used: usage.used, unlimited: false as const };
}

export function canGenerate(
  usage: UserUsage,
  tiers: PaidTier[],
  settings: AppSettings,
  gates?: MonetizationGates,
): boolean {
  if (gates && !gates.userGate.active) return true;
  const { remaining } = usageSummary(usage, tiers, settings, gates);
  return remaining > 0;
}

export function consumeGeneration(usage: UserUsage): UserUsage {
  const next = { ...usage, used: usage.used + 1 };
  saveUsage(next);
  return next;
}

export function applyPaidTier(usage: UserUsage, tierId: string): UserUsage {
  const next = { ...usage, tierId };
  saveUsage(next);
  return next;
}

export { cycleKey, daysUntilNextCycle };
