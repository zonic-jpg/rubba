import { useCallback, useEffect, useState } from "react";
import {
  OWNER_EMAIL,
  OWNER_QUEUE_HINT,
  approveAdmin,
  listApprovedAdmins,
  listPendingQueue,
  mergeServerQueue,
  revokeAdmin,
} from "../lib/adminTesterApproval";
import {
  EMPTY_QUEUE,
  decideAccessRequest,
  fetchAccessQueue,
  type AccessQueue,
} from "../lib/adminAccessRequests";
import { publicError } from "../lib/publicMessage";

const POLL_MS = 30_000;

type Source = "loading" | "server" | "local-only";

export default function AdminTesterQueuePanel() {
  const [tick, setTick] = useState(0);
  const actor = OWNER_EMAIL;
  const [queue, setQueue] = useState<AccessQueue>(EMPTY_QUEUE);
  const [source, setSource] = useState<Source>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async (opts: { spinner?: boolean } = {}) => {
    if (opts.spinner) setRefreshing(true);
    const result = await fetchAccessQueue();
    if (result.ok) {
      mergeServerQueue(result.queue);
      setQueue(result.queue);
      setSource("server");
    } else {
      setQueue({
        pending: listPendingQueue("rubba").map((p) => ({
          email: p.email,
          identity: p.identity,
          requested_at: p.requestedAt,
        })),
        approved: listApprovedAdmins().map((a) => ({ email: a.email, decided_at: a.approvedAt })),
        revoked: [],
      });
      setSource("local-only");
    }
    if (opts.spinner) setRefreshing(false);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, POLL_MS);
    const onStorage = () => { void load(); };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  const decide = async (email: string, decision: "approve" | "reject") => {
    setBusyEmail(email);
    setActionErr(null);
    const result = await decideAccessRequest(email, decision);
    if (decision === "approve") approveAdmin(actor, email);
    else revokeAdmin(actor, email);

    if (!result.serverApplied) {
      setActionErr(
        publicError(
          result.message,
          "Saved on this device but could not sync. Sign in with your Rubba account and try again.",
        ),
      );
    }
    await load();
    setBusyEmail(null);
  };

  return (
    <div
      id="admintester-queue"
      className="admin-block scroll-mt-24 admin-queue"
      style={{ marginBottom: 16, padding: 12, border: "1px solid #e8c872", borderRadius: 8 }}
      key={tick}
    >
      <h3 style={{ marginTop: 0 }}>Pending approval requests</h3>
      <p className="hint">{OWNER_QUEUE_HINT}</p>

      {source === "local-only" && (
        <p className="hint" role="status" style={{ color: "#92400e" }}>
          Showing requests saved on this device only. Sign in with your Rubba account to see requests from every device.
        </p>
      )}

      {source === "loading" ? (
        <p className="hint">Loading queue…</p>
      ) : queue.pending.length === 0 ? (
        <p className="admin-queue-empty" role="status">
          No pending approval requests
        </p>
      ) : (
        queue.pending.map((p) => (
          <div key={`${p.email}-${p.requested_at}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span>
              <b>{p.identity || p.email}</b>
              <span className="hint" style={{ display: "block" }}>
                {p.requested_at ? new Date(p.requested_at).toLocaleString() : ""}
              </span>
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" disabled={busyEmail === p.email} onClick={() => void decide(p.email, "approve")}>
                Approve
              </button>
              <button type="button" className="danger" disabled={busyEmail === p.email} onClick={() => void decide(p.email, "reject")}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {queue.approved.length > 0 && (
        <>
          <h4>Already approved</h4>
          {queue.approved.map((a) => (
            <div key={a.email} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span>{a.email}</span>
              <button type="button" className="danger" disabled={busyEmail === a.email} onClick={() => void decide(a.email, "reject")}>
                Remove access
              </button>
            </div>
          ))}
        </>
      )}

      {actionErr && <p className="admin-msg err">{actionErr}</p>}

      <button type="button" className="mini" disabled={refreshing} onClick={() => void load({ spinner: true })} style={{ marginTop: 8 }}>
        {refreshing ? "Refreshing…" : "Refresh queue"}
      </button>
    </div>
  );
}
