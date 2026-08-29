import { useState } from "react";
import type { BrandCard } from "../types";
import { isBrandLinkSaved, toggleSavedBrandLink } from "../lib/savedBrandLinks";

export default function BrandStrip({
  category,
  brands,
  intro,
}: {
  category: string;
  brands: BrandCard[];
  intro?: string;
}) {
  const list = brands.filter((b) => b.active && b.category === category).sort((a, b) => a.sort - b.sort);
  if (!list.length) return null;

  return (
    <div className="brand-strip">
      {intro && <p className="brand-intro">{intro}</p>}
      <div className="brand-grid">
        {list.map((b) => (
          <BrandAdvertCard key={b.id} brand={b} />
        ))}
      </div>
    </div>
  );
}

function BrandAdvertCard({ brand }: { brand: BrandCard }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(() => isBrandLinkSaved(brand.id));

  const toggleSave = () => {
    const nowSaved = toggleSavedBrandLink({
      id: brand.id,
      title: brand.title,
      url: brand.ctaUrl,
      sponsor: brand.sponsor,
      kind: "brand",
    });
    setSaved(nowSaved);
  };

  return (
    <article className={`brand-card ${open ? "open" : ""}`}>
      <button
        type="button"
        className="brand-card-main"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="brand-logo">{brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : brand.logoEmoji}</div>
        <div className="brand-body">
          <div className="brand-title">{brand.title}</div>
          <div className="brand-sub">{brand.subtitle}</div>
          <span className="brand-cta">{open ? "Hide details" : "See what they offer"}</span>
        </div>
      </button>
      {open && (
        <div className="brand-expand">
          <p className="brand-value">{brand.subtitle}</p>
          <p className="brand-save-hint">
            Link saved on your profile for later — Rubba does not open partner sites automatically.
          </p>
          <button type="button" className={`brand-save-btn ${saved ? "on" : ""}`} onClick={toggleSave}>
            {saved ? "Saved to your profile ✓" : "Save link to my profile"}
          </button>
        </div>
      )}
      <span className="brand-sponsor">Sponsored · {brand.sponsor}</span>
    </article>
  );
}
