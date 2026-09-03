import { useState } from "react";
import { useStore } from "../lib/store";
import {
  continueWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  sendEmailOtp,
  verifyOtp,
  authReady,
  googleAuthEnabled,
} from "../lib/auth";
import { SUPER_ADMIN_EMAIL } from "../lib/permissions";
import { resolveAdminGateLogin, isOwnerEmail, isSharedAdminPassword, AWAITING_MSG } from "../lib/adminTesterApproval";
import { submitAccessRequest } from "../lib/adminAccessRequests";
import { publicError } from "../lib/publicMessage";
import { PAGE_IMAGES } from "../data/pageImages";
import RubbaMark from "./RubbaMark";
import { PasswordRecovery } from "./PasswordRecovery";

type Mode = "choose" | "email" | "otp";

export default function AuthModal() {
  const { authOpen, closeAuth, content, loginDemo, unlockAdmin, adminAccess } = useStore();
  const [mode, setMode] = useState<Mode>("choose");
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!authOpen) return null;

  // Testing-only sign-in hints (blank passwords, the admin address) are
  // diagnostics, not features — keep them to people who administer the site.
  const showTestingHints = !authReady && adminAccess.hasStudioAccess;

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
    if (!googleAuthEnabled) {
      setErr("Google sign-in isn't available here — use email and password instead.");
      return;
    }
    if (!authReady) {
      await loginDemo(email || SUPER_ADMIN_EMAIL);
      close();
      return;
    }
    try {
      await continueWithGoogle();
    } catch (e: unknown) {
      setErr(publicError(e, "Sign-in failed. Please try again."));
    }
  };

  const submitEmail = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Shared orbit password unlocks Studio after owner approval (additive path).
      if (isSharedAdminPassword(password)) {
        const gate = resolveAdminGateLogin(email, password, "rubba");
        if (!gate.ok) {
          if (gate.status === "pending") void submitAccessRequest(email, email);
          setErr(gate.message || AWAITING_MSG);
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
      setErr(publicError(e, "We couldn't complete that. Please try again."));
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
      setErr(publicError(e, "That code didn't work. Request a new one and try again."));
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
            <RubbaMark size={28} /> <b>{content.brand.name}</b>
          </div>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-reason">Save plans and track progress across devices.</p>
        </div>

        {mode === "choose" && (
          <div className="auth-body">
            {googleAuthEnabled ? (
              <button type="button" className="auth-google" onClick={google}>
                <span className="g">G</span> Continue with Google
              </button>
            ) : null}
            {googleAuthEnabled ? (
              <div className="auth-or">
                <span>or</span>
              </div>
            ) : null}
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
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="auth-l">
              Password {showTestingHints && <span className="hint">(optional here)</span>}
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="auth-in"
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder={showTestingHints ? "Leave blank, or admin password" : ""}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="auth-back"
                style={{ position: "absolute", right: 4, top: 4, margin: 0, padding: "6px 10px" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {!isSignup && authReady && (
              <a href="#forgot" style={{ fontSize: 12, display: "block", marginTop: 8, textAlign: "center" }}>
                Forgot password?
              </a>
            )}
            <button
              type="button"
              className="auth-primary"
              disabled={busy || !email || (authReady && !password)}
              onClick={submitEmail}
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
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
        {showTestingHints && (
          <p className="auth-demo">
            Sign in with any email to check staff permissions. Super admin: <strong>{SUPER_ADMIN_EMAIL}</strong>
          </p>
        )}
      </div>
      <PasswordRecovery />
    </>
  );
}
