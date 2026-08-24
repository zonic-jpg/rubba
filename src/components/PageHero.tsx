import type { PageImageKey } from "../data/pageImages";
import { PAGE_IMAGES } from "../data/pageImages";

type Props = {
  imageKey: PageImageKey;
  /** Optional short label shown on the image */
  label?: string;
  /** compact = shorter band for in-flow steps; full = taller header */
  variant?: "compact" | "full";
};

export default function PageHero({ imageKey, label, variant = "compact" }: Props) {
  const img = PAGE_IMAGES[imageKey];
  return (
    <figure className={`page-hero page-hero--${variant}`}>
      <img className="page-hero-img" src={img.src} alt={img.alt} loading="lazy" decoding="async" />
      <div className="page-hero-overlay" />
      {label && <figcaption className="page-hero-label">{label}</figcaption>}
    </figure>
  );
}
