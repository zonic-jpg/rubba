import { useStore } from "../lib/store";
import { formatPrice } from "../lib/payments";
import type { PaidTier, PaymentGateway } from "../types";

type Props = {
  compact?: boolean;
  onSelect?: (tier: PaidTier) => void;
  selectedId?: string;
};

export default function TierCards({ compact, onSelect, selectedId }: Props) {
  const { content, usage, usageInfo } = useStore();
  const { tiers, settings } = content;
  const current = selectedId ?? usage.tierId;

  return (
    <div className={`tier-grid ${compact ? "tier-grid-compact" : ""}`}>
      {tiers.map((tier) => {
        const active = tier.id === current;
        const isFree = tier.priceNgn === 0;
        return (
          <article
            key={tier.id}
            className={`tier-card ${tier.highlight ? "tier-highlight" : ""} ${active ? "tier-active" : ""}`}
            onClick={() => onSelect?.(tier)}
            role={onSelect ? "button" : undefined}
          >
            {tier.highlight && <span className="tier-badge">Popular</span>}
            <h3>{tier.name}</h3>
            <div className="tier-price">{formatPrice(tier, "NGN")}</div>
            <p>{tier.description}</p>
            <ul>
              <li>
                <strong>{tier.generationsPerMonth}</strong> roadmap generations / month
              </li>
              {!isFree && <li>Instant activation after payment</li>}
            </ul>
            {active && !compact && (
              <div className="tier-current">Your current plan · {usageInfo.remaining} left</div>
            )}
          </article>
        );
      })}
      {!compact && (
        <p className="tier-footnote">{settings.messaging.tierIntro}</p>
      )}
    </div>
  );
}

export function GatewayPicker({
  value,
  onChange,
  mockEnabled,
}: {
  value: PaymentGateway;
  onChange: (g: PaymentGateway) => void;
  mockEnabled: boolean;
}) {
  const options: PaymentGateway[] = mockEnabled
    ? ["mock", "paystack", "flutterwave", "stripe"]
    : ["paystack", "flutterwave", "stripe"];

  return (
    <div className="gateway-picker">
      {options.map((g) => (
        <button
          key={g}
          type="button"
          className={`gateway-btn ${value === g ? "on" : ""}`}
          onClick={() => onChange(g)}
        >
          {g === "mock" ? "Demo" : g.charAt(0).toUpperCase() + g.slice(1)}
        </button>
      ))}
    </div>
  );
}
