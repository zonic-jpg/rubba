import { useStore } from "../lib/store";

export default function UsageBar() {
  const { usageInfo, content, openBilling } = useStore();

  if (usageInfo.unlimited) {
    return (
      <div className="usage-bar">
        <div className="usage-text">
          <span><strong>Unlimited</strong> plans — free for all members</span>
        </div>
        <p className="usage-hint">{content.settings.messaging.antiHype}</p>
      </div>
    );
  }

  const pct = usageInfo.limit ? Math.round((usageInfo.used / usageInfo.limit) * 100) : 0;

  return (
    <div className="usage-bar">
      <div className="usage-text">
        <span>
          <strong>{usageInfo.remaining}</strong> of {usageInfo.limit} plans left this month
        </span>
        <span className="usage-reset">Resets in {usageInfo.resetInDays} days</span>
      </div>
      <div className="usage-track">
        <div className="usage-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {usageInfo.remaining <= 2 && (
        <button type="button" className="usage-upgrade" onClick={openBilling}>
          {usageInfo.remaining === 0 ? "Upgrade to keep planning" : "Get more plans →"}
        </button>
      )}
      <p className="usage-hint">{content.settings.messaging.antiHype}</p>
    </div>
  );
}
