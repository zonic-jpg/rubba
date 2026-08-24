import type { PaymentGateway, PaymentInitResult, PaidTier } from "../../types";
import { paymentApiBase } from "../config";

export type PaymentRequest = {
  gateway: PaymentGateway;
  tier: PaidTier;
  userId: string;
  email: string;
  currency: "NGN" | "USD";
};

function mockReference(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Mock payment — instant success for dev/demo */
export async function initMockPayment(req: PaymentRequest): Promise<PaymentInitResult> {
  await new Promise((r) => setTimeout(r, 800));
  const ref = mockReference();
  sessionStorage.setItem(
    `rubba_pending_payment_${ref}`,
    JSON.stringify({ tierId: req.tier.id, userId: req.userId, gateway: "mock" }),
  );
  return { ok: true, gateway: "mock", reference: ref, authorizationUrl: `#mock-pay/${ref}` };
}

/** Production: call Supabase Edge Function (secrets stay server-side) */
export async function initGatewayPayment(req: PaymentRequest): Promise<PaymentInitResult> {
  const base = paymentApiBase();
  if (!base) {
    return {
      ok: false,
      gateway: req.gateway,
      message: "Payment API not configured. Set VITE_PAYMENT_API_URL or VITE_SUPABASE_URL.",
    };
  }

  const res = await fetch(`${base}/payment-init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gateway: req.gateway,
      tierId: req.tier.id,
      tierName: req.tier.name,
      amountNgn: req.tier.priceNgn,
      amountUsd: req.tier.priceUsd,
      userId: req.userId,
      email: req.email,
      currency: req.currency,
      callbackUrl: `${window.location.origin}${window.location.pathname}?payment=return`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, gateway: req.gateway, message: err || "Payment init failed" };
  }

  return (await res.json()) as PaymentInitResult;
}

export async function startPayment(
  req: PaymentRequest,
  mockEnabled: boolean,
): Promise<PaymentInitResult> {
  if (req.gateway === "mock" || (mockEnabled && req.gateway !== "stripe")) {
    return initMockPayment(req);
  }
  return initGatewayPayment(req);
}

export function completeMockPayment(reference: string): { tierId: string; userId: string } | null {
  const raw = sessionStorage.getItem(`rubba_pending_payment_${reference}`);
  if (!raw) return null;
  sessionStorage.removeItem(`rubba_pending_payment_${reference}`);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function gatewayLabel(g: PaymentGateway): string {
  const map: Record<PaymentGateway, string> = {
    mock: "Demo payment",
    paystack: "Paystack",
    flutterwave: "Flutterwave",
    stripe: "Stripe",
  };
  return map[g];
}

export function formatPrice(tier: PaidTier, currency: "NGN" | "USD"): string {
  if (tier.priceNgn === 0 && tier.priceUsd === 0) return "Free";
  if (currency === "USD") return `$${tier.priceUsd.toFixed(2)}/mo`;
  return `₦${tier.priceNgn.toLocaleString("en-NG")}/mo`;
}
