import { useState } from "react";
import { useStore } from "../lib/store";
import {
  continueWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  sendEmailOtp,
  verifyOtp,
  authReady,
} from "../lib/auth";
import { SUPER_ADMIN_EMAIL, isStudioUnlockPassword } from "../lib/permissions";
import { resolveAdminGateLogin, isOwnerEmail } from "../lib/adminTesterApproval";
import { PAGE_IMAGES } from "../data/pageImages";

type Mode = "choose" | "email" | "otp";

export default function AuthModal() {
  const { authOpen, closeAuth, content, loginDemo, unlockAdmin } = useStore();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!authOpen) return null;

  const reset = () => {
    setMode("choose");
    setErr(null);
    setCode("");
  };
  const close = () => {
    reset();
    closeAuth();
  };

  const google = async () => {
    setErr(null);
    if (!authReady) {
      await loginDemo(email || SUPER_ADMIN_EMAIL);
      close();
      return;
    }
    try {
      await continueWithGoogle();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    }
  };

  const submitEmail = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Shared admin password unlocks Studio after owner approval (additive path).
      if (isStudioUnlockPassword(password)) {
        const gate = resolveAdminGateLogin(email || SUPER_ADMIN_EMAIL, password, "rubba");
        if (!gate.ok) {
          setErr(gate.message || "Awaiting approval");
          setBusy(false);
          return;
        }
        await unlockAdmin(email || SUPER_ADMIN_EMAIL);
        if (isOwnerEmail(email || SUPER_ADMIN_EMAIL)) {
          try {
            sessionStorage.setItem("zonic_show_admin_queue", "1");
          } catch {}
        }
        close();
        return;
      }
      if (!authReady) {
        await loginDemo(email || SUPER_ADMIN_EMAIL);
        close();
        return;
      }
      if (isSignup) {
        await signUpWithEmail(email, password);
        await sendEmailOtp(email);
        setMode("otp");
      } else {
        await signInWithEmail(email, password);
        close();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  };

  const confirm = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (!authReady) {
        await loginDemo(email || SUPER_ADMIN_EMAIL);
        close();
        return;
      }
      await verifyOtp({ email, token: code });
      close();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    }
    setBusy(false);
  };

  return (
    <>
      <div className="auth-scrim" onClick={close} />
      <div className="auth-modal">
        <figure className="auth-photo">
          <img src={PAGE_IMAGES.auth.src} alt={PAGE_IMAGES.auth.alt} loading="lazy" />
          <div className="auth-photo-overlay" />
        </figure>
        <button type="button" className="auth-x" onClick={close}>
          ×
        </button>
        <div className="auth-head">
          <div className="auth-logo">
            🪔 <b>{content.brand.name}</b>
          </div>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-reason">Save plans and track progress across devices.</p>
        </div>

        {mode === "choose" && (
          <div className="auth-body">
            <button type="button" className="auth-google" onClick={google}>
              <span className="g">G</span> Continue with Google
            </button>
            <div className="auth-or">
              <span>or</span>
            </div>
            <button type="button" className="auth-primary" onClick={() => setMode("email")}>
              Use email &amp; password
            </button>
            <p className="auth-switch">
              {isSignup ? "Already have an account?" : "New to Rubba?"}{" "}
              <a onClick={() => setIsSignup(!isSignup)}>{isSignup ? "Log in" : "Sign up"}</a>
            </p>
          </div>
        )}

        {mode === "email" && (
          <div className="auth-body">
            <label className="auth-l">Email</label>
            <input
              className="auth-in"
              type="email"
              value={email}
              placeholder={SUPER_ADMIN_EMAIL}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="auth-l">
              Password {!authReady && <span className="hint">(optional in demo)</span>}
            </label>
            <input
              className="auth-in"
              type="password"
              value={password}
              placeholder={authReady ? "" : "Leave blank, or admin password"}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-primary"
              disabled={busy || !email || (authReady && !password)}
              onClick={submitEmail}
            >
              {busy ? "Please wait…" : authReady ? (isSignup ? "Create account" : "Log in") : "Continue (demo)"}
            </button>
            <button type="button" className="auth-back" onClick={reset}>
              ‹ Back
            </button>
          </div>
        )}

        {mode === "otp" && (
          <div className="auth-body">
            <p className="auth-otp-note">Enter the code we sent to {email}.</p>
            <input
              className="auth-in auth-otp"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button type="button" className="auth-primary" disabled={busy || code.length < 4} onClick={confirm}>
              Verify
            </button>
            <button type="button" className="auth-back" onClick={() => setMode("email")}>
              ‹ Back
            </button>
          </div>
        )}

        {err && <p className="auth-err">{err}</p>}
        {!authReady && (
          <p className="auth-demo">
            Demo mode — sign in with any email to test staff permissions. Super admin: <strong>{SUPER_ADMIN_EMAIL}</strong>
          </p>
        )}
      </div>
    </>
  );
}
