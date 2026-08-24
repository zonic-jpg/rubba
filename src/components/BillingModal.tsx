import { useState } from "react";
import { useStore } from "../lib/store";
import TierCards, { GatewayPicker } from "./TierCards";
import type { PaidTier, PaymentGateway } from "../types";
import { gatewayLabel } from "../lib/payments";
import { PAGE_IMAGES } from "../data/pageImages";

export default function BillingModal() {
  const { billingOpen, closeBilling, content, payForTier, usage, applyTier } = useStore();
  const [selected, setSelected] = useState<PaidTier | null>(null);
  const [gateway, setGateway] = useState<PaymentGateway>(content.settings.defaultGateway);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!billingOpen) return null;

  const tier = selected ?? content.tiers.find((t) => t.id === usage.tierId) ?? content.tiers[0];

  const pay = async () => {
    setBusy(true);
    setMsg(null);
    if (tier.priceNgn === 0) {
      applyTier(tier.id);
      setMsg("You're on the Free plan.");
      setBusy(false);
      return;
    }
    const res = await payForTier(tier, gateway);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error ?? "Payment failed");
      return;
    }
    if (res.url && !res.url.startsWith("#")) {
      window.location.href = res.url;
      return;
    }
    setMsg(`Payment complete — ${tier.name} activated (${gatewayLabel(gateway)}).`);
    setTimeout(closeBilling, 1500);
  };

  return (
    <>
      <div className="billing-scrim" onClick={closeBilling} />
      <div className="billing-modal">
        <figure className="billing-photo">
          <img src={PAGE_IMAGES.billing.src} alt={PAGE_IMAGES.billing.alt} loading="lazy" />
          <div className="billing-photo-overlay" />
        </figure>
        <button type="button" className="billing-x" onClick={closeBilling}>
          ×
        </button>
        <h2>Choose your plan</h2>
        <p className="billing-lead">{content.settings.messaging.limitReached}</p>

        <TierCards
          compact
          selectedId={tier.id}
          onSelect={(t) => {
            setSelected(t);
            setMsg(null);
          }}
        />

        {tier.priceNgn > 0 && (
          <>
            <p className="billing-label">Pay with</p>
            <GatewayPicker
              value={gateway}
              onChange={setGateway}
              mockEnabled={content.settings.mockPaymentsEnabled}
            />
          </>
        )}

        <button type="button" className="cta gold" disabled={busy} onClick={pay}>
          {busy
            ? "Processing…"
            : tier.priceNgn === 0
              ? "Stay on Free"
              : `Pay & activate ${tier.name}`}
        </button>
        {msg && <p className="billing-msg">{msg}</p>}
        <p className="billing-note">
          Paystack, Flutterwave & Stripe supported in production. Demo mode simulates payment instantly.
        </p>
      </div>
    </>
  );
}
