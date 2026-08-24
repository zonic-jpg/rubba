import { useStore } from "../lib/store";
import { PAGE_IMAGES } from "../data/pageImages";

export default function HeroBanner() {
  const { content } = useStore();
  const m = content.settings.messaging;
  const hero = PAGE_IMAGES.hero;

  return (
    <section className="hero-banner">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow">{m.heroEyebrow}</p>
        <h1>{m.heroTitle}</h1>
        <p className="lead hero-lead">{m.heroLead}</p>
      </div>
      <figure className="hero-photo">
        <img src={hero.src} alt={hero.alt} loading="eager" decoding="async" />
      </figure>
    </section>
  );
}
