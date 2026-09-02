import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import PageHero from "../components/PageHero";
import Lightbox from "../components/Lightbox";
import { Pager, usePaged } from "../components/Pager";
import { track } from "../lib/analytics";
import {
  isBrandLinkSaved,
  loadSavedBrandLinks,
  toggleSavedBrandLink,
} from "../lib/savedBrandLinks";
import { OFFER_CATEGORIES, OFFER_CATEGORY_LABELS } from "../types";
import {
  EMPTY_VALUE_FILTERS,
  describeValueFilters,
  matchOffer,
  matchPost,
  offerSponsorVocab,
  parseValueQuery,
  postTagVocab,
  removeValueFilter,
} from "../lib/valueSearch";
import type { ValueChip, ValueFilters, ValueScope } from "../lib/valueSearch";
import type { BrandOffer, BlogPost, OfferCategory } from "../types";

const OFFERS_PER_PAGE = 6;
const POSTS_PER_PAGE = 6;

export default function ValueZone() {
  const { content, loading } = useStore();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"offers" | "blog">("offers");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ValueFilters>(EMPTY_VALUE_FILTERS);

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

  const vocab = {
    sponsors: offerSponsorVocab(content.offers),
    tags: postTagVocab(content.blog),
  };

  const submitSearch = () => {
    const parsed = parseValueQuery(query, vocab);
    setFilters(parsed);
    track("value_zone_search", {
      tab,
      categories: parsed.categories.length,
      perks: parsed.perks.length,
      sponsors: parsed.sponsors.length,
      tags: parsed.tags.length,
      freeText: Boolean(parsed.text),
    });
  };

  const clearAll = () => {
    setQuery("");
    setFilters(EMPTY_VALUE_FILTERS);
  };

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

      <SearchBar
        scope={tab}
        query={query}
        onQueryChange={setQuery}
        onSubmit={submitSearch}
        onClear={clearAll}
      />

      {tab === "offers" ? (
        <OffersTab
          offers={content.offers}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          onClearAll={clearAll}
        />
      ) : (
        <BlogTab
          posts={content.blog}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          onClearAll={clearAll}
        />
      )}
    </div>
  );
}

/**
 * One box, several facets. "Free Coursera courses" narrows category, perk and
 * sponsor at once instead of being matched as a phrase.
 */
function SearchBar({
  scope,
  query,
  onQueryChange,
  onSubmit,
  onClear,
}: {
  scope: ValueScope;
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  return (
    <form
      className="vz-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="vz-search-l" htmlFor="vz-search-input">
        {scope === "offers" ? "Ask for what you need" : "Search the community reads"}
      </label>
      <div className="vz-search-row">
        <input
          id="vz-search-input"
          type="text"
          value={query}
          placeholder={
            scope === "offers"
              ? "e.g. free courses from Coursera, or car financing"
              : "e.g. quick read about savings"
          }
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="submit" className="vz-search-go">
          Search
        </button>
        {query && (
          <button type="button" className="vz-search-reset" onClick={onClear}>
            Reset
          </button>
        )}
      </div>
      <p className="vz-search-hint">
        {scope === "offers"
          ? "Name a category, a sponsor and a perk in one line — each one becomes a filter you can lift off again."
          : "Name a topic or how long you want to read for — both become filters you can lift off again."}
      </p>
    </form>
  );
}

/** The filter set the visible results were built from, one chip at a time. */
function AppliedChips({
  filters,
  scope,
  count,
  onRemove,
  onClearAll,
}: {
  filters: ValueFilters;
  scope: ValueScope;
  count: number;
  onRemove: (chip: ValueChip) => void;
  onClearAll: () => void;
}) {
  const chips = describeValueFilters(filters, scope);
  if (!chips.length) return null;

  return (
    <div className="applied-bar">
      <div className="applied-head">
        <p className="applied-title">Showing results for</p>
        <span className="applied-count">
          {count} {scope === "offers" ? "offer" : "read"}
          {count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="applied-chips">
        {chips.map((chip) => (
          <span className="applied-chip" key={chip.id}>
            {chip.label}
            <button
              type="button"
              className="applied-chip-x"
              onClick={() => onRemove(chip)}
              aria-label={`Remove filter ${chip.label}`}
            >
              ✕
            </button>
          </span>
        ))}
        <button type="button" className="applied-clear" onClick={onClearAll}>
          Clear all
        </button>
      </div>
    </div>
  );
}

/** Holds the exact card footprint so results never shift the layout in. */
function CardSkeletons({ count, media }: { count: number; media: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-card" key={i} aria-hidden>
          <div className={`sk-media ${media}`} />
          <div className="sk-body">
            <span className="sk-line w30" />
            <span className="sk-line w90" />
            <span className="sk-line w70" />
            <span className="sk-line w45" />
          </div>
        </div>
      ))}
    </>
  );
}

function OffersTab({
  offers,
  loading,
  filters,
  setFilters,
  onClearAll,
}: {
  offers: BrandOffer[];
  loading: boolean;
  filters: ValueFilters;
  setFilters: (f: ValueFilters) => void;
  onClearAll: () => void;
}) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const links = loadSavedBrandLinks(offers);
    return new Set(links.map((l) => l.id));
  });
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => offers.filter((o) => o.active).sort((a, b) => a.sort - b.sort),
    [offers],
  );
  const cats = useMemo(
    () => OFFER_CATEGORIES.filter((c) => active.some((o) => o.category === c)),
    [active],
  );
  const list = useMemo(
    () => active.filter((o) => matchOffer(o, filters, (id) => savedIds.has(id))),
    [active, filters, savedIds],
  );
  const paged = usePaged(list, OFFERS_PER_PAGE, { scrollTarget: resultsRef });

  const toggleCategory = (c: OfferCategory) => {
    const on = filters.categories.includes(c);
    setFilters({
      ...filters,
      categories: on ? filters.categories.filter((x) => x !== c) : [...filters.categories, c],
    });
  };

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
          className={filters.categories.length === 0 ? "on" : ""}
          onClick={() => setFilters({ ...filters, categories: [] })}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            type="button"
            key={c}
            className={filters.categories.includes(c) ? "on" : ""}
            aria-pressed={filters.categories.includes(c)}
            onClick={() => toggleCategory(c)}
          >
            {OFFER_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <AppliedChips
        filters={filters}
        scope="offers"
        count={list.length}
        onRemove={(chip) => setFilters(removeValueFilter(filters, chip))}
        onClearAll={onClearAll}
      />

      <div className="offer-grid" ref={resultsRef}>
        {loading ? (
          <CardSkeletons count={OFFERS_PER_PAGE} media="sk-media--offer" />
        ) : (
          paged.slice.map((o, i) => (
            <OfferCard
              key={o.id}
              offer={o}
              saved={savedIds.has(o.id)}
              onSave={() => toggleSave(o)}
              onZoom={() => setZoomIndex(i)}
            />
          ))
        )}
      </div>

      {!loading && list.length === 0 && (
        <p className="vz-empty">
          Nothing matches that yet — lift a filter off above, or clear them all to see every offer.
        </p>
      )}

      <Pager page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} />

      <Lightbox
        items={paged.slice}
        index={zoomIndex}
        onClose={() => setZoomIndex(null)}
        onIndexChange={setZoomIndex}
        resolveImage={(o) => o.image}
        resolveLabel={(o) => o.title}
        renderMeta={(o) => (
          <span className="lb-meta-copy">
            <b>{o.title}</b>
            <span>{o.summary}</span>
            <small>Sponsored · {o.sponsor}</small>
          </span>
        )}
        onPrimaryAction={(o) => toggleSave(o)}
        primaryActionLabel={
          zoomIndex != null && paged.slice[zoomIndex] && savedIds.has(paged.slice[zoomIndex].id)
            ? "Saved to profile ✓"
            : "Save link for later"
        }
      />

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
  onZoom,
}: {
  offer: BrandOffer;
  saved: boolean;
  onSave: () => void;
  onZoom: () => void;
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
        <button
          type="button"
          className="offer-zoom"
          onClick={onZoom}
          aria-label={`Enlarge ${offer.title}`}
        >
          Enlarge
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

function BlogTab({
  posts,
  loading,
  filters,
  setFilters,
  onClearAll,
}: {
  posts: BlogPost[];
  loading: boolean;
  filters: ValueFilters;
  setFilters: (f: ValueFilters) => void;
  onClearAll: () => void;
}) {
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(
    () => posts.filter((p) => p.active).sort((a, b) => a.sort - b.sort),
    [posts],
  );
  const list = useMemo(() => active.filter((p) => matchPost(p, filters)), [active, filters]);
  const paged = usePaged(list, POSTS_PER_PAGE, { scrollTarget: resultsRef });

  return (
    <>
      <AppliedChips
        filters={filters}
        scope="blog"
        count={list.length}
        onRemove={(chip) => setFilters(removeValueFilter(filters, chip))}
        onClearAll={onClearAll}
      />

      <div className="blog-grid" ref={resultsRef}>
        {loading ? (
          <CardSkeletons count={POSTS_PER_PAGE} media="sk-media--blog" />
        ) : (
          paged.slice.map((p) => (
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
          ))
        )}
      </div>

      {!loading && list.length === 0 && (
        <p className="vz-empty">
          {active.length === 0
            ? "No posts yet — the community is warming up."
            : "Nothing matches that yet — lift a filter off above, or clear them all to see every read."}
        </p>
      )}

      <Pager page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} />
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
