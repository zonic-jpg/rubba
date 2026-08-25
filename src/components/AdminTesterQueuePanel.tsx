import { useState } from "react";
import {
  AWAITING_MSG,
  OWNER_EMAIL,
  approveAdmin,
  listApprovedAdmins,
  listPendingQueue,
  revokeAdmin,
} from "../lib/adminTesterApproval";

export default function AdminTesterQueuePanel() {
  const [tick, setTick] = useState(0);
  const actor = OWNER_EMAIL;
  const pending = listPendingQueue("rubba");
  const approved = listApprovedAdmins();
  const bump = () => setTick((n) => n + 1);

  return (
    <div className="admin-block" style={{ marginBottom: 16, padding: 12, border: "1px solid #e8c872", borderRadius: 8 }} key={tick}>
      <h3 style={{ marginTop: 0 }}>ADMINTESTER approvals</h3>
      <p className="hint">{AWAITING_MSG}</p>
      {pending.length === 0 ? (
        <p className="hint">No pending requests.</p>
      ) : (
        pending.map((p) => (
          <div key={`${p.email}-${p.requestedAt}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span>
              <b>{p.identity || p.email}</b>
              <span className="hint" style={{ display: "block" }}>{new Date(p.requestedAt).toLocaleString()}</span>
            </span>
            <button type="button" disabled={false} onClick={() => { approveAdmin(actor, p.email); bump(); }}>
              Approve
            </button>
          </div>
        ))
      )}
      {approved.length > 0 && (
        <>
          <h4>Approved</h4>
          {approved.map((a) => (
            <div key={a.email} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span>{a.email}</span>
              <button type="button" className="danger" onClick={() => { revokeAdmin(actor, a.email); bump(); }}>
                Revoke
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
