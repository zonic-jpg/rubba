import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { PAGE_IMAGES } from "../data/pageImages";
import { siblingZonicApps } from "../lib/zonicLinks";

type Key = "privacy" | "faqs" | "contact";
const TITLES: Record<Key, string> = { privacy: "Privacy", faqs: "Frequently asked questions", contact: "Contact us" };

const FOOTER_IMAGES: Record<Key, typeof PAGE_IMAGES.community> = {
  privacy: PAGE_IMAGES.community,
  faqs: PAGE_IMAGES.landingStrip,
  contact: PAGE_IMAGES.inspiration,
};

const SIBLINGS = siblingZonicApps("rubba");

export default function Footer() {
  const { content } = useStore();
  const { pages } = content;
  const [open, setOpen] = useState<Key | null>(null);
  const [faq, setFaq] = useState<number | null>(0);
  const panelImg = open ? FOOTER_IMAGES[open] : null;

  return (
    <>
      <nav className="site-footer">
        <Link className="foot-link" to="/value">Value Zone</Link>
        <button onClick={() => setOpen("privacy")}>Privacy</button>
        <button onClick={() => setOpen("faqs")}>FAQ</button>
        <button onClick={() => setOpen("contact")}>Contact us</button>
      </nav>
      <div className="site-footer zonic-siblings" style={{ flexWrap: "wrap", gap: 12, paddingTop: 0 }}>
        <span style={{ width: "100%", textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>
          Other ZonicMe products
        </span>
        {SIBLINGS.map((a) => (
          <a key={a.id} className="foot-link" href={a.href} target="_blank" rel="noopener noreferrer">
            {a.label}
          </a>
        ))}
      </div>
      <div className={`foot-scrim ${open ? "show" : ""}`} onClick={() => setOpen(null)} />
      <section className={`foot-reveal ${open ? "show" : ""}`}>
        <button className="foot-x" onClick={() => setOpen(null)}>×</button>
        {panelImg && (
          <figure className="foot-hero">
            <img src={panelImg.src} alt={panelImg.alt} loading="lazy" />
            <div className="foot-hero-overlay" />
          </figure>
        )}
        <div className="foot-inner">
          <h2>{open ? TITLES[open] : ""}</h2>
          {open === "faqs" ? (
            <div>{pages.faqs.map((f, i) => (
              <div className="faq-item" key={i}>
                <button className="faq-q" onClick={() => setFaq(faq === i ? null : i)}>{f.q}<span className="chev">{faq === i ? "−" : "+"}</span></button>
                {faq === i && <p className="faq-a">{f.a}</p>}
              </div>
            ))}</div>
          ) : open ? <div className="foot-text">{pages[open]}</div> : null}
        </div>
      </section>
    </>
  );
}
