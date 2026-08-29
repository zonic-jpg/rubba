import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import PageHero from "../components/PageHero";
import { track } from "../lib/analytics";
import {
  isBrandLinkSaved,
  loadSavedBrandLinks,
  toggleSavedBrandLink,
} from "../lib/savedBrandLinks";
import { OFFER_CATEGORIES, OFFER_CATEGORY_LABELS } from "../types";
import type { BrandOffer, BlogPost, OfferCategory } from "../types";

export default function ValueZone() {
  const { content } = useStore();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"offers" | "blog">("offers");

  const post = slug
    ? content.blog.find((b) => b.slug === slug && b.active)
    : null;

  useEffect(() => {
    track("value_zone_view", { tab: slug ? "blog_article" : tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (slug) {
    return <Article post={post ?? null} onBack={() => navigate("/value")} offers={content.offers} />;
  }

  return (
    <div className="vz">
      <PageHero imageKey="community" label="Value Zone" variant="full" />
      <div className="eyebrow">Value Zone</div>
      <h1>
        Perks and perspective for <em>people who plan.</em>
      </h1>
      <p className="lead">
        Vibrant brand offers to move your goals forward, plus honest, aspirational reads from the
        Rubba community. All member-first, no pressure.
      </p>

      <div className="vz-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "offers"}
          className={tab === "offers" ? "on" : ""}
          onClick={() => setTab("offers")}
        >
          Brand Offers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "blog"}
          className={tab === "blog" ? "on" : ""}
          onClick={() => setTab("blog")}
        >
          Community Blog
        </button>
      </div>

      {tab === "offers" ? <OffersTab offers={content.offers} /> : <BlogTab posts={content.blog} />}
    </div>
  );
}

function OffersTab({ offers }: { offers: BrandOffer[] }) {
  const [filter, setFilter] = useState<OfferCategory | "all">("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const links = loadSavedBrandLinks(offers);
    return new Set(links.map((l) => l.id));
  });

  const active = useMemo(
    () => offers.filter((o) => o.active).sort((a, b) => a.sort - b.sort),
    [offers],
  );
  const cats = useMemo(
    () => OFFER_CATEGORIES.filter((c) => active.some((o) => o.category === c)),
    [active],
  );
  const list = filter === "all" ? active : active.filter((o) => o.category === filter);

  const toggleSave = (o: BrandOffer) => {
    const nowSaved = toggleSavedBrandLink({
      id: o.id,
      title: o.title,
      url: o.ctaUrl,
      sponsor: o.sponsor,
      kind: "offer",
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(o.id);
      else next.delete(o.id);
      return next;
    });
    if (nowSaved) track("offer_cta_click", { action: "save", offer: o.id });
  };

  return (
    <>
      <div className="vz-filters">
        <button
          type="button"
          className={filter === "all" ? "on" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            type="button"
            key={c}
            className={filter === c ? "on" : ""}
            onClick={() => setFilter(c)}
          >
            {OFFER_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="offer-grid">
        {list.map((o) => (
          <OfferCard key={o.id} offer={o} saved={savedIds.has(o.id)} onSave={() => toggleSave(o)} />
        ))}
      </div>
      {list.length === 0 && <p className="vz-empty">No offers in this category yet — check back soon.</p>}

      <p className="vz-disclaimer">
        Offers are sponsored partner options for Rubba members — always verify terms before you
        commit. Rubba is a planning tool, not a financial adviser. Partner links stay in your
        profile until you choose to open them later.
      </p>
    </>
  );
}

function OfferCard({
  offer,
  saved,
  onSave,
}: {
  offer: BrandOffer;
  saved: boolean;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);

  const expand = () => {
    const next = !open;
    setOpen(next);
    if (next) track("offer_expand", { offer: offer.id, category: offer.category, sponsor: offer.sponsor });
  };

  return (
    <article className={`offer-card ${open ? "open" : ""}`}>
      <div className="offer-media">
        <img src={offer.image} alt="" loading="lazy" />
        <div className="offer-media-overlay" />
        <span className="offer-emoji" aria-hidden>
          {offer.emoji}
        </span>
        {offer.badge && <span className="offer-badge">{offer.badge}</span>}
        <button
          type="button"
          className={`offer-save ${saved ? "on" : ""}`}
          onClick={onSave}
          aria-pressed={saved}
          title={saved ? "Saved to your profile" : "Save link to your profile"}
        >
          {saved ? "★" : "☆"}
        </button>
      </div>
      <div className="offer-body">
        <span className="offer-cat">{OFFER_CATEGORY_LABELS[offer.category]}</span>
        <h3>{offer.title}</h3>
        <p className="offer-summary">{offer.summary}</p>
        {open && (
          <>
            <p className="offer-detail">{offer.detail}</p>
            <p className="offer-save-hint">
              Save the partner link to your profile for later — Rubba does not open external sites
              automatically.
            </p>
          </>
        )}
        <div className="offer-foot">
          <button type="button" className="offer-more" onClick={expand}>
            {open ? "Show less" : "See what you get"}
          </button>
          <button type="button" className={`offer-cta offer-cta-btn ${saved ? "on" : ""}`} onClick={onSave}>
            {saved ? "Saved to profile ✓" : "Save link for later"}
          </button>
        </div>
        <span className="offer-sponsor">Sponsored · {offer.sponsor}</span>
      </div>
    </article>
  );
}

function BlogTab({ posts }: { posts: BlogPost[] }) {
  const list = useMemo(
    () => posts.filter((p) => p.active).sort((a, b) => a.sort - b.sort),
    [posts],
  );

  return (
    <>
      <div className="blog-grid">
        {list.map((p) => (
          <Link
            key={p.id}
            to={`/value/blog/${p.slug}`}
            className="blog-card"
            onClick={() => track("blog_open", { post: p.id, tags: p.tags })}
          >
            <div className="blog-media">
              <img src={p.image} alt="" loading="lazy" />
              <div className="blog-media-overlay" />
            </div>
            <div className="blog-body">
              <div className="blog-tags">
                {p.tags.map((t) => (
                  <span className="blog-tag" key={t}>
                    #{t}
                  </span>
                ))}
              </div>
              <h3>{p.title}</h3>
              <p className="blog-excerpt">{p.excerpt}</p>
              <div className="blog-meta">
                {p.author} · {p.readMinutes} min read
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="vz-empty">No posts yet — the community is warming up.</p>}
    </>
  );
}

function Article({
  post,
  onBack,
  offers,
}: {
  post: BlogPost | null;
  onBack: () => void;
  offers: BrandOffer[];
  }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (post) track("blog_view", { post: post.id, tags: post.tags });
  }, [post]);

  if (!post) {
    return (
      <div className="vz">
        <button type="button" className="vz-back" onClick={onBack}>
          ← Back to Value Zone
        </button>
        <div className="limit-box">
          <h2>Post not found</h2>
          <p>That article may have moved. Browse the latest reads in the Value Zone.</p>
        </div>
      </div>
    );
  }

  const paragraphs = post.body.split("\n\n");
  const related = offers.filter((o) => o.active).slice(0, 2);

  return (
    <div className="vz article">
      <button type="button" className="vz-back" onClick={onBack}>
        ← Back to Value Zone
      </button>
      <figure className="article-hero">
        <img src={post.image} alt="" />
        <div className="article-hero-overlay" />
      </figure>
      <div className="blog-tags">
        {post.tags.map((t) => (
          <span className="blog-tag" key={t}>
            #{t}
          </span>
        ))}
      </div>
      <h1>{post.title}</h1>
      <div className="article-meta">
        {post.author} · {post.readMinutes} min read
      </div>
      <div className="article-body">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <div className="caution">
        <b>Community perspective:</b> Aspirational reads, not regulated financial advice. Always do
        your own research before acting.
      </div>
      {related.length > 0 && (
        <>
          <div className="sec-t violet">Turn inspiration into action</div>
          <div className="offer-grid offer-grid--mini" key={tick}>
            {related.map((o) => {
              const saved = isBrandLinkSaved(o.id);
              return (
                <article key={o.id} className="offer-mini offer-mini-static">
                  <span className="offer-mini-emoji">{o.emoji}</span>
                  <span className="offer-mini-body">
                    <b>{o.title}</b>
                    <span>{o.summary}</span>
                    <button
                      type="button"
                      className={`offer-mini-save ${saved ? "on" : ""}`}
                      onClick={() => {
                        toggleSavedBrandLink({
                          id: o.id,
                          title: o.title,
                          url: o.ctaUrl,
                          sponsor: o.sponsor,
                          kind: "offer",
                        });
                        track("offer_cta_click", { action: "save_from_blog", offer: o.id });
                        setTick((n) => n + 1);
                      }}
                    >
                      {saved ? "Saved to profile ✓" : "Save link for later"}
                    </button>
                  </span>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
