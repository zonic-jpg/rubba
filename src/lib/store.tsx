import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MOCK_CONTENT } from "../data/seed";
import { loadSiteContent, persistSiteContent, getEffectiveDataMode, setDataModeOverride } from "./content";
import { getCurrentUser, onAuthChange, signOut as authSignOut, signInDemo, type ZUser } from "./auth";
import { supabase, hasBackend } from "./supabase";
import { adoptSessionFromUrl, loginViaCentral } from "./zonicme-sso";
import { resolveAdminAccess, unlockStudioAccess, clearStudioUnlock } from "./admin";
import type { AdminAccess } from "./permissions";
import { can, SUPER_ADMIN_EMAIL } from "./permissions";
import {
  loadUsage,
  saveUsage,
  consumeGeneration,
  applyPaidTier,
  usageSummary,
  canGenerate,
} from "./usage";
import { completeMockPayment, startPayment, type PaymentRequest } from "./payments";
import { setDiagnosticsAudience } from "./publicMessage";
import type {
  SiteContent,
  Profile,
  Roadmap,
  UserUsage,
  PaymentGateway,
  PaidTier,
} from "../types";

const USE_CENTRAL = Boolean(import.meta.env.VITE_ZONICME_AUTH_URL);

type Store = {
  loading: boolean;
  content: SiteContent;
  dataMode: "mock" | "production";
  setDataMode: (m: "mock" | "production") => void;
  reloadContent: () => Promise<void>;
  saveContent: () => Promise<boolean>;

  profile: Profile;
  setProfile: (p: Profile) => void;
  goals: Set<string>;
  toggleGoal: (id: string) => void;
  inspiration: string | null;
  setInspiration: (id: string | null) => void;
  dreams: Set<string>;
  toggleDream: (d: string) => void;
  customText: string;
  setCustomText: (t: string) => void;
  roadmap: Roadmap | null;
  setRoadmap: (r: Roadmap | null) => void;
  toggleStepDone: (stepId: string) => void;

  user: ZUser | null;
  adminAccess: AdminAccess;
  can: (perm: import("./permissions").AdminPermission) => boolean;
  refreshAdminAccess: () => Promise<void>;
  /** @deprecated use adminAccess.hasStudioAccess */
  isAdmin: boolean;
  usage: UserUsage;
  usageInfo: ReturnType<typeof usageSummary>;
  canGenerate: boolean;
  consumeGen: () => boolean;
  applyTier: (tierId: string) => void;
  confirmPaymentReturn: (reference: string | null) => Promise<void>;

  billingOpen: boolean;
  openBilling: () => void;
  closeBilling: () => void;
  payForTier: (tier: PaidTier, gateway: PaymentGateway) => Promise<{ ok: boolean; url?: string; ref?: string; error?: string }>;

  openAuth: () => void;
  signOut: () => void;
  authOpen: boolean;
  closeAuth: () => void;

  patchContent: (fn: (c: SiteContent) => SiteContent) => void;
  loginDemo: (email: string) => Promise<void>;
  unlockAdmin: (email: string) => Promise<void>;
};

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

const defaultProfile: Profile = {
  age: 22,
  income: 180_000,
  savings: 120_000,
  dependants: 0,
  city: "Lagos",
  target: 40,
  occupation: "",
  interests: [],
  employmentStatus: "",
};

function uid(user: ZUser | null): string {
  return user?.id ?? "guest";
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<SiteContent>(structuredClone(MOCK_CONTENT));
  const [dataMode, setDataModeState] = useState<"mock" | "production">(getEffectiveDataMode());

  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [goals, setGoals] = useState<Set<string>>(new Set(["security"]));
  const [inspiration, setInspiration] = useState<string | null>(null);
  const [dreams, setDreams] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  const [user, setUser] = useState<ZUser | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>({
    email: "",
    isSuperAdmin: false,
    permissions: [],
    hasStudioAccess: false,
  });
  const [usage, setUsage] = useState<UserUsage>(() => loadUsage("guest"));
  const [billingOpen, setBillingOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const reloadContent = useCallback(async () => {
    const c = await loadSiteContent();
    setContent(c);
  }, []);

  const refreshAdminAccess = useCallback(async () => {
    const access = await resolveAdminAccess(user?.id ?? null, user?.email ?? null);
    setAdminAccess(access);
  }, [user]);

  useEffect(() => {
    (async () => {
      if (supabase) await adoptSessionFromUrl(supabase);
      const u = await getCurrentUser();
      if (u) {
        setUser(u);
        setAdminAccess(await resolveAdminAccess(u.id, u.email));
      } else if (!hasBackend) {
        setAdminAccess(await resolveAdminAccess("demo", SUPER_ADMIN_EMAIL));
      } else {
        // No signed-in user, but a studio password unlock may still apply.
        setAdminAccess(await resolveAdminAccess(null, null));
      }
      await reloadContent();
      setLoading(false);
    })();
    return onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setAuthOpen(false);
        setAdminAccess(await resolveAdminAccess(u.id, u.email));
        setUsage(loadUsage(u.id));
      } else {
        if (!hasBackend) {
          const du = await getCurrentUser();
          setAdminAccess(await resolveAdminAccess(du?.id ?? "demo", du?.email ?? SUPER_ADMIN_EMAIL));
        } else {
          setAdminAccess({
            email: "",
            isSuperAdmin: false,
            permissions: [],
            hasStudioAccess: false,
          });
        }
        setUsage(loadUsage("guest"));
      }
    });
  }, [reloadContent]);

  useEffect(() => {
    setUsage(loadUsage(uid(user)));
  }, [user]);

  // Only admins may read build/infrastructure detail in errors and banners.
  useEffect(() => {
    setDiagnosticsAudience(adminAccess.hasStudioAccess);
  }, [adminAccess.hasStudioAccess]);

  const usageInfo = useMemo(
    () => usageSummary(usage, content.tiers, content.settings, content.monetization),
    [usage, content.tiers, content.settings, content.monetization],
  );

  const setDataMode = (m: "mock" | "production") => {
    setDataModeOverride(m);
    setDataModeState(m);
    reloadContent();
  };

  const patchContent = (fn: (c: SiteContent) => SiteContent) => {
    setContent((c) => fn(structuredClone(c)));
  };

  const saveContent = async () => {
    const mayPublish = can(adminAccess, "publish_site");
    if (!mayPublish) return false;
    const ok = await persistSiteContent(content, adminAccess.hasStudioAccess);
    if (ok && dataMode === "mock") await reloadContent();
    return ok;
  };

  const consumeGen = (): boolean => {
    if (!canGenerate(usage, content.tiers, content.settings, content.monetization)) return false;
    if (content.monetization?.userGate.active) {
      const next = consumeGeneration(usage);
      setUsage(next);
    }
    return true;
  };

  const applyTier = (tierId: string) => {
    const next = applyPaidTier(usage, tierId);
    setUsage(next);
  };

  /**
   * C2 (audit): called when the browser returns from a payment gateway. It does
   * NOT read the tier from the URL. It asks the server to confirm the payment by
   * its reference; only the server (payment-webhook) may grant a tier. Afterwards
   * we re-read the authoritative usage row from the backend.
   */
  const confirmPaymentReturn = async (reference: string | null) => {
    if (!reference || !supabase) return;
    try {
      const { data: rec } = await supabase
        .from("payment_records")
        .select("tier_id,status,user_id")
        .eq("reference", reference)
        .maybeSingle();
      // Trust ONLY a record the backend already marked completed for this user.
      if (rec?.status === "completed" && rec.user_id === uid(user) && rec.tier_id) {
        setUsage((u) => ({ ...u, tierId: rec.tier_id as string }));
      }
      // else: not yet confirmed — the webhook may still be processing; the UI
      // simply shows the current (unchanged) tier rather than granting anything.
    } catch {
      /* leave tier unchanged on any error — never grant optimistically */
    }
  };

  const payForTier = async (tier: PaidTier, gateway: PaymentGateway) => {
    if (tier.priceNgn === 0) {
      applyTier(tier.id);
      return { ok: true };
    }
    const req: PaymentRequest = {
      gateway,
      tier,
      userId: uid(user),
      email: user?.email ?? "guest@rubba.app",
      currency: gateway === "stripe" ? "USD" : "NGN",
    };
    const res = await startPayment(req, content.settings.mockPaymentsEnabled);
    if (!res.ok) return { ok: false, error: res.message };

    if (gateway === "mock" && res.reference) {
      const pending = completeMockPayment(res.reference);
      if (pending) applyTier(pending.tierId);
      return { ok: true, ref: res.reference };
    }

    if (res.authorizationUrl) {
      return { ok: true, url: res.authorizationUrl, ref: res.reference };
    }
    return { ok: false, error: "No payment URL returned" };
  };

  const toggleStepDone = (stepId: string) => {
    setRoadmap((rm) => {
      if (!rm) return rm;
      return {
        ...rm,
        steps: rm.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
      };
    });
  };

  const loginDemo = async (email: string) => {
    const u = await signInDemo(email);
    setUser(u);
    setAdminAccess(await resolveAdminAccess(u.id, u.email));
    setAuthOpen(false);
  };

  const unlockAdmin = async (email: string) => {
    unlockStudioAccess(email);
    const u = await signInDemo(email);
    setUser(u);
    setAdminAccess(await resolveAdminAccess(u.id, u.email));
    setAuthOpen(false);
  };

  const value = useMemo<Store>(
    () => ({
      loading,
      content,
      dataMode,
      setDataMode,
      reloadContent,
      saveContent,
      profile,
      setProfile,
      goals,
      toggleGoal: (id) =>
        setGoals((s) => {
          const n = new Set(s);
          n.has(id) ? n.delete(id) : n.add(id);
          return n;
        }),
      inspiration,
      setInspiration,
      dreams,
      toggleDream: (d) =>
        setDreams((s) => {
          const n = new Set(s);
          n.has(d) ? n.delete(d) : n.add(d);
          return n;
        }),
      customText,
      setCustomText,
      roadmap,
      setRoadmap,
      toggleStepDone,
      user,
      adminAccess,
      can: (perm) => can(adminAccess, perm),
      refreshAdminAccess,
      isAdmin: adminAccess.hasStudioAccess,
      usage,
      usageInfo,
      canGenerate: canGenerate(usage, content.tiers, content.settings, content.monetization),
      consumeGen,
      applyTier,
      confirmPaymentReturn,
      billingOpen,
      openBilling: () => setBillingOpen(true),
      closeBilling: () => setBillingOpen(false),
      payForTier,
      authOpen,
      closeAuth: () => setAuthOpen(false),
      openAuth: () => {
        if (USE_CENTRAL) loginViaCentral();
        else setAuthOpen(true);
      },
      signOut: () => {
        clearStudioUnlock();
        authSignOut();
        setUser(null);
        setAdminAccess({ email: "", isSuperAdmin: false, permissions: [], hasStudioAccess: false });
      },
      patchContent,
      loginDemo,
      unlockAdmin,
    }),
    [
      loading,
      content,
      dataMode,
      profile,
      goals,
      inspiration,
      dreams,
      customText,
      roadmap,
      user,
      adminAccess,
      usage,
      usageInfo,
      billingOpen,
      authOpen,
      reloadContent,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
