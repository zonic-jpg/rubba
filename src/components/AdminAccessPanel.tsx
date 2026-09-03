import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  type AdminPermission,
  type StaffMember,
} from "../lib/permissions";
import {
  getAdminRegistry,
  grantStaffAccess,
  revokeStaffAccess,
  transferSuperAdmin,
} from "../lib/admin";
import AdminTesterQueuePanel from "./AdminTesterQueuePanel";
import { publicError } from "../lib/publicMessage";

export default function AdminAccessPanel() {
  const { adminAccess, refreshAdminAccess } = useStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [superEmail, setSuperEmail] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPerms, setGrantPerms] = useState<Set<AdminPermission>>(new Set());
  const [transferEmail, setTransferEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!adminAccess.isSuperAdmin) return;
    getAdminRegistry().then((r) => {
      setStaff(r.staff);
      setSuperEmail(r.superAdminEmail);
    });
  }, [adminAccess.isSuperAdmin]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("zonic_show_admin_queue") === "1") {
        sessionStorage.removeItem("zonic_show_admin_queue");
        setTimeout(() => document.getElementById("admintester-queue")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      }
    } catch {}
  }, []);

  if (!adminAccess.isSuperAdmin) return null;

  const togglePerm = (p: AdminPermission) => {
    setGrantPerms((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  };

  const grant = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await grantStaffAccess(adminAccess.email, grantEmail, [...grantPerms]);
    setBusy(false);
    if (!res.ok) {
      setErr(publicError(res.error, "Could not grant access. Try again."));
      return;
    }
    setMsg(`Access granted to ${grantEmail.trim().toLowerCase()}`);
    setGrantEmail("");
    setGrantPerms(new Set());
    const r = await getAdminRegistry();
    setStaff(r.staff);
    await refreshAdminAccess();
  };

  const revoke = async (email: string) => {
    setBusy(true);
    setErr(null);
    const res = await revokeStaffAccess(adminAccess.email, email);
    setBusy(false);
    if (!res.ok) {
      setErr(publicError(res.error, "Could not revoke access. Try again."));
      return;
    }
    setMsg(`Revoked access for ${email}`);
    const r = await getAdminRegistry();
    setStaff(r.staff);
  };

  const transfer = async () => {
    if (!window.confirm(`Transfer super admin to ${transferEmail}? You will lose super admin rights.`)) return;
    setBusy(true);
    setErr(null);
    const res = await transferSuperAdmin(adminAccess.email, transferEmail);
    setBusy(false);
    if (!res.ok) {
      setErr(publicError(res.error, "Could not transfer owner control. Try again."));
      return;
    }
    setMsg(`Super admin transferred to ${transferEmail.trim().toLowerCase()}. Reloading…`);
    setTransferEmail("");
    await refreshAdminAccess();
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="sgrp admin-access">
      <AdminTesterQueuePanel />
      <div className="sgrp-t">Owner controls · {superEmail}</div>
      <p className="studio-note">
        Give colleagues specific editing rights, or hand over full owner control to another email
        (they replace you — there is only one owner).
      </p>

      <div className="admin-block">
        <strong>Give a colleague access</strong>
        <label className="fl">Their email address</label>
        <input
          className="fld"
          type="email"
          placeholder="colleague@firm.com"
          value={grantEmail}
          onChange={(e) => setGrantEmail(e.target.value)}
        />
        <div className="perm-grid">
          {ALL_PERMISSIONS.map((p) => (
            <label key={p} className="perm-check">
              <input type="checkbox" checked={grantPerms.has(p)} onChange={() => togglePerm(p)} />
              {PERMISSION_LABELS[p]}
            </label>
          ))}
        </div>
        <button type="button" className="mini" disabled={busy} onClick={grant}>
          Give access
        </button>
      </div>

      {staff.length > 0 && (
        <div className="admin-block">
          <strong>People with access</strong>
          {staff.map((s) => (
            <div key={s.email} className="staff-row">
              <div>
                <div className="staff-email">{s.email}</div>
                <div className="staff-perms">{s.permissions.map((p) => PERMISSION_LABELS[p]).join(" · ")}</div>
              </div>
              <button type="button" className="mini danger" disabled={busy} onClick={() => revoke(s.email)}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="admin-block transfer-block">
        <strong>Hand over owner control</strong>
        <p className="transfer-warn">
          Enter the new owner&apos;s email and click <b>Transfer</b>. You will no longer be the owner.
        </p>
        <label className="fl">New owner email</label>
        <input
          className="fld"
          type="email"
          placeholder="new.admin@example.com"
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
        />
        <button type="button" className="transfer-btn" disabled={busy || !transferEmail} onClick={transfer}>
          Transfer owner control
        </button>
      </div>

      {msg && <p className="admin-msg ok">{msg}</p>}
      {err && <p className="admin-msg err">{err}</p>}
    </div>
  );
}
