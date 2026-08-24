import type { BrandCard } from "../types";

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
          <a
            key={b.id}
            className="brand-card"
            href={b.ctaUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brand-logo">{b.logoUrl ? <img src={b.logoUrl} alt="" /> : b.logoEmoji}</div>
            <div className="brand-body">
              <div className="brand-title">{b.title}</div>
              <div className="brand-sub">{b.subtitle}</div>
              <span className="brand-cta">{b.ctaLabel} →</span>
            </div>
            <span className="brand-sponsor">Sponsored · {b.sponsor}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
