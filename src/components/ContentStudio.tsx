import { useState } from "react";
import { useStore } from "../lib/store";
import { prepImage } from "../lib/image";
import AdminAccessPanel from "./AdminAccessPanel";
import ServicePricingPanel from "./ServicePricingPanel";
import type {
  BrandCard, BrandCategory, BrandOffer, BlogPost, OfferCategory, PaidTier,
  PostAllowanceBehavior, BrandPlacementType, MonetizationGates,
} from "../types";
import { OFFER_CATEGORIES, BRAND_PLACEMENT_LABELS } from "../types";
import type { AdminPermission } from "../lib/permissions";
import { PAGE_IMAGES } from "../data/pageImages";

const BRAND_CATS: BrandCategory[] = [
  "savings",
  "home",
  "car",
  "education",
  "family",
  "business",
  "insurance",
  "travel",
  "retirement",
];

function Gate({
  perm,
  children,
}: {
  perm: AdminPermission;
  children: React.ReactNode;
}) {
  const { can } = useStore();
  if (!can(perm)) return null;
  return <>{children}</>;
}

const POST_ALLOWANCE_OPTIONS: { value: PostAllowanceBehavior; label: string }[] = [
  { value: "soft_prompt", label: "Soft prompt (suggest upgrade)" },
  { value: "hard_block", label: "Hard block (require upgrade)" },
  { value: "read_only", label: "Read-only (view roadmap, can't regenerate)" },
];

const ALL_PLACEMENT_TYPES: BrandPlacementType[] = [
  "offer_listing",
  "featured_journey",
  "sponsored_strip",
];

function MonetizationGateCards({
  gates,
  onPatch,
}: {
  gates: MonetizationGates;
  onPatch: (fn: (g: MonetizationGates) => MonetizationGates) => void;
}) {
  const { userGate, brandGate } = gates;

  const setUserField = <K extends keyof MonetizationGates["userGate"]>(
    k: K,
    v: MonetizationGates["userGate"][K],
  ) => onPatch((g) => ({ ...g, userGate: { ...g.userGate, [k]: v } }));

  const setBrandField = <K extends keyof MonetizationGates["brandGate"]>(
    k: K,
    v: MonetizationGates["brandGate"][K],
  ) => onPatch((g) => ({ ...g, brandGate: { ...g.brandGate, [k]: v } }));

  const togglePlacement = (pt: BrandPlacementType) => {
    onPatch((g) => {
      const cur = new Set(g.brandGate.placementTypes);
      cur.has(pt) ? cur.delete(pt) : cur.add(pt);
      return { ...g, brandGate: { ...g.brandGate, placementTypes: [...cur] } };
    });
  };

  return (
    <>
      <div className="sgrp">
        <div className="sgrp-t">User monetization gate</div>
        <p className="studio-note" style={{ margin: "0 0 8px" }}>
          {userGate.active
            ? "ACTIVE — free allowance is enforced, Plans/billing CTAs are visible."
            : "OFF — all members have unlimited free access. Plans/billing CTAs are hidden."}
        </p>
        <label className="fl">Plan name</label>
        <input
          className="fld"
          value={userGate.planName}
          onChange={(e) => setUserField("planName", e.target.value)}
        />
        <label className="fl">Price / label</label>
        <input
          className="fld"
          value={userGate.priceLabel}
          onChange={(e) => setUserField("priceLabel", e.target.value)}
        />
        <label className="fl">Free allowance (roadmaps / month)</label>
        <input
          className="fld"
          type="number"
          min={0}
          value={userGate.freeAllowance}
          onChange={(e) => setUserField("freeAllowance", +e.target.value)}
        />
        <label className="fl">After allowance used</label>
        <select
          className="fld"
          value={userGate.postAllowanceBehavior}
          onChange={(e) =>
            setUserField("postAllowanceBehavior", e.target.value as PostAllowanceBehavior)
          }
        >
          {POST_ALLOWANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`mini ${userGate.active ? "gate-active" : "gate-off"}`}
          onClick={() => setUserField("active", !userGate.active)}
        >
          {userGate.active ? "Deactivate (make free)" : "Activate (enforce limits)"}
        </button>
      </div>

      <div className="sgrp">
        <div className="sgrp-t">Brand monetization gate</div>
        <p className="studio-note" style={{ margin: "0 0 8px" }}>
          {brandGate.active
            ? "ACTIVE — brand placements are priced. Free trial slots apply."
            : "OFF — all brand placements are free for partners."}
        </p>
        <label className="fl">Placement types</label>
        <div className="chips" style={{ marginBottom: 8 }}>
          {ALL_PLACEMENT_TYPES.map((pt) => {
            const on = brandGate.placementTypes.includes(pt);
            return (
              <div
                key={pt}
                className={`chip ${on ? "on" : ""}`}
                style={on ? { background: "var(--teal)", borderColor: "transparent", color: "#fff" } : {}}
                onClick={() => togglePlacement(pt)}
              >
                {BRAND_PLACEMENT_LABELS[pt]}
              </div>
            );
          })}
        </div>
        <label className="fl">Price / package label</label>
        <input
          className="fld"
          value={brandGate.pricePackage}
          onChange={(e) => setBrandField("pricePackage", e.target.value)}
        />
        <label className="fl">Free trial slots for new brands</label>
        <input
          className="fld"
          type="number"
          min={0}
          value={brandGate.freeTrialSlots}
          onChange={(e) => setBrandField("freeTrialSlots", +e.target.value)}
        />
        <button
          type="button"
          className={`mini ${brandGate.active ? "gate-active" : "gate-off"}`}
          onClick={() => setBrandField("active", !brandGate.active)}
        >
          {brandGate.active ? "Deactivate (free placements)" : "Activate (charge brands)"}
        </button>
      </div>
    </>
  );
}

export default function ContentStudio() {
  const { adminAccess, can, content, patchContent, saveContent, dataMode, setDataMode, reloadContent } =
    useStore();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  if (!adminAccess.hasStudioAccess) return null;

  const { brand, settings, tiers, personas, brands, offers, blog, pages } = content;

  const publish = async () => {
    if (!can("publish_site")) return;
    const ok = await saveContent();
    setSaved(ok ? "Saved ✓" : "Could not publish");
    await reloadContent();
    setTimeout(() => setSaved(null), 2500);
  };

  const setBrandField = (k: keyof typeof brand, v: string | null) =>
    patchContent((c) => ({ ...c, brand: { ...c.brand, [k]: v } }));

  const setMsg = (k: keyof typeof settings.messaging, v: string) =>
    patchContent((c) => ({
      ...c,
      settings: { ...c.settings, messaging: { ...c.settings.messaging, [k]: v } },
    }));

  const setSetting = (k: keyof typeof settings, v: unknown) =>
    patchContent((c) => ({ ...c, settings: { ...c.settings, [k]: v } }));

  const updateTier = (i: number, k: keyof PaidTier, v: string | number | boolean) =>
    patchContent((c) => ({
      ...c,
      tiers: c.tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)),
    }));

  const updateBrand = (i: number, k: keyof BrandCard, v: string | boolean | number) =>
    patchContent((c) => ({
      ...c,
      brands: c.brands.map((b, j) => (j === i ? { ...b, [k]: v } : b)),
    }));

  const addBrand = () =>
    patchContent((c) => ({
      ...c,
      brands: [
        ...c.brands,
        {
          id: `b${Date.now()}`,
          category: "savings" as BrandCategory,
          title: "New brand",
          subtitle: "Description",
          logoEmoji: "✨",
          ctaLabel: "Learn more",
          ctaUrl: "https://example.com",
          sponsor: "Partner",
          sort: c.brands.length + 1,
          active: true,
        },
      ],
    }));

  const updateOffer = (i: number, k: keyof BrandOffer, v: string | boolean | number) =>
    patchContent((c) => ({
      ...c,
      offers: c.offers.map((o, j) => (j === i ? { ...o, [k]: v } : o)),
    }));

  const addOffer = () =>
    patchContent((c) => ({
      ...c,
      offers: [
        ...c.offers,
        {
          id: `of${Date.now()}`,
          category: "courses" as OfferCategory,
          title: "New offer",
          summary: "Short, punchy summary of the offer.",
          detail: "More detail shown when a member expands the card.",
          image: PAGE_IMAGES.roadmap.src,
          emoji: "✨",
          ctaLabel: "Learn more",
          ctaUrl: "https://example.com",
          sponsor: "Partner",
          sort: c.offers.length + 1,
          active: true,
          source: "mock",
        },
      ],
    }));

  const updateBlog = (i: number, k: keyof BlogPost, v: string | boolean | number) =>
    patchContent((c) => ({
      ...c,
      blog: c.blog.map((b, j) => (j === i ? { ...b, [k]: v } : b)),
    }));

  const addBlog = () =>
    patchContent((c) => {
      const stamp = Date.now();
      return {
        ...c,
        blog: [
          ...c.blog,
          {
            id: `bl${stamp}`,
            slug: `new-post-${stamp}`,
            title: "New community post",
            excerpt: "A short, aspirational teaser for the article.",
            body: "Write the article body here.\n\nSeparate paragraphs with a blank line.",
            author: "The Rubba Team",
            image: PAGE_IMAGES.billing.src,
            tags: ["aspiration"],
            readMinutes: 3,
            publishedAt: new Date().toISOString().slice(0, 10),
            sort: c.blog.length + 1,
            active: true,
            source: "mock",
          },
        ],
      };
    });

  return (
    <>
      <button type="button" className="studio-fab" onClick={() => setOpen(true)}>
        ✎ {adminAccess.isSuperAdmin ? "Admin Studio" : "Content Studio"}
      </button>
      <div className={`studio-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`studio studio-wide ${open ? "show" : ""}`}>
        <div className="studio-h">
          <div>{adminAccess.isSuperAdmin ? "Super Admin" : "Staff Studio"}</div>
          <span className="x" onClick={() => setOpen(false)}>
            ×
          </span>
        </div>
        <div className="studio-body">
          <div className="studio-note">
            Signed in as <strong>{adminAccess.email || "demo"}</strong>
            {adminAccess.isSuperAdmin ? " · Super admin" : ` · ${adminAccess.permissions.length} permission(s)`}
          </div>

          <AdminAccessPanel />

          <Gate perm="set_prices">
            <MonetizationGateCards
              gates={content.monetization}
              onPatch={(fn) =>
                patchContent((c) => ({ ...c, monetization: fn(c.monetization) }))
              }
            />
            <ServicePricingPanel />
          </Gate>

          <Gate perm="toggle_data_mode">
            <div className="sgrp">
              <div className="sgrp-t">Data mode</div>
              <div className="mode-toggle">
                <button type="button" className={dataMode === "mock" ? "on" : ""} onClick={() => setDataMode("mock")}>
                  Mock (local seed)
                </button>
                <button
                  type="button"
                  className={dataMode === "production" ? "on" : ""}
                  onClick={() => setDataMode("production")}
                >
                  Production (Supabase)
                </button>
              </div>
            </div>
          </Gate>

          <Gate perm="set_prices">
            <div className="sgrp">
              <div className="sgrp-t">Plan limits & payments</div>
              <label className="fl">Free generations / month</label>
              <input
                className="fld"
                type="number"
                value={settings.freeGenerationsPerMonth}
                onChange={(e) => setSetting("freeGenerationsPerMonth", +e.target.value)}
              />
              <label className="fl">Default gateway</label>
              <select
                className="fld"
                value={settings.defaultGateway}
                onChange={(e) => setSetting("defaultGateway", e.target.value)}
              >
                <option value="mock">mock</option>
                <option value="paystack">paystack</option>
                <option value="flutterwave">flutterwave</option>
                <option value="stripe">stripe</option>
              </select>
              <label className="fl">
                <input
                  type="checkbox"
                  checked={settings.mockPaymentsEnabled}
                  onChange={(e) => setSetting("mockPaymentsEnabled", e.target.checked)}
                />{" "}
                Enable demo payments
              </label>
              {tiers.map((t, i) => (
                <div key={t.id} className="admin-block">
                  <strong>{t.name}</strong>
                  <label className="fl">Generations/mo</label>
                  <input
                    className="fld"
                    type="number"
                    value={t.generationsPerMonth}
                    onChange={(e) => updateTier(i, "generationsPerMonth", +e.target.value)}
                  />
                  <label className="fl">Price ₦</label>
                  <input
                    className="fld"
                    type="number"
                    value={t.priceNgn}
                    onChange={(e) => updateTier(i, "priceNgn", +e.target.value)}
                  />
                  <label className="fl">Description</label>
                  <input
                    className="fld"
                    value={t.description}
                    onChange={(e) => updateTier(i, "description", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Gate>

          <Gate perm="edit_messaging">
            <div className="sgrp">
              <div className="sgrp-t">Messaging</div>
              {(
                [
                  "heroEyebrow",
                  "heroLead",
                  "antiHype",
                  "tierIntro",
                  "limitReached",
                  "brandIntro",
                  "trackingIntro",
                ] as const
              ).map((k) => (
                <div key={k}>
                  <label className="fl">{k}</label>
                  <textarea className="fld" value={settings.messaging[k]} onChange={(e) => setMsg(k, e.target.value)} />
                </div>
              ))}
            </div>
          </Gate>

          <Gate perm="manage_brands">
            <div className="sgrp">
              <div className="sgrp-t">Brand cards</div>
              <button type="button" className="mini" onClick={addBrand}>
                + Add brand
              </button>
              {brands.map((b, i) => (
                <div key={b.id} className="admin-block">
                  <label className="fl">Title</label>
                  <input className="fld" value={b.title} onChange={(e) => updateBrand(i, "title", e.target.value)} />
                  <label className="fl">Category</label>
                  <select
                    className="fld"
                    value={b.category}
                    onChange={(e) => updateBrand(i, "category", e.target.value)}
                  >
                    {BRAND_CATS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <label className="fl">URL</label>
                  <input className="fld" value={b.ctaUrl} onChange={(e) => updateBrand(i, "ctaUrl", e.target.value)} />
                  <label className="fl">
                    <input
                      type="checkbox"
                      checked={b.active}
                      onChange={(e) => updateBrand(i, "active", e.target.checked)}
                    />{" "}
                    Active
                  </label>
                </div>
              ))}
            </div>
          </Gate>

          <Gate perm="manage_brands">
            <div className="sgrp">
              <div className="sgrp-t">Value Zone — brand offers</div>
              <button type="button" className="mini" onClick={addOffer}>
                + Add offer
              </button>
              {offers.map((o, i) => (
                <div key={o.id} className="admin-block">
                  <label className="fl">
                    Title{" "}
                    <span className="mode-pill" style={{ marginLeft: 6 }}>
                      {o.source}
                    </span>
                  </label>
                  <input className="fld" value={o.title} onChange={(e) => updateOffer(i, "title", e.target.value)} />
                  <label className="fl">Category</label>
                  <select
                    className="fld"
                    value={o.category}
                    onChange={(e) => updateOffer(i, "category", e.target.value)}
                  >
                    {OFFER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <label className="fl">Summary</label>
                  <input className="fld" value={o.summary} onChange={(e) => updateOffer(i, "summary", e.target.value)} />
                  <label className="fl">Image URL</label>
                  <input className="fld" value={o.image} onChange={(e) => updateOffer(i, "image", e.target.value)} />
                  <label className="fl">CTA URL</label>
                  <input className="fld" value={o.ctaUrl} onChange={(e) => updateOffer(i, "ctaUrl", e.target.value)} />
                  <label className="fl">Sponsor</label>
                  <input className="fld" value={o.sponsor} onChange={(e) => updateOffer(i, "sponsor", e.target.value)} />
                  <label className="fl">
                    <input
                      type="checkbox"
                      checked={o.active}
                      onChange={(e) => updateOffer(i, "active", e.target.checked)}
                    />{" "}
                    Active
                  </label>
                </div>
              ))}
            </div>
          </Gate>

          <Gate perm="edit_content">
            <div className="sgrp">
              <div className="sgrp-t">Value Zone — community blog</div>
              <button type="button" className="mini" onClick={addBlog}>
                + Add post
              </button>
              {blog.map((b, i) => (
                <div key={b.id} className="admin-block">
                  <label className="fl">
                    Title{" "}
                    <span className="mode-pill" style={{ marginLeft: 6 }}>
                      {b.source}
                    </span>
                  </label>
                  <input className="fld" value={b.title} onChange={(e) => updateBlog(i, "title", e.target.value)} />
                  <label className="fl">Excerpt</label>
                  <input className="fld" value={b.excerpt} onChange={(e) => updateBlog(i, "excerpt", e.target.value)} />
                  <label className="fl">Author</label>
                  <input className="fld" value={b.author} onChange={(e) => updateBlog(i, "author", e.target.value)} />
                  <label className="fl">Body</label>
                  <textarea className="fld" value={b.body} onChange={(e) => updateBlog(i, "body", e.target.value)} />
                  <label className="fl">
                    <input
                      type="checkbox"
                      checked={b.active}
                      onChange={(e) => updateBlog(i, "active", e.target.checked)}
                    />{" "}
                    Published
                  </label>
                </div>
              ))}
            </div>
          </Gate>

          <Gate perm="edit_content">
            <>
              <div className="sgrp">
                <div className="sgrp-t">Brand & logo</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setBrandField("logoImage", await prepImage(f, { maxDim: 600, mime: "image/png" }));
                  }}
                />
                <label className="fl">Name</label>
                <input className="fld" value={brand.name} onChange={(e) => setBrandField("name", e.target.value)} />
              </div>

              <div className="sgrp">
                <div className="sgrp-t">Personas</div>
                {personas.map((p, i) => (
                  <div key={p.id} className="admin-block">
                    <input
                      className="fld"
                      value={p.name}
                      onChange={(e) =>
                        patchContent((c) => ({
                          ...c,
                          personas: c.personas.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        }))
                      }
                    />
                    <textarea
                      className="fld"
                      value={p.text}
                      onChange={(e) =>
                        patchContent((c) => ({
                          ...c,
                          personas: c.personas.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="sgrp">
                <div className="sgrp-t">Footer</div>
                <textarea
                  className="fld"
                  value={pages.privacy}
                  onChange={(e) => patchContent((c) => ({ ...c, pages: { ...c.pages, privacy: e.target.value } }))}
                />
              </div>
            </>
          </Gate>
        </div>
        <div className="studio-foot">
          {saved && <span className="save-toast">{saved}</span>}
          {can("publish_site") ? (
            <button type="button" className="publish" onClick={publish}>
              Save & publish
            </button>
          ) : (
            <p className="studio-note" style={{ margin: 0 }}>
              You need &quot;Save & publish&quot; permission to push changes live.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
