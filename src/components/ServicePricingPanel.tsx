import { useState } from "react";
import {
  RUBBA_SERVICE_CATALOG,
  activateServicePricing,
  getServiceDraft,
  isServicePricingVisible,
  listActiveServicePricing,
  saveServiceDraft,
  type ServicePricingMode,
} from "../lib/servicePricing";

/** Per-service Free | Freemium | Paid — Save draft, Activate live. */
export default function ServicePricingPanel() {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const live = listActiveServicePricing();

  return (
    <div className="sgrp">
      <div className="sgrp-t">Service pricing (Free · Freemium · Paid)</div>
      <p className="studio-note" style={{ margin: "0 0 12px" }}>
        Default Free — pricing fields hide until Freemium or Paid. Save draft, then Activate.
      </p>
      {RUBBA_SERVICE_CATALOG.map((cat) => {
        const draft = getServiceDraft(cat.id);
        const activeRow = live.find((s) => s.id === cat.id);
        const showPricing = isServicePricingVisible(draft);
        return (
          <div key={cat.id} className="admin-block" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong>{cat.label}</strong>
              <span className="pill">{draft.active === false ? "DRAFT" : (activeRow?.mode || "free").toUpperCase()}</span>
            </div>
            <label className="fl">Mode</label>
            <select
              className="fld"
              value={draft.mode}
              onChange={(e) => {
                saveServiceDraft(cat.id, { mode: e.target.value as ServicePricingMode });
                refresh();
              }}
            >
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
            {draft.mode === "freemium" && (
              <>
                <label className="fl">Guest allowance</label>
                <input
                  className="fld"
                  type="number"
                  min={0}
                  value={draft.guestAllowance}
                  onChange={(e) => {
                    saveServiceDraft(cat.id, { guestAllowance: +e.target.value });
                    refresh();
                  }}
                />
                <label className="fl">Member cap / day (0 = unlimited)</label>
                <input
                  className="fld"
                  type="number"
                  min={0}
                  value={draft.memberCap}
                  onChange={(e) => {
                    saveServiceDraft(cat.id, { memberCap: +e.target.value });
                    refresh();
                  }}
                />
              </>
            )}
            {showPricing && draft.mode === "paid" && (
              <>
                <label className="fl">Price (₦)</label>
                <input
                  className="fld"
                  type="number"
                  min={0}
                  value={draft.priceNgn}
                  onChange={(e) => {
                    saveServiceDraft(cat.id, { priceNgn: +e.target.value });
                    refresh();
                  }}
                />
              </>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" className="mini" onClick={() => { saveServiceDraft(cat.id, draft); refresh(); }}>
                Save
              </button>
              <button type="button" className="mini gate-active" onClick={() => { activateServicePricing(cat.id); refresh(); }}>
                Activate
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
