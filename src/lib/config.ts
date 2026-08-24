/** mock = seed data + localStorage. production = Supabase when configured. */
export type DataMode = "mock" | "production";

export function getDataMode(): DataMode {
  const env = import.meta.env.VITE_DATA_MODE as string | undefined;
  if (env === "production") return "production";
  return "mock";
}

export function paymentApiBase(): string | null {
  const url = import.meta.env.VITE_PAYMENT_API_URL as string | undefined;
  if (url) return url.replace(/\/$/, "");
  const supa = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supa) return `${supa.replace(/\/$/, "")}/functions/v1`;
  return null;
}

export function isProductionData(): boolean {
  return getDataMode() === "production" && Boolean(import.meta.env.VITE_SUPABASE_URL);
}
