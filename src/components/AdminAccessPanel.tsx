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
      setErr(res.error ?? "Failed");
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
      setErr(res.error ?? "Failed");
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
      setErr(res.error ?? "Failed");
      return;
    }
    setMsg(`Super admin transferred to ${transferEmail.trim().toLowerCase()}. Reloading…`);
    setTransferEmail("");
    await refreshAdminAccess();
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="sgrp admin-access">
      <div className="sgrp-t">Super admin · {superEmail}</div>
      <p className="studio-note">
        Grant tick-box rights to colleagues, or transfer super admin to another email (they replace you — no co-admin join).
      </p>

      <div className="admin-block">
        <strong>Grant staff access</strong>
        <label className="fl">Email address</label>
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
          Grant access
        </button>
      </div>

      {staff.length > 0 && (
        <div className="admin-block">
          <strong>Staff with access</strong>
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
        <strong>Transfer super admin</strong>
        <p className="transfer-warn">
          Enter the new super admin&apos;s email and click <b>Transfer</b>. You will no longer be super admin.
        </p>
        <label className="fl">New super admin email</label>
        <input
          className="fld"
          type="email"
          placeholder="new.admin@example.com"
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
        />
        <button type="button" className="transfer-btn" disabled={busy || !transferEmail} onClick={transfer}>
          Transfer super admin
        </button>
      </div>

      {msg && <p className="admin-msg ok">{msg}</p>}
      {err && <p className="admin-msg err">{err}</p>}
    </div>
  );
}
